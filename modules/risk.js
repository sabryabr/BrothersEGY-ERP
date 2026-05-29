// ============================================================
// modules/risk.js
// Risk Radar — license, insurance, contract expiry monitoring
// ============================================================

window.renderRiskRadar = function() {
  renderPageLoading('page-risk-radar', '⚠️', 'Risk Radar');
  loadRiskRadar();
};

window.loadRiskRadar = async function() {
  const el = document.getElementById('page-risk-radar');
  if (!el) return;

  // Collapsible header state
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
              License, insurance and contract expiry monitoring for all fleet
            </span>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;"
             onclick="event.stopPropagation()">
          <!-- Window filter -->
          <select id="risk-window" onchange="renderRiskContent()"
            style="padding:5px 8px;background:var(--surface);border:1px solid var(--border);
                   border-radius:6px;color:var(--text);font-size:11px;">
            <option value="7">Next 7 Days</option>
            <option value="30">Next 30 Days</option>
            <option value="60" selected>Next 60 Days</option>
            <option value="90">Next 90 Days</option>
            <option value="180">Next 6 Months</option>
            <option value="365">Next 1 Year</option>
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
  const windowDays = parseInt(
    document.getElementById('risk-window')?.value || '60'
  );
  const today    = getCairoNow();
  const deadline = new Date(today.getTime() + windowDays * 86400000);

  // ── Parse all fleet risk items ──────────────────────────────
  const risks = [];

  G.fleet.forEach(car => {
    // Skip truly archived cars
    if (car.archived === true || car.is_active === false) return;

    const label    = getCarLabel(car, 'en');
    const plateStr = formatPlate(car);
    const carId    = car.id || car.ID;
    const branch   = car.Branch || car.City || car['المحافظة'] || '—';

    // ── Helper: parse a date field from car ──────────────────
    function parseCarDate(val) {
      if (!val) return null;
      const s = String(val).trim();
      if (!s || s === '-' || s === 'لا يوجد') return null;
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

    // ── 1. License expiry ─────────────────────────────────────
    // Fields: نهاية الترخيص
    const licDate  = parseCarDate(car['نهاية الترخيص']);
    const licDays  = daysUntil(licDate);
    const licSev   = severity(licDays);
    if (licDate && (licDate <= deadline || licDays < 0)) {
      risks.push({
        carId, label, plateStr, branch,
        type     : 'license',
        typeLabel: '📋 License',
        date     : licDate,
        days     : licDays,
        severity : licSev,
        field    : 'نهاية الترخيص',
        status   : car['حاله الترخيص'] || car.License || '—'
      });
    }

    // ── 2. Insurance expiry ───────────────────────────────────
    // Fields: نهاية التأمين
    const insDate  = parseCarDate(car['نهاية التأمين']);
    const insDays  = daysUntil(insDate);
    const insSev   = severity(insDays);
    if (insDate && (insDate <= deadline || insDays < 0)) {
      risks.push({
        carId, label, plateStr, branch,
        type     : 'insurance',
        typeLabel: '🛡️ Insurance',
        date     : insDate,
        days     : insDays,
        severity : insSev,
        field    : 'نهاية التأمين',
        status   : car['حالة التأمين'] || car.Insurance || '—',
        company  : car['شركة التأمين'] || car['Insurance Comp.'] || '—'
      });
    }

    // ── 3. Contract expiry ────────────────────────────────────
    // Fields: نهاية التعاقد
    const conDate  = parseCarDate(car['نهاية التعاقد']);
    const conDays  = daysUntil(conDate);
    const conSev   = severity(conDays);
    if (conDate && (conDate <= deadline || conDays < 0)) {
      risks.push({
        carId, label, plateStr, branch,
        type     : 'contract',
        typeLabel: '📄 Contract',
        date     : conDate,
        days     : conDays,
        severity : conSev,
        field    : 'نهاية التعاقد',
        status   : car['حاله التعاقد'] || car.Contract || '—'
      });
    }

    // ── 4. Handover date ──────────────────────────────────────
    // Fields: تاريخ التسليم
    const handDate = parseCarDate(car['تاريخ التسليم']);
    const handDays = daysUntil(handDate);
    const handSev  = severity(handDays);
    if (handDate && handDays !== null && handDays >= 0 && handDate <= deadline) {
      risks.push({
        carId, label, plateStr, branch,
        type     : 'handover',
        typeLabel: '🔑 Handover',
        date     : handDate,
        days     : handDays,
        severity : handSev,
        field    : 'تاريخ التسليم',
        status   : 'Upcoming return to owner'
      });
    }

    // ── 5. Inspection date ────────────────────────────────────
    // Fields: تاريخ الفحص
    const inspDate = parseCarDate(car['تاريخ الفحص']);
    const inspDays = daysUntil(inspDate);
    const inspSev  = severity(inspDays);
    if (inspDate && (inspDate <= deadline || inspDays < 0)) {
      risks.push({
        carId, label, plateStr, branch,
        type     : 'inspection',
        typeLabel: '🔍 Inspection',
        date     : inspDate,
        days     : inspDays,
        severity : inspSev,
        field    : 'تاريخ الفحص',
        status   : '—'
      });
    }
  });

  // ── 6. Unreturned deposits from bookings ──────────────────
  const depositRisks = [];
  if (G.bookings) {
    G.bookings.forEach(b => {
      const held     = parseAmount(b['الوديعة المحتجزة'] || b.deposit_held     || 0);
      const returned = parseAmount(b['الوديعة المردودة'] || b.deposit_returned || 0);
      const balance  = held - returned;
      if (balance <= 0) return;
      const st = getOrderStatus(b);
      if (st !== 'Closed' && !b.closed) return; // only flag closed orders with held deposit
      depositRisks.push({
        orderId  : b.id,
        orderNo  : b['No.'] || b.id,
        client   : getOrderClientName(b) || '—',
        balance,
        carLabel : b['اسم السيارة'] || '—'
      });
    });
  }

  // ── Sort risks: expired first, then by days asc ──────────
  risks.sort((a, b) => {
    if (a.days === null) return 1;
    if (b.days === null) return -1;
    return (a.days) - (b.days);
  });

  // ── KPI counts ────────────────────────────────────────────
  const expired  = risks.filter(r => r.severity === 'expired').length;
  const high     = risks.filter(r => r.severity === 'high').length;
  const medium   = risks.filter(r => r.severity === 'medium').length;
  const low      = risks.filter(r => r.severity === 'low').length;

  // ── KPI bar ───────────────────────────────────────────────
  const kpiBar = document.getElementById('risk-kpi-bar');
  if (kpiBar) {
    const kpis = [
      { label:'Total Risks',         value: risks.length,        color:'var(--accent)',   sub:`Within ${windowDays} days` },
      { label:'Expired',             value: expired,             color:'var(--danger)',   sub:'Immediate action required' },
      { label:'High Risk',           value: high,                color:'#f97316',         sub:'Within 45 days' },
      { label:'Medium Risk',         value: medium,              color:'var(--warning)',  sub:'Within 60 days' },
      { label:'Low Risk',            value: low,                 color:'var(--success)',  sub:'Expiring soon' },
      { label:'Deposit Returns Due', value: depositRisks.length, color:'#8b5cf6',        sub:'Unreturned deposits' }
    ];
    kpiBar.innerHTML = kpis.map(k => `
      <div style="background:var(--surface);border:1px solid var(--border);
                  border-radius:10px;padding:10px 16px;text-align:center;min-width:100px;">
        <div style="font-size:10px;font-weight:700;color:var(--text3);margin-bottom:4px;">
          ${k.label}
        </div>
        <div style="font-size:22px;font-weight:900;color:${k.color};">${k.value}</div>
        <div style="font-size:9px;color:var(--text3);">${k.sub}</div>
      </div>
    `).join('');
  }

  // ── Branch availability strip ─────────────────────────────
  const strip = document.getElementById('risk-branch-strip');
  if (strip) {
    const branches = [
      { code:'HRG', label:'🌊 Hurghada',  terms:['hurghada','الغردقة','hrg'] },
      { code:'ALX', label:'🏙 Alexandria', terms:['alexandria','اسكندرية','alx'] },
      { code:'CAI', label:'🏛 Cairo',      terms:['cairo','قاهرة','cai'] },
      { code:'RSH', label:'⚓ Rashid',     terms:['rashid','رشيد','rsh'] }
    ];

    strip.innerHTML = branches.map(br => {
      const brCars = G.fleet.filter(c => {
        if (getCarStatusCategory(c) === 'archived') return false;
        const b = (c.Branch || c.City || c['المحافظة'] ||
                   c['اسم الفرع'] || '').toLowerCase();
        return br.terms.some(t => b.includes(t));
      });
      const avail  = brCars.filter(c => getCarStatusCategory(c) === 'available').length;
      const rented = brCars.filter(c => getCarStatusCategory(c) === 'rented').length;
      const total  = brCars.length;

      return `
        <div style="background:var(--surface2);border:1px solid var(--border);
                    border-radius:10px;padding:10px 14px;min-width:130px;">
          <div style="font-size:11px;font-weight:800;margin-bottom:6px;">
            ${br.label}
          </div>
          <div style="display:flex;gap:8px;font-size:11px;">
            <span style="color:var(--success);font-weight:700;">
              <strong>${avail}</strong> avail
            </span>
            <span style="color:var(--accent);font-weight:700;">
              <strong>${rented}</strong> rented
            </span>
          </div>
          <div style="font-size:10px;color:var(--text3);margin-top:2px;">
            ${total} total cars
          </div>
        </div>`;
    }).join('');
  }

  // ── Main content ──────────────────────────────────────────
  const content = document.getElementById('risk-content');
  if (!content) return;

  if (risks.length === 0 && depositRisks.length === 0) {
    content.innerHTML = `
      <div class="empty-state" style="padding:60px 20px;">
        <div style="font-size:48px;margin-bottom:16px;">✅</div>
        <p style="font-size:14px;font-weight:700;color:var(--success);">
          All Clear!
        </p>
        <p style="color:var(--text3);">
          No expiring documents within ${windowDays} days.
        </p>
      </div>`;
    return;
  }

  // Group risks by type
  const grouped = {};
  risks.forEach(r => {
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
    expired: { bg:'rgba(239,68,68,0.12)',  border:'rgba(239,68,68,0.4)',  text:'#f87171',  badge:'EXPIRED' },
    high   : { bg:'rgba(249,115,22,0.12)', border:'rgba(249,115,22,0.4)', text:'#fb923c',  badge:'HIGH RISK' },
    medium : { bg:'rgba(245,158,11,0.12)', border:'rgba(245,158,11,0.4)', text:'#fbbf24',  badge:'MEDIUM' },
    low    : { bg:'rgba(34,197,94,0.08)',  border:'rgba(34,197,94,0.3)',  text:'#4ade80',  badge:'LOW' }
  };

  let html = '';

  // ── Risks by type ─────────────────────────────────────────
  typeOrder.forEach(type => {
    const group = grouped[type];
    if (!group || group.length === 0) return;

    html += `
      <div style="background:var(--surface2);border:1px solid var(--border);
                  border-radius:var(--radius);margin-bottom:12px;overflow:hidden;">
        <div style="padding:10px 14px;border-bottom:1px solid var(--border);
                    display:flex;align-items:center;justify-content:space-between;">
          <div style="font-size:13px;font-weight:800;">${typeIcons[type]}</div>
          <span style="font-size:11px;color:var(--text3);">
            ${group.length} car${group.length > 1 ? 's' : ''}
          </span>
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
                const sc = sevColors[r.severity] || sevColors.low;
                const daysLabel = r.days === null ? '—'
                  : r.days < 0  ? `${Math.abs(r.days)}d ago`
                  : r.days === 0 ? 'TODAY'
                  : `${r.days}d`;
                return `
                  <tr style="border-bottom:1px solid var(--border);
                              background:${r.severity==='expired'
                                ? 'rgba(239,68,68,0.04)' : 'transparent'};"
                      onmouseover="this.style.background='var(--surface2)'"
                      onmouseout="this.style.background='${r.severity==='expired'
                        ? 'rgba(239,68,68,0.04)':'transparent'}'">
                    <td style="padding:8px;font-weight:600;">
                      <span style="cursor:pointer;color:var(--accent);"
                            onclick="openCarDetailModal('${r.carId}')">
                        ${r.label}
                      </span>
                    </td>
                    <td style="padding:8px;font-family:monospace;font-size:10px;">
                      ${r.plateStr||'—'}
                    </td>
                    <td style="padding:8px;color:var(--text3);">${r.branch}</td>
                    <td style="padding:8px;">
                      ${r.date ? r.date.toLocaleDateString('en-GB',{
                        day:'2-digit',month:'short',year:'numeric'
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
                      ${r.company ? `<br><span style="color:var(--text3);">
                        ${r.company}</span>` : ''}
                    </td>
                    <td style="padding:8px;text-align:center;">
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

  // ── Deposit risks ─────────────────────────────────────────
  if (depositRisks.length > 0) {
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
                  <td style="padding:8px;text-align:right;font-weight:700;
                             color:#8b5cf6;">
                    ${fmtMoney(d.balance)}
                  </td>
                  <td style="padding:8px;text-align:center;">
                    <button class="btn btn-ghost btn-xs"
                      onclick="openOrderDetail('${d.orderId}')">👁</button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  content.innerHTML = html;
};
