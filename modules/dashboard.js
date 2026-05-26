// ============================================================
// modules/dashboard.js
// Dashboard — KPIs, fleet chart with all 7 status categories,
// activity feed, today stats, expiries, recent orders
// Egypt timezone throughout
// ============================================================

window.renderDashboard = function() {
  renderPageLoading('page-dashboard', '📊', 'Dashboard');
  loadDashboard();
};

window.loadDashboard = async function() {
  const el = document.getElementById('page-dashboard');
  if (!el) return;

  if (!G.fleet.length || !G.bookings.length) await loadSharedData();

  if (!document.getElementById('dash-pulse-style')) {
    const s = document.createElement('style');
    s.id = 'dash-pulse-style';
    s.textContent = '@keyframes dashPulse{0%,100%{opacity:1;}50%{opacity:0.3;}}';
    document.head.appendChild(s);
  }

  const cairoDateStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'Africa/Cairo'
  });

  el.innerHTML = `
    <div class="section-header">
      <div>
        <h2>📊 Dashboard</h2>
        <p>Welcome back, <strong>${G.user?.username}</strong> — ${cairoDateStr}</p>
      </div>
      <div style="display:flex;gap:7px;flex-wrap:wrap;align-items:center;">
        <select id="dash-period" onchange="onDashPeriodChange()"
          style="padding:5px 11px;background:var(--surface2);border:1px solid var(--border2);
            border-radius:8px;color:var(--text);font-size:11px;font-weight:700;">
          ${buildPeriodOptions()}
        </select>
        <button class="btn btn-ghost btn-sm" onclick="loadDashboard()">🔄 Refresh</button>
        <span class="pill pill-${(G.user?.role||'user').toLowerCase()}">${G.user?.role}</span>
        <span class="pill pill-active">${BRANCH_MAP[G.user?.branch]||G.user?.branch||'All Branches'}</span>
      </div>
    </div>

    <!-- KPI Row -->
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:11px;margin-bottom:18px;">
      <div class="kpi-card" id="kpi-active-card" style="cursor:pointer;">
        <div class="kpi-label">Active Orders</div>
        <div class="kpi-value text-accent" id="kpi-active">--</div>
        <div class="kpi-sub">Currently running</div>
        <div class="kpi-icon">📋</div>
      </div>
      <div class="kpi-card" id="kpi-overdue-card" style="cursor:pointer;">
        <div class="kpi-label">Overdue Orders</div>
        <div class="kpi-value text-danger" id="kpi-overdue">--</div>
        <div class="kpi-sub">Past end date</div>
        <div class="kpi-icon">⚠️</div>
      </div>
      <div class="kpi-card" id="kpi-avail-card" style="cursor:pointer;">
        <div class="kpi-label">Available Cars</div>
        <div class="kpi-value text-success" id="kpi-avail">--</div>
        <div class="kpi-sub">Ready to rent</div>
        <div class="kpi-icon">🚗</div>
      </div>
      <div class="kpi-card" id="kpi-revenue-card" style="cursor:pointer;">
        <div class="kpi-label" id="kpi-revenue-label">Monthly Revenue</div>
        <div class="kpi-value text-success" id="kpi-revenue">--</div>
        <div class="kpi-sub" id="kpi-revenue-sub">This month</div>
        <div class="kpi-icon">💰</div>
      </div>
      <div class="kpi-card" id="kpi-tasks-card" style="cursor:pointer;">
        <div class="kpi-label">My Pending Tasks</div>
        <div class="kpi-value text-warning" id="kpi-tasks">--</div>
        <div class="kpi-sub">Assigned to me</div>
        <div class="kpi-icon">✅</div>
      </div>
      <div class="kpi-card" id="kpi-proposals-card" style="cursor:pointer;">
        <div class="kpi-label">Open Proposals</div>
        <div class="kpi-value" style="color:var(--purple)" id="kpi-proposals">--</div>
        <div class="kpi-sub">Draft status</div>
        <div class="kpi-icon">📋</div>
      </div>
    </div>

    <!-- Today Quick Stats -->
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin-bottom:18px;">
      <div class="panel" style="padding:10px 14px;">
        <div style="font-size:10px;font-weight:800;color:var(--text3);text-transform:uppercase;margin-bottom:6px;">📤 Today's Pickups</div>
        <div id="dash-today-pickups" style="font-size:22px;font-weight:700;color:var(--accent);">--</div>
      </div>
      <div class="panel" style="padding:10px 14px;">
        <div style="font-size:10px;font-weight:800;color:var(--text3);text-transform:uppercase;margin-bottom:6px;">📥 Today's Dropoffs</div>
        <div id="dash-today-dropoffs" style="font-size:22px;font-weight:700;color:var(--success);">--</div>
      </div>
      <div class="panel" style="padding:10px 14px;">
        <div style="font-size:10px;font-weight:800;color:var(--text3);text-transform:uppercase;margin-bottom:6px;">💰 Collected Today</div>
        <div id="dash-today-collected" style="font-size:22px;font-weight:700;color:var(--warning);">--</div>
      </div>
      <div class="panel" style="padding:10px 14px;">
        <div style="font-size:10px;font-weight:800;color:var(--text3);text-transform:uppercase;margin-bottom:6px;">🔒 Deposit Liability</div>
        <div id="dash-deposit-liability" style="font-size:22px;font-weight:700;color:var(--danger);">--</div>
      </div>
    </div>

    <!-- Row 2: Activity Feed + Fleet Chart -->
    <div style="display:grid;grid-template-columns:1fr 420px;gap:14px;margin-bottom:18px;">

      <!-- Activity Feed -->
      <div class="panel">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:13px;">
          <h3 style="font-size:13px;font-weight:800;display:flex;align-items:center;gap:6px;">
            <span style="width:7px;height:7px;border-radius:50%;background:var(--success);
              display:inline-block;animation:dashPulse 2s infinite;"></span>
            Live Activity Feed
          </h3>
          <select id="dash-log-filter" onchange="renderActivityFeed()"
            style="padding:4px 8px;background:var(--surface2);border:1px solid var(--border);
              border-radius:6px;color:var(--text);font-size:11px;">
            <option value="all">All Actions</option>
            <option value="LOGIN">Login</option>
            <option value="GENERATE">Generate</option>
            <option value="EDIT">Edit</option>
            <option value="ADD">Add</option>
            <option value="PRINT">Print</option>
          </select>
        </div>
        <div id="activity-feed" style="max-height:340px;overflow-y:auto;">
          <div class="empty-state"><div class="spinner"></div></div>
        </div>
      </div>

      <!-- Fleet Chart -->
      <div class="panel">
        <h3 style="font-size:13px;font-weight:800;margin-bottom:11px;">🚗 Fleet Status</h3>
        <div style="position:relative;height:190px;margin-bottom:11px;" id="fleet-chart-container">
          <canvas id="fleet-chart" style="display:block;"></canvas>
        </div>
        <div id="fleet-chart-legend" style="display:grid;grid-template-columns:1fr 1fr;gap:4px;"></div>

        <!-- Finance Summary -->
        <div style="margin-top:12px;border-top:1px solid var(--border);padding-top:11px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:7px;">
            <div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;">Finance Summary</div>
            <span id="dash-finance-period-label" style="font-size:9px;color:var(--accent);font-weight:700;"></span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;">
            <div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);border-radius:8px;padding:8px;">
              <div style="font-size:9px;color:var(--text3);">Income</div>
              <div id="dash-income" style="font-size:13px;font-weight:800;color:var(--success);">--</div>
            </div>
            <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:8px;padding:8px;">
              <div style="font-size:9px;color:var(--text3);">Expenses</div>
              <div id="dash-expenses" style="font-size:13px;font-weight:800;color:var(--danger);">--</div>
            </div>
          </div>
          <div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px;margin-top:7px;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:10px;color:var(--text3);">Net Balance</span>
            <span id="dash-net" style="font-size:14px;font-weight:900;">--</span>
          </div>
        </div>
      </div>

    </div>

    <!-- Row 3: Tasks + Approvals + Recent Orders -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:18px;">
      <div class="panel">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:11px;">
          <h3 style="font-size:13px;font-weight:800;">✅ My Tasks</h3>
          <button class="btn btn-ghost btn-xs" onclick="showPage('tasks')">View All</button>
        </div>
        <div id="dash-tasks" style="max-height:230px;overflow-y:auto;"></div>
      </div>
      <div class="panel">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:11px;">
          <h3 style="font-size:13px;font-weight:800;">🔔 Approvals</h3>
          <button class="btn btn-ghost btn-xs" onclick="showPage('approvals')">View All</button>
        </div>
        <div id="dash-approvals" style="max-height:230px;overflow-y:auto;"></div>
      </div>
      <div class="panel">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:11px;">
          <h3 style="font-size:13px;font-weight:800;">📋 Recent Orders</h3>
          <button class="btn btn-ghost btn-xs" onclick="showPage('order-book')">View All</button>
        </div>
        <div id="dash-orders" style="max-height:230px;overflow-y:auto;"></div>
      </div>
    </div>

    <!-- Row 4: Expiries -->
    <div class="panel" style="margin-bottom:18px;">
      <h3 style="font-size:13px;font-weight:800;margin-bottom:11px;">📅 Upcoming Expiries (Next 30 Days)</h3>
      <div id="dash-expiries" class="table-wrap">
        <div class="empty-state"><div class="spinner"></div></div>
      </div>
    </div>`;

  // Wire KPI card clicks
  document.getElementById('kpi-active-card')?.addEventListener('click',   function(){ showPage('order-book'); setTimeout(function(){ setOrderFilter('Active'); }, 300); });
  document.getElementById('kpi-overdue-card')?.addEventListener('click',  function(){ showPage('order-book'); setTimeout(function(){ setOrderFilter('overdue'); }, 300); });
  document.getElementById('kpi-avail-card')?.addEventListener('click',    function(){ showPage('fleet-radar'); });
  document.getElementById('kpi-revenue-card')?.addEventListener('click',  function(){ showPage('income-expenses'); });
  document.getElementById('kpi-tasks-card')?.addEventListener('click',    function(){ showPage('tasks'); });
  document.getElementById('kpi-proposals-card')?.addEventListener('click',function(){ showPage('proposals'); });

  await Promise.allSettled([
    loadDashKPIs(),
    loadDashTodayStats(),
    loadActivityFeed(),
    loadDashFinance(),
    loadDashTasks(),
    loadDashApprovals(),
    loadDashRecentOrders(),
    loadDashExpiries()
  ]);

  setTimeout(function(){ loadDashFleetChart(); }, 300);
};

