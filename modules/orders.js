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
    <div style="padding:16px 0 8px;">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px;">
        <h2 style="margin:0;font-size:18px;font-weight:800;">📋 Order Book</h2>
        <span style="color:var(--text3);font-size:12px;">
          All rental orders with live status and debt tracking
        </span>
        <div style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn btn-primary btn-sm"
            onclick="showPage('en-contract')">➕ New Order</button>
          <button class="btn btn-ghost btn-sm"
            onclick="refreshOrderBook()">🔄 Refresh</button>
          <button id="bulk-mode-btn" class="btn btn-ghost btn-sm"
            onclick="toggleBulkMode()">☑️ Select</button>
        </div>
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin-bottom:8px;">
        <div>
          <div style="margin-bottom:3px;font-weight:700;font-size:11px;">SEARCH</div>
          <input id="ob-search" type="text" placeholder="Client, car, order #…"
            oninput="filterOrders()"
            style="padding:7px 9px;background:var(--surface2);border:1px solid var(--border);
                   border-radius:8px;color:var(--text);min-width:180px;"/>
        </div>
        <div>
          <div style="margin-bottom:3px;font-weight:700;font-size:11px;">STATUS</div>
          <select id="ob-status" onchange="filterOrders()"
            style="padding:7px 9px;background:var(--surface2);border:1px solid var(--border);
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
          <div style="margin-bottom:3px;font-weight:700;font-size:11px;">BRANCH</div>
          <select id="ob-branch" onchange="filterOrders()"
            style="padding:7px 9px;background:var(--surface2);border:1px solid var(--border);
                   border-radius:8px;color:var(--text);">
            <option value="all">All Branches</option>
            <option value="HRG">Hurghada</option>
            <option value="ALX">Alexandria</option>
            <option value="CAI">Cairo</option>
            <option value="RSH">Rashid</option>
          </select>
        </div>
        <div>
          <div style="margin-bottom:3px;font-weight:700;font-size:11px;">FROM</div>
          <input type="date" id="ob-from" onchange="filterOrders()"
            style="padding:7px 9px;background:var(--surface2);border:1px solid var(--border);
                   border-radius:8px;color:var(--text);"/>
        </div>
        <div>
          <div style="margin-bottom:3px;font-weight:700;font-size:11px;">TO</div>
          <input type="date" id="ob-to" onchange="filterOrders()"
            style="padding:7px 9px;background:var(--surface2);border:1px solid var(--border);
                   border-radius:8px;color:var(--text);"/>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="clearOrderFilters()">✕ Clear</button>
      </div>

      <div id="ob-filter-pills"
        style="display:flex;gap:5px;flex-wrap:wrap;margin-top:9px;"></div>

      <div id="bulk-toolbar"
        style="display:none;background:var(--surface2);border:1px solid var(--accent);
               border-radius:8px;padding:10px 14px;margin-bottom:10px;
               align-items:center;gap:10px;flex-wrap:wrap;">
        <span id="bulk-count"
          style="font-size:11px;font-weight:700;color:var(--accent);">0 selected</span>
        <button class="btn btn-ghost btn-sm" onclick="bulkSelectAll()">Select All</button>
        <button class="btn btn-ghost btn-sm" onclick="bulkClearAll()">Clear</button>
        <select id="bulk-status-sel"
          style="padding:4px 8px;background:var(--surface2);border:1px solid var(--border);
                 border-radius:6px;color:var(--text);">
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

      <div id="ob-summary-bar"
        style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;"></div>
      <div id="ob-table-wrap"></div>
    </div>
  `;

  // Hide branch filter for non-privileged users
  if (!['Admin', 'Executive'].includes(G.user?.role)) {
    const bw = document.getElementById('ob-branch-wrap');
    if (bw) bw.style.display = 'none';
  }

  // Use cached data immediately
  if (G.bookings && G.bookings.length) {
    window.allOrders = G.bookings;
    filterOrders();
    updateOrderSummaryBar();
  }

  subscribeOrders();
};

// ============================================================
// ORDER SUBSCRIPTION
// ============================================================
window.subscribeOrders = function() {
  if (window._orderSubActive) return;

  if (window.allOrders && window.allOrders.length > 0) {
    filterOrders();
    updateOrderSummaryBar();
  }

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
        o['فرع الإصدار'] === G.user.branch ||
        o.assigned_user  === G.user.username ||
        (!o['فرع الإصدار'] && !o.assigned_user)
      );
    }

    orders.sort((a, b) => {
      const aNo = a['No.'] || '';
      const bNo = b['No.'] || '';
      if (!aNo && bNo) return 1;
      if (aNo && !bNo) return -1;
      const { start: aS } = getOrderDates(a);
      const { start: bS } = getOrderDates(b);
      return (bS || 0) - (aS || 0);
    });

    window.allOrders = orders;
    G.bookings       = orders;

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
  if (!window.allOrders || !window.allOrders.length) {
    window.allOrders = G.bookings || [];
  }

  const search = (document.getElementById('ob-search')?.value || '').toLowerCase().trim();
  const status = document.getElementById('ob-status')?.value  || 'all';
  const branch = document.getElementById('ob-branch')?.value  || 'all';
  const from   = document.getElementById('ob-from')?.value    || '';
  const to     = document.getElementById('ob-to')?.value      || '';
  const today  = getCairoNow();

  let filtered = allOrders.filter(o => {
    // Search
    if (search) {
      const hay = [
        getOrderClientName(o), getOrderNo(o),
        o['اسم السيارة'], o['كود العميل'],
        o['فرع الإصدار'], o.assigned_user,
        getOrderCarCode(o)
      ].join(' ').toLowerCase();
      if (!hay.includes(search)) return false;
    }

    // Status
    if (status !== 'all') {
      const st = getOrderStatus(o);
      const { end } = getOrderDates(o);
      const isOverdueOrder = end && today > end && !o.closed &&
        (st === 'Active' || st === 'Overdue');

      if (status === 'overdue') {
        if (!isOverdueOrder) return false;
      } else if (status === 'Active') {
        if (st !== 'Active' || isOverdueOrder) return false;
      } else if (status === 'Future') {
        if (st !== 'Future') return false;
      } else {
        if (st !== status) return false;
      }
    }

    // Branch
    if (branch !== 'all' && o['فرع الإصدار'] !== branch) return false;

    // Date range
    if (from || to) {
      const { start } = getOrderDates(o);
      if (from && start && start < new Date(from))              return false;
      if (to   && start && start > new Date(to + 'T23:59:59')) return false;
    }

    return true;
  });

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
  if (search)           active.push({ label: `Search: "${search}"`, key: 'search' });
  if (status !== 'all') active.push({ label: `Status: ${status}`,   key: 'status' });
  if (branch !== 'all') active.push({ label: `Branch: ${BRANCH_MAP[branch] || branch}`, key: 'branch' });
  if (from)             active.push({ label: `From: ${from}`,       key: 'from' });
  if (to)               active.push({ label: `To: ${to}`,           key: 'to' });

  pills.innerHTML = active.map(p => `
    <span style="padding:3px 9px;border-radius:99px;font-size:10px;font-weight:700;
                 background:rgba(59,130,246,0.15);color:var(--accent);
                 border:1px solid rgba(59,130,246,0.3);cursor:pointer;"
          onclick="clearFilter('${p.key}')">
      ${p.label} ✕
    </span>
  `).join('');
}

window.clearFilter = function(key) {
  const map = {
    search: 'ob-search', status: 'ob-status',
    branch: 'ob-branch', from:   'ob-from', to: 'ob-to'
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
  if (!bar || !allOrders || !allOrders.length) return;

  const today = getCairoNow();

  const active = allOrders.filter(o => {
    const st = getOrderStatus(o);
    const { end } = getOrderDates(o);
    return st === 'Active' && !(end && today > end && !o.closed);
  }).length;

  const overdue = allOrders.filter(o => {
    const { end } = getOrderDates(o);
    const st = getOrderStatus(o);
    return end && today > end && !o.closed && (st === 'Active' || st === 'Overdue');
  }).length;

  const accident = allOrders.filter(o => getOrderStatus(o) === 'Accident').length;

  const closed = allOrders.filter(o => {
    const st = getOrderStatus(o);
    return st === 'Closed' || o.closed === true;
  }).length;

  const future = allOrders.filter(o => {
    const st = getOrderStatus(o);
    const { start } = getOrderDates(o);
    return st === 'Future' || (start && start > today && !o.closed);
  }).length;

  const totalDebt = allOrders.reduce((sum, o) => {
    const st = getOrderStatus(o);
    if (st === 'Closed' || o.closed) return sum;
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
  const cardStyle = key => `
    border:2px solid ${curStatus === key ? 'var(--accent)' : 'transparent'};
    transition:border 0.15s;cursor:pointer;padding:8px 14px;border-radius:10px;
    background:var(--surface2);text-align:center;min-width:70px;
  `;

  bar.innerHTML = `
    <div style="${cardStyle('all')}" onclick="setOrderFilter('all')">
      <div style="font-size:10px;font-weight:700;color:var(--text3);">All</div>
      <div style="font-size:17px;font-weight:900;">${allOrders.length}</div>
    </div>
    <div style="${cardStyle('Active')}" onclick="setOrderFilter('Active')">
      <div style="font-size:10px;font-weight:700;color:var(--success);">Active</div>
      <div style="font-size:17px;font-weight:900;color:var(--success);">${active}</div>
    </div>
    <div style="${cardStyle('overdue')}" onclick="setOrderFilter('overdue')">
      <div style="font-size:10px;font-weight:700;color:var(--danger);">Overdue</div>
      <div style="font-size:17px;font-weight:900;color:var(--danger);">${overdue}</div>
    </div>
    <div style="${cardStyle('Future')}" onclick="setOrderFilter('Future')">
      <div style="font-size:10px;font-weight:700;color:var(--accent);">Future</div>
      <div style="font-size:17px;font-weight:900;color:var(--accent);">${future}</div>
    </div>
    <div style="${cardStyle('Accident')}" onclick="setOrderFilter('Accident')">
      <div style="font-size:10px;font-weight:700;color:var(--warning);">Accident</div>
      <div style="font-size:17px;font-weight:900;color:var(--warning);">${accident}</div>
    </div>
    <div style="${cardStyle('Closed')}" onclick="setOrderFilter('Closed')">
      <div style="font-size:10px;font-weight:700;color:var(--text3);">Closed</div>
      <div style="font-size:17px;font-weight:900;">${closed}</div>
    </div>
    <div style="padding:8px 14px;border-radius:10px;
                background:rgba(239,68,68,0.08);border:2px solid transparent;
                min-width:100px;text-align:center;">
      <div style="font-size:10px;font-weight:700;color:var(--danger);">Total Debt</div>
      <div style="font-size:14px;font-weight:900;color:var(--danger);">
        ${fmtMoney(totalDebt)}
      </div>
    </div>
  `;
};

// ============================================================
// RENDER ORDERS TABLE
// ============================================================
window.renderOrdersTable = function(orders) {
  const wrap = document.getElementById('ob-table-wrap');
  if (!wrap) return;

  if (!orders.length) {
    wrap.innerHTML = `
      <div style="text-align:center;padding:60px 20px;color:var(--text3);">
        <div style="font-size:40px;margin-bottom:12px;">📋</div>
        <div style="font-size:14px;">No orders match your filters</div>
      </div>
    `;
    return;
  }

  const today = getCairoNow();

  wrap.innerHTML = `
    <div style="font-size:11px;color:var(--text3);margin-bottom:8px;">
      Showing <strong>${orders.length}</strong> of
      <strong>${allOrders.length}</strong> orders
      ${orders.length < allOrders.length
        ? `<span style="color:var(--accent);margin-left:6px;cursor:pointer;"
               onclick="clearOrderFilters()">Clear filters</span>`
        : ''}
    </div>
    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr style="background:var(--surface2);color:var(--text3);
                     font-size:10px;font-weight:700;text-transform:uppercase;">
            ${window.bulkMode
              ? '<th style="padding:8px;width:32px;"></th>' : ''}
            <th style="padding:8px;text-align:left;">Order #</th>
            <th style="padding:8px;text-align:left;">Client</th>
            <th style="padding:8px;text-align:left;">Car</th>
            <th style="padding:8px;text-align:left;">Period</th>
            <th style="padding:8px;text-align:right;">Total</th>
            <th style="padding:8px;text-align:right;">Paid</th>
            <th style="padding:8px;text-align:right;">Debt</th>
            <th style="padding:8px;text-align:center;">Status</th>
            <th style="padding:8px;text-align:center;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${orders.map(o => _buildOrderRow(o, today)).join('')}
        </tbody>
      </table>
    </div>
  `;

  wrap.style.display    = 'block';
  wrap.style.visibility = 'visible';
  wrap.style.opacity    = '1';
};

function _buildOrderRow(o, today) {
  const { start, end } = getOrderDates(o);
  const days = start && end
    ? Math.ceil((end - start) / 86400000)
    : parseInt(o.rental_days || 0);

  const total = getOrderTotal(o);
  const paid  = getOrderPaid(o);
  const daily = parseAmount(o['سعر السيارة اليومي بالجنيه المصري']) ||
    (total / Math.max(1, parseFloat(o.rental_days || 1)));

  const statusRaw  = getOrderStatus(o);
  const isAccident = statusRaw === 'Accident';
  const isClosed   = statusRaw === 'Closed' || o.closed === true;
  const isOverdue  = !isClosed && end && today > end && !o.closed &&
    (statusRaw === 'Active' || statusRaw === 'Overdue');
  const isFuture   = !isClosed && !isOverdue && start && start > today;

  let lateDays = 0, latePenalty = 0;
  if ((isOverdue || isAccident) && end && !o.closed) {
    lateDays    = Math.max(0, Math.ceil((today - end) / 86400000));
    latePenalty = lateDays * daily;
  }

  const totalDue = total + latePenalty;
  const debt     = isClosed ? 0 : Math.max(0, totalDue - paid);
  const pct      = totalDue > 0
    ? Math.min(100, Math.round(paid / totalDue * 100)) : 100;

  const statusKey = isAccident ? 'accident'
    : isOverdue  ? 'overdue'
    : isClosed   ? 'closed'
    : isFuture   ? 'future'
    : (statusRaw || 'active').toLowerCase();

  const statusLabel = isAccident ? 'ACCIDENT'
    : isOverdue ? 'OVERDUE'
    : isClosed  ? 'Closed'
    : isFuture  ? 'Future'
    : (statusRaw || 'Active');

  const statusColors = {
    active:    'var(--success)',
    overdue:   'var(--danger)',
    accident:  'var(--warning)',
    closed:    'var(--text3)',
    cancelled: 'var(--text3)',
    future:    'var(--accent)'
  };
  const statusColor = statusColors[statusKey] || 'var(--text)';

  const carCode    = getOrderCarCode(o);
  const carInFleet = G.fleet.find(c => String(c.ID || c.id) === String(carCode));
  // ✅ Include plate in car label
  const plate      = carInFleet ? formatPlate(carInFleet) : '';
  const baseLabel  = carInFleet
    ? (carInFleet.car_label || getCarLabel(carInFleet, 'en'))
    : (o['اسم السيارة'] || '-');
  const carLabel   = plate ? `${baseLabel} | ${plate}` : baseLabel;

  const clientId = o['كود العميل'] || '';
  const rowBg    = isAccident ? 'rgba(249,115,22,0.04)'
    : isOverdue  ? 'rgba(239,68,68,0.04)' : 'transparent';

  return `
    <tr style="border-bottom:1px solid var(--border);cursor:pointer;background:${rowBg};"
        onmouseover="this.style.background='var(--surface2)'"
        onmouseout="this.style.background='${rowBg}'"
        onclick="openOrderDetail('${o.id}')">
      ${window.bulkMode ? `
        <td style="padding:8px;" onclick="event.stopPropagation()">
          <input type="checkbox" class="bulk-cb" data-id="${o.id}"
            ${window.bulkSelected.has(o.id) ? 'checked' : ''}
            onchange="toggleBulkSelect('${o.id}',this)"
            onclick="event.stopPropagation()"/>
        </td>
      ` : ''}
      <td style="padding:8px;font-weight:700;">#${getOrderNo(o)}</td>
      <td style="padding:8px;">
        <div style="font-weight:600;">${getOrderClientName(o) || '-'}</div>
        ${clientId
          ? `<div style="font-size:10px;color:var(--text3);">ID: ${clientId}</div>`
          : ''}
      </td>
      <td style="padding:8px;font-size:11px;color:var(--text2);">${carLabel}</td>
      <td style="padding:8px;font-size:11px;">
        <div>
          ${start
            ? start.toLocaleDateString('en-GB', { day:'2-digit', month:'short' })
            : '—'}
          →
          ${end
            ? end.toLocaleDateString('en-GB', { day:'2-digit', month:'short' })
            : '—'}
        </div>
        <div style="color:var(--text3);">${days}d
          ${isOverdue
            ? `<span style="color:var(--danger);"> +${lateDays}d late</span>`
            : ''}
        </div>
      </td>
      <td style="padding:8px;text-align:right;">${fmtMoney(total)}</td>
      <td style="padding:8px;text-align:right;">
        ${fmtMoney(paid)}
        <div style="height:3px;border-radius:2px;margin-top:3px;
                    background:${pct >= 100
                      ? 'var(--success)' : pct > 50
                      ? 'var(--accent)'  : 'var(--warning)'};
                    width:${pct}%;min-width:4px;"></div>
      </td>
      <td style="padding:8px;text-align:right;">
        <span style="font-weight:700;
                     color:${debt > 0 ? 'var(--danger)' : 'var(--success)'};">
          ${debt > 0 ? fmtMoney(debt) : '✅'}
        </span>
        ${latePenalty > 0
          ? `<div style="font-size:9px;color:var(--danger);">
               +${fmtMoney(latePenalty)}
             </div>`
          : ''}
      </td>
      <td style="padding:8px;text-align:center;">
        <span style="padding:3px 8px;border-radius:99px;font-size:10px;font-weight:700;
                     background:${statusColor}22;color:${statusColor};">
          ${statusLabel}
        </span>
      </td>
      <td style="padding:8px;text-align:center;white-space:nowrap;">
        <button class="btn btn-ghost btn-xs" title="View"
          onclick="event.stopPropagation();openOrderDetail('${o.id}')">👁</button>
        <button class="btn btn-warning btn-xs" title="Edit"
          onclick="event.stopPropagation();openOrderEdit('${o.id}')">✏️</button>
        <button class="btn btn-primary btn-xs" title="Add Payment"
          onclick="event.stopPropagation();quickAddPayment('${o.id}')">💰</button>
      </td>
    </tr>
  `;
}

window.refreshOrderBook = function() {
  const wrap = document.getElementById('ob-table-wrap');
  if (wrap) wrap.innerHTML =
    '<div style="text-align:center;padding:40px;color:var(--text3);">🔄 Refreshing...</div>';
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

  const today      = getCairoNow();
  const { start, end } = getOrderDates(o);
  const total      = getOrderTotal(o);
  const paid       = getOrderPaid(o);
  const daily      = parseAmount(o['سعر السيارة اليومي بالجنيه المصري']) ||
    (total / Math.max(1, parseFloat(o.rental_days || 1)));

  const statusRaw  = getOrderStatus(o);
  const isAccident = statusRaw === 'Accident';
  const isClosed   = statusRaw === 'Closed' || o.closed === true;
  const isOverdue  = !isClosed && end && today > end && !o.closed &&
    (statusRaw === 'Active' || statusRaw === 'Overdue');
  const isFuture   = !isClosed && !isOverdue && start && start > today;

  let lateDays = 0, latePenalty = 0;
  if ((isOverdue || isAccident) && end && !o.closed) {
    lateDays    = Math.max(0, Math.ceil((today - end) / 86400000));
    latePenalty = lateDays * daily;
  }

  const totalDue    = total + latePenalty;
  const debt        = isClosed ? 0 : Math.max(0, totalDue - paid);
  const depositHeld = parseAmount(o['الوديعة المحتجزة'] || o['deposit_held']     || 0);
  const depositRet  = parseAmount(o['الوديعة المردودة'] || o['deposit_returned'] || 0);

  const customer   = G.customers.find(
    c => String(c['No.'] || c.col_A) === String(o['كود العميل'])
  );
  const carCode    = getOrderCarCode(o);
  const carInFleet = G.fleet.find(c => String(c.ID || c.id) === String(carCode));

  // ✅ Build car label with plate
  const plate      = carInFleet ? formatPlate(carInFleet) : '';
  const baseLabel  = carInFleet
    ? (carInFleet.car_label || getCarLabel(carInFleet, 'en'))
    : (o['اسم السيارة'] || '-');
  const carLabel   = plate ? `${baseLabel} | ${plate}` : baseLabel;

  const bannerColor = isAccident ? 'var(--warning)'
    : isOverdue ? 'var(--danger)'
    : isClosed  ? 'var(--text3)'
    : isFuture  ? 'var(--accent)'
    : 'var(--success)';

  const bannerBg = isAccident ? 'rgba(249,115,22,0.1)'
    : isOverdue ? 'rgba(239,68,68,0.1)'
    : isClosed  ? 'rgba(100,116,139,0.1)'
    : isFuture  ? 'rgba(59,130,246,0.1)'
    : 'rgba(34,197,94,0.1)';

  const statusLabel = isAccident ? '— ACCIDENT'
    : isOverdue ? '— OVERDUE'
    : isClosed  ? '— CLOSED'
    : isFuture  ? '— FUTURE'
    : '— ACTIVE';

  const html = `
    <!-- Banner -->
    <div style="background:${bannerBg};border-radius:10px;padding:12px 16px;
                margin-bottom:16px;display:flex;align-items:center;gap:10px;">
      <span style="font-size:24px;">
        ${isAccident ? '🚨' : isOverdue ? '⚠️' : isClosed ? '✅' : isFuture ? '📅' : '🚗'}
      </span>
      <div>
        <div style="font-size:15px;font-weight:800;">
          Order #${getOrderNo(o)}
          <span style="color:${bannerColor};">${statusLabel}</span>
        </div>
        ${lateDays > 0 ? `
          <div style="font-size:11px;color:var(--danger);">
            ${lateDays} days ${isAccident ? 'since accident' : 'overdue'}
            • Penalty: ${fmtMoney(latePenalty)}
          </div>
        ` : ''}
        ${isFuture && start ? `
          <div style="font-size:11px;color:var(--accent);">
            Starts ${start.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}
          </div>
        ` : ''}
      </div>
    </div>

    <!-- Client + Car -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
      <div style="background:var(--surface2);border-radius:10px;padding:12px;">
        <div style="font-size:10px;font-weight:700;color:var(--text3);margin-bottom:6px;">
          👤 CLIENT
        </div>
        <div style="font-weight:700;font-size:13px;
                    cursor:${customer ? 'pointer' : 'default'};
                    color:${customer ? 'var(--accent)' : 'var(--text)'};"
             ${customer
               ? `onclick="closeModal();setTimeout(()=>openClientProfile('${customer.id}'),100)"`
               : ''}>
          ${o['اسم العميل'] || '-'}${customer ? ' 🔗' : ''}
        </div>
        <div style="font-size:11px;color:var(--text3);">
          CRM ID: ${o['كود العميل'] || '-'}
        </div>
        ${customer ? `
          <div style="font-size:11px;color:var(--text2);margin-top:4px;">
            📞 ${customer['رقم التليفون'] || '-'}<br>
            🪪 ${customer['رقم جواز السفر'] || customer['الرقم القومي'] || '-'}
          </div>
        ` : ''}
      </div>

      <div style="background:var(--surface2);border-radius:10px;padding:12px;">
        <div style="font-size:10px;font-weight:700;color:var(--text3);margin-bottom:6px;">
          🚗 CAR
        </div>
        <div style="font-weight:700;font-size:13px;
                    cursor:${carInFleet ? 'pointer' : 'default'};
                    color:${carInFleet ? 'var(--accent)' : 'var(--text)'};"
             ${carInFleet
               ? `onclick="closeModal();setTimeout(()=>openCarDetailModal('${carInFleet.id || carCode}'),200)"`
               : ''}>
          ${carLabel}${carInFleet ? ' 🔗' : ''}
        </div>
        <div style="font-size:11px;color:var(--text3);">Code: ${carCode || '-'}</div>
        <div style="font-size:11px;color:var(--text2);margin-top:4px;">
          📍 Pickup: ${o['مكان الاستلام'] || '-'}<br>
          📍 Dropoff: ${o['مكان التسليم'] || '-'}
        </div>
      </div>
    </div>

    <!-- Period -->
    <div style="background:var(--surface2);border-radius:10px;
                padding:12px;margin-bottom:12px;">
      <div style="font-size:10px;font-weight:700;color:var(--text3);margin-bottom:6px;">
        📅 PERIOD
      </div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12px;">
        <div>
          <span style="color:var(--text3);">Start:</span>
          <strong>${start ? fmtDate(start) : 'N/A'}</strong>
        </div>
        <div>
          <span style="color:var(--text3);">End:</span>
          <strong>${end ? fmtDate(end) : 'N/A'}</strong>
        </div>
        <div>
          <span style="color:var(--text3);">Duration:</span>
          ${o['rental_days'] || (start && end
            ? Math.ceil((end - start) / 86400000) : '-')} days
        </div>
        <div>
          <span style="color:var(--text3);">Branch:</span>
          ${BRANCH_MAP[o['فرع الإصدار']] || o['فرع الإصدار'] || '-'}
        </div>
      </div>
    </div>

    <!-- Financials -->
    <div style="background:var(--surface2);border-radius:10px;
                padding:12px;margin-bottom:12px;">
      <div style="font-size:10px;font-weight:700;color:var(--text3);margin-bottom:8px;">
        💰 FINANCIALS
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));
                  gap:8px;font-size:11px;">
        <div>
          <div style="color:var(--text3);">Daily Rate</div>
          <div style="font-weight:700;">${fmtMoney(daily)}</div>
        </div>
        <div>
          <div style="color:var(--text3);">Base Total</div>
          <div style="font-weight:700;">${fmtMoney(total)}</div>
        </div>
        ${latePenalty > 0 ? `
        <div>
          <div style="color:var(--danger);">+ Penalty</div>
          <div style="font-weight:700;color:var(--danger);">${fmtMoney(latePenalty)}</div>
        </div>
        ` : ''}
        <div>
          <div style="color:var(--text3);">Total Due</div>
          <div style="font-weight:700;">${fmtMoney(totalDue)}</div>
        </div>
        <div>
          <div style="color:var(--text3);">Paid</div>
          <div style="font-weight:700;color:var(--success);">${fmtMoney(paid)}</div>
        </div>
      </div>
      <div style="margin-top:12px;padding:10px;border-radius:8px;text-align:center;
                  background:${debt > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)'};
                  border:1px solid ${debt > 0 ? 'var(--danger)' : 'var(--success)'}20;">
        <div style="font-size:10px;font-weight:700;color:var(--text3);margin-bottom:4px;">
          CURRENT DEBT
        </div>
        <div style="font-size:18px;font-weight:900;
                    color:${debt > 0 ? 'var(--danger)' : 'var(--success)'};">
          ${debt > 0 ? fmtMoney(debt) : '✅ CLEAR'}
        </div>
      </div>
    </div>

    <!-- Deposit -->
    <div style="background:var(--surface2);border-radius:10px;
                padding:12px;margin-bottom:12px;">
      <div style="font-size:10px;font-weight:700;color:var(--text3);margin-bottom:8px;">
        🔒 DEPOSIT / SECURITY
      </div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12px;margin-bottom:8px;">
        <div>
          <span style="color:var(--text3);">Deposit Held:</span>
          <strong>${fmtMoney(depositHeld)}</strong>
        </div>
        <div>
          <span style="color:var(--text3);">Deposit Returned:</span>
          <strong>${fmtMoney(depositRet)}</strong>
        </div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
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

    <!-- Primary Actions -->
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
      <button class="btn btn-warning"
        onclick="closeModal();openOrderEdit('${o.id}')">✏️ Edit Order</button>
      <button class="btn btn-primary"
        onclick="closeModal();quickAddPayment('${o.id}')">💰 Add Payment</button>
      ${!isClosed ? `
        <button class="btn btn-success"
          onclick="closeModal();requestCloseOrder('${o.id}')">✅ Close</button>
      ` : ''}
    </div>

    <!-- Secondary Actions -->
    <div style="display:flex;gap:6px;flex-wrap:wrap;">
      <button class="btn btn-ghost"
        onclick="generateOrderContractDirect('${o.id}','en')">📄 Contract</button>
      <button class="btn btn-ghost"
        onclick="generateOrderContractDirect('${o.id}','ar')">📋 AR Contract</button>
      <button class="btn btn-ghost"
        onclick="viewOrReprintReceipt('${o.id}','${o['No.'] || o.id}')">🧾 Receipt</button>
      <button class="btn btn-ghost"
        onclick="viewOrderPayments('${o.id}','${o['No.'] || o.id}')">💳 Payments</button>
      <button class="btn btn-ghost"
        onclick="extendOrder('${o.id}')">📅 Extend</button>
      <button class="btn btn-ghost"
        onclick="switchOrderCar('${o.id}')">🔄 Switch Car</button>
      <button class="btn btn-ghost"
        onclick="openReminderForm('${o.id}')">🔔 Reminder</button>
      ${G.user?.role === 'Admin' ? `
        <button class="btn btn-sm"
          style="background:var(--danger);color:#fff;"
          onclick="if(confirm('DELETE order #${o['No.']} permanently?'))
                   adminDeleteOrder('${o.id}')">
          🗑️ Delete
        </button>
      ` : ''}
    </div>
  `;

  openModal(`Order #${o['No.'] || o.id} — ${o['اسم العميل'] || ''}`, html, true);
  logAction('VIEW', 'Order Book', `Viewed order #${o['No.'] || o.id}`);
};

