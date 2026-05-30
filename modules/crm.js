// ============================================================
// modules/crm.js v4.1
// CRM Hub — customer database, profile, order history,
// contract & receipt links, add/edit customer
// ============================================================

window.renderCRM = function() {
  renderPageLoading('page-crm', '👥', 'CRM Hub');
  loadCRM();
};

window.loadCRM = async function() {
  const el = document.getElementById('page-crm');
  if (!el) return;

  // ✅ Make sure bookings are loaded — orders need to show in profiles
  if (!G.bookings.length) await loadBookingsData();

  // KPI counts
  const today          = getCairoNow();
  const activeClients  = new Set();
  const overdueClients = new Set();

  (G.bookings || []).forEach(b => {
    const st  = getOrderStatus(b);
    const cid = String(b['كود العميل'] || '');
    if (!cid) return;
    if (st === 'Active')  activeClients.add(cid);
    if (st === 'Overdue') overdueClients.add(cid);
  });

  el.innerHTML = `
    <div class="section-header">
      <div>
        <h2>👥 CRM Hub</h2>
        <p>Customer database — search, view, add and track rental history</p>
      </div>
      <div style="display:flex;gap:7px;">
        <button class="btn btn-primary btn-sm"
          onclick="openAddCustomerModal()">➕ Add Customer</button>
        <button class="btn btn-ghost btn-sm"
          onclick="loadCRM()">🔄 Refresh</button>
      </div>
    </div>

    <!-- Stats row -->
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));
                gap:10px;margin-bottom:14px;">
      <div class="kpi-card">
        <div class="kpi-label">Total Customers</div>
        <div class="kpi-value text-accent">${G.customers.length}</div>
        <div class="kpi-sub">In database</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Showing</div>
        <div class="kpi-value text-success" id="crm-showing-count">
          ${Math.min(500, G.customers.length)}
        </div>
        <div class="kpi-sub">of ${G.customers.length}</div>
      </div>
      <div class="kpi-card" style="cursor:pointer;"
           onclick="document.getElementById('crm-search').value='';
                    filterCRM()">
        <div class="kpi-label">Active Clients</div>
        <div class="kpi-value" style="color:var(--success);">
          ${activeClients.size}
        </div>
        <div class="kpi-sub">Currently renting</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Overdue Clients</div>
        <div class="kpi-value text-danger">${overdueClients.size}</div>
        <div class="kpi-sub">Unpaid past-due</div>
      </div>
    </div>

    <!-- Search & Filters -->
    <div class="panel" style="margin-bottom:14px;">
      <div style="display:flex;gap:9px;flex-wrap:wrap;align-items:flex-end;">
        <div style="flex:1;min-width:200px;">
          <div style="font-size:10px;color:var(--text3);margin-bottom:3px;
                      font-weight:700;">🔍 SEARCH CUSTOMERS</div>
          <input type="text" id="crm-search"
            placeholder="Name, passport, phone, national ID, email, nationality..."
            style="width:100%;padding:8px 13px;background:var(--surface2);
                   border:1px solid var(--border);border-radius:8px;color:var(--text);"
            oninput="clearTimeout(window._crmTimer);
                     window._crmTimer=setTimeout(filterCRM,300)"/>
        </div>
        <div>
          <div style="font-size:10px;color:var(--text3);margin-bottom:3px;
                      font-weight:700;">NATIONALITY</div>
          <select id="crm-nat-filter" onchange="filterCRM()"
            style="padding:8px 9px;background:var(--surface2);
                   border:1px solid var(--border);border-radius:8px;color:var(--text);">
            <option value="all">All</option>
            ${[...new Set(G.customers
              .map(c => c['رمز الدولة'] || c.col_H)
              .filter(Boolean)
            )].sort()
              .map(n => `<option value="${n}">${n}</option>`)
              .join('')}
          </select>
        </div>
        <div>
          <div style="font-size:10px;color:var(--text3);margin-bottom:3px;
                      font-weight:700;">SOURCE</div>
          <select id="crm-source-filter" onchange="filterCRM()"
            style="padding:8px 9px;background:var(--surface2);
                   border:1px solid var(--border);border-radius:8px;color:var(--text);">
            <option value="all">All Sources</option>
            ${[...new Set(G.customers
              .map(c => c.client_source)
              .filter(Boolean)
            )].sort()
              .map(s => `<option value="${s}">${s}</option>`)
              .join('')}
          </select>
        </div>
        <div>
          <div style="font-size:10px;color:var(--text3);margin-bottom:3px;
                      font-weight:700;">STATUS</div>
          <select id="crm-status-filter" onchange="filterCRM()"
            style="padding:8px 9px;background:var(--surface2);
                   border:1px solid var(--border);border-radius:8px;color:var(--text);">
            <option value="all">All Clients</option>
            <option value="active">🟢 Active</option>
            <option value="overdue">🔴 Overdue</option>
            <option value="history">📦 History Only</option>
          </select>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="
          document.getElementById('crm-search').value='';
          document.getElementById('crm-nat-filter').value='all';
          document.getElementById('crm-source-filter').value='all';
          document.getElementById('crm-status-filter').value='all';
          filterCRM();">✕ Clear</button>
      </div>
    </div>

    <!-- Table -->
    <div class="panel">
      <div id="crm-table-wrap" class="table-wrap">
        <div class="empty-state"><div class="spinner lg"></div></div>
      </div>
    </div>
  `;

  filterCRM();
};

