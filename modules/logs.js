// ============================================================
// modules/logs.js
// System Logs — realtime listener, user activity summary,
// action/user/branch filters, search, daily summary,
// live indicator, log KPIs
// ============================================================

// ============================================================
// ENTRY POINT
// ============================================================

window.renderSystemLogs = function() {
  renderPageLoading('page-system-logs', '📜', 'System Logs');
  loadSystemLogs();
};

window.loadSystemLogs = async function() {
  const el     = document.getElementById('page-system-logs');
  if (!el) return;
  const isPriv = ['Admin','Executive'].includes(G.user?.role);

  el.innerHTML = `
    <div class="section-header">
      <div>
        <h2>📜 System Logs</h2>
        <p>Complete real-time audit trail — every user action</p>
      </div>
      <div style="display:flex;gap:7px;align-items:center;">
        <div style="width:8px;height:8px;border-radius:50%;
          background:var(--success);
          animation:dashPulse 2s infinite;flex-shrink:0;"></div>
        <span style="font-size:11px;color:var(--success);font-weight:700;">
          LIVE
        </span>
        <button class="btn btn-ghost btn-sm"
          onclick="loadSystemLogs()">🔄 Restart</button>
      </div>
    </div>

    <!-- KPI Row -->
    <div style="display:grid;
      grid-template-columns:repeat(auto-fill,minmax(140px,1fr));
      gap:10px;margin-bottom:16px;">
      <div class="kpi-card">
        <div class="kpi-label">Total Logs</div>
        <div class="kpi-value text-accent" id="log-kpi-total">--</div>
        <div class="kpi-sub">Last 300 records</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Session Time</div>
        <div class="kpi-value text-success" id="log-kpi-session">0m</div>
        <div class="kpi-sub">Since login</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Edits / Adds</div>
        <div class="kpi-value text-warning" id="log-kpi-edits">--</div>
        <div class="kpi-sub">Changes made</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Current User</div>
        <div class="kpi-value text-success" id="log-kpi-user"
          style="font-size:15px;">--</div>
        <div class="kpi-sub" id="log-kpi-branch">--</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Unique Users</div>
        <div class="kpi-value text-accent" id="log-kpi-users">--</div>
        <div class="kpi-sub">In this batch</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Generates</div>
        <div class="kpi-value" style="color:var(--purple);"
          id="log-kpi-generates">--</div>
        <div class="kpi-sub">Documents created</div>
      </div>
    </div>

    <!-- Daily Activity Summary (Admin only) -->
    ${isPriv ? `
    <div class="panel" style="margin-bottom:14px;"
      id="log-daily-summary-panel">
      <div style="display:flex;align-items:center;
        justify-content:space-between;margin-bottom:11px;">
        <h3 style="font-size:13px;font-weight:800;">
          📊 Activity Summary by User
        </h3>
        <button class="btn btn-ghost btn-xs"
          onclick="buildDailySummary()">🔄 Refresh</button>
      </div>
      <div id="log-daily-summary">
        <div class="empty-state" style="padding:18px;">
          <div class="spinner"></div>
        </div>
      </div>
    </div>` : ''}

    <!-- Filters -->
    <div class="panel" style="margin-bottom:14px;">
      <div style="display:flex;gap:9px;flex-wrap:wrap;align-items:flex-end;">
        <div style="flex:1;min-width:160px;">
          <div style="font-size:10px;color:var(--text3);
            margin-bottom:3px;font-weight:700;">🔍 SEARCH</div>
          <input type="text" id="log-search"
            placeholder="User, action, module, details..."
            style="width:100%;padding:7px 11px;background:var(--surface2);
              border:1px solid var(--border);border-radius:8px;
              color:var(--text);"
            oninput="filterLogs()"/>
        </div>
        <div>
          <div style="font-size:10px;color:var(--text3);
            margin-bottom:3px;font-weight:700;">ACTION</div>
          <select id="log-action-filter" onchange="filterLogs()"
            style="padding:7px 9px;background:var(--surface2);
              border:1px solid var(--border);border-radius:8px;
              color:var(--text);">
            <option value="all">All Actions</option>
            <option value="LOGIN">Login</option>
            <option value="LOGOUT">Logout</option>
            <option value="GENERATE">Generate</option>
            <option value="EDIT">Edit</option>
            <option value="ADD">Add</option>
            <option value="PRINT">Print</option>
            <option value="VIEW">View</option>
            <option value="DELETE">Delete</option>
          </select>
        </div>
        <div>
          <div style="font-size:10px;color:var(--text3);
            margin-bottom:3px;font-weight:700;">USER</div>
          <select id="log-user-filter" onchange="filterLogs()"
            style="padding:7px 9px;background:var(--surface2);
              border:1px solid var(--border);border-radius:8px;
              color:var(--text);">
            <option value="all">All Users</option>
          </select>
        </div>
        <div>
          <div style="font-size:10px;color:var(--text3);
            margin-bottom:3px;font-weight:700;">BRANCH</div>
          <select id="log-branch-filter" onchange="filterLogs()"
            style="padding:7px 9px;background:var(--surface2);
              border:1px solid var(--border);border-radius:8px;
              color:var(--text);">
            <option value="all">All Branches</option>
            <option value="HRG">Hurghada</option>
            <option value="ALX">Alexandria</option>
            <option value="CAI">Cairo</option>
            <option value="RSH">Rashid</option>
          </select>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="
          document.getElementById('log-search').value='';
          document.getElementById('log-action-filter').value='all';
          document.getElementById('log-user-filter').value='all';
          document.getElementById('log-branch-filter').value='all';
          filterLogs();">✕ Clear</button>
      </div>
    </div>

    <!-- Log Table -->
    <div class="panel">
      <div id="log-table-wrap" class="table-wrap">
        <div class="empty-state">
          <div class="spinner lg"></div>
          <p style="margin-top:11px;">Connecting to live log stream...</p>
        </div>
      </div>
    </div>`;

  // ---- Session timer ----
  const loginTs = Date.now();
  const _sessionInterval = setInterval(() => {
    const el2 = document.getElementById('log-kpi-session');
    if (!el2) { clearInterval(_sessionInterval); return; }
    const mins = Math.floor((Date.now() - loginTs) / 60000);
    el2.textContent = mins < 60
      ? `${mins}m`
      : `${Math.floor(mins/60)}h ${mins%60}m`;
  }, 15000);

  // ---- Static KPIs ----
  const kuEl = document.getElementById('log-kpi-user');
  const kbEl = document.getElementById('log-kpi-branch');
  if (kuEl) kuEl.textContent = G.user?.username || '—';
  if (kbEl) kbEl.textContent = BRANCH_MAP[G.user?.branch] ||
                                G.user?.branch || 'All';

  // ---- Stop any existing log listener ----
  if (window.logUnsub) {
    try { window.logUnsub(); } catch (e) {}
    window.logUnsub = null;
  }

  // ---- Attach realtime listener ----
  try {
    window.logUnsub = db.collection('logs')
      .orderBy('timestamp', 'desc')
      .limit(300)
      .onSnapshot(snap => {
        const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Cache for filtering
        window.allLogs = logs;

        // Update KPIs
        const totalEl    = document.getElementById('log-kpi-total');
        const editsEl    = document.getElementById('log-kpi-edits');
        const usersEl    = document.getElementById('log-kpi-users');
        const gensEl     = document.getElementById('log-kpi-generates');

        if (totalEl) totalEl.textContent = logs.length;
        if (editsEl) editsEl.textContent =
          logs.filter(l => l.action === 'EDIT' || l.action === 'ADD').length;
        if (usersEl) usersEl.textContent =
          [...new Set(logs.map(l => l.user).filter(Boolean))].length;
        if (gensEl)  gensEl.textContent  =
          logs.filter(l => l.action === 'GENERATE').length;

        // Populate user filter dynamically
        const userFilter = document.getElementById('log-user-filter');
        if (userFilter) {
          const uniqueUsers = [
            ...new Set(logs.map(l => l.user).filter(Boolean))
          ];
          const current = userFilter.value;
          userFilter.innerHTML =
            '<option value="all">All Users</option>' +
            uniqueUsers.map(u =>
              `<option value="${u}" ${u === current ? 'selected' : ''}>${u}</option>`
            ).join('');
        }

        // Render filtered table
        filterLogs();

        // Build daily summary if visible
        if (document.getElementById('log-daily-summary')) {
          buildDailySummary();
        }

      }, e => {
        console.warn('Logs listener error:', e.message);
        const wrap = document.getElementById('log-table-wrap');
        if (wrap) wrap.innerHTML = `
          <div class="empty-state">
            <p>Log stream error: ${e.message}</p>
          </div>`;
      });

    // Register so it cleans up on logout
    G.unsubscribers.push(window.logUnsub);

  } catch (e) {
    console.warn('Could not attach logs listener:', e.message);
    const wrap = document.getElementById('log-table-wrap');
    if (wrap) wrap.innerHTML = `
      <div class="empty-state">
        <p>Could not connect: ${e.message}</p>
      </div>`;
  }
};

