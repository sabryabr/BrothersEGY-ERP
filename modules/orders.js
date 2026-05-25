// ============================================================
// modules/orders.js
// Order Book — table, detail modal, payments, bulk ops,
// order edit, extend, switch car, photo upload, reminders
// ============================================================

// ============================================================
// ENTRY POINT
// ============================================================

window.renderOrderBook = function() {
  renderPageLoading('page-order-book', '📋', 'Order Book');
  loadOrderBook();
};

window.loadOrderBook = async function() {
  const el = document.getElementById('page-order-book');
  if (!el) return;

  el.innerHTML = `
    <div class="section-header">
      <div>
        <h2>📋 Order Book</h2>
        <p>All rental orders with live status and debt tracking</p>
      </div>
      <div style="display:flex;gap:7px;flex-wrap:wrap;">
        <button class="btn btn-primary btn-sm"
          onclick="showPage('en-contract')">➕ New Order</button>
        <button class="btn btn-ghost btn-sm"
          onclick="refreshOrderBook()">🔄 Refresh</button>
        <button id="bulk-mode-btn" class="btn btn-ghost btn-sm"
          onclick="toggleBulkMode()">☑️ Select</button>
      </div>
    </div>

    <!-- Filters -->
    <div class="panel" style="margin-bottom:14px;">
      <div style="display:flex;gap:9px;flex-wrap:wrap;align-items:flex-end;">
        <div style="flex:1;min-width:170px;">
          <div style="font-size:10px;color:var(--text3);
            margin-bottom:3px;font-weight:700;">🔍 SEARCH</div>
          <input type="text" id="ob-search"
            placeholder="Client, order #, car..."
            style="width:100%;padding:7px 11px;
              background:var(--surface2);
              border:1px solid var(--border);
              border-radius:8px;color:var(--text);"
            oninput="clearTimeout(window._obSearchTimer);
              window._obSearchTimer=setTimeout(filterOrders,300)"/>
        </div>
        <div>
          <div style="font-size:10px;color:var(--text3);
            margin-bottom:3px;font-weight:700;">STATUS</div>
          <select id="ob-status" onchange="filterOrders()"
            style="padding:7px 9px;background:var(--surface2);
              border:1px solid var(--border);
              border-radius:8px;color:var(--text);">
            <option value="all">All</option>
            <option value="Active">Active</option>
            <option value="overdue">Overdue</option>
            <option value="Future">Future</option>
            <option value="Accident">Accident</option>
            <option value="Closed">Closed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
        <div id="ob-branch-wrap">
          <div style="font-size:10px;color:var(--text3);
            margin-bottom:3px;font-weight:700;">BRANCH</div>
          <select id="ob-branch" onchange="filterOrders()"
            style="padding:7px 9px;background:var(--surface2);
              border:1px solid var(--border);
              border-radius:8px;color:var(--text);">
            <option value="all">All Branches</option>
            <option value="HRG">Hurghada</option>
            <option value="ALX">Alexandria</option>
            <option value="CAI">Cairo</option>
            <option value="RSH">Rashid</option>
          </select>
        </div>
        <div>
          <div style="font-size:10px;color:var(--text3);
            margin-bottom:3px;font-weight:700;">FROM</div>
          <input type="date" id="ob-from" onchange="filterOrders()"
            style="padding:7px 9px;background:var(--surface2);
              border:1px solid var(--border);
              border-radius:8px;color:var(--text);"/>
        </div>
        <div>
          <div style="font-size:10px;color:var(--text3);
            margin-bottom:3px;font-weight:700;">TO</div>
          <input type="date" id="ob-to" onchange="filterOrders()"
            style="padding:7px 9px;background:var(--surface2);
              border:1px solid var(--border);
              border-radius:8px;color:var(--text);"/>
        </div>
        <button class="btn btn-ghost btn-sm"
          onclick="clearOrderFilters()">✕ Clear</button>
      </div>
      <div id="ob-filter-pills"
        style="display:flex;gap:5px;flex-wrap:wrap;margin-top:9px;">
      </div>
    </div>

    <!-- Summary bar -->
    <div style="display:grid;
      grid-template-columns:repeat(auto-fill,minmax(120px,1fr));
      gap:7px;margin-bottom:14px;" id="ob-summary-bar">
    </div>

    <!-- Bulk toolbar -->
    <div id="bulk-toolbar"
      style="display:none;background:var(--surface2);
        border:1px solid var(--accent);border-radius:8px;
        padding:10px 14px;margin-bottom:10px;
        align-items:center;gap:10px;flex-wrap:wrap;">
      <span id="bulk-count"
        style="font-size:11px;font-weight:700;color:var(--accent);">
        0 selected
      </span>
      <button class="btn btn-ghost btn-sm"
        onclick="bulkSelectAll()">Select All</button>
      <button class="btn btn-ghost btn-sm"
        onclick="bulkClearAll()">Clear</button>
      <div style="width:1px;height:20px;background:var(--border);"></div>
      <select id="bulk-status-sel"
        style="padding:4px 8px;background:var(--surface2);
          border:1px solid var(--border);border-radius:6px;
          color:var(--text);">
        <option value="">-- Set Status --</option>
        <option value="Active">Active</option>
        <option value="Closed">Closed</option>
        <option value="Cancelled">Cancelled</option>
        <option value="Accident">Accident</option>
      </select>
      <button class="btn btn-primary btn-sm"
        onclick="bulkUpdateStatus()">✅ Apply Status</button>
      <button class="btn btn-danger btn-sm"
        onclick="bulkDelete()">🗑️ Delete Selected</button>
      <button class="btn btn-ghost btn-sm"
        onclick="toggleBulkMode()">✕ Cancel</button>
    </div>

    <!-- Table -->
    <div class="panel">
      <div id="ob-table-wrap" class="table-wrap">
        <div class="empty-state">
          <div class="spinner lg"></div>
        </div>
      </div>
    </div>`;

  // Hide branch filter for non-privileged users
  if (!['Admin', 'Executive'].includes(G.user?.role)) {
    const bw = document.getElementById('ob-branch-wrap');
    if (bw) bw.style.display = 'none';
  }

  // Use cached data immediately
  if (G.bookings && G.bookings.length) {
    window.allOrders = G.bookings;
    filterOrders();
  }

  subscribeOrders();
};

// ============================================================
// ORDER SUBSCRIPTION
// ============================================================

window.subscribeOrders = function() {
  if (allOrders.length > 0) {
    filterOrders();
    updateOrderSummaryBar();
    return;
  }

  if (window._orderSubActive) return;
  window._orderSubActive = true;

  if (window._ordersUnsub) {
    window._ordersUnsub();
    window._ordersUnsub = null;
  }

  const isPriv = ['Admin', 'Executive'].includes(G.user?.role);
  const query  = isPriv
    ? db.collection('bookings').limit(2000)
    : db.collection('bookings').limit(600);

  const unsub = query.onSnapshot(snap => {
    let orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (!isPriv) {
      orders = orders.filter(o =>
        o['فرع الإصدار']    === G.user.branch ||
        o.assigned_user === G.user.username   ||
        (!o['فرع الإصدار'] && !o.assigned_user)
      );
    }

    window.allOrders = orders;
    G.bookings       = orders;

    // Sort: orders with No. first, then by start date descending
    allOrders.sort((a, b) => {
      const aNo = a['No.'] || '';
      const bNo = b['No.'] || '';
      if (!aNo && bNo) return 1;
      if (aNo && !bNo) return -1;
      const { start: aS } = getOrderDates(a);
      const { start: bS } = getOrderDates(b);
      return (bS || 0) - (aS || 0);
    });

    filterOrders();
    updateOrderSummaryBar();
  }, e => {
    console.warn('Orders snapshot error:', e.message);
  });

  G.unsubscribers.push(unsub);
  window._ordersUnsub = unsub;
};

// ============================================================
// FILTER ORDERS
// ============================================================

window.filterOrders = debounce(function() {
  if (!allOrders || !allOrders.length) {
    window.allOrders = G.bookings || [];
  }

  const search = (document.getElementById('ob-search')?.value || '').toLowerCase();
  const status = document.getElementById('ob-status')?.value || 'all';
  const branch = document.getElementById('ob-branch')?.value || 'all';
  const from   = document.getElementById('ob-from')?.value   || '';
  const to     = document.getElementById('ob-to')?.value     || '';
  const today  = new Date();

  let filtered = allOrders.filter(o => {
    if (search) {
      const hay = [
        getOrderClientName(o), getOrderNo(o),
        o['اسم السيارة'], o['كود العميل'],
        o['فرع الإصدار'], o.assigned_user,
        getOrderCarCode(o)
      ].join(' ').toLowerCase();
      if (!hay.includes(search)) return false;
    }

    if (status !== 'all') {
      const st = getOrderStatus(o);
      if (status === 'overdue') {
        const { end } = getOrderDates(o);
        if (!(end && today > end && !o.closed &&
             (st === 'Active' || st === 'Overdue'))) return false;
      } else if (status === 'Active') {
        if (st !== 'Active') return false;
      } else if (status === 'Future') {
        if (st !== 'Future') return false;
      } else {
        if (st !== status) return false;
      }
    }

    if (branch !== 'all' && o['فرع الإصدار'] !== branch) return false;

    if (from || to) {
      const { start } = getOrderDates(o);
      if (from && start && start < new Date(from)) return false;
      if (to   && start && start > new Date(to))   return false;
    }

    return true;
  });

  // Sort filtered results
  filtered.sort((a, b) => {
    const aNo = a['No.'] || '';
    const bNo = b['No.'] || '';
    if (!aNo && bNo) return 1;
    if (aNo && !bNo) return -1;
    const { start: sa } = getOrderDates(a);
    const { start: sb } = getOrderDates(b);
    if (!sa && !sb) return 0;
    if (!sa) return 1;
    if (!sb) return -1;
    return sb - sa;
  });

  renderOrdersTable(filtered);
  _updateFilterPills(search, status, branch, from, to);
}, 150);

function _updateFilterPills(search, status, branch, from, to) {
  const pills = document.getElementById('ob-filter-pills');
  if (!pills) return;

  const active = [];
  if (search)       active.push({ label: `Search: "${search}"`, key: 'search' });
  if (status !== 'all') active.push({ label: `Status: ${status}`,  key: 'status' });
  if (branch !== 'all') active.push({ label: `Branch: ${BRANCH_MAP[branch] || branch}`, key: 'branch' });
  if (from)         active.push({ label: `From: ${from}`, key: 'from' });
  if (to)           active.push({ label: `To: ${to}`,     key: 'to'   });

  pills.innerHTML = active.map(p => `
    <span style="padding:3px 9px;border-radius:99px;font-size:10px;
      font-weight:700;background:rgba(59,130,246,0.15);color:var(--accent);
      border:1px solid rgba(59,130,246,0.3);cursor:pointer;"
      onclick="clearFilter('${p.key}')">
      ${p.label} ✕
    </span>`).join('');
}