// ============================================================
// PERIOD SELECTOR
// ============================================================

window.buildPeriodOptions = function() {
  const now  = new Date();
  const opts = ['<option value="all">📅 All Time</option>'];
  for (let i = 0; i < 18; i++) {
    const d     = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val   = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
    const label = d.toLocaleString('en-GB', { month: 'long', year: 'numeric' });
    opts.push('<option value="'+val+'"'+(i===0?' selected':'')+'>'+label+'</option>');
  }
  return opts.join('');
};

window.getPeriodFilter = function() {
  const val = document.getElementById('dash-period')?.value || 'all';
  if (val === 'all') return { month: null, year: null, label: 'All Time' };
  const parts = val.split('-');
  const d = new Date(parseInt(parts[0]), parseInt(parts[1])-1, 1);
  return { month: String(parseInt(parts[1])), year: String(parts[0]),
    label: d.toLocaleString('en-GB', { month: 'long', year: 'numeric' }) };
};

window.onDashPeriodChange = function() {
  const period = getPeriodFilter();
  const rl = document.getElementById('kpi-revenue-label');
  if (rl) rl.textContent = period.label === 'All Time' ? 'Total Revenue' : 'Revenue — '+period.label;
  const fl = document.getElementById('dash-finance-period-label');
  if (fl) fl.textContent = period.label;
  loadDashKPIs();
  loadDashFinance();
};

