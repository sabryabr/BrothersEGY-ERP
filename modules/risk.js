// ============================================================
// modules/risk.js
// Risk Radar — license, insurance, contract expiry monitoring,
// deposit return risks, branch availability summary,
// branch and type filters, severity badges, sidebar badge
// ============================================================

// ============================================================
// ENTRY POINT
// ============================================================

window.renderRiskRadar = function() {
  renderPageLoading('page-risk-radar', '⚠️', 'Risk Radar');
  loadRiskRadar();
};

window.loadRiskRadar = async function() {
  const el = document.getElementById('page-risk-radar');
  if (!el) return;

  el.innerHTML = `
    <div class="section-header">
      <div>
        <h2>⚠️ Risk Radar</h2>
        <p>License, insurance and contract expiry monitoring for all fleet</p>
      </div>
      <div style="display:flex;gap:7px;align-items:center;flex-wrap:wrap;">
        <select id="risk-range" onchange="loadRiskRadar()"
          style="padding:7px 10px;background:var(--surface2);
            border:1px solid var(--border);border-radius:8px;
            color:var(--text);font-size:12px;">
          <option value="7">Next 7 Days</option>
          <option value="30">Next 30 Days</option>
          <option value="60" selected>Next 60 Days</option>
          <option value="90">Next 90 Days</option>
          <option value="180">Next 6 Months</option>
          <option value="365">Next 1 Year</option>
        </select>
        <button class="btn btn-ghost btn-sm"
          onclick="loadRiskRadar()">🔄 Refresh</button>
      </div>
    </div>

    <!-- KPI Row -->
    <div id="risk-kpis"
      style="display:grid;
        grid-template-columns:repeat(auto-fill,minmax(140px,1fr));
        gap:10px;margin-bottom:16px;">
    </div>

    <!-- Branch Availability Summary -->
    <div id="risk-branch-avail"
      style="display:grid;
        grid-template-columns:repeat(auto-fill,minmax(150px,1fr));
        gap:8px;margin-bottom:14px;">
    </div>

    <!-- Branch filter -->
    <div style="display:flex;gap:6px;margin-bottom:8px;
      flex-wrap:wrap;align-items:center;">
      <span style="font-size:9px;font-weight:800;color:var(--text3);
        text-transform:uppercase;">BRANCH:</span>
      <button class="btn btn-ghost btn-sm risk-branch-btn" id="rb-all"
        onclick="filterRiskBranch('all',this)"
        style="border-color:var(--accent);color:var(--accent);">
        🌐 All
      </button>
      <button class="btn btn-ghost btn-sm risk-branch-btn" id="rb-HRG"
        onclick="filterRiskBranch('HRG',this)">🌊 Hurghada</button>
      <button class="btn btn-ghost btn-sm risk-branch-btn" id="rb-ALX"
        onclick="filterRiskBranch('ALX',this)">🏙 Alexandria</button>
      <button class="btn btn-ghost btn-sm risk-branch-btn" id="rb-CAI"
        onclick="filterRiskBranch('CAI',this)">🏛 Cairo</button>
      <button class="btn btn-ghost btn-sm risk-branch-btn" id="rb-RSH"
        onclick="filterRiskBranch('RSH',this)">⚓ Rashid</button>
    </div>

    <!-- Type filter -->
    <div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;">
      <button class="btn btn-ghost btn-sm risk-type-btn"
        id="risk-type-all"
        style="border-color:var(--accent);color:var(--accent);"
        onclick="filterRiskTable('all',this)">
        📋 All
      </button>
      <button class="btn btn-ghost btn-sm risk-type-btn"
        id="risk-type-license"
        onclick="filterRiskTable('License',this)">
        🪪 License
      </button>
      <button class="btn btn-ghost btn-sm risk-type-btn"
        id="risk-type-insurance"
        onclick="filterRiskTable('Insurance',this)">
        🛡 Insurance
      </button>
      <button class="btn btn-ghost btn-sm risk-type-btn"
        id="risk-type-contract"
        onclick="filterRiskTable('Contract',this)">
        📄 Contract
      </button>
      <button class="btn btn-ghost btn-sm risk-type-btn"
        id="risk-type-deposit"
        onclick="filterRiskTable('Deposit',this)">
        🔒 Deposits
      </button>
    </div>

    <!-- Risk Table -->
    <div class="panel">
      <div id="risk-table-wrap" class="table-wrap">
        <div class="empty-state"><div class="spinner lg"></div></div>
      </div>
    </div>`;

  const days     = parseInt(document.getElementById('risk-range')?.value || 60);
  const today    = new Date();
  const allRisks = [];

  // ---- Fleet expiry risks ----
  G.fleet.forEach(car => {
    if (getCarStatusCategory(car) === 'archived') return;

    [
      { field: 'نهاية الترخيص', label: 'License',   icon: '🪪' },
      { field: 'نهاية التأمين', label: 'Insurance',  icon: '🛡' },
      { field: 'نهاية التعاقد', label: 'Contract',   icon: '📄' }
    ].forEach(({ field, label, icon }) => {
      const d = parseDBDate(car[field]);
      if (!d) return;
      const daysLeft = Math.ceil((d - today) / 86400000);
      if (daysLeft < -7 || daysLeft > days) return;
      allRisks.push({
        car,
        label,
        icon,
        date: d,
        daysLeft,
        risk:     daysLeft <= 0  ? 'expired' :
                  daysLeft <= 7  ? 'high'    :
                  daysLeft <= 14 ? 'high'    :
                  daysLeft <= 45 ? 'medium'  : 'low',
        carLabel: getCarLabel(car, 'en'),
        owner:    ((car['الاسم الأول'] || '') + ' ' +
                   (car['الاسم الأخير'] || '')).trim() || '—',
        plate:    car.plate || formatPlate(car)
      });
    });
  });

  // ---- Deposit return risks ----
  G.bookings.forEach(b => {
    const held     = parseAmount(b.deposit_held     || b['الوديعة المحتجزة'] || 0);
    const returned = parseAmount(b.deposit_returned || b['الوديعة المردودة'] || 0);
    const isClosed = b.closed || b.status === 'Closed' ||
                     b['حالة الطلب'] === 'Closed';
    const { end }  = getOrderDates(b);
    const daysLeft = end ? Math.ceil((end - today) / 86400000) : 99;

    if (held > returned && held > 0) {
      if (isClosed) {
        allRisks.push({
          car:         null,
          label:       'Deposit Return Due',
          icon:        '🔒',
          daysLeft:    -1,
          risk:        'expired',
          carLabel:    b.car_label || b['كود السيارة'] || '—',
          owner:       b['اسم العميل'] || '—',
          plate:       b['No.'] || b.id,
          depositNote: `${fmtMoney(held - returned)} not returned to client`,
          orderId:     b.id,
          orderNo:     b['No.'] || b.id,
          date:        null
        });
      } else if (daysLeft >= 0 && daysLeft <= 3) {
        allRisks.push({
          car:         null,
          label:       'Deposit Due Soon',
          icon:        '⚠️',
          daysLeft,
          risk:        daysLeft <= 0 ? 'expired' : 'high',
          carLabel:    b.car_label || b['كود السيارة'] || '—',
          owner:       b['اسم العميل'] || '—',
          plate:       b['No.'] || b.id,
          depositNote: `${fmtMoney(held - returned)} to return in ${daysLeft}d`,
          orderId:     b.id,
          orderNo:     b['No.'] || b.id,
          date:        end
        });
      }
    }
  });

  // Sort: expired first, then by days ascending
  allRisks.sort((a,b) => a.daysLeft - b.daysLeft);

  // Store for filtering
  window._riskData   = allRisks;
  window._riskBranch = 'all';
  window._riskType   = 'all';

  // ---- KPIs ----
  const expired     = allRisks.filter(r => r.risk === 'expired').length;
  const high        = allRisks.filter(r => r.risk === 'high').length;
  const medium      = allRisks.filter(r => r.risk === 'medium').length;
  const low         = allRisks.filter(r => r.risk === 'low').length;
  const depositRisk = allRisks.filter(r =>
    r.label === 'Deposit Return Due' || r.label === 'Deposit Due Soon'
  ).length;

  const kpiEl = document.getElementById('risk-kpis');
  if (kpiEl) {
    kpiEl.innerHTML = `
      <div class="kpi-card" style="cursor:pointer;"
        onclick="filterRiskTable('all',document.getElementById('risk-type-all'))">
        <div class="kpi-label">Total Risks</div>
        <div class="kpi-value text-accent">${allRisks.length}</div>
        <div class="kpi-sub">Within ${days} days</div>
      </div>
      <div class="kpi-card" style="cursor:pointer;"
        onclick="filterRiskTable('expired',null)">
        <div class="kpi-label">Expired</div>
        <div class="kpi-value text-danger">${expired}</div>
        <div class="kpi-sub">Immediate action required</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">High Risk</div>
        <div class="kpi-value text-danger">${high}</div>
        <div class="kpi-sub">Within 45 days</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Medium Risk</div>
        <div class="kpi-value text-warning">${medium}</div>
        <div class="kpi-sub">Within 60 days</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Low Risk</div>
        <div class="kpi-value text-success">${low}</div>
        <div class="kpi-sub">Expiring soon</div>
      </div>
      <div class="kpi-card" style="cursor:pointer;"
        onclick="filterRiskTable('Deposit',document.getElementById('risk-type-deposit'))">
        <div class="kpi-label">Deposit Returns Due</div>
        <div class="kpi-value" style="color:var(--warning);">${depositRisk}</div>
        <div class="kpi-sub">Unreturned deposits</div>
      </div>`;
  }

  // Update sidebar badge
  const rb = document.getElementById('badge-risk');
  if (rb) {
    rb.textContent = expired + high;
    rb.classList.toggle('hidden', (expired + high) === 0);
  }

  // ---- Branch availability summary ----
  const branchDefs = [
    { code: 'HRG', label: 'Hurghada',   icon: '🌊', keywords: ['hurghada','الغردقة','hrg']   },
    { code: 'ALX', label: 'Alexandria', icon: '🏙', keywords: ['alexandria','اسكندرية','alx'] },
    { code: 'CAI', label: 'Cairo',      icon: '🏛', keywords: ['cairo','قاهرة','cai']          },
    { code: 'RSH', label: 'Rashid',     icon: '⚓', keywords: ['rashid','رشيد','rsh']          }
  ];

  const activeCars = G.fleet.filter(c => getCarStatusCategory(c) !== 'archived');
  const branchAvailEl = document.getElementById('risk-branch-avail');
  if (branchAvailEl) {
    branchAvailEl.innerHTML = branchDefs.map(bd => {
      const branchCars = activeCars.filter(c => {
        const b = (c.Branch || c.City || c['المحافظة'] || c.current_location || '').toLowerCase();
        return bd.keywords.some(k => b.includes(k));
      });
      const avail  = branchCars.filter(c => getCarStatusCategory(c) === 'available').length;
      const rented = branchCars.filter(c => getCarStatusCategory(c) === 'rented').length;
      const other  = branchCars.length - avail - rented;
      return `
        <div class="kpi-card" style="cursor:pointer;"
          onclick="filterRiskBranch('${bd.code}',
            document.getElementById('rb-${bd.code}'))">
          <div class="kpi-label">${bd.icon} ${bd.label}</div>
          <div style="display:flex;gap:7px;align-items:baseline;margin:4px 0;">
            <span style="font-size:18px;font-weight:900;color:var(--success);">
              ${avail}
            </span>
            <span style="font-size:10px;color:var(--text3);">avail</span>
            <span style="font-size:14px;font-weight:700;color:var(--accent);">
              ${rented}
            </span>
            <span style="font-size:10px;color:var(--text3);">rented</span>
          </div>
          <div class="kpi-sub">${branchCars.length} total cars</div>
        </div>`;
    }).join('');
  }

  // Initial render
  renderRiskTable(allRisks);
};