window.clearFilter = function(key) {
  const map = {
    search: 'ob-search', status: 'ob-status',
    branch: 'ob-branch', from:   'ob-from',   to: 'ob-to'
  };
  const el = document.getElementById(map[key]);
  if (el) el.value = (key === 'status' || key === 'branch') ? 'all' : '';
  filterOrders();
};

window.clearOrderFilters = function() {
  ['ob-search', 'ob-from', 'ob-to'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['ob-status', 'ob-branch'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = 'all';
  });
  filterOrders();
};

window.setOrderFilter = function(status) {
  const sel = document.getElementById('ob-status');
  if (sel) sel.value = status;
  filterOrders();
  updateOrderSummaryBar();
};

// ============================================================
// SUMMARY BAR
// ============================================================

window.updateOrderSummaryBar = function() {
  const bar = document.getElementById('ob-summary-bar');
  if (!bar || !allOrders.length) return;

  const today   = new Date();
  const active  = allOrders.filter(o => getOrderStatus(o) === 'Active').length;
  const overdue = allOrders.filter(o => {
    const { end } = getOrderDates(o);
    const st = getOrderStatus(o);
    return end && today > end && !o.closed &&
           (st === 'Active' || st === 'Overdue');
  }).length;
  const accident = allOrders.filter(o => getOrderStatus(o) === 'Accident').length;
  const closed   = allOrders.filter(o => {
    const st = getOrderStatus(o);
    return st === 'Closed' || o.closed === true;
  }).length;
  const totalDebt = allOrders.reduce((sum, o) => {
    const st = getOrderStatus(o);
    if (st === 'Closed') return sum;
    const total = getOrderTotal(o);
    const paid  = getOrderPaid(o);
    const { end } = getOrderDates(o);
    const daily = parseAmount(o['سعر السيارة اليومي بالجنيه المصري']) ||
                  (total / Math.max(1, parseFloat(o.rental_days || 1)));
    let debt = total - paid;
    if (end && today > end && !o.closed) {
      debt += Math.max(0, Math.ceil((today - end) / 86400000)) * daily;
    }
    return sum + Math.max(0, debt);
  }, 0);

  const curStatus = document.getElementById('ob-status')?.value || 'all';
  const card = key => `border:2px solid ${curStatus === key
    ? 'var(--accent)' : 'transparent'};transition:border 0.15s;`;

  bar.innerHTML = `
    <div class="kpi-card" style="${card('all')}cursor:pointer;"
      onclick="setOrderFilter('all')">
      <div class="kpi-label">All</div>
      <div class="kpi-value" style="font-size:18px;">${allOrders.length}</div>
    </div>
    <div class="kpi-card" style="${card('Active')}cursor:pointer;"
      onclick="setOrderFilter('Active')">
      <div class="kpi-label">Active</div>
      <div class="kpi-value text-accent" style="font-size:18px;">${active}</div>
    </div>
    <div class="kpi-card" style="${card('overdue')}cursor:pointer;"
      onclick="setOrderFilter('overdue')">
      <div class="kpi-label">Overdue</div>
      <div class="kpi-value text-danger" style="font-size:18px;">${overdue}</div>
    </div>
    <div class="kpi-card" style="${card('Accident')}cursor:pointer;"
      onclick="setOrderFilter('Accident')">
      <div class="kpi-label">Accident</div>
      <div class="kpi-value text-warning" style="font-size:18px;">${accident}</div>
    </div>
    <div class="kpi-card" style="${card('Closed')}cursor:pointer;"
      onclick="setOrderFilter('Closed')">
      <div class="kpi-label">Closed</div>
      <div class="kpi-value" style="font-size:18px;color:var(--text3);">
        ${closed}
      </div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Total Debt</div>
      <div class="kpi-value text-danger" style="font-size:16px;">
        ${fmtMoney(totalDebt)}
      </div>
    </div>`;
};

// ============================================================
// RENDER ORDERS TABLE
// ============================================================