// ============================================================
// KPIS — Cairo timezone, correct active/overdue definition
// ============================================================

window.loadDashKPIs = async function() {
  if (window._kpiLoading) return;
  window._kpiLoading = true;
  try {
    const isPriv     = ['Admin','Executive'].includes(G.user?.role);
    const period     = getPeriodFilter();
    const cairoToday = getCairoNow();
    const todayStart = new Date(getCairoDateStr());
    const CUTOFF     = new Date('2026-01-01');

    if (!G.activeBookings) G.activeBookings = G.bookings || [];
    let bookings = G.activeBookings;
    if (!isPriv) bookings = bookings.filter(function(o){
      return o['فرع الإصدار'] === G.user.branch || o.assigned_user === G.user.username ||
             (!o['فرع الإصدار'] && !o.assigned_user);
    });

    // Active: today between start and end
    const active = bookings.filter(function(o) {
      if (o.closed===true||o.closed==='true') return false;
      const st = getOrderStatus(o);
      if (st==='Closed'||st==='Cancelled') return false;
      const d = getOrderDates(o);
      if (!d.start||!d.end) return false;
      return d.start <= cairoToday && d.end >= todayStart;
    }).length;
    _setKPI('kpi-active', active);

    // Overdue: end past, not closed, 2026+ only
    const overdue = G.bookings.filter(function(o) {
      if (o.closed===true||o.closed==='true') return false;
      const st = getOrderStatus(o);
      if (st==='Closed'||st==='Cancelled') return false;
      const d = getOrderDates(o);
      if (!d.end||d.end<CUTOFF) return false;
      return d.end < todayStart;
    }).length;
    _setKPI('kpi-overdue', overdue);

    // Available cars
    _setKPI('kpi-avail', G.fleet.filter(function(c){ return getCarStatusCategory(c)==='available'; }).length);

    // Tasks
    try {
      if (window._cachedTaskCount===undefined || Date.now()-window._taskCacheTime>60000) {
        const snap = await db.collection('tasks').where('assigned_to','==',G.user.username)
          .where('status','in',['pending','inprogress']).get();
        window._cachedTaskCount = snap.size;
        window._taskCacheTime   = Date.now();
      }
      _setKPI('kpi-tasks', window._cachedTaskCount);
    } catch(e) { _setKPI('kpi-tasks', 0); }

    // Proposals
    _setKPI('kpi-proposals', G.proposals.filter(function(p){ return p.status==='Draft'; }).length);

    // Revenue
    await _loadDashRevenue(period, isPriv);

    const subEl = document.getElementById('kpi-revenue-sub');
    const lblEl = document.getElementById('kpi-revenue-label');
    if (subEl) subEl.textContent = period.label==='All Time' ? 'All time' : period.label;
    if (lblEl) lblEl.textContent = period.label==='All Time' ? 'Total Revenue' : 'Income Collected';

  } catch(e) { console.warn('KPI error:', e.message); }
  finally { window._kpiLoading = false; }
};