// ============================================================
// BRANCH FILTER
// ============================================================

window.filterRiskBranch = function(branch, btn) {
  window._riskBranch = branch;

  // Update branch button styles
  document.querySelectorAll('.risk-branch-btn').forEach(b => {
    b.style.borderColor = 'var(--border)';
    b.style.color       = 'var(--text2)';
  });
  if (btn) {
    btn.style.borderColor = 'var(--accent)';
    btn.style.color       = 'var(--accent)';
  }

  _applyRiskFilters();
};

// ============================================================
// TYPE FILTER
// ============================================================

window.filterRiskTable = function(type, btn) {
  window._riskType = type;

  // Update type button styles
  document.querySelectorAll('.risk-type-btn').forEach(b => {
    b.style.borderColor = 'var(--border)';
    b.style.color       = 'var(--text2)';
  });
  if (btn) {
    btn.style.borderColor = 'var(--accent)';
    btn.style.color       = 'var(--accent)';
  }

  _applyRiskFilters();
};

// ============================================================
// APPLY COMBINED FILTERS
// ============================================================

function _applyRiskFilters() {
  const risks  = window._riskData || [];
  const branch = window._riskBranch || 'all';
  const type   = window._riskType   || 'all';

  let filtered = risks;

  // Branch filter
  if (branch !== 'all') {
    filtered = filtered.filter(r => {
      if (!r.car) return true; // deposit risks always shown
      return getCarBranchCode(r.car) === branch;
    });
  }

  // Type filter
  if (type === 'expired') {
    filtered = filtered.filter(r => r.risk === 'expired');
  } else if (type === 'Deposit') {
    filtered = filtered.filter(r =>
      r.label === 'Deposit Return Due' || r.label === 'Deposit Due Soon'
    );
  } else if (type !== 'all') {
    filtered = filtered.filter(r => r.label === type);
  }

  renderRiskTable(filtered);
}