window.renderOrdersTable = function(orders) {
  const wrap = document.getElementById('ob-table-wrap');
  if (!wrap) return;

  if (!orders.length) {
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="es-icon">📋</div>
        <p>No orders match your filters</p>
      </div>`;
    return;
  }

  const today = new Date();

  wrap.innerHTML = `
    <div style="font-size:11px;color:var(--text3);
      margin-bottom:8px;padding:0 2px;">
      Showing <strong style="color:var(--text);">${orders.length}</strong>
      of <strong>${allOrders.length}</strong> orders
      ${orders.length < allOrders.length
        ? `<span style="color:var(--accent);margin-left:6px;cursor:pointer;"
            onclick="clearOrderFilters()">Clear filters</span>` : ''}
    </div>
    <table class="data-table">
      <thead>
        <tr>
          ${window.bulkMode ? '<th style="width:32px;"></th>' : ''}
          <th>Order #</th><th>Client</th><th>Car</th>
          <th>Period</th><th>Total</th><th>Paid</th>
          <th>Debt</th><th>Status</th><th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${orders.map(o => _buildOrderRow(o, today)).join('')}
      </tbody>
    </table>
    <div style="padding:9px 11px;font-size:11px;color:var(--text3);
      border-top:1px solid var(--border);">
      Showing ${orders.length} order${orders.length !== 1 ? 's' : ''}
    </div>`;

  wrap.style.display    = 'block';
  wrap.style.visibility = 'visible';
  wrap.style.opacity    = '1';
};

function _buildOrderRow(o, today) {
  const { start, end } = getOrderDates(o);
  const days      = start && end
    ? Math.ceil((end - start) / 86400000)
    : parseInt(o.rental_days || 0);
  const total     = getOrderTotal(o);
  const paid      = getOrderPaid(o);
  const daily     = parseAmount(o['سعر السيارة اليومي بالجنيه المصري']) ||
                    (total / Math.max(1, parseFloat(o.rental_days || 1)));
  const statusRaw = getOrderStatus(o);
  const isAccident= statusRaw === 'Accident';
  const isClosed  = statusRaw === 'Closed' || o.closed === true;
  const isOverdue = !isClosed && end && today > end && !o.closed &&
                    (statusRaw === 'Active' || statusRaw === 'Overdue');

  let lateDays = 0, latePenalty = 0;
  if ((isOverdue || isAccident) && end && !o.closed) {
    lateDays    = Math.max(0, Math.ceil((today - end) / 86400000));
    latePenalty = lateDays * daily;
  }

  const totalDue  = total + latePenalty;
  const debt      = isClosed ? 0 : Math.max(0, totalDue - paid);
  const pct       = totalDue > 0
    ? Math.min(100, Math.round(paid / totalDue * 100)) : 100;
  const statusKey = isAccident ? 'accident' : isOverdue ? 'overdue' :
                    isClosed   ? 'closed'   :
                    (statusRaw || 'active').toLowerCase();
  const statusLabel = isAccident ? 'ACCIDENT' : isOverdue ? 'OVERDUE' :
                      isClosed   ? 'Closed'   : (statusRaw || 'Active');

  const carCode    = getOrderCarCode(o);
  const carInFleet = G.fleet.find(
    c => String(c.ID || c.id) === String(carCode)
  );
  const carLabel   = carInFleet
    ? getCarLabel(carInFleet, 'en') : (o['اسم السيارة'] || '-');
  const clientId   = o['كود العميل'] || '';

  return `
    <tr style="cursor:pointer;${isClosed ? 'opacity:0.7;' : ''}"
      onclick="openOrderDetail('${o.id}')">
      ${window.bulkMode ? `
        <td style="width:32px;padding:4px 8px;"
          onclick="event.stopPropagation()">
          <input type="checkbox" class="bulk-cb"
            data-id="${o.id}"
            ${window.bulkSelected.has(o.id) ? 'checked' : ''}
            onchange="toggleBulkSelect('${o.id}',this)"
            onclick="event.stopPropagation()"/>
        </td>` : ''}
      <td>
        <span style="color:var(--accent);font-weight:700;">
          #${getOrderNo(o)}
        </span>
      </td>
      <td>
        <div style="font-weight:600;">${getOrderClientName(o) || '-'}</div>
        ${clientId
          ? `<div style="font-size:10px;color:var(--text3);">ID: ${clientId}</div>`
          : ''}
      </td>
      <td style="font-size:11px;max-width:140px;white-space:nowrap;
        overflow:hidden;text-overflow:ellipsis;">
        ${carLabel}
      </td>
      <td style="font-size:10px;white-space:nowrap;">
        ${start
          ? start.toLocaleDateString('en-GB', { day:'2-digit', month:'short' })
          : '—'}
        <span style="color:var(--text3);">→</span>
        ${end
          ? end.toLocaleDateString('en-GB', { day:'2-digit', month:'short' })
          : '—'}
        <br>
        <span style="font-size:9px;color:var(--text3);">
          ${days}d
          ${isOverdue
            ? `<span style="color:var(--danger);">+${lateDays}d late</span>`
            : ''}
        </span>
      </td>
      <td style="white-space:nowrap;">${fmtMoney(total)}</td>
      <td>
        <div style="white-space:nowrap;">${fmtMoney(paid)}</div>
        <div style="background:var(--surface3);border-radius:99px;
          height:3px;width:55px;margin-top:3px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;border-radius:99px;
            background:${pct >= 100
              ? 'var(--success)' : pct > 50
              ? 'var(--accent)'  : 'var(--warning)'};"></div>
        </div>
      </td>
      <td style="white-space:nowrap;">
        <span style="font-weight:700;
          color:${debt > 0 ? 'var(--danger)' : 'var(--success)'};">
          ${debt > 0 ? fmtMoney(debt) : '✅ Clear'}
        </span>
        ${latePenalty > 0
          ? `<div style="font-size:9px;color:var(--danger);">
              +${fmtMoney(latePenalty)}
            </div>` : ''}
      </td>
      <td>
        <span class="pill pill-${statusKey}">${statusLabel}</span>
      </td>
      <td onclick="event.stopPropagation()">
        <div style="display:flex;gap:3px;">
          <button class="btn btn-ghost btn-xs"
            onclick="event.stopPropagation();openOrderDetail('${o.id}')">
            👁
          </button>
          <button class="btn btn-warning btn-xs"
            onclick="event.stopPropagation();openOrderEdit('${o.id}')">
            ✏️
          </button>
          <button class="btn btn-primary btn-xs"
            onclick="event.stopPropagation();quickAddPayment('${o.id}')">
            💰
          </button>
        </div>
      </td>
    </tr>`;
}

window.refreshOrderBook = function() {
  const wrap = document.getElementById('ob-table-wrap');
  if (wrap) wrap.innerHTML =
    '<div class="empty-state"><div class="spinner lg"></div></div>';
  window._orderSubActive = false;
  subscribeOrders();
};

// ============================================================
// ORDER DETAIL MODAL
// ============================================================

window.openOrderDetail = async function(orderId) {
  pushNav('Order #' + orderId, () => openOrderDetail(orderId));

  let o = allOrders.find(x => x.id === orderId);
  if (!o) {
    try {
      const snap = await db.collection('bookings').doc(orderId).get();
      if (!snap.exists) { toast('Order not found', 'error'); return; }
      o = { id: snap.id, ...snap.data() };
      if (!allOrders.find(x => x.id === o.id)) allOrders.push(o);
    } catch (e) { toast('Failed to load order', 'error'); return; }
  }

  const today  = new Date();
  const { start, end } = getOrderDates(o);
  const total  = getOrderTotal(o);
  const paid   = getOrderPaid(o);
  const daily  = parseAmount(o['سعر السيارة اليومي بالجنيه المصري']) ||
                 (total / Math.max(1, parseFloat(o.rental_days || 1)));
  const statusRaw  = getOrderStatus(o);
  const isAccident = statusRaw === 'Accident';
  const isClosed   = statusRaw === 'Closed' || o.closed === true;
  const isOverdue  = !isClosed && end && today > end && !o.closed &&
                     (statusRaw === 'Active' || statusRaw === 'Overdue');

  let lateDays = 0, latePenalty = 0;
  if ((isOverdue || isAccident) && end && !o.closed) {
    lateDays    = Math.max(0, Math.ceil((today - end) / 86400000));
    latePenalty = lateDays * daily;
  }

  const totalDue     = total + latePenalty;
  const debt         = isClosed ? 0 : Math.max(0, totalDue - paid);
  const depositHeld  = parseAmount(o['الوديعة المحتجزة'] || o['deposit_held'] || 0);
  const depositRet   = parseAmount(o['الوديعة المردودة'] || o['deposit_returned'] || 0);

  const customer   = G.customers.find(
    c => String(c['No.'] || c.col_A) === String(o['كود العميل'])
  );
  const carCode    = getOrderCarCode(o);
  const carInFleet = G.fleet.find(
    c => String(c.ID || c.id) === String(carCode)
  );
  const carLabel   = carInFleet
    ? getCarLabel(carInFleet, 'en') : (o['اسم السيارة'] || '-');

  const bannerBg = isAccident ? 'rgba(249,115,22,0.1)' :
                   isOverdue  ? 'rgba(239,68,68,0.1)'  :
                   isClosed   ? 'rgba(100,116,139,0.1)': 'rgba(34,197,94,0.1)';

  const html = `
    <!-- Status banner -->
    <div style="padding:10px 13px;border-radius:9px;margin-bottom:14px;
      background:${bannerBg};display:flex;align-items:center;gap:11px;">
      <span style="font-size:20px;">
        ${isAccident ? '🚨' : isOverdue ? '⚠️' : isClosed ? '✅' : '🚗'}
      </span>
      <div>
        <div style="font-weight:800;font-size:13px;">
          Order #${getOrderNo(o)}
          ${isOverdue ? '— OVERDUE' : isAccident ? '— ACCIDENT' :
            isClosed  ? '— CLOSED'  : '— ACTIVE'}
        </div>
        ${lateDays > 0 ? `
          <div style="font-size:11px;color:var(--danger);">
            ${lateDays} days ${isAccident ? 'since accident' : 'overdue'}
            • Penalty: ${fmtMoney(latePenalty)}
          </div>` : ''}
      </div>
    </div>

    <!-- Info grid -->
    <div style="display:grid;grid-template-columns:1fr 1fr;
      gap:11px;margin-bottom:14px;">

      <!-- Client -->
      <div class="panel">
        <div style="font-size:10px;font-weight:800;color:var(--accent);
          text-transform:uppercase;margin-bottom:9px;">👤 Client</div>
        <div style="font-size:13px;font-weight:700;
          cursor:${customer ? 'pointer' : 'default'};
          color:${customer ? 'var(--accent)' : 'var(--text)'};"
          ${customer
            ? `onclick="closeModal();setTimeout(()=>openClientProfile('${customer.id}'),100)"`
            : ''}>
          ${o['اسم العميل'] || '-'}${customer ? ' 🔗' : ''}
        </div>
        <div style="font-size:11px;color:var(--text3);margin-top:3px;">
          CRM ID: ${o['كود العميل'] || '-'}
        </div>
        ${customer ? `
          <div style="font-size:11px;color:var(--text2);margin-top:3px;">
            📞 ${customer['رقم التليفون'] || '-'}
          </div>
          <div style="font-size:11px;color:var(--text2);">
            🪪 ${customer['رقم جواز السفر'] || customer['الرقم القومي'] || '-'}
          </div>` : ''}
      </div>

      <!-- Vehicle -->
      <div class="panel">
        <div style="font-size:10px;font-weight:800;color:var(--accent);
          text-transform:uppercase;margin-bottom:9px;">🚗 Vehicle</div>
        <div style="font-size:12px;font-weight:700;
          cursor:${carInFleet ? 'pointer' : 'default'};
          color:${carInFleet ? 'var(--accent)' : 'var(--text)'};"
          ${carInFleet
            ? `onclick="closeModal();setTimeout(()=>openCarDetailModal('${carInFleet.id||carCode}'),200)"`
            : ''}>
          ${carLabel}${carInFleet ? ' 🔗' : ''}
        </div>
        <div style="font-size:11px;color:var(--text3);margin-top:3px;">
          Code: ${carCode || '-'}
        </div>
        <div style="font-size:11px;color:var(--text2);">
          📍 Pickup: ${o['مكان الاستلام'] || '-'}
        </div>
        <div style="font-size:11px;color:var(--text2);">
          📍 Dropoff: ${o['مكان التسليم'] || '-'}
        </div>
      </div>

      <!-- Period -->
      <div class="panel">
        <div style="font-size:10px;font-weight:800;color:var(--accent);
          text-transform:uppercase;margin-bottom:9px;">📅 Period</div>
        <div style="font-size:11px;">
          <strong>Start:</strong> ${start ? fmtDate(start) : 'N/A'}
        </div>
        <div style="font-size:11px;margin-top:3px;">
          <strong>End:</strong> ${end ? fmtDate(end) : 'N/A'}
        </div>
        <div style="font-size:11px;margin-top:3px;color:var(--text3);">
          Duration: ${o['rental_days'] ||
            (start && end ? Math.ceil((end-start)/86400000) : '-')} days
        </div>
        <div style="font-size:11px;margin-top:3px;color:var(--text3);">
          Branch: ${BRANCH_MAP[o['فرع الإصدار']] || o['فرع الإصدار'] || '-'}
        </div>
      </div>

      <!-- Financials -->
      <div class="panel">
        <div style="font-size:10px;font-weight:800;color:var(--accent);
          text-transform:uppercase;margin-bottom:9px;">💰 Financials</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;
          gap:5px;font-size:11px;">
          <span style="color:var(--text3);">Daily Rate:</span>
          <span style="font-weight:700;">${fmtMoney(daily)}</span>
          <span style="color:var(--text3);">Base Total:</span>
          <span style="font-weight:700;">${fmtMoney(total)}</span>
          ${latePenalty > 0 ? `
            <span style="color:var(--danger);">+ Penalty:</span>
            <span style="font-weight:700;color:var(--danger);">
              ${fmtMoney(latePenalty)}
            </span>` : ''}
          <span style="color:var(--text3);">Total Due:</span>
          <span style="font-weight:800;">${fmtMoney(totalDue)}</span>
          <span style="color:var(--text3);">Paid:</span>
          <span style="font-weight:700;color:var(--success);">
            ${fmtMoney(paid)}
          </span>
        </div>
        <div style="margin-top:9px;padding:7px 11px;border-radius:8px;
          background:${debt > 0
            ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)'};
          display:flex;justify-content:space-between;align-items:center;">
          <span style="font-weight:700;">CURRENT DEBT</span>
          <span style="font-size:15px;font-weight:900;
            color:${debt > 0 ? 'var(--danger)' : 'var(--success)'};">
            ${debt > 0 ? fmtMoney(debt) : '✅ CLEAR'}
          </span>
        </div>
      </div>

    </div>

    <!-- Deposit -->
    <div style="background:var(--surface2);border:1px solid var(--accent);
      border-radius:8px;padding:12px;margin-bottom:14px;">
      <div style="font-size:11px;font-weight:800;color:var(--accent);
        margin-bottom:8px;">🔒 DEPOSIT / SECURITY</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div>
          <div style="font-size:10px;color:var(--text3);">Deposit Held</div>
          <div style="font-size:14px;font-weight:700;color:var(--warning);">
            ${fmtMoney(depositHeld)}
          </div>
        </div>
        <div>
          <div style="font-size:10px;color:var(--text3);">Deposit Returned</div>
          <div style="font-size:14px;font-weight:700;
            color:${depositRet > 0 ? 'var(--success)' : 'var(--text3)'};">
            ${fmtMoney(depositRet)}
          </div>
        </div>
      </div>
      <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">
        <button class="btn btn-ghost btn-sm"
          onclick="addDepositPayment('${o.id}','collect')">
          💰 Collect Deposit
        </button>
        <button class="btn btn-ghost btn-sm"
          onclick="addDepositPayment('${o.id}','return')">
          ↩️ Return Deposit
        </button>
      </div>
    </div>

    <!-- Actions -->
    <div style="display:flex;gap:7px;flex-wrap:wrap;">
      <button class="btn btn-warning"
        onclick="closeModal();openOrderEdit('${o.id}')">
        ✏️ Edit Order
      </button>
      <button class="btn btn-primary"
        onclick="closeModal();quickAddPayment('${o.id}')">
        💰 Add Payment
      </button>
      ${!isClosed ? `
        <button class="btn btn-success"
          onclick="closeModal();requestCloseOrder('${o.id}')">
          ✅ Close
        </button>` : ''}
      <button class="btn btn-ghost"
        onclick="generateOrderContractDirect('${o.id}','en')">
        📄 Contract
      </button>
      <button class="btn btn-ghost"
        onclick="generateOrderContractDirect('${o.id}','ar')">
        📋 AR Contract
      </button>
      <button class="btn btn-ghost"
        onclick="generateOrderReceiptDirect('${o.id}')">
        🧾 Receipt
      </button>
      <button class="btn btn-ghost"
        onclick="viewOrderPayments('${o.id}','${o['No.'] || o.id}')">
        💳 Payments
      </button>
      <button class="btn btn-ghost"
        onclick="extendOrder('${o.id}')">
        📅 Extend
      </button>
      <button class="btn btn-ghost"
        onclick="switchOrderCar('${o.id}')">
        🔄 Switch Car
      </button>
      <button class="btn btn-ghost"
        onclick="openReminderForm('${o.id}')">
        🔔 Reminder
      </button>
      ${G.user?.role === 'Admin' ? `
        <button class="btn btn-sm"
          style="background:var(--danger);color:#fff;"
          onclick="if(confirm('DELETE order #${o['No.']} permanently?'))
            adminDeleteOrder('${o.id}')">
          🗑️ Delete
        </button>` : ''}
    </div>`;

  openModal(`Order #${o['No.'] || o.id} — ${o['اسم العميل'] || ''}`,
    html, true);

  logAction('VIEW', 'Order Book', `Viewed order #${o['No.'] || o.id}`);
};

