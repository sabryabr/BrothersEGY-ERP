// ============================================================
// modules/fleet.js v4.1
// Fleet Radar, Gantt chart, Vehicle 360, Car detail/edit
// ============================================================

// Order status colors (top half of bar)
const ORDER_STATUS_COLORS = {
  active   : '#3b82f6',
  overdue  : '#ef4444',
  accident : '#f97316',
  future   : '#8b5cf6',
  closed   : '#475569',
  cancelled: '#94a3b8'
};
// PAYMENT_STATUS_COLORS lives in window.PAYMENT_STATUS_COLORS (utils.js)

// ============================================================
// ENTRY POINTS
// ============================================================
window.renderFleetRadar = function() {
  renderPageLoading('page-fleet-radar', '📡', 'Fleet Radar');
  loadFleetRadar();
};

window.renderVehicle360 = function() {
  renderPageLoading('page-vehicle-360', '🔭', 'Vehicle 360');
  _renderVehicle360Full();
};

// ============================================================
// FLEET RADAR PAGE
// ============================================================
window.loadFleetRadar = async function() {
  const el = document.getElementById('page-fleet-radar');
  if (!el) return;

  const hKey      = 'fleet_radar_header_collapsed';
  const collapsed = localStorage.getItem(hKey) === 'true';

  el.innerHTML = `
    <div style="position:relative;">

      <!-- COLLAPSIBLE HEADER -->
      <div id="fleet-radar-header"
        style="background:var(--surface2);border:1px solid var(--border);
               border-radius:var(--radius);margin-bottom:8px;overflow:hidden;">

        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;
                    padding:10px 14px;cursor:pointer;"
             onclick="toggleFleetRadarHeader()">
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <h2 style="margin:0;font-size:16px;font-weight:800;">📡 Fleet Radar</h2>
              <span style="color:var(--text3);font-size:11px;">
                Real-time Gantt — all cars and bookings. Drag to scroll.
              </span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;"
               onclick="event.stopPropagation()">
            <button class="btn btn-ghost btn-sm"
              onclick="loadFleetRadar()">🔄 Refresh</button>
            <button class="btn btn-primary btn-sm"
              onclick="ganttScrollToToday()">📅 Today</button>
            <div style="display:flex;align-items:center;gap:4px;">
              <span style="font-size:10px;color:var(--text3);font-weight:700;
                           text-transform:uppercase;letter-spacing:0.08em;">
                Timeline:
              </span>
              ${[
                { label:'1M', days:30  },
                { label:'2M', days:60  },
                { label:'3M', days:90  },
                { label:'6M', days:180 },
                { label:'1Y', days:365 }
              ].map(t => `
                <button class="gantt-range-btn" data-days="${t.days}"
                  onclick="setGanttRange(${t.days})"
                  style="padding:3px 9px;border-radius:6px;
                         border:1px solid ${window.ganttDays === t.days
                           ? 'var(--accent)' : 'var(--border)'};
                         background:${window.ganttDays === t.days
                           ? 'var(--accent)' : 'var(--glass)'};
                         color:${window.ganttDays === t.days
                           ? '#fff' : 'var(--text2)'};
                         font-size:11px;font-weight:700;cursor:pointer;
                         transition:all 0.15s;">
                  ${t.label}
                </button>`).join('')}
            </div>
            <button id="fleet-radar-toggle-btn"
              onclick="toggleFleetRadarHeader()"
              style="background:var(--surface);border:1px solid var(--border);
                     border-radius:6px;padding:3px 8px;cursor:pointer;
                     color:var(--text3);font-size:11px;white-space:nowrap;">
              ${collapsed ? '▼ Show' : '▲ Hide'}
            </button>
          </div>
        </div>

        <!-- Collapsible body -->
        <div id="fleet-radar-collapsible"
          style="overflow:hidden;transition:max-height 0.3s ease;
                 max-height:${collapsed ? '0px' : '500px'};">
          <div style="padding:0 14px 12px;">

            <div id="fleet-filter-bar-gantt"></div>
            <div id="fleet-location-filter-bar"
              style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;
                     padding:6px 0 4px;border-bottom:1px solid var(--border);
                     margin-bottom:6px;"></div>

            <!-- Legend -->
            <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px;
                        padding:8px 10px;background:var(--surface);
                        border:1px solid var(--border);border-radius:var(--radius);">
              <div style="font-size:9px;font-weight:800;color:var(--text3);
                          text-transform:uppercase;align-self:center;
                          letter-spacing:0.06em;white-space:nowrap;">
                ORDER (top):
              </div>
              ${Object.entries({
                'Active'  : '#3b82f6',
                'Overdue' : '#ef4444',
                'Accident': '#f97316',
                'Future'  : '#8b5cf6',
                'Closed'  : '#475569'
              }).map(([label, color]) => `
                <div style="display:flex;align-items:center;gap:4px;font-size:10px;">
                  <div style="width:20px;height:7px;background:${color};
                              border-radius:2px;"></div>
                  ${label}
                </div>`).join('')}
              <div style="width:1px;background:var(--border);margin:0 4px;
                          align-self:stretch;"></div>
              <div style="font-size:9px;font-weight:800;color:var(--text3);
                          text-transform:uppercase;align-self:center;
                          letter-spacing:0.06em;white-space:nowrap;">
                PAYMENT (bottom):
              </div>
              ${Object.entries({
                'Paid'        : '#22c55e',
                'Partial'     : '#f59e0b',
                'Unpaid'      : '#ef4444',
                'Overdue Debt': '#dc2626'
              }).map(([label, color]) => `
                <div style="display:flex;align-items:center;gap:4px;font-size:10px;">
                  <div style="width:20px;height:7px;background:${color};
                              border-radius:2px;"></div>
                  ${label}
                </div>`).join('')}
              <div style="width:1px;background:var(--border);margin:0 4px;
                          align-self:stretch;"></div>
              <div style="display:flex;align-items:center;gap:4px;font-size:10px;">
                <div style="width:20px;height:7px;border:2px dashed #8b5cf6;
                            border-radius:2px;"></div>
                Future
              </div>
              <div style="display:flex;align-items:center;gap:4px;font-size:10px;">
                <div style="width:20px;height:7px;border-radius:2px;
                  background:repeating-linear-gradient(45deg,
                    rgba(239,68,68,0.7),rgba(239,68,68,0.7) 3px,
                    rgba(0,0,0,0.6) 3px,rgba(0,0,0,0.6) 6px);">
                </div>
                Overdue tail
              </div>
            </div>

            <!-- Summary bar -->
            <div id="gantt-summary-bar"
              style="display:flex;gap:12px;padding:5px 10px;
                     background:var(--surface);border-radius:8px;
                     font-size:11px;flex-wrap:wrap;
                     border:1px solid var(--border);">
              <span>🚗 <strong id="gsb-total">--</strong> cars shown</span>
              <span style="color:var(--success);">
                🟢 Available: <strong id="gsb-avail">--</strong>
              </span>
              <span style="color:#3b82f6;">
                🔵 Rented: <strong id="gsb-rented">--</strong>
              </span>
              <span style="color:#ef4444;">
                🔴 Accident: <strong id="gsb-accident">--</strong>
              </span>
              <span style="color:#f59e0b;">
                🟡 Maintenance: <strong id="gsb-maint">--</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- GANTT CONTAINER -->
      <div id="gantt-wrap"
        style="overflow:hidden;max-height:calc(100vh - 200px);
               border:1px solid var(--border);border-radius:var(--radius);
               background:var(--surface);cursor:grab;user-select:none;">
        <div class="empty-state"><div class="spinner lg"></div></div>
      </div>
    </div>

    <!-- Tooltip -->
    <div id="gantt-tooltip"
      style="display:none;position:fixed;z-index:9000;width:310px;
             background:var(--surface);border:1px solid var(--border2);
             border-radius:var(--radius);padding:13px;
             box-shadow:0 12px 40px rgba(0,0,0,0.7);pointer-events:none;">
    </div>
  `;

  buildFleetFilterBar('fleet-filter-bar-gantt', 'renderGantt');
  buildLocationFilterBar();
  if (!G.fleet.length)    await loadFleetData();
  if (!G.bookings.length) await loadBookingsData();
  await renderGantt();
  initGanttDrag();
  setTimeout(() => ganttScrollToToday(), 500);
};

window.toggleFleetRadarHeader = function() {
  const hKey = 'fleet_radar_header_collapsed';
  const body = document.getElementById('fleet-radar-collapsible');
  const btn  = document.getElementById('fleet-radar-toggle-btn');
  if (!body) return;
  const isNowCollapsed = body.style.maxHeight !== '0px';
  body.style.maxHeight = isNowCollapsed ? '0px' : '500px';
  if (btn) btn.textContent = isNowCollapsed ? '▼ Show' : '▲ Hide';
  localStorage.setItem(hKey, isNowCollapsed ? 'true' : 'false');
};

// ============================================================
// FLEET FILTER BAR
// ============================================================
window.buildFleetFilterBar = function(containerId, cbName) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const { counts, branchCounts } = getCarCounts();
  const isPriv = ['Admin', 'Executive'].includes(G.user?.role);
  const fs = FLEET_FILTER.status;
  const fb = FLEET_FILTER.branches;
  const allOn = Object.values(fb).every(v => v);

  container.innerHTML = `
    <div class="filter-pill-bar">
      <span style="font-size:9px;font-weight:800;color:var(--text3);
                   text-transform:uppercase;letter-spacing:0.1em;">STATUS</span>
      <div class="filter-pill-group">
        <div class="fpill ${Object.values(fs).every(v => v) ? 'all-on' : 'off'}"
             id="fpill-all-status"
             onclick="toggleAllStatuses('${cbName}')">✦ All</div>
        <div class="fpill ${fs.active ? 'active-on' : 'off'}"
             id="fpill-active"
             onclick="toggleFleetFilter('status','active','${cbName}')">
          🟢 Active <span class="fpill-count">${counts.active}</span>
        </div>
        <div class="fpill ${fs.accident ? 'accident-on' : 'off'}"
             id="fpill-accident"
             onclick="toggleFleetFilter('status','accident','${cbName}')">
          🔴 Accident <span class="fpill-count">${counts.accident}</span>
        </div>
        <div class="fpill ${fs.maintenance ? 'maintenance-on' : 'off'}"
             id="fpill-maintenance"
             onclick="toggleFleetFilter('status','maintenance','${cbName}')">
          🔧 Maintenance <span class="fpill-count">${counts.maintenance}</span>
        </div>
        <div class="fpill ${fs.archived ? 'archived-on' : 'off'}"
             id="fpill-archived"
             onclick="toggleFleetFilter('status','archived','${cbName}')">
          📦 Archived <span class="fpill-count">${counts.archived}</span>
        </div>
      </div>

      <div class="filter-pill-divider"></div>

      <span style="font-size:9px;font-weight:800;color:var(--text3);
                   text-transform:uppercase;letter-spacing:0.1em;">BRANCH</span>
      <div class="filter-pill-group">
        <div class="fpill ${allOn ? 'all-on' : 'off'}"
             id="fpill-all-branch"
             onclick="toggleAllBranches('${cbName}')">🌍 All</div>
        ${isPriv || fb.HRG ? `
          <div class="fpill ${fb.HRG ? 'hrg-on' : 'off'}" id="fpill-HRG"
               onclick="toggleFleetFilter('branch','HRG','${cbName}')">
            🌊 HRG <span class="fpill-count">${branchCounts.HRG}</span>
          </div>` : ''}
        ${isPriv || fb.ALX ? `
          <div class="fpill ${fb.ALX ? 'alx-on' : 'off'}" id="fpill-ALX"
               onclick="toggleFleetFilter('branch','ALX','${cbName}')">
            🏙 ALX <span class="fpill-count">${branchCounts.ALX}</span>
          </div>` : ''}
        ${isPriv || fb.CAI ? `
          <div class="fpill ${fb.CAI ? 'cai-on' : 'off'}" id="fpill-CAI"
               onclick="toggleFleetFilter('branch','CAI','${cbName}')">
            🏛 CAI <span class="fpill-count">${branchCounts.CAI}</span>
          </div>` : ''}
        ${isPriv || fb.RSH ? `
          <div class="fpill ${fb.RSH ? 'rsh-on' : 'off'}" id="fpill-RSH"
               onclick="toggleFleetFilter('branch','RSH','${cbName}')">
            ⚓ RSH <span class="fpill-count">${branchCounts.RSH}</span>
          </div>` : ''}
      </div>

      <div class="filter-pill-divider"></div>

      <div style="flex:1;min-width:130px;">
        <input type="text" placeholder="🔍 Search plate, model..."
          value="${FLEET_FILTER.search}"
          oninput="onFleetSearch(this.value,'${cbName}')"
          style="width:100%;padding:5px 11px;background:rgba(255,255,255,0.05);
                 border:1px solid var(--border);border-radius:99px;
                 color:var(--text);font-size:11px;outline:none;"
          onfocus="this.style.borderColor='var(--accent)'"
          onblur="this.style.borderColor='var(--border)'"/>
      </div>
      <button class="btn btn-ghost btn-xs"
        onclick="resetFleetFilters('${cbName}')">✕ Reset</button>
    </div>
  `;
};

