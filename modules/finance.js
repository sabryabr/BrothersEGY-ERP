// ============================================================
// modules/finance.js v4.1
// Income & Expenses — full ledger, trend chart,
// branch breakdown, add entry form, CSV export
// ============================================================

window.renderIncomeExpenses = function() {
  renderPageLoading('page-income-expenses', '💰', 'Income & Expenses');
  loadIncomeExpenses();
};

window.loadIncomeExpenses = async function() {
  const el = document.getElementById('page-income-expenses');
  if (!el) return;

  el.innerHTML = `
    <div class="section-header">
      <div>
        <h2>💰 Income & Expenses</h2>
        <p>Full financial ledger — collections, car expenses and general expenses</p>
      </div>
      <div style="display:flex;gap:7px;align-items:center;flex-wrap:wrap;">
        <select id="ie-period-filter" onchange="onIEPeriodChange()"
          style="padding:6px 10px;background:var(--surface2);
                 border:1px solid var(--border2);border-radius:8px;
                 color:var(--text);font-size:11px;font-weight:700;">
          ${_buildIEPeriodOptions()}
        </select>
        <button class="btn btn-ghost btn-sm"
          onclick="loadIncomeExpenses()">🔄 Refresh</button>
      </div>
    </div>

    <!-- KPI Row -->
    <div id="ie-kpi-row"
      style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));
             gap:10px;margin-bottom:16px;">
      <div class="kpi-card">
        <div class="kpi-label">Loading...</div>
        <div class="kpi-value">
          <div class="spinner" style="width:20px;height:20px;margin:4px auto;"></div>
        </div>
      </div>
    </div>

    <!-- Analytics Row -->
    <div style="display:grid;grid-template-columns:2fr 1fr;
                gap:14px;margin-bottom:16px;">
      <div class="panel">
        <div style="display:flex;align-items:center;justify-content:space-between;
                    margin-bottom:11px;">
          <h3 style="font-size:13px;font-weight:800;">
            📈 Monthly Trend (Last 6 Months)
          </h3>
          <div style="display:flex;gap:9px;font-size:10px;">
            <span style="display:flex;align-items:center;gap:4px;">
              <span style="width:12px;height:4px;background:var(--success);
                           border-radius:2px;display:inline-block;"></span>Income
            </span>
            <span style="display:flex;align-items:center;gap:4px;">
              <span style="width:12px;height:4px;background:var(--danger);
                           border-radius:2px;display:inline-block;"></span>Expenses
            </span>
          </div>
        </div>
        <div style="position:relative;height:180px;">
          <canvas id="ie-trend-chart"></canvas>
        </div>
      </div>
      <div class="panel">
        <h3 style="font-size:13px;font-weight:800;margin-bottom:11px;">
          🏢 Income by Branch
        </h3>
        <div id="ie-branch-breakdown" style="max-height:180px;overflow-y:auto;">
          <div class="empty-state" style="padding:20px;">
            <div class="spinner"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;">
      <button class="btn btn-ghost btn-sm ie-tab-btn" id="ie-tab-income"
        style="border-color:var(--accent);color:var(--accent);"
        onclick="showIETab('income',this)">📥 Income</button>
      <button class="btn btn-ghost btn-sm ie-tab-btn" id="ie-tab-car"
        onclick="showIETab('car',this)">🚗 Car Expenses</button>
      <button class="btn btn-ghost btn-sm ie-tab-btn" id="ie-tab-gen"
        onclick="showIETab('gen',this)">🏢 General Expenses</button>
      <button class="btn btn-ghost btn-sm ie-tab-btn" id="ie-tab-add"
        onclick="showIETab('add',this)">➕ Add Entry</button>
    </div>

    <div id="ie-income-pane"></div>
    <div id="ie-car-pane"    style="display:none;"></div>
    <div id="ie-gen-pane"    style="display:none;"></div>
    <div id="ie-add-pane"    style="display:none;"></div>
  `;

  await Promise.allSettled([
    computeIEKPIs(),
    loadIETrendChart(),
    loadIEBranchBreakdown()
  ]);

  showIETab('income', document.getElementById('ie-tab-income'));
};

// ============================================================
// PERIOD SELECTOR
// ============================================================
function _buildIEPeriodOptions() {
  const now  = getCairoNow();
  // ✅ FIXED: was using tagged template literal — now uses string concat
  const opts = ['<option value="all">📅 All Time</option>'];
  for (let i = 0; i < 18; i++) {
    const d     = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val   = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    const label = d.toLocaleString('en-GB', { month:'long', year:'numeric' });
    opts.push(
      '<option value="' + val + '"' + (i === 0 ? ' selected' : '') + '>' +
      label + '</option>'
    );
  }
  return opts.join('');
}

window.getIEPeriod = function() {
  const val = document.getElementById('ie-period-filter')?.value || 'all';
  if (val === 'all') return { month:null, year:null, label:'All Time' };
  const [year, month] = val.split('-');
  const d = new Date(parseInt(year), parseInt(month) - 1, 1);
  return {
    month: String(parseInt(month)),
    year : String(year),
    label: d.toLocaleString('en-GB', { month:'long', year:'numeric' })
  };
};

window.onIEPeriodChange = function() {
  computeIEKPIs();
  loadIETrendChart();
  loadIEBranchBreakdown();
  const activeBtn = document.querySelector('.ie-tab-btn[style*="var(--accent)"]');
  if (activeBtn) {
    const tabId = activeBtn.id.replace('ie-tab-', '');
    if      (tabId === 'income') loadIEIncome();
    else if (tabId === 'car')    loadIECarExp();
    else if (tabId === 'gen')    loadIEGenExp();
  }
};