// ============================================================
// ORDER EDIT MODAL
// ============================================================
window.openOrderEdit = async function(orderId) {
  const order = allOrders.find(o => o.id === orderId);
  if (!order) return;
  const o      = order;
  const isPriv = ['Admin', 'Executive'].includes(G.user?.role);

  const html = `
    <div style="display:grid;gap:10px;">
      <div>
        <label style="font-size:11px;font-weight:700;color:var(--text3);">
          Order Status
        </label>
        <select id="edit-status"
          style="width:100%;margin-top:4px;padding:8px;background:var(--surface2);
                 border:1px solid var(--border);border-radius:8px;color:var(--text);">
          <option value="Active"
            ${(o['حالة الطلب'] || '') === 'Active'    ? 'selected' : ''}>Active</option>
          <option value="Closed"
            ${(o['حالة الطلب'] || '') === 'Closed'    ? 'selected' : ''}>Closed</option>
          <option value="Accident"
            ${(o['حالة الطلب'] || '') === 'Accident'  ? 'selected' : ''}>Accident</option>
          <option value="Cancelled"
            ${(o['حالة الطلب'] || '') === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:var(--text3);">
          Daily Rate (EGP)
        </label>
        <input type="number" id="edit-daily"
          style="width:100%;margin-top:4px;padding:8px;background:var(--surface2);
                 border:1px solid var(--border);border-radius:8px;color:var(--text);"
          value="${parseAmount(o['سعر السيارة اليومي بالجنيه المصري']) || ''}"
          ${!isPriv
            ? 'readonly title="Rate changes require admin approval"' : ''}/>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:var(--text3);">
          Total Due (EGP)
        </label>
        <input type="number" id="edit-total"
          style="width:100%;margin-top:4px;padding:8px;background:var(--surface2);
                 border:1px solid var(--border);border-radius:8px;color:var(--text);"
          value="${parseAmount(o['إجمالي المستحق (Total)']) || ''}"/>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:var(--text3);">
          Paid EGP
        </label>
        <input type="number" id="edit-paid"
          style="width:100%;margin-top:4px;padding:8px;background:var(--surface2);
                 border:1px solid var(--border);border-radius:8px;color:var(--text);"
          value="${parseAmount(o['المدفوع EGP']) || ''}"/>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div>
          <label style="font-size:11px;font-weight:700;color:var(--text3);">
            KM at Start
          </label>
          <input type="number" id="edit-km-start"
            style="width:100%;margin-top:4px;padding:8px;background:var(--surface2);
                   border:1px solid var(--border);border-radius:8px;color:var(--text);"
            value="${parseAmount(o['كيلومتر بداية']) || ''}"/>
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:var(--text3);">
            KM at End
          </label>
          <input type="number" id="edit-km-end"
            style="width:100%;margin-top:4px;padding:8px;background:var(--surface2);
                   border:1px solid var(--border);border-radius:8px;color:var(--text);"
            value="${parseAmount(o['كيلومتر نهاية']) || ''}"/>
        </div>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:var(--text3);">Notes</label>
        <input type="text" id="edit-notes"
          style="width:100%;margin-top:4px;padding:8px;background:var(--surface2);
                 border:1px solid var(--border);border-radius:8px;color:var(--text);"
          value="${(o['ملاحظات'] || o.Notes || '').replace(/"/g, '&quot;')}"/>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:var(--text3);">
          Debt Clock
        </label>
        <select id="edit-closed"
          style="width:100%;margin-top:4px;padding:8px;background:var(--surface2);
                 border:1px solid var(--border);border-radius:8px;color:var(--text);">
          <option value="false" ${!o.closed ? 'selected' : ''}>
            Open (debt clock running)
          </option>
          <option value="true" ${o.closed ? 'selected' : ''}>
            Closed (stopped)
          </option>
        </select>
      </div>
      ${!isPriv ? `
        <div style="font-size:11px;color:var(--warning);padding:8px;
                    background:rgba(245,158,11,0.1);border-radius:6px;">
          ⚠️ Rate changes exceeding threshold will require admin approval.
        </div>
      ` : ''}
      <div style="display:flex;gap:8px;margin-top:4px;">
        <button class="btn btn-success" style="flex:1;"
          onclick="saveOrderEdit('${orderId}')">💾 Save Changes</button>
        <button class="btn btn-ghost" style="flex:1;"
          onclick="closeModal()">Cancel</button>
      </div>
    </div>
  `;

  openModal(`Edit Order #${o['No.'] || o.id}`, html);
};