window.toggleFleetFilter = function(group, key, cbName) {
  if (group === 'status') FLEET_FILTER.status[key] = !FLEET_FILTER.status[key];
  else if (group === 'branch') {
    FLEET_FILTER.branches[key] = !FLEET_FILTER.branches[key];
    _updateAllBranchPill();
  }
  saveFleetFilterState();
  refreshFleetFilterPills();
  if (cbName && window[cbName]) window[cbName]();
};

window.toggleAllBranches = function(cbName) {
  const allOn = Object.values(FLEET_FILTER.branches).every(v => v);
  Object.keys(FLEET_FILTER.branches).forEach(b => { FLEET_FILTER.branches[b] = !allOn; });
  saveFleetFilterState();
  refreshFleetFilterPills();
  if (cbName && window[cbName]) window[cbName]();
};

window.toggleAllStatuses = function(cbName) {
  Object.keys(FLEET_FILTER.status).forEach(k => { FLEET_FILTER.status[k] = true; });
  saveFleetFilterState();
  refreshFleetFilterPills();
  if (cbName && window[cbName]) window[cbName]();
};

window.onFleetSearch = function(val, cbName) {
  FLEET_FILTER.search = val.toLowerCase().trim();
  if (cbName && window[cbName]) window[cbName]();
};

window.resetFleetFilters = function(cbName) {
  FLEET_FILTER.status = { active:true, archived:false, accident:true, maintenance:true };
  FLEET_FILTER.search = '';
  const isPriv = ['Admin', 'Executive'].includes(G.user?.role);
  Object.keys(FLEET_FILTER.branches).forEach(b => {
    FLEET_FILTER.branches[b] = isPriv ? true : (b === G.user?.branch);
  });
  saveFleetFilterState();
  refreshFleetFilterPills();
  if (cbName && window[cbName]) window[cbName]();
};

window.refreshFleetFilterPills = function() {
  const fs = FLEET_FILTER.status;
  const fb = FLEET_FILTER.branches;
  const map = {
    'fpill-all-status' : Object.values(fs).every(v => v) ? 'all-on' : 'off',
    'fpill-active'     : fs.active      ? 'active-on'      : 'off',
    'fpill-archived'   : fs.archived    ? 'archived-on'    : 'off',
    'fpill-accident'   : fs.accident    ? 'accident-on'    : 'off',
    'fpill-maintenance': fs.maintenance ? 'maintenance-on' : 'off',
    'fpill-HRG'        : fb.HRG ? 'hrg-on' : 'off',
    'fpill-ALX'        : fb.ALX ? 'alx-on' : 'off',
    'fpill-CAI'        : fb.CAI ? 'cai-on' : 'off',
    'fpill-RSH'        : fb.RSH ? 'rsh-on' : 'off'
  };
  Object.entries(map).forEach(([id, cls]) => {
    const el = document.getElementById(id);
    if (el) el.className = `fpill ${cls}`;
  });
  _updateAllBranchPill();
};

function _updateAllBranchPill() {
  const allOn = Object.values(FLEET_FILTER.branches).every(v => v);
  const el    = document.getElementById('fpill-all-branch');
  if (el) el.className = `fpill ${allOn ? 'all-on' : 'off'}`;
}

// ============================================================
// LOCATION FILTER BAR
// ============================================================
window.buildLocationFilterBar = function() {
  const bar = document.getElementById('fleet-location-filter-bar');
  if (!bar) return;
  const locs = [
    { v:'all',         l:'All'             },
    { v:'HRG',         l:'HRG'             },
    { v:'ALX',         l:'ALX'             },
    { v:'CAI',         l:'CAI'             },
    { v:'Workshop',    l:'🔧 Workshop'      },
    { v:'With Client', l:'🚗 With Client'   }
  ];
  const cur = window.GANTT_LOCATION_FILTER || 'all';
  bar.innerHTML =
    `<span style="font-size:9px;font-weight:800;color:var(--text3);
                  text-transform:uppercase;letter-spacing:0.1em;">LOCATION</span>` +
    locs.map(loc => `
      <button data-loc="${loc.v}"
        onclick="setLocationFilter('${loc.v}')"
        style="padding:2px 9px;border-radius:99px;
               border:1px solid ${cur === loc.v ? 'var(--accent)' : 'var(--border)'};
               background:${cur === loc.v ? 'var(--accent)' : 'var(--glass)'};
               color:${cur === loc.v ? '#fff' : 'var(--text2)'};
               font-size:10px;font-weight:700;cursor:pointer;transition:all 0.15s;">
        ${loc.l}
      </button>`).join('');
};

window.setLocationFilter = function(loc) {
  window.GANTT_LOCATION_FILTER = loc;
  buildLocationFilterBar();
  renderGantt();
};

// ============================================================
// GANTT CHART
// ============================================================
window.setGanttRange = function(days) {
  window.ganttDays = days;
  const zoom = days <= 30 ? 40 : days <= 60 ? 32 :
               days <= 90 ? 28 : days <= 180 ? 18 : 10;
  window.GANTT_PX_PER_DAY = zoom;
  document.querySelectorAll('.gantt-range-btn').forEach(b => {
    const on = parseInt(b.dataset.days) === days;
    b.style.background  = on ? 'var(--accent)' : 'var(--glass)';
    b.style.color       = on ? '#fff'           : 'var(--text2)';
    b.style.borderColor = on ? 'var(--accent)'  : 'var(--border)';
  });
  renderGantt();
  setTimeout(() => {
    const el = document.getElementById('gantt-wrap');
    if (el) el.scrollLeft = 182 * zoom - el.clientWidth / 2;
  }, 250);
};

window.ganttScrollToToday = function() {
  const wrap = document.getElementById('gantt-wrap');
  if (!wrap) return;
  const DAY_PX  = window.GANTT_PX_PER_DAY || 14;
  const pastDays= Math.floor((window.ganttDays || 90) * 0.4);
  const CAR_COL = 240;
  const todayPx = CAR_COL + (pastDays * DAY_PX) - (wrap.clientWidth / 2) + 100;
  wrap.scrollTo({ left: Math.max(0, todayPx), behavior: 'smooth' });
};