// ============================================================
// KPI COMPUTATION
// ============================================================
window.computeIEKPIs = async function() {
  const isPriv  = ['Admin','Executive'].includes(G.user?.role);
  const period  = getIEPeriod();
  const branchARMap = window.BRANCH_AR ||
    { HRG:'الغردقة', ALX:'الإسكندرية', CAI:'القاهرة', RSH:'رشيد' };

  try {
    const [cSnap, ceSnap, geSnap] = await Promise.all([
      db.collection('collections').get().catch(() => ({ docs:[] })),
      db.collection('car_expenses').get().catch(() => ({ docs:[] })),
      db.collection('gen_expenses').get().catch(() => ({ docs:[] }))
    ]);

    let income=0, carExp=0, genExp=0;
    let incomeCount=0, carExpCount=0, genExpCount=0;

    // ── Helper: check if a record matches the period ──────
    function matchesPeriod(data, yearField, monthField) {
      if (period.month === null) return true;
      const recMonth = String(data[monthField]||'').replace(/^0+/,'');
      const recYear  = String(data[yearField] ||'');
      return recMonth === period.month && recYear === period.year;
    }

    cSnap.docs.forEach(d => {
      const data = d.data();
      if (!isPriv) {
        const b = (data['موقع الفرع']||data.Branch||'').toLowerCase();
        if (!b.includes((BRANCH_MAP[G.user?.branch]||'').toLowerCase())) return;
      }
      if (matchesPeriod(data, 'سنة', 'شهر')) {
        income += parseAmount(data['قيمة التحصيل']);
        incomeCount++;
      }
    });

    ceSnap.docs.forEach(d => {
      const data = d.data();
      if (!isPriv) {
        const b = data['موقع الفرع'] || '';
        const myBranchAR = branchARMap[G.user?.branch] || G.user?.branch || '';
        if (myBranchAR && !b.includes(myBranchAR)) return;
      }
      if (matchesPeriod(data, 'paid_year', 'شهر') ||
          matchesPeriod(data, 'سنة', 'شهر')) {
        carExp += parseAmount(data['قيمة المصروف']);
        carExpCount++;
      }
    });

    geSnap.docs.forEach(d => {
      const data = d.data();
      if (!isPriv) {
        const b = (data.Branch||data['موقع الفرع']||'').toLowerCase();
        if (!b.includes((BRANCH_MAP[G.user?.branch]||'').toLowerCase())) return;
      }
      if (matchesPeriod(data, 'سنة', 'شهر')) {
        genExp += parseAmount(data['قيمة المصروف']);
        genExpCount++;
      }
    });

    const totalExp   = carExp + genExp;
    const net        = income - totalExp;
    const margin     = income > 0 ? Math.round((net / income) * 100) : 0;

    const depositHeld      = G.bookings.reduce((s,b) =>
      s + parseAmount(b.deposit_held || b['الوديعة المحتجزة'] || 0), 0);
    const depositReturned  = G.bookings.reduce((s,b) =>
      s + parseAmount(b.deposit_returned || b['الوديعة المردودة'] || 0), 0);
    const depositLiability = depositHeld - depositReturned;

    const periodLabel = period.month ? ` · ${period.label}` : ' · All time';

    const kpiRow = document.getElementById('ie-kpi-row');
    if (kpiRow) {
      kpiRow.innerHTML = `
        <div class="kpi-card" style="cursor:pointer;"
             onclick="showIETab('income',document.getElementById('ie-tab-income'))">
          <div class="kpi-label">Net Income</div>
          <div class="kpi-value text-success">${fmtMoney(income)}</div>
          <div class="kpi-sub">${incomeCount} records${periodLabel}</div>
          <div class="kpi-icon">📥</div>
        </div>
        <div class="kpi-card" style="cursor:pointer;"
             onclick="showIETab('car',document.getElementById('ie-tab-car'))">
          <div class="kpi-label">Car Expenses</div>
          <div class="kpi-value text-danger">${fmtMoney(carExp)}</div>
          <div class="kpi-sub">${carExpCount} records</div>
          <div class="kpi-icon">🚗</div>
        </div>
        <div class="kpi-card" style="cursor:pointer;"
             onclick="showIETab('gen',document.getElementById('ie-tab-gen'))">
          <div class="kpi-label">General Expenses</div>
          <div class="kpi-value text-danger">${fmtMoney(genExp)}</div>
          <div class="kpi-sub">${genExpCount} records</div>
          <div class="kpi-icon">🏢</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total Expenses</div>
          <div class="kpi-value text-danger">${fmtMoney(totalExp)}</div>
          <div class="kpi-sub">Car + General</div>
          <div class="kpi-icon">💸</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Net Balance</div>
          <div class="kpi-value"
            style="color:${net>=0?'var(--success)':'var(--danger)'};">
            ${fmtMoney(net)}
          </div>
          <div class="kpi-sub">Income − All Expenses</div>
          <div class="kpi-icon">⚖️</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Profit Margin</div>
          <div class="kpi-value"
            style="color:${margin>=30?'var(--success)':margin>=10?'var(--warning)':'var(--danger)'};">
            ${margin}%
          </div>
          <div class="kpi-sub">Net / Income</div>
          <div class="kpi-icon">📊</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Deposit Liability</div>
          <div class="kpi-value" style="color:var(--warning);">
            ${fmtMoney(depositLiability)}
          </div>
          <div class="kpi-sub">Held but not returned</div>
          <div class="kpi-icon">🔒</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Deposits Returned</div>
          <div class="kpi-value" style="color:var(--success);">
            ${fmtMoney(depositReturned)}
          </div>
          <div class="kpi-sub">Of ${fmtMoney(depositHeld)} held</div>
          <div class="kpi-icon">↩️</div>
        </div>`;
    }
  } catch (e) {
    console.warn('IE KPIs error:', e.message);
  }
};

// ============================================================
// TREND CHART
// ============================================================
window.loadIETrendChart = async function() {
  const canvas = document.getElementById('ie-trend-chart');
  if (!canvas) return;
  const isPriv = ['Admin','Executive'].includes(G.user?.role);
  const now    = getCairoNow();

  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      month: String(d.getMonth() + 1),
      year : String(d.getFullYear()),
      label: d.toLocaleString('en-GB', { month:'short', year:'2-digit' })
    });
  }

  try {
    const [cSnap, ceSnap, geSnap] = await Promise.all([
      db.collection('collections').get().catch(() => ({ docs:[] })),
      db.collection('car_expenses').get().catch(() => ({ docs:[] })),
      db.collection('gen_expenses').get().catch(() => ({ docs:[] }))
    ]);

    const incomeByMonth = {};
    const expByMonth    = {};
    months.forEach(m => {
      const key = m.year + '-' + m.month;
      incomeByMonth[key] = 0;
      expByMonth[key]    = 0;
    });

    cSnap.docs.forEach(d => {
      const data = d.data();
      if (!isPriv) {
        const b = (data['موقع الفرع']||data.Branch||'').toLowerCase();
        if (!b.includes((BRANCH_MAP[G.user?.branch]||'').toLowerCase())) return;
      }
      const key = (data['سنة']||'') + '-' +
        String(data['شهر']||'').replace(/^0+/,'');
      if (key in incomeByMonth) {
        incomeByMonth[key] += parseAmount(data['قيمة التحصيل']);
      }
    });

    ceSnap.docs.forEach(d => {
      const data = d.data();
      const key  = (data['paid_year']||data['سنة']||'') + '-' +
        String(data['شهر']||'').replace(/^0+/,'');
      if (key in expByMonth) expByMonth[key] += parseAmount(data['قيمة المصروف']);
    });

    geSnap.docs.forEach(d => {
      const data = d.data();
      const key  = (data['سنة']||'') + '-' +
        String(data['شهر']||'').replace(/^0+/,'');
      if (key in expByMonth) expByMonth[key] += parseAmount(data['قيمة المصروف']);
    });

    if (window._ieTrendChart) {
      window._ieTrendChart.destroy();
      window._ieTrendChart = null;
    }

    const container = canvas.parentElement;
    canvas.width    = container?.offsetWidth || 400;
    canvas.height   = 180;

    window._ieTrendChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels  : months.map(m => m.label),
        datasets: [
          {
            label          : 'Income',
            data           : months.map(m => incomeByMonth[m.year+'-'+m.month]||0),
            backgroundColor: 'rgba(34,197,94,0.7)',
            borderColor    : '#22c55e',
            borderWidth    : 1,
            borderRadius   : 4
          },
          {
            label          : 'Expenses',
            data           : months.map(m => expByMonth[m.year+'-'+m.month]||0),
            backgroundColor: 'rgba(239,68,68,0.7)',
            borderColor    : '#ef4444',
            borderWidth    : 1,
            borderRadius   : 4
          }
        ]
      },
      options: {
        responsive         : true,
        maintainAspectRatio: false,
        animation          : { duration:600 },
        plugins: {
          legend : { display:false },
          tooltip: { callbacks: { label: ctx =>
            ctx.dataset.label + ': ' + fmtMoney(ctx.parsed.y)
          }}
        },
        scales: {
          x: {
            grid : { color:'rgba(255,255,255,0.04)' },
            ticks: { color:'#94a3b8', font:{ size:10 } }
          },
          y: {
            grid : { color:'rgba(255,255,255,0.04)' },
            ticks: {
              color:'#94a3b8', font:{ size:9 },
              callback: v => v >= 1000 ? '£' + (v/1000).toFixed(0) + 'k' : '£' + v
            }
          }
        }
      }
    });
  } catch (e) {
    console.warn('IE chart error:', e.message);
  }
};