window.saveOrderEdit = async function(orderId) {
  const order    = allOrders.find(o => o.id === orderId);
  const isPriv   = ['Admin', 'Executive'].includes(G.user?.role);
  const newStatus= document.getElementById('edit-status')?.value;
  const newDaily = parseFloat(document.getElementById('edit-daily')?.value)  || 0;
  const newTotal = parseFloat(document.getElementById('edit-total')?.value)  || 0;
  const newPaid  = parseFloat(document.getElementById('edit-paid')?.value)   || 0;
  const newClosed= document.getElementById('edit-closed')?.value === 'true';
  const newNotes = document.getElementById('edit-notes')?.value.trim();
  const kmStart  = document.getElementById('edit-km-start')?.value;
  const kmEnd    = document.getElementById('edit-km-end')?.value;

  // Rate change approval check
  if (!isPriv && order) {
    const origRate    = parseAmount(order['سعر السيارة اليومي بالجنيه المصري']);
    const threshold   = G.settings?.discountThreshold || 5;
    const discountPct = origRate > 0
      ? ((origRate - newDaily) / origRate * 100) : 0;

    if (discountPct > threshold) {
      await db.collection('approvals').add({
        type          : 'rate_change',
        requested_by  : G.user.username,
        branch        : G.user.branch,
        subject       : `Rate change for Order #${order['No.']}`,
        details       : `Original: ${fmtMoney(origRate)} → Requested: ${fmtMoney(newDaily)} (${discountPct.toFixed(1)}% discount)`,
        linked_ref    : orderId,
        current_value : String(origRate),
        requested_value: String(newDaily),
        reason        : newNotes || 'Rate change requested',
        status        : 'pending',
        created_at    : Date.now()
      });
      toast(
        `Rate change ${discountPct.toFixed(1)}% exceeds threshold. Approval submitted.`,
        'warning', 6000
      );
      closeModal();
      return;
    }
  }

  try {
    const upd = {
      'حالة الطلب'                       : newStatus,
      'سعر السيارة اليومي بالجنيه المصري': String(newDaily),
      'إجمالي المستحق (Total)'            : String(newTotal),
      'المدفوع EGP'                       : String(newPaid),
      'closed'                            : newClosed,
      'ملاحظات'                           : newNotes,
      '_sys_updated'                      : Date.now()
    };
    if (kmStart) upd['كيلومتر بداية'] = kmStart;
    if (kmEnd)   upd['كيلومتر نهاية'] = kmEnd;

    // Accident → update car status
    if (newStatus === 'Accident' && order?.['كود السيارة']) {
      await db.collection('fleet')
        .doc(String(order['كود السيارة']))
        .update({ status: 'accident', Contract: 'Accident', _sys_updated: Date.now() })
        .catch(() => {});
    }

    // Closing → set car to available
    if (newClosed && order?.['كود السيارة']) {
      await db.collection('fleet')
        .doc(String(order['كود السيارة']))
        .update({ status: 'available', _sys_updated: Date.now() })
        .catch(() => {});
    }

    await db.collection('bookings').doc(orderId).update(upd);

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

  const total    = parseAmount(order['إجمالي المستحق (Total)']);
  const paid     = parseAmount(order['المدفوع EGP']);
  const debt     = Math.max(0, total - paid);
  const todayStr = getCairoNow().toISOString().slice(0, 10);

  const html = `
    <div style="display:grid;gap:4px;margin-bottom:12px;font-size:12px;
                background:var(--surface2);border-radius:8px;padding:10px;">
      <div style="display:flex;justify-content:space-between;">
        <span style="color:var(--text3);">Order:</span>
        <strong>#${order['No.'] || orderId}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;">
        <span style="color:var(--text3);">Client:</span>
        <strong>${order['اسم العميل'] || '-'}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;">
        <span style="color:var(--text3);">Outstanding:</span>
        <strong style="color:var(--danger);">${fmtMoney(debt)}</strong>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
      <div>
        <label style="font-size:11px;font-weight:700;color:var(--text3);">
          Amount EGP (Cash)
        </label>
        <input type="number" id="qp-egp" value="0" min="0"
          style="width:100%;margin-top:4px;padding:8px;background:var(--surface2);
                 border:1px solid var(--border);border-radius:8px;color:var(--text);"
          oninput="updateQPTotal()"/>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:var(--text3);">
          Amount USD (Cash)
        </label>
        <input type="number" id="qp-usd" value="0" min="0"
          style="width:100%;margin-top:4px;padding:8px;background:var(--surface2);
                 border:1px solid var(--border);border-radius:8px;color:var(--text);"
          oninput="updateQPTotal()"/>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:var(--text3);">
          Amount EUR (Cash)
        </label>
        <input type="number" id="qp-eur" value="0" min="0"
          style="width:100%;margin-top:4px;padding:8px;background:var(--surface2);
                 border:1px solid var(--border);border-radius:8px;color:var(--text);"
          oninput="updateQPTotal()"/>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:var(--text3);">
          Card / POS (EGP)
        </label>
        <input type="number" id="qp-card" value="0" min="0"
          style="width:100%;margin-top:4px;padding:8px;background:var(--surface2);
                 border:1px solid var(--border);border-radius:8px;color:var(--text);"
          oninput="updateQPTotal()"/>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:var(--text3);">
          Online Transfer (EGP)
        </label>
        <input type="number" id="qp-online" value="0" min="0"
          style="width:100%;margin-top:4px;padding:8px;background:var(--surface2);
                 border:1px solid var(--border);border-radius:8px;color:var(--text);"
          oninput="updateQPTotal()"/>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:var(--text3);">
          Collected By
        </label>
        <select id="qp-collected-by"
          style="width:100%;margin-top:4px;padding:8px;background:var(--surface2);
                 border:1px solid var(--border);border-radius:8px;color:var(--text);">
          <option value="${G.user?.username || ''}">
            Me (${G.user?.username || ''})
          </option>
          <option value="Sabry">Sabry</option>
          <option value="Eslam">Eslam</option>
          <option value="Shams">Shams</option>
          <option value="Other">Other</option>
        </select>
      </div>
    </div>

    <div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);
                border-radius:8px;padding:10px;text-align:center;margin-bottom:12px;">
      <div style="font-size:10px;font-weight:700;color:var(--text3);">Total This Payment</div>
      <div id="qp-total"
        style="font-size:18px;font-weight:900;color:var(--success);">£0.00</div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
      <div>
        <label style="font-size:11px;font-weight:700;color:var(--text3);">
          Date of Payment *
        </label>
        <input type="date" id="qp-date" value="${todayStr}"
          style="width:100%;margin-top:4px;padding:8px;background:var(--surface2);
                 border:1px solid var(--border);border-radius:8px;color:var(--text);"/>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:var(--text3);">
          Reason / Category *
        </label>
        <select id="qp-category"
          style="width:100%;margin-top:4px;padding:8px;background:var(--surface2);
                 border:1px solid var(--border);border-radius:8px;color:var(--text);">
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

    <div style="margin-bottom:12px;">
      <label style="font-size:11px;font-weight:700;color:var(--text3);">
        Notes (optional)
      </label>
      <input type="text" id="qp-notes" placeholder="Additional notes..."
        style="width:100%;margin-top:4px;padding:8px;background:var(--surface2);
               border:1px solid var(--border);border-radius:8px;color:var(--text);"/>
    </div>

    <div style="display:flex;gap:8px;">
      <button class="btn btn-success" style="flex:1;"
        onclick="saveQuickPayment('${orderId}',${total},${paid})">
        💾 Save Payment
      </button>
      <button class="btn btn-ghost" style="flex:1;"
        onclick="closeModal()">Cancel</button>
    </div>
  `;

  openModal(`Add Payment — Order #${order['No.'] || orderId}`, html);
};

window.updateQPTotal = function() {
  const egp    = parseFloat(document.getElementById('qp-egp')?.value)    || 0;
  const usd    = parseFloat(document.getElementById('qp-usd')?.value)    || 0;
  const eur    = parseFloat(document.getElementById('qp-eur')?.value)    || 0;
  const card   = parseFloat(document.getElementById('qp-card')?.value)   || 0;
  const online = parseFloat(document.getElementById('qp-online')?.value) || 0;
  const el     = document.getElementById('qp-total');
  if (el) el.textContent = fmtMoney(
    egp + (usd * G.ratesUSD) + (eur * G.ratesEUR) + card + online
  );
};

window.saveQuickPayment = async function(orderId, totalDue, prevPaid) {
  const egp         = parseFloat(document.getElementById('qp-egp')?.value)    || 0;
  const usd         = parseFloat(document.getElementById('qp-usd')?.value)    || 0;
  const eur         = parseFloat(document.getElementById('qp-eur')?.value)    || 0;
  const card        = parseFloat(document.getElementById('qp-card')?.value)   || 0;
  const online      = parseFloat(document.getElementById('qp-online')?.value) || 0;
  const collectedBy = document.getElementById('qp-collected-by')?.value || G.user?.username || '';
  const thisPayment = egp + (usd * G.ratesUSD) + (eur * G.ratesEUR) + card + online;
  const payDate     = document.getElementById('qp-date')?.value;
  const payCategory = document.getElementById('qp-category')?.value;
  const payNotes    = document.getElementById('qp-notes')?.value || '';

  if (thisPayment <= 0) { toast('Payment must be greater than 0', 'error'); return; }
  if (!payDate)         { toast('Date of payment is required', 'error'); return; }
  if (!payCategory)     { toast('Reason / Category is required', 'error'); return; }

  const order = allOrders.find(o => o.id === orderId);

  try {
    // ✅ New EGP paid = previous + cash EGP + card + online (not USD/EUR)
    const newPaidEGP = prevPaid + egp + card + online;

    const upd = {
      'المدفوع EGP' : String(newPaidEGP),
      '_sys_updated': Date.now()
    };

    // ✅ USD and EUR written once only
    if (usd > 0) {
      upd['المدفوع USD'] = String(
        parseAmount(order?.['المدفوع USD'] || '0') + usd
      );
    }
    if (eur > 0) {
      upd['المدفوع EUR'] = String(
        parseAmount(order?.['المدفوع EUR'] || '0') + eur
      );
    }

    const newTotalEquiv = prevPaid + thisPayment;
    const { end }       = getOrderDates(order || {});

    // Auto-close if fully paid and past end date
    if (newTotalEquiv >= totalDue && end && getCairoNow() > end &&
        getOrderStatus(order) !== 'Accident') {
      upd['closed']      = true;
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
    if (egp    > 0) methods.push('Cash EGP');
    if (card   > 0) methods.push('Card');
    if (online > 0) methods.push('Online');
    if (usd    > 0) methods.push('Cash USD');
    if (eur    > 0) methods.push('Cash EUR');

    const orderBranch = order?.['فرع الإصدار'] || order?.branch ||
      G.user?.branch || 'HRG';

    const paymentRecord = {
      order_id        : orderId,
      order_ref       : order?.['No.'] || orderId,
      client_name     : getOrderClientName(order) || '',
      car_label       : getCarLabel(car, 'en') || order?.['اسم السيارة'] || '',
      branch          : orderBranch,
      amount_egp      : egp + card + online,
      amount_usd      : usd,
      amount_eur      : eur,
      total_egp_equiv : egp + card + online + (usd * G.ratesUSD) + (eur * G.ratesEUR),
      payment_method  : methods.join(' + ') || 'Cash',
      collected_by    : collectedBy,
      notes           : payNotes,
      type            : 'rental_payment',
      category        : payCategory,
      date            : payDate,
      datetime        : new Date().toISOString(),
      timestamp       : Date.now(),
      _sys_created    : firebase.firestore.FieldValue.serverTimestamp()
    };

    const payRef = await db.collection('payment_log').add(paymentRecord);
    await logAction('EDIT', 'Order Book',
      `Payment on Order #${order?.['No.'] || orderId}: ${fmtMoney(thisPayment)}`);

    // ✅ Update local cache correctly
    const orderIdx = allOrders.findIndex(o => o.id === orderId);
    if (orderIdx >= 0) {
      allOrders[orderIdx]['المدفوع EGP'] = String(newPaidEGP);
      if (usd > 0) allOrders[orderIdx]['المدفوع USD'] = upd['المدفوع USD'];
      if (eur > 0) allOrders[orderIdx]['المدفوع EUR'] = upd['المدفوع EUR'];
      Object.assign(allOrders[orderIdx], upd);
      const gIdx = G.bookings.findIndex(o => o.id === orderId);
      if (gIdx >= 0) Object.assign(G.bookings[gIdx], allOrders[orderIdx]);
    }

    if (typeof filterOrders === 'function') filterOrders();
    toast('✅ Payment saved! Generating receipt...', 'success');
    closeModal();
    // ✅ Only generate receipt on actual payment save
    setTimeout(() => generateSinglePaymentReceipt(
      paymentRecord, payRef.id, orderId
    ), 400);
  } catch (e) {
    toast('Payment failed: ' + e.message, 'error');
  }
};

// ============================================================
// SINGLE PAYMENT RECEIPT (called ONLY from saveQuickPayment)
// ============================================================
window.generateSinglePaymentReceipt = async function(payment, paymentId, orderId) {
  try {
    let order = allOrders.find(o => o.id === orderId);
    if (!order) {
      const snap = await db.collection('bookings').doc(orderId).get();
      if (snap.exists) order = { id: snap.id, ...snap.data() };
    }

    const contractNo  = order?.['No.'] || orderId;
    const clientName  = payment.client_name || getOrderClientName(order) || '';
    const carLabel    = payment.car_label || '';
    const { start, end } = getOrderDates(order || {});
    const verifyUrl = `https://sabryabr.github.io/BrothersEGY-ERP/verify.html?ref=${encodeURIComponent(rcRef)}`;
    const logo        = 'https://brothersegy.com/wp-content/uploads/2026/02/12345.png';

    const dateStr = new Date(payment.datetime || Date.now())
      .toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });

    const parts = [];
    if (payment.amount_egp > 0) parts.push(`£${payment.amount_egp.toLocaleString()} EGP`);
    if (payment.amount_usd > 0) parts.push(`$${payment.amount_usd} USD`);
    if (payment.amount_eur > 0) parts.push(`€${payment.amount_eur} EUR`);
    const amountStr = parts.join(' + ');

    const totalOrder  = parseAmount(order?.['إجمالي المستحق (Total)'] || 0);
    const totalPaid   = parseAmount(order?.['المدفوع EGP'] || 0);
    const outstanding = Math.max(0, totalOrder - totalPaid);

    const rcRef = `RC-${(payment.branch || 'GEN').slice(0, 3).toUpperCase()}-${
      new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${
      paymentId.slice(-4).toUpperCase()}`;

    const slip = copyType => `
      <div style="font-family:'Courier New',monospace;width:80mm;padding:10px;
                  border:1px solid #ccc;border-radius:4px;font-size:8pt;">

        <div style="display:flex;justify-content:space-between;align-items:center;
                    border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:8px;">
          <div>
            <img src="${logo}" style="height:36px;"
                 onerror="this.style.display='none'"/>
            <div style="font-weight:800;font-size:10pt;">BROTHERS EGY</div>
            <div style="font-size:7pt;color:#666;">${copyType}</div>
          </div>
          <div style="text-align:center;">
            <img src="https://api.qrserver.com/v1/create-qr-code/?data=${
              encodeURIComponent(verifyUrl)}&size=70x70"
                 style="height:52px;">
            <div style="font-size:6pt;color:#999;">SCAN TO VERIFY</div>
          </div>
        </div>

        <div style="border-bottom:1px dashed #ccc;padding-bottom:6px;margin-bottom:6px;">
          <div>Ref: <strong>${rcRef}</strong></div>
          <div>Date: ${dateStr}</div>
          <div>Contract: <strong>#${contractNo}</strong></div>
        </div>

        <div style="border-bottom:1px dashed #ccc;padding-bottom:6px;margin-bottom:6px;">
          <div>Client: <strong>${clientName}</strong></div>
          <div>Car: ${carLabel}</div>
          <div>Period:
            ${start ? start.toLocaleDateString('en-GB') : '—'} →
            ${end   ? end.toLocaleDateString('en-GB')   : '—'}
          </div>
        </div>

        <div style="background:#f8fafc;border-radius:4px;
                    padding:8px;margin-bottom:8px;text-align:center;">
          <div style="font-size:7pt;font-weight:700;color:#666;
                      text-transform:uppercase;">This Payment Only</div>
          <div style="font-size:14pt;font-weight:900;">
            ${amountStr || fmtMoney(payment.total_egp_equiv || 0)}
          </div>
          <div style="font-size:7pt;color:#555;">
            ${payment.payment_method || 'Cash'}
          </div>
          <div style="font-size:7pt;color:#777;">
            Category: ${payment.category || '—'}
          </div>
          ${payment.notes
            ? `<div style="font-size:7pt;font-style:italic;">
                 Note: ${payment.notes}
               </div>`
            : ''}
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;
                    font-size:7pt;background:#f8fafc;border-radius:4px;
                    padding:6px;margin-bottom:8px;">
          <div>
            <div style="color:#666;">Contract Total</div>
            <strong>£${totalOrder.toLocaleString()}</strong>
          </div>
          <div>
            <div style="color:#666;">Total Paid</div>
            <strong>£${totalPaid.toLocaleString()}</strong>
          </div>
          <div>
            <div style="color:#666;">Outstanding</div>
            <strong style="color:${outstanding > 0 ? '#dc2626' : '#16a34a'};">
              ${outstanding > 0
                ? '£' + outstanding.toLocaleString()
                : '✅ CLEAR'}
            </strong>
          </div>
        </div>

        <div style="font-size:6pt;color:#999;text-align:center;">
          Scan QR code to verify this receipt online
        </div>
      </div>
    `;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt ${rcRef}</title>
  <style>
    @media print { .no-print { display:none!important; } body { margin:0; } }
    body { font-family:'Courier New',monospace; background:#fff; padding:20px; }
    .btn-print {
      padding:10px 20px; background:#3b82f6; color:#fff; border:none;
      border-radius:6px; cursor:pointer; font-weight:700; margin-bottom:16px;
    }
  </style>
</head>
<body>
  <button class="btn-print no-print" onclick="window.print()">🖨️ Print / Save PDF</button>
  <div style="display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start;">
    ${slip('CUSTOMER COPY')}
    <div style="color:#999;writing-mode:vertical-lr;display:flex;
                align-items:center;justify-content:center;
                padding:0 6px;font-size:8pt;align-self:stretch;">
      ✂ — — — — DETACH HERE — — — — ✂
    </div>
    ${slip('COMPANY COPY')}
  </div>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 600);
    }

    // Save receipt record to Firestore
    await db.collection('receipts').add({
	  ...payment,
	  receipt_ref  : rcRef,
	  payment_id   : paymentId,
	  contract_no  : contractNo,
	  order_id     : orderId,       // ✅ make sure this is saved
	  qr_ref       : rcRef,         // ✅ changed from contractNo to rcRef
	  verify_url   : `https://sabryabr.github.io/BrothersEGY-ERP/verify.html?ref=${encodeURIComponent(rcRef)}`,
	  receipt_type : 'single_payment',
	  _sys_created : firebase.firestore.FieldValue.serverTimestamp()
	}).catch(() => {});

  } catch (e) {
    console.error('Receipt generation error:', e);
    toast('Receipt error: ' + e.message, 'error');
  }
};

