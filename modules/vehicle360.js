// ============================================================
// modules/vehicle360.js v4.1
// Vehicle 360 — complete financial and operational view
// Uses global getPaymentStatus / PAYMENT_STATUS_COLORS from utils.js
// ============================================================

// ============================================================
// ENTRY POINT
// ============================================================
window.renderVehicle360 = function() {
  renderPageLoading('page-vehicle-360', '🔭', 'Vehicle 360');
  _renderVehicle360Full();
};

// ============================================================
// MAIN PAGE BUILDER
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

      <!-- Collapsible tabs -->
      <div id="v360-header-collapsible"
        style="overflow:hidden;transition:max-height 0.3s ease;
               max-height:${collapsed ? '0px' : '200px'};">
        <div style="padding:0 14px 12px;">
          <div style="display:flex;gap:7px;flex-wrap:wrap;">
            <button id="v360-tab-active"
              onclick="window._v360Tab='active';_v360SwitchTab()"
              class="btn btn-sm"
              style="background:var(--accent);color:#fff;border:1px solid var(--accent);">
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

    <!-- Hidden select -->
    <select id="v360-car-select" onchange="loadVehicle360Details()"
      style="display:none;"></select>

    <!-- Car grid -->
    <div id="v360-car-grid"
      style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));
             gap:12px;margin-bottom:18px;"></div>

    <!-- Detail pane -->
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
    ['active','all','archived'].forEach(t => {
      const btn = document.getElementById('v360-tab-' + t);
      if (!btn) return;
      const on = window._v360Tab === t;
      btn.style.background  = on ? 'var(--accent)' : '';
      btn.style.color       = on ? '#fff'           : '';
      btn.style.borderColor = on ? 'var(--accent)'  : 'var(--border)';
    });
    _v360RenderGrid();
  };

  window._v360Tab = 'active';
  _v360RenderGrid();
}

