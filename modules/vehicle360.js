// ============================================================
// modules/vehicle360.js
// Vehicle 360 — complete financial and operational view
// per vehicle. Inline editable sections, financial KPIs,
// rental history, car expenses, quick actions.
// ============================================================

// ============================================================
// ENTRY POINT
// ============================================================

window.renderVehicle360 = function() {
  renderPageLoading('page-vehicle-360', '🔭', 'Vehicle 360');
  _renderV360Full();
};

// ============================================================
// MAIN PAGE RENDER
// ============================================================

async function _renderV360Full() {
  const el = document.getElementById('page-vehicle-360');
  if (!el) return;

  if (!G.fleet || !G.fleet.length) await loadFleetData();

  el.innerHTML = `
    <div class="section-header">
      <div>
        <h2>🔭 Vehicle 360</h2>
        <p>Complete financial and operational view per vehicle</p>
      </div>
      <button class="btn btn-ghost btn-sm"
        onclick="_renderV360Full()">🔄 Refresh</button>
    </div>

    <!-- Hidden select — keeps loadVehicle360Details() working -->
    <select id="v360-car-select" onchange="loadVehicle360Details()"
      style="display:none;"></select>

    <!-- Tab bar -->
    <div style="display:flex;gap:7px;margin-bottom:14px;">
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

    <!-- Car grid -->
    <div id="v360-car-grid"
      style="display:grid;
        grid-template-columns:repeat(auto-fill,minmax(180px,1fr));
        gap:12px;margin-bottom:18px;">
    </div>

    <!-- Detail pane -->
    <div id="v360-content">
      <div class="empty-state">
        <div class="es-icon">🔭</div>
        <p style="font-size:13px;font-weight:700;margin-bottom:5px;">
          Select a vehicle above
        </p>
        <p>View complete financials, rental history, expenses,
          expiry dates and owner details</p>
      </div>
    </div>`;

  window._v360Tab = 'active';
  _v360RenderGrid();

  window._v360SwitchTab = function() {
    ['active','all','archived'].forEach(t => {
      const btn = document.getElementById('v360-tab-' + t);
      if (!btn) return;
      const on = window._v360Tab === t;
      btn.style.borderColor = on ? 'var(--accent)' : 'var(--border)';
      btn.style.color       = on ? 'var(--accent)' : 'var(--text2)';
    });
    _v360RenderGrid();
  };
}

// ============================================================
// CAR GRID
// ============================================================