// ============================================================
// ORDER EDIT MODAL
// ============================================================

window.openOrderEdit = async function(orderId) {
  const order = allOrders.find(o => o.id === orderId);
  if (!order) return;

  const o       = order;
  const isPriv  = ['Admin', 'Executive'].includes(G.user?.role);

  const html = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:11px;">
      <div class="field">
        <label>Order Status</label>
        <select id="edit-status">
          <option value="Active"    ${o['حالة الطلب'] === 'Active'    ? 'selected' : ''}>Active</option>
          <option value="Closed"    ${o['حالة الطلب'] === 'Closed' || o.closed ? 'selected' : ''}>Closed</option>
          <option value="Accident"  ${o['حالة الطلب'] === 'Accident'  ? 'selected' : ''}>Accident</option>
          <option value="Cancelled" ${o['حالة الطلب'] === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>
      </div>
      <div class="field">
        <label>Daily Rate (EGP)</label>
        <input type="number" id="edit-daily"
          value="${parseAmount(o['سعر السيارة اليومي بالجنيه المصري']) || ''}"
          ${!isPriv ? 'readonly title="Rate changes require admin approval"' : ''}/>
      </div>
      <div class="field">
        <label>Total Due (EGP)</label>
        <input type="number" id="edit-total"
          value="${parseAmount(o['إجمالي المستحق (Total)']) || ''}"/>
      </div>
      <div class="field">
        <label>Paid EGP</label>
        <input type="number" id="edit-paid"
          value="${parseAmount(o['المدفوع EGP']) || ''}"/>
      </div>
      <div class="field">
        <label>KM at Start</label>
        <input type="number" id="edit-km-start"
          value="${parseAmount(o['كيلومتر بداية']) || ''}"/>
      </div>
      <div class="field">
        <label>KM at End</label>
        <input type="number" id="edit-km-end"
          value="${parseAmount(o['كيلومتر نهاية']) || ''}"/>
      </div>
      <div class="field">
        <label>Notes</label>
        <input type="text" id="edit-notes"
          value="${o['ملاحظات'] || o.Notes || ''}"/>
      </div>
      <div class="field">
        <label>Debt Clock</label>
        <select id="edit-closed">
          <option value="false" ${!o.closed ? 'selected' : ''}>
            Open (debt clock running)
          </option>
          <option value="true"  ${o.closed  ? 'selected' : ''}>
            Closed (stopped)
          </option>
        </select>
      </div>
    </div>
    ${!isPriv ? `
      <div style="margin-top:11px;padding:9px;border-radius:8px;
        background:rgba(245,158,11,0.1);
        border:1px solid rgba(245,158,11,0.2);
        font-size:11px;color:var(--warning);">
        ⚠️ Rate changes exceeding
        ${G.settings.discountThreshold || 5}%
        require Admin approval.
      </div>` : ''}
    <div style="display:flex;gap:7px;margin-top:14px;">
      <button class="btn btn-success"
        onclick="saveOrderEdit('${orderId}')">💾 Save Changes</button>
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    </div>`;

  openModal(`Edit Order #${o['No.'] || o.id}`, html);
};

window.saveOrderEdit = async function(orderId) {
  const order   = allOrders.find(o => o.id === orderId);
  const isPriv  = ['Admin', 'Executive'].includes(G.user?.role);
  const newStatus = document.getElementById('edit-status')?.value;
  const newDaily  = parseFloat(document.getElementById('edit-daily')?.value) || 0;
  const newTotal  = parseFloat(document.getElementById('edit-total')?.value) || 0;
  const newPaid   = parseFloat(document.getElementById('edit-paid')?.value)  || 0;
  const newClosed = document.getElementById('edit-closed')?.value === 'true';
  const newNotes  = document.getElementById('edit-notes')?.value.trim();
  const kmStart   = document.getElementById('edit-km-start')?.value;
  const kmEnd     = document.getElementById('edit-km-end')?.value;

  // Rate change approval check
  if (!isPriv && order) {
    const origRate  = parseAmount(order['سعر السيارة اليومي بالجنيه المصري']);
    const threshold = G.settings.discountThreshold || 5;
    const discountPct = origRate > 0
      ? ((origRate - newDaily) / origRate * 100) : 0;

    if (discountPct > threshold) {
      await db.collection('approvals').add({
        type:          'rate_change',
        requested_by:  G.user.username,
        branch:        G.user.branch,
        subject:       `Rate change for Order #${order['No.']}`,
        details:       `Original: ${fmtMoney(origRate)} → Requested: ${fmtMoney(newDaily)} (${discountPct.toFixed(1)}% discount)`,
        linked_ref:    orderId,
        current_value: String(origRate),
        requested_value: String(newDaily),
        reason:        newNotes || 'Rate change requested',
        status:        'pending',
        created_at:    Date.now()
      });
      toast(`Rate change ${discountPct.toFixed(1)}% exceeds threshold. Approval submitted.`, 'warning', 6000);
      closeModal();
      return;
    }
  }

  try {
    const upd = {
      'حالة الطلب':   newStatus,
      'سعر السيارة اليومي بالجنيه المصري': fmtMoney(newDaily),
      'إجمالي المستحق (Total)': fmtMoney(newTotal),
      'المدفوع EGP':  String(newPaid),
      'closed':        newClosed,
      'ملاحظات':      newNotes,
      '_sys_updated':  Date.now()
    };
    if (kmStart) upd['كيلومتر بداية'] = kmStart;
    if (kmEnd)   upd['كيلومتر نهاية'] = kmEnd;

    // If accident — update car status
    if (newStatus === 'Accident' && order?.['كود السيارة']) {
      await db.collection('fleet')
        .doc(String(order['كود السيارة']))
        .update({ status: 'accident', Contract: 'Accident', _sys_updated: Date.now() })
        .catch(() => {});
    }

    // If closing — set car to available
    if (newClosed && order?.['كود السيارة']) {
      await db.collection('fleet')
        .doc(String(order['كود السيارة']))
        .update({ status: 'available', _sys_updated: Date.now() })
        .catch(() => {});
    }

    await db.collection('bookings').doc(orderId).update(upd);

    // Update local caches
    const idx = allOrders.findIndex(o => o.id === orderId);
    if (idx > -1) allOrders[idx] = { ...allOrders[idx], ...upd };
    const idx2 = G.bookings.findIndex(b => b.id === orderId);
    if (idx2 > -1) G.bookings[idx2] = { ...G.bookings[idx2], ...upd };

    await logAction('EDIT', 'Order Book',
      `Updated Order #${order?.['No.'] || orderId} → ${newStatus}`);

    toast('Order updated!', 'success');
    closeModal();
    filterOrders();

  } catch (e) {
    toast('Update failed: ' + e.message, 'error');
  }
};

// ============================================================
// QUICK ADD PAYMENT
// ============================================================

window.quickAddPayment = function(orderId) {
  const order = allOrders.find(o => o.id === orderId);
  if (!order) return;

  const total = parseAmount(order['إجمالي المستحق (Total)']);
  const paid  = parseAmount(order['المدفوع EGP']);
  const debt  = Math.max(0, total - paid);

  const html = `
    <div style="margin-bottom:14px;padding:11px;border-radius:8px;
      background:var(--surface2);border:1px solid var(--border);">
      <div style="display:flex;justify-content:space-between;font-size:12px;">
        <span style="color:var(--text3);">Order:</span>
        <strong>#${order['No.'] || orderId}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;
        font-size:12px;margin-top:3px;">
        <span style="color:var(--text3);">Client:</span>
        <strong>${order['اسم العميل'] || '-'}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;
        font-size:12px;margin-top:3px;">
        <span style="color:var(--text3);">Outstanding:</span>
        <strong style="color:var(--danger);">${fmtMoney(debt)}</strong>
      </div>
    </div>

    <div class="form-grid">
      <div class="field">
        <label>Amount EGP (Cash)</label>
        <input type="number" id="qp-egp" value="0"
          oninput="updateQPTotal()"/>
      </div>
      <div class="field">
        <label>Amount USD (Cash)</label>
        <input type="number" id="qp-usd" value="0"
          oninput="updateQPTotal()"/>
      </div>
      <div class="field">
        <label>Amount EUR (Cash)</label>
        <input type="number" id="qp-eur" value="0"
          oninput="updateQPTotal()"/>
      </div>
      <div class="field">
        <label>Card / POS (EGP)</label>
        <input type="number" id="qp-card" value="0"
          oninput="updateQPTotal()"/>
      </div>
      <div class="field">
        <label>Online Transfer (EGP)</label>
        <input type="number" id="qp-online" value="0"
          oninput="updateQPTotal()"/>
      </div>
      <div class="field">
        <label>Collected By</label>
        <select id="qp-collected-by">
          <option value="${G.user?.username || 'me'}">
            Me (${G.user?.username || ''})
          </option>
          <option value="sabry">Sabry</option>
          <option value="eslam">Eslam</option>
          <option value="shams">Shams</option>
          <option value="other">Other</option>
        </select>
      </div>
    </div>

    <div style="margin-top:9px;padding:9px 13px;border-radius:8px;
      background:var(--surface2);border:1px solid var(--border);
      display:flex;justify-content:space-between;align-items:center;">
      <span style="font-weight:700;">Total This Payment</span>
      <span id="qp-total"
        style="font-size:15px;font-weight:900;color:var(--success);">
        £0.00
      </span>
    </div>

    <div class="form-grid" style="margin-top:11px;">
      <div class="field">
        <label>Date of Payment *</label>
        <input type="date" id="qp-date"
          value="${new Date().toISOString().slice(0, 10)}"/>
      </div>
      <div class="field">
        <label>Reason / Category *</label>
        <select id="qp-category">
          <option value="">-- Select --</option>
          <option value="Rental Payment">Rental Payment</option>
          <option value="Advance Payment">Advance Payment</option>
          <option value="Full Settlement">Full Settlement</option>
          <option value="Overdue Settlement">Overdue Settlement</option>
          <option value="Traffic Fine">Traffic Fine</option>
          <option value="Accident Settlement">Accident Settlement</option>
          <option value="Extra KM Fee">Extra KM Fee</option>
          <option value="Fuel Shortfall">Fuel Shortfall</option>
          <option value="Damage Charge">Damage Charge</option>
          <option value="Security Deposit">Security Deposit</option>
          <option value="Other">Other</option>
        </select>
      </div>
    </div>

    <div class="field" style="margin-top:7px;">
      <label>Notes (optional)</label>
      <input type="text" id="qp-notes"
        placeholder="Additional notes..."/>
    </div>

    <div style="display:flex;gap:7px;margin-top:14px;">
      <button class="btn btn-success btn-full"
        onclick="saveQuickPayment('${orderId}',${total},${paid})">
        💾 Save Payment
      </button>
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    </div>`;

  openModal(`Add Payment — Order #${order['No.'] || orderId}`, html);
};

window.updateQPTotal = function() {
  const egp    = parseFloat(document.getElementById('qp-egp')?.value)    || 0;
  const usd    = parseFloat(document.getElementById('qp-usd')?.value)    || 0;
  const eur    = parseFloat(document.getElementById('qp-eur')?.value)    || 0;
  const card   = parseFloat(document.getElementById('qp-card')?.value)   || 0;
  const online = parseFloat(document.getElementById('qp-online')?.value) || 0;
  const el = document.getElementById('qp-total');
  if (el) el.textContent = fmtMoney(
    egp + (usd * G.ratesUSD) + (eur * G.ratesEUR) + card + online
  );
};

window.saveQuickPayment = async function(orderId, totalDue, prevPaid) {
  const egp        = parseFloat(document.getElementById('qp-egp')?.value)    || 0;
  const usd        = parseFloat(document.getElementById('qp-usd')?.value)    || 0;
  const eur        = parseFloat(document.getElementById('qp-eur')?.value)    || 0;
  const card       = parseFloat(document.getElementById('qp-card')?.value)   || 0;
  const online     = parseFloat(document.getElementById('qp-online')?.value) || 0;
  const collectedBy= document.getElementById('qp-collected-by')?.value || G.user?.username || '';
  const thisPayment= egp + (usd * G.ratesUSD) + (eur * G.ratesEUR) + card + online;
  const payDate    = document.getElementById('qp-date')?.value;
  const payCategory= document.getElementById('qp-category')?.value;
  const payNotes   = document.getElementById('qp-notes')?.value || '';

  if (thisPayment <= 0) { toast('Payment must be greater than 0', 'error'); return; }
  if (!payDate)         { toast('Date of payment is required', 'error');    return; }
  if (!payCategory)     { toast('Reason / Category is required', 'error'); return; }

  const order = allOrders.find(o => o.id === orderId);

  try {
    const upd = {
      'المدفوع EGP': String(prevPaid + egp),
      '_sys_updated': Date.now()
    };
    if (usd > 0) upd['المدفوع USD'] =
      String(parseAmount(order?.['المدفوع USD'] || '0') + usd);
    if (eur > 0) upd['المدفوع EUR'] =
      String(parseAmount(order?.['المدفوع EUR'] || '0') + eur);

    const newTotal = prevPaid + thisPayment;
    const { end }  = getOrderDates(order || {});

    // Auto-close if fully paid and past end
    if (newTotal >= totalDue && end && new Date() > end &&
        getOrderStatus(order) !== 'Accident') {
      upd['closed']       = true;
      upd['حالة الطلب'] = 'Closed';
      if (order?.['كود السيارة']) {
        await db.collection('fleet')
          .doc(String(order['كود السيارة']))
          .update({ status: 'available', _sys_updated: Date.now() })
          .catch(() => {});
      }
      toast('Order fully paid and closed!', 'success');
    }

    await db.collection('bookings').doc(orderId).update(upd);

    // Build payment record
    const car = G.fleet.find(c =>
      String(c.ID || c.id) === String(order?.['كود السيارة'] || '')
    ) || {};
    const methods = [];
    if (egp   > 0) methods.push('Cash EGP');
    if (card  > 0) methods.push('Card');
    if (online> 0) methods.push('Online');
    if (usd   > 0) methods.push('Cash USD');
    if (eur   > 0) methods.push('Cash EUR');

    const paymentRecord = {
      order_id:       orderId,
      order_ref:      order?.['No.'] || orderId,
      client_name:    getOrderClientName(order) || '',
      car_label:      getCarLabel(car, 'en')    || order?.['اسم السيارة'] || '',
      branch:         order?.['فرع الإصدار']   || G.user?.branch || '',
      amount_egp:     egp + card + online,
      amount_usd:     usd,
      amount_eur:     eur,
      payment_method: methods.join(' + ') || 'Cash',
      collected_by:   collectedBy,
      notes:          payNotes,
      type:           'rental_payment',
      category:       payCategory,
      date:           payDate,
      datetime:       new Date().toISOString(),
      timestamp:      Date.now(),
      _sys_created:   firebase.firestore.FieldValue.serverTimestamp()
    };

    const payRef = await db.collection('payment_log').add(paymentRecord);

    await logAction('EDIT', 'Order Book',
      `Payment on Order #${order?.['No.'] || orderId}: ${fmtMoney(thisPayment)}`);

    // Update local caches
    const orderIdx = allOrders.findIndex(o => o.id === orderId);
    if (orderIdx >= 0) {
      allOrders[orderIdx]['المدفوع EGP'] = String(prevPaid + egp);
      const gIdx = G.bookings.findIndex(o => o.id === orderId);
      if (gIdx >= 0) Object.assign(G.bookings[gIdx], allOrders[orderIdx]);
    }

    if (typeof filterOrders === 'function') filterOrders();

    toast('✅ Payment saved! Generating receipt...', 'success');
    closeModal();
    setTimeout(() => generateSinglePaymentReceipt(
      paymentRecord, payRef.id, orderId
    ), 400);

  } catch (e) {
    toast('Payment failed: ' + e.message, 'error');
  }
};

// ============================================================
// SINGLE PAYMENT RECEIPT
// ============================================================

window.generateSinglePaymentReceipt = async function(payment, paymentId, orderId) {
  try {
    let order = allOrders.find(o => o.id === orderId);
    if (!order) {
      const snap = await db.collection('bookings').doc(orderId).get();
      if (snap.exists) order = { id: snap.id, ...snap.data() };
    }

    const contractNo  = order?.['No.']         || orderId;
    const clientName  = payment.client_name     || getOrderClientName(order) || '';
    const carLabel    = payment.car_label       || '';
    const { start, end } = getOrderDates(order || {});
    const verifyUrl   = `https://sabryabr.github.io/BrothersEGY-ERP/verify.html?ref=${encodeURIComponent(contractNo)}`;
    const logo        = 'https://brothersegy.com/wp-content/uploads/2026/02/12345.png';
    const dateStr     = new Date(payment.datetime || Date.now())
      .toLocaleString('en-GB', {
        day:'2-digit', month:'short', year:'numeric',
        hour:'2-digit', minute:'2-digit'
      });

    const parts = [];
    if (payment.amount_egp > 0) parts.push(`£${payment.amount_egp.toLocaleString()} EGP`);
    if (payment.amount_usd > 0) parts.push(`$${payment.amount_usd} USD`);
    if (payment.amount_eur > 0) parts.push(`€${payment.amount_eur} EUR`);
    const amountStr = parts.join(' + ');
    const amountEGP = payment.amount_egp || 0;

    const totalOrder  = parseAmount(order?.['إجمالي المستحق (Total)'] || 0);
    const totalPaid   = parseAmount(order?.['المدفوع EGP']            || 0);
    const outstanding = Math.max(0, totalOrder - totalPaid);

    const rcRef = `RC-${(payment.branch || 'GEN').slice(0,3).toUpperCase()}-${
      new Date().toISOString().slice(2,10).replace(/-/g,'')}-${
      paymentId.slice(-4).toUpperCase()}`;

    const singleRec = copyType => `
      <div style="height:48%;border:2px solid #000;padding:15px;
        display:flex;flex-direction:column;box-sizing:border-box;">
        <div style="display:flex;justify-content:space-between;
          align-items:center;border-bottom:2px solid #000;
          padding-bottom:10px;margin-bottom:10px;">
          <img src="${logo}" style="height:40px;object-fit:contain;">
          <div style="text-align:center;flex:1;">
            <div style="font-size:14pt;font-weight:bold;color:#04509D;
              text-transform:uppercase;">PAYMENT RECEIPT</div>
            <div style="font-size:9pt;color:#666;">${copyType}</div>
          </div>
          <div style="text-align:right;">
            <img src="https://api.qrserver.com/v1/create-qr-code/?data=${
              encodeURIComponent(verifyUrl)}&size=70x70"
              style="height:55px;">
            <div style="font-size:7pt;font-weight:bold;margin-top:2px;">
              SCAN FOR FULL HISTORY
            </div>
          </div>
        </div>

        <div style="background:#f0f9ff;border:1px solid #bae6fd;
          border-radius:6px;padding:8px 12px;margin-bottom:10px;
          text-align:center;">
          <div style="font-size:8pt;color:#0369a1;font-weight:bold;
            text-transform:uppercase;">THIS PAYMENT ONLY</div>
          <div style="font-size:28pt;font-weight:900;color:#04509D;
            line-height:1.1;">£${amountEGP.toLocaleString()}</div>
          ${parts.length > 1
            ? `<div style="font-size:9pt;color:#0369a1;">${amountStr}</div>`
            : ''}
          <div style="font-size:8pt;color:#64748b;margin-top:3px;">
            ${payment.payment_method || 'Cash'} · ${dateStr}
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;
          gap:8px;font-size:8.5pt;border-bottom:1px dashed #ccc;
          padding-bottom:8px;margin-bottom:8px;">
          <div>
            <div><strong>CONTRACT</strong> #${contractNo}</div>
            <div><strong>CLIENT</strong> ${clientName}</div>
            <div><strong>VEHICLE</strong> ${carLabel || '—'}</div>
          </div>
          <div>
            <div><strong>PERIOD</strong>
              ${start ? start.toLocaleDateString('en-GB') : ''} →
              ${end   ? end.toLocaleDateString('en-GB')   : ''}
            </div>
            <div><strong>BRANCH</strong> ${payment.branch || '—'}</div>
            <div><strong>RECEIPT</strong> ${rcRef}</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;
          gap:6px;font-size:8pt;background:#f8fafc;
          border-radius:4px;padding:6px;">
          <div style="text-align:center;">
            <div style="color:#666;">Contract Total</div>
            <div style="font-weight:bold;">£${totalOrder.toLocaleString()}</div>
          </div>
          <div style="text-align:center;">
            <div style="color:#666;">Total Paid</div>
            <div style="font-weight:bold;color:#16a34a;">
              £${totalPaid.toLocaleString()}
            </div>
          </div>
          <div style="text-align:center;">
            <div style="color:#666;">Outstanding</div>
            <div style="font-weight:bold;
              color:${outstanding > 0 ? '#dc2626' : '#16a34a'};">
              ${outstanding > 0 ? '£' + outstanding.toLocaleString() : '✅ PAID'}
            </div>
          </div>
        </div>

        ${payment.notes ? `
          <div style="font-size:8pt;color:#666;margin-top:6px;
            font-style:italic;">Note: ${payment.notes}</div>` : ''}

        <div style="margin-top:auto;display:flex;
          justify-content:space-between;align-items:flex-end;
          padding-top:8px;">
          <div style="font-size:7pt;color:#94a3b8;">
            Scan QR for full payment history &amp; order status
          </div>
          <div style="text-align:center;border-top:1px solid #000;
            width:160px;padding-top:4px;font-size:8pt;font-weight:bold;">
            AUTHORIZED SIGNATURE
          </div>
        </div>
      </div>`;

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <style>
        body{font-family:Arial,sans-serif;margin:0;padding:0;}
        @page{size:A4;margin:10mm 15mm;}
        @media print{
          body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
          .no-print{display:none!important;}
        }
        .print-btn{position:fixed;top:10px;right:10px;
          background:#04509D;color:white;border:none;
          padding:10px 20px;border-radius:6px;cursor:pointer;
          font-weight:bold;z-index:999;}
      </style></head><body>
      <button class="print-btn no-print"
        onclick="window.print()">🖨️ Print / Save PDF</button>
      <div style="width:210mm;min-height:296mm;padding:10mm 15mm;
        box-sizing:border-box;display:flex;flex-direction:column;">
        ${singleRec('CLIENT COPY')}
        <div style="text-align:center;border-top:1px dashed #999;
          color:#999;padding:6px 0;font-size:8pt;">
          ✂ — — — — DETACH HERE — — — — ✂
        </div>
        ${singleRec('COMPANY COPY')}
      </div></body></html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 600);
    }

    // Save receipt record
    await db.collection('receipts').add({
      ...payment,
      receipt_ref:    rcRef,
      payment_id:     paymentId,
      qr_ref:         contractNo,
      verify_url:     verifyUrl,
      receipt_type:   'single_payment',
      _sys_created:   firebase.firestore.FieldValue.serverTimestamp()
    }).catch(() => {});

  } catch (e) {
    console.error('Receipt generation error:', e);
    toast('Receipt error: ' + e.message, 'error');
  }
};

// ============================================================
// CLOSE ORDER
// ============================================================

window.requestCloseOrder = async function(orderId) {
  const order  = allOrders.find(o => o.id === orderId);
  const isPriv = ['Admin', 'Executive'].includes(G.user?.role);

  if (isPriv) {
    try {
      const upd = {
        'حالة الطلب': 'Closed',
        'closed':      true,
        '_sys_updated': Date.now()
      };
      await db.collection('bookings').doc(orderId).update(upd);

      if (order?.['كود السيارة']) {
        await db.collection('fleet')
          .doc(String(order['كود السيارة']))
          .update({ status: 'available', _sys_updated: Date.now() })
          .catch(() => {});
      }

      const idx  = allOrders.findIndex(o => o.id === orderId);
      if (idx > -1) allOrders[idx]  = { ...allOrders[idx],  ...upd };
      const idx2 = G.bookings.findIndex(b => b.id === orderId);
      if (idx2 > -1) G.bookings[idx2] = { ...G.bookings[idx2], ...upd };

      await logAction('EDIT', 'Order Book',
        `Closed Order #${order?.['No.'] || orderId}`);

      toast('Order closed!', 'success');
      closeModal();
      filterOrders();

    } catch (e) {
      toast('Close failed: ' + e.message, 'error');
    }
  } else {
    try {
      await db.collection('approvals').add({
        type:         'cancellation',
        requested_by:  G.user.username,
        branch:        G.user.branch,
        subject:      `Close Order #${order?.['No.'] || orderId}`,
        details:      `Request to close order for ${order?.['اسم العميل'] || 'client'}`,
        linked_ref:    orderId,
        status:        'pending',
        created_at:    Date.now()
      });
      toast('Close request submitted for Admin approval', 'info');
    } catch (e) {
      toast('Request failed: ' + e.message, 'error');
    }
  }
};