// ============================================================
// BRANCH BREAKDOWN
// ============================================================
window.loadIEBranchBreakdown = async function() {
  const el     = document.getElementById('ie-branch-breakdown');
  if (!el) return;
  const period = getIEPeriod();

  try {
    const cSnap = await db.collection('collections')
      .get().catch(() => ({ docs:[] }));

    const byBranch     = { HRG:0, ALX:0, CAI:0, RSH:0 };
    const branchDetect = {
      'الغردقة'    : 'HRG',
      'الاسكندرية' : 'ALX',
      'الإسكندرية' : 'ALX',
      'القاهرة'    : 'CAI',
      'رشيد'        : 'RSH'
    };

    cSnap.docs.forEach(d => {
      const data     = d.data();
      const recMonth = String(data['شهر']||'').replace(/^0+/,'');
      const recYear  = String(data['سنة'] ||'');
      if (period.month !== null &&
          (recMonth !== period.month || recYear !== period.year)) return;

      const branchAR = data['موقع الفرع'] || '';
      const branchEN = data.Branch        || '';
      let code = '';

      if (branchDetect[branchAR]) {
        code = branchDetect[branchAR];
      } else {
        const b = branchEN.toLowerCase();
        if (b.includes('hurghada') || branchEN === 'HRG')   code = 'HRG';
        else if (b.includes('alexandria') || branchEN==='ALX') code = 'ALX';
        else if (b.includes('cairo')      || branchEN==='CAI') code = 'CAI';
        else if (b.includes('rashid')     || branchEN==='RSH') code = 'RSH';
      }
      if (code && code in byBranch) {
        byBranch[code] += parseAmount(data['قيمة التحصيل']);
      }
    });

    const total        = Object.values(byBranch).reduce((s,v) => s+v, 0);
    const branchColors = { HRG:'var(--accent3)', ALX:'var(--purple)', CAI:'var(--orange)', RSH:'var(--success)' };
    const branchIcons  = { HRG:'🌊', ALX:'🏙', CAI:'🏛', RSH:'⚓' };

    el.innerHTML = Object.entries(byBranch)
      .sort((a, b) => b[1] - a[1])
      .map(([code, val]) => {
        const pct = total > 0 ? Math.round(val / total * 100) : 0;
        return `
          <div style="margin-bottom:9px;">
            <div style="display:flex;justify-content:space-between;
                        font-size:11px;margin-bottom:3px;">
              <span>${branchIcons[code]||'🏢'} ${BRANCH_MAP[code]||code}</span>
              <span style="font-weight:700;color:${branchColors[code]||'var(--accent)'};">
                ${fmtMoney(val)}
                <span style="color:var(--text3);">(${pct}%)</span>
              </span>
            </div>
            <div style="background:var(--surface3);border-radius:99px;
                        height:5px;overflow:hidden;">
              <div style="height:100%;width:${pct}%;border-radius:99px;
                          background:${branchColors[code]||'var(--accent)'};
                          transition:width 0.5s;"></div>
            </div>
          </div>`;
      }).join('') ||
      `<div style="font-size:11px;color:var(--text3);padding:11px;">
         No data for this period
       </div>`;
  } catch (e) {
    console.warn('Branch breakdown error:', e.message);
  }
};

// ============================================================
// TAB MANAGER
// ============================================================
window.showIETab = function(tab, btn) {
  // ✅ FIXED: was using tagged template literals — now string concat
  ['income','car','gen','add'].forEach(t => {
    const p = document.getElementById('ie-' + t + '-pane');
    if (p) p.style.display = 'none';
  });
  document.querySelectorAll('.ie-tab-btn').forEach(b => {
    b.style.borderColor = 'var(--border)';
    b.style.color       = 'var(--text2)';
  });
  if (btn) {
    btn.style.borderColor = 'var(--accent)';
    btn.style.color       = 'var(--accent)';
  }
  const pane = document.getElementById('ie-' + tab + '-pane');
  if (pane) pane.style.display = 'block';

  if      (tab === 'income') loadIEIncome();
  else if (tab === 'car')    loadIECarExp();
  else if (tab === 'gen')    loadIEGenExp();
  else if (tab === 'add')    renderIEAddForm();
};

// ============================================================
// INCOME LEDGER
// ============================================================
window.loadIEIncome = async function() {
  const pane = document.getElementById('ie-income-pane');
  if (!pane) return;
  pane.innerHTML = '<div class="panel"><div class="empty-state"><div class="spinner"></div></div></div>';

  const isPriv = ['Admin','Executive'].includes(G.user?.role);
  const period = getIEPeriod();

  try {
    const snap = await db.collection('collections')
      .get().catch(() => ({ docs:[] }));
    let rows = snap.docs.map(d => ({ id:d.id, ...d.data() }));

    if (!isPriv) {
      rows = rows.filter(r => {
        const b = (r['موقع الفرع']||r.Branch||'').toLowerCase();
        return b.includes((BRANCH_MAP[G.user?.branch]||'').toLowerCase());
      });
    }
    if (period.month !== null) {
      rows = rows.filter(r => {
        const m = String(r['شهر']||'').replace(/^0+/,'');
        const y = String(r['سنة'] ||'');
        return m === period.month && y === period.year;
      });
    }
    rows.sort((a, b) => {
      const ya = parseInt(a['سنة']||0), yb = parseInt(b['سنة']||0);
      if (ya !== yb) return yb - ya;
      const ma = parseInt(String(a['شهر']||'0').replace(/^0+/,''));
      const mb = parseInt(String(b['شهر']||'0').replace(/^0+/,''));
      if (ma !== mb) return mb - ma;
      return parseInt(b['يوم']||0) - parseInt(a['يوم']||0);
    });

    window._ieIncomeRows = rows;
    const totalIncome    = rows.reduce((s,r) => s + parseAmount(r['قيمة التحصيل']), 0);

    pane.innerHTML = `
      <div class="panel">
        <div style="display:flex;align-items:center;justify-content:space-between;
                    margin-bottom:11px;flex-wrap:wrap;gap:7px;">
          <h3 style="font-size:13px;font-weight:800;">📥 Income Records</h3>
          <div style="display:flex;gap:9px;align-items:center;">
            <input type="text" id="ie-income-search" placeholder="Search..."
              style="padding:5px 10px;background:var(--surface2);border:1px solid var(--border);
                     border-radius:7px;color:var(--text);font-size:11px;width:160px;"
              oninput="filterIETable('income',this.value)"/>
            <button class="btn btn-ghost btn-sm" onclick="exportIncomeCSV()"
              style="font-size:10px;">📥 Export CSV</button>
            <span style="font-size:11px;color:var(--success);font-weight:800;">
              ${fmtMoney(totalIncome)}
            </span>
            <span style="font-size:10px;color:var(--text3);">
              ${rows.length} records
            </span>
          </div>
        </div>
        <div id="ie-income-table" class="table-wrap">
          ${_renderIEIncomeTable(rows)}
        </div>
      </div>`;
  } catch (e) {
    pane.innerHTML = `<div class="empty-state"><p>Error: ${e.message}</p></div>`;
  }
};