async function _loadDashRevenue(period, isPriv) {
  try {
    if (!window._colCache || Date.now()-window._colCacheTime>120000) {
      window._colCache     = await db.collection('collections').get();
      window._colCacheTime = Date.now();
    }
    let revenue = 0;
    window._colCache.docs.forEach(function(d) {
      const data = d.data();
      if (!isPriv) {
        const b = data['موقع الفرع']||data.Branch||'';
        if (!b.toLowerCase().includes((BRANCH_MAP[G.user.branch]||'').toLowerCase()) &&
            !b.includes(BRANCH_AR[G.user.branch]||'')) return;
      }
      if (period.month === null) { revenue += parseAmount(data['قيمة التحصيل']); return; }
      const recMonth = String(data['شهر']||data.col_G||'').replace(/^0+/,'');
      const recYear  = String(data['سنة']||data.col_H||'');
      if (recMonth && recYear && recMonth===period.month && recYear===period.year) {
        revenue += parseAmount(data['قيمة التحصيل']); return;
      }
      const dateRaw = data['تاريخ التحصيل']||data['Date']||data.col_A||'';
      if (dateRaw) {
        const parsed = parseDBDate(dateRaw);
        if (parsed && !isNaN(parsed)) {
          if (String(parsed.getMonth()+1)===period.month && String(parsed.getFullYear())===period.year)
            revenue += parseAmount(data['قيمة التحصيل']);
        }
      }
    });
    _setKPI('kpi-revenue', fmtMoney(revenue));
  } catch(e) { _setKPI('kpi-revenue', fmtMoney(0)); }
}

// ============================================================
// TODAY STATS — Cairo timezone
// ============================================================

window.loadDashTodayStats = async function() {
  try {
    const cairoDateStr = getCairoDateStr();
    const todayStart   = new Date(cairoDateStr);
    const todayEnd     = new Date(todayStart.getTime() + 86400000);
    const cairoToday   = getCairoNow();
    const orders       = G.bookings || [];

    const pickups = orders.filter(function(o) {
      const d = getOrderDates(o);
      return d.start && d.start >= todayStart && d.start < todayEnd && !o.closed;
    }).length;

    const dropoffs = orders.filter(function(o) {
      const d = getOrderDates(o);
      return d.end && d.end >= todayStart && d.end < todayEnd;
    }).length;

    const depositLiability = orders.reduce(function(sum, o) {
      return sum + (parseAmount(o.deposit_held||0) - parseAmount(o.deposit_returned||0));
    }, 0);

    let collected = 0;
    try {
      const paySnap = await db.collection('payment_log').where('date','==',cairoDateStr).get();
      paySnap.forEach(function(d) {
        const data = d.data();
        collected += parseAmount(data.total_egp || data.egp || 0);
      });
    } catch(e) {}

    _setEl('dash-today-pickups',    pickups);
    _setEl('dash-today-dropoffs',   dropoffs);
    _setEl('dash-today-collected',  fmtMoney(collected));
    _setEl('dash-deposit-liability',fmtMoney(depositLiability));

  } catch(e) { console.warn('Today stats error:', e.message); }
};

// ============================================================
// FLEET CHART — 7 status categories with correct counts
// ============================================================