// ============================================================
// EXTEND ORDER
// ============================================================

window.extendOrder = function(orderId) {
  const o = allOrders.find(b => b.id === orderId) ||
            G.bookings.find(b => b.id === orderId);
  const currentEnd = o?.col_T || o?.['تاريخ الانتهاء'] || '';

  const html = `
    <div class="field">
      <label>New End Date / Time</label>
      <input type="datetime-local" id="extend-date"
        value="${currentEnd.replace(' ', 'T').slice(0, 16)}"/>
    </div>
    <div style="display:flex;gap:7px;margin-top:13px;">
      <button class="btn btn-primary"
        onclick="doExtendOrder('${orderId}')">✅ Extend</button>
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    </div>`;

  openModal('📅 Extend Order', html);
};

window.doExtendOrder = async function(orderId) {
  const newEnd = document.getElementById('extend-date')?.value;
  if (!newEnd) { toast('Select a date', 'error'); return; }

  try {
    await db.collection('bookings').doc(orderId).update({
      col_T:         newEnd,
      _sys_updated:  firebase.firestore.FieldValue.serverTimestamp()
    });

    const idx  = allOrders.findIndex(b => b.id === orderId);
    if (idx >= 0) allOrders[idx].col_T = newEnd;
    const idx2 = G.bookings.findIndex(b => b.id === orderId);
    if (idx2 >= 0) G.bookings[idx2].col_T = newEnd;

    toast('✅ Order extended to: ' + newEnd, 'success');
    closeModal();
    setTimeout(() => openOrderDetail(orderId), 200);
  } catch (e) {
    toast('Extend failed: ' + e.message, 'error');
  }
};