function _renderIEIncomeTable(rows) {
  if (!rows.length) return `
    <div class="empty-state" style="padding:20px;">
      <div class="es-icon">📥</div>
      <p>No income records for this period</p>
    </div>`;

  return `
    <table class="data-table">
      <thead><tr>
        <th>No.</th><th>Date</th><th>Statement</th>
        <th>Order</th><th>Branch</th><th>Type</th>
        <th>Collected By</th><th>Amount</th>
      </tr></thead>
      <tbody>
        ${rows.map(r => {
          const day      = r['يوم']  || '—';
          const month    = r['شهر']  || '—';
          const year     = r['سنة']  || '—';
          const dateStr  = day !== '—'
            ? String(day).padStart(2,'0') + '/' + String(month).padStart(2,'0') + '/' + year
            : '—';
          return `
            <tr>
              <td>
                <span style="color:var(--accent);font-weight:700;">
                  ${r['No.']||r.id}
                </span>
              </td>
              <td style="font-size:10px;white-space:nowrap;">${dateStr}</td>
              <td style="font-size:11px;">
                ${r['بيان التحصيل']||r['Expense Statement']||'—'}
              </td>
              <td>
                ${r['كود الاوردر']
                  ? `<span style="color:var(--accent);cursor:pointer;font-weight:700;"
                           onclick="openOrderByNo('${r['كود الاوردر']}')">
                       #${r['كود الاوردر']}
                     </span>`
                  : '—'}
              </td>
              <td style="font-size:11px;">${r['موقع الفرع']||r.Branch||'—'}</td>
              <td>
                <span class="pill pill-active">
                  ${r['نوع التحصيل']||'—'}
                </span>
              </td>
              <td style="font-size:11px;">${r['تم تحصيل من طرف']||'—'}</td>
              <td>
                <strong style="color:var(--success);">
                  ${r['قيمة التحصيل']||'£0.00'}
                </strong>
              </td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>
    <div style="padding:9px 11px;font-size:11px;color:var(--text3);
                border-top:1px solid var(--border);
                display:flex;justify-content:space-between;">
      <span>${rows.length} records</span>
      <span style="color:var(--success);font-weight:700;">
        Total: ${fmtMoney(rows.reduce((s,r) => s+parseAmount(r['قيمة التحصيل']),0))}
      </span>
    </div>`;
}

// ============================================================
// CAR EXPENSES LEDGER
// ============================================================
window.loadIECarExp = async function() {
  const pane = document.getElementById('ie-car-pane');
  if (!pane) return;
  pane.innerHTML = '<div class="panel"><div class="empty-state"><div class="spinner"></div></div></div>';

  const isPriv     = ['Admin','Executive'].includes(G.user?.role);
  const period     = getIEPeriod();
  const branchARMap= window.BRANCH_AR ||
    { HRG:'الغردقة', ALX:'الإسكندرية', CAI:'القاهرة', RSH:'رشيد' };

  try {
    const snap = await db.collection('car_expenses')
      .get().catch(() => ({ docs:[] }));
    let rows = snap.docs.map(d => ({ id:d.id, ...d.data() }));

    if (!isPriv) {
      const myBranchAR = branchARMap[G.user?.branch] || G.user?.branch || '';
      rows = rows.filter(r => {
        const b = r['موقع الفرع'] || '';
        return !myBranchAR || b.includes(myBranchAR);
      });
    }
    if (period.month !== null) {
      rows = rows.filter(r => {
        const m = String(r['شهر']||'').replace(/^0+/,'');
        const y = String(r['paid_year']||r['سنة']||'');
        return m === period.month && y === period.year;
      });
    }
    rows.sort((a, b) => {
      const ya = parseInt(a['paid_year']||a['سنة']||0);
      const yb = parseInt(b['paid_year']||b['سنة']||0);
      if (ya !== yb) return yb - ya;
      return parseInt(String(b['شهر']||'0').replace(/^0+/,'')) -
             parseInt(String(a['شهر']||'0').replace(/^0+/,''));
    });

    window._ieCarRows = rows;
    const totalExp   = rows.reduce((s,r) => s + parseAmount(r['قيمة المصروف']), 0);

    pane.innerHTML = `
      <div class="panel">
        <div style="display:flex;align-items:center;justify-content:space-between;
                    margin-bottom:11px;flex-wrap:wrap;gap:7px;">
          <h3 style="font-size:13px;font-weight:800;">🚗 Car Expense Records</h3>
          <div style="display:flex;gap:9px;align-items:center;">
            <input type="text" id="ie-car-search" placeholder="Search..."
              style="padding:5px 10px;background:var(--surface2);border:1px solid var(--border);
                     border-radius:7px;color:var(--text);font-size:11px;width:160px;"
              oninput="filterIETable('car',this.value)"/>
            <span style="font-size:11px;color:var(--danger);font-weight:800;">
              ${fmtMoney(totalExp)}
            </span>
            <span style="font-size:10px;color:var(--text3);">
              ${rows.length} records
            </span>
          </div>
        </div>
        <div id="ie-car-table" class="table-wrap">
          ${_renderIECarTable(rows)}
        </div>
      </div>`;
  } catch (e) {
    pane.innerHTML = `<div class="empty-state"><p>Error: ${e.message}</p></div>`;
  }
};

function _renderIECarTable(rows) {
  if (!rows.length) return `
    <div class="empty-state" style="padding:20px;">
      <div class="es-icon">🚗</div>
      <p>No car expenses for this period</p>
    </div>`;

  return `
    <table class="data-table">
      <thead><tr>
        <th>No.</th><th>Date</th><th>Statement</th>
        <th>Order</th><th>Branch</th><th>Type</th>
        <th>Paid By</th><th>Due From</th><th>Amount</th>
      </tr></thead>
      <tbody>
        ${rows.map(r => {
          const day     = r['يوم']        || '—';
          const month   = r['شهر']        || '—';
          const year    = r['paid_year']  || r['سنة'] || '—';
          const dateStr = day !== '—'
            ? String(day).padStart(2,'0') + '/' + String(month).padStart(2,'0') + '/' + year
            : '—';
          return `
            <tr>
              <td>
                <span style="color:var(--accent);font-weight:700;">
                  ${r['No.']||r.id}
                </span>
              </td>
              <td style="font-size:10px;white-space:nowrap;">${dateStr}</td>
              <td style="font-size:11px;">
                ${r['بيان النثريات']||r['بيان الصيانة']||'—'}
              </td>
              <td>
                ${r['كود الاوردر']
                  ? `<span style="color:var(--accent);cursor:pointer;font-weight:700;"
                           onclick="openOrderByNo('${r['كود الاوردر']}')">
                       #${r['كود الاوردر']}
                     </span>`
                  : '—'}
              </td>
              <td style="font-size:11px;">${r['موقع الفرع']||r.Branch||'—'}</td>
              <td>
                <span class="pill pill-draft">${r['نوع المصروف']||'—'}</span>
              </td>
              <td style="font-size:11px;">${r['تم دفع من طرف']||'—'}</td>
              <td style="font-size:11px;">${r['مستحق من']||'—'}</td>
              <td>
                <strong style="color:var(--danger);">
                  ${r['قيمة المصروف']||'£0.00'}
                </strong>
              </td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>
    <div style="padding:9px 11px;font-size:11px;color:var(--text3);
                border-top:1px solid var(--border);
                display:flex;justify-content:space-between;">
      <span>${rows.length} records</span>
      <span style="color:var(--danger);font-weight:700;">
        Total: ${fmtMoney(rows.reduce((s,r) => s+parseAmount(r['قيمة المصروف']),0))}
      </span>
    </div>`;
}

// ============================================================
// GENERAL EXPENSES LEDGER
// ============================================================
window.loadIEGenExp = async function() {
  const pane = document.getElementById('ie-gen-pane');
  if (!pane) return;
  pane.innerHTML = '<div class="panel"><div class="empty-state"><div class="spinner"></div></div></div>';

  const isPriv = ['Admin','Executive'].includes(G.user?.role);
  const period = getIEPeriod();

  try {
    const snap = await db.collection('gen_expenses')
      .get().catch(() => ({ docs:[] }));
    let rows = snap.docs.map(d => ({ id:d.id, ...d.data() }));

    if (!isPriv) {
      rows = rows.filter(r => {
        const b = (r.Branch||r['موقع الفرع']||'').toLowerCase();
        return b.includes((BRANCH_MAP[G.user?.branch]||'').toLowerCase());
      });
    }
    if (period.month !== null) {
      rows = rows.filter(r => {
        const m = String(r['شهر']||'').replace(/^0+/,'');
        const y = String(r['سنة'] ||'');
        return m === period.month && y === period.year;
      });
    }
    rows.sort((a, b) => {
      const ya = parseInt(a['سنة']||0), yb = parseInt(b['سنة']||0);
      if (ya !== yb) return yb - ya;
      return parseInt(String(b['شهر']||'0').replace(/^0+/,'')) -
             parseInt(String(a['شهر']||'0').replace(/^0+/,''));
    });

    window._ieGenRows = rows;
    const totalExp   = rows.reduce((s,r) => s + parseAmount(r['قيمة المصروف']), 0);

    pane.innerHTML = `
      <div class="panel">
        <div style="display:flex;align-items:center;justify-content:space-between;
                    margin-bottom:11px;flex-wrap:wrap;gap:7px;">
          <h3 style="font-size:13px;font-weight:800;">🏢 General Expense Records</h3>
          <div style="display:flex;gap:9px;align-items:center;">
            <input type="text" id="ie-gen-search" placeholder="Search..."
              style="padding:5px 10px;background:var(--surface2);border:1px solid var(--border);
                     border-radius:7px;color:var(--text);font-size:11px;width:160px;"
              oninput="filterIETable('gen',this.value)"/>
            <span style="font-size:11px;color:var(--danger);font-weight:800;">
              ${fmtMoney(totalExp)}
            </span>
            <span style="font-size:10px;color:var(--text3);">
              ${rows.length} records
            </span>
          </div>
        </div>
        <div id="ie-gen-table" class="table-wrap">
          ${_renderIEGenTable(rows)}
        </div>
      </div>`;
  } catch (e) {
    pane.innerHTML = `<div class="empty-state"><p>Error: ${e.message}</p></div>`;
  }
};

function _renderIEGenTable(rows) {
  if (!rows.length) return `
    <div class="empty-state" style="padding:20px;">
      <div class="es-icon">🏢</div>
      <p>No general expenses for this period</p>
    </div>`;

  return `
    <table class="data-table">
      <thead><tr>
        <th>No.</th><th>Date</th><th>Statement</th>
        <th>Branch</th><th>Type</th><th>Employee</th>
        <th>Month/Year</th><th>Amount</th>
      </tr></thead>
      <tbody>
        ${rows.map(r => {
          const day     = r['يوم']  || '—';
          const month   = r['شهر']  || '—';
          const year    = r['سنة']  || '—';
          const dateStr = day !== '—'
            ? String(day).padStart(2,'0') + '/' + String(month).padStart(2,'0') + '/' + year
            : '—';
          return `
            <tr>
              <td>
                <span style="color:var(--accent);font-weight:700;">
                  ${r['No.']||r.id}
                </span>
              </td>
              <td style="font-size:10px;white-space:nowrap;">${dateStr}</td>
              <td style="font-size:11px;">
                ${r['بيان المصروف']||r['Expense Statement']||'—'}
              </td>
              <td style="font-size:11px;">${r.Branch||r['موقع الفرع']||'—'}</td>
              <td>
                <span class="pill pill-draft">${r['نوع المصروف']||'—'}</span>
              </td>
              <td style="font-size:11px;">${r['اسم الموظف']||'—'}</td>
              <td style="font-size:10px;color:var(--text3);">
                ${r['شهر']||'—'}/${r['سنة']||'—'}
              </td>
              <td>
                <strong style="color:var(--danger);">
                  ${r['قيمة المصروف']||'£0.00'}
                </strong>
              </td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>
    <div style="padding:9px 11px;font-size:11px;color:var(--text3);
                border-top:1px solid var(--border);
                display:flex;justify-content:space-between;">
      <span>${rows.length} records</span>
      <span style="color:var(--danger);font-weight:700;">
        Total: ${fmtMoney(rows.reduce((s,r) => s+parseAmount(r['قيمة المصروف']),0))}
      </span>
    </div>`;
}

// ============================================================
// CLIENT-SIDE TABLE FILTER
// ============================================================
window.filterIETable = function(type, q) {
  const search = q.toLowerCase();

  if (type === 'income' && window._ieIncomeRows) {
    const filtered = search
      ? window._ieIncomeRows.filter(r =>
          [r['بيان التحصيل'], r['كود الاوردر'], r['موقع الفرع'],
           r['تم تحصيل من طرف'], r['No.'], r['نوع التحصيل']]
            .join(' ').toLowerCase().includes(search))
      : window._ieIncomeRows;
    const t = document.getElementById('ie-income-table');
    if (t) t.innerHTML = _renderIEIncomeTable(filtered);
  }

  if (type === 'car' && window._ieCarRows) {
    const filtered = search
      ? window._ieCarRows.filter(r =>
          [r['بيان النثريات'], r['بيان الصيانة'], r['كود الاوردر'],
           r['موقع الفرع'], r['نوع المصروف'], r['No.']]
            .join(' ').toLowerCase().includes(search))
      : window._ieCarRows;
    const t = document.getElementById('ie-car-table');
    if (t) t.innerHTML = _renderIECarTable(filtered);
  }

  if (type === 'gen' && window._ieGenRows) {
    const filtered = search
      ? window._ieGenRows.filter(r =>
          [r['بيان المصروف'], r['نوع المصروف'], r.Branch,
           r['اسم الموظف'], r['No.']]
            .join(' ').toLowerCase().includes(search))
      : window._ieGenRows;
    const t = document.getElementById('ie-gen-table');
    if (t) t.innerHTML = _renderIEGenTable(filtered);
  }
};

// ============================================================
// ADD ENTRY FORM
// ============================================================
window.renderIEAddForm = function() {
  const pane = document.getElementById('ie-add-pane');
  if (!pane) return;

  const now  = getCairoNow();
  const dd   = String(now.getDate()).padStart(2, '0');
  const mm   = String(now.getMonth() + 1);
  const yyyy = String(now.getFullYear());

  pane.innerHTML = `
    <div style="display:grid;gap:14px;">
      <div class="panel">
        <h3 style="font-size:13px;font-weight:800;margin-bottom:13px;">
          ➕ Add New Entry
        </h3>
        <div style="display:flex;gap:9px;margin-bottom:16px;flex-wrap:wrap;">
          <label style="display:flex;align-items:center;gap:7px;cursor:pointer;
                         background:var(--surface2);border:2px solid var(--border);
                         border-radius:9px;padding:10px 16px;flex:1;min-width:140px;
                         justify-content:center;" id="ie-type-label-income">
            <input type="radio" name="ie-entry-type" value="income"
              onchange="ieTypeChange()" style="width:14px;height:14px;"/>
            <span style="font-weight:700;">📥 Income Collection</span>
          </label>
          <label style="display:flex;align-items:center;gap:7px;cursor:pointer;
                         background:var(--surface2);border:2px solid var(--border);
                         border-radius:9px;padding:10px 16px;flex:1;min-width:140px;
                         justify-content:center;" id="ie-type-label-car">
            <input type="radio" name="ie-entry-type" value="car_expense"
              onchange="ieTypeChange()" style="width:14px;height:14px;"/>
            <span style="font-weight:700;">🚗 Car Expense</span>
          </label>
          <label style="display:flex;align-items:center;gap:7px;cursor:pointer;
                         background:var(--surface2);border:2px solid var(--border);
                         border-radius:9px;padding:10px 16px;flex:1;min-width:140px;
                         justify-content:center;" id="ie-type-label-gen">
            <input type="radio" name="ie-entry-type" value="gen_expense"
              onchange="ieTypeChange()" style="width:14px;height:14px;"/>
            <span style="font-weight:700;">🏢 General Expense</span>
          </label>
        </div>
      </div>

      <!-- Income Fields -->
      <div id="ie-income-fields" style="display:none;">
        <div class="panel">
          <h4 style="font-size:12px;font-weight:800;color:var(--success);
                      margin-bottom:13px;">📥 New Income Entry</h4>
          <div class="form-grid">
            <div class="field">
              <label>Contract / Order No. *</label>
              <input type="text" id="ie-inc-order" placeholder="e.g. 578"/>
            </div>
            <div class="field">
              <label>Income Type</label>
              <select id="ie-inc-type">
                <option value="مستحق">Due Payment (مستحق)</option>
                <option value="تأمين">Deposit (تأمين)</option>
                <option value="تحصيل مخالفات">Fine Collection</option>
                <option value="دفعة جزئية">Partial Payment</option>
                <option value="تسوية">Settlement</option>
                <option value="أخرى">Other</option>
              </select>
            </div>
            <div class="field" style="grid-column:1/-1;">
              <label>Statement *</label>
              <input type="text" id="ie-inc-statement"
                placeholder="What is this income for?"/>
            </div>
            <div class="field">
              <label>Amount (EGP) *</label>
              <input type="number" id="ie-inc-amount" placeholder="0" min="0"/>
            </div>
            <div class="field">
              <label>Branch</label>
              <select id="ie-inc-branch">
                <option value="الغردقة">Hurghada</option>
                <option value="الاسكندرية">Alexandria</option>
                <option value="القاهرة">Cairo</option>
                <option value="رشيد">Rashid</option>
              </select>
            </div>
            <div class="field">
              <label>Collected By</label>
              <input type="text" id="ie-inc-by" value="${G.user?.username||''}"/>
            </div>
            <div class="field">
              <label>Day</label>
              <input type="number" id="ie-inc-day" value="${dd}" min="1" max="31"/>
            </div>
            <div class="field">
              <label>Month</label>
              <input type="number" id="ie-inc-month" value="${mm}" min="1" max="12"/>
            </div>
            <div class="field">
              <label>Year</label>
              <input type="number" id="ie-inc-year" value="${yyyy}"/>
            </div>
          </div>
          <button class="btn btn-success btn-full mt-12" onclick="saveIEIncome()">
            💾 Save Income Entry
          </button>
        </div>
      </div>

      <!-- Car Expense Fields -->
      <div id="ie-car-fields" style="display:none;">
        <div class="panel">
          <h4 style="font-size:12px;font-weight:800;color:var(--danger);
                      margin-bottom:13px;">🚗 New Car Expense</h4>
          <div class="form-grid">
            <div class="field" style="grid-column:1/-1;">
              <label>Contract / Order No. *</label>
              <input type="text" id="ie-car-order" placeholder="Contract No."/>
            </div>
            <div class="field">
              <label>Expense Category *</label>
              <select id="ie-car-category">
                <option value="">-- Select --</option>
                <option value="نثريات تشغيل">Operating / Petty Cash</option>
                <option value="صيانة">Maintenance</option>
                <option value="إصلاح">Repair</option>
                <option value="مخالفة مرورية">Traffic Fine</option>
                <option value="تكلفة حادث">Accident Cost</option>
                <option value="ترخيص">Registration / License</option>
                <option value="تأمين سيارة">Car Insurance</option>
                <option value="وقود">Fuel</option>
                <option value="غسيل وتنظيف">Wash & Clean</option>
                <option value="إطارات">Tyres</option>
                <option value="أخرى">Other</option>
              </select>
            </div>
            <div class="field">
              <label>Amount (EGP) *</label>
              <input type="number" id="ie-car-amount" placeholder="0" min="0"/>
            </div>
            <div class="field" style="grid-column:1/-1;">
              <label>Statement *</label>
              <input type="text" id="ie-car-statement"
                placeholder="Describe the expense"/>
            </div>
            <div class="field">
              <label>Paid By</label>
              <input type="text" id="ie-car-by" value="${G.user?.username||''}"/>
            </div>
            <div class="field">
              <label>Charged To</label>
              <select id="ie-car-due-from">
                <option value="الشركة">Company</option>
                <option value="العميل">Client</option>
                <option value="صاحب السيارة">Car Owner</option>
                <option value="التأمين">Insurance</option>
              </select>
            </div>
            <div class="field">
              <label>Branch</label>
              <select id="ie-car-branch-sel">
                <option value="الغردقة">Hurghada</option>
                <option value="الاسكندرية">Alexandria</option>
                <option value="القاهرة">Cairo</option>
                <option value="رشيد">Rashid</option>
              </select>
            </div>
            <div class="field">
              <label>Day</label>
              <input type="number" id="ie-car-day" value="${dd}" min="1" max="31"/>
            </div>
            <div class="field">
              <label>Month</label>
              <input type="number" id="ie-car-month" value="${mm}" min="1" max="12"/>
            </div>
            <div class="field">
              <label>Year</label>
              <input type="number" id="ie-car-year" value="${yyyy}"/>
            </div>
          </div>
          <button class="btn btn-danger btn-full mt-12" onclick="saveIECarExp()">
            💾 Save Car Expense
          </button>
        </div>
      </div>

      <!-- General Expense Fields -->
      <div id="ie-gen-fields" style="display:none;">
        <div class="panel">
          <h4 style="font-size:12px;font-weight:800;color:var(--orange);
                      margin-bottom:13px;">🏢 New General Expense</h4>
          <div class="form-grid">
            <div class="field">
              <label>Category *</label>
              <select id="ie-gen-category" onchange="ieCheckOtherDesc()">
                <option value="">-- Select --</option>
                <option value="مرتبات">Salary / Payroll</option>
                <option value="إيجار مكتب">Office Rent</option>
                <option value="مرافق">Utilities</option>
                <option value="تسويق">Marketing</option>
                <option value="مستلزمات">Supplies</option>
                <option value="حيني">Occasional</option>
                <option value="بدل انتقال">Transportation Allowance</option>
                <option value="اتصالات">Communications</option>
                <option value="مصاريف عامة">General Expenses</option>
                <option value="أخرى">Other — describe below</option>
              </select>
            </div>
            <div class="field">
              <label>Amount (EGP) *</label>
              <input type="number" id="ie-gen-amount" placeholder="0" min="0"/>
            </div>
            <div class="field" style="grid-column:1/-1;">
              <label>Statement *</label>
              <input type="text" id="ie-gen-statement"
                placeholder="What is this expense for?"/>
            </div>
            <div class="field" id="ie-gen-other-wrap"
                 style="display:none;grid-column:1/-1;">
              <label>Other Description *</label>
              <input type="text" id="ie-gen-other-desc"
                placeholder="Describe the Other category"/>
            </div>
            <div class="field">
              <label>Branch</label>
              <select id="ie-gen-branch-sel">
                <option value="Alexandria">Alexandria</option>
                <option value="Hurghada">Hurghada</option>
                <option value="Cairo">Cairo</option>
                <option value="Rashid">Rashid</option>
              </select>
            </div>
            <div class="field">
              <label>Entity Type</label>
              <select id="ie-gen-entity">
                <option value="Company branch">Company Branch</option>
                <option value="Employee">Employee</option>
                <option value="Vendor">Vendor / Supplier</option>
              </select>
            </div>
            <div class="field">
              <label>Employee Name</label>
              <input type="text" id="ie-gen-emp-name" placeholder="Optional"/>
            </div>
            <div class="field">
              <label>Employee Code</label>
              <input type="text" id="ie-gen-emp-code" placeholder="Optional"/>
            </div>
            <div class="field">
              <label>Day</label>
              <input type="number" id="ie-gen-day" value="${dd}" min="1" max="31"/>
            </div>
            <div class="field">
              <label>Month</label>
              <input type="number" id="ie-gen-month" value="${mm}" min="1" max="12"/>
            </div>
            <div class="field">
              <label>Year</label>
              <input type="number" id="ie-gen-year" value="${yyyy}"/>
            </div>
          </div>
          <button class="btn btn-warning btn-full mt-12" onclick="saveIEGenExp()">
            💾 Save General Expense
          </button>
        </div>
      </div>

      <!-- Help placeholder -->
      <div class="panel" id="ie-add-help">
        <div style="text-align:center;padding:20px;color:var(--text3);">
          <div style="font-size:32px;margin-bottom:9px;">➕</div>
          <p style="font-size:13px;font-weight:700;margin-bottom:5px;">
            Select an entry type above
          </p>
          <p style="font-size:11px;">
            Choose Income, Car Expense, or General Expense to reveal the form
          </p>
        </div>
      </div>
    </div>`;
};

// ✅ FIXED: was using tagged template literals
window.ieTypeChange = function() {
  const sel = document.querySelector('input[name="ie-entry-type"]:checked')?.value;

  ['ie-income-fields','ie-car-fields','ie-gen-fields'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  ['income','car','gen'].forEach(t => {
    const lbl = document.getElementById('ie-type-label-' + t);
    if (lbl) lbl.style.borderColor = 'var(--border)';
  });

  const colorMap = {
    income     : 'var(--success)',
    car_expense: 'var(--danger)',
    gen_expense: 'var(--orange)'
  };
  const keyMap   = {
    income     : 'ie-income-fields',
    car_expense: 'ie-car-fields',
    gen_expense: 'ie-gen-fields'
  };
  const labelMap = {
    income     : 'income',
    car_expense: 'car',
    gen_expense: 'gen'
  };

  const helpPanel = document.getElementById('ie-add-help');
  if (sel) {
    const pane = document.getElementById(keyMap[sel]);
    if (pane) pane.style.display = 'block';
    const lbl = document.getElementById('ie-type-label-' + labelMap[sel]);
    if (lbl) lbl.style.borderColor = colorMap[sel] || 'var(--accent)';
    if (helpPanel) helpPanel.style.display = 'none';
  } else {
    if (helpPanel) helpPanel.style.display = 'block';
  }
};

window.ieCheckOtherDesc = function() {
  const cat  = document.getElementById('ie-gen-category')?.value;
  const wrap = document.getElementById('ie-gen-other-wrap');
  if (wrap) wrap.style.display = (cat === 'أخرى') ? 'block' : 'none';
};

// ============================================================
// SAVE FUNCTIONS
// ============================================================
window.saveIEIncome = async function() {
  const orderNo   = document.getElementById('ie-inc-order')?.value.trim();
  const statement = document.getElementById('ie-inc-statement')?.value.trim();
  const amount    = parseFloat(document.getElementById('ie-inc-amount')?.value) || 0;
  const branch    = document.getElementById('ie-inc-branch')?.value;
  const collBy    = document.getElementById('ie-inc-by')?.value.trim();
  const day       = document.getElementById('ie-inc-day')?.value;
  const month     = document.getElementById('ie-inc-month')?.value;
  const year      = document.getElementById('ie-inc-year')?.value;

  if (!orderNo)   { toast('Order number is required', 'error'); return; }
  if (!statement) { toast('Statement is required',    'error'); return; }
  if (amount <= 0){ toast('Amount must be greater than 0', 'error'); return; }

  try {
    const snap   = await db.collection('collections').get();
    const lastNo = snap.empty ? 0 :
      Math.max(...snap.docs.map(d => parseInt(d.data()['No.']||0)));

    // ✅ Safe reverse lookup for branch EN name
    const branchARMap = window.BRANCH_AR || {};
    const branchCode  = Object.keys(branchARMap)
      .find(k => branchARMap[k] === branch) || '';
    const branchEN    = BRANCH_MAP[branchCode] || branch;

    await db.collection('collections').add({
      'No.'                : String(lastNo + 1),
      'كود الاوردر'        : orderNo,
      'نوع التحصيل'        : document.getElementById('ie-inc-type')?.value,
      'بيان التحصيل'       : statement,
      'Expense Statement'  : statement,
      'قيمة التحصيل'       : '£' + amount.toFixed(2),
      'موقع الفرع'         : branch,
      'Branch'             : branchEN,
      'تم تحصيل من طرف'   : collBy || G.user?.username || '',
      'يوم'                : String(parseInt(day)),
      'شهر'                : String(parseInt(month)),
      'سنة'                : String(year),
      '_sys_updated'       : Date.now()
    });

    await logAction('ADD', 'Income & Expenses',
      'Income: ' + statement + ' | Order: ' + orderNo +
      ' | £' + amount + ' | ' + branch);
    toast('Income entry saved!', 'success');
    renderIEAddForm();
    computeIEKPIs();
    loadIETrendChart();
    loadIEBranchBreakdown();
    setTimeout(() => showIETab('income', document.getElementById('ie-tab-income')), 500);
  } catch (e) {
    toast('Save failed: ' + e.message, 'error');
  }
};

window.saveIECarExp = async function() {
  const orderNo   = document.getElementById('ie-car-order')?.value.trim();
  const category  = document.getElementById('ie-car-category')?.value;
  const amount    = parseFloat(document.getElementById('ie-car-amount')?.value) || 0;
  const statement = document.getElementById('ie-car-statement')?.value.trim();
  const paidBy    = document.getElementById('ie-car-by')?.value.trim();
  const dueFrom   = document.getElementById('ie-car-due-from')?.value;
  const branch    = document.getElementById('ie-car-branch-sel')?.value;
  const day       = document.getElementById('ie-car-day')?.value;
  const month     = document.getElementById('ie-car-month')?.value;
  const year      = document.getElementById('ie-car-year')?.value;

  if (!orderNo)   { toast('Order number is required',  'error'); return; }
  if (!category)  { toast('Expense category required', 'error'); return; }
  if (amount <= 0){ toast('Amount must be greater than 0', 'error'); return; }
  if (!statement) { toast('Statement is required',     'error'); return; }

  try {
    const snap   = await db.collection('car_expenses').get();
    const lastNo = snap.empty ? 0 :
      Math.max(...snap.docs.map(d => parseInt(d.data()['No.']||0)));

    const branchARMap = window.BRANCH_AR || {};
    const branchCode  = Object.keys(branchARMap).find(k => branchARMap[k] === branch) || '';
    const branchEN    = BRANCH_MAP[branchCode] || branch;

    await db.collection('car_expenses').add({
      'No.'           : String(lastNo + 1),
      'كود الاوردر'   : orderNo,
      'نوع المصروف'   : category,
      'بيان النثريات' : statement,
      'بيان الصيانة'  : (category==='صيانة'||category==='إصلاح') ? statement : '',
      'قيمة المصروف'  : '£' + amount.toFixed(2),
      'موقع الفرع'    : branch,
      'Branch'        : branchEN,
      'تم دفع من طرف': paidBy || G.user?.username || '',
      'مستحق من'      : dueFrom,
      'شهر'           : String(month).padStart(2, '0'),
      'يوم'           : String(parseInt(day)),
      'paid_year'     : String(year),
      '_sys_updated'  : Date.now()
    });

    await logAction('ADD', 'Income & Expenses',
      'Car expense: ' + category + ' | Order: ' + orderNo + ' | £' + amount);
    toast('Car expense saved!', 'success');
    renderIEAddForm();
    computeIEKPIs();
    loadIETrendChart();
    setTimeout(() => showIETab('car', document.getElementById('ie-tab-car')), 500);
  } catch (e) {
    toast('Save failed: ' + e.message, 'error');
  }
};

window.saveIEGenExp = async function() {
  const category  = document.getElementById('ie-gen-category')?.value;
  const amount    = parseFloat(document.getElementById('ie-gen-amount')?.value) || 0;
  const statement = document.getElementById('ie-gen-statement')?.value.trim();
  const otherDesc = document.getElementById('ie-gen-other-desc')?.value.trim();
  const branch    = document.getElementById('ie-gen-branch-sel')?.value;
  const entity    = document.getElementById('ie-gen-entity')?.value;
  const empName   = document.getElementById('ie-gen-emp-name')?.value.trim();
  const empCode   = document.getElementById('ie-gen-emp-code')?.value.trim();
  const day       = document.getElementById('ie-gen-day')?.value;
  const month     = document.getElementById('ie-gen-month')?.value;
  const year      = document.getElementById('ie-gen-year')?.value;

  if (!category)             { toast('Category is required',   'error'); return; }
  if (category==='أخرى' && !otherDesc) { toast('"Other" requires description','error'); return; }
  if (amount <= 0)           { toast('Amount must be greater than 0','error'); return; }
  if (!statement)            { toast('Statement is required',  'error'); return; }

  const finalStatement = category === 'أخرى' ? otherDesc : statement;
  const branchARMap    = window.BRANCH_AR || {};
  const branchCode     = Object.keys(BRANCH_MAP).find(k => BRANCH_MAP[k] === branch) || '';
  const branchAR       = branchARMap[branchCode] || branch;

  try {
    const snap   = await db.collection('gen_expenses').get();
    const lastNo = snap.empty ? 0 :
      Math.max(...snap.docs.map(d => parseInt(d.data()['No.']||d.data()['ID']||0)));

    await db.collection('gen_expenses').add({
      'No.'                  : String(lastNo + 1),
      'ID'                   : String(lastNo + 1),
      'نوع المصروف'          : category,
      'بيان المصروف'         : finalStatement,
      'Expense Statement'    : finalStatement,
      'قيمة المصروف'         : '£' + amount.toFixed(2),
      'Branch'               : branch,
      'موقع الفرع'           : branchAR,
      'نوع الكيان'           : entity === 'Company branch' ? 'فرع شركة' : entity,
      'Entity Type'          : entity,
      'اسم الموظف'           : empName || '',
      'رمز الموظف'           : empCode || '',
      'متعلق بالموظفين'      : empName ? 'نعم' : 'لا',
      'يوم'                  : String(parseInt(day)),
      'شهر'                  : String(parseInt(month)),
      'سنة'                  : String(year),
      'مستحق عن سنة'         : String(year),
      'مستحق عن شهر'         : String(parseInt(month)),
      '_sys_updated'         : Date.now()
    });

    await logAction('ADD', 'Income & Expenses',
      'General expense: ' + category + ' | ' + finalStatement +
      ' | £' + amount + ' | ' + branch);
    toast('General expense saved!', 'success');
    renderIEAddForm();
    computeIEKPIs();
    loadIETrendChart();
    loadIEBranchBreakdown();
    setTimeout(() => showIETab('gen', document.getElementById('ie-tab-gen')), 500);
  } catch (e) {
    toast('Save failed: ' + e.message, 'error');
  }
};

// ============================================================
// CSV EXPORT
// ============================================================
window.exportIncomeCSV = function() {
  try {
    const rows = window._ieIncomeRows || [];
    if (!rows.length) { toast('No income data to export', 'error'); return; }

    const headers = ['No','Date','Statement','Order Ref','Branch',
                     'Type','Collected By','Amount'];
    const csv = [
      headers.join(','),
      ...rows.map(r => {
        const day     = r['يوم']  || '';
        const month   = r['شهر']  || '';
        const year    = r['سنة']  || '';
        const dateStr = day
          ? String(day).padStart(2,'0') + '/' + String(month).padStart(2,'0') + '/' + year
          : '';
        return [
          r['No.']  || '',
          dateStr,
          '"' + (r['بيان التحصيل']||r['Expense Statement']||'').replace(/"/g,'""') + '"',
          r['كود الاوردر']   || '',
          r['موقع الفرع']    || r.Branch || '',
          r['نوع التحصيل']   || '',
          '"' + (r['تم تحصيل من طرف']||'').replace(/"/g,'""') + '"',
          parseAmount(r['قيمة التحصيل'])
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type:'text/csv;charset=utf-8' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = 'BrothersEGY_Income_' + new Date().toISOString().slice(0,10) + '.csv';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('✅ CSV exported!', 'success');
  } catch (e) {
    toast('Export failed: ' + e.message, 'error');
  }
};

// ============================================================
// OPEN ORDER FROM FINANCE TABLE
// ✅ Always defined — guard removed since guard caused issues
// ============================================================
window.openOrderByNo = async function(orderNo) {
  if (!orderNo) return;
  let found = (window.allOrders||[]).find(o => String(o['No.']) === String(orderNo));
  if (!found) {
    try {
      const q = await db.collection('bookings')
        .where('No.', '==', String(orderNo)).limit(1).get();
      if (!q.empty) found = { id:q.docs[0].id, ...q.docs[0].data() };
    } catch (_) {}
  }
  if (found && typeof openOrderDetail === 'function') {
    openOrderDetail(found.id || found['No.']);
  } else {
    toast('Order #' + orderNo + ' not found', 'info');
  }
};