window.loadDashFleetChart = async function() {
  try {
    const canvas = document.getElementById('fleet-chart');
    if (!canvas) return;

    // Count all 7 status categories correctly
    let cAvail=0, cRented=0, cOverdue=0, cFuture=0, cAccident=0, cMaint=0, cArchived=0;
    G.fleet.forEach(function(car) {
      const cat = getCarStatusCategory(car);
      if      (cat==='available')   cAvail++;
      else if (cat==='rented')      cRented++;
      else if (cat==='overdue')     cOverdue++;
      else if (cat==='future')      cFuture++;
      else if (cat==='accident')    cAccident++;
      else if (cat==='maintenance') cMaint++;
      else if (cat==='archived')    cArchived++;
    });

    const container = document.getElementById('fleet-chart-container');
    if (container) {
      canvas.style.width  = '100%';
      canvas.style.height = '190px';
      canvas.width  = container.offsetWidth || 320;
      canvas.height = 190;
    }

    if (dashCharts.fleet) { dashCharts.fleet.destroy(); dashCharts.fleet = null; }

    // Only show non-zero categories in chart
    const chartItems = [
      { label: 'Available',    value: cAvail,    color: 'rgba(34,197,94,0.85)',   hex: '#22c55e' },
      { label: 'Rented',       value: cRented,   color: 'rgba(59,130,246,0.85)',  hex: '#3b82f6' },
      { label: 'Overdue',      value: cOverdue,  color: 'rgba(239,68,68,0.85)',   hex: '#ef4444' },
      { label: 'Future',       value: cFuture,   color: 'rgba(168,85,247,0.85)',  hex: '#a855f7' },
      { label: 'Accident',     value: cAccident, color: 'rgba(249,115,22,0.85)',  hex: '#f97316' },
      { label: 'Maintenance',  value: cMaint,    color: 'rgba(245,158,11,0.85)',  hex: '#f59e0b' }
    ].filter(function(item){ return item.value > 0; });

    const total = chartItems.reduce(function(s,i){ return s+i.value; }, 0);

    dashCharts.fleet = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: chartItems.map(function(i){ return i.label; }),
        datasets: [{
          data:            chartItems.map(function(i){ return i.value; }),
          backgroundColor: chartItems.map(function(i){ return i.color; }),
          borderColor:     'rgba(13,19,33,0.8)',
          borderWidth: 2, hoverOffset: 8
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '65%',
        animation: { duration: 800, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: {
            label: function(ctx) {
              return ctx.label+': '+ctx.parsed+' car'+(ctx.parsed!==1?'s':'')+
                ' ('+( total ? Math.round(ctx.parsed/total*100) : 0 )+'%)';
            }
          }}
        }
      }
    });

    // Rich legend with all categories
    const legendEl = document.getElementById('fleet-chart-legend');
    if (legendEl) {
      legendEl.innerHTML = chartItems.map(function(item) {
        return `<div style="display:flex;align-items:center;gap:5px;font-size:10px;">
          <div style="width:9px;height:9px;border-radius:3px;background:${item.hex};flex-shrink:0;"></div>
          <span style="color:var(--text2);">${item.label}</span>
          <span style="font-weight:700;margin-left:auto;">${item.value}</span>
        </div>`;
      }).join('');

      // Archived and totals row
      let extras = '';
      if (cOverdue > 0) {
        extras += `<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--danger);">
          <span>⚠️ Needs follow-up</span><span style="font-weight:700;">${cOverdue} overdue</span>
        </div>`;
      }
      if (cFuture > 0) {
        extras += `<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--purple);">
          <span>📅 Reserved</span><span style="font-weight:700;">${cFuture} upcoming</span>
        </div>`;
      }
      if (cArchived > 0) {
        extras += `<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text3);">
          <span>📦 Finished contracts</span><span style="font-weight:700;">${cArchived}</span>
        </div>`;
      }
      if (extras) {
        legendEl.innerHTML += `<div style="grid-column:1/-1;margin-top:6px;padding-top:6px;
          border-top:1px solid var(--border);">${extras}</div>`;
      }
    }

  } catch(e) { console.warn('Fleet chart error:', e.message); }
};

// ============================================================
// ACTIVITY FEED
// ============================================================

window.loadActivityFeed = function() {
  try {
    const unsub = db.collection('logs').orderBy('timestamp','desc').limit(60)
      .onSnapshot(function(snap) {
        window.allLogs = snap.docs.map(function(d){ return d.data(); });
        renderActivityFeed();
      });
    G.unsubscribers.push(unsub);
  } catch(e) {
    const f = document.getElementById('activity-feed');
    if (f) f.innerHTML = '<div class="empty-state"><p>Could not load logs</p></div>';
  }
};

window.renderActivityFeed = function() {
  const filter = document.getElementById('dash-log-filter')?.value || 'all';
  const feed   = document.getElementById('activity-feed');
  if (!feed) return;

  let logs = filter==='all' ? window.allLogs : window.allLogs.filter(function(l){ return l.action===filter; });
  if (!logs || !logs.length) {
    feed.innerHTML = '<div class="empty-state" style="padding:24px;"><p>No activity found</p></div>';
    return;
  }

  const AC = {
    LOGIN:    { bg:'rgba(34,197,94,0.1)',    color:'var(--success)',  icon:'🔐' },
    LOGOUT:   { bg:'rgba(100,116,139,0.1)',  color:'var(--text3)',    icon:'🚪' },
    GENERATE: { bg:'rgba(59,130,246,0.1)',   color:'var(--accent)',   icon:'📄' },
    EDIT:     { bg:'rgba(245,158,11,0.1)',   color:'var(--warning)',  icon:'✏️' },
    ADD:      { bg:'rgba(168,85,247,0.1)',   color:'var(--purple)',   icon:'➕' },
    PRINT:    { bg:'rgba(14,165,233,0.1)',   color:'var(--accent3)',  icon:'🖨️' },
    VIEW:     { bg:'rgba(100,116,139,0.04)', color:'var(--text3)',    icon:'👁'  },
    DELETE:   { bg:'rgba(239,68,68,0.1)',    color:'var(--danger)',   icon:'🗑️' }
  };

  feed.innerHTML = logs.slice(0,30).map(function(l) {
    const ac = AC[l.action] || AC.VIEW;
    return `<div style="display:flex;align-items:flex-start;gap:9px;padding:7px;border-radius:8px;
      margin-bottom:4px;background:${ac.bg};border:1px solid transparent;transition:all 0.2s;"
      onmouseover="this.style.borderColor='var(--border2)'" onmouseout="this.style.borderColor='transparent'">
      <div style="width:26px;height:26px;border-radius:7px;flex-shrink:0;
        background:linear-gradient(135deg,var(--accent),var(--accent2));
        display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#fff;">
        ${initials(l.user||'?').toUpperCase()}
      </div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;">
          <span style="font-size:11px;font-weight:700;">${l.user||'-'}</span>
          <span style="padding:1px 6px;border-radius:99px;font-size:9px;font-weight:800;
            background:${ac.bg};color:${ac.color};">${ac.icon} ${l.action}</span>
          <span style="font-size:10px;color:var(--text3);">${l.module||''}</span>
        </div>
        <div style="font-size:10px;color:var(--text2);margin-top:2px;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${l.details||''}</div>
      </div>
      <div style="font-size:9px;color:var(--text3);white-space:nowrap;flex-shrink:0;">
        ${getTimeAgo(l.timestamp)}
      </div>
    </div>`;
  }).join('');
};

