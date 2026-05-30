// ============================================================
// app.js v4.2
// Application entry point
// ============================================================

// ============================================================
// SESSION MANAGEMENT
// ============================================================
const SESSION_DURATION_MS  = 60 * 60 * 1000;  // 1 hour
const IDLE_TIMEOUT_MS      = 5  * 60 * 1000;  // 5 minutes idle = logout
const WARN_BEFORE_LOGOUT_MS= 60 * 1000;        // warn 60s before idle logout
const SESSION_EXTEND_MS    = 60 * 60 * 1000;   // extend by 1 hour

let _sessionStart    = Date.now();
let _lastActivity    = Date.now();
let _idleTimer       = null;
let _idleWarnTimer   = null;
let _sessionTimer    = null;
let _sessionCountdown= null;
let _sessionWarned   = false;

function _resetIdleTimer() {
  _lastActivity = Date.now();
  _sessionWarned = false;

  clearTimeout(_idleTimer);
  clearTimeout(_idleWarnTimer);

  // Warn 60s before idle logout
  _idleWarnTimer = setTimeout(() => {
    if (!_sessionWarned) {
      _sessionWarned = true;
      _showSessionWarning('idle');
    }
  }, IDLE_TIMEOUT_MS - WARN_BEFORE_LOGOUT_MS);

  // Auto logout after idle
  _idleTimer = setTimeout(() => {
    _doSessionLogout('idle');
  }, IDLE_TIMEOUT_MS);
}

function _startSessionTimer() {
  clearTimeout(_sessionTimer);
  const remaining = SESSION_DURATION_MS - (Date.now() - _sessionStart);
  if (remaining <= 0) { _doSessionLogout('expired'); return; }

  // Warn 60s before session expires
  const warnAt = remaining - WARN_BEFORE_LOGOUT_MS;
  if (warnAt > 0) {
    setTimeout(() => { _showSessionWarning('session'); }, warnAt);
  }

  _sessionTimer = setTimeout(() => {
    _doSessionLogout('expired');
  }, remaining);

  // Update session clock every second
  _updateSessionClock();
}

