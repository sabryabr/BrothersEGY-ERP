// ============================================================
// modules/risk.js v4.1
// Risk Radar — license, insurance, contract expiry monitoring
// ============================================================

window.renderRiskRadar = function() {
  renderPageLoading('page-risk-radar', '⚠️', 'Risk Radar');
  loadRiskRadar();
};

window.loadRiskRadar = async function() {
  const el = document.getElementById('page-risk-radar');
  if (!el) return;

  const hKey      = 'risk_radar_header_collapsed';
  const collapsed = localStorage.getItem(hKey) === 'true';

  el.innerHTML = `
    <!-- Collapsible Header -->
    <div style="background:var(--surface2);border:1px solid var(--border);
                border-radius:var(--radius);margin-bottom:12px;overflow:hidden;">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;
                  padding:10px 14px;cursor:pointer;"
           onclick="toggleRiskHeader()">
        <div style="flex:1;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <h2 style="margin:0;font-size:16px;font-weight:800;">⚠️ Risk Radar</h2>
            <span style="color:var(--text3);font-size:11px;">
              License, insurance and contract expiry monitoring — valid contracts only
            </span>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;"
             onclick="event.stopPropagation()">
          <!-- Window filter -->
          <select id="risk-window" onchange="renderRiskContent()"
            style="padding:5px 8px;background:var(--surface);
                   border:1px solid var(--border);border-radius:6px;
                   color:var(--text);font-size:11px;">
            <option value="7">Next 7 Days</option>
            <option value="30">Next 30 Days</option>
            <option value="60" selected>Next 60 Days</option>
            <option value="90">Next 90 Days</option>
            <option value="180">Next 6 Months</option>
            <option value="365">Next 1 Year</option>
          </select>

          <!-- Type filter -->
          <select id="risk-type-filter" onchange="renderRiskContent()"
            style="padding:5px 8px;background:var(--surface);
                   border:1px solid var(--border);border-radius:6px;
                   color:var(--text);font-size:11px;">
            <option value="all">All Types</option>
            <option value="license">📋 License</option>
            <option value="insurance">🛡️ Insurance</option>
            <option value="contract">📄 Contract</option>
            <option value="handover">🔑 Handover</option>
            <option value="inspection">🔍 Inspection</option>
          </select>

          <!-- Severity filter -->
          <select id="risk-sev-filter" onchange="renderRiskContent()"
            style="padding:5px 8px;background:var(--surface);
                   border:1px solid var(--border);border-radius:6px;
                   color:var(--text);font-size:11px;">
            <option value="all">All Severity</option>
            <option value="expired">🔴 Expired</option>
            <option value="high">🟠 High Risk</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">🟢 Low</option>
          </select>

          <button class="btn btn-ghost btn-sm"
            onclick="loadRiskRadar()">🔄 Refresh</button>
          <button id="risk-toggle-btn"
            onclick="toggleRiskHeader()"
            style="background:var(--surface);border:1px solid var(--border);
                   border-radius:6px;padding:3px 8px;cursor:pointer;
                   color:var(--text3);font-size:11px;">
            ${collapsed ? '▼ Show' : '▲ Hide'}
          </button>
        </div>
      </div>

      <!-- Collapsible KPI summary -->
      <div id="risk-header-collapsible"
        style="overflow:hidden;transition:max-height 0.3s ease;
               max-height:${collapsed ? '0px' : '300px'};">
        <div style="padding:0 14px 12px;">
          <div id="risk-kpi-bar"
            style="display:flex;gap:8px;flex-wrap:wrap;"></div>
        </div>
      </div>
    </div>

    <!-- Branch availability strip -->
    <div id="risk-branch-strip"
      style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;"></div>

    <!-- Main content -->
    <div id="risk-content">
      <div class="empty-state">
        <div class="spinner lg"></div>
      </div>
    </div>
  `;

  window.toggleRiskHeader = function() {
    const body = document.getElementById('risk-header-collapsible');
    const btn  = document.getElementById('risk-toggle-btn');
    if (!body) return;
    const isNowCollapsed = body.style.maxHeight !== '0px';
    body.style.maxHeight = isNowCollapsed ? '0px' : '300px';
    if (btn) btn.textContent = isNowCollapsed ? '▼ Show' : '▲ Hide';
    localStorage.setItem(hKey, isNowCollapsed ? 'true' : 'false');
  };

  if (!G.fleet || !G.fleet.length) await loadFleetData();
  renderRiskContent();
};