function _v360RenderGrid() {
  const gridEl = document.getElementById('v360-car-grid');
  if (!gridEl) return;

  const tab = window._v360Tab || 'active';
  let cars  = G.fleet;

  if (tab === 'active') {
    cars = G.fleet.filter(c =>
      c.is_active === true ||
      c.Contract === 'Valid' ||
      c['حاله التعاقد'] === 'ساري' ||
      (!c.archived && c.is_active !== false)
    );
  } else if (tab === 'archived') {
    cars = G.fleet.filter(c =>
      c.archived === true || c.is_active === false
    );
  }

  if (!cars.length) {
    gridEl.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;
        padding:30px;color:var(--text3);">
        No cars in this category
      </div>`;
    return;
  }

  // Group by type
  const groups = {};
  cars.forEach(c => {
    const type = (c.col_C || c['النوع'] || c.Type || 'Other')
      .toString().trim() || 'Other';
    if (!groups[type]) groups[type] = [];
    groups[type].push(c);
  });

  const statusColors = {
    available:   '#22c55e',
    rented:      '#3b82f6',
    accident:    '#ef4444',
    maintenance: '#f59e0b',
    archived:    '#64748b'
  };

  let html = '';
  Object.keys(groups).sort().forEach(type => {
    html += `
      <div style="grid-column:1/-1;font-size:11px;font-weight:800;
        color:var(--accent);text-transform:uppercase;
        letter-spacing:0.08em;padding:6px 0 4px;
        border-bottom:1px solid var(--border);margin-bottom:2px;">
        ${type}
        <span style="font-size:9px;color:var(--text3);font-weight:400;">
          (${groups[type].length})
        </span>
      </div>`;

    html += groups[type].map(c => {
      const cat   = getCarStatusCategory(c);
      const dot   = statusColors[cat] || '#64748b';
      const label = getCarLabel(c, 'en');
      const fee   = c.monthly_fee || c['col_CJ'] || '';
      return `
        <div style="background:var(--surface2);
          border:1px solid var(--border);border-radius:10px;
          padding:12px;cursor:pointer;transition:all 0.2s;"
          onmouseover="this.style.borderColor='var(--accent)';
            this.style.transform='translateY(-2px)'"
          onmouseout="this.style.borderColor='var(--border)';
            this.style.transform=''"
          onclick="loadVehicle360ById('${c.id}')">
          <div style="font-size:22px;text-align:center;margin-bottom:6px;">🚗</div>
          <div style="font-size:11px;font-weight:800;white-space:nowrap;
            overflow:hidden;text-overflow:ellipsis;" title="${label}">
            ${label || '—'}
          </div>
          <div style="display:flex;align-items:center;gap:5px;margin-top:6px;">
            <span style="width:8px;height:8px;border-radius:50%;
              background:${dot};flex-shrink:0;"></span>
            <span style="font-size:9px;color:var(--text3);">${cat}</span>
          </div>
          <div style="font-size:10px;color:var(--text3);margin-top:4px;">
            🔢 ${c.plate || formatPlate(c) || 'No plate'}
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

// ============================================================
// LOAD V360 BY FIRESTORE DOC ID
// ============================================================

window.loadVehicle360ById = function(carDocId) {
  const sel = document.getElementById('v360-car-select');
  if (!sel) return;

  if (!sel.querySelector(`option[value="${carDocId}"]`)) {
    const opt   = document.createElement('option');
    opt.value   = carDocId;
    sel.appendChild(opt);
  }

  sel.value = carDocId;
  loadVehicle360Details();

  const content = document.getElementById('v360-content');
  if (content) content.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// ============================================================
// LOAD VEHICLE 360 DETAILS
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
      <div class="empty-state">
        <p>Car not found. Try refreshing.</p>
      </div>`;
    return;
  }

  try {
    // Build possible ID set for matching
    const possibleIds = new Set([
      String(car.ID  || '').trim(),
      String(car.id  || '').trim(),
      String(parseInt(car.ID || 0) || '').trim()
    ].filter(x => x && x !== '0'));

    // Use cached orders — avoid extra Firestore reads
    const ordersAll = allOrders.length > 0 ? allOrders : (G.bookings || []);
    const orders    = ordersAll.filter(o => {
      const bId = String(o['كود السيارة'] || '').trim();
      if (!bId) return false;
      if (possibleIds.has(bId)) return true;
      const bNum = String(parseInt(bId) || '');
      for (const pid of possibleIds) {
        const pNum = String(parseInt(pid) || '');
        if (pNum && pNum !== '0' && pNum === bNum) return true;
      }
      return false;
    });

    // Car expenses (cached 60s per car)
    const cacheKey = '_carExpCache_' + carId;
    if (!window[cacheKey] ||
        Date.now() - window[cacheKey + '_t'] > 60000) {
      const snap = await db.collection('car_expenses').get();
      window[cacheKey]       = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      window[cacheKey + '_t']= Date.now();
    }
    const carExps = window[cacheKey].filter(e => {
      const eCarId = String(e['كود السيارة'] || '').trim();
      if (possibleIds.has(eCarId)) return true;
      return orders.some(o => String(o['No.']) === String(e['كود الاوردر']));
    });

    const today         = new Date();
    const catStatus     = getCarStatusCategory(car);
    const statusColors  = {
      available:   'var(--success)',
      rented:      'var(--accent)',
      accident:    'var(--danger)',
      maintenance: 'var(--warning)',
      archived:    'var(--text3)'
    };
    const dotColor      = statusColors[catStatus] || 'var(--text3)';

    const totalRevenue  = orders.reduce((s,o) => s + getOrderTotal(o), 0);
    const totalPaid     = orders.reduce((s,o) => s + getOrderPaid(o), 0);
    const totalDeposit  = orders.reduce((s,o) =>
      s + parseAmount(o['الوديعة المعلقة لدينا'] || 0), 0);
    const totalExpenses = carExps.reduce((s,e) =>
      s + parseAmount(e['قيمة المصروف']), 0);
    const netROI        = totalPaid - totalExpenses;

    const pendingDebt   = orders.reduce((s,o) => {
      const st = getOrderStatus(o);
      if (st === 'Closed') return s;
      const t  = getOrderTotal(o);
      const p  = getOrderPaid(o);
      const d  = parseAmount(o['سعر السيارة اليومي بالجنيه المصري']) ||
                 (t / Math.max(1, parseFloat(o.rental_days || 1)));
      const { end } = getOrderDates(o);
      let debt = t - p;
      if (end && today > end && !o.closed && st !== 'Closed') {
        debt += Math.max(0, Math.ceil((today - end) / 86400000)) * d;
      }
      return s + Math.max(0, debt);
    }, 0);

    // Expiry dates
    const licenseExp  = parseDBDate(car['نهاية الترخيص'] || '');
    const insuranceExp= parseDBDate(car['نهاية التأمين'] || '');
    const handoverDate= parseDBDate(car['تاريخ التسليم']  || '');

    const daysUntil = d => {
      if (!d) return null;
      return Math.ceil((d - today) / 86400000);
    };

    const expiryBadge = (d, label) => {
      if (!d) return '<span style="color:var(--text3);">—</span>';
      const days  = daysUntil(d);
      const color = days <= 0   ? 'var(--danger)'  :
                    days <= 30  ? 'var(--warning)'  : 'var(--success)';
      const text  = days <= 0
        ? `EXPIRED ${Math.abs(days)}d ago`
        : days <= 30 ? `⚠️ ${days}d left` : `✓ ${days}d`;
      return `
        <span style="color:${color};font-weight:700;">
          ${fmtDateShort(d)}
        </span>
        <span style="font-size:9px;color:${color};"> ${text}</span>`;
    };

    const isPriv = ['Admin','Executive'].includes(G.user?.role);

    content.innerHTML = `

      <!-- Status Banner -->
      <div style="display:flex;align-items:center;gap:14px;padding:13px 16px;
        border-radius:var(--radius);margin-bottom:16px;
        background:${catStatus === 'accident'   ? 'rgba(239,68,68,0.1)'  :
                     catStatus === 'maintenance' ? 'rgba(245,158,11,0.1)' :
                     catStatus === 'available'   ? 'rgba(34,197,94,0.1)'  :
                                                   'rgba(59,130,246,0.1)'};
        border:1px solid ${dotColor}40;">
        <div style="width:44px;height:44px;border-radius:50%;
          background:${dotColor}22;
          display:flex;align-items:center;justify-content:center;
          font-size:22px;">
          ${catStatus === 'accident'    ? '🚨' :
            catStatus === 'maintenance' ? '🔧' :
            catStatus === 'rented'      ? '🔵' :
            catStatus === 'archived'    ? '📦' : '🟢'}
        </div>
        <div style="flex:1;">
          <div style="font-size:16px;font-weight:900;">
            ${getCarLabel(car, 'en')}
          </div>
          <div style="font-size:11px;color:${dotColor};
            font-weight:700;margin-top:2px;">
            ${catStatus.toUpperCase()} |
            Doc ID: ${car.id} |
            Car ID: ${car.ID || '—'}
          </div>
        </div>
        ${isPriv ? `
          <button class="btn btn-warning btn-sm"
            onclick="openCarEditModal('${car.id}')">
            ✏️ Edit Status
          </button>` : ''}
      </div>

      <!-- KPI Row -->
      <div style="display:grid;
        grid-template-columns:repeat(auto-fill,minmax(140px,1fr));
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
          <div class="kpi-label">Pending Debt</div>
          <div class="kpi-value text-danger">${fmtMoney(pendingDebt)}</div>
          <div class="kpi-sub">Outstanding</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Held Deposits</div>
          <div class="kpi-value text-warning">${fmtMoney(totalDeposit)}</div>
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
            style="color:${netROI >= 0 ? 'var(--success)' : 'var(--danger)'};">
            ${fmtMoney(netROI)}
          </div>
          <div class="kpi-sub">Collected − Expenses</div>
        </div>
      </div>

      <!-- Details Grid -->
      <div style="display:grid;grid-template-columns:1fr 1fr;
        gap:13px;margin-bottom:16px;">

        <!-- Vehicle Info -->
        <div class="panel" id="v360-section-vehicle">
          <div style="display:flex;align-items:center;
            justify-content:space-between;margin-bottom:9px;">
            <div style="font-size:10px;font-weight:800;color:var(--accent);
              text-transform:uppercase;">🚗 Vehicle Info</div>
            ${isPriv ? `
              <button class="btn btn-ghost btn-xs"
                onclick="makeV360SectionEditable('${car.id}','vehicle')">
                ✏️ Edit
              </button>` : ''}
          </div>
          <div style="font-size:11px;display:grid;
            grid-template-columns:auto 1fr;gap:5px 12px;">
            <span style="color:var(--text3);">Model:</span>
            <span style="font-weight:700;">${car.model || car.Type || '—'}</span>
            <span style="color:var(--text3);">Year:</span>
            <span>${car.year || car['سنة الصنع'] || '—'}</span>
            <span style="color:var(--text3);">Color:</span>
            <span>${car.Color || car['اللون'] || '—'}</span>
            <span style="color:var(--text3);">Plate:</span>
            <span style="font-weight:700;">
              ${car.plate || formatPlate(car)}
            </span>
            <span style="color:var(--text3);">Seats:</span>
            <span>${car['Seat_No'] || car['عدد المقاعد'] || '—'}</span>
            <span style="color:var(--text3);">Trans.:</span>
            <span>${car['Transm. Type'] || car['نوع ناقل الحركة'] || '—'}</span>
            <span style="color:var(--text3);">A/C:</span>
            <span>${car.AC || car['مكيف هواء'] || '—'}</span>
            <span style="color:var(--text3);">GPS:</span>
            <span>${car['GPS Stat.'] || '—'}</span>
            <span style="color:var(--text3);">KM:</span>
            <span>${car['كيلومتر تعاقد'] || '—'}</span>
            <span style="color:var(--text3);">Monthly Fee:</span>
            <span style="font-weight:700;">
              ${fmtMoney(parseAmount(car['monthly_fee'] || car['القيمة المالية'] || 0))}
            </span>
          </div>
        </div>

        <!-- Contract & Expiries -->
        <div class="panel" id="v360-section-contract">
          <div style="display:flex;align-items:center;
            justify-content:space-between;margin-bottom:9px;">
            <div style="font-size:10px;font-weight:800;color:var(--accent);
              text-transform:uppercase;">📋 Contract & Expiries</div>
            ${isPriv ? `
              <button class="btn btn-ghost btn-xs"
                onclick="makeV360SectionEditable('${car.id}','contract')">
                ✏️ Edit
              </button>` : ''}
          </div>
          <div style="font-size:11px;display:grid;
            grid-template-columns:auto 1fr;gap:5px 12px;">
            <span style="color:var(--text3);">Status:</span>
            <span style="font-weight:700;color:${dotColor};">
              ${car.Contract || car['حاله التعاقد'] || '—'}
            </span>
            <span style="color:var(--text3);">Start:</span>
            <span>
              ${fmtDateShort(parseDBDate(car['بداية التعاقد'] || '')) || '—'}
            </span>
            <span style="color:var(--text3);">End:</span>
            <span>
              ${fmtDateShort(parseDBDate(car['نهاية التعاقد'] || '')) || '—'}
            </span>
            <span style="color:var(--text3);">Handover:</span>
            <span style="display:flex;flex-direction:column;">
              ${expiryBadge(handoverDate, 'Handover')}
            </span>
            <span style="color:var(--text3);">License:</span>
            <span style="display:flex;flex-direction:column;">
              ${expiryBadge(licenseExp, 'License')}
            </span>
            <span style="color:var(--text3);">Insurance:</span>
            <span style="display:flex;flex-direction:column;">
              ${expiryBadge(insuranceExp, 'Insurance')}
            </span>
            <span style="color:var(--text3);">Ins. Co.:</span>
            <span>
              ${car['Insurance Comp.'] || car['شركة التأمين'] || '—'}
            </span>
            <span style="color:var(--text3);">Chassis:</span>
            <span style="font-size:10px;">
              ${car['رقم الشاسية'] || car.chassis || '—'}
            </span>
            <span style="color:var(--text3);">Engine:</span>
            <span>${car['رقم الموتور'] || '—'}</span>
          </div>
        </div>

        <!-- Owner Info -->
        <div class="panel" id="v360-section-owner">
          <div style="display:flex;align-items:center;
            justify-content:space-between;margin-bottom:9px;">
            <div style="font-size:10px;font-weight:800;color:var(--accent);
              text-transform:uppercase;">👤 Owner</div>
            ${isPriv ? `
              <button class="btn btn-ghost btn-xs"
                onclick="makeV360SectionEditable('${car.id}','owner')">
                ✏️ Edit
              </button>` : ''}
          </div>
          <div style="font-size:11px;display:grid;
            grid-template-columns:auto 1fr;gap:5px 12px;">
            <span style="color:var(--text3);">Name:</span>
            <span style="font-weight:700;">
              ${((car['الاسم الأول'] || '') + ' ' +
                 (car['الاسم الأخير'] || '')).trim() || '—'}
            </span>
            <span style="color:var(--text3);">Phone:</span>
            <span>${car['رقم التليفون'] || '—'}</span>
            <span style="color:var(--text3);">National ID:</span>
            <span>${car['الرقم القومي'] || '—'}</span>
            <span style="color:var(--text3);">Bank:</span>
            <span style="font-size:10px;">
              ${car['اسم البنك'] || car.Bank || '—'}
            </span>
            <span style="color:var(--text3);">Bank Branch:</span>
            <span style="font-size:10px;">${car['اسم الفرع'] || '—'}</span>
            <span style="color:var(--text3);">City:</span>
            <span>${car['المحافظة'] || car.City || '—'}</span>
            <span style="color:var(--text3);">Region:</span>
            <span>${car.Region || car['المنطقة'] || '—'}</span>
            <span style="color:var(--text3);">Notes:</span>
            <span style="font-size:10px;">${car.Notes || '—'}</span>
          </div>
        </div>

        <!-- Location + Quick Actions -->
        <div style="display:flex;flex-direction:column;gap:11px;">

          <!-- Location -->
          <div class="panel">
            <div style="font-size:10px;font-weight:800;color:var(--accent);
              text-transform:uppercase;margin-bottom:8px;">📍 Location</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
              <select id="car-location-select-${car.id}" class="form-input"
                style="flex:1;min-width:130px;">
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
              <button class="btn btn-primary btn-sm"
                onclick="saveCarLocation('${car.id}')">
                💾 Save
              </button>
            </div>
            <div style="font-size:10px;color:var(--text3);margin-top:5px;">
              Current:
              <strong>${car.current_location || 'Not set'}</strong>
              ${car.current_location_updated
                ? ` (updated: ${car.current_location_updated})` : ''}
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="panel" style="display:flex;flex-direction:column;gap:7px;">
            <div style="font-size:10px;font-weight:800;color:var(--accent);
              text-transform:uppercase;margin-bottom:4px;">⚡ Quick Actions</div>
            <button class="btn btn-ghost btn-sm"
              onclick="showPage('fleet-radar')">
              📡 Fleet Radar
            </button>
            <button class="btn btn-ghost btn-sm"
              onclick="showPage('order-book');
                setTimeout(()=>{
                  const s=document.getElementById('ob-search');
                  if(s){s.value='${(getCarLabel(car,'en')||'').replace(/'/g,'').slice(0,20)}';
                  filterOrders();}
                },300)">
              📋 Orders for this Car
            </button>
            <button class="btn btn-ghost btn-sm"
              onclick="showPage('risk-radar')">
              ⚠️ Risk Radar
            </button>
            ${isPriv ? `
              <button class="btn btn-warning btn-sm"
                onclick="openCarEditModal('${car.id}')">
                ✏️ Edit Car Status
              </button>` : ''}
          </div>

        </div>

      </div>

      <!-- Orders History -->
      <div class="panel" style="margin-bottom:14px;">
        <div style="display:flex;align-items:center;
          justify-content:space-between;margin-bottom:11px;">
          <h3 style="font-size:13px;font-weight:800;">
            📋 Rental History (${orders.length} orders)
          </h3>
          <span style="font-size:11px;color:var(--text3);">
            ${orders.filter(o => getOrderStatus(o) !== 'Closed').length}
            active/open
          </span>
        </div>
        ${orders.length === 0
          ? `<div class="empty-state" style="padding:20px;">
               <p>No orders found for this car.</p>
             </div>`
          : `<div class="table-wrap">
               <table class="data-table">
                 <thead><tr>
                   <th>Order #</th><th>Client</th>
                   <th>Start</th><th>End</th>
                   <th>Daily</th><th>Total</th>
                   <th>Paid</th><th>Debt</th><th>Status</th>
                 </tr></thead>
                 <tbody>
                   ${orders
                     .sort((a,b) => {
                       const {start:as} = getOrderDates(a);
                       const {start:bs} = getOrderDates(b);
                       return (bs||0) - (as||0);
                     })
                     .map(o => {
                       const { start, end } = getOrderDates(o);
                       const total  = getOrderTotal(o);
                       const paid   = getOrderPaid(o);
                       const daily  = parseAmount(o['سعر السيارة اليومي بالجنيه المصري']) ||
                                      (total / Math.max(1, parseFloat(o.rental_days||1)));
                       const st     = getOrderStatus(o);
                       const isCl   = st === 'Closed';
                       const isAc   = st === 'Accident';
                       const isOD   = st === 'Overdue';
                       let ldays=0, lpen=0;
                       if ((isOD||isAc) && end && !o.closed) {
                         ldays = Math.max(0, Math.ceil((today-end)/86400000));
                         lpen  = ldays * daily;
                       }
                       const debt = isCl ? 0 : Math.max(0, total+lpen-paid);
                       const sk   = isAc ? 'accident' : isOD ? 'overdue' :
                                    isCl ? 'closed'   : 'active';
                       return `
                         <tr style="cursor:pointer;"
                           onclick="openOrderDetail('${o.id}')">
                           <td>
                             <span style="color:var(--accent);font-weight:700;">
                               #${getOrderNo(o)}
                             </span>
                           </td>
                           <td>
                             <div style="font-weight:600;">
                               ${getOrderClientName(o) || '—'}
                             </div>
                             ${o['كود العميل']
                               ? `<div style="font-size:9px;color:var(--text3);">
                                   ID: ${o['كود العميل']}
                                 </div>` : ''}
                           </td>
                           <td style="font-size:10px;">
                             ${start ? fmtDate(start) : '—'}
                           </td>
                           <td style="font-size:10px;">
                             ${end ? fmtDate(end) : '—'}
                             ${ldays > 0
                               ? `<div style="font-size:9px;color:var(--danger);">
                                   +${ldays}d
                                 </div>` : ''}
                           </td>
                           <td style="font-size:11px;">${fmtMoney(daily)}</td>
                           <td>${fmtMoney(total)}</td>
                           <td>${fmtMoney(paid)}</td>
                           <td style="color:${debt>0?'var(--danger)':'var(--success)'};">
                             ${debt > 0 ? fmtMoney(debt) : '✅'}
                             ${lpen > 0
                               ? `<div style="font-size:9px;color:var(--danger);">
                                   +${fmtMoney(lpen)}
                                 </div>` : ''}
                           </td>
                           <td>
                             <span class="pill pill-${sk}">
                               ${isAc ? 'ACCIDENT' : isOD ? 'OVERDUE' :
                                 isCl ? 'Closed'   : 'Active'}
                             </span>
                           </td>
                         </tr>`;
                     }).join('')}
                 </tbody>
               </table>
             </div>`}
      </div>

      <!-- Car Expenses -->
      <div class="panel">
        <div style="display:flex;align-items:center;
          justify-content:space-between;margin-bottom:11px;">
          <h3 style="font-size:13px;font-weight:800;">
            🔧 Car Expenses (${carExps.length} records)
          </h3>
          <span style="font-size:13px;font-weight:800;color:var(--danger);">
            ${fmtMoney(totalExpenses)}
          </span>
        </div>
        ${carExps.length === 0
          ? `<div class="empty-state" style="padding:20px;">
               <p>No expenses recorded for this vehicle</p>
             </div>`
          : `<div class="table-wrap">
               <table class="data-table">
                 <thead><tr>
                   <th>No.</th><th>Date</th><th>Type</th>
                   <th>Statement</th><th>Paid By</th>
                   <th>Due From</th><th>Amount</th>
                 </tr></thead>
                 <tbody>
                   ${carExps.map(e => {
                     const day   = e['يوم']  || '—';
                     const month = e['شهر']  || '—';
                     const year  = e['paid_year'] || e['سنة'] || '—';
                     const dateStr = day !== '—'
                       ? `${String(day).padStart(2,'0')}/${String(month).padStart(2,'0')}/${year}`
                       : '—';
                     return `
                       <tr>
                         <td style="font-size:10px;">${e['No.'] || '—'}</td>
                         <td style="font-size:10px;white-space:nowrap;">
                           ${dateStr}
                         </td>
                         <td>
                           <span class="pill pill-draft">
                             ${e['نوع المصروف'] || '—'}
                           </span>
                         </td>
                         <td style="font-size:11px;">
                           ${e['بيان النثريات'] || e['بيان الصيانة'] || '—'}
                         </td>
                         <td style="font-size:11px;">
                           ${e['تم دفع من طرف'] || '—'}
                         </td>
                         <td style="font-size:11px;">
                           ${e['مستحق من'] || '—'}
                         </td>
                         <td>
                           <strong style="color:var(--danger);">
                             ${e['قيمة المصروف'] || '£0.00'}
                           </strong>
                         </td>
                       </tr>`;
                   }).join('')}
                 </tbody>
               </table>
             </div>`}
      </div>`;

    // Pre-select location in dropdown
    setTimeout(() => {
      const sel = document.getElementById('car-location-select-' + car.id);
      if (sel && car.current_location) sel.value = car.current_location;
    }, 100);

    await logAction('VIEW', 'Vehicle 360',
      `Viewed: ${getCarLabel(car, 'en')}`);

  } catch (e) {
    content.innerHTML = `
      <div class="empty-state">
        <p>Failed to load vehicle data: ${e.message}</p>
      </div>`;
    console.warn('V360 error:', e);
  }
};

// ============================================================
// INLINE SECTION EDITING
// ============================================================

window.makeV360SectionEditable = function(carId, section) {
  const container = document.getElementById('v360-section-' + section);
  if (!container) return;

  const car = G.fleet.find(c => c.id === carId) ||
              G.fleet.find(c => String(c.ID || c.id) === String(carId));
  if (!car) return;

  const _get = (key, altKeys = []) => {
    if (car[key] !== undefined && car[key] !== null && car[key] !== '')
      return car[key];
    for (const ak of altKeys) {
      if (car[ak] !== undefined && car[ak] !== null && car[ak] !== '')
        return car[ak];
    }
    return '';
  };

  const sectionFields = {
    vehicle: [
      { label: 'Model (EN)',    key: 'model',        altKeys: ['Type','الطراز','النوع'] },
      { label: 'Year',          key: 'year',         altKeys: ['سنة الصنع'] },
      { label: 'Color (EN)',    key: 'Color',        altKeys: ['اللون'] },
      { label: 'Plate',        key: 'plate',        altKeys: [] },
      { label: 'VIN / Chassis',key: 'chassis',      altKeys: ['رقم الشاسيه','رقم الشاسية'] },
      { label: 'Motor No.',    key: 'motor',        altKeys: ['رقم الموتور'] },
    ],
    contract: [
      { label: 'Contract Status', key: 'Contract',      altKeys: ['حاله التعاقد'] },
      { label: 'Contract Start',  key: 'contract_start',altKeys: ['بداية التعاقد'],  type: 'date' },
      { label: 'Contract End',    key: 'contract_end',  altKeys: ['نهاية التعاقد'],  type: 'date' },
      { label: 'License Expiry',  key: 'license_end',   altKeys: ['نهاية الترخيص'],  type: 'date' },
      { label: 'Insurance Expiry',key: 'insurance_end', altKeys: ['نهاية التأمين'],  type: 'date' },
      { label: 'Monthly Fee',     key: 'monthly_fee',   altKeys: ['القيمة المالية'], type: 'number' }
    ],
    owner: [
      { label: 'Owner First Name', key: 'owner_first', altKeys: ['الاسم الأول'] },
      { label: 'Owner Last Name',  key: 'owner_last',  altKeys: ['الاسم الأخير'] },
      { label: 'Phone',            key: 'phone',       altKeys: ['رقم التليفون'] },
      { label: 'National ID',      key: 'national_id', altKeys: ['الرقم القومي'] },
      { label: 'Bank',             key: 'Bank',        altKeys: ['اسم البنك'] },
    ]
  };

  const fields = sectionFields[section] || [];
  const titleMap = {
    vehicle:  '🚗 Vehicle Info',
    contract: '📋 Contract Info',
    owner:    '👤 Owner'
  };

  container.innerHTML = `
    <div style="font-size:10px;font-weight:800;color:var(--accent);
      text-transform:uppercase;margin-bottom:11px;">
      ${titleMap[section] || section}
      <span style="font-size:9px;font-weight:400;color:var(--warning);
        margin-left:6px;">✏️ Editing</span>
    </div>
    <div style="display:grid;gap:8px;padding:10px 0;">
      ${fields.map(f => `
        <div style="display:grid;grid-template-columns:140px 1fr;
          gap:8px;align-items:center;">
          <label style="font-size:10px;color:var(--text3);">${f.label}</label>
          <input type="${f.type || 'text'}" id="v360-edit-${f.key}"
            class="form-input"
            value="${String(_get(f.key, f.altKeys || [])).replace(/"/g,'&quot;')}"
            style="padding:5px 8px;background:var(--surface2);
              border:1px solid var(--border);border-radius:6px;
              color:var(--text);outline:none;">
        </div>`).join('')}
      <div style="display:flex;gap:8px;margin-top:8px;">
        <button class="btn btn-primary btn-sm"
          onclick="saveV360Section('${carId}','${section}')">
          💾 Save Changes
        </button>
        <button class="btn btn-ghost btn-sm"
          onclick="loadVehicle360Details()">
          ✕ Cancel
        </button>
      </div>
    </div>`;
};

window.saveV360Section = async function(carId, section) {
  const fieldKeys = {
    vehicle:  ['model','year','Color','plate','chassis','motor'],
    contract: ['Contract','contract_start','contract_end',
               'license_end','insurance_end','monthly_fee'],
    owner:    ['owner_first','owner_last','phone','national_id','Bank']
  };

  const updates = {};
  (fieldKeys[section] || []).forEach(key => {
    const el = document.getElementById('v360-edit-' + key);
    if (el) updates[key] = el.value;
  });
  updates._sys_updated = firebase.firestore.FieldValue.serverTimestamp();

  try {
    await db.collection('fleet').doc(carId).update(updates);

    const idx = G.fleet.findIndex(c => c.id === carId);
    if (idx >= 0) Object.assign(G.fleet[idx], updates);

    await logAction('EDIT', 'Vehicle 360',
      `Updated ${section} for car: ${carId}`);

    toast('✅ Car details updated', 'success');
    loadVehicle360Details();

  } catch (e) {
    toast('Save failed: ' + e.message, 'error');
  }
};