window.renderGantt = async function() {
  const wrap = document.getElementById('gantt-wrap');
  if (!wrap) return;
  wrap.innerHTML = '<div class="empty-state"><div class="spinner lg"></div></div>';
  window.ganttData = {};

  try {
    if (!G.fleet || G.fleet.length === 0) await loadFleetData();
    if (!G.fleet || G.fleet.length === 0) {
      wrap.innerHTML = '<div class="empty-state"><p>No fleet data available.</p></div>';
      return;
    }

    buildFleetFilterBar('fleet-filter-bar-gantt', 'renderGantt');
    if (!G.activeBookings) G.activeBookings = G.bookings || [];

    // Pre-index orders by car code
    const ordersByCar = {};
    G.activeBookings.forEach(b => {
      const carCode = String(b['كود السيارة'] || '').trim();
      if (carCode) {
        if (!ordersByCar[carCode]) ordersByCar[carCode] = [];
        ordersByCar[carCode].push(b);
      }
    });

    // ✅ Don't mutate getCairoNow result — create separate date objects
    const todayRaw   = getCairoNow();
    const today      = new Date(todayRaw);
    today.setHours(0, 0, 0, 0);

    const totalDays  = window.ganttDays || 90;
    const pastDays   = Math.floor(totalDays * 0.4);
    const ganttStart = new Date(today);
    ganttStart.setDate(ganttStart.getDate() - pastDays);

    const DAY_PX     = window.GANTT_PX_PER_DAY || 14;
    const CAR_COL    = 240;
    const ASSIGN_COL = 230;
    const ROW_H      = 42;
    const HEADER_H   = 46;
    const totalPx    = totalDays * DAY_PX;

    const cars       = _filterCarsForGantt();
    const locFilter  = window.GANTT_LOCATION_FILTER || 'all';
    const activeCars = locFilter === 'all' ? cars : cars.filter(c => {
      const loc = (c.current_location || '').toLowerCase();
      if (locFilter === 'Workshop')    return loc.includes('workshop');
      if (locFilter === 'With Client') return loc.includes('with client');
      return loc.startsWith(locFilter.toLowerCase() + '-') ||
             loc === locFilter.toLowerCase();
    });

    const { headerMonthHTML, headerDayHTML } = _buildGanttHeader(
      ganttStart, totalDays, today, DAY_PX, HEADER_H
    );
    const rowsHTML = _buildGanttRows(
      activeCars, ordersByCar, today, ganttStart,
      totalDays, totalPx, DAY_PX, CAR_COL, ASSIGN_COL, ROW_H
    );

    wrap.innerHTML = `
      <div id="gantt-inner"
        style="min-width:${CAR_COL + totalPx + ASSIGN_COL}px;">

        <!-- Sticky header -->
        <div style="display:flex;position:sticky;top:0;z-index:20;
                    background:var(--surface3);border-bottom:2px solid var(--border2);">
          <div style="position:sticky;left:0;z-index:22;background:var(--surface3);
                      width:${CAR_COL}px;min-width:${CAR_COL}px;height:${HEADER_H}px;
                      display:flex;align-items:center;padding:0 12px;
                      border-right:2px solid var(--border2);
                      box-shadow:4px 0 8px rgba(0,0,0,0.5);isolation:isolate;">
            <span style="font-size:10px;font-weight:800;color:var(--text3);
                         text-transform:uppercase;letter-spacing:0.1em;">
              Vehicle (${activeCars.length}) — Click for details
            </span>
          </div>
          <div style="position:relative;width:${totalPx}px;min-width:${totalPx}px;
                      height:${HEADER_H}px;flex-shrink:0;overflow:hidden;">
            ${headerMonthHTML}${headerDayHTML}
          </div>
          <div style="position:sticky;right:0;z-index:22;background:var(--surface3);
                      width:${ASSIGN_COL}px;min-width:${ASSIGN_COL}px;height:${HEADER_H}px;
                      display:flex;flex-direction:column;justify-content:center;
                      padding:0 10px;border-left:2px solid var(--border2);
                      box-shadow:-4px 0 8px rgba(0,0,0,0.5);isolation:isolate;">
            <span style="font-size:9px;font-weight:800;color:var(--text3);
                         text-transform:uppercase;letter-spacing:0.1em;">
              Assignment
            </span>
            <div style="display:flex;gap:6px;margin-top:2px;flex-wrap:wrap;">
              ${_buildBranchAvailBadges()}
            </div>
          </div>
        </div>

        <!-- Car rows -->
        ${rowsHTML || `
          <div class="empty-state" style="padding:40px;">
            <div class="es-icon">🚗</div>
            <p>No cars match your current filters.</p>
          </div>`}
      </div>
    `;

    setTimeout(() => {
      const el = document.getElementById('gantt-wrap');
      if (!el) return;
      el.style.overflowX = 'auto';
      el.style.overflowY = 'auto';
      el.scrollLeft      = 182 * DAY_PX - el.clientWidth / 2;
      _initGanttTouchDrag(el);
    }, 200);

    _updateGanttSummaryBar(activeCars);

  } catch (e) {
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="es-icon">⚠️</div>
        <p>Gantt error: ${e.message}</p>
      </div>`;
    console.warn('Gantt error:', e);
  }
};

// ── Filter cars for Gantt ──────────────────────────────────────────────────
function _filterCarsForGantt() {
  return G.fleet.filter(car => {
    const cat = getCarStatusCategory(car);
    if (cat === 'archived') return false;

    const isAccident = cat === 'accident';
    const isMaint    = cat === 'maintenance';
    const isActive   = !isAccident && !isMaint;

    const statusPass =
      (isAccident && FLEET_FILTER.status.accident)    ||
      (isMaint    && FLEET_FILTER.status.maintenance) ||
      (isActive   && FLEET_FILTER.status.active);
    if (!statusPass) return false;

    const allOn  = Object.values(FLEET_FILTER.branches).every(v => v);
    const noneOn = !Object.values(FLEET_FILTER.branches).some(v => v);
    if (noneOn) return false;

    if (!allOn) {
      const branchPass = Object.entries(FLEET_FILTER.branches).some(([code, on]) => {
        if (!on) return false;
        const carLoc    = (car.current_location || '').toUpperCase();
        const carBranch = (car.Branch || car.City || car['المحافظة'] || '').toLowerCase();
        const name      = (BRANCH_MAP[code] || code).toLowerCase();
        if (carLoc.startsWith(code + '-') || carLoc === code) return true;
        if (carBranch.includes(name) || carBranch.includes(code.toLowerCase())) return true;
        const hasAny = car.current_location || car.Branch || car.City || car['المحافظة'];
        if (!hasAny && code === (G.user?.branch || 'HRG')) return true;
        return false;
      });
      if (!branchPass) return false;
    }

    if (FLEET_FILTER.search) {
      const q   = FLEET_FILTER.search.toLowerCase();
      const plt = formatPlate(car);
      const hay = [
        car.plate, plt, car.model, car.Color, car.year, car.Type,
        car['اللون'], car['الطراز'], car['سنة الصنع'],
        car.ID, car.id, car.car_label
      ].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }

    return true;
  });
}

// ── Build Gantt header ─────────────────────────────────────────────────────
function _buildGanttHeader(ganttStart, totalDays, today, DAY_PX, HEADER_H) {
  let headerMonthHTML = '';
  let headerDayHTML   = '';
  let prevMonth       = -1;

  for (let i = 0; i < totalDays; i++) {
    const d = new Date(ganttStart);
    d.setDate(d.getDate() + i);
    const isToday = d.toDateString() === today.toDateString();

    if (d.getMonth() !== prevMonth) {
      prevMonth = d.getMonth();
      const mLabel = d.toLocaleString('en-GB', { month:'short', year:'2-digit' });
      headerMonthHTML += `
        <div style="position:absolute;left:${i * DAY_PX}px;top:0;
                    height:20px;padding:2px 5px;font-size:10px;font-weight:800;
                    color:var(--accent);white-space:nowrap;
                    border-left:2px solid rgba(59,130,246,0.5);line-height:16px;">
          ${mLabel}
        </div>`;
    }

    if ([1, 7, 14, 21, 28].includes(d.getDate())) {
      headerDayHTML += `
        <div style="position:absolute;left:${i * DAY_PX}px;top:20px;
                    height:26px;padding:4px 2px;font-size:9px;
                    color:${isToday ? 'var(--accent)' : 'var(--text3)'};
                    font-weight:${isToday ? '800' : '400'};
                    border-left:1px solid var(--border);">
          ${d.getDate()}
        </div>`;
    }

    if (isToday) {
      headerDayHTML += `
        <div style="position:absolute;left:${i * DAY_PX}px;top:0;
                    width:${DAY_PX}px;height:${HEADER_H}px;
                    background:rgba(59,130,246,0.1);
                    border-left:2px solid var(--accent);
                    pointer-events:none;"></div>`;
    }
  }

  return { headerMonthHTML, headerDayHTML };
}

// ── Build Gantt rows ───────────────────────────────────────────────────────
function _buildGanttRows(
  activeCars, ordersByCar, today, ganttStart,
  totalDays, totalPx, DAY_PX, CAR_COL, ASSIGN_COL, ROW_H
) {
  const todayPxBase = Math.max(
    0, Math.floor((today - ganttStart) / 86400000) * DAY_PX
  );

  let rowsHTML = '';

  activeCars.forEach((car, ci) => {
    const possibleIds = new Set([
      String(car.ID  || '').trim(),
      String(car.id  || '').trim(),
      String(parseInt(car.ID  || 0) || '').trim(),
      String(parseInt(car.id  || 0) || '').trim()
    ].filter(x => x && x !== '0'));

    const carIdStr     = String(car.ID || car.id || '').trim();
    const plateDisplay = formatPlate(car);
    const carLabel     = getCarLabel(car, 'en');
    const shortLabel   = (car.car_label || carLabel).split('|')[0].trim().slice(0, 28);
    const catStatus    = getCarStatusCategory(car);

    const statusColors = {
      available  : '#22c55e',
      rented     : '#3b82f6',
      accident   : '#ef4444',
      maintenance: '#f59e0b',
      archived   : '#64748b'
    };
    const dotColor    = statusColors[catStatus] || 'var(--text3)';
    const statusLabel = catStatus.charAt(0).toUpperCase() + catStatus.slice(1);
    const rowBg       = ci % 2 === 0 ? 'var(--surface)' : 'var(--surface2)';
    const stickyBg    = ci % 2 === 0 ? 'var(--surface)' : 'var(--surface2)';

    let carOrders = [];
    possibleIds.forEach(pid => {
      if (ordersByCar[pid]) carOrders = carOrders.concat(ordersByCar[pid]);
    });
    carOrders.sort((a, b) => {
      const { start: as } = getOrderDates(a);
      const { start: bs } = getOrderDates(b);
      return (as || new Date(0)) - (bs || new Date(0));
    });

    const carProposals = (G.proposals || []).filter(p => {
      const pCarId = String(p.car_id || '').trim();
      return pCarId && possibleIds.has(pCarId) &&
             p.pickup_date && p.dropoff_date &&
             p.status !== 'Cancelled' && p.status !== 'Converted';
    });

    const rows = [];
    carOrders.forEach(order => {
      const { start, end } = getOrderDates(order);
      if (!start) return;
      const effectiveEnd = end || new Date(start.getTime() + 86400000);
      let placed = false;
      for (let r = 0; r < rows.length; r++) {
        if (!rows[r].end || start >= rows[r].end) {
          rows[r].orders.push(order);
          rows[r].end = effectiveEnd;
          placed = true;
          break;
        }
      }
      if (!placed) rows.push({ orders: [order], end: effectiveEnd });
    });

    const numRows   = Math.max(1, rows.length);
    const rowHeight = Math.max(ROW_H, numRows * ROW_H);

    rowsHTML += `
      <div style="display:flex;background:${rowBg};
                  border-bottom:1px solid var(--border);">
        <!-- Sticky car label -->
        <div style="position:sticky;left:0;z-index:15;background:${stickyBg};
                    width:${CAR_COL}px;min-width:${CAR_COL}px;height:${rowHeight}px;
                    padding:0 10px;border-right:2px solid var(--border2);
                    box-shadow:4px 0 8px rgba(0,0,0,0.5);isolation:isolate;
                    display:flex;align-items:center;cursor:pointer;"
             onclick="openCarDetailModal('${carIdStr}')"
             onmouseover="this.style.background='var(--glass2)'"
             onmouseout="this.style.background='${stickyBg}'">
          <div style="padding:4px 6px;max-width:${CAR_COL - 4}px;overflow:hidden;">
            <div style="display:flex;align-items:center;gap:5px;margin-bottom:2px;">
              <span style="width:8px;height:8px;border-radius:50%;
                           background:${dotColor};flex-shrink:0;"></span>
              <div style="font-size:11px;font-weight:700;white-space:nowrap;
                          overflow:hidden;text-overflow:ellipsis;
                          max-width:${CAR_COL - 26}px;" title="${carLabel}">
                ${shortLabel}
              </div>
            </div>
            <div style="font-size:10px;color:var(--text3);white-space:nowrap;
                        overflow:hidden;text-overflow:ellipsis;
                        max-width:${CAR_COL - 12}px;font-weight:600;">
              ${plateDisplay || '—'}
            </div>
            <div style="display:flex;align-items:center;gap:4px;
                        margin-top:2px;flex-wrap:wrap;">
              <span class="pill pill-${catStatus}"
                style="font-size:8px;padding:1px 5px;">
                ${statusLabel}
              </span>
              ${car.current_location ? `
                <span style="font-size:8px;color:var(--text3);">
                  📍${car.current_location
                    .replace(/-Office$/, '').replace(/-Airport$/, '✈️')}
                </span>` : ''}
            </div>
          </div>
        </div>

        <!-- Timeline area -->
        <div style="flex:1;display:flex;flex-direction:column;">
          ${_buildGanttRowBars(
            rows, carProposals,
            today, ganttStart, totalDays, totalPx,
            DAY_PX, ROW_H, todayPxBase
          )}
        </div>
      </div>`;
  });

  return rowsHTML;
}