window.renderRiskContent = function() {
  const windowDays  = parseInt(document.getElementById('risk-window')?.value      || '60');
  const typeFilter  = document.getElementById('risk-type-filter')?.value           || 'all';
  const sevFilter   = document.getElementById('risk-sev-filter')?.value            || 'all';
  const today       = getCairoNow();
  const deadline    = new Date(today.getTime() + windowDays * 86400000);

  const risks = [];

  G.fleet.forEach(car => {
    // ✅ ONLY show valid contract cars — skip archived AND expired contracts
    const catStatus = getCarStatusCategory(car);
    if (catStatus === 'archived') return;

    // ✅ Only cars with valid/active contracts
    const contract = String(car.Contract || car['حاله التعاقد'] || '').toLowerCase();
    const isValidContract = contract === 'valid' || contract === 'ساري' ||
                            catStatus === 'rented' || catStatus === 'available' ||
                            catStatus === 'accident' || catStatus === 'maintenance';
    if (!isValidContract) return;

    const label    = getCarLabel(car, 'en');
    const plateStr = formatPlate(car);
    const carId    = car.id || car.ID;

    // ✅ Fixed branch detection — checks all possible location fields
    const branchRaw = (
      car.Branch || car.City || car['المحافظة'] || car['محافظة'] ||
      car['اسم الفرع'] || car.current_location || ''
    ).toLowerCase();
    let branchLabel = '—';
    if (branchRaw.includes('hurghada') || branchRaw.includes('الغردقة') ||
        branchRaw.includes('hrg')      || branchRaw.startsWith('hrg')) {
      branchLabel = 'HRG';
    } else if (branchRaw.includes('alexandria') || branchRaw.includes('اسكندرية') ||
               branchRaw.includes('alx')) {
      branchLabel = 'ALX';
    } else if (branchRaw.includes('cairo') || branchRaw.includes('قاهرة') ||
               branchRaw.includes('cai')) {
      branchLabel = 'CAI';
    } else if (branchRaw.includes('rashid') || branchRaw.includes('رشيد') ||
               branchRaw.includes('rsh')) {
      branchLabel = 'RSH';
    } else if (branchRaw) {
      branchLabel = branchRaw.slice(0, 10);
    }

    function parseCarDate(val) {
      if (!val) return null;
      const s = String(val).trim();
      if (!s || s === '-' || s === 'لا يوجد' || s === '0') return null;
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    }

    function daysUntil(d) {
      if (!d) return null;
      return Math.ceil((d - today) / 86400000);
    }

    function severity(days) {
      if (days === null) return null;
      if (days < 0)   return 'expired';
      if (days <= 45) return 'high';
      if (days <= 60) return 'medium';
      return 'low';
    }

    // 1. License
    const licDate = parseCarDate(car['نهاية الترخيص']);
    const licDays = daysUntil(licDate);
    if (licDate && (licDate <= deadline || licDays < 0)) {
      risks.push({
        carId, label, plateStr, branch: branchLabel,
        type     : 'license',
        typeLabel: '📋 License',
        date     : licDate,
        days     : licDays,
        severity : severity(licDays),
        status   : car['حاله الترخيص'] || car.License || '—'
      });
    }

    // 2. Insurance
    const insDate = parseCarDate(car['نهاية التأمين']);
    const insDays = daysUntil(insDate);
    if (insDate && (insDate <= deadline || insDays < 0)) {
      risks.push({
        carId, label, plateStr, branch: branchLabel,
        type     : 'insurance',
        typeLabel: '🛡️ Insurance',
        date     : insDate,
        days     : insDays,
        severity : severity(insDays),
        status   : car['حالة التأمين'] || car.Insurance || '—',
        company  : car['شركة التأمين'] || car['Insurance Comp.'] || '—'
      });
    }

    // 3. Contract
    const conDate = parseCarDate(car['نهاية التعاقد']);
    const conDays = daysUntil(conDate);
    if (conDate && (conDate <= deadline || conDays < 0)) {
      risks.push({
        carId, label, plateStr, branch: branchLabel,
        type     : 'contract',
        typeLabel: '📄 Contract',
        date     : conDate,
        days     : conDays,
        severity : severity(conDays),
        status   : car['حاله التعاقد'] || car.Contract || '—'
      });
    }

    // 4. Handover
    const handDate = parseCarDate(car['تاريخ التسليم']);
    const handDays = daysUntil(handDate);
    if (handDate && handDays !== null && handDays >= 0 && handDate <= deadline) {
      risks.push({
        carId, label, plateStr, branch: branchLabel,
        type     : 'handover',
        typeLabel: '🔑 Handover',
        date     : handDate,
        days     : handDays,
        severity : severity(handDays),
        status   : 'Upcoming return to owner'
      });
    }

    // 5. Inspection
    const inspDate = parseCarDate(car['تاريخ الفحص']);
    const inspDays = daysUntil(inspDate);
    if (inspDate && (inspDate <= deadline || inspDays < 0)) {
      risks.push({
        carId, label, plateStr, branch: branchLabel,
        type     : 'inspection',
        typeLabel: '🔍 Inspection',
        date     : inspDate,
        days     : inspDays,
        severity : severity(inspDays),
        status   : '—'
      });
    }
  });

  // 6. Unreturned deposits
  const depositRisks = [];
  if (G.bookings) {
    G.bookings.forEach(b => {
      const held     = parseAmount(b['الوديعة المحتجزة'] || b.deposit_held     || 0);
      const returned = parseAmount(b['الوديعة المردودة'] || b.deposit_returned || 0);
      const balance  = held - returned;
      if (balance <= 0) return;
      const st = getOrderStatus(b);
      if (st !== 'Closed' && !b.closed) return;
      depositRisks.push({
        orderId : b.id,
        orderNo : b['No.'] || b.id,
        client  : getOrderClientName(b) || '—',
        balance,
        carLabel: b['اسم السيارة'] || '—'
      });
    });
  }

  // Sort: expired first, then by days asc
  risks.sort((a, b) => {
    if (a.days === null) return 1;
    if (b.days === null) return -1;
    return a.days - b.days;
  });

  // KPI counts (always from full unfiltered risks)
  const expired = risks.filter(r => r.severity === 'expired').length;
  const high    = risks.filter(r => r.severity === 'high').length;
  const medium  = risks.filter(r => r.severity === 'medium').length;
  const low     = risks.filter(r => r.severity === 'low').length;

  // ── KPI bar ──────────────────────────────────────────────
  const kpiBar = document.getElementById('risk-kpi-bar');
  if (kpiBar) {
    const kpis = [
      { label:'Total Risks',         value:risks.length,        color:'var(--accent)',  sub:`Within ${windowDays} days`,   filter:'' },
      { label:'Expired',             value:expired,             color:'var(--danger)',  sub:'Immediate action required',    filter:'expired' },
      { label:'High Risk',           value:high,                color:'#f97316',        sub:'Within 45 days',               filter:'high' },
      { label:'Medium Risk',         value:medium,              color:'var(--warning)', sub:'Within 60 days',               filter:'medium' },
      { label:'Low Risk',            value:low,                 color:'var(--success)', sub:'Expiring soon',                filter:'low' },
      { label:'Deposit Returns Due', value:depositRisks.length, color:'#8b5cf6',        sub:'Unreturned deposits',           filter:'' }
    ];

    kpiBar.innerHTML = kpis.map(k => `
      <div style="background:var(--surface);border:1px solid var(--border);
                  border-radius:10px;padding:10px 16px;text-align:center;
                  min-width:100px;cursor:${k.filter ? 'pointer' : 'default'};"
           ${k.filter ? `onclick="setRiskSeverityFilter('${k.filter}')"` : ''}>
        <div style="font-size:10px;font-weight:700;color:var(--text3);
                    margin-bottom:4px;">
          ${k.label}
        </div>
        <div style="font-size:22px;font-weight:900;color:${k.color};">
          ${k.value}
        </div>
        <div style="font-size:9px;color:var(--text3);">${k.sub}</div>
      </div>`).join('');
  }

  // ── Branch strip ─────────────────────────────────────────
  const strip = document.getElementById('risk-branch-strip');
  if (strip) {
    const branches = [
      { code:'HRG', label:'🌊 Hurghada',  terms:['hurghada','الغردقة','hrg'] },
      { code:'ALX', label:'🏙 Alexandria', terms:['alexandria','اسكندرية','alx'] },
      { code:'CAI', label:'🏛 Cairo',      terms:['cairo','قاهرة','cai'] },
      { code:'RSH', label:'⚓ Rashid',     terms:['rashid','رشيد','rsh'] }
    ];

    strip.innerHTML = branches.map(br => {
      // ✅ Fixed: check all location fields
      const brCars = G.fleet.filter(c => {
        if (getCarStatusCategory(c) === 'archived') return false;
        const b = (
          c.Branch || c.City || c['المحافظة'] || c['محافظة'] ||
          c['اسم الفرع'] || c.current_location || ''
        ).toLowerCase();
        return br.terms.some(t => b.includes(t));
      });

      const avail  = brCars.filter(c => getCarStatusCategory(c) === 'available').length;
      const rented = brCars.filter(c => getCarStatusCategory(c) === 'rented').length;
      const total  = brCars.length;

      // Count risks for this branch
      const branchRisks = risks.filter(r => r.branch === br.code);
      const brExpired   = branchRisks.filter(r => r.severity === 'expired').length;
      const brHigh      = branchRisks.filter(r => r.severity === 'high').length;

      return `
        <div style="background:var(--surface2);border:1px solid ${
          brExpired > 0 ? 'rgba(239,68,68,0.4)' :
          brHigh    > 0 ? 'rgba(249,115,22,0.4)' : 'var(--border)'
        };border-radius:10px;padding:10px 14px;min-width:140px;">
          <div style="font-size:11px;font-weight:800;margin-bottom:6px;">
            ${br.label}
          </div>
          <div style="display:flex;gap:8px;font-size:11px;margin-bottom:4px;">
            <span style="color:var(--success);font-weight:700;">
              <strong>${avail}</strong> avail
            </span>
            <span style="color:var(--accent);font-weight:700;">
              <strong>${rented}</strong> rented
            </span>
          </div>
          <div style="font-size:10px;color:var(--text3);">${total} total cars</div>
          ${branchRisks.length > 0 ? `
            <div style="font-size:10px;margin-top:4px;">
              ${brExpired > 0
                ? `<span style="color:var(--danger);font-weight:700;">
                     ⚠️ ${brExpired} expired
                   </span>`
                : ''}
              ${brHigh > 0
                ? `<span style="color:#f97316;font-weight:700;margin-left:4px;">
                     🔥 ${brHigh} high risk
                   </span>`
                : ''}
              ${branchRisks.length - brExpired - brHigh > 0
                ? `<span style="color:var(--text3);margin-left:4px;">
                     +${branchRisks.length - brExpired - brHigh} more
                   </span>`
                : ''}
            </div>` : ''}
        </div>`;
    }).join('');
  }

  // ── Apply active filters ──────────────────────────────────
  let filteredRisks = [...risks];
  if (typeFilter !== 'all') {
    filteredRisks = filteredRisks.filter(r => r.type === typeFilter);
  }
  if (sevFilter !== 'all') {
    filteredRisks = filteredRisks.filter(r => r.severity === sevFilter);
  }

  // ── Active filter pills ───────────────────────────────────
  const content = document.getElementById('risk-content');
  if (!content) return;

  const activePills = [];
  if (typeFilter !== 'all') {
    const typeNames = {
      license:'License', insurance:'Insurance', contract:'Contract',
      handover:'Handover', inspection:'Inspection'
    };
    activePills.push({
      label : `Type: ${typeNames[typeFilter] || typeFilter}`,
      clear : `document.getElementById('risk-type-filter').value='all';renderRiskContent()`
    });
  }
  if (sevFilter !== 'all') {
    activePills.push({
      label : `Severity: ${sevFilter.charAt(0).toUpperCase() + sevFilter.slice(1)}`,
      clear : `document.getElementById('risk-sev-filter').value='all';renderRiskContent()`
    });
  }

  const pillsHtml = activePills.length > 0 ? `
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
      ${activePills.map(p => `
        <span style="padding:3px 10px;border-radius:99px;font-size:10px;
                     font-weight:700;background:rgba(59,130,246,0.15);
                     color:var(--accent);border:1px solid rgba(59,130,246,0.3);
                     cursor:pointer;"
              onclick="${p.clear}">
          ${p.label} ✕
        </span>`).join('')}
      <span style="padding:3px 10px;border-radius:99px;font-size:10px;
                   font-weight:700;background:var(--surface2);color:var(--text3);
                   border:1px solid var(--border);cursor:pointer;"
            onclick="document.getElementById('risk-type-filter').value='all';
                     document.getElementById('risk-sev-filter').value='all';
                     renderRiskContent()">
        ✕ Clear All
      </span>
    </div>` : '';

  if (filteredRisks.length === 0 && depositRisks.length === 0) {
    content.innerHTML = pillsHtml + `
      <div class="empty-state" style="padding:60px 20px;">
        <div style="font-size:48px;margin-bottom:16px;">✅</div>
        <p style="font-size:14px;font-weight:700;color:var(--success);">
          ${risks.length === 0 ? 'All Clear!' : 'No results for selected filters'}
        </p>
        <p style="color:var(--text3);">
          ${risks.length === 0
            ? `No expiring documents within ${windowDays} days.`
            : `${risks.length} total risks found — adjust filters to see them.`}
        </p>
        ${risks.length > 0 ? `
          <button class="btn btn-ghost btn-sm" style="margin-top:12px;"
            onclick="document.getElementById('risk-type-filter').value='all';
                     document.getElementById('risk-sev-filter').value='all';
                     renderRiskContent()">
            Clear Filters
          </button>` : ''}
      </div>`;
    return;
  }

  // Group filtered risks by type
  const grouped = {};
  filteredRisks.forEach(r => {
    if (!grouped[r.type]) grouped[r.type] = [];
    grouped[r.type].push(r);
  });

  const typeOrder = ['license','insurance','contract','handover','inspection'];
  const typeIcons = {
    license   : '📋 License Expiry',
    insurance : '🛡️ Insurance Expiry',
    contract  : '📄 Contract Expiry',
    handover  : '🔑 Upcoming Handovers',
    inspection: '🔍 Inspection Due'
  };

  const sevColors = {
    expired: { bg:'rgba(239,68,68,0.12)',  border:'rgba(239,68,68,0.4)',  text:'#f87171', badge:'EXPIRED'   },
    high   : { bg:'rgba(249,115,22,0.12)', border:'rgba(249,115,22,0.4)', text:'#fb923c', badge:'HIGH RISK' },
    medium : { bg:'rgba(245,158,11,0.12)', border:'rgba(245,158,11,0.4)', text:'#fbbf24', badge:'MEDIUM'    },
    low    : { bg:'rgba(34,197,94,0.08)',  border:'rgba(34,197,94,0.3)',  text:'#4ade80', badge:'LOW'       }
  };

  let html = pillsHtml;

  // Results count
  html += `
    <div style="font-size:11px;color:var(--text3);margin-bottom:10px;">
      Showing <strong>${filteredRisks.length}</strong> risk${filteredRisks.length !== 1 ? 's' : ''}
      ${filteredRisks.length < risks.length
        ? ` <span style="color:var(--accent);">(of ${risks.length} total)</span>`
        : ''}
    </div>`;

  // Risks by type
  typeOrder.forEach(type => {
    const group = grouped[type];
    if (!group || group.length === 0) return;

    html += `
      <div style="background:var(--surface2);border:1px solid var(--border);
                  border-radius:var(--radius);margin-bottom:12px;overflow:hidden;">
        <div style="padding:10px 14px;border-bottom:1px solid var(--border);
                    display:flex;align-items:center;justify-content:space-between;">
          <div style="font-size:13px;font-weight:800;">${typeIcons[type]}</div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:11px;color:var(--text3);">
              ${group.length} car${group.length > 1 ? 's' : ''}
            </span>
            <!-- Quick filter by this type -->
            <button class="btn btn-ghost btn-xs"
              onclick="setRiskTypeFilter('${type}')">
              Filter
            </button>
          </div>
        </div>
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:11px;">
            <thead>
              <tr style="background:var(--surface);color:var(--text3);
                         font-size:10px;font-weight:700;text-transform:uppercase;">
                <th style="padding:8px;text-align:left;">Car</th>
                <th style="padding:8px;text-align:left;">Plate</th>
                <th style="padding:8px;text-align:left;">Branch</th>
                <th style="padding:8px;text-align:left;">Expiry Date</th>
                <th style="padding:8px;text-align:center;">Days</th>
                <th style="padding:8px;text-align:center;">Risk</th>
                <th style="padding:8px;text-align:left;">Status</th>
                <th style="padding:8px;text-align:center;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${group.map(r => {
                const sc        = sevColors[r.severity] || sevColors.low;
                const daysLabel = r.days === null ? '—'
                  : r.days < 0   ? `${Math.abs(r.days)}d ago`
                  : r.days === 0 ? 'TODAY'
                  : `${r.days}d`;
                const rowBg     = r.severity === 'expired'
                  ? 'rgba(239,68,68,0.04)' : 'transparent';
                return `
                  <tr style="border-bottom:1px solid var(--border);background:${rowBg};"
                      onmouseover="this.style.background='var(--surface2)'"
                      onmouseout="this.style.background='${rowBg}'">
                    <td style="padding:8px;font-weight:600;">
                      <span style="cursor:pointer;color:var(--accent);"
                            onclick="openCarDetailModal('${r.carId}')">
                        ${r.label}
                      </span>
                    </td>
                    <td style="padding:8px;font-family:monospace;font-size:10px;">
                      ${r.plateStr || '—'}
                    </td>
                    <td style="padding:8px;color:var(--text3);">
                      ${BRANCH_MAP[r.branch] || r.branch || '—'}
                    </td>
                    <td style="padding:8px;">
                      ${r.date ? r.date.toLocaleDateString('en-GB', {
                        day:'2-digit', month:'short', year:'numeric'
                      }) : '—'}
                    </td>
                    <td style="padding:8px;text-align:center;font-weight:800;
                               color:${sc.text};">
                      ${daysLabel}
                    </td>
                    <td style="padding:8px;text-align:center;">
                      <span style="padding:2px 7px;border-radius:99px;font-size:9px;
                                   font-weight:800;background:${sc.bg};
                                   color:${sc.text};border:1px solid ${sc.border};">
                        ${sc.badge}
                      </span>
                    </td>
                    <td style="padding:8px;color:var(--text3);font-size:10px;">
                      ${r.status}
                      ${r.company
                        ? `<br><span style="color:var(--text3);">${r.company}</span>`
                        : ''}
                    </td>
                    <td style="padding:8px;text-align:center;">
                      <button class="btn btn-ghost btn-xs"
                        onclick="openCarDetailModal('${r.carId}')">👁</button>
                      <button class="btn btn-ghost btn-xs"
                        onclick="openCarEditModal('${r.carId}')">✏️</button>
                    </td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  });

  // Deposit risks section
  if (depositRisks.length > 0 && (typeFilter === 'all')) {
    html += `
      <div style="background:var(--surface2);border:1px solid var(--border);
                  border-radius:var(--radius);margin-bottom:12px;overflow:hidden;">
        <div style="padding:10px 14px;border-bottom:1px solid var(--border);
                    display:flex;align-items:center;justify-content:space-between;">
          <div style="font-size:13px;font-weight:800;">
            🔒 Unreturned Deposits (Closed Orders)
          </div>
          <span style="font-size:11px;color:var(--text3);">
            ${depositRisks.length} order${depositRisks.length > 1 ? 's' : ''}
          </span>
        </div>
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:11px;">
            <thead>
              <tr style="background:var(--surface);color:var(--text3);
                         font-size:10px;font-weight:700;text-transform:uppercase;">
                <th style="padding:8px;text-align:left;">Order #</th>
                <th style="padding:8px;text-align:left;">Client</th>
                <th style="padding:8px;text-align:left;">Car</th>
                <th style="padding:8px;text-align:right;">Balance</th>
                <th style="padding:8px;text-align:center;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${depositRisks.map(d => `
                <tr style="border-bottom:1px solid var(--border);"
                    onmouseover="this.style.background='var(--surface2)'"
                    onmouseout="this.style.background=''">
                  <td style="padding:8px;">
                    <span style="color:var(--accent);font-weight:700;cursor:pointer;"
                          onclick="openOrderDetail('${d.orderId}')">
                      #${d.orderNo}
                    </span>
                  </td>
                  <td style="padding:8px;">${d.client}</td>
                  <td style="padding:8px;color:var(--text3);">${d.carLabel}</td>
                  <td style="padding:8px;text-align:right;font-weight:700;color:#8b5cf6;">
                    ${fmtMoney(d.balance)}
                  </td>
                  <td style="padding:8px;text-align:center;">
                    <button class="btn btn-ghost btn-xs"
                      onclick="openOrderDetail('${d.orderId}')">👁</button>
                    <button class="btn btn-primary btn-xs"
                      onclick="addDepositPayment('${d.orderId}','return')">
                      ↩️ Return
                    </button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  content.innerHTML = html;
};

// ── Quick filter helpers ───────────────────────────────────
window.setRiskSeverityFilter = function(sev) {
  const sel = document.getElementById('risk-sev-filter');
  if (sel) sel.value = sev;
  renderRiskContent();
};

window.setRiskTypeFilter = function(type) {
  const sel = document.getElementById('risk-type-filter');
  if (sel) sel.value = type;
  renderRiskContent();
};