// ============================================================
// SWITCH CAR
// ============================================================

window.switchOrderCar = function(orderId) {
  const cars = G.fleet.filter(c => c.is_active !== false && !c.archived);

  const html = `
    <select id="car-switch-sel"
      style="width:100%;margin-bottom:12px;padding:8px;
        background:var(--surface2);border:1px solid var(--border);
        border-radius:8px;color:var(--text);">
      <option value="">-- Select replacement car --</option>
      ${cars.map(c =>
        `<option value="${c.id}">
          ${getCarLabel(c, 'en')} | ${c.plate || ''}
        </option>`
      ).join('')}
    </select>
    <button class="btn btn-primary btn-full"
      onclick="
        const sel = document.getElementById('car-switch-sel');
        const car = G.fleet.find(c => c.id === sel.value);
        if (!car) { toast('Select a car', 'error'); return; }
        closeModal();
        setTimeout(() => doSwitchOrderCar(
          '${orderId}', car.id, getCarLabel(car,'en')
        ), 100);">
      🔄 Confirm Switch
    </button>`;

  openModal('🔄 Select Replacement Car', html);
};

window.doSwitchOrderCar = async function(orderId, newCarId, newCarLabel) {
  const o = allOrders.find(b => b.id === orderId) ||
            G.bookings.find(b => b.id === orderId);
  if (!o) return;

  const oldCarId     = o['كود السيارة'] || '';
  const depositHeld  = parseAmount(o.deposit_held || o['الوديعة المحتجزة'] || 0);

  const updates = {
    'كود السيارة':     newCarId,
    car_label:         newCarLabel,
    car_switched_from: oldCarId,
    car_switched_at:   new Date().toISOString(),
    deposit_transfer_note:
      `Deposit transferred from car ${oldCarId} to car ${newCarId}. ` +
      `Amount: ${fmtMoney(depositHeld)}`,
    _sys_updated: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    await db.collection('bookings').doc(orderId).update(updates);
    const idx  = allOrders.findIndex(b => b.id === orderId);
    if (idx >= 0) Object.assign(allOrders[idx], updates);
    const idx2 = G.bookings.findIndex(b => b.id === orderId);
    if (idx2 >= 0) Object.assign(G.bookings[idx2], updates);

    toast('✅ Car switched to: ' + newCarLabel, 'success');
    openOrderDetail(orderId);
  } catch (e) {
    toast('Car switch failed: ' + e.message, 'error');
  }
};

// ============================================================
// VIEW ORDER PAYMENTS
// ============================================================