// ============================================================
// FINANCE SUMMARY
// ============================================================

window.loadDashFinance = async function() {
  const isPriv = ['Admin','Executive'].includes(G.user?.role);
  const period = getPeriodFilter();
  const fl = document.getElementById('dash-finance-period-label');
  if (fl) fl.textContent = period.label;

  try {
    let income=0, expenses=0;
    const [cSnap,ceSnap,geSnap] = await Promise.all([
      db.collection('collections').get(),
      db.collection('car_expenses').get(),
      db.collection('gen_expenses').get()
    ]);

    function matchesPeriod(data) {
      if (period.month===null) return true;
      const m = String(data['شهر']||'').replace(/^0+/,'');
      const y = String(data['سنة']||data['paid_year']||'');
      return m===period.month && y===period.year;
    }

    cSnap.docs.forEach(function(d) {
      const data=d.data();
      if (!isPriv) { const b=data['موقع الفرع']||data.Branch||''; if (!b.toLowerCase().includes((BRANCH_MAP[G.user.branch]||'').toLowerCase())) return; }
      if (matchesPeriod(data)) income += parseAmount(data['قيمة التحصيل']);
    });
    ceSnap.docs.forEach(function(d) {
      const data=d.data();
      if (!isPriv) { const b=data['موقع الفرع']||''; if (!b.includes(BRANCH_AR[G.user.branch]||G.user.branch)) return; }
      if (matchesPeriod(data)) expenses += parseAmount(data['قيمة المصروف']);
    });
    geSnap.docs.forEach(function(d) {
      const data=d.data();
      if (!isPriv) { const b=data.Branch||data['موقع الفرع']||''; if (!b.toLowerCase().includes((BRANCH_MAP[G.user.branch]||'').toLowerCase())) return; }
      if (matchesPeriod(data)) expenses += parseAmount(data['قيمة المصروف']);
    });

    const net = income - expenses;
    _setEl('dash-income',   fmtMoney(income));
    _setEl('dash-expenses', fmtMoney(expenses));
    const netEl = document.getElementById('dash-net');
    if (netEl) { netEl.textContent=fmtMoney(net); netEl.style.color=net>=0?'var(--success)':'var(--danger)'; }

  } catch(e) { console.warn('Finance error:', e.message); }
};

// ============================================================
// DASHBOARD TASKS WIDGET
// ============================================================

window.loadDashTasks = async function() {
  const el = document.getElementById('dash-tasks');
  if (!el) return;
  try {
    const snap = await db.collection('tasks')
      .where('assigned_to','==',G.user.username)
      .where('status','in',['pending','inprogress']).limit(10).get();

    if (snap.empty) {
      el.innerHTML = '<div class="empty-state" style="padding:18px;"><div style="font-size:22px;">✅</div><p>No pending tasks</p></div>';
      return;
    }

    const pColors = { urgent:'var(--danger)', high:'var(--orange)', medium:'var(--warning)', low:'var(--success)' };
    const today = getCairoNow();
    const tasks = snap.docs.map(function(d){ return { id: d.id, ...d.data() }; })
      .sort(function(a,b){ return (a.due_date||0)-(b.due_date||0); });

    el.innerHTML = tasks.map(function(t) {
      const due = t.due_date ? new Date(t.due_date) : null;
      const isOD= due && today > due;
      return `<div style="padding:7px;border-radius:8px;margin-bottom:5px;
        background:var(--surface2);border:1px solid var(--border);cursor:pointer;transition:all 0.2s;"
        onclick="showPage('tasks')"
        onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
        <div style="display:flex;align-items:center;gap:5px;margin-bottom:3px;">
          <span style="width:7px;height:7px;border-radius:50%;flex-shrink:0;background:${pColors[t.priority]||'var(--text3)'};"></span>
          <span style="font-size:11px;font-weight:700;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t.title||'Task'}</span>
          <span class="pill pill-${t.status}">${t.status}</span>
        </div>
        <div style="font-size:10px;color:${isOD?'var(--danger)':'var(--text3)'};">
          ${due?(isOD?'⚠️ Overdue: ':'Due: ')+fmtDate(due):'No due date'}
        </div>
      </div>`;
    }).join('');

  } catch(e) { el.innerHTML = '<div class="empty-state" style="padding:18px;"><p>No tasks yet</p></div>'; }
};

// ============================================================
// DASHBOARD APPROVALS WIDGET
// ============================================================