// ── Build bars for a single car row ───────────────────────────────────────
function _buildGanttRowBars(
  rows, carProposals,
  today, ganttStart, totalDays, totalPx,
  DAY_PX, ROW_H, todayPxBase
) {
  if (rows.length === 0) {
    return `
      <div style="position:relative;width:${totalPx}px;
                  height:${ROW_H}px;flex-shrink:0;">
        <div style="position:absolute;left:${todayPxBase}px;top:0;bottom:0;
                    width:2px;background:rgba(59,130,246,0.5);
                    z-index:2;pointer-events:none;"></div>
      </div>`;
  }

  return rows.map((row, ri) => {
    let barsHTML = _buildMonthStripes(ganttStart, totalDays, today, DAY_PX, ROW_H);
    barsHTML += `
      <div style="position:absolute;left:${todayPxBase}px;top:0;bottom:0;
                  width:2px;background:rgba(59,130,246,0.5);
                  z-index:4;pointer-events:none;"></div>`;

    for (let i = 0; i < totalDays; i++) {
      const d = new Date(ganttStart);
      d.setDate(d.getDate() + i);
      if (d.getDay() === 0 || d.getDay() === 6) {
        barsHTML += `
          <div style="position:absolute;left:${i * DAY_PX}px;top:0;bottom:0;
                      width:${DAY_PX}px;background:rgba(255,255,255,0.012);
                      pointer-events:none;z-index:0;"></div>`;
      }
    }

    if (ri === 0) {
      barsHTML += _buildProposalBars(carProposals, ganttStart, totalPx, DAY_PX, ROW_H);
    }

    row.orders.forEach(order => {
      barsHTML += _buildOrderBar(
        order, today, ganttStart, totalPx, DAY_PX, ROW_H, todayPxBase
      );
    });

    const aHTML = ri === rows.length - 1
      ? _buildAssignmentInfo(row.orders[row.orders.length - 1], today, DAY_PX)
      : '';

    return `
      <div style="display:flex;border-bottom:1px solid rgba(255,255,255,0.03);">
        <div style="position:relative;width:${totalPx}px;min-width:${totalPx}px;
                    height:${ROW_H}px;flex-shrink:0;overflow:hidden;">
          ${barsHTML}
        </div>
        ${aHTML ? `
          <div style="position:sticky;right:0;width:230px;min-width:230px;
                      height:${ROW_H}px;padding:4px 10px;
                      background:var(--surface2);
                      border-left:2px solid var(--border2);
                      box-shadow:-4px 0 8px rgba(0,0,0,0.5);
                      display:flex;flex-direction:column;
                      justify-content:center;z-index:5;isolation:isolate;">
            ${aHTML}
          </div>` : ''}
      </div>`;
  }).join('');
}

function _buildMonthStripes(ganttStart, totalDays, today, DAY_PX, ROW_H) {
  let html = '';
  const md = new Date(ganttStart);
  while (md < new Date(ganttStart.getTime() + totalDays * 86400000)) {
    const mS    = new Date(md.getFullYear(), md.getMonth(), 1);
    const mE    = new Date(md.getFullYear(), md.getMonth() + 1, 0);
    const mLeft = Math.max(0, Math.floor((mS - ganttStart) / 86400000)) * DAY_PX;
    const mRight= Math.min(totalDays, Math.ceil((mE - ganttStart) / 86400000) + 1) * DAY_PX;
    const mW    = Math.max(0, mRight - mLeft);
    const isCurM= md.getMonth() === today.getMonth() &&
                  md.getFullYear() === today.getFullYear();
    const isEven= md.getMonth() % 2 === 0;
    html += `
      <div style="position:absolute;left:${mLeft}px;top:0;width:${mW}px;height:100%;
                  background:${isCurM
                    ? 'rgba(99,102,241,0.05)'
                    : isEven
                    ? 'rgba(255,255,255,0.01)'
                    : 'rgba(255,255,255,0.025)'};
                  border-left:1px solid ${isCurM
                    ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.05)'};
                  pointer-events:none;z-index:1;"></div>`;
    md.setMonth(md.getMonth() + 1);
  }
  return html;
}

function _buildProposalBars(carProposals, ganttStart, totalPx, DAY_PX, ROW_H) {
  let html = '';
  carProposals.forEach(p => {
    const pStart   = parseDBDate(p.pickup_date);
    const pEnd     = parseDBDate(p.dropoff_date);
    if (!pStart || !pEnd) return;
    const pStartPx = Math.max(-DAY_PX, Math.floor((pStart - ganttStart) / 86400000) * DAY_PX);
    const pEndPx   = Math.min(totalPx + DAY_PX, Math.floor((pEnd - ganttStart) / 86400000) * DAY_PX);
    const pBarW    = Math.max(4, pEndPx - Math.max(0, pStartPx));
    if (pEndPx < 0 || pStartPx > totalPx) return;
    const cPStartPx = Math.max(0, pStartPx);
    const bg = p.proposal_mode === 'reservation'
      ? 'rgba(234,179,8,0.7)' : 'rgba(168,85,247,0.6)';
    html += `
      <div style="position:absolute;left:${cPStartPx}px;top:4px;
                  width:${pBarW}px;height:${ROW_H - 8}px;z-index:2;cursor:pointer;
                  background:${bg};border-radius:3px;
                  border:1px dashed rgba(255,255,255,0.4);"
           onclick="previewProposal('${p.id}')"
           title="Proposal: ${(p.client_name || '').replace(/'/g, '')} | ${p.status}">
        <div style="padding:1px 4px;font-size:8px;color:#fff;
                    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          📋 ${p.client_name || 'Proposal'}
        </div>
      </div>`;
  });
  return html;
}

// ── Build order bar — SPLIT top (order status) / bottom (payment status) ──
function _buildOrderBar(
  order, today, ganttStart, totalPx, DAY_PX, ROW_H, todayPxBase
) {
  const { start, end } = getOrderDates(order);
  if (!start) return '';

  const statusRaw  = getOrderStatus(order);
  const isAccident = statusRaw === 'Accident';
  const isClosed   = statusRaw === 'Closed' || order.closed === true;
  const isOverdue  = !isClosed && end && today > end &&
    (statusRaw === 'Active' || statusRaw === 'Overdue');
  const isFuture   = start > today && !isClosed && !isAccident;

  const total      = getOrderTotal(order);
  const paid       = getOrderPaid(order);
  const daily      = parseAmount(order['سعر السيارة اليومي بالجنيه المصري']) ||
    (total / Math.max(1, parseFloat(order.rental_days || 1)));
  const lateDays   = (isOverdue || isAccident) && end
    ? Math.max(0, Math.ceil((today - end) / 86400000)) : 0;
  const latePenalty= lateDays * daily;
  const debt       = isClosed ? 0 : Math.max(0, total + latePenalty - paid);

  const startDay  = Math.floor((start - ganttStart) / 86400000);
  const startPx   = Math.max(-DAY_PX, startDay * DAY_PX);
  const baseEndDate = end || new Date(start.getTime() + 86400000);
  const baseEndPx   = Math.min(
    totalPx + DAY_PX,
    Math.floor((baseEndDate - ganttStart) / 86400000) * DAY_PX
  );
  const tailEndPx   = Math.min(totalPx, todayPxBase + DAY_PX);
  const barW  = Math.max(4, baseEndPx - Math.max(0, startPx));
  const tailW = (isOverdue || isAccident) && !isClosed
    ? Math.max(0, tailEndPx - baseEndPx) : 0;

  if (baseEndPx < 0 || startPx > totalPx) return '';

  const clampedStartPx = Math.max(0, startPx);
  const barTop = 3;
  const barH   = ROW_H - 6;
  const topH   = Math.floor(barH * 0.55);
  const botH   = barH - topH;

  const orderKey   = isAccident ? 'accident'
    : isOverdue ? 'overdue'
    : isClosed  ? 'closed'
    : isFuture  ? 'future'
    : 'active';
  const orderColor = ORDER_STATUS_COLORS[orderKey] || '#3b82f6';

  const payKey   = getPaymentStatus(order);
  const payColor = window.PAYMENT_STATUS_COLORS[payKey] || '#f59e0b';
  const payLabel = getPaymentStatusLabel(order);

  let tailBg = null;
  if (isAccident) {
    tailBg = 'repeating-linear-gradient(45deg,#f59e0b,#f59e0b 4px,#111827 4px,#111827 8px)';
  } else if (isOverdue) {
    tailBg = 'repeating-linear-gradient(45deg,rgba(239,68,68,0.7),rgba(239,68,68,0.7) 4px,rgba(0,0,0,0.6) 4px,rgba(0,0,0,0.6) 8px)';
  }

  const clientName = (order['اسم العميل'] || '').replace(/'/g, '');
  const tipKey     = 'g_' + order.id.replace(/[^a-zA-Z0-9]/g, '_');

  window.ganttData[tipKey] = {
    id: order.id, no: getOrderNo(order),
    client  : getOrderClientName(order) || '-',
    clientId: order['كود العميل'] || '-',
    start   : fmtDate(start), end: end ? fmtDate(end) : 'N/A',
    total, paid, daily, debt, lateDays, latePenalty,
    status  : statusRaw, isAccident, isOverdue, isClosed, isFuture,
    payStatus: payKey, payLabel,
    deposit : order['الوديعة المعلقة لدينا'] || '£0.00',
    pickup  : order['مكان الاستلام']  || '-',
    dropoff : order['مكان التسليم']   || '-',
    branch  : order['فرع الإصدار']    || '-'
  };

  const barEvents = `
    onmouseenter="showGanttTip(event,'${tipKey}')"
    onmouseleave="hideGanttTip()"
    onmouseover="this.style.filter='brightness(1.3)'"
    onmouseout="this.style.filter=''"
    onclick="event.stopPropagation();closeGanttTip();openOrderDetail('${order.id}')"`;

  let html = '';

  if (isFuture && barW > 0) {
    html += `
      <div style="position:absolute;left:${clampedStartPx}px;top:${barTop}px;
                  width:${barW}px;height:${barH}px;z-index:3;cursor:pointer;
                  border:2px dashed ${orderColor};border-radius:4px;
                  background:${orderColor}18;overflow:hidden;" ${barEvents}>
        <div style="height:${topH}px;background:${orderColor}30;
                    display:flex;align-items:center;padding:0 4px;
                    border-bottom:1px solid ${orderColor}44;">
          <span style="font-size:9px;font-weight:700;color:${orderColor};
                       white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${clientName}
          </span>
        </div>
        <div style="height:${botH}px;background:${payColor}22;
                    display:flex;align-items:center;padding:0 4px;">
          <span style="font-size:8px;font-weight:600;color:${payColor};
                       white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${payLabel}
          </span>
        </div>
      </div>`;

  } else if (barW > 0) {
    html += `
      <div style="position:absolute;left:${clampedStartPx}px;top:${barTop}px;
                  width:${barW}px;height:${barH}px;z-index:3;cursor:pointer;
                  border-radius:${tailW > 0 ? '4px 0 0 4px' : '4px'};
                  box-shadow:0 2px 6px rgba(0,0,0,0.35);
                  overflow:hidden;transition:filter 0.12s;" ${barEvents}>
        <div style="height:${topH}px;background:${orderColor};
                    display:flex;align-items:center;padding:0 5px;">
          <span style="font-size:9px;font-weight:700;color:#fff;
                       white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
                       text-shadow:0 1px 2px rgba(0,0,0,0.5);">
            ${clientName}
          </span>
        </div>
        <div style="height:${botH}px;background:${payColor};
                    display:flex;align-items:center;padding:0 5px;
                    border-top:1px solid rgba(255,255,255,0.15);">
          <span style="font-size:8px;font-weight:600;color:rgba(255,255,255,0.95);
                       white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
                       text-shadow:0 1px 2px rgba(0,0,0,0.5);">
            ${payLabel}
          </span>
        </div>
      </div>`;

    if (tailW > 0 && tailBg) {
      html += `
        <div style="position:absolute;left:${baseEndPx}px;top:${barTop}px;
                    width:${tailW}px;height:${barH}px;z-index:3;cursor:pointer;
                    background:${tailBg};border-radius:0 4px 4px 0;
                    box-shadow:0 2px 6px rgba(0,0,0,0.35);" ${barEvents}>
        </div>`;
    }
  }

  return html;
}

function _buildAssignmentInfo(lastOrd, today, DAY_PX) {
  if (!lastOrd) {
    return `<span style="font-size:10px;color:var(--text3);">
              Idle / No Assignment
            </span>`;
  }

  const { end: le } = getOrderDates(lastOrd);
  const lst  = getOrderStatus(lastOrd);
  const lt   = getOrderTotal(lastOrd);
  const lp   = getOrderPaid(lastOrd);
  const ld   = parseAmount(lastOrd['سعر السيارة اليومي بالجنيه المصري']) ||
    (lt / Math.max(1, parseFloat(lastOrd.rental_days || 1)));
  const lac  = lst === 'Accident';
  const lcl  = lst === 'Closed' || lastOrd.closed === true;
  const lov  = !lcl && le && today > le && (lst === 'Active' || lst === 'Overdue');

  if (lcl) {
    return `<span style="font-size:10px;color:var(--text3);">
              Idle / No Assignment
            </span>`;
  }

  if (lac) {
    const ldays = le ? Math.max(0, Math.ceil((today - le) / 86400000)) : 0;
    const ldbt  = Math.max(0, lt + (ldays * ld) - lp);
    return `
      <div style="font-size:10px;color:var(--orange);font-weight:700;">
        🚨 ACCIDENT
      </div>
      <div style="font-size:9px;color:var(--text2);">
        ${getOrderClientName(lastOrd) || '-'}
      </div>
      <div style="font-size:9px;color:var(--danger);">
        Debt: ${fmtMoney(ldbt)}
      </div>`;
  }

  if (lov) {
    const ldays = le ? Math.max(0, Math.ceil((today - le) / 86400000)) : 0;
    const ldbt  = Math.max(0, lt + (ldays * ld) - lp);
    return `
      <div style="font-size:10px;color:var(--danger);font-weight:700;">
        ⚠️ ${getOrderClientName(lastOrd) || '-'}
      </div>
      <div style="font-size:9px;color:var(--text3);">OVERDUE ${ldays}d</div>
      <div style="font-size:9px;color:var(--danger);">${fmtMoney(ldbt)}</div>`;
  }

  const payKey   = getPaymentStatus(lastOrd);
  const payColor = window.PAYMENT_STATUS_COLORS[payKey] || '#f59e0b';
  const payLbl   = getPaymentStatusLabel(lastOrd);

  return `
    <div style="font-size:10px;font-weight:700;">
      ${lastOrd['اسم العميل'] || '-'}
    </div>
    <div style="font-size:9px;color:var(--text3);">
      Ends: ${le ? fmtDateShort(le) : 'N/A'}
    </div>
    <div style="font-size:9px;color:${payColor};font-weight:600;">
      ${payLbl}
    </div>`;
}

function _buildBranchAvailBadges() {
  const avail = { HRG:0, ALX:0, CAI:0, RSH:0 };
  const keys  = {
    HRG: ['hurghada', 'الغردقة'],
    ALX: ['alexandria', 'اسكندرية'],
    CAI: ['cairo', 'قاهرة'],
    RSH: ['rashid', 'رشيد']
  };
  G.fleet.forEach(c => {
    if (getCarStatusCategory(c) !== 'available') return;
    const b = (c.Branch || c.City || c['المحافظة'] || '').toLowerCase();
    for (const [code, terms] of Object.entries(keys)) {
      if (terms.some(t => b.includes(t))) { avail[code]++; break; }
    }
  });
  return Object.entries(avail)
    .map(([code, n]) =>
      `<span style="font-size:8px;color:var(--success);font-weight:700;">
         ${code}:${n}
       </span>`)
    .join('');
}

function _updateGanttSummaryBar(cars) {
  const set = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
  };
  set('gsb-total',    cars.length);
  set('gsb-avail',    cars.filter(c => getCarStatusCategory(c) === 'available').length);
  set('gsb-rented',   cars.filter(c => getCarStatusCategory(c) === 'rented').length);
  set('gsb-accident', cars.filter(c => getCarStatusCategory(c) === 'accident').length);
  set('gsb-maint',    cars.filter(c => getCarStatusCategory(c) === 'maintenance').length);
}