function _updateSessionClock() {
  const clockEl = document.getElementById('session-clock');
  if (!clockEl) return;

  const remaining = Math.max(0,
    SESSION_DURATION_MS - (Date.now() - _sessionStart)
  );
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  clockEl.textContent =
    `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
  clockEl.style.color = remaining < 5 * 60 * 1000
    ? 'var(--danger)' : 'var(--text3)';

  if (remaining > 0) {
    clearTimeout(_sessionCountdown);
    _sessionCountdown = setTimeout(_updateSessionClock, 1000);
  }
}

function _showSessionWarning(reason) {
  // Don't show if already showing
  if (document.getElementById('session-warn-modal')) return;

  const isIdle   = reason === 'idle';
  const title    = isIdle
    ? '⏱️ You\'ve been idle'
    : '🔐 Session expiring soon';
  const message  = isIdle
    ? 'You will be logged out in 60 seconds due to inactivity.'
    : 'Your session expires in 60 seconds.';

  const overlay = document.createElement('div');
  overlay.id = 'session-warn-modal';
  overlay.style.cssText =
    'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.7);' +
    'display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border2);
                border-radius:16px;padding:28px 32px;max-width:380px;
                width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
      <div style="font-size:40px;margin-bottom:12px;">${isIdle ? '😴' : '⏰'}</div>
      <div style="font-size:16px;font-weight:800;margin-bottom:8px;">
        ${title}
      </div>
      <div style="font-size:13px;color:var(--text3);margin-bottom:20px;">
        ${message}
      </div>
      <div id="session-warn-countdown"
        style="font-size:28px;font-weight:900;color:var(--danger);
               margin-bottom:20px;">60</div>
      <div style="display:flex;gap:10px;justify-content:center;">
        <button class="btn btn-primary"
          onclick="extendSession()"
          style="min-width:140px;">
          ✅ Stay Logged In
        </button>
        <button class="btn btn-ghost"
          onclick="_doSessionLogout('manual')"
          style="min-width:100px;">
          🚪 Log Out
        </button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  // Countdown
  let count = 60;
  const countEl = overlay.querySelector('#session-warn-countdown');
  const countInterval = setInterval(() => {
    count--;
    if (countEl) countEl.textContent = count;
    if (count <= 0) {
      clearInterval(countInterval);
      overlay.remove();
    }
  }, 1000);
  overlay._countInterval = countInterval;
}

window.extendSession = function() {
  const overlay = document.getElementById('session-warn-modal');
  if (overlay) {
    clearInterval(overlay._countInterval);
    overlay.remove();
  }
  // Reset session and idle timers
  _sessionStart  = Date.now();
  _sessionWarned = false;
  _resetIdleTimer();
  _startSessionTimer();
  toast('✅ Session extended for 1 hour', 'success', 3000);
};

function _doSessionLogout(reason) {
  const overlay = document.getElementById('session-warn-modal');
  if (overlay) {
    clearInterval(overlay._countInterval);
    overlay.remove();
  }
  clearTimeout(_idleTimer);
  clearTimeout(_idleWarnTimer);
  clearTimeout(_sessionTimer);
  clearTimeout(_sessionCountdown);

  const msg = reason === 'idle'
    ? 'You have been logged out due to inactivity.'
    : reason === 'expired'
    ? 'Your session has expired. Please log in again.'
    : 'You have been logged out.';

  // Show message then redirect to login
  const overlay2 = document.createElement('div');
  overlay2.style.cssText =
    'position:fixed;inset:0;z-index:99999;background:#0f172a;' +
    'display:flex;align-items:center;justify-content:center;' +
    'flex-direction:column;gap:16px;color:#e2e8f0;font-family:Segoe UI,Arial,sans-serif;';
  overlay2.innerHTML = `
    <div style="font-size:48px;">🔐</div>
    <div style="font-size:18px;font-weight:700;">Session Ended</div>
    <div style="font-size:13px;color:#94a3b8;">${msg}</div>
    <div class="spinner" style="border:2px solid #334155;border-top-color:#60a5fa;
      width:24px;height:24px;border-radius:50%;
      animation:spin 0.8s linear infinite;margin-top:8px;">
    </div>`;
  document.body.appendChild(overlay2);

  // Unsubscribe all listeners
  if (G.unsubscribers) {
    G.unsubscribers.forEach(fn => { try { fn(); } catch (_) {} });
    G.unsubscribers = [];
  }

  logAction('LOGOUT', 'Portal', `Session ended: ${reason}`).catch(() => {}).finally(() => {
    // Redirect to login after 1.5s
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  });
}

function _initSessionManagement() {
  // Track user activity
  const events = ['mousedown','keydown','touchstart','scroll','click'];
  events.forEach(ev => {
    document.addEventListener(ev, _resetIdleTimer, { passive:true });
  });

  _sessionStart = Date.now();
  _resetIdleTimer();
  _startSessionTimer();
}

// ============================================================
// PAGE ROUTING
// ============================================================
window.showPage = function(pageId, params) {
  params = params || {};
  if (G.currentPage && G.currentPage !== pageId && !G._navGoingBack) {
    const prev = G.currentPage, prevP = G.currentParams || {};
    NAV_HISTORY.push({
      description: 'Page: ' + prev,
      restoreFn  : function() { showPage(prev, prevP); },
      ts         : Date.now()
    });
    if (NAV_HISTORY.length > 30) NAV_HISTORY.shift();
  }
  G._navGoingBack = false;
  G.currentParams = params;

  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('page-' + pageId);
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navItem = document.querySelector('.nav-item[data-page="' + pageId + '"]');
  if (navItem) navItem.classList.add('active');

  G.currentPage = pageId;
  renderPage(pageId);
  logAction('VIEW', pageId, 'Opened: ' + pageId);

  if (G.pendingReturn && G.pendingReturn.destination === pageId) {
    showReturnBanner();
  } else {
    hideReturnBanner();
  }

  document.getElementById('sidebar')?.classList.remove('mobile-open');
  updateBackBtn();
};

window.renderPage = function(pageId) {
  const renders = {
    'dashboard'      : () => renderDashboard(),
    'fleet-radar'    : () => renderFleetRadar(),
    'order-book'     : () => renderOrderBook(),
    'vehicle-360'    : () => renderVehicle360(),
    'risk-radar'     : () => renderRiskRadar(),
    'proposals'      : () => renderProposals(),
    'en-contract'    : () => renderENContract(),
    'ar-contract'    : () => renderARContract(),
    'receipts'       : () => renderReceipts(),
    'income-expenses': () => renderIncomeExpenses(),
    'crm'            : () => renderCRM(),
    'tasks'          : () => renderTaskManager(),   // ✅ fixed name
    'approvals'      : () => renderApprovals(),
    'system-logs'    : () => renderSystemLogs(),
    'settings'       : () => renderSettings()
  };

  if (renders[pageId]) {
    try {
      renders[pageId]();
    } catch (e) {
      console.warn('renderPage error for ' + pageId + ':', e.message);
      const el = document.getElementById('page-' + pageId);
      if (el) el.innerHTML =
        '<div class="empty-state">' +
        '<div class="es-icon">⚠️</div>' +
        '<p>Failed to load ' + pageId + ': ' + e.message + '</p>' +
        '<button class="btn btn-ghost btn-sm" ' +
        'onclick="renderPage(\'' + pageId + '\')">🔄 Retry</button>' +
        '</div>';
    }
  }
};

window.renderPageLoading = function(pageId, icon, title) {
  const el = document.getElementById(pageId);
  if (!el) return;
  el.innerHTML =
    '<div class="section-header"><div><h2>' + icon + ' ' + title +
    '</h2></div></div>' +
    '<div style="display:flex;align-items:center;justify-content:center;' +
    'padding:60px;"><div class="spinner lg"></div></div>';
};

window.toggleSidebar = function() {
  const sb  = document.getElementById('sidebar');
  const btn = document.getElementById('sidebar-toggle');
  G.sidebarCollapsed = !G.sidebarCollapsed;
  sb?.classList.toggle('collapsed', G.sidebarCollapsed);
  if (btn) btn.textContent = G.sidebarCollapsed ? '▶' : '◀';
};

// ============================================================
// SHARED DATA LOADING
// ============================================================
window.loadSharedData = async function() {
  await Promise.all([
    loadFleetData(),
    loadCustomersData(),
    loadProposalsData(),
    loadBookingsData()
  ]);
  updateSidebarBadges();
  try { initRealtimeListeners(); } catch (e) {
    console.warn('Realtime listeners failed:', e.message);
  }
};

window.loadFleetData = async function() {
  try {
    const snap    = await db.collection('fleet').get();
    const allCars = snap.docs.map(d => {
      const data  = d.data();
      const docId = d.id;
      data.ID     = docId;

      if (!data.car_label) {
        const brand = String(data['col_C'] || data['Type']  || '').trim();
        const model = String(data['col_F'] || data['Model'] || data['col_E'] || '').trim();
        const year  = String(data['col_H'] || data['سنة الصنع'] || '').trim();
        const color = String(data.Color    || data['col_J'] || '').trim();
        const plate = data.plate || [
          data['col_W'], data['col_X'], data['col_Y'],
          data['col_Z'], data['col_AA'], data['col_AB'], data['col_AC']
        ].filter(p => p && String(p).trim() && String(p).trim() !== '0')
         .map(p => String(p).trim()).join(' ');
        if (brand || model) {
          data.car_label = (brand + ' ' + model + ' (' + year + ') ' +
            color + (plate ? ' | ' + plate : '')).trim();
        }
      }

      if (!data.car_label_ar) {
        const brandAR = String(data['col_B'] || data['النوع']  || '').trim();
        const modelAR = String(data['col_E'] || data['الطراز'] || '').trim();
        const year    = String(data['col_H'] || data['سنة الصنع'] || '').trim();
        const colorAR = String(data['col_I'] || data['اللون']  || '').trim();
        const plate   = data.plate || '';
        if (brandAR || modelAR) {
          data.car_label_ar = ((modelAR || brandAR) + ' (' + year + ') ' +
            colorAR + (plate ? ' | ' + plate : '')).trim();
        }
      }

      if (!data.plate || data.plate.length < 3) {
        const parts = [
          data['col_W'], data['col_X'], data['col_Y'],
          data['col_Z'], data['col_AA'], data['col_AB'], data['col_AC']
        ].filter(p => p && String(p).trim() && String(p).trim() !== '0')
         .map(p => String(p).trim());
        if (parts.length) data.plate = parts.join(' ');
      }

      return { id: docId, ...data };
    });

    G.fleet = allCars;
    console.log('[Fleet] Loaded', G.fleet.length, 'cars');
    console.log('[Fleet] Active:',
      G.fleet.filter(c => getCarStatusCategory(c) === 'rented').length,
      'rented |',
      G.fleet.filter(c => getCarStatusCategory(c) === 'available').length,
      'available'
    );

    populateFleetDropdowns();

    const active = document.querySelector('.page-section.active');
    if (active && active.id === 'page-dashboard' && typeof loadDashKPIs === 'function') {
      clearTimeout(window._dashKpiTimer);
      window._dashKpiTimer = setTimeout(() => {
        window._kpiLoading = false;
        loadDashKPIs();
      }, 400);
    }

  } catch (e) {
    console.warn('Fleet load failed:', e.message);
  }
};

window.loadBookingsData = async function() {
  try {
    // ✅ FIXED: use isPriv limit — 1000 was missing ~732 orders
    const isPriv = ['Admin', 'Executive'].includes(G.user?.role);
    const snap   = await db.collection('bookings').limit(isPriv ? 2000 : 600).get();
    G.bookings   = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // ✅ Guard: always initialise allOrders
    if (!window.allOrders) window.allOrders = [];
    window.allOrders = G.bookings;

    _buildActiveBookings();

    const active = document.querySelector('.page-section.active');
    if (active && active.id === 'page-dashboard' && typeof loadDashKPIs === 'function') {
      clearTimeout(window._dashKpiTimer);
      window._dashKpiTimer = setTimeout(() => {
        window._kpiLoading = false;
        loadDashKPIs();
      }, 600);
    }
  } catch (e) {
    console.warn('Bookings load failed:', e.message);
  }
};

window.loadCustomersData = async function() {
  try {
    const snap  = await db.collection('customers').limit(1000).get();
    G.customers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    G.customers.sort((a, b) =>
      (b._sys_updated || b._synced_at || 0) -
      (a._sys_updated || a._synced_at || 0)
    );
  } catch (e) {
    console.warn('Customers load failed:', e.message);
  }
};

window.loadProposalsData = async function() {
  try {
    const snap  = await db.collection('proposals')
      .orderBy('timestamp', 'desc').limit(100).get();
    G.proposals = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    _updateProposalsBadge();
  } catch (e) {
    console.warn('Proposals load failed:', e.message);
  }
};

function _buildActiveBookings() {
  const CUTOFF     = new Date('2026-01-01T00:00:00');
  G.activeBookings = G.bookings.filter(b => {
    if (b['الحالة'] === 'ملغي') return false;
    const dates       = getOrderDates(b);
    const compareDate = dates.end || dates.start;
    if (compareDate && compareDate < CUTOFF) return false;
    return true;
  });
}

// ============================================================
// SIDEBAR BADGES
// ============================================================
window.updateSidebarBadges = async function() {
  const isPriv     = ['Admin', 'Executive'].includes(G.user?.role);
  const cairoToday = getCairoNow();
  const todayStart = new Date(getCairoDateStr() + 'T00:00:00');
  const CUTOFF_2026= new Date('2026-01-01');

  try {
    if (!G.activeBookings) G.activeBookings = G.bookings || [];
    let orders = G.activeBookings;

    if (!isPriv) {
      orders = orders.filter(o =>
        o['فرع الإصدار'] === G.user.branch ||
        o.assigned_user  === G.user.username ||
        (!o['فرع الإصدار'] && !o.assigned_user)
      );
    }

    const activeCount = orders.filter(o => {
      if (o.closed === true || o.closed === 'true') return false;
      const st = getOrderStatus(o);
      if (st === 'Closed' || st === 'Cancelled') return false;
      const d = getOrderDates(o);
      if (!d.start || !d.end) return false;
      return d.start <= cairoToday && d.end >= todayStart;
    }).length;

    const overdueCount = orders.filter(o => {
      if (o.closed === true || o.closed === 'true') return false;
      const st = getOrderStatus(o);
      if (st === 'Closed' || st === 'Cancelled' || st === 'Settled') return false;
      const d = getOrderDates(o);
      if (!d.end || d.end < CUTOFF_2026 || d.end >= todayStart) return false;
      return getOrderPaid(o) <= 0;
    }).length;

    const ob    = document.getElementById('badge-orders');
    const total = activeCount + overdueCount;
    if (ob && total > 0) { ob.textContent = total; ob.classList.remove('hidden'); }

    // Risk badge
    let riskCount = 0;
    const today   = getCairoNow();
    G.fleet.forEach(car => {
      if (getCarStatusCategory(car) === 'archived') return;
      ['نهاية الترخيص','نهاية التأمين','نهاية التعاقد'].forEach(field => {
        const d = parseDBDate(car[field]);
        if (!d) return;
        if (Math.ceil((d - today) / 86400000) <= 7) riskCount++;
      });
    });
    const rb = document.getElementById('badge-risk');
    if (rb && riskCount > 0) { rb.textContent = riskCount; rb.classList.remove('hidden'); }

    // Tasks badge
    try {
      const taskSnap = await db.collection('tasks')
        .where('assigned_to', '==', G.user?.username || '')
        .where('status', 'in', ['pending','inprogress'])
        .get().catch(() => ({ size:0 }));
      const tb = document.getElementById('badge-tasks');
      if (tb && taskSnap.size > 0) {
        tb.textContent = taskSnap.size;
        tb.classList.remove('hidden');
      }
    } catch (_) {}

    // Approvals badge
    if (isPriv) {
      try {
        const apSnap = await db.collection('approvals')
          .where('status','==','pending').get().catch(() => ({ size:0 }));
        const ab = document.getElementById('badge-approvals');
        if (ab && apSnap.size > 0) {
          ab.textContent = apSnap.size;
          ab.classList.remove('hidden');
        }
      } catch (_) {}
    }

    _updateProposalsBadge();

  } catch (e) {
    console.warn('Badge update failed:', e.message);
  }
};

function _updateProposalsBadge() {
  const draftCount = G.proposals.filter(p => p.status === 'Draft').length;
  const pb         = document.getElementById('badge-proposals');
  if (!pb) return;
  if (draftCount > 0) {
    pb.textContent = draftCount;
    pb.classList.remove('hidden');
  } else {
    pb.classList.add('hidden');
  }
}

// ============================================================
// REALTIME LISTENERS
// ============================================================
window.initRealtimeListeners = function() {
  // ✅ Guard: ensure allOrders is initialised
  if (!window.allOrders) window.allOrders = G.bookings || [];

  let _lastBookingsHash = '';

  const _bookingUnsub = db.collection('bookings').onSnapshot(snap => {
    const newHash = snap.docChanges().map(c => c.doc.id + c.type).join(',');
    if (newHash && newHash === _lastBookingsHash) return;
    _lastBookingsHash = newHash;

    snap.docChanges().forEach(change => {
      const doc = { id: change.doc.id, ...change.doc.data() };
      if (change.type === 'added' || change.type === 'modified') {
        const idx = G.bookings.findIndex(b => b.id === doc.id);
        if (idx >= 0) G.bookings[idx] = doc; else G.bookings.push(doc);

        if (!window.allOrders) window.allOrders = [];
        const idx2 = window.allOrders.findIndex(b => b.id === doc.id);
        if (idx2 >= 0) window.allOrders[idx2] = doc;
        else if (idx === -1) window.allOrders.push(doc);
      }
      if (change.type === 'removed') {
        G.bookings     = G.bookings.filter(b => b.id !== doc.id);
        window.allOrders= (window.allOrders||[]).filter(b => b.id !== doc.id);
      }
    });

    _buildActiveBookings();
    _refreshActivePageAfterBookings();
  });
  G.unsubscribers.push(_bookingUnsub);

  const _fleetUnsub = db.collection('fleet').onSnapshot(snap => {
    snap.docChanges().forEach(change => {
      const rawData = change.doc.data();
      const docId   = change.doc.id;
      rawData.ID    = docId;

      if (!rawData.car_label) {
        const brand = String(rawData['col_C'] || rawData['Type']  || '').trim();
        const model = String(rawData['col_F'] || rawData['Model'] || rawData['col_E'] || '').trim();
        const year  = String(rawData['col_H'] || rawData['سنة الصنع'] || '').trim();
        const color = String(rawData.Color    || rawData['col_J'] || '').trim();
        const plate = rawData.plate || '';
        if (brand || model) {
          rawData.car_label = (brand + ' ' + model + ' (' + year + ') ' +
            color + (plate ? ' | ' + plate : '')).trim();
        }
      }

      const doc = { id: docId, ...rawData };
      if (change.type === 'added' || change.type === 'modified') {
        const idx = G.fleet.findIndex(c => c.id === doc.id);
        if (idx >= 0) G.fleet[idx] = doc; else G.fleet.push(doc);
      }
      if (change.type === 'removed') {
        G.fleet = G.fleet.filter(c => c.id !== doc.id);
      }
    });

    clearTimeout(window._fleetRefreshTimer);
    window._fleetRefreshTimer = setTimeout(_refreshActivePageAfterFleet, 1500);
  });
  G.unsubscribers.push(_fleetUnsub);

  const _proposalUnsub = db.collection('proposals').onSnapshot(snap => {
    if (!G.proposals) G.proposals = [];
    snap.docChanges().forEach(change => {
      const doc = { id: change.doc.id, ...change.doc.data() };
      if (change.type === 'added' || change.type === 'modified') {
        const idx = G.proposals.findIndex(p => p.id === doc.id);
        if (idx >= 0) G.proposals[idx] = doc; else G.proposals.push(doc);
      }
      if (change.type === 'removed') {
        G.proposals = G.proposals.filter(p => p.id !== doc.id);
      }
    });
    _updateProposalsBadge();
    const active = document.querySelector('.page-section.active');
    if (active && active.id === 'page-proposals' &&
        typeof renderProposalsList === 'function') renderProposalsList();
  });
  G.unsubscribers.push(_proposalUnsub);

  const _customerUnsub = db.collection('customers').onSnapshot(snap => {
    snap.docChanges().forEach(change => {
      const doc = { id: change.doc.id, ...change.doc.data() };
      if (change.type === 'added' || change.type === 'modified') {
        const idx = G.customers.findIndex(c => c.id === doc.id);
        if (idx >= 0) G.customers[idx] = doc; else G.customers.push(doc);
      }
      if (change.type === 'removed') {
        G.customers = G.customers.filter(c => c.id !== doc.id);
      }
    });
    const active = document.querySelector('.page-section.active');
    if (active && active.id === 'page-crm' && typeof filterCRM === 'function') {
      clearTimeout(window._crmRefreshTimer);
      window._crmRefreshTimer = setTimeout(filterCRM, 1000);
    }
  });
  G.unsubscribers.push(_customerUnsub);

  const _taskUnsub = db.collection('tasks').onSnapshot(snap => {
    let myPending = 0;
    snap.docs.forEach(d => {
      const t = d.data();
      if (t.assigned_to === G.user?.username &&
          (t.status === 'pending' || t.status === 'inprogress')) myPending++;
    });
    const tb = document.getElementById('badge-tasks');
    if (tb) {
      if (myPending > 0) {
        tb.textContent = myPending; tb.classList.remove('hidden');
      } else {
        tb.classList.add('hidden');
      }
    }

    // ✅ Also update _allTasks for task due notifications
    window._allTasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const active = document.querySelector('.page-section.active');
    if (active && active.id === 'page-tasks' && typeof renderTaskList === 'function') {
      clearTimeout(window._taskRefreshTimer);
      window._taskRefreshTimer = setTimeout(renderTaskList, 1500);
    }
  });
  G.unsubscribers.push(_taskUnsub);

  const _approvalUnsub = db.collection('approvals')
    .where('status', '==', 'pending')
    .onSnapshot(snap => {
      const count = snap.size;
      const ab    = document.getElementById('badge-approvals');
      if (ab) {
        if (count > 0) { ab.textContent = count; ab.classList.remove('hidden'); }
        else ab.classList.add('hidden');
      }
      const active = document.querySelector('.page-section.active');
      if (active && active.id === 'page-approvals' &&
          typeof loadApprovalsList === 'function') {
        clearTimeout(window._approvalRefreshTimer);
        window._approvalRefreshTimer = setTimeout(() => loadApprovalsList('pending'), 1500);
      }
    });
  G.unsubscribers.push(_approvalUnsub);

  // ✅ Task due date notifications (every 5 minutes)
  window._taskDueChecker = setInterval(() => {
    const now   = getCairoNow();
    const tasks = window._allTasks || [];
    tasks.forEach(t => {
      if (t.status === 'done' || t.status === 'cancelled') return;
      if (t.assigned_to !== G.user?.username) return;
      const due = t.due_date ? new Date(t.due_date) : null;
      if (!due) return;
      const minsLeft = Math.ceil((due - now) / 60000);
      // Notify 30 minutes before
      if (minsLeft > 0 && minsLeft <= 30) {
        if (!window._notifiedTasks) window._notifiedTasks = new Set();
        if (!window._notifiedTasks.has(t.id)) {
          window._notifiedTasks.add(t.id);
          toast(
            `⏰ Task due in ${minsLeft}min: "${t.title || t.type}"`,
            'warning', 8000
          );
        }
      }
      // Notify when overdue
      if (minsLeft <= 0 && minsLeft > -5) {
        if (!window._overdueNotifiedTasks) window._overdueNotifiedTasks = new Set();
        if (!window._overdueNotifiedTasks.has(t.id)) {
          window._overdueNotifiedTasks.add(t.id);
          toast(
            `⚠️ Task OVERDUE: "${t.title || t.type}" — £${t.penalty_amount||0} penalty`,
            'error', 10000
          );
        }
      }
    });
  }, 5 * 60 * 1000);
  G.unsubscribers.push(() => clearInterval(window._taskDueChecker));
};

function _refreshActivePageAfterBookings() {
  const active = document.querySelector('.page-section.active');
  if (!active) return;
  const pid = active.id;

  if (pid === 'page-order-book' && typeof filterOrders === 'function') {
    clearTimeout(window._snapshotRefreshTimer);
    window._snapshotRefreshTimer = setTimeout(filterOrders, 1000);
  }
  if (pid === 'page-fleet-radar' && typeof renderGantt === 'function') {
    clearTimeout(window._ganttRefreshTimer);
    window._ganttRefreshTimer = setTimeout(renderGantt, 1000);
  }
  if (pid === 'page-dashboard' && typeof loadDashKPIs === 'function') {
    clearTimeout(window._dashRefreshTimer);
    window._dashRefreshTimer = setTimeout(() => {
      window._kpiLoading = false;
      loadDashKPIs();
    }, 2000);
  }
  if (pid === 'page-vehicle-360' && typeof loadVehicle360Details === 'function') {
    clearTimeout(window._v360RefreshTimer);
    window._v360RefreshTimer = setTimeout(loadVehicle360Details, 1000);
  }
  if (pid === 'page-risk-radar' && typeof loadRiskRadar === 'function') {
    clearTimeout(window._riskRefreshTimer);
    window._riskRefreshTimer = setTimeout(loadRiskRadar, 1000);
  }
}

function _refreshActivePageAfterFleet() {
  const active = document.querySelector('.page-section.active');
  if (!active) return;
  const pid = active.id;

  if (pid === 'page-fleet-radar'  && typeof renderFleetRadar     === 'function') renderFleetRadar();
  if (pid === 'page-vehicle-360'  && typeof loadVehicle360Details === 'function') loadVehicle360Details();
  if (pid === 'page-risk-radar'   && typeof loadRiskRadar         === 'function') loadRiskRadar();
  if (pid === 'page-dashboard'    && typeof loadDashKPIs           === 'function') {
    clearTimeout(window._dashKpiTimer);
    window._dashKpiTimer = setTimeout(() => {
      window._kpiLoading = false;
      loadDashKPIs();
    }, 500);
  }
}

// ============================================================
// FLEET DROPDOWNS
// ============================================================
window.populateFleetDropdowns = function() {
  initFleetFilterState();

  const nonArchived = G.fleet.filter(c => getCarStatusCategory(c) !== 'archived');
  const opts        = nonArchived.map(car => {
    const cat      = getCarStatusCategory(car);
    const dot      = cat === 'available'   ? '🟢'
                   : cat === 'rented'      ? '🔵'
                   : cat === 'accident'    ? '🔴'
                   : cat === 'maintenance' ? '🟡' : '⚪';
    const info     = getCarInfo(car);
    const richLabel= dot + ' ' + info.label +
      (info.branchCode ? ' (' + info.branchCode + ')' : '');
    return '<option value="' + car.id + '">' + richLabel + '</option>';
  }).join('');

  const first = '<option value="">-- Select Car --</option>';
  ['pr-car','en-car','ar-car'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = first + opts;
  });

  const availCount = G.fleet.filter(c => getCarStatusCategory(c) === 'available').length;
  const badge      = document.getElementById('badge-fleet');
  if (badge) {
    badge.textContent = availCount;
    badge.classList.toggle('hidden', availCount === 0);
  }
};

window.initFleetFilterState = function() {
  const saved = localStorage.getItem('fleet_filter_' + G.user?.username);
  if (saved) {
    try {
      const p = JSON.parse(saved);
      Object.assign(FLEET_FILTER.status,   p.status   || {});
      Object.assign(FLEET_FILTER.branches, p.branches || {});
    } catch (_) {}
  }
  if (!['Admin', 'Executive'].includes(G.user?.role)) {
    Object.keys(FLEET_FILTER.branches).forEach(b => {
      FLEET_FILTER.branches[b] = (b === G.user?.branch);
    });
  }
};

window.saveFleetFilterState = function() {
  localStorage.setItem(
    'fleet_filter_' + G.user?.username,
    JSON.stringify({
      status  : FLEET_FILTER.status,
      branches: FLEET_FILTER.branches
    })
  );
};

// ============================================================
// GLOBAL ERROR HANDLERS
// ============================================================
window.addEventListener('unhandledrejection', e => {
  const msg = e.reason?.message || String(e.reason) || 'Unknown error';
  if (msg.includes('requires an index') || msg.includes('aborted') ||
      msg.includes('cancelled')         || msg.includes('failed-precondition')) return;
  console.warn('[ERP Unhandled]', msg);
});

window.addEventListener('error', e => {
  if (e.filename && !e.filename.includes(window.location.hostname)) return;
  console.warn('[ERP Error]', e.message, 'line:', e.lineno);
});

// ============================================================
// MOBILE SIDEBAR
// ============================================================
function _initMobileSidebar() {
  if (window.innerWidth > 768) return;
  const topbar = document.getElementById('topbar');
  if (!topbar || document.getElementById('mobile-menu-btn')) return;

  const btn     = document.createElement('button');
  btn.id        = 'mobile-menu-btn';
  btn.innerHTML = '☰';
  btn.style.cssText =
    'width:32px;height:32px;border-radius:8px;background:var(--glass);' +
    'border:1px solid var(--border);color:var(--text2);font-size:18px;' +
    'cursor:pointer;display:flex;align-items:center;justify-content:center;' +
    'flex-shrink:0;';
  btn.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('mobile-open');
  });

  const brand = topbar.querySelector('.topbar-brand');
  if (brand) brand.after(btn); else topbar.prepend(btn);
}

// ============================================================
// DOM READY
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('sidebar-toggle')?.addEventListener('click', toggleSidebar);

  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      if (page) showPage(page);
    });
  });

  _initMobileSidebar();
  window.addEventListener('resize', _initMobileSidebar, { passive:true });

  if (!document.getElementById('global-pulse-style')) {
    const s    = document.createElement('style');
    s.id       = 'global-pulse-style';
    s.textContent =
      '@keyframes dashPulse{0%,100%{opacity:1;}50%{opacity:0.25;}}' +
      '@keyframes spin{to{transform:rotate(360deg);}}';
    document.head.appendChild(s);
  }

  // ✅ Start session management after user is confirmed logged in
  // Call _initSessionManagement() from your auth module after login success
  // e.g. in auth.js after G.user is set: _initSessionManagement();
  window._initSessionManagement = _initSessionManagement;

  console.log(
    '%cBrothers EGY ERP v3.0 — Modular build loaded ✅',
    'color:#22c55e;font-weight:bold;font-size:14px;'
  );
});
