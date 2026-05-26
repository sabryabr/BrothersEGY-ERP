// ============================================================
// app.js
// Application entry point — wires all modules together
// Handles navigation, shared data loading, realtime listeners,
// sidebar, and global render coordination
// ============================================================

// ============================================================
// NAVIGATION
// ============================================================

window.showPage = function(pageId, params = {}) {
  if (
    G.currentPage &&
    G.currentPage !== pageId &&
    !G._navGoingBack
  ) {
    const prevPage   = G.currentPage;
    const prevParams = G.currentParams || {};
    NAV_HISTORY.push({
      description: 'Page: ' + prevPage,
      restoreFn:   () => showPage(prevPage, prevParams),
      ts:          Date.now()
    });
    if (NAV_HISTORY.length > 30) NAV_HISTORY.shift();
  }

  G._navGoingBack = false;
  G.currentParams = params;

  document.querySelectorAll('.page-section')
    .forEach(s => s.classList.remove('active'));

  const target = document.getElementById('page-' + pageId);
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav-item')
    .forEach(n => n.classList.remove('active'));
  const navItem = document.querySelector(
    `.nav-item[data-page="${pageId}"]`
  );
  if (navItem) navItem.classList.add('active');

  G.currentPage = pageId;
  renderPage(pageId);
  logAction('VIEW', pageId, `Opened: ${pageId}`);

  if (G.pendingReturn?.destination === pageId) {
    showReturnBanner();
  } else {
    hideReturnBanner();
  }

  document.getElementById('sidebar')?.classList.remove('mobile-open');
  updateBackBtn();
};

window.renderPage = function(pageId) {
  const renders = {
    'dashboard':       () => renderDashboard(),
    'fleet-radar':     () => renderFleetRadar(),
    'order-book':      () => renderOrderBook(),
    'vehicle-360':     () => renderVehicle360(),
    'risk-radar':      () => renderRiskRadar(),
    'proposals':       () => renderProposals(),
    'en-contract':     () => renderENContract(),
    'ar-contract':     () => renderARContract(),
    'receipts':        () => renderReceipts(),
    'income-expenses': () => renderIncomeExpenses(),
    'crm':             () => renderCRM(),
    'tasks':           () => renderTasks(),
    'approvals':       () => renderApprovals(),
    'system-logs':     () => renderSystemLogs(),
    'settings':        () => renderSettings()
  };

  if (renders[pageId]) {
    try {
      renders[pageId]();
    } catch (e) {
      console.warn(`renderPage error for ${pageId}:`, e.message);
      const el = document.getElementById('page-' + pageId);
      if (el) el.innerHTML = `
        <div class="empty-state">
          <div class="es-icon">⚠️</div>
          <p>Failed to load ${pageId}: ${e.message}</p>
          <button class="btn btn-ghost btn-sm"
            onclick="renderPage('${pageId}')">
            🔄 Retry
          </button>
        </div>`;
    }
  }
};

window.renderPageLoading = function(pageId, icon, title) {
  const el = document.getElementById(pageId);
  if (!el) return;
  el.innerHTML = `
    <div class="section-header">
      <div><h2>${icon} ${title}</h2></div>
    </div>
    <div style="display:flex;align-items:center;
      justify-content:center;padding:60px;">
      <div class="spinner lg"></div>
    </div>`;
};

// ============================================================
// SIDEBAR
// ============================================================

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
  try {
    initRealtimeListeners();
  } catch (e) {
    console.warn('Realtime listeners failed:', e.message);
  }
};

// ============================================================
// FLEET DATA LOADER
// Builds car_label from sheet columns if missing
// Sets ID = Firestore doc ID so booking matching works
// ============================================================