// ============================================================
// GANTT DRAG
// ============================================================
window.initGanttDrag = function() {
  const wrap = document.getElementById('gantt-wrap');
  if (!wrap) return;
  wrap.style.overflowX = 'auto';
  wrap.style.overflowY = 'auto';
};

function _initGanttTouchDrag(el) {
  if (el._drag) return;
  el._drag = true;
  let dn = false, sx = 0, sl = 0, sy = 0, st = 0;

  el.addEventListener('mousedown', e => {
    if (e.button) return;
    dn = true; sx = e.clientX; sl = el.scrollLeft;
    sy = e.clientY; st = el.scrollTop;
    el.style.cursor = 'grabbing';
    e.preventDefault();
  });
  window.addEventListener('mouseup', () => {
    dn = false;
    if (el) el.style.cursor = 'grab';
  });
  window.addEventListener('mousemove', e => {
    if (!dn) return;
    el.scrollLeft = sl - (e.clientX - sx);
    el.scrollTop  = st - (e.clientY - sy);
  });
  el.addEventListener('touchstart', e => {
    sx = e.touches[0].clientX; sl = el.scrollLeft;
    sy = e.touches[0].clientY; st = el.scrollTop;
  }, { passive: true });
  el.addEventListener('touchmove', e => {
    el.scrollLeft = sl - (e.touches[0].clientX - sx);
    el.scrollTop  = st - (e.touches[0].clientY - sy);
  }, { passive: true });
}