window.viewOrderPayments = async function(orderId, orderNo) {
  document.getElementById('global-modal')?.classList.remove('open');

  try {
    const [plSnap, rcSnap] = await Promise.all([
      db.collection('payment_log')
        .where('order_id', '==', orderId).get().catch(() => ({ docs: [] })),
      db.collection('receipts')
        .where('contract_no', '==', String(orderNo)).get().catch(() => ({ docs: [] }))
    ]);

    const payments = plSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    const receipts = rcSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    const html = `
      <div style="margin-bottom:13px;">
        <div style="font-size:11px;font-weight:800;color:var(--accent);
          text-transform:uppercase;margin-bottom:8px;">
          💳 Payment Log (${payments.length})
        </div>
        ${payments.length ? `
          <table class="data-table">
            <thead><tr>
              <th>Date</th><th>Amount</th>
              <th>Method</th><th>Note</th>
            </tr></thead>
            <tbody>
              ${payments.map(p => `
                <tr>
                  <td style="font-size:11px;">
                    ${p.date || (p.timestamp
                      ? new Date(p.timestamp).toLocaleDateString('en-GB') : '—')}
                  </td>
                  <td style="font-weight:700;color:var(--success);">
                    ${fmtMoney(p.amount || p.amount_egp || 0)}
                  </td>
                  <td style="font-size:11px;">
                    ${p.method || p.currency || p.payment_method || '—'}
                  </td>
                  <td style="font-size:10px;color:var(--text3);">
                    ${p.note || p.notes || '—'}
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>` :
          `<div style="color:var(--text3);font-size:12px;padding:10px;">
            No payment log entries found.
          </div>`}
      </div>

      <div>
        <div style="font-size:11px;font-weight:800;color:var(--accent);
          text-transform:uppercase;margin-bottom:8px;">
          🧾 Receipts (${receipts.length})
        </div>
        ${receipts.length ? `
          <table class="data-table">
            <thead><tr>
              <th>Ref</th><th>Date</th>
              <th>Amount</th><th>Type</th><th></th>
            </tr></thead>
            <tbody>
              ${receipts.map(r => `
                <tr>
                  <td><span style="color:var(--accent);font-weight:700;
                    font-size:11px;">
                    ${r.receipt_ref || r.id}
                  </span></td>
                  <td style="font-size:11px;">${r.receipt_date || '—'}</td>
                  <td style="font-weight:700;color:var(--success);">
                    ${fmtMoney(r.total_egp_equiv || r.amount_egp || 0)}
                  </td>
                  <td style="font-size:11px;">${r.type || '—'}</td>
                  <td style="white-space:nowrap;">
                    <button class="btn btn-ghost btn-xs"
                      onclick="closeModal();showPage('receipts');
                        setTimeout(()=>reprintReceipt('${r.id}'),300);">
                      🖨️
                    </button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>` :
          `<div style="color:var(--text3);font-size:12px;padding:10px;">
            No receipts found for this order.
          </div>`}
      </div>`;

    openModal(`💳 Payments — Order #${orderNo}`, html, true);

  } catch (e) {
    openModal('💳 Payments',
      `<p style="color:var(--danger);">Failed to load: ${e.message}</p>`);
  }
};

// ============================================================
// DEPOSIT PAYMENT
// ============================================================

window.addDepositPayment = function(orderId, type) {
  const label = type === 'collect' ? 'Collect Deposit' : 'Return Deposit';
  const color = type === 'collect' ? '#22c55e' : '#f59e0b';

  const html = `
    <div style="font-size:11px;color:var(--text3);margin-bottom:14px;">
      ${type === 'collect'
        ? 'Record deposit collected from customer.'
        : 'Record deposit returned to customer.'}
    </div>
    <div class="form-grid" style="margin-bottom:10px;">
      <div class="field">
        <label>EGP (Cash)</label>
        <input type="number" id="dep-egp" value="0" min="0"
          oninput="calcDepTotal()"/>
      </div>
      <div class="field">
        <label>USD (Cash)</label>
        <input type="number" id="dep-usd" value="0" min="0"
          oninput="calcDepTotal()"/>
      </div>
      <div class="field">
        <label>EUR (Cash)</label>
        <input type="number" id="dep-eur" value="0" min="0"
          oninput="calcDepTotal()"/>
      </div>
      <div class="field">
        <label>Card (EGP)</label>
        <input type="number" id="dep-card" value="0" min="0"
          oninput="calcDepTotal()"/>
      </div>
    </div>
    <div style="background:var(--surface3);border-radius:8px;
      padding:10px 12px;margin-bottom:12px;
      display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:10px;color:var(--text2);">Total (approx EGP):</span>
      <span id="dep-total-display"
        style="font-size:16px;font-weight:800;color:${color};">£0.00</span>
    </div>
    <div class="field" style="margin-bottom:12px;">
      <label>Notes (optional)</label>
      <input type="text" id="dep-notes"
        placeholder="e.g. Cheque #1234 / damaged deposit"/>
    </div>
    <button onclick="saveDepositPayment('${orderId}','${type}')"
      style="width:100%;padding:11px;background:${color};color:#fff;
        border:none;border-radius:8px;font-weight:800;
        font-size:13px;cursor:pointer;">
      ${label}
    </button>`;

  openModal(label, html, false);
};

window.calcDepTotal = function() {
  const egp  = parseFloat(document.getElementById('dep-egp')?.value)  || 0;
  const usd  = parseFloat(document.getElementById('dep-usd')?.value)  || 0;
  const eur  = parseFloat(document.getElementById('dep-eur')?.value)  || 0;
  const card = parseFloat(document.getElementById('dep-card')?.value) || 0;
  const total = egp + (usd * (G.ratesUSD || 55)) +
                (eur * (G.ratesEUR || 60)) + card;
  const el = document.getElementById('dep-total-display');
  if (el) el.textContent = fmtMoney(total);
};

window.saveDepositPayment = async function(orderId, type) {
  const egp   = parseFloat(document.getElementById('dep-egp')?.value)  || 0;
  const usd   = parseFloat(document.getElementById('dep-usd')?.value)  || 0;
  const eur   = parseFloat(document.getElementById('dep-eur')?.value)  || 0;
  const card  = parseFloat(document.getElementById('dep-card')?.value) || 0;
  const notes = document.getElementById('dep-notes')?.value || '';
  const totalEGP = egp + (usd * (G.ratesUSD || 55)) +
                   (eur * (G.ratesEUR || 60)) + card;

  if (totalEGP <= 0) { toast('Enter at least one amount', 'warning'); return; }

  const field   = type === 'collect' ? 'deposit_held' : 'deposit_returned';
  const dateStr = new Date().toISOString().slice(0, 10);

  try {
    const snap = await db.collection('bookings').doc(orderId).get();
    const cur  = snap.data() || {};

    await db.collection('bookings').doc(orderId).update({
      [field]:        (parseFloat(cur[field] || 0)) + totalEGP,
      [`${field}_egp`]:(parseFloat(cur[`${field}_egp`] || 0)) + egp,
      [`${field}_usd`]:(parseFloat(cur[`${field}_usd`] || 0)) + usd,
      [`${field}_eur`]:(parseFloat(cur[`${field}_eur`] || 0)) + eur,
      _sys_updated:   firebase.firestore.FieldValue.serverTimestamp()
    });

    await db.collection('payment_log').add({
      order_id:     orderId,
      type:         'deposit_' + type,
      egp, usd, eur, card,
      totalEGP,
      notes,
      date:         dateStr,
      collected_by: G.user?.username || '',
      timestamp:    Date.now()
    });

    // Update local cache
    const dIdx = allOrders.findIndex(o => o.id === orderId);
    if (dIdx >= 0) {
      allOrders[dIdx][field] = (parseFloat(cur[field] || 0)) + totalEGP;
    }

    closeModal();
    toast(`✅ Deposit ${type === 'collect' ? 'collected' : 'returned'}: ${fmtMoney(totalEGP)}`, 'success');

  } catch (e) {
    toast('Failed: ' + e.message, 'error');
  }
};

// ============================================================
// REMINDER FORM
// ============================================================

window.openReminderForm = function(orderId) {
  const order = allOrders.find(o => o.id === orderId);
  const now   = new Date();
  const pad   = n => String(n).padStart(2, '0');
  const defaultDt =
    `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}` +
    `T${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const html = `
    <div class="form-grid" style="margin-bottom:11px;">
      <div class="field" style="grid-column:span 2;">
        <label>Remind At *</label>
        <input type="datetime-local" id="rem-dt" value="${defaultDt}"/>
      </div>
      <div class="field" style="grid-column:span 2;">
        <label>Category *</label>
        <select id="rem-cat">
          <option value="Follow-up call">Follow-up call</option>
          <option value="Check car">Check car</option>
          <option value="Collect payment">Collect payment</option>
          <option value="Return deposit">Return deposit</option>
          <option value="Custom">Custom</option>
        </select>
      </div>
      <div class="field" style="grid-column:span 2;">
        <label>Notes</label>
        <input type="text" id="rem-note" placeholder="Optional notes..."/>
      </div>
    </div>
    <div style="display:flex;gap:7px;">
      <button class="btn btn-primary btn-full"
        onclick="saveReminder('${orderId}')">🔔 Save Reminder</button>
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    </div>`;

  openModal(`Set Reminder — Order #${order?.['No.'] || orderId}`, html);
};

window.saveReminder = async function(orderId) {
  const dt  = document.getElementById('rem-dt')?.value;
  const cat = document.getElementById('rem-cat')?.value;
  const note= document.getElementById('rem-note')?.value || '';

  if (!dt)  { toast('Please select a date and time', 'error'); return; }
  if (!cat) { toast('Please select a category',      'error'); return; }

  try {
    await db.collection('reminders').add({
      order_id:   orderId,
      remind_at:  new Date(dt).getTime(),
      category:   cat,
      note,
      created_by: G.user?.username || '',
      dismissed:  false,
      fired:      false,
      created_at: Date.now()
    });
    toast('Reminder saved!', 'success');
    closeModal();
  } catch (e) {
    toast('Failed to save reminder: ' + e.message, 'error');
  }
};

// ============================================================
// BULK OPERATIONS
// ============================================================

window.toggleBulkMode = function() {
  window.bulkMode = !window.bulkMode;
  window.bulkSelected.clear();

  const btn     = document.getElementById('bulk-mode-btn');
  const toolbar = document.getElementById('bulk-toolbar');
  if (btn)     btn.style.background     = window.bulkMode ? 'var(--accent)' : '';
  if (toolbar) toolbar.style.display    = window.bulkMode ? 'flex' : 'none';

  filterOrders();
};

window.toggleBulkSelect = function(orderId, cb) {
  if (cb.checked) window.bulkSelected.add(orderId);
  else            window.bulkSelected.delete(orderId);
  const countEl = document.getElementById('bulk-count');
  if (countEl) countEl.textContent = window.bulkSelected.size + ' selected';
};

window.bulkSelectAll = function() {
  document.querySelectorAll('.bulk-cb').forEach(cb => {
    cb.checked = true;
    window.bulkSelected.add(cb.dataset.id);
  });
  const countEl = document.getElementById('bulk-count');
  if (countEl) countEl.textContent = window.bulkSelected.size + ' selected';
};

window.bulkClearAll = function() {
  document.querySelectorAll('.bulk-cb').forEach(cb => cb.checked = false);
  window.bulkSelected.clear();
  const countEl = document.getElementById('bulk-count');
  if (countEl) countEl.textContent = '0 selected';
};

window.bulkUpdateStatus = async function() {
  const status = document.getElementById('bulk-status-sel')?.value;
  if (!status)                    { toast('Select a status first', 'error'); return; }
  if (window.bulkSelected.size === 0) { toast('No orders selected',    'error'); return; }
  if (!confirm(
    `Update ${window.bulkSelected.size} orders to status: ${status}?`
  )) return;

  const isClosed = status === 'Closed';
  try {
    const ids      = [...window.bulkSelected];
    const CHUNK    = 400;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const batch = db.batch();
      ids.slice(i, i + CHUNK).forEach(id => {
        batch.update(db.collection('bookings').doc(id), {
          'حالة الطلب': status,
          closed:        isClosed,
          _sys_updated:  firebase.firestore.FieldValue.serverTimestamp()
        });
      });
      await batch.commit();
    }
    toast(`✅ Updated ${ids.length} orders to ${status}`, 'success');
    window.bulkSelected.clear();
    filterOrders();
  } catch (e) {
    toast('Bulk update failed: ' + e.message, 'error');
  }
};

window.bulkDelete = async function() {
  if (window.bulkSelected.size === 0) { toast('No orders selected', 'error'); return; }
  if (!confirm(
    `Permanently delete ${window.bulkSelected.size} orders? This cannot be undone.`
  )) return;

  const ids = [...window.bulkSelected];
  try {
    const CHUNK = 400;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const batch = db.batch();
      ids.slice(i, i + CHUNK).forEach(id =>
        batch.delete(db.collection('bookings').doc(id))
      );
      await batch.commit();
    }
    window.allOrders = allOrders.filter(o => !ids.includes(o.id));
    G.bookings       = G.bookings.filter(b => !ids.includes(b.id));
    toast(`✅ Deleted ${ids.length} orders`, 'success');
    window.bulkSelected.clear();
    filterOrders();
  } catch (e) {
    toast('Bulk delete failed: ' + e.message, 'error');
  }
};

// ============================================================
// ADMIN DELETE
// ============================================================

window.adminDeleteOrder = async function(orderId) {
  if (G.user?.role !== 'Admin') return;
  try {
    await db.collection('bookings').doc(orderId).delete();
    window.allOrders = allOrders.filter(o => o.id !== orderId);
    G.bookings       = G.bookings.filter(b => b.id !== orderId);
    closeModal();
    toast('Order deleted', 'success');
    window._orderSubActive = false;
    filterOrders();
  } catch (e) {
    toast('Delete failed: ' + e.message, 'error');
  }
};

// ============================================================
// CONTRACT / RECEIPT GENERATION FROM ORDER
// (Delegates to contracts.js and receipts.js)
// ============================================================