window.loadFleetData = async function() {
  try {
    const snap    = await db.collection('fleet').get();
    const allCars = snap.docs.map(d => {
      const data  = d.data();
      const docId = d.id;

      // Firestore document ID IS the car code from col A
      // Always sync it to the ID field
      data.ID = docId;

      // Build English car label if missing
      if (!data.car_label) {
        const brand = String(data['col_C'] || data['Type']        || '').trim();
        const model = String(data['col_F'] || data['Model']       || '').trim();
        const year  = String(data['col_H'] || data['سنة الصنع']  || '').trim();
        const color = String(data['col_J'] || data['Color']       || '').trim();
        const plate = data.plate || '';
        if (brand || model) {
          data.car_label =
            `${brand} ${model} (${year}) ${color}${plate ? ' | ' + plate : ''}`.trim();
        }
      }

      // Build Arabic car label if missing
      if (!data.car_label_ar) {
        const brandAR = String(data['col_B'] || data['النوع']    || '').trim();
        const modelAR = String(data['col_E'] || data['الطراز']   || '').trim();
        const year    = String(data['col_H'] || data['سنة الصنع']|| '').trim();
        const colorAR = String(data['col_I'] || data['اللون']    || '').trim();
        const plate   = data.plate || '';
        if (brandAR || modelAR) {
          data.car_label_ar =
            `${modelAR || brandAR} (${year}) ${colorAR}${plate ? ' | ' + plate : ''}`.trim();
        }
      }

      return { id: docId, ...data };
    });

    G.fleet = allCars;

    console.log('[Fleet] Loaded', G.fleet.length, 'cars');
    console.log('[Fleet] Active sample:', G.fleet
      .filter(c => getCarStatusCategory(c) !== 'archived')
      .slice(0, 5)
      .map(c => ({ docId: c.id, ID: c.ID, label: c.car_label }))
    );

    populateFleetDropdowns();
    updateDashboardKPIs();

  } catch (e) {
    console.warn('Fleet load failed:', e.message);
  }
};

window.loadBookingsData = async function() {
  try {
    const snap = await db.collection('bookings').limit(1000).get();
    G.bookings = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    _buildActiveBookings();
    updateDashboardKPIs();
  } catch (e) {
    console.warn('Bookings load failed:', e.message);
  }
};

window.loadCustomersData = async function() {
  try {
    const snap = await db.collection('customers').limit(1000).get();
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
    const snap = await db.collection('proposals')
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();
    G.proposals = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    _updateProposalsBadge();
  } catch (e) {
    console.warn('Proposals load failed:', e.message);
  }
};

// ============================================================
// ACTIVE BOOKINGS CACHE
// ============================================================

function _buildActiveBookings() {
  const CUTOFF = new Date('2026-01-01T00:00:00');
  G.activeBookings = G.bookings.filter(b => {
    if (b['الحالة'] === 'ملغي') return false;
    const dates       = getOrderDates(b);
    const compareDate = dates.end || dates.start;
    if (compareDate && compareDate < CUTOFF) return false;
    return true;
  });
}

// ============================================================
// DASHBOARD KPI QUICK UPDATE
// Matches Streamlit definition:
//   Active  = today between start and end, not closed
//   Overdue = end date past, not closed, 2026+ only
// ============================================================

window.updateDashboardKPIs = function() {
  const today      = new Date();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const CUTOFF = new Date('2026-01-01');

  // Available cars
  const availEl = document.getElementById('kpi-avail');
  if (availEl && G.fleet.length) {
    availEl.textContent = G.fleet.filter(
      c => getCarStatusCategory(c) === 'available'
    ).length;
  }

  // Active orders — today between start and end, not closed
  const activeEl  = document.getElementById('kpi-active');
  const overdueEl = document.getElementById('kpi-overdue');

  if ((activeEl || overdueEl) && G.bookings.length) {
    const active = G.bookings.filter(o => {
      if (o.closed === true || o.closed === 'true') return false;
      const st = getOrderStatus(o);
      if (st === 'Closed' || st === 'Cancelled') return false;
      const { start, end } = getOrderDates(o);
      if (!start || !end) return false;
      return start <= today && end >= todayStart;
    }).length;

    const overdue = G.bookings.filter(o => {
      if (o.closed === true || o.closed === 'true') return false;
      const st = getOrderStatus(o);
      if (st === 'Closed' || st === 'Cancelled') return false;
      const { end } = getOrderDates(o);
      if (!end || end < CUTOFF) return false;
      return end < todayStart;
    }).length;

    if (activeEl)  activeEl.textContent  = active;
    if (overdueEl) overdueEl.textContent = overdue;
  }
};

// ============================================================
// SIDEBAR BADGES
// ============================================================