// ============================================================
// GANTT TOOLTIP
// ============================================================
window.showGanttTip = function(e, tipKey) {
  const d = window.ganttData?.[tipKey];
  if (!d) return;
  const t = document.getElementById('gantt-tooltip');
  if (!t) return;

  const orderColor = ORDER_STATUS_COLORS[
    d.isAccident ? 'accident' : d.isOverdue ? 'overdue' :
    d.isClosed   ? 'closed'  : d.isFuture  ? 'future'  : 'active'
  ] || '#3b82f6';
  const payColor = window.PAYMENT_STATUS_COLORS[d.payStatus] || '#f59e0b';

  const badge = d.isAccident
    ? `<span style="background:#f97316;color:#fff;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:800;">🚨 ACCIDENT</span>`
    : d.isOverdue
    ? `<span style="background:#ef4444;color:#fff;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:800;">⚠️ OVERDUE</span>`
    : d.isClosed
    ? `<span style="background:#475569;color:#fff;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:800;">✅ CLOSED</span>`
    : d.isFuture
    ? `<span style="background:#8b5cf6;color:#fff;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:800;">📅 UPCOMING</span>`
    : `<span style="background:#3b82f6;color:#fff;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:800;">🚗 ACTIVE</span>`;

  t.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;
                margin-bottom:9px;">
      ${badge}
      <span style="font-size:10px;font-weight:800;color:var(--accent);">
        Order #${d.no}
      </span>
    </div>
    <div style="font-size:13px;font-weight:800;margin-bottom:2px;">${d.client}</div>
    <div style="font-size:10px;color:var(--text3);margin-bottom:9px;">
      CRM ID: ${d.clientId}
    </div>
    <div style="display:flex;gap:6px;margin-bottom:9px;flex-wrap:wrap;">
      <span style="padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;
                   background:${orderColor}22;color:${orderColor};
                   border:1px solid ${orderColor}44;">
        Order: ${d.status}
      </span>
      <span style="padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;
                   background:${payColor}22;color:${payColor};
                   border:1px solid ${payColor}44;">
        ${d.payLabel}
      </span>
    </div>
    <div style="display:grid;grid-template-columns:auto 1fr;
                gap:3px 10px;font-size:10px;margin-bottom:9px;">
      <span style="color:var(--text3);">Branch:</span>
      <span style="font-weight:600;">${d.branch}</span>
      <span style="color:var(--text3);">Pickup:</span>
      <span>${d.pickup}</span>
      <span style="color:var(--text3);">Dropoff:</span>
      <span>${d.dropoff}</span>
      <span style="color:var(--text3);">Start:</span>
      <span>${d.start}</span>
      <span style="color:var(--text3);">End:</span>
      <span>${d.end}</span>
    </div>
    <div style="background:${d.debt > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)'};
                border:1px solid ${d.debt > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'};
                border-radius:8px;padding:9px;font-size:11px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
        <span style="color:var(--text3);">Base:</span>
        <span style="font-weight:700;">${fmtMoney(d.total)}</span>
      </div>
      ${d.latePenalty > 0 ? `
        <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
          <span style="color:var(--danger);">+Penalty (${d.lateDays}d):</span>
          <span style="color:var(--danger);font-weight:700;">
            ${fmtMoney(d.latePenalty)}
          </span>
        </div>` : ''}
      <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
        <span style="color:var(--text3);">Paid:</span>
        <span style="color:var(--success);font-weight:700;">${fmtMoney(d.paid)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;
                  border-top:1px solid rgba(255,255,255,0.1);padding-top:5px;">
        <span style="font-weight:800;">Debt:</span>
        <span style="font-weight:900;font-size:13px;
                     color:${d.debt > 0 ? 'var(--danger)' : 'var(--success)'};">
          ${d.debt > 0 ? fmtMoney(d.debt) : '✅ CLEAR'}
        </span>
      </div>
    </div>
    <div style="text-align:center;margin-top:7px;font-size:9px;color:var(--text3);">
      Click bar to open order
    </div>`;

  t.style.display = 'block';
  const tx = Math.min(e.clientX + 14, window.innerWidth - 325);
  const ty = Math.min(e.clientY - 10,  window.innerHeight - 480);
  t.style.left = Math.max(5, tx) + 'px';
  t.style.top  = Math.max(5, ty) + 'px';
};

window.hideGanttTip  = function() {
  const t = document.getElementById('gantt-tooltip');
  if (t) t.style.display = 'none';
};
window.closeGanttTip = function() { hideGanttTip(); };

// ============================================================
// CAR DETAIL MODAL
// ============================================================
window.openCarDetailModal = async function(carId) {
  pushNav('Car ' + carId, () => openCarDetailModal(carId));
  const car = G.fleet.find(c => String(c.ID || c.id) === String(carId));
  if (!car) { toast('Car not found', 'error'); return; }

  const isPriv      = ['Admin', 'Executive'].includes(G.user?.role);
  const catStatus   = getCarStatusCategory(car);
  const statusColors= {
    available  : 'var(--success)',
    rented     : 'var(--accent)',
    accident   : 'var(--danger)',
    maintenance: 'var(--warning)',
    archived   : 'var(--text3)'
  };
  const dotColor = statusColors[catStatus] || 'var(--text3)';
  const plateStr = formatPlate(car);

  // ✅ Load rate card for this car
  const tiers = await getRateTiersForCar(String(car.id || car.ID));

  const html = `
    <div style="display:flex;align-items:center;gap:12px;padding:11px 13px;
                border-radius:9px;margin-bottom:14px;
                background:${catStatus === 'accident'   ? 'rgba(239,68,68,0.1)'  :
                             catStatus === 'maintenance' ? 'rgba(245,158,11,0.1)' :
                             catStatus === 'available'   ? 'rgba(34,197,94,0.1)'  :
                             'rgba(59,130,246,0.1)'};
                border:1px solid ${dotColor}30;">
      <div style="width:36px;height:36px;border-radius:50%;background:${dotColor}22;
                  display:flex;align-items:center;justify-content:center;font-size:18px;">
        ${catStatus === 'accident'    ? '🚨' :
          catStatus === 'maintenance' ? '🔧' :
          catStatus === 'rented'      ? '🔵' :
          catStatus === 'archived'    ? '📦' : '🟢'}
      </div>
      <div>
        <div style="font-size:13px;font-weight:800;">${getCarLabel(car, 'en')}</div>
        <div style="font-size:11px;color:${dotColor};font-weight:700;margin-top:2px;">
          ${catStatus.toUpperCase()} | ID: ${car.ID || car.id}
          ${plateStr ? `| ${plateStr}` : ''}
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-bottom:14px;">
      <!-- Vehicle Info -->
      <div class="panel">
        <div style="font-size:10px;font-weight:800;color:var(--accent);
                    text-transform:uppercase;margin-bottom:9px;">🚗 Vehicle Info</div>
        <div style="font-size:11px;display:grid;
                    grid-template-columns:auto 1fr;gap:4px 10px;">
          <span style="color:var(--text3);">Model:</span>
          <span style="font-weight:700;">${car.model || car.Type || '-'}</span>
          <span style="color:var(--text3);">Year:</span>
          <span>${car.year || car['سنة الصنع'] || '-'}</span>
          <span style="color:var(--text3);">Color:</span>
          <span>${car.Color || car['اللون'] || '-'}</span>
          <span style="color:var(--text3);">Plate:</span>
          <span style="font-weight:700;">${plateStr || '—'}</span>
          <span style="color:var(--text3);">Seats:</span>
          <span>${car['Seat No.'] || car['عدد المقاعد'] || '-'}</span>
          <span style="color:var(--text3);">Trans.:</span>
          <span>${car['Transm. Type'] || car['نوع ناقل الحركة'] || '-'}</span>
          <span style="color:var(--text3);">KM:</span>
          <span>${car['كيلومتر تعاقد'] || '-'}</span>
        </div>
      </div>

      <!-- Contract Info -->
      <div class="panel">
        <div style="font-size:10px;font-weight:800;color:var(--accent);
                    text-transform:uppercase;margin-bottom:9px;">📋 Contract Info</div>
        <div style="font-size:11px;display:grid;
                    grid-template-columns:auto 1fr;gap:4px 10px;">
          <span style="color:var(--text3);">Status:</span>
          <span style="font-weight:700;color:${dotColor};">
            ${car.Contract || car['حاله التعاقد'] || '-'}
          </span>
          <span style="color:var(--text3);">License:</span>
          <span>
            ${fmtDateShort(parseDBDate(car['نهاية الترخيص'] || '')) || '-'}
          </span>
          <span style="color:var(--text3);">Insurance:</span>
          <span>
            ${fmtDateShort(parseDBDate(car['نهاية التأمين'] || '')) || '-'}
          </span>
          <span style="color:var(--text3);">Contract end:</span>
          <span>
            ${fmtDateShort(parseDBDate(car['نهاية التعاقد'] || '')) || '-'}
          </span>
          <span style="color:var(--text3);">Monthly fee:</span>
          <span style="font-weight:700;">
            ${fmtMoney(parseAmount(car['monthly_fee'] || car['القيمة المالية'] || 0))}
          </span>
        </div>
      </div>
    </div>

    <!-- ✅ Rate Card section -->
    <div style="margin-bottom:14px;padding:10px 12px;background:var(--surface2);
                border:1px solid var(--border);border-radius:9px;">
      <div style="display:flex;align-items:center;justify-content:space-between;
                  margin-bottom:8px;">
        <div style="font-size:10px;font-weight:800;color:var(--accent);
                    text-transform:uppercase;">💰 Rate Card</div>
        ${isPriv ? `
          <button class="btn btn-ghost btn-xs"
            onclick="openRateCardEditor('${car.id || car.ID}')">
            ✏️ Edit Rates
          </button>` : ''}
      </div>
      ${tiers.length > 0
        ? buildRateTierDisplay(tiers)
        : `<div style="font-size:11px;color:var(--text3);">
             No rate card set.
             ${isPriv ? `<span style="color:var(--accent);cursor:pointer;"
               onclick="openRateCardEditor('${car.id || car.ID}')">
               Click to add rates
             </span>` : ''}
           </div>`}
    </div>

    <!-- Location -->
    <div style="margin-bottom:14px;padding:10px 12px;background:var(--surface2);
                border:1px solid var(--border);border-radius:9px;">
      <div style="font-size:10px;font-weight:800;color:var(--accent);
                  text-transform:uppercase;margin-bottom:8px;">📍 Current Location</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
        <select id="car-location-select-${car.id}" class="form-input"
          style="flex:1;min-width:160px;">
          <option value="">-- Select Location --</option>
          <option value="HRG-Office">Hurghada Office</option>
          <option value="HRG-Airport">Hurghada Airport</option>
          <option value="ALX-Office">Alexandria Office</option>
          <option value="CAI-Office">Cairo Office</option>
          <option value="RSH-Office">Rashid Office</option>
          <option value="With Client">With Client</option>
          <option value="Workshop">Workshop / Service</option>
          <option value="Other">Other</option>
        </select>
        <input type="text" id="car-location-detail-${car.id}" class="form-input"
          style="flex:1;min-width:140px;" placeholder="Detail / notes..."
          value="${car.current_location_detail || ''}">
        <button class="btn btn-primary btn-sm"
          onclick="saveCarLocation('${car.id}')">💾 Save</button>
      </div>
      <div style="font-size:10px;color:var(--text3);margin-top:5px;">
        Current: <strong>${car.current_location || 'Not set'}</strong>
        ${car.current_location_updated
          ? ' (updated: ' + car.current_location_updated + ')' : ''}
      </div>
    </div>

    <!-- Actions -->
    <div style="display:flex;gap:7px;flex-wrap:wrap;">
      <button class="btn btn-primary"
        onclick="closeModal();showPage('vehicle-360');
          setTimeout(()=>{
            const s=document.getElementById('v360-car-select');
            if(s){s.value='${car.ID||car.id}';loadVehicle360Details();}
          },300)">
        🔭 Vehicle 360
      </button>
      ${isPriv ? `
        <button class="btn btn-warning"
          onclick="openCarEditModal('${car.ID || car.id}')">
          ✏️ Edit Status
        </button>` : ''}
      <button class="btn btn-ghost" onclick="closeModal()">Close</button>
      <button class="btn btn-ghost btn-sm"
        onclick="createTaskFromCar('${car.id}')">📌 Task</button>
      <button class="btn btn-ghost btn-sm"
        onclick="closeModal();showPage('order-book');
          setTimeout(()=>{
            const s=document.getElementById('ob-search');
            if(s){s.value='${plateStr}';filterOrders();}
          },300)">
        📋 Orders
      </button>
    </div>
  `;

  openModal(`🚗 ${getCarLabel(car, 'en')}`, html, true);
  setTimeout(() => {
    const sel = document.getElementById('car-location-select-' + car.id);
    if (sel && car.current_location) sel.value = car.current_location;
  }, 100);
  await logAction('VIEW', 'Fleet Radar', `Viewed car: ${getCarLabel(car, 'en')}`);
};

// ============================================================
// RATE CARD EDITOR MODAL
// ============================================================
window.openRateCardEditor = async function(carId) {
  if (!['Admin', 'Executive'].includes(G.user?.role)) {
    toast('Admin access required', 'error'); return;
  }
  const car   = getCarById(String(carId));
  if (!car)   { toast('Car not found', 'error'); return; }

  const tiers = await getRateTiersForCar(String(carId));
  const label = getCarLabel(car, 'en');
  const plate = formatPlate(car);

  // Build initial rows
  const initTiers = tiers.length > 0 ? tiers : [
    { min_days:1,  max_days:3,  daily_rate:0 },
    { min_days:4,  max_days:7,  daily_rate:0 },
    { min_days:8,  max_days:14, daily_rate:0 },
    { min_days:15, max_days:29, daily_rate:0 },
    { min_days:30, max_days:null, daily_rate:0 }
  ];

  const html = `
    <div style="display:grid;gap:12px;">
      <div style="background:var(--surface2);border-radius:8px;padding:10px 12px;
                  font-size:12px;">
        <strong>${label}</strong>
        ${plate ? `<span style="color:var(--text3);"> | ${plate}</span>` : ''}
      </div>

      <div style="font-size:11px;color:var(--text3);">
        Set daily rates per number of rental days.
        Each tier applies when rental days fall within the range.
      </div>

      <div id="rate-tier-rows" style="display:grid;gap:6px;">
        ${initTiers.map((t, i) => _buildRateTierRow(t, i)).join('')}
      </div>

      <button class="btn btn-ghost btn-sm" onclick="addRateTierRow()">
        ➕ Add Tier
      </button>

      <div style="display:flex;gap:8px;margin-top:4px;">
        <button class="btn btn-success" style="flex:1;"
          onclick="submitRateCard('${carId}')">
          💾 Save Rate Card
        </button>
        <button class="btn btn-ghost" style="flex:1;"
          onclick="closeModal()">Cancel</button>
      </div>
    </div>
  `;

  openModal(`💰 Rate Card — ${label}`, html);

  // Store tier count for dynamic add
  window._rateTierCount = initTiers.length;
};

function _buildRateTierRow(tier, index) {
  return `
    <div id="rate-row-${index}"
      style="display:grid;grid-template-columns:1fr 1fr 1fr auto;
             gap:6px;align-items:center;">
      <div>
        <label style="font-size:10px;color:var(--text3);">
          Min Days
        </label>
        <input type="number" id="tier-min-${index}" min="1"
          value="${tier.min_days || 1}"
          style="width:100%;padding:6px 8px;background:var(--surface2);
                 border:1px solid var(--border);border-radius:6px;
                 color:var(--text);font-size:11px;"/>
      </div>
      <div>
        <label style="font-size:10px;color:var(--text3);">
          Max Days (blank = unlimited)
        </label>
        <input type="number" id="tier-max-${index}" min="1"
          value="${tier.max_days || ''}"
          placeholder="∞"
          style="width:100%;padding:6px 8px;background:var(--surface2);
                 border:1px solid var(--border);border-radius:6px;
                 color:var(--text);font-size:11px;"/>
      </div>
      <div>
        <label style="font-size:10px;color:var(--text3);">
          Daily Rate (EGP)
        </label>
        <input type="number" id="tier-rate-${index}" min="0"
          value="${tier.daily_rate || ''}"
          placeholder="0"
          style="width:100%;padding:6px 8px;background:var(--surface2);
                 border:1px solid var(--border);border-radius:6px;
                 color:var(--text);font-size:11px;"/>
      </div>
      <button class="btn btn-danger btn-xs" style="margin-top:16px;"
        onclick="removeRateTierRow(${index})">✕</button>
    </div>`;
}

window.addRateTierRow = function() {
  const container = document.getElementById('rate-tier-rows');
  if (!container) return;
  const idx  = window._rateTierCount || 0;
  const prev = document.getElementById(`tier-max-${idx - 1}`);
  const prevMax = prev ? parseInt(prev.value) || 0 : 0;
  const newDiv = document.createElement('div');
  newDiv.innerHTML = _buildRateTierRow(
    { min_days: prevMax + 1, max_days: null, daily_rate: 0 },
    idx
  );
  container.appendChild(newDiv.firstElementChild);
  window._rateTierCount = idx + 1;
};

window.removeRateTierRow = function(index) {
  const row = document.getElementById('rate-row-' + index);
  if (row) row.remove();
};

window.submitRateCard = async function(carId) {
  const tiers = [];
  let i = 0;
  while (true) {
    const minEl  = document.getElementById(`tier-min-${i}`);
    const maxEl  = document.getElementById(`tier-max-${i}`);
    const rateEl = document.getElementById(`tier-rate-${i}`);
    if (!minEl) break;

    const min  = parseInt(minEl.value)  || 1;
    const max  = maxEl.value ? parseInt(maxEl.value) : null;
    const rate = parseFloat(rateEl.value) || 0;

    tiers.push({ min_days: min, max_days: max, daily_rate: rate });
    i++;
  }

  if (!tiers.length || tiers.every(t => t.daily_rate <= 0)) {
    toast('Please enter at least one rate greater than 0', 'error');
    return;
  }

  const car    = getCarById(String(carId));
  const branch = getCarBranchCode(car) || '';
  const ok     = await saveRateCard(carId, tiers, branch);

  if (ok) {
    closeModal();
    // Reopen car detail to show updated rates
    setTimeout(() => openCarDetailModal(carId), 300);
  }
};

// ============================================================
// SAVE CAR LOCATION
// ============================================================
window.saveCarLocation = async function(carId) {
  const sel      = document.getElementById('car-location-select-' + carId);
  const det      = document.getElementById('car-location-detail-' + carId);
  const location = sel?.value || '';
  const detail   = det?.value || '';
  try {
    await db.collection('fleet').doc(carId).update({
      current_location         : location,
      current_location_detail  : detail,
      current_location_updated : new Date().toISOString().slice(0, 10),
      current_location_updated_by: G.user?.username || ''
    }, { merge: true });
    const idx = G.fleet.findIndex(c => c.id === carId);
    if (idx >= 0) {
      G.fleet[idx].current_location        = location;
      G.fleet[idx].current_location_detail = detail;
      G.fleet[idx].current_location_updated= new Date().toISOString().slice(0, 10);
    }
    toast('✅ Location updated: ' + location, 'success');
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  }
};

// ============================================================
// CAR EDIT MODAL
// ============================================================
window.openCarEditModal = async function(carId) {
  const car = G.fleet.find(c => String(c.ID || c.id) === String(carId));
  if (!car) return;
  closeModal();

  const html = `
    <p style="font-size:11px;color:var(--text3);margin-bottom:13px;">
      Editing: <strong>${getCarLabel(car, 'en')}</strong>
    </p>
    <div class="form-grid">
      <div class="field">
        <label>Contract Status</label>
        <select id="ce-contract">
          <option value="Valid"
            ${(car.Contract || '') === 'Valid'       ? 'selected' : ''}>Valid</option>
          <option value="Maintenance"
            ${(car.Contract || '') === 'Maintenance' ? 'selected' : ''}>Maintenance</option>
          <option value="Accident"
            ${(car.Contract || '') === 'Accident'    ? 'selected' : ''}>Accident</option>
          <option value="Finished"
            ${(car.Contract || '') === 'Finished'    ? 'selected' : ''}>Finished</option>
        </select>
      </div>
      <div class="field">
        <label>Availability Status</label>
        <select id="ce-status">
          <option value="available"
            ${(car.status || '') === 'available'    ? 'selected' : ''}>Available</option>
          <option value="rented"
            ${(car.status || '') === 'rented'       ? 'selected' : ''}>Rented</option>
          <option value="maintenance"
            ${(car.status || '') === 'maintenance'  ? 'selected' : ''}>Maintenance</option>
          <option value="accident"
            ${(car.status || '') === 'accident'     ? 'selected' : ''}>Accident</option>
          <option value="out_of_service"
            ${(car.status || '') === 'out_of_service'? 'selected' : ''}>
            Out of Service
          </option>
        </select>
      </div>
      <div class="field">
        <label>Current KM</label>
        <input type="number" id="ce-km"
          value="${car['كيلومتر تعاقد'] || ''}"/>
      </div>
      <div class="field">
        <label>GPS Status</label>
        <select id="ce-gps">
          <option value="لا يوجد"
            ${(car['GPS Stat.'] || '') === 'لا يوجد' ? 'selected' : ''}>
            No GPS
          </option>
          <option value="يعمل"
            ${(car['GPS Stat.'] || '') === 'يعمل'    ? 'selected' : ''}>
            Working
          </option>
          <option value="لا يعمل"
            ${(car['GPS Stat.'] || '') === 'لا يعمل' ? 'selected' : ''}>
            Not Working
          </option>
        </select>
      </div>
      <div class="field" style="grid-column:1/-1;">
        <label>Notes</label>
        <input type="text" id="ce-notes"
          value="${(car.Notes || car['ملاحظات'] || '').replace(/"/g, '&quot;')}"/>
      </div>
    </div>
    <div style="display:flex;gap:7px;margin-top:13px;">
      <button class="btn btn-success"
        onclick="saveCarEdit('${car.id}')">💾 Save Changes</button>
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    </div>
  `;
  openModal(`✏️ Edit Car — #${car.ID || car.id}`, html);
};