window.loadDashApprovals = async function() {
  const el     = document.getElementById('dash-approvals');
  if (!el) return;
  const isPriv = ['Admin','Executive'].includes(G.user?.role);
  try {
    let snap;
    if (isPriv) snap = await db.collection('approvals').where('status','==','pending').limit(10).get();
    else        snap = await db.collection('approvals').where('requested_by','==',G.user.username).limit(10).get();

    if (snap.empty) {
      el.innerHTML = `<div class="empty-state" style="padding:18px;"><div style="font-size:22px;">🔔</div><p>${isPriv?'No pending approvals':'No approval requests'}</p></div>`;
      return;
    }

    const icons = { rate_change:'💲', cancellation:'❌', task_appeal:'📝', expense:'💰', blacklist:'🚫', deposit_waiver:'🔓' };
    const items = snap.docs.map(function(d){ return { id: d.id, ...d.data() }; })
      .sort(function(a,b){ return (b.created_at||0)-(a.created_at||0); });

    el.innerHTML = items.map(function(a) {
      return `<div style="padding:7px;border-radius:8px;margin-bottom:5px;
        background:var(--surface2);border:1px solid var(--border);cursor:pointer;transition:all 0.2s;"
        onclick="showPage('approvals')"
        onmouseover="this.style.borderColor='var(--warning)'" onmouseout="this.style.borderColor='var(--border)'">
        <div style="display:flex;align-items:center;gap:5px;margin-bottom:3px;">
          <span style="font-size:13px;">${icons[a.type]||'🔔'}</span>
          <span style="font-size:11px;font-weight:700;flex:1;">${(a.type||'').replace(/_/g,' ').toUpperCase()}</span>
          <span class="pill pill-${a.status}">${a.status}</span>
        </div>
        <div style="font-size:10px;color:var(--text2);">${a.requested_by||'-'} • ${a.subject||a.details||''}</div>
        <div style="font-size:9px;color:var(--text3);margin-top:2px;">${a.created_at?getTimeAgo(a.created_at):''}</div>
      </div>`;
    }).join('');

  } catch(e) { el.innerHTML = '<div class="empty-state" style="padding:18px;"><p>No approvals yet</p></div>'; }
};

// ============================================================
// RECENT ORDERS WIDGET
// Enhanced: shows payment status badge + order status badge
// ============================================================

window.loadDashRecentOrders = async function() {
  const el     = document.getElementById('dash-orders');
  if (!el) return;
  const isPriv = ['Admin','Executive'].includes(G.user?.role);

  try {
    let orders = [...(G.bookings||[])];
    if (!isPriv) orders = orders.filter(function(o){
      return o['فرع الإصدار']===G.user.branch || o.assigned_user===G.user.username ||
             (!o['فرع الإصدار'] && !o.assigned_user);
    });

    orders.sort(function(a,b){
      return (b._sys_updated||b._synced_at||0)-(a._sys_updated||a._synced_at||0);
    });
    orders = orders.slice(0,5);

    if (!orders.length) {
      el.innerHTML = '<div class="empty-state" style="padding:18px;"><div style="font-size:24px;">📋</div><p>No recent orders</p></div>';
      return;
    }

    const today      = getCairoNow();
    const todayStart = new Date(getCairoDateStr());

    // Payment status colors and labels
    const payColors = {
      paid:    { color:'var(--success)',  icon:'✅', label:'Paid' },
      partial: { color:'var(--accent)',   icon:'💙', label:'Partial' },
      deposit: { color:'var(--warning)',  icon:'⚡', label:'Deposit' },
      unpaid:  { color:'var(--danger)',   icon:'⚠️', label:'Unpaid' },
      unknown: { color:'var(--text3)',    icon:'❓', label:'Unknown' }
    };

    el.innerHTML = orders.map(function(o) {
      const { start, end } = getOrderDates(o);
      const total    = getOrderTotal(o);
      const paid     = getOrderPaid(o);
      const daily    = parseAmount(o['سعر السيارة اليومي بالجنيه المصري']) || (total/Math.max(1,parseFloat(o.rental_days||1)));
      const statusRaw= getOrderStatus(o);
      const isClosed = statusRaw==='Closed' || o.closed===true || o.closed==='true';
      const isOverdue= !isClosed && end && today>end && !o.closed && (statusRaw==='Active'||statusRaw==='Overdue');
      const isAccident= statusRaw==='Accident';
      let lateDays=0, latePenalty=0;
      if ((isOverdue||isAccident) && end && !o.closed) { lateDays=Math.max(0,Math.ceil((today-end)/86400000)); latePenalty=lateDays*daily; }
      const totalDue = total + latePenalty;
      const debt     = isClosed ? 0 : Math.max(0, totalDue-paid);
      const pct      = totalDue>0 ? Math.min(100,Math.round(paid/totalDue*100)) : 100;
      const statusKey= isAccident?'accident':isOverdue?'overdue':isClosed?'closed':(statusRaw||'active').toLowerCase();

      // Payment status badge
      const payStatus = getOrderPaymentStatus(o);
      const pc = payColors[payStatus] || payColors.unknown;

      const carCode    = getOrderCarCode(o);
      const carInFleet = G.fleet.find(function(c){ return String(c.ID||c.id)===String(carCode); });
      const carLabel   = carInFleet ? (carInFleet.car_label||getCarLabel(carInFleet,'en')) : (o['اسم السيارة']||'-');

      return `<div style="padding:7px;border-radius:8px;margin-bottom:5px;
        background:var(--surface2);border:1px solid var(--border);cursor:pointer;transition:all 0.2s;"
        onclick="openOrderDetail('${o.id}')"
        onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
        <div style="display:flex;align-items:center;gap:5px;margin-bottom:3px;">
          <span style="font-size:10px;color:var(--accent);font-weight:700;">#${getOrderNo(o)||o.id}</span>
          <span style="font-size:11px;font-weight:600;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${getOrderClientName(o)||'-'}
          </span>
          <span class="pill pill-${statusKey}" style="font-size:9px;">
            ${isOverdue?'OVERDUE':isAccident?'ACCIDENT':isClosed?'Closed':(statusRaw||'Active')}
          </span>
          <span style="font-size:9px;padding:1px 5px;border-radius:4px;
            background:${pc.color}22;color:${pc.color};font-weight:700;border:1px solid ${pc.color}44;">
            ${pc.icon} ${pc.label}
          </span>
        </div>
        <div style="font-size:10px;color:var(--text2);margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          ${carLabel}
        </div>
        <div style="background:var(--surface3);border-radius:99px;height:3px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;border-radius:99px;
            background:${pct>=100?'var(--success)':pct>50?'var(--accent)':'var(--warning)'};
            transition:width 0.5s;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text3);margin-top:3px;">
          <span>Paid: ${fmtMoney(paid)}</span>
          <span style="color:${debt>0?'var(--danger)':'var(--success)'};">
            ${debt>0?'Debt: '+fmtMoney(debt):'✅ Clear'}
          </span>
        </div>
      </div>`;
    }).join('');

  } catch(e) { el.innerHTML = '<div class="empty-state" style="padding:18px;"><p>Could not load</p></div>'; console.warn('Recent orders error:',e.message); }
};