window.generateOrderContractDirect = async function(orderId, lang) {
  toast('⏳ Generating contract...', 'info');
  try {
    let o = allOrders.find(x => x.id === orderId);
    if (!o) {
      const snap = await db.collection('bookings').doc(orderId).get();
      if (!snap.exists) { toast('Order not found', 'error'); return; }
      o = { id: snap.id, ...snap.data() };
    }

    const carCode  = String(o['كود السيارة'] || o.col_D || '').trim();
    const car      = G.fleet.find(
      c => String(c.ID || c.id) === carCode
    ) || {};
    const clientCode = String(o['كود العميل'] || o.col_B || '').trim();
    const customer = G.customers.find(
      c => String(c['No.'] || c.col_A || c.id) === clientCode
    ) || {};

    const firstName = customer['الاسم الأول'] || customer.col_C || '';
    const lastName  = customer['الاسم الأخير'] || customer.col_D || '';
    const clientName= o['اسم العميل'] || (firstName + ' ' + lastName).trim() || '';
    const { start, end } = getOrderDates(o);
    const days  = start && end ? Math.max(1, Math.ceil((end - start) / 86400000)) : 1;
    const daily = parseAmount(o['سعر السيارة اليومي بالجنيه المصري'] || 0);
    const plate = car.plate || formatPlate(car) || '';
    const carLabel = car.car_label || getCarLabel(car, 'en') || carCode;
    const contractNo = o['No.'] || o.id;
    const branch     = o['فرع الإصدار'] || o.branch || 'HRG';

    const params = new URLSearchParams({
      orderId, contractNo, branch,
      rentalMode:   days > 28 ? 'Monthly' : 'Daily',
      cl_fname:     firstName || clientName.split(' ')[0] || '',
      cl_sname:     lastName  || clientName.split(' ').slice(1).join(' ') || '',
      cl_pass:      customer['رقم جواز السفر'] || '',
      cl_nation:    customer['رمز الدولة']      || '',
      cl_phone:     customer['رقم التليفون']    || '',
      cl_email:     customer['البريد الإلكتروني'] || '',
      cl_lic:       customer['رقم رخصة القيادة']|| '',
      carCode, carModel: carLabel, carPlate: plate,
      carVin:   car.chassis || car['رقم الشاسيه'] || '',
      carMotor: car['رقم الموتور'] || '',
      pickup:   start ? start.toISOString().slice(0, 16) : '',
      dropoff:  end   ? end.toISOString().slice(0, 16)   : '',
      rateRent: String(daily),
      contractNo,
      branch
    });

    const file = lang === 'ar' ? 'contract-ar.html' : 'contract-en.html';
    window.open(file + '?' + params.toString(), '_blank');
    toast(`✅ Contract generated`, 'success');

  } catch (e) {
    toast('Contract error: ' + e.message, 'error');
  }
};

window.generateOrderReceiptDirect = async function(orderId) {
  try {
    let o = allOrders.find(x => x.id === orderId);
    if (!o) {
      const snap = await db.collection('bookings').doc(orderId).get();
      if (!snap.exists) { toast('Order not found', 'error'); return; }
      o = { id: snap.id, ...snap.data() };
    }

    const clientCode = String(o['كود العميل'] || '').trim();
    const customer   = G.customers.find(
      c => String(c['No.'] || c.col_A || c.id) === clientCode
    ) || {};
    const carCode    = String(o['كود السيارة'] || '').trim();
    const car        = G.fleet.find(
      c => String(c.ID || c.id) === carCode
    ) || {};

    const { start, end } = getOrderDates(o);
    const clientName  = o['اسم العميل'] || '';
    const passport    = customer['رقم جواز السفر'] || '';
    const phone       = customer['رقم التليفون']   || '';
    const paid        = getOrderPaid(o);
    const total       = parseAmount(o['إجمالي المستحق (Total)'] || 0);
    const contractNo  = o['No.'] || o.id;
    const plate       = car.plate || formatPlate(car) || '';
    const carLabel    = (car.car_label || getCarLabel(car, 'en') || carCode).slice(0, 40);
    const branch      = o['فرع الإصدار'] || o.branch || 'HRG';
    const dateStr     = new Date().toISOString().slice(0, 10);
    const paidEGP     = parseAmount(o['المدفوع EGP'] || 0);
    const paidUSD     = parseAmount(o['المدفوع USD'] || 0);
    const paidEUR     = parseAmount(o['المدفوع EUR'] || 0);

    const parts = [];
    if (paidEGP > 0) parts.push(`${paidEGP.toLocaleString()} Cash (EGP)`);
    if (paidUSD > 0) parts.push(`${paidUSD} USD`);
    if (paidEUR > 0) parts.push(`${paidEUR} EUR`);
    const paymentStr = parts.join(' + ') || `${paid.toLocaleString()} EGP`;

    const branchCode = branch.toUpperCase().slice(0, 3);
    const now        = new Date();
    const rcRef = `RC-${branchCode}-${
      String(now.getMonth()+1).padStart(2,'0')}${
      String(now.getDate()).padStart(2,'0')}-${
      String(Date.now()).slice(-4)}`;

    const logo       = 'https://brothersegy.com/wp-content/uploads/2026/02/12345.png';
    const verifyUrl  = `https://sabryabr.github.io/BrothersEGY-ERP/verify.html?ref=${contractNo}`;

    const singleRec = copyType => `
      <div style="height:48%;border:2px solid #000;padding:15px;
        display:flex;flex-direction:column;box-sizing:border-box;">
        <div style="display:flex;justify-content:space-between;
          align-items:center;border-bottom:2px solid #000;
          padding-bottom:10px;margin-bottom:10px;">
          <img src="${logo}" style="height:40px;object-fit:contain;">
          <div style="text-align:center;flex:1;">
            <div style="font-size:14pt;font-weight:bold;color:#04509D;
              text-transform:uppercase;">OFFICIAL RECEIPT</div>
            <div style="font-size:9pt;">${copyType}</div>
          </div>
          <div style="text-align:right;">
            <img src="https://api.qrserver.com/v1/create-qr-code/?data=${
              encodeURIComponent(verifyUrl)}&size=60x60"
              style="height:50px;">
            <div style="font-size:7pt;font-weight:bold;">DATE: ${dateStr}</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;
          gap:10px;font-size:8.5pt;border-bottom:1px dashed #ccc;
          padding-bottom:8px;margin-bottom:8px;">
          <div>
            <div><strong>RECEIVED FROM</strong> ${clientName}</div>
            <div><strong>PASSPORT/ID</strong> ${passport || '—'}</div>
            <div><strong>PHONE</strong> ${phone || '—'}</div>
          </div>
          <div>
            <div><strong>CONTRACT NO</strong> ${contractNo}</div>
            <div><strong>VEHICLE</strong> ${carLabel} | ${plate}</div>
            <div><strong>PERIOD</strong>
              ${start ? start.toLocaleDateString('en-GB') : ''} →
              ${end   ? end.toLocaleDateString('en-GB')   : ''}
            </div>
          </div>
        </div>
        <div style="border:1px solid #ccc;background:#fbfbfb;
          padding:10px;margin-bottom:6px;">
          <div style="display:flex;justify-content:space-between;
            align-items:center;">
            <strong style="font-size:10pt;">AMOUNT RECEIVED</strong>
            <span style="font-size:20pt;font-weight:bold;">
              £${paid.toLocaleString()}.00
            </span>
          </div>
          <div style="font-size:8pt;margin-top:4px;color:#555;">
            ${paymentStr}
          </div>
        </div>
        ${(total - paid) > 0
          ? `<div style="font-size:8pt;color:#c0392b;font-weight:bold;">
              ⚠ OUTSTANDING BALANCE: £${(total-paid).toLocaleString()}.00
            </div>`
          : `<div style="font-size:8pt;color:#27ae60;font-weight:bold;">
              ✅ FULLY PAID
            </div>`}
        <div style="margin-top:auto;display:flex;justify-content:flex-end;">
          <div style="text-align:center;border-top:1px solid #000;
            width:200px;padding-top:5px;font-size:9pt;font-weight:bold;">
            AUTHORIZED SIGNATURE
          </div>
        </div>
      </div>`;

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <style>
        body{font-family:Arial,sans-serif;margin:0;padding:0;}
        @page{size:A4;margin:10mm 15mm;}
        @media print{
          body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
          .no-print{display:none!important;}
        }
        .print-btn{position:fixed;top:10px;right:10px;
          background:#04509D;color:white;border:none;
          padding:10px 20px;border-radius:6px;cursor:pointer;
          font-weight:bold;z-index:999;}
      </style></head><body>
      <button class="print-btn no-print"
        onclick="window.print()">🖨️ Print / Save PDF</button>
      <div style="width:210mm;min-height:296mm;padding:10mm 15mm;
        box-sizing:border-box;display:flex;flex-direction:column;">
        ${singleRec('CLIENT COPY')}
        <div style="text-align:center;border-top:1px dashed #999;
          color:#999;padding:8px 0;font-size:8pt;">
          - - - - - DETACH HERE - - - - -
        </div>
        ${singleRec('COMPANY COPY')}
      </div></body></html>`;

    await db.collection('receipts').add({
      order_id:    orderId,
      contract_no: contractNo,
      receipt_ref: rcRef,
      client_name: clientName,
      car_label:   carLabel + '| ' + plate,
      branch, branch_code: branchCode,
      receipt_date: dateStr,
      type:         'Rental Payment',
      amount_egp:   paidEGP,
      amount_usd:   paidUSD,
      total_egp_equiv: paid,
      payment_details: paymentStr,
      collected_by: G.user?.username || '',
      timestamp:    Date.now(),
      _sys_created: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(() => {});

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 600);
    }

  } catch (e) {
    toast('Receipt error: ' + e.message, 'error');
  }
};

// ============================================================
// PHOTO UPLOAD
// ============================================================

window.uploadOrderPhoto = async function(event, orderId, type) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) {
    toast('Max 10MB per photo', 'error');
    return;
  }

  toast('Uploading...', 'info', 2000);

  try {
    const compressed = await compressImage(file, 800, 0.75);
    const filename   = `img_${Date.now()}.jpg`;
    const ref        = storage.ref(`orders/${orderId}/${type}/${filename}`);
    await ref.put(compressed);
    const url = await ref.getDownloadURL();

    const order      = allOrders.find(o => o.id === orderId) ||
                       (await db.collection('bookings').doc(orderId).get()).data();
    const mediaField = type === 'pickup' ? 'pickup_media' : 'dropoff_media';
    const existing   = order?.[mediaField] || [];

    await db.collection('bookings').doc(orderId).update({
      [mediaField]: [...existing, {
        url, timestamp: Date.now(),
        uploaded_by: G.user.username, type
      }],
      '_sys_updated': Date.now()
    });

    await logAction('ADD', 'Order Book',
      `Photo uploaded for Order #${order?.['No.'] || orderId} — ${type}`);

    toast('Photo uploaded!', 'success');
    openOrderDetail(orderId);
  } catch (e) {
    toast('Upload failed: ' + e.message, 'error');
  }
};

window.openPhotoLightbox = function(url) {
  openModal('Photo', `
    <div style="text-align:center;">
      <img src="${url}" style="max-width:100%;max-height:70vh;
        border-radius:8px;object-fit:contain;"/>
      <div style="margin-top:11px;display:flex;gap:7px;
        justify-content:center;">
        <a href="${url}" target="_blank"
          class="btn btn-ghost btn-sm">🔗 Full Size</a>
        <a href="${url}" download
          class="btn btn-primary btn-sm">⬇️ Download</a>
      </div>
    </div>`);
};