window.saveCarEdit = async function(docId) {
  try {
    const upd = {
      Contract        : document.getElementById('ce-contract')?.value || 'Valid',
      status          : document.getElementById('ce-status')?.value   || 'available',
      'كيلومتر تعاقد': document.getElementById('ce-km')?.value       || '',
      'GPS Stat.'     : document.getElementById('ce-gps')?.value      || '',
      Notes           : document.getElementById('ce-notes')?.value    || '',
      _sys_updated    : Date.now()
    };
    await db.collection('fleet').doc(docId).update(upd);
    const idx = G.fleet.findIndex(c => c.id === docId);
    if (idx > -1) G.fleet[idx] = { ...G.fleet[idx], ...upd };
    await logAction('EDIT', 'Fleet Radar', `Updated car: ${docId}`);
    toast('Car updated successfully!', 'success');
    closeModal();
    const active = document.querySelector('.page-section.active');
    if (active?.id === 'page-fleet-radar') renderGantt();
  } catch (e) {
    toast('Update failed: ' + e.message, 'error');
  }
};

// ============================================================
// CAR INFO BADGE
// ============================================================
window.showCarInfoBadge = function(carId, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!carId) { container.className = 'car-info-badge'; return; }
  const car = getCarById(carId);
  if (!car)  { container.className = 'car-info-badge'; return; }
  const cat      = getCarStatusCategory(car);
  const plateStr = formatPlate(car);
  const statusLabel = {
    available  : '🟢 Available',
    rented     : '🔵 Rented',
    accident   : '🔴 Accident',
    maintenance: '🟡 Maintenance'
  }[cat] || '⚪ Unknown';

  container.className = 'car-info-badge visible';
  container.innerHTML = [
    { label:'Plate',    value: plateStr || '—' },
    { label:'Year',     value: car.year || car['سنة الصنع'] || '-' },
    { label:'Color',    value: car.Color || car['اللون'] || '-' },
    { label:'Seats',    value: car['Seat No.'] || car['عدد المقاعد'] || '-' },
    { label:'Status',   value: statusLabel },
    { label:'KM',       value: car['كيلومتر تعاقد'] || '-' },
    { label:'Contract', value: car.Contract || car['حاله التعاقد'] || '-' },
    { label:'Until',    value: car['تاريخ التسليم']
        ? fmtDateShort(parseDBDate(car['تاريخ التسليم'])) : '-' },
    { label:'Owner',    value: ((car['الاسم الأول'] || '') + ' ' +
        (car['الاسم الأخير'] || '')).trim() || '-' }
  ].map(f =>
    `<div class="cib-field"><label>${f.label}</label><span>${f.value}</span></div>`
  ).join('');
};

// ============================================================
// VEHICLE 360 PAGE
// ============================================================
async function _renderVehicle360Full() {
  const el = document.getElementById('page-vehicle-360');
  if (!el) return;
  if (!G.fleet || !G.fleet.length) await loadFleetData();

  const hKey      = 'v360_header_collapsed';
  const collapsed = localStorage.getItem(hKey) === 'true';

  el.innerHTML = `
    <!-- Collapsible header -->
    <div style="background:var(--surface2);border:1px solid var(--border);
                border-radius:var(--radius);margin-bottom:14px;overflow:hidden;">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;
                  padding:10px 14px;cursor:pointer;"
           onclick="toggleV360Header()">
        <div style="flex:1;">
          <div style="display:flex;align-items:center;gap:8px;">
            <h2 style="margin:0;font-size:16px;font-weight:800;">🔭 Vehicle 360</h2>
            <span style="color:var(--text3);font-size:11px;">
              Complete financial and operational view per vehicle
            </span>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;"
             onclick="event.stopPropagation()">
          <button class="btn btn-ghost btn-sm"
            onclick="_renderVehicle360Full()">🔄 Refresh</button>
          <button id="v360-toggle-btn"
            onclick="toggleV360Header()"
            style="background:var(--surface);border:1px solid var(--border);
                   border-radius:6px;padding:3px 8px;cursor:pointer;
                   color:var(--text3);font-size:11px;">
            ${collapsed ? '▼ Show' : '▲ Hide'}
          </button>
        </div>
      </div>

      <div id="v360-header-collapsible"
        style="overflow:hidden;transition:max-height 0.3s ease;
               max-height:${collapsed ? '0px' : '200px'};">
        <div style="padding:0 14px 12px;">
          <div style="display:flex;gap:7px;">
            <button id="v360-tab-active"
              onclick="window._v360Tab='active';_v360SwitchTab()"
              class="btn btn-ghost btn-sm"
              style="border-color:var(--accent);color:var(--accent);">
              ✅ Active Contracts
            </button>
            <button id="v360-tab-all"
              onclick="window._v360Tab='all';_v360SwitchTab()"
              class="btn btn-ghost btn-sm">
              🚗 All Cars (${G.fleet.length})
            </button>
            <button id="v360-tab-archived"
              onclick="window._v360Tab='archived';_v360SwitchTab()"
              class="btn btn-ghost btn-sm">
              📦 Archived
            </button>
          </div>
        </div>
      </div>
    </div>

    <select id="v360-car-select" onchange="loadVehicle360Details()"
      style="display:none;"></select>

    <div id="v360-car-grid"
      style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));
             gap:12px;margin-bottom:18px;">
    </div>

    <div id="v360-content">
      <div class="empty-state">
        <div class="es-icon">🔭</div>
        <p style="font-size:13px;font-weight:700;margin-bottom:5px;">
          Select a vehicle above
        </p>
        <p>View complete financials, rental history, expenses and owner details</p>
      </div>
    </div>
  `;

  window._v360Tab = 'active';
  _v360RenderGrid();

  window.toggleV360Header = function() {
    const body = document.getElementById('v360-header-collapsible');
    const btn  = document.getElementById('v360-toggle-btn');
    if (!body) return;
    const isNowCollapsed = body.style.maxHeight !== '0px';
    body.style.maxHeight = isNowCollapsed ? '0px' : '200px';
    if (btn) btn.textContent = isNowCollapsed ? '▼ Show' : '▲ Hide';
    localStorage.setItem(hKey, isNowCollapsed ? 'true' : 'false');
  };

  window._v360SwitchTab = function() {
    ['active', 'all', 'archived'].forEach(t => {
      const btn = document.getElementById('v360-tab-' + t);
      if (!btn) return;
      const on = window._v360Tab === t;
      btn.style.borderColor = on ? 'var(--accent)' : 'var(--border)';
      btn.style.color       = on ? 'var(--accent)' : 'var(--text2)';
    });
    _v360RenderGrid();
  };
}