// ============================================================
// FILTER CRM
// ============================================================
window.filterCRM = debounce(function() {
  const q        = (document.getElementById('crm-search')?.value        || '').toLowerCase();
  const nat      = document.getElementById('crm-nat-filter')?.value      || 'all';
  const source   = document.getElementById('crm-source-filter')?.value   || 'all';
  const statusF  = document.getElementById('crm-status-filter')?.value   || 'all';
  const wrap     = document.getElementById('crm-table-wrap');
  if (!wrap) return;

  // Build active/overdue client sets
  const activeSet  = new Set();
  const overdueSet = new Set();
  (G.bookings || []).forEach(b => {
    const st  = getOrderStatus(b);
    const cid = String(b['كود العميل'] || '');
    if (!cid) return;
    if (st === 'Active')  activeSet.add(cid);
    if (st === 'Overdue') overdueSet.add(cid);
  });
  const hasOrderSet = new Set(
    (G.bookings || []).map(b => String(b['كود العميل']||'')).filter(Boolean)
  );

  let customers = [...G.customers];

  // Search filter
  if (q) {
    customers = customers.filter(c =>
      [
        c['الاسم الأول']  || c.col_C,
        c['الاسم الأخير'] || c.col_D,
        c['رقم جواز السفر'],
        c['الرقم القومي'],
        c['رقم التليفون'],
        c['عنوان البريد الإلكتروني'],
        c['رمز الدولة']   || c.col_H,
        c['No.']          || c.col_A,
        c['العنوان'],
        c.client_source
      ].join(' ').toLowerCase().includes(q)
    );
  }

  if (nat    !== 'all') customers = customers.filter(c =>
    (c['رمز الدولة'] || c.col_H) === nat
  );
  if (source !== 'all') customers = customers.filter(c => c.client_source === source);

  // ✅ Status filter
  if (statusF === 'active') {
    customers = customers.filter(c => activeSet.has(String(c['No.']||c.col_A||'')));
  } else if (statusF === 'overdue') {
    customers = customers.filter(c => overdueSet.has(String(c['No.']||c.col_A||'')));
  } else if (statusF === 'history') {
    customers = customers.filter(c =>
      hasOrderSet.has(String(c['No.']||c.col_A||'')) &&
      !activeSet.has(String(c['No.']||c.col_A||''))
    );
  }

  // Sort newest first by CRM ID
  customers.sort((a,b) => {
    const na = parseInt(a['No.'] || a.col_A || 0);
    const nb = parseInt(b['No.'] || b.col_A || 0);
    return nb - na;
  });

  const limit   = window._crmLimit || 500;
  const countEl = document.getElementById('crm-showing-count');
  if (countEl) countEl.textContent = customers.length;

  if (!customers.length) {
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="es-icon">👥</div>
        <p>No customers match your search</p>
      </div>`;
    return;
  }

  wrap.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>CRM ID</th>
          <th>Name</th>
          <th>Passport / ID</th>
          <th>Phone</th>
          <th>Email</th>
          <th>Nationality</th>
          <th>Source</th>
          <th>Status</th>
          <th>License</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${customers.slice(0, limit).map(c => {
          const firstName  = c['الاسم الأول']  || c.col_C || '';
          const lastName   = c['الاسم الأخير'] || c.col_D || '';
          const name       = (firstName + ' ' + lastName).trim();
          const clientCode = String(c['No.'] || c.col_A || c.id);
          const nationality= c['رمز الدولة'] || c.col_H || '';
          const hasLicense = !!(c['رقم رخصة القيادة'] || '');
          const isActive   = activeSet.has(clientCode);
          const isOverdue  = overdueSet.has(clientCode);

          return `
            <tr style="cursor:pointer;"
                onclick="openClientProfile('${c.id}')"
                onmouseover="this.style.background='var(--glass2)'"
                onmouseout="this.style.background=''">
              <td>
                <span style="color:var(--accent);font-weight:700;">
                  #${clientCode}
                </span>
              </td>
              <td>
                <div style="font-weight:700;">${name || '—'}</div>
                ${c['العنوان']
                  ? `<div style="font-size:10px;color:var(--text3);margin-top:1px;">
                       📍 ${c['العنوان']}
                     </div>`
                  : ''}
              </td>
              <td style="font-size:11px;">
                ${c['رقم جواز السفر']
                  ? `<div>🛂 ${c['رقم جواز السفر']}</div>` : ''}
                ${c['الرقم القومي']
                  ? `<div>🪪 ${c['الرقم القومي']}</div>` : ''}
              </td>
              <td style="font-size:11px;">${c['رقم التليفون'] || '—'}</td>
              <td style="font-size:11px;">${c['عنوان البريد الإلكتروني'] || '—'}</td>
              <td style="font-size:11px;">${nationality || '—'}</td>
              <td style="font-size:11px;">
                ${c.client_source
                  ? `<span class="pill pill-accepted" style="font-size:9px;">
                       ${c.client_source}
                     </span>`
                  : '—'}
              </td>
              <td>
                ${isActive  ? '<span class="pill pill-active" style="font-size:9px;">🟢 Active</span>'   :
                  isOverdue ? '<span class="pill pill-overdue" style="font-size:9px;">🔴 Overdue</span>' :
                  hasOrderSet.has(clientCode)
                            ? '<span class="pill pill-closed" style="font-size:9px;">📦 History</span>'
                            : '<span style="color:var(--text3);font-size:10px;">—</span>'}
              </td>
              <td style="font-size:11px;">
                ${hasLicense
                  ? `<span class="pill pill-active">✓ ${c['رقم رخصة القيادة']}</span>`
                  : '<span style="color:var(--text3);">—</span>'}
              </td>
              <td onclick="event.stopPropagation()">
                <div style="display:flex;gap:3px;flex-wrap:wrap;">
                  <button class="btn btn-ghost btn-xs"
                    onclick="openClientProfile('${c.id}')">👁</button>
                  <button class="btn btn-ghost btn-xs"
                    onclick="openEditCustomerModal('${c.id}')">✏️</button>
                  <button class="btn btn-primary btn-xs"
                    onclick="viewCustomerOrders('${clientCode}','${
                      name.replace(/'/g, "\\'")}')">
                    📋
                  </button>
                  ${G.user?.role === 'Admin' ? `
                    <button class="btn btn-xs"
                      style="background:var(--danger);color:#fff;"
                      onclick="event.stopPropagation();
                               adminDeleteCustomer('${c.id}')">
                      🗑️
                    </button>` : ''}
                </div>
              </td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>
    <div style="padding:9px 11px;font-size:11px;color:var(--text3);
                border-top:1px solid var(--border);
                display:flex;align-items:center;gap:10px;">
      <span>
        Showing ${Math.min(limit, customers.length)} of ${customers.length}
        customers — click any row to open profile
      </span>
      ${customers.length > limit ? `
        <button class="btn btn-ghost btn-xs"
          onclick="window._crmLimit=(window._crmLimit||500)+500;filterCRM()">
          Load more
        </button>` : ''}
    </div>`;
}, 200);

// ============================================================
// CLIENT PROFILE MODAL
// ============================================================
window.openClientProfile = async function(customerId) {
  const c = G.customers.find(x => x.id === customerId);
  if (!c) return;

  const firstName = c['الاسم الأول']  || c.col_C || '';
  const lastName  = c['الاسم الأخير'] || c.col_D || '';
  const name      = (firstName + ' ' + lastName).trim();
  const clientNo  = String(c['No.'] || c.col_A || c.id);

  // ✅ FIXED: Use both allOrders and G.bookings, ensure loaded
  if (!G.bookings.length) await loadBookingsData();
  const ordersSource = (window.allOrders && window.allOrders.length > 0)
    ? window.allOrders : G.bookings;

  // ✅ Match by كود العميل field
  const clientOrders = ordersSource.filter(o =>
    String(o['كود العميل'] || '').trim() === clientNo
  );

  // ✅ FIXED: Load receipts by order_id (not client_id)
  // Since receipts are saved with order_id, look up through orders
  let receipts = [];
  try {
    if (clientOrders.length > 0) {
      // Get receipts for all orders belonging to this client
      const orderIds = clientOrders.map(o => o.id);
      // Firestore 'in' query supports up to 30 items
      const chunks   = [];
      for (let i = 0; i < orderIds.length; i += 10) {
        chunks.push(orderIds.slice(i, i + 10));
      }
      for (const chunk of chunks) {
        const rcSnap = await db.collection('receipts')
          .where('order_id', 'in', chunk)
          .get()
          .catch(() => null);
        if (rcSnap && !rcSnap.empty) {
          receipts.push(...rcSnap.docs.map(d => ({ id:d.id, ...d.data() })));
        }
      }
      // Also try by client_id (legacy receipts)
      const byClientId = await db.collection('receipts')
        .where('client_id', '==', clientNo)
        .get()
        .catch(() => null);
      if (byClientId && !byClientId.empty) {
        const existing = new Set(receipts.map(r => r.id));
        byClientId.docs.forEach(d => {
          if (!existing.has(d.id)) receipts.push({ id:d.id, ...d.data() });
        });
      }
      receipts.sort((a,b) => (b.timestamp||0) - (a.timestamp||0));
    }
  } catch (_) {}

  const today           = getCairoNow();
  const totalContracted = clientOrders.reduce((s,o) => s + getOrderTotal(o), 0);
  const totalPaid       = clientOrders.reduce((s,o) => s + getOrderPaid(o), 0);
  const activeOrders    = clientOrders.filter(o => getOrderStatus(o) === 'Active').length;
  const overdueOrders   = clientOrders.filter(o => getOrderStatus(o) === 'Overdue').length;
  const outstanding     = Math.max(0, totalContracted - totalPaid);

  const html = `
    <!-- Quick Actions -->
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
      <button class="btn btn-primary btn-sm"
        onclick="closeModal();showPage('proposals');
          setTimeout(()=>prefillProposalClient('${c.id}','${
            name.replace(/'/g,"\\'")}'),400)">
        📋 New Proposal
      </button>
      <button class="btn btn-ghost btn-sm"
        onclick="closeModal();showPage('en-contract');
          setTimeout(()=>fillCrmFields('en','${c.id}'),400)">
        📄 New EN Contract
      </button>
      <button class="btn btn-ghost btn-sm"
        onclick="closeModal();showPage('ar-contract');
          setTimeout(()=>fillCrmFields('ar','${c.id}'),400)">
        📝 New AR Contract
      </button>
      <button class="btn btn-ghost btn-sm"
        onclick="viewCustomerOrders('${clientNo}','${name.replace(/'/g,"\\'")}')">
        📦 Orders (${clientOrders.length})
      </button>
      <button class="btn btn-warning btn-sm"
        onclick="closeModal();openEditCustomerModal('${c.id}')">
        ✏️ Edit
      </button>
    </div>

    <!-- Profile Header -->
    <div style="display:flex;align-items:flex-start;gap:14px;padding:13px;
                background:var(--surface2);border-radius:var(--radius);
                margin-bottom:16px;">
      <div style="width:50px;height:50px;border-radius:50%;
                  background:linear-gradient(135deg,var(--accent),var(--accent2));
                  display:flex;align-items:center;justify-content:center;
                  font-size:18px;font-weight:800;color:#fff;flex-shrink:0;">
        ${initials(name).toUpperCase()}
      </div>
      <div style="flex:1;">
        <div style="font-size:16px;font-weight:900;">${name || '—'}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:3px;">
          CRM #${clientNo} | ${c['رمز الدولة'] || c.col_H || '—'}
          ${c.client_source ? ` | Source: ${c.client_source}` : ''}
        </div>
        <div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:7px;">
          ${activeOrders  > 0 ? `<span class="pill pill-active">🚗 ${activeOrders} Active</span>`   : ''}
          ${overdueOrders > 0 ? `<span class="pill pill-overdue">⚠️ ${overdueOrders} Overdue</span>`: ''}
          <span class="pill pill-closed">${clientOrders.length} Orders</span>
          <span class="pill pill-accepted">${receipts.length} Receipts</span>
        </div>
      </div>
    </div>

    <!-- Info Grid -->
    <div style="display:grid;grid-template-columns:1fr 1fr;
                gap:11px;margin-bottom:16px;">
      <div class="panel">
        <div style="font-size:10px;font-weight:800;color:var(--accent);
                    text-transform:uppercase;margin-bottom:9px;">📇 Contact</div>
        <div style="font-size:11px;display:grid;
                    grid-template-columns:auto 1fr;gap:4px 11px;">
          <span style="color:var(--text3);">Phone:</span>
          <span style="font-weight:700;">${c['رقم التليفون']||'—'}</span>
          <span style="color:var(--text3);">Email:</span>
          <span>${c['عنوان البريد الإلكتروني']||'—'}</span>
          <span style="color:var(--text3);">Address:</span>
          <span>${c['العنوان']||'—'}</span>
          <span style="color:var(--text3);">Registered:</span>
          <span>${fmtCRMDate(c['تاريخ التسجيل'])}</span>
        </div>
      </div>

      <div class="panel">
        <div style="font-size:10px;font-weight:800;color:var(--accent);
                    text-transform:uppercase;margin-bottom:9px;">🪪 Identity</div>
        <div style="font-size:11px;display:grid;
                    grid-template-columns:auto 1fr;gap:4px 11px;">
          <span style="color:var(--text3);">Nationality:</span>
          <span style="font-weight:700;">${c['رمز الدولة']||c.col_H||'—'}</span>
          <span style="color:var(--text3);">Passport:</span>
          <span>${c['رقم جواز السفر']||'—'}</span>
          <span style="color:var(--text3);">National ID:</span>
          <span>${c['الرقم القومي']||'—'}</span>
          <span style="color:var(--text3);">License:</span>
          <span>${c['رقم رخصة القيادة']||'—'}</span>
        </div>
      </div>

      <div class="panel">
        <div style="font-size:10px;font-weight:800;color:var(--accent);
                    text-transform:uppercase;margin-bottom:9px;">
          💰 Financial Summary
        </div>
        <div style="font-size:11px;display:grid;
                    grid-template-columns:auto 1fr;gap:4px 11px;">
          <span style="color:var(--text3);">Total Contracted:</span>
          <span style="font-weight:700;">${fmtMoney(totalContracted)}</span>
          <span style="color:var(--text3);">Total Paid:</span>
          <span style="font-weight:700;color:var(--success);">
            ${fmtMoney(totalPaid)}
          </span>
          <span style="color:var(--text3);">Outstanding:</span>
          <span style="font-weight:700;
                       color:${outstanding>0?'var(--danger)':'var(--success)'};">
            ${outstanding > 0 ? fmtMoney(outstanding) : '✅ Clear'}
          </span>
          <span style="color:var(--text3);">Orders:</span>
          <span>${clientOrders.length}</span>
        </div>
      </div>

      <div class="panel" style="display:flex;flex-direction:column;gap:7px;">
        <div style="font-size:10px;font-weight:800;color:var(--accent);
                    text-transform:uppercase;margin-bottom:4px;">
          ⚡ Quick Actions
        </div>
        <button class="btn btn-ghost btn-sm"
          onclick="createTaskFromOrder && closeModal();
            setTimeout(()=>viewCustomerOrders('${clientNo}','${
              name.replace(/'/g,"\\'")}'),200)">
          📋 View All Orders
        </button>
        <button class="btn btn-ghost btn-sm"
          onclick="closeModal();showPage('receipts');
            setTimeout(()=>{
              const el=document.getElementById('rc-client-name');
              if(el)el.value='${name.replace(/'/g,"\\'")}';
            },400)">
          🧾 New Receipt
        </button>
        <button class="btn btn-ghost btn-sm"
          onclick="closeModal();showPage('risk-radar')">
          ⚠️ Risk Radar
        </button>
      </div>
    </div>

    <!-- Order History -->
    ${clientOrders.length > 0 ? `
      <div class="panel" style="margin-bottom:13px;">
        <div style="font-size:12px;font-weight:800;margin-bottom:11px;">
          📋 Order History (${clientOrders.length})
        </div>
        <div class="table-wrap" style="max-height:280px;overflow-y:auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Order #</th><th>Car</th><th>Period</th>
                <th>Total</th><th>Paid</th><th>Debt</th>
                <th>Status</th><th>Payment</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${clientOrders
                .sort((a, b) => {
                  const { start:as } = getOrderDates(a);
                  const { start:bs } = getOrderDates(b);
                  return (bs||0) - (as||0);
                })
                .map(o => {
                  const { start, end } = getOrderDates(o);
                  const st     = getOrderStatus(o);
                  const sk     = st==='Accident'?'accident':
                                 st==='Overdue' ?'overdue':
                                 st==='Closed'  ?'closed':'active';
                  const oTotal = getOrderTotal(o);
                  const oPaid  = getOrderPaid(o);
                  const oDebt  = Math.max(0, oTotal - oPaid);

                  // ✅ Use global payment status
                  const payK   = getPaymentStatus(o);
                  const payLbl = getPaymentStatusLabel(o);
                  const payC   = (window.PAYMENT_STATUS_COLORS||{})[payK] || '#f59e0b';

                  const carCode    = getOrderCarCode(o);
                  const carInFleet = G.fleet.find(
                    c => String(c.ID||c.id) === String(carCode)
                  );
                  const carLabel = carInFleet
                    ? getCarLabel(carInFleet,'en') : (o['اسم السيارة']||'—');

                  return `
                    <tr style="cursor:pointer;"
                        onclick="closeModal();openOrderDetail('${o.id}')">
                      <td>
                        <span style="color:var(--accent);font-weight:700;">
                          #${getOrderNo(o)}
                        </span>
                      </td>
                      <td style="font-size:11px;">${carLabel}</td>
                      <td style="font-size:10px;">
                        ${start?start.toLocaleDateString('en-GB',{day:'2-digit',month:'short'}):'—'}
                        →
                        ${end?end.toLocaleDateString('en-GB',{day:'2-digit',month:'short'}):'—'}
                      </td>
                      <td>${fmtMoney(oTotal)}</td>
                      <td style="color:var(--success);">${fmtMoney(oPaid)}</td>
                      <td style="color:${oDebt>0?'var(--danger)':'var(--success)'};">
                        ${oDebt>0?fmtMoney(oDebt):'✅'}
                      </td>
                      <td><span class="pill pill-${sk}">${st}</span></td>
                      <td style="font-size:10px;font-weight:700;color:${payC};">
                        ${payLbl}
                      </td>
                      <td onclick="event.stopPropagation()">
                        <div style="display:flex;gap:3px;">
                          <button class="btn btn-ghost btn-xs"
                            onclick="closeModal();openOrderDetail('${o.id}')">
                            👁
                          </button>
                          <button class="btn btn-primary btn-xs"
                            onclick="closeModal();
                              reprintContractFromOrder('${o.id}')">
                            📄
                          </button>
                          <button class="btn btn-ghost btn-xs"
                            onclick="closeModal();
                              viewOrReprintReceipt('${o.id}','${o['No.']||o.id}')">
                            🧾
                          </button>
                        </div>
                      </td>
                    </tr>`;
                }).join('')}
            </tbody>
          </table>
        </div>
      </div>` : `
      <div class="panel" style="margin-bottom:13px;text-align:center;padding:20px;">
        <div style="font-size:24px;margin-bottom:8px;">📋</div>
        <div style="font-size:12px;color:var(--text3);">No orders found for this client</div>
        <button class="btn btn-primary btn-sm" style="margin-top:10px;"
          onclick="closeModal();showPage('en-contract');
            setTimeout(()=>fillCrmFields('en','${c.id}'),400)">
          ➕ Create First Contract
        </button>
      </div>`}

    <!-- Receipts -->
    ${receipts.length > 0 ? `
      <div class="panel">
        <div style="font-size:12px;font-weight:800;margin-bottom:11px;">
          🧾 Receipts (${receipts.length})
        </div>
        <div class="table-wrap" style="max-height:200px;overflow-y:auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Receipt Ref</th><th>Issued</th><th>Contract</th>
                <th>Type</th><th>Amount</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${receipts.map(r => {
                const rRef = r.receipt_ref || r.id;
                return `
                  <tr>
                    <td>
                      <span style="color:var(--accent);font-weight:700;font-size:11px;">
                        ${rRef}
                      </span>
                    </td>
                    <td style="font-size:10px;">
                      ${r.issued_at || r.receipt_date || '—'}
                    </td>
                    <td style="color:var(--accent);cursor:pointer;font-size:11px;"
                        onclick="closeModal();openOrderByNo('${r.contract_no||''}')">
                      ${r.contract_no || '—'}
                    </td>
                    <td>
                      <span class="pill pill-draft" style="font-size:9px;">
                        ${r.type || '—'}
                      </span>
                    </td>
                    <td>
                      <strong style="color:var(--success);">
                        ${fmtMoney(r.total_egp_equiv || 0)}
                      </strong>
                    </td>
                    <td>
                      <button class="btn btn-primary btn-xs"
                        onclick="reprintFromRecord(${
                          JSON.stringify(r).replace(/"/g,'&quot;')})">
                        🖨️
                      </button>
                    </td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>` : ''}
  `;

  openModal(`👤 ${name}`, html, true);
  await logAction('VIEW', 'CRM Hub',
    `Viewed profile: ${name} | ID: ${c['No.']||c.id}`);
};

// ============================================================
// FILL CRM FIELDS IN CONTRACT FORMS
// ============================================================
window.fillCrmFields = function(lang, customerId) {
  const customer = G.customers.find(c => c.id === customerId);
  if (!customer) return;

  const prefix = lang === 'ar' ? 'ar' : 'en';

  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) { el.value = val || ''; el.readOnly = false; }
  };

  set(prefix + '-fname',    customer['الاسم الأول']           || customer.col_C || '');
  set(prefix + '-lname',    customer['الاسم الأخير']          || customer.col_D || '');
  set(prefix + '-pass',     customer['رقم جواز السفر']        || '');
  set(prefix + '-natid',    customer['الرقم القومي']           || '');
  set(prefix + '-phone',    customer['رقم التليفون']           || '');
  set(prefix + '-email',    customer['عنوان البريد الإلكتروني']|| '');
  set(prefix + '-license',  customer['رقم رخصة القيادة']      || '');
  set(prefix + '-nation',   customer['رمز الدولة']            || customer.col_H || '');

  const clientNoEl = document.getElementById(prefix + '-client-no');
  if (clientNoEl) clientNoEl.value = customer['No.'] || customer.col_A || '';

  toast(`✅ Client filled: ${customer['الاسم الأول']||''} ${customer['الاسم الأخير']||''}`,
    'success', 3000);
};

// ============================================================
// ADD CUSTOMER MODAL
// ============================================================
window.openAddCustomerModal = function() {
  const srcOpts = [
    '', 'Website', 'WhatsApp', 'Messenger', 'Instagram',
    'Phone Call', 'Office Visit', 'Referral',
    'Booking.com', 'Airbnb', 'Other'
  ];

  const html = `
    <div class="form-grid">
      <div class="field">
        <label>First Name *</label>
        <input type="text" id="nc-fname" placeholder="First name"/>
      </div>
      <div class="field">
        <label>Last Name *</label>
        <input type="text" id="nc-lname" placeholder="Last name"/>
      </div>
      <div class="field">
        <label>Phone *</label>
        <input type="text" id="nc-phone" placeholder="Phone number"/>
      </div>
      <div class="field">
        <label>Client Source</label>
        <select id="nc-source">
          ${srcOpts.map(s => `
            <option value="${s}">
              ${s || '-- How did they find us? --'}
            </option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>Nationality</label>
        <input type="text" id="nc-nat" placeholder="Country code e.g. EG"/>
      </div>
      <div class="field">
        <label>Email</label>
        <input type="text" id="nc-email" placeholder="Email address"/>
      </div>
      <div class="field">
        <label>National ID</label>
        <input type="text" id="nc-natid" placeholder="National ID number"/>
      </div>
      <div class="field">
        <label>Passport No.</label>
        <input type="text" id="nc-passport" placeholder="Passport number"/>
      </div>
      <div class="field">
        <label>Driver License</label>
        <input type="text" id="nc-license" placeholder="License number"/>
      </div>
      <div class="field" style="grid-column:1/-1;">
        <label>Address</label>
        <input type="text" id="nc-address" placeholder="Address"/>
      </div>
    </div>
    <div style="display:flex;gap:7px;margin-top:13px;">
      <button class="btn btn-success" onclick="saveNewCustomer()">
        💾 Save Customer
      </button>
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    </div>`;
  openModal('➕ Add New Customer', html);
};

window.saveNewCustomer = async function() {
  const fname    = document.getElementById('nc-fname')?.value.trim();
  const lname    = document.getElementById('nc-lname')?.value.trim();
  const phone    = document.getElementById('nc-phone')?.value.trim();

  if (!fname || !lname) { toast('First and last name are required', 'error'); return; }
  if (!phone)           { toast('Phone number is required', 'error'); return; }

  const nat      = document.getElementById('nc-nat')?.value.trim()       || '';
  const natid    = document.getElementById('nc-natid')?.value.trim()     || '';
  const passport = document.getElementById('nc-passport')?.value.trim()  || '';
  const source   = document.getElementById('nc-source')?.value           || '';
  const now      = Date.now();

  try {
    const maxNo  = G.customers.reduce((mx,c) => Math.max(mx, parseInt(c['No.'])||0), 0);
    const nextNo = maxNo + 1;

    const newCust = {
      'No.'                     : String(nextNo),
      'الاسم الأول'             : fname,
      'الاسم الأخير'            : lname,
      'رقم التليفون'            : phone,
      'رمز الدولة'              : nat,
      'الرقم القومي'             : natid,
      'رقم جواز السفر'          : passport,
      'رقم رخصة القيادة'        : document.getElementById('nc-license')?.value.trim()  || '',
      'عنوان البريد الإلكتروني' : document.getElementById('nc-email')?.value.trim()    || '',
      'العنوان'                 : document.getElementById('nc-address')?.value.trim()  || '',
      'client_source'           : source,
      'تاريخ التسجيل'           : new Date().toLocaleDateString('en-GB', {
        month:'2-digit', year:'numeric'
      }),
      '_sys_updated'            : now
    };

    const ref  = await db.collection('customers').add(newCust);
    newCust.id = ref.id;
    G.customers.unshift(newCust);

    await logAction('ADD', 'CRM Hub',
      `New customer: ${fname} ${lname} | ID: ${passport||natid}`);

    closeModal();
    if (G.currentPage === 'crm') filterCRM();

    const goProposal = confirm(
      `Customer ${fname} ${lname} added!\n\nCreate a proposal now?`
    );
    if (goProposal) {
      showPage('proposals');
      setTimeout(() => prefillProposalClient(ref.id, `${fname} ${lname}`), 400);
    } else {
      toast(`Customer ${fname} ${lname} added!`, 'success');
    }

  } catch (e) {
    toast('Save failed: ' + e.message, 'error');
  }
};

// ============================================================
// EDIT CUSTOMER MODAL
// ============================================================
window.openEditCustomerModal = function(customerId) {
  const c = G.customers.find(x => x.id === customerId);
  if (!c) return;

  const firstName = c['الاسم الأول']  || c.col_C || '';
  const lastName  = c['الاسم الأخير'] || c.col_D || '';
  const name      = (firstName + ' ' + lastName).trim();

  const srcOpts = [
    '', 'Website', 'WhatsApp', 'Messenger', 'Instagram',
    'Phone Call', 'Office Visit', 'Referral',
    'Booking.com', 'Airbnb', 'Other'
  ];

  const html = `
    <div style="font-size:10px;color:var(--success);
                margin-bottom:11px;font-weight:700;">
      CRM ID: #${c['No.']||c.col_A||c.id}
    </div>
    <div class="form-grid">
      <div class="field">
        <label>First Name</label>
        <input type="text" id="ec-fname"
          value="${c['الاسم الأول']||c.col_C||''}"/>
      </div>
      <div class="field">
        <label>Last Name</label>
        <input type="text" id="ec-lname"
          value="${c['الاسم الأخير']||c.col_D||''}"/>
      </div>
      <div class="field">
        <label>Phone</label>
        <input type="text" id="ec-phone"
          value="${c['رقم التليفون']||''}"/>
      </div>
      <div class="field">
        <label>Client Source</label>
        <select id="ec-source">
          ${srcOpts.map(s => `
            <option value="${s}"
              ${(c.client_source||'') === s ? 'selected' : ''}>
              ${s || '-- How did they find us? --'}
            </option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>Nationality</label>
        <input type="text" id="ec-nat"
          value="${c['رمز الدولة']||c.col_H||''}"/>
      </div>
      <div class="field">
        <label>Email</label>
        <input type="text" id="ec-email"
          value="${c['عنوان البريد الإلكتروني']||''}"/>
      </div>
      <div class="field">
        <label>National ID</label>
        <input type="text" id="ec-natid"
          value="${c['الرقم القومي']||''}"/>
      </div>
      <div class="field">
        <label>Passport No.</label>
        <input type="text" id="ec-passport"
          value="${c['رقم جواز السفر']||''}"/>
      </div>
      <div class="field">
        <label>Driver License</label>
        <input type="text" id="ec-license"
          value="${c['رقم رخصة القيادة']||''}"/>
      </div>
      <div class="field" style="grid-column:1/-1;">
        <label>Address</label>
        <input type="text" id="ec-address"
          value="${c['العنوان']||''}"/>
      </div>
    </div>
    <div style="display:flex;gap:7px;margin-top:13px;flex-wrap:wrap;">
      <button class="btn btn-success"
        onclick="updateCustomer('${customerId}')">
        💾 Save Changes
      </button>
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      ${G.user?.role === 'Admin' ? `
        <button class="btn btn-sm"
          style="background:var(--danger);color:#fff;margin-left:auto;"
          onclick="adminDeleteCustomer('${customerId}')">
          🗑️ Delete
        </button>` : ''}
    </div>`;

  openModal(`✏️ Edit Customer — ${name}`, html);
};

window.updateCustomer = async function(customerId) {
  try {
    const upd = {
      'الاسم الأول'              : document.getElementById('ec-fname')?.value.trim()    || '',
      'الاسم الأخير'             : document.getElementById('ec-lname')?.value.trim()    || '',
      'رقم التليفون'             : document.getElementById('ec-phone')?.value.trim()    || '',
      'رمز الدولة'               : document.getElementById('ec-nat')?.value.trim()      || '',
      'الرقم القومي'              : document.getElementById('ec-natid')?.value.trim()   || '',
      'رقم جواز السفر'           : document.getElementById('ec-passport')?.value.trim() || '',
      'رقم رخصة القيادة'         : document.getElementById('ec-license')?.value.trim()  || '',
      'عنوان البريد الإلكتروني'  : document.getElementById('ec-email')?.value.trim()   || '',
      'العنوان'                  : document.getElementById('ec-address')?.value.trim()  || '',
      'client_source'            : document.getElementById('ec-source')?.value          || '',
      '_sys_updated'             : Date.now()
    };

    await db.collection('customers').doc(customerId).update(upd);

    const idx = G.customers.findIndex(c => c.id === customerId);
    if (idx > -1) G.customers[idx] = { ...G.customers[idx], ...upd };

    await logAction('EDIT', 'CRM Hub', `Updated customer: ${customerId}`);
    toast('Customer updated!', 'success');
    closeModal();
    filterCRM();
  } catch (e) {
    toast('Update failed: ' + e.message, 'error');
  }
};

// ============================================================
// VIEW CUSTOMER ORDERS — modal list
// ============================================================
window.viewCustomerOrders = function(clientNo, clientName) {
  const ordersSource = (window.allOrders && window.allOrders.length > 0)
    ? window.allOrders : G.bookings;

  const orders = ordersSource.filter(o =>
    String(o['كود العميل'] || '').trim() === String(clientNo)
  );

  if (!orders.length) {
    toast(`No orders found for ${clientName}`, 'info');
    return;
  }
  _openOrdersListModal(orders, clientName);
};

function _openOrdersListModal(orders, clientName) {
  const today = getCairoNow();
  const html  = `
    <div style="margin-bottom:11px;font-size:12px;color:var(--text3);">
      ${orders.length} order${orders.length !== 1 ? 's' : ''} found
    </div>
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Order #</th><th>Car</th><th>Start</th>
            <th>End</th><th>Total</th><th>Paid</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${orders
            .sort((a, b) => {
              const { start:as } = getOrderDates(a);
              const { start:bs } = getOrderDates(b);
              return (bs||0) - (as||0);
            })
            .map(o => {
              const { start, end } = getOrderDates(o);
              const st   = getOrderStatus(o);
              const isOD = !o.closed && end && today > end &&
                           (st==='Active'||st==='Overdue');
              const sk   = st==='Accident'?'accident':
                           isOD?'overdue':st==='Closed'?'closed':'active';
              const sl   = isOD ? 'OVERDUE' : st;
              const carCode    = getOrderCarCode(o);
              const carInFleet = G.fleet.find(
                c => String(c.ID||c.id) === String(carCode)
              );
              const carLabel   = carInFleet
                ? getCarLabel(carInFleet,'en') : (o['اسم السيارة']||'—');

              return `
                <tr style="cursor:pointer;"
                    onclick="closeModal();openOrderDetail('${o.id}')">
                  <td>
                    <span style="color:var(--accent);font-weight:700;">
                      #${getOrderNo(o)}
                    </span>
                  </td>
                  <td style="font-size:11px;">${carLabel}</td>
                  <td style="font-size:11px;">
                    ${start?fmtDate(start):'—'}
                  </td>
                  <td style="font-size:11px;">
                    ${end?fmtDate(end):'—'}
                  </td>
                  <td>${fmtMoney(getOrderTotal(o))}</td>
                  <td>${fmtMoney(getOrderPaid(o))}</td>
                  <td><span class="pill pill-${sk}">${sl}</span></td>
                </tr>`;
            }).join('')}
        </tbody>
      </table>
    </div>`;

  openModal(`📋 Orders — ${clientName}`, html, true);
}

// ============================================================
// PREFILL PROPOSAL FROM CRM
// ============================================================
window.prefillProposalClient = function(customerId, clientName) {
  const customer = G.customers.find(c => c.id === customerId);
  if (!customer) return;

  const firstName = customer['الاسم الأول'] || customer.col_C || '';
  const lastName  = customer['الاسم الأخير']|| customer.col_D || '';
  const phone     = customer['رقم التليفون']|| '';

  const set = (id, v) => {
    const el = document.getElementById(id); if (el) el.value = v || '';
  };
  set('pr-fname', firstName);
  set('pr-lname', lastName);
  set('pr-phone', phone);

  const searchEl = document.getElementById('pr-client-search');
  if (searchEl) {
    searchEl.value = clientName;
    searchEl.dispatchEvent(new Event('input'));
  }

  window['_crm_pr_id'] = customerId;
  toast('Client pre-filled: ' + clientName, 'success');
};

// ============================================================
// REPRINT CONTRACT / RECEIPT FROM ORDER
// ============================================================
window.reprintContractFromOrder = function(orderId) {
  closeModal();
  showPage('en-contract');
  setTimeout(() => {
    const o = (window.allOrders||[]).find(x => x.id === orderId) ||
               G.bookings.find(x => x.id === orderId);
    if (!o) return;

    const toDateTimeLocal = str => {
      if (!str) return '';
      const d = parseDBDate(str);
      if (!d || isNaN(d.getTime())) return '';
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${
        String(d.getDate()).padStart(2,'0')}T${
        String(d.getHours()).padStart(2,'0')}:${
        String(d.getMinutes()).padStart(2,'0')}`;
    };

    const set = (id, val) => {
      const el = document.getElementById(id); if (el) el.value = val || '';
    };

    set('en-pickup',   toDateTimeLocal(o['بداية التعاقد']));
    set('en-dropoff',  toDateTimeLocal(o['نهاية التعاقد']));
    set('en-daily',    String(parseAmount(o['سعر السيارة اليومي بالجنيه المصري'])||0));
    set('en-paid-egp', String(parseAmount(o['المدفوع EGP'])||0));

    const carId  = String(o['كود السيارة']||'');
    const carSel = document.getElementById('en-car');
    if (carSel && carId) {
      carSel.value = carId;
      if (typeof showCarInfoBadge === 'function') showCarInfoBadge(carId,'en-car-badge');
    }

    const branchSel = document.getElementById('en-branch');
    if (branchSel && o['فرع الإصدار']) branchSel.value = o['فرع الإصدار'];

    if (o['كود العميل']) {
      const client = G.customers.find(
        c => String(c['No.']) === String(o['كود العميل'])
      );
      if (client) {
        fillCrmFields('en', client.id);
      } else {
        const parts = (o['اسم العميل']||'').split(' ');
        set('en-fname', parts[0]||'');
        set('en-lname', parts.slice(1).join(' ')||'');
      }
    }

    if (typeof enCalc === 'function') enCalc();
    toast(`Order #${o['No.']} loaded`, 'info', 5000);
  }, 600);
};

window.reprintReceiptFromOrder = function(orderId) {
  closeModal();
  const o = (window.allOrders||[]).find(x => x.id === orderId) ||
             G.bookings.find(x => x.id === orderId);
  if (!o) return;

  // ✅ Use viewOrReprintReceipt from orders.js
  if (typeof viewOrReprintReceipt === 'function') {
    viewOrReprintReceipt(orderId, o['No.']||orderId);
    return;
  }

  showPage('receipts');
  setTimeout(() => {
    const el = document.getElementById('rc-contract-no');
    if (el) {
      el.value = o['No.'] || '';
      if (typeof rcLookupDebounced === 'function') rcLookupDebounced();
    }
    toast(`Order #${o['No.']} loaded in receipts`, 'info', 5000);
  }, 400);
};

// ============================================================
// ADMIN DELETE CUSTOMER
// ============================================================
window.adminDeleteCustomer = async function(customerId) {
  if (G.user?.role !== 'Admin') return;
  if (!confirm('Delete this customer permanently?')) return;
  try {
    await db.collection('customers').doc(customerId).delete();
    G.customers = G.customers.filter(c => c.id !== customerId);
    closeModal();
    filterCRM();
    toast('Customer deleted', 'success');
  } catch (e) {
    toast('Delete failed: ' + e.message, 'error');
  }
};