// ============================================================
// VIEW / REPRINT RECEIPT — does NOT create a new record
// ============================================================
window.viewOrReprintReceipt = async function(orderId, orderNo) {
  try {
    const snap = await db.collection('receipts')
      .where('order_id', '==', orderId)
      .get()
      .catch(() => null);

    if (snap && !snap.empty) {
      const docs = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      reprintFromRecord(docs[0]);
    } else {
      toast('No receipt found, generating new one...', 'info');
      generateOrderReceiptDirect(orderId);
    }
  } catch (e) {
    generateOrderReceiptDirect(orderId);
  }
};

window.reprintFromRecord = function(r) {
  const verifyUrl = r.verify_url ||
  buildVerifyUrl({ 'No.': r.contract_no || r.order_ref || r.qr_ref, id: r.order_id });

  const logo = 'https://brothersegy.com/wp-content/uploads/2026/02/12345.png';

  const slip = copyType => `
    <div style="font-family:'Courier New',monospace;width:80mm;padding:10px;
                border:1px solid #ccc;border-radius:4px;font-size:8pt;">
      <div style="display:flex;justify-content:space-between;align-items:center;
                  border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:8px;">
        <div>
          <img src="${logo}" style="height:36px;"
               onerror="this.style.display='none'"/>
          <div style="font-weight:800;font-size:10pt;">BROTHERS EGY</div>
          <div style="font-size:7pt;color:#666;">REPRINT — ${copyType}</div>
        </div>
        <div style="text-align:center;">
          <img src="https://api.qrserver.com/v1/create-qr-code/?data=${
            encodeURIComponent(verifyUrl)}&size=70x70"
               style="height:52px;">
          <div style="font-size:6pt;color:#999;">SCAN TO VERIFY</div>
        </div>
      </div>

      <div style="border-bottom:1px dashed #ccc;padding-bottom:6px;margin-bottom:6px;">
        <div>Ref: <strong>${r.receipt_ref || r.id}</strong></div>
        <div>Date: ${r.receipt_date || '—'}</div>
        <div>Contract: <strong>#${r.contract_no || r.qr_ref || '—'}</strong></div>
        <div>Branch: ${r.branch || '—'}</div>
      </div>

      <div style="border-bottom:1px dashed #ccc;padding-bottom:6px;margin-bottom:6px;">
        <div>Client: <strong>${r.client_name || '—'}</strong></div>
        <div>Car: ${r.car_label || '—'}</div>
      </div>

      <div style="background:#f8fafc;border-radius:4px;
                  padding:8px;margin-bottom:8px;text-align:center;">
        <div style="font-size:7pt;font-weight:700;color:#666;
                    text-transform:uppercase;">Amount Received</div>
        <div style="font-size:16pt;font-weight:900;">
          £${(r.total_egp_equiv || r.amount_egp || 0).toLocaleString()}
        </div>
        <div style="font-size:7pt;color:#555;">
          ${r.payment_details || r.payment_method || '—'}
        </div>
        ${r.category
          ? `<div style="font-size:7pt;color:#777;">Category: ${r.category}</div>`
          : ''}
        ${r.notes
          ? `<div style="font-size:7pt;font-style:italic;">Note: ${r.notes}</div>`
          : ''}
      </div>

      <div style="font-size:6pt;color:#999;text-align:center;">
        Scan QR code to verify this receipt online
      </div>
    </div>
  `;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt Reprint ${r.receipt_ref || r.id}</title>
  <style>
    @media print { .no-print { display:none!important; } body { margin:0; } }
    body { font-family:'Courier New',monospace; background:#fff; padding:20px; }
    .btn-print {
      padding:10px 20px; background:#3b82f6; color:#fff; border:none;
      border-radius:6px; cursor:pointer; font-weight:700; margin-bottom:16px;
    }
  </style>
</head>
<body>
  <button class="btn-print no-print" onclick="window.print()">🖨️ Print / Save PDF</button>
  <div style="display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start;">
    ${slip('CUSTOMER COPY')}
    <div style="color:#999;writing-mode:vertical-lr;display:flex;
                align-items:center;justify-content:center;
                padding:0 6px;font-size:8pt;align-self:stretch;">
      ✂ — — — — DETACH HERE — — — — ✂
    </div>
    ${slip('COMPANY COPY')}
  </div>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
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
        'حالة الطلب' : 'Closed',
        'closed'      : true,
        '_sys_updated': Date.now()
      };
      await db.collection('bookings').doc(orderId).update(upd);

      if (order?.['كود السيارة']) {
        await db.collection('fleet')
          .doc(String(order['كود السيارة']))
          .update({ status: 'available', _sys_updated: Date.now() })
          .catch(() => {});
      }

      const idx = allOrders.findIndex(o => o.id === orderId);
      if (idx > -1) allOrders[idx] = { ...allOrders[idx], ...upd };
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
        type        : 'cancellation',
        requested_by: G.user.username,
        branch      : G.user.branch,
        subject     : `Close Order #${order?.['No.'] || orderId}`,
        details     : `Request to close order for ${order?.['اسم العميل'] || 'client'}`,
        linked_ref  : orderId,
        status      : 'pending',
        created_at  : Date.now()
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
    <div style="display:grid;gap:12px;">
      <div>
        <label style="font-size:11px;font-weight:700;color:var(--text3);">
          New End Date / Time
        </label>
        <input type="datetime-local" id="extend-date"
          value="${currentEnd.replace(' ', 'T').slice(0, 16)}"
          style="width:100%;margin-top:4px;padding:8px;background:var(--surface2);
                 border:1px solid var(--border);border-radius:8px;color:var(--text);"/>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-primary" style="flex:1;"
          onclick="doExtendOrder('${orderId}')">✅ Extend</button>
        <button class="btn btn-ghost" style="flex:1;"
          onclick="closeModal()">Cancel</button>
      </div>
    </div>
  `;
  openModal('📅 Extend Order', html);
};

window.doExtendOrder = async function(orderId) {
  const newEnd = document.getElementById('extend-date')?.value;
  if (!newEnd) { toast('Select a date', 'error'); return; }

  try {
    // ✅ Write both fields to cover whichever getOrderDates() reads
    await db.collection('bookings').doc(orderId).update({
      col_T             : newEnd,
      'تاريخ الانتهاء' : newEnd,
      _sys_updated      : firebase.firestore.FieldValue.serverTimestamp()
    });

    const patch = { col_T: newEnd, 'تاريخ الانتهاء': newEnd };
    const idx   = allOrders.findIndex(b => b.id === orderId);
    if (idx >= 0)  Object.assign(allOrders[idx], patch);
    const idx2  = G.bookings.findIndex(b => b.id === orderId);
    if (idx2 >= 0) Object.assign(G.bookings[idx2], patch);

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
    <div style="display:grid;gap:12px;">
      <select id="car-switch-sel"
        style="width:100%;padding:8px;background:var(--surface2);
               border:1px solid var(--border);border-radius:8px;color:var(--text);">
        <option value="">-- Select replacement car --</option>
        ${cars.map(c => `
          <option value="${c.id}">
            ${getCarLabel(c, 'en')} | ${formatPlate(c) || c.plate || ''}
          </option>
        `).join('')}
      </select>
      <button class="btn btn-primary btn-full" onclick="
        const sel = document.getElementById('car-switch-sel');
        const car = G.fleet.find(c => c.id === sel.value);
        if (!car) { toast('Select a car', 'error'); return; }
        closeModal();
        setTimeout(() => doSwitchOrderCar(
          '${orderId}', car.id, getCarLabel(car,'en')
        ), 100);">
        🔄 Confirm Switch
      </button>
    </div>
  `;
  openModal('🔄 Select Replacement Car', html);
};