// ============================================================
// FILTER LOGS
// ============================================================

window.filterLogs = debounce(function() {
  const search = (document.getElementById('log-search')?.value       || '').toLowerCase();
  const action = document.getElementById('log-action-filter')?.value || 'all';
  const user   = document.getElementById('log-user-filter')?.value   || 'all';
  const branch = document.getElementById('log-branch-filter')?.value || 'all';

  let logs = window.allLogs || [];

  if (action !== 'all') logs = logs.filter(l => l.action === action);
  if (user   !== 'all') logs = logs.filter(l => l.user   === user);
  if (branch !== 'all') logs = logs.filter(l => l.branch === branch);
  if (search)           logs = logs.filter(l =>
    [l.user, l.action, l.module, l.details, l.branch]
      .join(' ').toLowerCase().includes(search)
  );

  renderLogsTable(logs);
}, 150);

// ============================================================
// RENDER LOGS TABLE
// ============================================================

window.renderLogsTable = function(logs) {
  const wrap = document.getElementById('log-table-wrap');
  if (!wrap) return;

  if (!logs.length) {
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="es-icon">📜</div>
        <p>No logs match your current filters</p>
      </div>`;
    return;
  }

  const AC = {
    LOGIN:    { bg: 'rgba(34,197,94,0.1)',    color: 'var(--success)',  icon: '🔐' },
    LOGOUT:   { bg: 'rgba(100,116,139,0.1)',  color: 'var(--text3)',    icon: '🚪' },
    GENERATE: { bg: 'rgba(59,130,246,0.1)',   color: 'var(--accent)',   icon: '📄' },
    EDIT:     { bg: 'rgba(245,158,11,0.1)',   color: 'var(--warning)',  icon: '✏️' },
    ADD:      { bg: 'rgba(168,85,247,0.1)',   color: 'var(--purple)',   icon: '➕' },
    PRINT:    { bg: 'rgba(14,165,233,0.1)',   color: 'var(--accent3)',  icon: '🖨️' },
    VIEW:     { bg: 'rgba(100,116,139,0.04)', color: 'var(--text3)',    icon: '👁'  },
    DELETE:   { bg: 'rgba(239,68,68,0.1)',    color: 'var(--danger)',   icon: '🗑️' }
  };

  wrap.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Timestamp</th>
          <th>User</th>
          <th>Action</th>
          <th>Module</th>
          <th>Details</th>
          <th>Branch</th>
        </tr>
      </thead>
      <tbody>
        ${logs.map(l => {
          const ac = AC[l.action] || AC.VIEW;
          return `
            <tr>
              <td style="font-size:10px;white-space:nowrap;color:var(--text3);">
                ${l.timeStr || new Date(l.timestamp).toLocaleString('en-GB')}
              </td>
              <td>
                <div style="display:flex;align-items:center;gap:6px;">
                  <div style="width:22px;height:22px;border-radius:6px;
                    flex-shrink:0;
                    background:linear-gradient(135deg,var(--accent),var(--accent2));
                    display:flex;align-items:center;justify-content:center;
                    font-size:9px;font-weight:800;color:#fff;">
                    ${initials(l.user || '?').toUpperCase()}
                  </div>
                  <span style="font-weight:700;color:var(--accent);font-size:11px;">
                    ${l.user || '—'}
                  </span>
                </div>
              </td>
              <td>
                <span style="padding:2px 8px;border-radius:99px;
                  font-size:10px;font-weight:800;
                  background:${ac.bg};color:${ac.color};">
                  ${ac.icon} ${l.action}
                </span>
              </td>
              <td style="font-size:11px;">${l.module || '—'}</td>
              <td style="font-size:11px;max-width:320px;">
                ${l.details || '—'}
              </td>
              <td style="font-size:11px;">
                ${l.branch ? (BRANCH_MAP[l.branch] || l.branch) : '—'}
              </td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>
    <div style="padding:9px 11px;font-size:11px;color:var(--text3);
      border-top:1px solid var(--border);
      display:flex;justify-content:space-between;">
      <span>
        Showing ${logs.length} log${logs.length !== 1 ? 's' : ''}
      </span>
      <span style="color:var(--success);">● Live</span>
    </div>`;
};

// ============================================================
// DAILY ACTIVITY SUMMARY (Admin only)
// ============================================================

window.buildDailySummary = function() {
  const container = document.getElementById('log-daily-summary');
  if (!container) return;

  const logs = window.allLogs || [];
  if (!logs.length) {
    container.innerHTML = `
      <div style="font-size:11px;color:var(--text3);padding:11px;">
        No data yet
      </div>`;
    return;
  }

  // Group by user
  const byUser = {};
  logs.forEach(l => {
    if (!l.user) return;
    if (!byUser[l.user]) byUser[l.user] = {
      user:     l.user,
      branch:   l.branch || '',
      logins:   0,
      edits:    0,
      generates:0,
      views:    0,
      adds:     0,
      prints:   0,
      deletes:  0,
      total:    0,
      lastSeen: 0
    };
    const u = byUser[l.user];
    u.total++;
    if      (l.action === 'LOGIN')    u.logins++;
    else if (l.action === 'EDIT')     u.edits++;
    else if (l.action === 'GENERATE') u.generates++;
    else if (l.action === 'VIEW')     u.views++;
    else if (l.action === 'ADD')      u.adds++;
    else if (l.action === 'PRINT')    u.prints++;
    else if (l.action === 'DELETE')   u.deletes++;
    if (l.timestamp > u.lastSeen) u.lastSeen = l.timestamp;
  });

  const users = Object.values(byUser)
    .sort((a,b) => b.total - a.total);

  const _c = (n, color) => n > 0
    ? `<span style="color:${color};">${n}</span>`
    : '<span style="color:var(--text3);">—</span>';

  container.innerHTML = `
    <div style="overflow-x:auto;">
      <table class="data-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Branch</th>
            <th>Logins</th>
            <th>Edits</th>
            <th>Generates</th>
            <th>Adds</th>
            <th>Prints</th>
            <th>Deletes</th>
            <th>Views</th>
            <th>Total</th>
            <th>Last Seen</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(u => `
            <tr>
              <td>
                <div style="display:flex;align-items:center;gap:6px;">
                  <div style="width:22px;height:22px;border-radius:6px;
                    flex-shrink:0;
                    background:linear-gradient(135deg,var(--accent),var(--accent2));
                    display:flex;align-items:center;justify-content:center;
                    font-size:9px;font-weight:800;color:#fff;">
                    ${initials(u.user).toUpperCase()}
                  </div>
                  <strong style="color:var(--accent);">${u.user}</strong>
                </div>
              </td>
              <td style="font-size:11px;">
                ${BRANCH_MAP[u.branch] || u.branch || '—'}
              </td>
              <td style="text-align:center;">
                ${_c(u.logins, 'var(--success)')}
              </td>
              <td style="text-align:center;">
                ${_c(u.edits, 'var(--warning)')}
              </td>
              <td style="text-align:center;">
                ${_c(u.generates, 'var(--accent)')}
              </td>
              <td style="text-align:center;">
                ${_c(u.adds, 'var(--purple)')}
              </td>
              <td style="text-align:center;">
                ${_c(u.prints, 'var(--accent3)')}
              </td>
              <td style="text-align:center;">
                ${_c(u.deletes, 'var(--danger)')}
              </td>
              <td style="text-align:center;color:var(--text3);">
                ${u.views}
              </td>
              <td style="text-align:center;font-weight:700;">
                ${u.total}
              </td>
              <td style="font-size:10px;color:var(--text3);white-space:nowrap;">
                ${u.lastSeen ? getTimeAgo(u.lastSeen) : '—'}
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
};