function _v360RenderGrid() {
  const gridEl = document.getElementById('v360-car-grid');
  if (!gridEl) return;

  let cars = G.fleet;
  const tab = window._v360Tab || 'active';

  if (tab === 'active') {
    cars = G.fleet.filter(c => {
      const cat      = getCarStatusCategory(c);
      if (cat === 'archived') return false;
      const contract = String(c.Contract || c['حاله التعاقد'] || '').toLowerCase();
      return contract === 'valid' || contract === 'ساري' ||
             cat === 'rented'    || cat === 'available'  ||
             cat === 'accident'  || cat === 'maintenance';
    });
  } else if (tab === 'archived') {
    cars = G.fleet.filter(c =>
      c.archived === true || c.is_active === false ||
      getCarStatusCategory(c) === 'archived'
    );
  }

  if (!cars.length) {
    gridEl.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--text3);">
        No cars in this category
      </div>`;
    return;
  }

  const groups = {};
  cars.forEach(c => {
    const type = (c.col_C || c['النوع'] || c.Type || 'Other').toString().trim() || 'Other';
    if (!groups[type]) groups[type] = [];
    groups[type].push(c);
  });

  const statusColors = {
    available  : '#22c55e',
    rented     : '#3b82f6',
    accident   : '#ef4444',
    maintenance: '#f59e0b',
    archived   : '#64748b'
  };

  let html = '';
  Object.keys(groups).sort().forEach(type => {
    html += `
      <div style="grid-column:1/-1;font-size:11px;font-weight:800;color:var(--accent);
                  text-transform:uppercase;letter-spacing:0.08em;
                  padding:6px 0 4px;border-bottom:1px solid var(--border);
                  margin-bottom:2px;">
        ${type}
        <span style="font-size:9px;color:var(--text3);font-weight:400;">
          (${groups[type].length})
        </span>
      </div>`;

    html += groups[type].map(c => {
      const cat      = getCarStatusCategory(c);
      const dot      = statusColors[cat] || '#64748b';
      const en       = getCarLabel(c, 'en');
      const plateStr = formatPlate(c);
      const fee      = c.monthly_fee || c['col_CJ'] || '';
      return `
        <div style="background:var(--surface2);border:1px solid var(--border);
                    border-radius:10px;padding:12px;cursor:pointer;
                    transition:all 0.2s;"
             onmouseover="this.style.borderColor='var(--accent)';
                          this.style.transform='translateY(-2px)'"
             onmouseout="this.style.borderColor='var(--border)';
                         this.style.transform=''"
             onclick="loadVehicle360ById('${c.id}')">
          <div style="font-size:22px;text-align:center;margin-bottom:6px;">🚗</div>
          <div style="font-size:11px;font-weight:800;white-space:nowrap;
                      overflow:hidden;text-overflow:ellipsis;" title="${en}">
            ${en || '—'}
          </div>
          <div style="display:flex;align-items:center;gap:5px;margin-top:6px;">
            <span style="width:8px;height:8px;border-radius:50%;
                         background:${dot};flex-shrink:0;"></span>
            <span style="font-size:9px;color:var(--text3);">${cat}</span>
          </div>
          <div style="font-size:10px;color:var(--text3);margin-top:4px;">
            🔢 ${plateStr || 'No plate'}
          </div>
          <div style="font-size:9px;color:var(--text3);margin-top:2px;">
            📍 ${c.current_location || 'Location unknown'}
          </div>
          ${fee ? `
            <div style="font-size:10px;color:var(--success);margin-top:2px;">
              💰 ${fee}/mo
            </div>` : ''}
        </div>`;
    }).join('');
  });

  gridEl.innerHTML = html;
}

window.loadVehicle360ById = function(carDocId) {
  const sel = document.getElementById('v360-car-select');
  if (!sel) return;
  if (!sel.querySelector(`option[value="${carDocId}"]`)) {
    const opt = document.createElement('option');
    opt.value = carDocId;
    sel.appendChild(opt);
  }
  sel.value = carDocId;
  loadVehicle360Details();
  const content = document.getElementById('v360-content');
  if (content) content.scrollIntoView({ behavior:'smooth', block:'start' });
};

window.loadVehicle360Details = async function() {
  const carId  = document.getElementById('v360-car-select')?.value;
  const content= document.getElementById('v360-content');
  if (!content) return;

  if (!carId) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="es-icon">🔭</div>
        <p>Select a vehicle to view details</p>
      </div>`;
    return;
  }

  content.innerHTML = `
    <div class="empty-state">
      <div class="spinner lg"></div>
      <p style="margin-top:11px;">Loading vehicle data...</p>
    </div>`;

  const car = getCarById(carId);
  if (!car) {
    content.innerHTML = `<div class="empty-state"><p>Car not found.</p></div>`;
    return;
  }

  try {
    const possibleIds = new Set([
      String(car.ID  || '').trim(),
      String(car.id  || '').trim(),
      String(parseInt(car.ID  || 0) || '').trim()
    ].filter(x => x && x !== '0'));

    const ordersAll = (window.allOrders && window.allOrders.length > 0)
      ? window.allOrders : (G.bookings || []);

    const orders = ordersAll.filter(o => {
      const bId  = String(o['كود السيارة'] || '').trim();
      if (!bId) return false;
      if (possibleIds.has(bId)) return true;
      const bNum = String(parseInt(bId) || '');
      for (const pid of possibleIds) {
        const pNum = String(parseInt(pid) || '');
        if (pNum && pNum !== '0' && pNum === bNum) return true;
      }
      return false;
    });

    const cacheKey = '_carExpCache_' + carId;
    if (!window[cacheKey] || Date.now() - window[cacheKey + '_t'] > 60000) {
      const snap      = await db.collection('car_expenses').get();
      window[cacheKey]= snap.docs.map(d => ({ id:d.id, ...d.data() }));
      window[cacheKey + '_t'] = Date.now();
    }
    const carExps = window[cacheKey].filter(e => {
      const eCarId = String(e['كود السيارة'] || '').trim();
      if (possibleIds.has(eCarId)) return true;
      return orders.some(o => String(o['No.']) === String(e['كود الاوردر']));
    });

    const totalRevenue  = orders.reduce((s, o) => s + getOrderTotal(o), 0);
    const totalPaid     = orders.reduce((s, o) => s + getOrderPaid(o), 0);
    const totalExpenses = carExps.reduce((s, e) => s + parseAmount(e['قيمة المصروف']), 0);
    const netROI        = totalPaid - totalExpenses;
    const isPriv        = ['Admin', 'Executive'].includes(G.user?.role);
    const plateStr      = formatPlate(car);

    // Load rate card tiers for display
    const tiers = await getRateTiersForCar(String(car.id || car.ID));

    content.innerHTML = `
      <!-- KPI Row -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));
                  gap:10px;margin-bottom:16px;">
        <div class="kpi-card">
          <div class="kpi-label">Total Revenue</div>
          <div class="kpi-value text-success">${fmtMoney(totalRevenue)}</div>
          <div class="kpi-sub">${orders.length} orders</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Collected</div>
          <div class="kpi-value text-success">${fmtMoney(totalPaid)}</div>
          <div class="kpi-sub">Cash received</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Car Expenses</div>
          <div class="kpi-value text-danger">${fmtMoney(totalExpenses)}</div>
          <div class="kpi-sub">${carExps.length} records</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Net ROI</div>
          <div class="kpi-value"
            style="color:${netROI >= 0 ? 'var(--success)' : 'var(--danger)'};">
            ${fmtMoney(netROI)}
          </div>
          <div class="kpi-sub">Collected - Expenses</div>
        </div>
      </div>

      <!-- Rate Card in V360 -->
      ${tiers.length > 0 ? `
        <div class="panel" style="margin-bottom:14px;">
          <div style="display:flex;align-items:center;justify-content:space-between;
                      margin-bottom:10px;">
            <h3 style="font-size:13px;font-weight:800;">💰 Rate Card</h3>
            ${isPriv ? `
              <button class="btn btn-ghost btn-xs"
                onclick="openRateCardEditor('${car.id || car.ID}')">
                ✏️ Edit
              </button>` : ''}
          </div>
          ${buildRateTierDisplay(tiers)}
        </div>` : isPriv ? `
        <div class="panel" style="margin-bottom:14px;text-align:center;padding:14px;">
          <button class="btn btn-ghost btn-sm"
            onclick="openRateCardEditor('${car.id || car.ID}')">
            ➕ Add Rate Card
          </button>
        </div>` : ''}

      <!-- Rental History -->
      <div class="panel" style="margin-bottom:14px;">
        <div style="display:flex;align-items:center;justify-content:space-between;
                    margin-bottom:11px;">
          <h3 style="font-size:13px;font-weight:800;">
            📋 Rental History (${orders.length} orders)
          </h3>
        </div>
        ${orders.length === 0
          ? '<div class="empty-state" style="padding:20px;"><p>No orders found.</p></div>'
          : `<div class="table-wrap">
               <table class="data-table">
                 <thead>
                   <tr>
                     <th>Order #</th><th>Client</th>
                     <th>Start</th><th>End</th>
                     <th>Total</th><th>Paid</th>
                     <th>Order Status</th><th>Payment</th>
                   </tr>
                 </thead>
                 <tbody>
                   ${orders
                     .sort((a, b) => {
                       const { start:as } = getOrderDates(a);
                       const { start:bs } = getOrderDates(b);
                       return (bs || 0) - (as || 0);
                     })
                     .map(o => {
                       const { start, end } = getOrderDates(o);
                       const st    = getOrderStatus(o);
                       const sk    = st === 'Accident' ? 'accident'
                                   : st === 'Overdue'  ? 'overdue'
                                   : st === 'Closed'   ? 'closed' : 'active';
                       const payK  = getPaymentStatus(o);
                       const payLbl= getPaymentStatusLabel(o);
                       const payC  = window.PAYMENT_STATUS_COLORS[payK] || '#f59e0b';
                       return `
                         <tr style="cursor:pointer;"
                             onclick="openOrderDetail('${o.id}')">
                           <td>
                             <span style="color:var(--accent);font-weight:700;">
                               #${getOrderNo(o)}
                             </span>
                           </td>
                           <td>${getOrderClientName(o) || '—'}</td>
                           <td style="font-size:10px;">
                             ${start ? fmtDate(start) : '—'}
                           </td>
                           <td style="font-size:10px;">
                             ${end ? fmtDate(end) : '—'}
                           </td>
                           <td>${fmtMoney(getOrderTotal(o))}</td>
                           <td>${fmtMoney(getOrderPaid(o))}</td>
                           <td>
                             <span class="pill pill-${sk}">${st}</span>
                           </td>
                           <td>
                             <span style="font-size:10px;font-weight:700;
                                          color:${payC};">
                               ${payLbl}
                             </span>
                           </td>
                         </tr>`;
                     }).join('')}
                 </tbody>
               </table>
             </div>`}
      </div>

      <!-- Actions -->
      <div style="display:flex;gap:7px;flex-wrap:wrap;">
        <button class="btn btn-primary"
          onclick="showPage('fleet-radar')">📡 Fleet Radar</button>
        ${isPriv ? `
          <button class="btn btn-warning"
            onclick="openCarEditModal('${car.id}')">✏️ Edit Status</button>
          <button class="btn btn-ghost"
            onclick="openRateCardEditor('${car.id || car.ID}')">
            💰 Rate Card
          </button>` : ''}
      </div>
    `;

    await logAction('VIEW', 'Vehicle 360', `Viewed: ${getCarLabel(car, 'en')}`);

  } catch (e) {
    content.innerHTML = `<div class="empty-state"><p>Failed: ${e.message}</p></div>`;
    console.warn('V360 error:', e);
  }
};