// ============================================================
// RENDER RISK TABLE
// ============================================================

window.renderRiskTable = function(risks) {
  const wrap = document.getElementById('risk-table-wrap');
  if (!wrap) return;

  if (!risks.length) {
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="es-icon">✅</div>
        <p>No risks found in this category</p>
      </div>`;
    return;
  }

  wrap.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Car</th>
          <th>Plate / Ref</th>
          <th>Risk Type</th>
          <th>Expires / Note</th>
          <th>Days Left</th>
          <th>Risk Level</th>
          <th>Owner / Client</th>
          <th>Branch</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${risks.map(r => {
          const isDepositRisk = r.label === 'Deposit Return Due' ||
                                r.label === 'Deposit Due Soon';
          const carId = isDepositRisk
            ? null
            : (r.car?.ID || r.car?.id);

          const riskColor = r.risk === 'expired' ? 'var(--danger)'  :
                            r.risk === 'high'    ? 'var(--danger)'  :
                            r.risk === 'medium'  ? 'var(--warning)' : 'var(--success)';

          const borderColor = r.risk === 'expired' ? '#ef4444' :
                              r.risk === 'high'    ? '#f97316' :
                              r.risk === 'medium'  ? '#eab308' : '#22c55e';

          const branchCode = r.car ? getCarBranchCode(r.car) : '';
          const branchName = BRANCH_MAP[branchCode] || branchCode || '—';

          const daysDisplay = isDepositRisk
            ? (r.daysLeft < 0 ? 'Overdue' : r.daysLeft + ' days')
            : (r.daysLeft <= 0
                ? `EXPIRED ${Math.abs(r.daysLeft)}d ago`
                : r.daysLeft + ' days');

          return `
            <tr style="border-left:3px solid ${borderColor};">
              <td style="font-size:11px;max-width:160px;
                white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                ${carId
                  ? `<span style="cursor:pointer;color:var(--accent);"
                      onclick="openCarDetailModal('${carId}')">
                      ${r.carLabel}
                    </span>`
                  : r.carLabel}
              </td>
              <td style="font-size:11px;">${r.plate || '—'}</td>
              <td>${r.icon} ${r.label}</td>
              <td style="font-size:11px;">
                ${r.depositNote || (r.date ? fmtDateShort(r.date) : '—')}
              </td>
              <td>
                <strong style="color:${riskColor};">${daysDisplay}</strong>
              </td>
              <td>
                <span class="pill pill-${
                  r.risk === 'expired' ? 'high'   :
                  r.risk === 'high'    ? 'high'   :
                  r.risk === 'medium'  ? 'medium' : 'low'}">
                  ${r.risk.toUpperCase()}
                </span>
              </td>
              <td style="font-size:11px;">${r.owner}</td>
              <td style="font-size:11px;">${branchName}</td>
              <td>
                <div style="display:flex;gap:3px;">
                  ${isDepositRisk ? `
                    <button class="btn btn-ghost btn-xs"
                      onclick="openOrderDetail('${r.orderId}')"
                      title="Open Order">
                      📋
                    </button>
                    <button class="btn btn-warning btn-xs"
                      onclick="addDepositPayment('${r.orderId}','return')"
                      title="Return Deposit">
                      ↩️
                    </button>` : `
                    <button class="btn btn-ghost btn-xs"
                      onclick="showPage('vehicle-360');
                        setTimeout(()=>loadVehicle360ById('${carId}'),300)"
                      title="Vehicle 360">
                      🔭
                    </button>
                    <button class="btn btn-ghost btn-xs"
                      onclick="openCarDetailModal('${carId}')"
                      title="Car Details">
                      👁
                    </button>`}
                </div>
              </td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>
    <div style="padding:9px 11px;font-size:11px;color:var(--text3);
      border-top:1px solid var(--border);">
      Showing ${risks.length} risk item${risks.length !== 1 ? 's' : ''}
    </div>`;
};