// ============================================================
// EXPIRIES PANEL
// ============================================================

window.loadDashExpiries = async function() {
  const el = document.getElementById('dash-expiries');
  if (!el) return;
  try {
    const today = getCairoNow();
    const risks = [];

    G.fleet.forEach(function(car) {
      if (getCarStatusCategory(car)==='archived') return;
      const info = getCarInfo(car);
      [
        { field:'نهاية الترخيص', label:'License',  icon:'📋' },
        { field:'نهاية التأمين', label:'Insurance', icon:'🛡' },
        { field:'نهاية التعاقد', label:'Contract',  icon:'📄' }
      ].forEach(function(item) {
        const d = parseDBDate(car[item.field]);
        if (!d) return;
        const daysLeft = Math.ceil((d-today)/86400000);
        if (daysLeft < -7 || daysLeft > 30) return;
        risks.push({
          car, label: item.label, icon: item.icon, date: d, daysLeft,
          carLabel: info.label || car.car_label || car.id,
          plate:    info.plate,
          color:    info.colorEN || info.colorAR,
          branch:   info.branchName,
          carId:    info.id
        });
      });
    });

    // Deduplicate
    const seen = new Set(), deduped = [];
    risks.sort(function(a,b){ return a.daysLeft-b.daysLeft; });
    risks.forEach(function(r) {
      const key = (r.car.ID||r.car.id)+'_'+r.label;
      if (!seen.has(key)) { seen.add(key); deduped.push(r); }
    });

    if (!deduped.length) {
      el.innerHTML = '<div style="text-align:center;padding:18px;color:var(--success);">✅ No expiries in the next 30 days</div>';
      return;
    }

    el.innerHTML = `
      <table class="data-table">
        <thead><tr>
          <th>Car</th><th>Plate</th><th>Color</th><th>Branch</th>
          <th>Type</th><th>Expires</th><th>Days Left</th><th>Risk</th>
        </tr></thead>
        <tbody>
          ${deduped.map(function(r) {
            const risk  = r.daysLeft<=0?'high':r.daysLeft<=7?'high':r.daysLeft<=14?'medium':'low';
            const color = risk==='high'?'var(--danger)':risk==='medium'?'var(--warning)':'var(--success)';
            return `<tr>
              <td style="font-size:11px;cursor:pointer;color:var(--accent);"
                onclick="openCarDetailModal('${r.carId}')">${r.carLabel.split('|')[0].trim()}</td>
              <td style="font-size:11px;">${r.plate||'—'}</td>
              <td style="font-size:11px;">${r.color||'—'}</td>
              <td style="font-size:11px;">${r.branch||'—'}</td>
              <td>${r.icon} ${r.label}</td>
              <td>${fmtDateShort(r.date)}</td>
              <td><strong style="color:${color};">
                ${r.daysLeft<=0?'EXPIRED '+Math.abs(r.daysLeft)+'d ago':r.daysLeft+' days'}
              </strong></td>
              <td><span class="pill pill-${risk}">${risk.toUpperCase()}</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;

  } catch(e) { console.warn('Expiries error:', e.message); }
};

// ============================================================
// INTERNAL HELPERS
// ============================================================

function _setKPI(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function _setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