// ============================================================
// CAR GRID
// ============================================================
function _v360RenderGrid() {
  const gridEl = document.getElementById('v360-car-grid');
  if (!gridEl) return;

  const tab = window._v360Tab || 'active';
  let cars   = [];

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
    cars = G.fleet.filter(c => getCarStatusCategory(c) === 'archived');
  } else {
    cars = [...G.fleet];
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
    const type = (c['النوع'] || c.Type || 'Other').toString().trim() || 'Other';
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
      const fee      = parseAmount(c['القيمة المالية'] || c.monthly_fee || 0);
      const conEnd   = c['نهاية التعاقد'] || '';
      return `
        <div style="background:var(--surface2);border:1px solid var(--border);
                    border-radius:10px;padding:12px;cursor:pointer;transition:all 0.2s;"
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
          <div style="display:flex;align-items:center;gap:5px;margin-top:5px;">
            <span style="width:8px;height:8px;border-radius:50%;
                         background:${dot};flex-shrink:0;"></span>
            <span style="font-size:9px;color:var(--text3);">${cat}</span>
          </div>
          <div style="font-size:10px;color:var(--text3);margin-top:3px;
                      font-family:monospace;">
            ${plateStr || '—'}
          </div>
          <div style="font-size:9px;color:var(--text3);margin-top:2px;">
            📍 ${c.current_location || '—'}
          </div>
          ${fee ? `
            <div style="font-size:10px;color:var(--success);margin-top:2px;">
              💰 ${fmtMoney(fee)}/mo
            </div>` : ''}
          ${conEnd ? `
            <div style="font-size:9px;color:var(--text3);margin-top:2px;">
              📅 Until ${conEnd}
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

// ============================================================
// VEHICLE DETAIL
// ============================================================
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
    content.innerHTML = `
      <div class="empty-state"><p>Car not found. Try refreshing.</p></div>`;
    return;
  }

  try {
    const possibleIds = new Set([
      String(car.ID  || '').trim(),
      String(car.id  || '').trim(),
      String(parseInt(car.ID  || 0) || '').trim(),
      String(parseInt(car.id  || 0) || '').trim()
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

    // Load car expenses (cached 60s)
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

    const today      = getCairoNow();
    const catStatus  = getCarStatusCategory(car);
    const isPriv     = ['Admin','Executive'].includes(G.user?.role);
    const plateStr   = formatPlate(car);

    // ── Financial calcs ──────────────────────────────────────
    const totalRevenue   = orders.reduce((s, o) => s + getOrderTotal(o), 0);
    const totalCollected = orders.reduce((s, o) => s + getOrderPaid(o), 0);
    const totalExpenses  = carExps.reduce((s, e) => s + parseAmount(e['قيمة المصروف']), 0);
    const netROI         = totalCollected - totalExpenses;

    // ✅ Correct pending debt calc
    const pendingDebt = orders.reduce((sum, o) => {
      if (o.closed || getOrderStatus(o) === 'Closed') return sum;
      const total = getOrderTotal(o);
      const paid  = getOrderPaid(o);
      const daily = parseAmount(o['سعر السيارة اليومي بالجنيه المصري']) ||
        (total / Math.max(1, parseFloat(o.rental_days || 1)));
      const { end } = getOrderDates(o);
      let debt = total - paid;
      if (end && today > end) {
        debt += Math.max(0, Math.ceil((today - end) / 86400000)) * daily;
      }
      return sum + Math.max(0, debt);
    }, 0);

    const heldDeposits = orders.reduce((sum, o) => {
      const held     = parseAmount(o['الوديعة المحتجزة'] || o.deposit_held     || 0);
      const returned = parseAmount(o['الوديعة المردودة'] || o.deposit_returned || 0);
      return sum + Math.max(0, held - returned);
    }, 0);

    // ── Car field helpers ─────────────────────────────────────
    // ✅ FIXED: use ternary not tagged template literals
    function bilingual(en, ar) {
      if (en && ar && en !== ar) return `${en} / ${ar}`;
      return en || ar || '—';
    }

    const carType_AR  = car['النوع']          || '';
    const carType_EN  = car.Type               || '';
    const carModel_AR = car['الطراز']          || '';
    const carModel_EN = car.Model              || '';
    const carColor_AR = car['اللون']           || '';
    const carColor_EN = car.Color              || '';
    const carYear     = car['سنة الصنع']      || '';
    const carTrans_AR = car['نوع ناقل الحركة']|| '';
    const carTrans_EN = car['Transm. Type']    || '';
    const carSeats    = car['عدد المقاعد']    || car['Seat No.'] || '';
    const carAC_AR    = car['مكيف هواء']      || '';
    const carAC_EN    = car.AC                 || '';
    const carGPS      = car['GPS Stat.']       || '';
    const carKM       = car['كيلومتر تعاقد']  || '';
    const monthlyFee  = parseAmount(car['القيمة المالية'] || car.monthly_fee || 0);
    const chassis     = car['رقم الشاسية']    || '';
    const engine      = car['رقم الموتور']    || '';

    // ── Owner info ────────────────────────────────────────────
    const ownerFirst  = car['الاسم الأول الموكل عنها'] || car['الاسم الأول'] || '';
    const ownerLast   = car['الاسم الأخير الموكل عنها']|| car['الاسم الأخير']|| '';
    const ownerPhone  = car['رقم التليفون'] || '';
    const ownerNID    = car['الرقم القومي']  || '';
    const ownerBank   = bilingual(car.Bank || '', car['اسم البنك'] || '');
    const ownerBankBr = bilingual(car.Branch || '', car['اسم الفرع'] || '');
    const ownerCity   = bilingual(car.City || '', car['محافظة'] || '');
    const ownerRegion = bilingual(car.Region || car.Region_1 || '', car['المنطقة'] || car['المنطقة_1'] || '');
    const notes       = car.Notes || car['ملاحظات'] || '';

    // ── Contract info ─────────────────────────────────────────
    const contractStatus = bilingual(car.Contract || '', car['حاله التعاقد'] || '');
    const contractStart  = car['بداية التعاقد']   || '';
    const contractEnd    = car['نهاية التعاقد']   || '';
    const handoverDate   = car['تاريخ التسليم']   || '';
    const licenseEnd     = car['نهاية الترخيص']   || '';
    const insuranceEnd   = car['نهاية التأمين']   || '';
    const insCompany     = bilingual(car['Insurance Comp.'] || '', car['شركة التأمين'] || '');
    const chassis_field  = car['رقم الشاسية']     || '';
    const engine_field   = car['رقم الموتور']     || '';

    // ── Expiry badge helper ───────────────────────────────────
    function expiryBadge(dateStr) {
      if (!dateStr) return '—';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr).slice(0, 10) || '—';
      const days = Math.ceil((d - today) / 86400000);
      const fmt  = d.toLocaleDateString('en-GB', {
        day:'2-digit', month:'short', year:'numeric'
      });
      if (days < 0)   return `<span style="color:var(--danger);">${fmt} ⚠️ EXPIRED</span>`;
      if (days <= 30) return `<span style="color:#f97316;">${fmt} ⚡ ${days}d</span>`;
      if (days <= 90) return `<span style="color:var(--warning);">${fmt} ✓ ${days}d</span>`;
      return `<span style="color:var(--success);">${fmt} ✓ ${days}d</span>`;
    }

    const statusDotColors = {
      available  : 'var(--success)',
      rented     : 'var(--accent)',
      accident   : 'var(--danger)',
      maintenance: 'var(--warning)',
      archived   : 'var(--text3)'
    };
    const dotColor = statusDotColors[catStatus] || 'var(--text3)';

    // ── Load rate card tiers ──────────────────────────────────
    const tiers = await getRateTiersForCar(String(car.id || car.ID));

    content.innerHTML = `
      <!-- Status banner -->
      <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;
                  border-radius:10px;margin-bottom:14px;
                  background:${catStatus==='accident'   ?'rgba(239,68,68,0.1)':
                               catStatus==='available'  ?'rgba(34,197,94,0.1)':
                                                         'rgba(59,130,246,0.1)'};
                  border:1px solid ${dotColor}30;">
        <div style="font-size:28px;">
          ${catStatus==='accident'   ?'🚨':
            catStatus==='available' ?'🟢':
            catStatus==='rented'    ?'🔵':
            catStatus==='maintenance'?'🔧':'📦'}
        </div>
        <div style="flex:1;">
          <div style="font-size:15px;font-weight:800;">
            ${bilingual(carType_EN + ' ' + carModel_EN, carType_AR + ' ' + carModel_AR).trim()}
            (${carYear})
            ${plateStr
              ? `<span style="color:var(--accent);"> | ${plateStr}</span>`
              : ''}
          </div>
          <div style="font-size:11px;color:${dotColor};font-weight:700;margin-top:2px;">
            ${catStatus.toUpperCase()} | ID: ${car.id}
          </div>
        </div>
        ${isPriv ? `
          <button class="btn btn-warning btn-sm"
            onclick="openCarEditModal('${car.id}')">✏️ Edit</button>
        ` : ''}
      </div>

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
          <div class="kpi-value text-success">${fmtMoney(totalCollected)}</div>
          <div class="kpi-sub">Cash received</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Pending Debt</div>
          <div class="kpi-value"
            style="color:${pendingDebt>0?'var(--danger)':'var(--success)'};">
            ${fmtMoney(pendingDebt)}
          </div>
          <div class="kpi-sub">Outstanding</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Held Deposits</div>
          <div class="kpi-value" style="color:#8b5cf6;">
            ${fmtMoney(heldDeposits)}
          </div>
          <div class="kpi-sub">Not refunded</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Car Expenses</div>
          <div class="kpi-value text-danger">${fmtMoney(totalExpenses)}</div>
          <div class="kpi-sub">${carExps.length} records</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Net ROI</div>
          <div class="kpi-value"
            style="color:${netROI>=0?'var(--success)':'var(--danger)'};">
            ${fmtMoney(netROI)}
          </div>
          <div class="kpi-sub">Collected − Expenses</div>
        </div>
      </div>

      <!-- Info grid: Vehicle + Contract -->
      <div style="display:grid;grid-template-columns:1fr 1fr;
                  gap:12px;margin-bottom:14px;">

        <!-- Vehicle Info -->
        <div class="panel">
          <div style="display:flex;align-items:center;justify-content:space-between;
                      margin-bottom:10px;">
            <div style="font-size:10px;font-weight:800;color:var(--accent);
                        text-transform:uppercase;">🚗 Vehicle Info</div>
            ${isPriv ? `
              <button class="btn btn-ghost btn-xs"
                onclick="openCarEditModal('${car.id}')">✏️ Edit</button>
            ` : ''}
          </div>
          <div style="font-size:11px;display:grid;
                      grid-template-columns:auto 1fr;gap:5px 10px;">
            <span style="color:var(--text3);">Model:</span>
            <span style="font-weight:700;">
              ${bilingual(carType_EN + ' ' + carModel_EN,
                          carType_AR + ' ' + carModel_AR).trim()}
            </span>
            <span style="color:var(--text3);">Year:</span>
            <span>${carYear || '—'}</span>
            <span style="color:var(--text3);">Color:</span>
            <span>${bilingual(carColor_EN, carColor_AR)}</span>
            <span style="color:var(--text3);">Plate:</span>
            <span style="font-weight:700;font-family:monospace;">
              ${plateStr || '—'}
            </span>
            <span style="color:var(--text3);">Seats:</span>
            <span>${carSeats || '—'}</span>
            <span style="color:var(--text3);">Trans.:</span>
            <span>${bilingual(carTrans_EN, carTrans_AR)}</span>
            <span style="color:var(--text3);">A/C:</span>
            <span>${bilingual(carAC_EN, carAC_AR)}</span>
            <span style="color:var(--text3);">GPS:</span>
            <span>${carGPS || '—'}</span>
            <span style="color:var(--text3);">KM:</span>
            <span>${carKM || '—'}</span>
            <span style="color:var(--text3);">Monthly Fee:</span>
            <span style="font-weight:700;color:var(--success);">
              ${fmtMoney(monthlyFee)}
            </span>
          </div>
        </div>

        <!-- Contract & Expiries -->
        <div class="panel">
          <div style="display:flex;align-items:center;justify-content:space-between;
                      margin-bottom:10px;">
            <div style="font-size:10px;font-weight:800;color:var(--accent);
                        text-transform:uppercase;">📋 Contract & Expiries</div>
            ${isPriv ? `
              <button class="btn btn-ghost btn-xs"
                onclick="openCarEditModal('${car.id}')">✏️ Edit</button>
            ` : ''}
          </div>
          <div style="font-size:11px;display:grid;
                      grid-template-columns:auto 1fr;gap:5px 10px;">
            <span style="color:var(--text3);">Status:</span>
            <span style="font-weight:700;">${contractStatus}</span>
            <span style="color:var(--text3);">Start:</span>
            <span>${contractStart || '—'}</span>
            <span style="color:var(--text3);">End:</span>
            <span>${contractEnd || '—'}</span>
            <span style="color:var(--text3);">Handover:</span>
            <span>${expiryBadge(handoverDate)}</span>
            <span style="color:var(--text3);">License:</span>
            <span>${expiryBadge(licenseEnd)}</span>
            <span style="color:var(--text3);">Insurance:</span>
            <span>${expiryBadge(insuranceEnd)}</span>
            <span style="color:var(--text3);">Ins. Co.:</span>
            <span>${insCompany}</span>
            <span style="color:var(--text3);">Chassis:</span>
            <span style="font-size:10px;font-family:monospace;">
              ${chassis_field || '—'}
            </span>
            <span style="color:var(--text3);">Engine:</span>
            <span style="font-size:10px;font-family:monospace;">
              ${engine_field || '—'}
            </span>
          </div>
        </div>
      </div>

      <!-- Owner info -->
      <div class="panel" style="margin-bottom:14px;">
        <div style="display:flex;align-items:center;justify-content:space-between;
                    margin-bottom:10px;">
          <div style="font-size:10px;font-weight:800;color:var(--accent);
                      text-transform:uppercase;">👤 Owner</div>
          ${isPriv ? `
            <button class="btn btn-ghost btn-xs"
              onclick="openCarEditModal('${car.id}')">✏️ Edit</button>
          ` : ''}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;
                    gap:10px;font-size:11px;">
          <div style="display:grid;grid-template-columns:auto 1fr;gap:4px 10px;">
            <span style="color:var(--text3);">Name:</span>
            <span style="font-weight:700;">
              ${(ownerFirst + ' ' + ownerLast).trim() || '—'}
            </span>
            <span style="color:var(--text3);">Phone:</span>
            <span>${ownerPhone || '—'}</span>
            <span style="color:var(--text3);">National ID:</span>
            <span style="font-family:monospace;font-size:10px;">
              ${ownerNID || '—'}
            </span>
          </div>
          <div style="display:grid;grid-template-columns:auto 1fr;gap:4px 10px;">
            <span style="color:var(--text3);">Bank:</span>
            <span>${ownerBank}</span>
            <span style="color:var(--text3);">Bank Branch:</span>
            <span>${ownerBankBr}</span>
            <span style="color:var(--text3);">City:</span>
            <span>${ownerCity}</span>
            <span style="color:var(--text3);">Region:</span>
            <span>${ownerRegion}</span>
          </div>
        </div>
        ${notes && notes !== '-' ? `
          <div style="margin-top:8px;padding:8px;background:var(--surface);
                      border-radius:6px;font-size:10px;color:var(--text3);">
            📝 ${notes}
          </div>` : ''}
      </div>

      <!-- Rate Card -->
      ${tiers.length > 0 ? `
        <div class="panel" style="margin-bottom:14px;">
          <div style="display:flex;align-items:center;justify-content:space-between;
                      margin-bottom:8px;">
            <div style="font-size:10px;font-weight:800;color:var(--accent);
                        text-transform:uppercase;">💰 Rate Card</div>
            ${isPriv ? `
              <button class="btn btn-ghost btn-xs"
                onclick="openRateCardEditor('${car.id}')">✏️ Edit</button>
            ` : ''}
          </div>
          ${buildRateTierDisplay(tiers)}
        </div>
      ` : isPriv ? `
        <div class="panel" style="margin-bottom:14px;text-align:center;padding:14px;">
          <button class="btn btn-ghost btn-sm"
            onclick="openRateCardEditor('${car.id}')">
            ➕ Add Rate Card
          </button>
        </div>
      ` : ''}

      <!-- Location -->
      <div class="panel" style="margin-bottom:14px;">
        <div style="font-size:10px;font-weight:800;color:var(--accent);
                    text-transform:uppercase;margin-bottom:8px;">📍 Location</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
          <select id="car-location-select-${car.id}" class="form-input"
            style="flex:1;min-width:160px;">
            <option value="">-- Select --</option>
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
        </div>
      </div>

      <!-- Quick Actions -->
      <div style="background:var(--surface2);border:1px solid var(--border);
                  border-radius:10px;padding:12px;margin-bottom:14px;">
        <div style="font-size:10px;font-weight:800;color:var(--accent);
                    text-transform:uppercase;margin-bottom:8px;">⚡ Quick Actions</div>
        <div style="display:flex;gap:7px;flex-wrap:wrap;">
          <button class="btn btn-primary btn-sm"
            onclick="showPage('fleet-radar')">📡 Fleet Radar</button>
          <button class="btn btn-ghost btn-sm"
            onclick="showPage('order-book');
              setTimeout(()=>{
                const s=document.getElementById('ob-search');
                if(s){s.value='${(carType_EN+' '+carModel_EN).trim()}';filterOrders();}
              },300)">
            📋 Orders
          </button>
          <button class="btn btn-ghost btn-sm"
            onclick="showPage('risk-radar')">⚠️ Risk Radar</button>
          <button class="btn btn-ghost btn-sm"
            onclick="createTaskFromCar('${car.id}')">📌 Task</button>
          ${isPriv ? `
            <button class="btn btn-warning btn-sm"
              onclick="openCarEditModal('${car.id}')">✏️ Edit Status</button>
            ${tiers.length === 0 ? `
              <button class="btn btn-ghost btn-sm"
                onclick="openRateCardEditor('${car.id}')">💰 Rate Card</button>
            ` : ''}
          ` : ''}
        </div>
      </div>

      <!-- Rental History -->
      <div class="panel" style="margin-bottom:14px;">
        <div style="display:flex;align-items:center;justify-content:space-between;
                    margin-bottom:11px;">
          <h3 style="font-size:13px;font-weight:800;">
            📋 Rental History (${orders.length} orders)
          </h3>
        </div>
        ${orders.length === 0
          ? '<div class="empty-state" style="padding:20px;"><p>No orders found for this car.</p></div>'
          : `<div class="table-wrap">
               <table class="data-table">
                 <thead>
                   <tr>
                     <th>Order #</th><th>Client</th>
                     <th>Start</th><th>End</th>
                     <th>Total</th><th>Paid</th>
                     <th>Debt</th><th>Status</th><th>Payment</th>
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
                       const st     = getOrderStatus(o);
                       const sk     = st === 'Accident' ? 'accident'
                                    : st === 'Overdue'  ? 'overdue'
                                    : st === 'Closed'   ? 'closed' : 'active';
                       const oTotal = getOrderTotal(o);
                       const oPaid  = getOrderPaid(o);
                       const oDebt  = Math.max(0, oTotal - oPaid);

                       // ✅ Use global getPaymentStatus from utils.js
                       const payK   = getPaymentStatus(o);
                       const payLbl = getPaymentStatusLabel(o);
                       const payC   = (window.PAYMENT_STATUS_COLORS || {})[payK] || '#f59e0b';

                       return `
                         <tr style="cursor:pointer;"
                             onclick="openOrderDetail('${o.id}')">
                           <td style="color:var(--accent);font-weight:700;">
                             #${getOrderNo(o)}
                           </td>
                           <td>${getOrderClientName(o) || '—'}</td>
                           <td style="font-size:10px;">
                             ${start ? fmtDate(start) : '—'}
                           </td>
                           <td style="font-size:10px;">
                             ${end ? fmtDate(end) : '—'}
                           </td>
                           <td>${fmtMoney(oTotal)}</td>
                           <td style="color:var(--success);">${fmtMoney(oPaid)}</td>
                           <td style="color:${oDebt>0?'var(--danger)':'var(--success)'};">
                             ${oDebt > 0 ? fmtMoney(oDebt) : '✅'}
                           </td>
                           <td><span class="pill pill-${sk}">${st}</span></td>
                           <td style="font-size:10px;font-weight:700;color:${payC};">
                             ${payLbl}
                           </td>
                         </tr>`;
                     }).join('')}
                 </tbody>
               </table>
             </div>`}
      </div>

      <!-- Car Expenses -->
      ${carExps.length > 0 ? `
        <div class="panel">
          <h3 style="font-size:13px;font-weight:800;margin-bottom:11px;">
            💸 Car Expenses (${carExps.length})
          </h3>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Date</th><th>Type</th><th>Amount</th><th>Notes</th>
                </tr>
              </thead>
              <tbody>
                ${carExps
                  .sort((a, b) =>
                    (b['تاريخ المصروف'] || '') > (a['تاريخ المصروف'] || '') ? 1 : -1
                  )
                  .map(e => `
                    <tr>
                      <td style="font-size:10px;">
                        ${e['تاريخ المصروف'] || '—'}
                      </td>
                      <td>${e['نوع المصروف'] || e['expense_type'] || '—'}</td>
                      <td style="color:var(--danger);font-weight:700;">
                        ${fmtMoney(parseAmount(e['قيمة المصروف'] || 0))}
                      </td>
                      <td style="font-size:10px;color:var(--text3);">
                        ${e['ملاحظات'] || e.Notes || '—'}
                      </td>
                    </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}
    `;

    // Pre-select location
    setTimeout(() => {
      const sel = document.getElementById('car-location-select-' + car.id);
      if (sel && car.current_location) sel.value = car.current_location;
    }, 100);

    await logAction('VIEW', 'Vehicle 360', `Viewed: ${getCarLabel(car, 'en')}`);

  } catch (e) {
    content.innerHTML = `
      <div class="empty-state"><p>Failed to load: ${e.message}</p></div>`;
    console.warn('V360 error:', e);
  }
};