window.updateSidebarBadges = async function() {
  const isPriv     = ['Admin','Executive'].includes(G.user?.role);
  const today      = new Date();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const CUTOFF     = new Date('2026-01-01');

  try {
    if (!G.activeBookings) G.activeBookings = G.bookings || [];
    let orders = G.activeBookings;

    if (!isPriv) {
      orders = orders.filter(o =>
        o['فرع الإصدار']  === G.user.branch ||
        o.assigned_user === G.user.username ||
        (!o['فرع الإصدار'] && !o.assigned_user)
      );
    }

    // Count active orders (today between start and end)
    const activeCount = orders.filter(o => {
      if (o.closed === true || o.closed === 'true') return false;
      const st = getOrderStatus(o);
      if (st === 'Closed' || st === 'Cancelled') return false;
      const { start, end } = getOrderDates(o);
      if (!start || !end) return false;
      return start <= today && end >= todayStart;
    }).length;

    // Add overdue count (2026+ only)
    const overdueCount = orders.filter(o => {
      if (o.closed === true || o.closed === 'true') return false;
      const st = getOrderStatus(o);
      if (st === 'Closed' || st === 'Cancelled') return false;
      const { end } = getOrderDates(o);
      if (!end || end < CUTOFF) return false;
      return end < todayStart;
    }).length;

    const ob = document.getElementById('badge-orders');
    const total = activeCount + overdueCount;
    if (ob && total > 0) {
      ob.textContent = total;
      ob.classList.remove('hidden');
    }

    // Risk badge
    let riskCount = 0;
    G.fleet.forEach(car => {
      if (getCarStatusCategory(car) === 'archived') return;
      ['نهاية الترخيص','نهاية التأمين','نهاية التعاقد'].forEach(field => {
        const d = parseDBDate(car[field]);
        if (!d) return;
        const daysLeft = Math.ceil((d - today) / 86400000);
        if (daysLeft <= 7) riskCount++;
      });
    });
    const rb = document.getElementById('badge-risk');
    if (rb && riskCount > 0) {
      rb.textContent = riskCount;
      rb.classList.remove('hidden');
    }

    // Tasks badge
    try {
      const taskSnap = await db.collection('tasks')
        .where('assigned_to', '==', G.user.username)
        .where('status', 'in', ['pending','inprogress'])
        .get();
      const tb = document.getElementById('badge-tasks');
      if (tb && !taskSnap.empty) {
        tb.textContent = taskSnap.size;
        tb.classList.remove('hidden');
      }
    } catch (e) { /* silent */ }

    // Approvals badge
    if (isPriv) {
      try {
        const apSnap = await db.collection('approvals')
          .where('status', '==', 'pending').get();
        const ab = document.getElementById('badge-approvals');
        if (ab && !apSnap.empty) {
          ab.textContent = apSnap.size;
          ab.classList.remove('hidden');
        }
      } catch (e) { /* silent */ }
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

  // ---- Bookings ----
  let _lastBookingsHash = '';
  const _bookingUnsub = db.collection('bookings')
    .onSnapshot(snap => {
      const newHash = snap.docChanges()
        .map(c => c.doc.id + c.type).join(',');
      if (newHash && newHash === _lastBookingsHash) return;
      _lastBookingsHash = newHash;

      snap.docChanges().forEach(change => {
        const doc = { id: change.doc.id, ...change.doc.data() };
        if (change.type === 'added' || change.type === 'modified') {
          const idx = G.bookings.findIndex(b => b.id === doc.id);
          if (idx >= 0) G.bookings[idx] = doc;
          else          G.bookings.push(doc);
          const idx2 = allOrders.findIndex(b => b.id === doc.id);
          if (idx2 >= 0) allOrders[idx2] = doc;
          else if (idx === -1) allOrders.push(doc);
        }
        if (change.type === 'removed') {
          G.bookings       = G.bookings.filter(b => b.id !== doc.id);
          window.allOrders = allOrders.filter(b => b.id !== doc.id);
        }
      });

      _buildActiveBookings();
      _refreshActivePageAfterBookings();
    });
  G.unsubscribers.push(_bookingUnsub);

  // ---- Fleet ----
  const _fleetUnsub = db.collection('fleet')
    .onSnapshot(snap => {
      snap.docChanges().forEach(change => {
        const rawData = change.doc.data();
        const docId   = change.doc.id;

        // Always keep ID in sync with document ID
        rawData.ID = docId;

        // Rebuild label if missing
        if (!rawData.car_label) {
          const brand = String(rawData['col_C'] || rawData['Type']       || '').trim();
          const model = String(rawData['col_F'] || rawData['Model']      || '').trim();
          const year  = String(rawData['col_H'] || rawData['سنة الصنع'] || '').trim();
          const color = String(rawData['col_J'] || rawData['Color']      || '').trim();
          const plate = rawData.plate || '';
          if (brand || model) {
            rawData.car_label =
              `${brand} ${model} (${year}) ${color}${plate ? ' | ' + plate : ''}`.trim();
          }
        }

        const doc = { id: docId, ...rawData };

        if (change.type === 'added' || change.type === 'modified') {
          const idx = G.fleet.findIndex(c => c.id === doc.id);
          if (idx >= 0) G.fleet[idx] = doc;
          else          G.fleet.push(doc);
        }
        if (change.type === 'removed') {
          G.fleet = G.fleet.filter(c => c.id !== doc.id);
        }
      });

      clearTimeout(window._fleetRefreshTimer);
      window._fleetRefreshTimer = setTimeout(() => {
        _refreshActivePageAfterFleet();
      }, 1500);
    });
  G.unsubscribers.push(_fleetUnsub);

  // ---- Proposals ----
  const _proposalUnsub = db.collection('proposals')
    .onSnapshot(snap => {
      if (!G.proposals) G.proposals = [];
      snap.docChanges().forEach(change => {
        const doc = { id: change.doc.id, ...change.doc.data() };
        if (change.type === 'added' || change.type === 'modified') {
          const idx = G.proposals.findIndex(p => p.id === doc.id);
          if (idx >= 0) G.proposals[idx] = doc;
          else          G.proposals.push(doc);
        }
        if (change.type === 'removed') {
          G.proposals = G.proposals.filter(p => p.id !== doc.id);
        }
      });
      _updateProposalsBadge();
      const active = document.querySelector('.page-section.active');
      if (active?.id === 'page-proposals' &&
          typeof renderProposalsList === 'function') {
        renderProposalsList();
      }
    });
  G.unsubscribers.push(_proposalUnsub);

  // ---- Customers ----
  const _customerUnsub = db.collection('customers')
    .onSnapshot(snap => {
      snap.docChanges().forEach(change => {
        const doc = { id: change.doc.id, ...change.doc.data() };
        if (change.type === 'added' || change.type === 'modified') {
          const idx = G.customers.findIndex(c => c.id === doc.id);
          if (idx >= 0) G.customers[idx] = doc;
          else          G.customers.push(doc);
        }
        if (change.type === 'removed') {
          G.customers = G.customers.filter(c => c.id !== doc.id);
        }
      });
      const active = document.querySelector('.page-section.active');
      if (active?.id === 'page-crm' &&
          typeof filterCRM === 'function') {
        clearTimeout(window._crmRefreshTimer);
        window._crmRefreshTimer = setTimeout(filterCRM, 1000);
      }
    });
  G.unsubscribers.push(_customerUnsub);

  // ---- Tasks ----
  const _taskUnsub = db.collection('tasks')
    .onSnapshot(snap => {
      let myPending = 0;
      snap.docs.forEach(d => {
        const t = d.data();
        if (
          t.assigned_to === G.user?.username &&
          (t.status === 'pending' || t.status === 'inprogress')
        ) myPending++;
      });
      const tb = document.getElementById('badge-tasks');
      if (tb) {
        if (myPending > 0) {
          tb.textContent = myPending;
          tb.classList.remove('hidden');
        } else {
          tb.classList.add('hidden');
        }
      }
      const active = document.querySelector('.page-section.active');
      if (active?.id === 'page-tasks' &&
          typeof switchTaskTab === 'function') {
        clearTimeout(window._taskRefreshTimer);
        window._taskRefreshTimer = setTimeout(() => {
          switchTaskTab('mine', document.getElementById('task-tab-mine'));
        }, 1500);
      }
    });
  G.unsubscribers.push(_taskUnsub);

  // ---- Approvals ----
  const _approvalUnsub = db.collection('approvals')
    .where('status', '==', 'pending')
    .onSnapshot(snap => {
      const count = snap.size;
      const ab    = document.getElementById('badge-approvals');
      if (ab) {
        if (count > 0) {
          ab.textContent = count;
          ab.classList.remove('hidden');
        } else {
          ab.classList.add('hidden');
        }
      }
      const active = document.querySelector('.page-section.active');
      if (active?.id === 'page-approvals' &&
          typeof loadApprovalsList === 'function') {
        clearTimeout(window._approvalRefreshTimer);
        window._approvalRefreshTimer = setTimeout(
          () => loadApprovalsList('pending'), 1500
        );
      }
    });
  G.unsubscribers.push(_approvalUnsub);
};

// ---- Per-page refresh helpers ----

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
  if (pid === 'page-vehicle-360' &&
      typeof loadVehicle360Details === 'function') {
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
  if (pid === 'page-fleet-radar' &&
      typeof renderFleetRadar === 'function') renderFleetRadar();
  if (pid === 'page-vehicle-360' &&
      typeof loadVehicle360Details === 'function') loadVehicle360Details();
  if (pid === 'page-risk-radar' &&
      typeof loadRiskRadar === 'function') loadRiskRadar();
}

// ============================================================
// FLEET DROPDOWNS
// ============================================================

window.populateFleetDropdowns = function() {
  initFleetFilterState();

  const booking = G.fleet.filter(
    car => getCarStatusCategory(car) !== 'archived'
  );

  const opts = booking.map(car => {
    const cat = getCarStatusCategory(car);
    const dot =
      cat === 'available'   ? '🟢' :
      cat === 'rented'      ? '🔵' :
      cat === 'accident'    ? '🔴' :
      cat === 'maintenance' ? '🟡' : '⚪';
    return `<option value="${car.id}">
      ${dot} ${getCarLabel(car, 'en')}
    </option>`;
  }).join('');

  const first = '<option value="">-- Select Car --</option>';
  ['pr-car','en-car','ar-car'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = first + opts;
  });

  const availCount = G.fleet.filter(
    c => getCarStatusCategory(c) === 'available'
  ).length;
  const badge = document.getElementById('badge-fleet');
  if (badge) {
    badge.textContent = availCount;
    badge.classList.toggle('hidden', availCount === 0);
  }
};

// ============================================================
// FLEET FILTER STATE
// ============================================================

window.initFleetFilterState = function() {
  const saved = localStorage.getItem(
    `fleet_filter_${G.user?.username}`
  );
  if (saved) {
    try {
      const p = JSON.parse(saved);
      Object.assign(FLEET_FILTER.status,   p.status   || {});
      Object.assign(FLEET_FILTER.branches, p.branches || {});
    } catch (e) { /* use defaults */ }
  }
  if (!['Admin','Executive'].includes(G.user?.role)) {
    Object.keys(FLEET_FILTER.branches).forEach(b => {
      FLEET_FILTER.branches[b] = (b === G.user?.branch);
    });
  }
};

window.saveFleetFilterState = function() {
  localStorage.setItem(
    `fleet_filter_${G.user?.username}`,
    JSON.stringify({
      status:   FLEET_FILTER.status,
      branches: FLEET_FILTER.branches
    })
  );
};

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

window.addEventListener('unhandledrejection', e => {
  const msg = e.reason?.message || String(e.reason) || 'Unknown error';
  if (msg.includes('requires an index'))   return;
  if (msg.includes('aborted'))             return;
  if (msg.includes('cancelled'))           return;
  if (msg.includes('failed-precondition')) return;
  console.warn('[ERP Unhandled]', msg);
});

window.addEventListener('error', e => {
  if (e.filename && !e.filename.includes(window.location.hostname)) return;
  console.warn('[ERP Error]', e.message, 'line:', e.lineno);
});

// ============================================================
// MOBILE SIDEBAR TOGGLE
// ============================================================

function _initMobileSidebar() {
  if (window.innerWidth > 768) return;
  const topbar = document.getElementById('topbar');
  if (!topbar || document.getElementById('mobile-menu-btn')) return;

  const btn = document.createElement('button');
  btn.id    = 'mobile-menu-btn';
  btn.innerHTML = '☰';
  btn.style.cssText = `
    width:32px;height:32px;border-radius:8px;
    background:var(--glass);border:1px solid var(--border);
    color:var(--text2);font-size:18px;cursor:pointer;
    display:flex;align-items:center;justify-content:center;
    flex-shrink:0;`;
  btn.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('mobile-open');
  });

  const brand = topbar.querySelector('.topbar-brand');
  if (brand) brand.after(btn);
  else       topbar.prepend(btn);
}

// ============================================================
// EVENT LISTENERS
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  document.getElementById('sidebar-toggle')
    ?.addEventListener('click', toggleSidebar);

  document.querySelectorAll('.nav-item[data-page]')
    .forEach(item => {
      item.addEventListener('click', () => {
        const page = item.dataset.page;
        if (page) showPage(page);
      });
    });

  _initMobileSidebar();
  window.addEventListener('resize', _initMobileSidebar, { passive: true });

  if (!document.getElementById('global-pulse-style')) {
    const s = document.createElement('style');
    s.id    = 'global-pulse-style';
    s.textContent = `
      @keyframes dashPulse {
        0%,100% { opacity:1; }
        50%      { opacity:0.25; }
      }`;
    document.head.appendChild(s);
  }

  console.log(
    '%cBrothers EGY ERP v3.0 — Modular build loaded ✅',
    'color:#22c55e;font-weight:bold;font-size:14px;'
  );
});