window.doSwitchOrderCar = async function(orderId, newCarId, newCarLabel) {
  const o = allOrders.find(b => b.id === orderId) ||
    G.bookings.find(b => b.id === orderId);
  if (!o) return;

  const oldCarId    = o['كود السيارة'] || '';
  const depositHeld = parseAmount(
    o.deposit_held || o['الوديعة المحتجزة'] || 0
  );

  const updates = {
    'كود السيارة'        : newCarId,
    car_label            : newCarLabel,
    car_switched_from    : oldCarId,
    car_switched_at      : new Date().toISOString(),
    deposit_transfer_note:
      `Deposit transferred from car ${oldCarId} to car ${newCarId}. ` +
      `Amount: ${fmtMoney(depositHeld)}`,
    _sys_updated: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    await db.collection('bookings').doc(orderId).update(updates);
    const idx = allOrders.findIndex(b => b.id === orderId);
    if (idx >= 0)  Object.assign(allOrders[idx], updates);
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
        .where('order_id', '==', orderId)
        .get().catch(() => ({ docs: [] })),
      db.collection('receipts')
        .where('contract_no', '==', String(orderNo))
        .get().catch(() => ({ docs: [] }))
    ]);

    const payments = plSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    const receipts = rcSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    const html = `
      <div style="margin-bottom:16px;">
        <div style="font-size:12px;font-weight:700;margin-bottom:8px;">
          Payment Log
        </div>
        ${payments.length ? `
          <table style="width:100%;border-collapse:collapse;font-size:11px;">
            <thead>
              <tr style="background:var(--surface2);color:var(--text3);
                         font-size:10px;font-weight:700;">
                <th style="padding:6px;text-align:left;">Date</th>
                <th style="padding:6px;text-align:right;">Amount</th>
                <th style="padding:6px;text-align:left;">Method</th>
                <th style="padding:6px;text-align:left;">Category</th>
                <th style="padding:6px;text-align:left;">By</th>
                <th style="padding:6px;text-align:left;">Note</th>
              </tr>
            </thead>
            <tbody>
              ${payments.map(p => `
                <tr style="border-bottom:1px solid var(--border);">
                  <td style="padding:6px;">
                    ${p.date || (p.timestamp
                      ? new Date(p.timestamp).toLocaleDateString('en-GB')
                      : '—')}
                  </td>
                  <td style="padding:6px;text-align:right;">
                    ${fmtMoney(p.amount || p.amount_egp || 0)}
                  </td>
                  <td style="padding:6px;">
                    ${p.method || p.payment_method || '—'}
                  </td>
                  <td style="padding:6px;">
                    ${p.category || '—'}
                  </td>
                  <td style="padding:6px;">
                    ${p.collected_by || '—'}
                  </td>
                  <td style="padding:6px;">
                    ${p.note || p.notes || '—'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : `
          <div style="color:var(--text3);font-size:12px;">
            No payment log entries found.
          </div>
        `}
      </div>

      <div>
        <div style="font-size:12px;font-weight:700;margin-bottom:8px;">Receipts</div>
        ${receipts.length ? `
          <table style="width:100%;border-collapse:collapse;font-size:11px;">
            <thead>
              <tr style="background:var(--surface2);color:var(--text3);
                         font-size:10px;font-weight:700;">
                <th style="padding:6px;text-align:left;">Ref</th>
                <th style="padding:6px;text-align:left;">Date</th>
                <th style="padding:6px;text-align:right;">Amount</th>
                <th style="padding:6px;text-align:left;">Type</th>
                <th style="padding:6px;"></th>
              </tr>
            </thead>
            <tbody>
              ${receipts.map(r => `
                <tr style="border-bottom:1px solid var(--border);">
                  <td style="padding:6px;">${r.receipt_ref || r.id}</td>
                  <td style="padding:6px;">${r.receipt_date || '—'}</td>
                  <td style="padding:6px;text-align:right;">
                    ${fmtMoney(r.total_egp_equiv || r.amount_egp || 0)}
                  </td>
                  <td style="padding:6px;">${r.type || r.receipt_type || '—'}</td>
                  <td style="padding:6px;">
                    <button class="btn btn-ghost btn-xs"
                      onclick="reprintFromRecord(${JSON.stringify(r).replace(/"/g, '&quot;')})">
                      🖨️
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : `
          <div style="color:var(--text3);font-size:12px;">
            No receipts found for this order.
          </div>
        `}
      </div>
    `;

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
    <div style="margin-bottom:12px;font-size:12px;color:var(--text2);">
      ${type === 'collect'
        ? 'Record deposit collected from customer.'
        : 'Record deposit returned to customer.'}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
      <div>
        <label style="font-size:11px;font-weight:700;color:var(--text3);">EGP (Cash)</label>
        <input type="number" id="dep-egp" value="0" min="0"
          style="width:100%;margin-top:4px;padding:8px;background:var(--surface2);
                 border:1px solid var(--border);border-radius:8px;color:var(--text);"
          oninput="calcDepTotal()"/>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:var(--text3);">USD (Cash)</label>
        <input type="number" id="dep-usd" value="0" min="0"
          style="width:100%;margin-top:4px;padding:8px;background:var(--surface2);
                 border:1px solid var(--border);border-radius:8px;color:var(--text);"
          oninput="calcDepTotal()"/>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:var(--text3);">EUR (Cash)</label>
        <input type="number" id="dep-eur" value="0" min="0"
          style="width:100%;margin-top:4px;padding:8px;background:var(--surface2);
                 border:1px solid var(--border);border-radius:8px;color:var(--text);"
          oninput="calcDepTotal()"/>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:var(--text3);">Card (EGP)</label>
        <input type="number" id="dep-card" value="0" min="0"
          style="width:100%;margin-top:4px;padding:8px;background:var(--surface2);
                 border:1px solid var(--border);border-radius:8px;color:var(--text);"
          oninput="calcDepTotal()"/>
      </div>
    </div>
    <div style="text-align:center;padding:10px;background:rgba(0,0,0,0.05);
                border-radius:8px;margin-bottom:12px;">
      <div style="font-size:10px;color:var(--text3);">Total (approx EGP)</div>
      <div id="dep-total-display"
        style="font-size:18px;font-weight:800;color:${color};">£0.00</div>
    </div>
    <div style="margin-bottom:12px;">
      <label style="font-size:11px;font-weight:700;color:var(--text3);">
        Notes (optional)
      </label>
      <input type="text" id="dep-notes"
        placeholder="e.g. Cheque #1234 / damaged deposit"
        style="width:100%;margin-top:4px;padding:8px;background:var(--surface2);
               border:1px solid var(--border);border-radius:8px;color:var(--text);"/>
    </div>
    <button onclick="saveDepositPayment('${orderId}','${type}')"
      style="width:100%;padding:11px;background:${color};color:#fff;border:none;
             border-radius:8px;font-weight:800;font-size:13px;cursor:pointer;">
      ${label}
    </button>
  `;
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
      [field]            : (parseFloat(cur[field] || 0)) + totalEGP,
      [`${field}_egp`]   : (parseFloat(cur[`${field}_egp`] || 0)) + egp,
      [`${field}_usd`]   : (parseFloat(cur[`${field}_usd`] || 0)) + usd,
      [`${field}_eur`]   : (parseFloat(cur[`${field}_eur`] || 0)) + eur,
      _sys_updated       : firebase.firestore.FieldValue.serverTimestamp()
    });

    await db.collection('payment_log').add({
      order_id    : orderId,
      type        : 'deposit_' + type,
      egp, usd, eur, card,
      totalEGP,
      notes,
      date        : dateStr,
      collected_by: G.user?.username || '',
      timestamp   : Date.now()
    });

    const dIdx = allOrders.findIndex(o => o.id === orderId);
    if (dIdx >= 0) {
      allOrders[dIdx][field] = (parseFloat(cur[field] || 0)) + totalEGP;
    }

    closeModal();
    toast(
      `✅ Deposit ${type === 'collect' ? 'collected' : 'returned'}: ${fmtMoney(totalEGP)}`,
      'success'
    );
  } catch (e) {
    toast('Failed: ' + e.message, 'error');
  }
};

// ============================================================
// REMINDER FORM
// ============================================================
window.openReminderForm = function(orderId) {
  const order = allOrders.find(o => o.id === orderId);
  const now   = getCairoNow();
  const pad   = n => String(n).padStart(2, '0');
  const defaultDt =
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `T${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const html = `
    <div style="display:grid;gap:10px;">
      <div>
        <label style="font-size:11px;font-weight:700;color:var(--text3);">
          Remind At *
        </label>
        <input type="datetime-local" id="rem-dt" value="${defaultDt}"
          style="width:100%;margin-top:4px;padding:8px;background:var(--surface2);
                 border:1px solid var(--border);border-radius:8px;color:var(--text);"/>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:var(--text3);">
          Category *
        </label>
        <select id="rem-cat"
          style="width:100%;margin-top:4px;padding:8px;background:var(--surface2);
                 border:1px solid var(--border);border-radius:8px;color:var(--text);">
          <option value="">-- Select --</option>
          <option value="Follow-up call">Follow-up call</option>
          <option value="Check car">Check car</option>
          <option value="Collect payment">Collect payment</option>
          <option value="Return deposit">Return deposit</option>
          <option value="Custom">Custom</option>
        </select>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:var(--text3);">Notes</label>
        <input type="text" id="rem-note" placeholder="Optional note..."
          style="width:100%;margin-top:4px;padding:8px;background:var(--surface2);
                 border:1px solid var(--border);border-radius:8px;color:var(--text);"/>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-primary" style="flex:1;"
          onclick="saveReminder('${orderId}')">🔔 Save Reminder</button>
        <button class="btn btn-ghost" style="flex:1;"
          onclick="closeModal()">Cancel</button>
      </div>
    </div>
  `;
  openModal(`Set Reminder — Order #${order?.['No.'] || orderId}`, html);
};

window.saveReminder = async function(orderId) {
  const dt   = document.getElementById('rem-dt')?.value;
  const cat  = document.getElementById('rem-cat')?.value;
  const note = document.getElementById('rem-note')?.value || '';

  if (!dt)  { toast('Please select a date and time', 'error'); return; }
  if (!cat) { toast('Please select a category', 'error'); return; }

  try {
    await db.collection('reminders').add({
      order_id  : orderId,
      remind_at : new Date(dt).getTime(),
      category  : cat,
      note,
      created_by: G.user?.username || '',
      dismissed : false,
      fired     : false,
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
window.bulkMode     = window.bulkMode     || false;
window.bulkSelected = window.bulkSelected || new Set();

window.toggleBulkMode = function() {
  window.bulkMode = !window.bulkMode;
  window.bulkSelected.clear();
  const btn     = document.getElementById('bulk-mode-btn');
  const toolbar = document.getElementById('bulk-toolbar');
  if (btn)     btn.style.background  = window.bulkMode ? 'var(--accent)' : '';
  if (toolbar) toolbar.style.display = window.bulkMode ? 'flex' : 'none';
  filterOrders();
};

window.toggleBulkSelect = function(orderId, cb) {
  if (cb.checked) window.bulkSelected.add(orderId);
  else window.bulkSelected.delete(orderId);
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
  if (!status) { toast('Select a status first', 'error'); return; }
  if (window.bulkSelected.size === 0) {
    toast('No orders selected', 'error'); return;
  }
  if (!confirm(
    `Update ${window.bulkSelected.size} orders to status: ${status}?`
  )) return;

  const isClosed = status === 'Closed';
  try {
    const ids   = [...window.bulkSelected];
    const CHUNK = 400;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const batch = db.batch();
      ids.slice(i, i + CHUNK).forEach(id => {
        batch.update(db.collection('bookings').doc(id), {
          'حالة الطلب' : status,
          closed       : isClosed,
          _sys_updated : firebase.firestore.FieldValue.serverTimestamp()
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
  if (window.bulkSelected.size === 0) {
    toast('No orders selected', 'error'); return;
  }
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
// CONTRACT GENERATION
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

    const carCode    = String(o['كود السيارة'] || o.col_D || '').trim();
    const car        = G.fleet.find(c => String(c.ID || c.id) === carCode) || {};
    const clientCode = String(o['كود العميل']  || o.col_B || '').trim();
    const customer   = G.customers.find(c =>
      String(c['No.'] || c.col_A || c.id) === clientCode
    ) || {};

    const firstName  = customer['الاسم الأول'] || customer.col_C || '';
    const lastName   = customer['الاسم الأخير'] || customer.col_D || '';
    const clientName = o['اسم العميل'] ||
      (firstName + ' ' + lastName).trim() || '';

    const { start, end } = getOrderDates(o);
    const days       = start && end
      ? Math.max(1, Math.ceil((end - start) / 86400000)) : 1;
    const daily      = parseAmount(o['سعر السيارة اليومي بالجنيه المصري'] || 0);
    const plate      = formatPlate(car) || car.plate || '';
    const carLabel   = car.car_label || getCarLabel(car, 'en') || carCode;
    const contractNo = o['No.'] || o.id;
    const branch     = o['فرع الإصدار'] || o.branch || 'HRG';

    const params = new URLSearchParams({
      orderId, contractNo, branch,
      rentalMode : days > 28 ? 'Monthly' : 'Daily',
      cl_fname   : firstName || clientName.split(' ')[0] || '',
      cl_sname   : lastName  || clientName.split(' ').slice(1).join(' ') || '',
      cl_pass    : customer['رقم جواز السفر']     || '',
      cl_nation  : customer['رمز الدولة']          || '',
      cl_phone   : customer['رقم التليفون']        || '',
      cl_email   : customer['البريد الإلكتروني']   || '',
      cl_lic     : customer['رقم رخصة القيادة']    || '',
      carCode,
      carModel   : carLabel,
      carPlate   : plate,
      carVin     : car.chassis || car['رقم الشاسية'] || car['رقم الشاسيه'] || '',
      carMotor   : car['رقم الموتور'] || '',
      pickup     : start ? start.toISOString().slice(0, 16) : '',
      dropoff    : end   ? end.toISOString().slice(0, 16)   : '',
      rateRent   : String(daily),
      contractNo, branch
    });

    const file = lang === 'ar' ? 'contract-ar.html' : 'contract-en.html';
    window.open(file + '?' + params.toString(), '_blank');
    toast('✅ Contract generated', 'success');
  } catch (e) {
    toast('Contract error: ' + e.message, 'error');
  }
};

// ============================================================
// FULL ORDER RECEIPT (from Receipt button — saves record)
// ============================================================
window.generateOrderReceiptDirect = async function(orderId) {
  try {
    let o = allOrders.find(x => x.id === orderId);
    if (!o) {
      const snap = await db.collection('bookings').doc(orderId).get();
      if (!snap.exists) { toast('Order not found', 'error'); return; }
      o = { id: snap.id, ...snap.data() };
    }

    const clientCode = String(o['كود العميل'] || '').trim();
    const customer   = G.customers.find(c =>
      String(c['No.'] || c.col_A || c.id) === clientCode
    ) || {};
    const carCode    = String(o['كود السيارة'] || '').trim();
    const car        = G.fleet.find(c =>
      String(c.ID || c.id) === carCode
    ) || {};

    const { start, end } = getOrderDates(o);
    const clientName = o['اسم العميل'] || '';
    const paid       = getOrderPaid(o);
    const total      = parseAmount(o['إجمالي المستحق (Total)'] || 0);
    const contractNo = o['No.'] || o.id;

    // ✅ Use fixed formatPlate
    const plate    = formatPlate(car) || '';
    const carLabel = (car.car_label || getCarLabel(car, 'en') || carCode).slice(0, 40);
    const branch   = o['فرع الإصدار'] || o.branch || 'HRG';
    const dateStr  = new Date().toISOString().slice(0, 10);

    const paidEGP  = parseAmount(o['المدفوع EGP'] || 0);
    const paidUSD  = parseAmount(o['المدفوع USD'] || 0);
    const paidEUR  = parseAmount(o['المدفوع EUR'] || 0);

    const parts = [];
    if (paidEGP > 0) parts.push(`${paidEGP.toLocaleString()} Cash (EGP)`);
    if (paidUSD > 0) parts.push(`${paidUSD} USD`);
    if (paidEUR > 0) parts.push(`${paidEUR} EUR`);
    const paymentStr = parts.join(' + ') || `${paid.toLocaleString()} EGP`;

    const branchCode = branch.toUpperCase().slice(0, 3);
    const now        = new Date();
    const rcRef      = `RC-${branchCode}-${
      String(now.getMonth() + 1).padStart(2, '0')}${
      String(now.getDate()).padStart(2, '0')}-${
      String(Date.now()).slice(-4)}`;

    const logo       = 'https://brothersegy.com/wp-content/uploads/2026/02/12345.png';
    const verifyUrl = buildVerifyUrl(o);

    const slip = copyType => `
      <div style="font-family:'Courier New',monospace;width:80mm;padding:10px;
                  border:1px solid #ccc;border-radius:4px;font-size:8pt;">
        <div style="display:flex;justify-content:space-between;align-items:center;
                    border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:8px;">
          <div>
            <img src="${logo}" style="height:36px;"
                 onerror="this.style.display='none'"/>
            <div style="font-weight:800;font-size:10pt;">BROTHERS EGY</div>
            <div style="font-size:7pt;color:#666;">${copyType}</div>
          </div>
          <div style="text-align:center;">
            <img src="https://api.qrserver.com/v1/create-qr-code/?data=${
              encodeURIComponent(verifyUrl)}&size=60x60"
                 style="height:50px;">
            <div style="font-size:6pt;">DATE: ${dateStr}</div>
          </div>
        </div>

        <div style="border-bottom:1px dashed #ccc;padding-bottom:6px;margin-bottom:6px;">
          <div>Ref: <strong>${rcRef}</strong></div>
          <div>Contract: <strong>#${contractNo}</strong></div>
          <div>Client: <strong>${clientName}</strong></div>
          <div>Car: ${carLabel}${plate ? ' | ' + plate : ''}</div>
          <div>
            Period: ${start ? start.toLocaleDateString('en-GB') : '—'}
            → ${end ? end.toLocaleDateString('en-GB') : '—'}
          </div>
        </div>

        <div style="padding:8px;border:1px solid #000;border-radius:4px;margin-bottom:6px;">
          <div style="font-size:7pt;font-weight:700;text-transform:uppercase;">
            Amount Received
          </div>
          <div style="font-size:16pt;font-weight:900;">£${paid.toLocaleString()}.00</div>
          <div style="font-size:7pt;">${paymentStr}</div>
        </div>

        ${(total - paid) > 0
          ? `<div style="color:#dc2626;font-weight:700;font-size:8pt;">
               ⚠ OUTSTANDING BALANCE: £${(total - paid).toLocaleString()}.00
             </div>`
          : `<div style="color:#16a34a;font-weight:700;font-size:8pt;">
               ✅ FULLY PAID
             </div>`}
      </div>
    `;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt ${rcRef}</title>
  <style>
    @media print { .no-print { display:none!important; } body { margin:0; } }
    body { font-family:'Courier New',monospace; background:#fff; padding:20px; }
    .btn-print {
      padding:10px 20px; background:#3b82f6; color:#fff; border:none;
      border-radius:6px; cursor:pointer; font-weight:700; margin-bottom:16px;
    }
  </style>
</head>
<body>
  <button class="btn-print no-print" onclick="window.print()">🖨️ Print / Save PDF</button>
  <div style="display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start;">
    ${slip('CUSTOMER COPY')}
    <div style="color:#999;writing-mode:vertical-lr;display:flex;
                align-items:center;justify-content:center;
                padding:0 6px;font-size:8pt;align-self:stretch;">
      - - - - - DETACH HERE - - - - -
    </div>
    ${slip('COMPANY COPY')}
  </div>
</body>
</html>`;

    await db.collection('receipts').add({
      order_id       : orderId,
      contract_no    : contractNo,
      receipt_ref    : rcRef,
      client_name    : clientName,
      car_label      : carLabel + (plate ? ' | ' + plate : ''),
      branch,
      branch_code    : branchCode,
      receipt_date   : dateStr,
      type           : 'Rental Payment',
      amount_egp     : paidEGP,
      amount_usd     : paidUSD,
      total_egp_equiv: paid,
      payment_details: paymentStr,
      collected_by   : G.user?.username || '',
      timestamp      : Date.now(),
      _sys_created   : firebase.firestore.FieldValue.serverTimestamp()
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
    toast('Max 10MB per photo', 'error'); return;
  }

  toast('Uploading...', 'info', 2000);
  try {
    const compressed = await compressImage(file, 800, 0.75);
    const filename   = `img_${Date.now()}.jpg`;
    const ref        = storage.ref(`orders/${orderId}/${type}/${filename}`);
    await ref.put(compressed);
    const url        = await ref.getDownloadURL();

    const order = allOrders.find(o => o.id === orderId) ||
      (await db.collection('bookings').doc(orderId).get()).data();
    const mediaField = type === 'pickup' ? 'pickup_media' : 'dropoff_media';
    const existing   = order?.[mediaField] || [];

    await db.collection('bookings').doc(orderId).update({
      [mediaField]   : [...existing, {
        url,
        timestamp    : Date.now(),
        uploaded_by  : G.user.username,
        type
      }],
      '_sys_updated' : Date.now()
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
    <img src="${url}"
      style="max-width:100%;max-height:70vh;border-radius:8px;object-fit:contain;"/>
  `);
};
