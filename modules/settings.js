// ============================================================
// modules/settings.js v4.1
// ============================================================

window.renderSettings = function() {
  renderPageLoading('page-settings', '⚙️', 'Settings');
  loadSettingsPage();
};

window.loadSettingsPage = async function() {
  const el = document.getElementById('page-settings');
  if (!el) return;

  el.innerHTML = `
    <div class="section-header">
      <div>
        <h2>⚙️ Settings</h2>
        <p>System configuration — Admin only</p>
      </div>
      <button class="btn btn-success" onclick="saveAllSettings()">
        💾 Save All Settings
      </button>
    </div>

    <!-- Tabs -->
    <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;">
      <button class="btn btn-ghost btn-sm settings-tab-btn" id="set-tab-general"
        style="border-color:var(--accent);color:var(--accent);"
        onclick="showSettingsTab('general',this)">⚙️ General</button>
      <button class="btn btn-ghost btn-sm settings-tab-btn" id="set-tab-users"
        onclick="showSettingsTab('users',this)">👥 Users</button>
      <button class="btn btn-ghost btn-sm settings-tab-btn" id="set-tab-shifts"
        onclick="showSettingsTab('shifts',this)">🕐 Shifts & Discounts</button>
      <button class="btn btn-ghost btn-sm settings-tab-btn" id="set-tab-rates"
        onclick="showSettingsTab('rates',this)">💲 Rate Card</button>
      <button class="btn btn-ghost btn-sm settings-tab-btn" id="set-tab-whatsapp"
        onclick="showSettingsTab('whatsapp',this)">📱 WhatsApp</button>
      <button class="btn btn-ghost btn-sm settings-tab-btn" id="set-tab-penalties"
        onclick="showSettingsTab('penalties',this)">⚠️ Penalties</button>
      <button class="btn btn-ghost btn-sm settings-tab-btn" id="set-tab-maintenance"
        onclick="showSettingsTab('maintenance',this)">🔧 Maintenance</button>
    </div>

    <!-- GENERAL -->
    <div id="set-pane-general">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
        <div class="panel">
          <h3 style="font-size:13px;font-weight:800;margin-bottom:13px;">
            🔒 Session & Security
          </h3>
          <p style="font-size:11px;color:var(--text3);margin-bottom:11px;">
            Controls session duration and idle timeout system-wide.
          </p>
          <div class="form-grid">
            <div class="field">
              <label>Session Duration (minutes)</label>
              <input type="number" id="set-session-timeout"
                value="${G.settings.sessionTimeoutMins || 60}"
                min="10" max="480"/>
              <div style="font-size:10px;color:var(--text3);margin-top:3px;">
                User will be warned and logged out after this time
              </div>
            </div>
            <div class="field">
              <label>Idle Timeout (minutes)</label>
              <input type="number" id="set-idle-timeout"
                value="${G.settings.idleTimeoutMins || 5}"
                min="1" max="60"/>
              <div style="font-size:10px;color:var(--text3);margin-top:3px;">
                Log out after this many minutes of no activity
              </div>
            </div>
          </div>
          <div style="margin-top:9px;padding:9px;background:var(--surface2);
                      border-radius:8px;font-size:11px;color:var(--text3);">
            Session: <strong>${G.settings.sessionTimeoutMins || 60}min</strong> |
            Idle: <strong>${G.settings.idleTimeoutMins || 5}min</strong>
          </div>
        </div>

        <div class="panel">
          <h3 style="font-size:13px;font-weight:800;margin-bottom:13px;">
            📋 Proposal Settings
          </h3>
          <div class="form-grid">
            <div class="field">
              <label>Auto-cancel Draft After (days)</label>
              <input type="number" id="set-proposal-expire"
                value="${G.settings.proposalExpireDays || 14}" min="1" max="90"/>
            </div>
            <div class="field">
              <label>Max Proposals Per Car</label>
              <input type="number" id="set-max-proposals"
                value="${G.settings.maxProposalsPerCar || 1}" min="1" max="5"/>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- USERS -->
    <div id="set-pane-users" style="display:none;">
      <div style="display:flex;align-items:center;
                  justify-content:space-between;margin-bottom:13px;">
        <h3 style="font-size:14px;font-weight:800;">👥 User Management</h3>
        <button class="btn btn-primary btn-sm"
          onclick="openCreateUserModal()">➕ Create User</button>
      </div>
      <div id="users-list">
        <div class="empty-state"><div class="spinner"></div></div>
      </div>
    </div>

    <!-- SHIFTS & DISCOUNTS — per user -->
    <div id="set-pane-shifts" style="display:none;">
      <div style="display:flex;align-items:center;
                  justify-content:space-between;margin-bottom:13px;">
        <div>
          <h3 style="font-size:14px;font-weight:800;margin-bottom:4px;">
            🕐 Shift Hours & Discount Limits — Per User
          </h3>
          <p style="font-size:11px;color:var(--text3);">
            Each user can have different shift hours and discount approval thresholds.
          </p>
        </div>
        <button class="btn btn-success btn-sm" onclick="saveShiftSettings()">
          💾 Save Shifts
        </button>
      </div>
      <div id="shifts-list">
        <div class="empty-state"><div class="spinner"></div></div>
      </div>
    </div>

    <!-- RATE CARD -->
    <div id="set-pane-rates" style="display:none;">
      <div style="display:flex;align-items:center;
                  justify-content:space-between;margin-bottom:13px;">
        <div>
          <h3 style="font-size:14px;font-weight:800;margin-bottom:4px;">
            💲 Rate Card — Per Car
          </h3>
          <p style="font-size:11px;color:var(--text3);">
            Set tiered daily rates per car. Each car can have different rates
            based on number of rental days.
          </p>
        </div>
      </div>
      <div id="rate-card-content">
        <div class="empty-state"><div class="spinner"></div></div>
      </div>
    </div>

    <!-- WHATSAPP -->
    <div id="set-pane-whatsapp" style="display:none;">
      <div style="margin-bottom:13px;padding:13px;
                  background:rgba(34,197,94,0.08);
                  border:1px solid rgba(34,197,94,0.25);
                  border-radius:var(--radius);">
        <div style="font-size:12px;font-weight:700;color:var(--success);
                    margin-bottom:7px;">
          📱 Setup WhatsApp Notifications via CallMeBot
        </div>
        <div style="font-size:11px;color:var(--text2);line-height:1.6;">
          1. Each employee sends
          <strong style="color:var(--accent);">
            "I allow callmebot to send me messages"
          </strong>
          to WhatsApp <strong>+34 644 60 42 42</strong><br>
          2. They receive an API key — enter it below<br>
          3. Save settings
        </div>
      </div>
      <div id="whatsapp-keys-list">
        <div class="empty-state"><div class="spinner"></div></div>
      </div>
      <button class="btn btn-ghost btn-sm mt-8"
        onclick="loadWhatsAppKeys()">🔄 Reload Users</button>
    </div>

    <!-- PENALTIES -->
    <div id="set-pane-penalties" style="display:none;">
      <div class="panel" style="max-width:500px;">
        <h3 style="font-size:13px;font-weight:800;margin-bottom:5px;">
          ⚠️ Task Penalty Amounts (EGP)
        </h3>
        <p style="font-size:11px;color:var(--text3);margin-bottom:13px;">
          Automatically attached to tasks when created.
        </p>
        <div class="form-grid">
          <div class="field">
            <label>Low Priority Penalty</label>
            <input type="number" id="set-pen-low"
              value="${G.settings.penaltyLow || 50}"/>
          </div>
          <div class="field">
            <label>Medium Priority Penalty</label>
            <input type="number" id="set-pen-med"
              value="${G.settings.penaltyMedium || 100}"/>
          </div>
          <div class="field">
            <label>High Priority Penalty</label>
            <input type="number" id="set-pen-high"
              value="${G.settings.penaltyHigh || 200}"/>
          </div>
          <div class="field">
            <label>Urgent Priority Penalty</label>
            <input type="number" id="set-pen-urg"
              value="${G.settings.penaltyUrgent || 500}"/>
          </div>
        </div>
        <div style="margin-top:13px;padding:9px;
                    background:rgba(245,158,11,0.08);
                    border:1px solid rgba(245,158,11,0.25);
                    border-radius:8px;font-size:11px;color:var(--warning);">
          ⚠️ Penalty deductions are informational only.
        </div>
      </div>
    </div>

    <!-- MAINTENANCE -->
    <div id="set-pane-maintenance" style="display:none;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
        <div class="panel">
          <h3 style="font-size:13px;font-weight:800;margin-bottom:13px;">
            🗂️ Bulk Close Pre-2026 Orders
          </h3>
          <p style="font-size:11px;color:var(--text3);margin-bottom:11px;">
            Marks all open orders with end date before 1 Jan 2026 as Closed.
          </p>
          <div id="bulk-close-status"
            style="font-size:11px;color:var(--text3);margin-bottom:9px;min-height:14px;">
          </div>
          <button class="btn btn-warning"
            onclick="confirmBulkCloseOldOrders()">
            ⚡ Bulk Close Pre-2026 Orders
          </button>
        </div>
        <div class="panel">
          <h3 style="font-size:13px;font-weight:800;margin-bottom:13px;">
            🔄 Reload All Caches
          </h3>
          <p style="font-size:11px;color:var(--text3);margin-bottom:11px;">
            Force a full refresh from Firestore.
          </p>
          <button class="btn btn-ghost" onclick="reloadAllCaches()">
            🔄 Reload All
          </button>
        </div>
        <div class="panel">
          <h3 style="font-size:13px;font-weight:800;margin-bottom:13px;">
            🗄️ Data Statistics
          </h3>
          <div style="font-size:11px;display:grid;
                      grid-template-columns:auto 1fr;gap:5px 14px;">
            <span style="color:var(--text3);">Fleet Cars:</span>
            <strong>${G.fleet.length}</strong>
            <span style="color:var(--text3);">Bookings:</span>
            <strong>${G.bookings.length}</strong>
            <span style="color:var(--text3);">Customers:</span>
            <strong>${G.customers.length}</strong>
            <span style="color:var(--text3);">Proposals:</span>
            <strong>${G.proposals.length}</strong>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom save -->
    <div style="margin-top:18px;padding-top:14px;border-top:1px solid var(--border);">
      <button class="btn btn-success" onclick="saveAllSettings()">
        💾 Save All Settings
      </button>
      <span style="font-size:11px;color:var(--text3);margin-left:11px;">
        Changes are saved to Firestore immediately
      </span>
    </div>
  `;

  showSettingsTab('general', document.getElementById('set-tab-general'));
};

// ============================================================
// TAB MANAGER
// ============================================================
window.showSettingsTab = function(tab, btn) {
  ['general','users','shifts','rates','whatsapp','penalties','maintenance']
    .forEach(t => {
      const p = document.getElementById('set-pane-' + t);
      if (p) p.style.display = 'none';
    });
  document.querySelectorAll('.settings-tab-btn').forEach(b => {
    b.style.borderColor = 'var(--border)';
    b.style.color       = 'var(--text2)';
  });
  if (btn) {
    btn.style.borderColor = 'var(--accent)';
    btn.style.color       = 'var(--accent)';
  }
  const pane = document.getElementById('set-pane-' + tab);
  if (pane) pane.style.display = 'block';

  if (tab === 'users')     loadUserManagement();
  else if (tab === 'shifts')   loadShiftSettings();
  else if (tab === 'rates')    loadRateCardSettings();
  else if (tab === 'whatsapp') loadWhatsAppKeys();
};

// ============================================================
// SAVE ALL SETTINGS
// ============================================================
window.saveAllSettings = async function() {
  if (!confirm('Save all settings? This will affect the entire system.')) return;
  try {
    const phones = {}, keys = {};
    (window._settingsUsers || []).forEach(u => {
      const phone = document.getElementById('wa-phone-' + u.id)?.value.trim();
      const key   = document.getElementById('wa-key-'   + u.id)?.value.trim();
      if (phone) phones[u.id] = phone;
      if (key)   keys[u.id]   = key;
    });

    const newSettings = {
      sessionTimeoutMins : parseInt(document.getElementById('set-session-timeout')?.value  || 60),
      idleTimeoutMins    : parseInt(document.getElementById('set-idle-timeout')?.value      || 5),
      proposalExpireDays : parseInt(document.getElementById('set-proposal-expire')?.value   || 14),
      maxProposalsPerCar : parseInt(document.getElementById('set-max-proposals')?.value     || 1),
      penaltyLow         : parseFloat(document.getElementById('set-pen-low')?.value         || 50),
      penaltyMedium      : parseFloat(document.getElementById('set-pen-med')?.value         || 100),
      penaltyHigh        : parseFloat(document.getElementById('set-pen-high')?.value        || 200),
      penaltyUrgent      : parseFloat(document.getElementById('set-pen-urg')?.value         || 500),
      callmebotPhones    : phones,
      callmebotKeys      : keys
    };

    await db.collection('settings').doc('main').set(newSettings, { merge: true });
    G.settings = { ...G.settings, ...newSettings };

    await logAction('EDIT', 'Settings', 'System settings updated');
    toast('All settings saved!', 'success');

  } catch (e) {
    toast('Save failed: ' + e.message, 'error');
  }
};

// ============================================================
// SHIFTS & DISCOUNTS — PER USER
// ============================================================
window.loadShiftSettings = async function() {
  const list = document.getElementById('shifts-list');
  if (!list) return;
  list.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';

  try {
    const snap  = await db.collection('users').get();
    const users = snap.docs.map(d => ({ id:d.id, ...d.data() }))
      .sort((a,b) => a.id.localeCompare(b.id));
    window._settingsUsers = users;

    list.innerHTML = `
      <div class="panel">
        <p style="font-size:11px;color:var(--text3);margin-bottom:13px;">
          Set individual shift hours and discount limits per user.
          These override the global defaults.
        </p>
        <div style="overflow-x:auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Branch</th>
                <th>Shift Start</th>
                <th>Shift End</th>
                <th>Max Discount %</th>
                <th>Days Off</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(u => {
                const s = G.settings.userShifts?.[u.id] || {};
                return `
                  <tr>
                    <td>
                      <div style="display:flex;align-items:center;gap:7px;">
                        <div style="width:26px;height:26px;border-radius:7px;
                                    background:linear-gradient(135deg,var(--accent),var(--accent2));
                                    display:flex;align-items:center;justify-content:center;
                                    font-size:10px;font-weight:800;color:#fff;">
                          ${initials(u.id).toUpperCase()}
                        </div>
                        <strong>${u.id}</strong>
                      </div>
                    </td>
                    <td>
                      <span class="role-pill role-${u.role||'User'}">
                        ${u.role||'User'}
                      </span>
                    </td>
                    <td style="font-size:11px;">
                      ${BRANCH_MAP[u.branch]||u.branch||'All'}
                    </td>
                    <td>
                      <input type="number" id="shift-start-${u.id}"
                        value="${s.shiftStart ?? G.settings.shiftStart ?? 10}"
                        min="0" max="23"
                        style="width:60px;padding:5px;background:var(--surface2);
                               border:1px solid var(--border);border-radius:6px;
                               color:var(--text);font-size:11px;text-align:center;"/>
                      :00
                    </td>
                    <td>
                      <input type="number" id="shift-end-${u.id}"
                        value="${s.shiftEnd ?? G.settings.shiftEnd ?? 18}"
                        min="0" max="23"
                        style="width:60px;padding:5px;background:var(--surface2);
                               border:1px solid var(--border);border-radius:6px;
                               color:var(--text);font-size:11px;text-align:center;"/>
                      :00
                    </td>
                    <td>
                      <input type="number" id="discount-${u.id}"
                        value="${s.discountThreshold ?? G.settings.discountThreshold ?? 5}"
                        min="0" max="100" step="0.5"
                        style="width:70px;padding:5px;background:var(--surface2);
                               border:1px solid var(--border);border-radius:6px;
                               color:var(--text);font-size:11px;text-align:center;"/>
                      %
                    </td>
                    <td>
                      <div style="display:flex;gap:4px;flex-wrap:wrap;">
                        ${['Fri','Sat','Sun','Mon','Tue','Wed','Thu'].map((day, idx) => `
                          <label style="display:flex;flex-direction:column;
                                        align-items:center;gap:2px;cursor:pointer;
                                        font-size:9px;">
                            <input type="checkbox"
                              id="dayoff-${u.id}-${idx}"
                              ${(s.daysOff||[]).includes(idx) ? 'checked' : ''}
                              style="width:12px;height:12px;"/>
                            ${day}
                          </label>`).join('')}
                      </div>
                    </td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        <div style="margin-top:9px;padding:9px;background:var(--surface2);
                    border-radius:8px;font-size:11px;color:var(--text3);">
          ℹ️ Days Off: check boxes for days the user does NOT work.
          Task penalties are not applied on days off.
        </div>
      </div>`;

  } catch (e) {
    list.innerHTML = `
      <div class="empty-state"><p>Could not load users: ${e.message}</p></div>`;
  }
};

window.saveShiftSettings = async function() {
  try {
    const users     = window._settingsUsers || [];
    const userShifts= {};

    users.forEach(u => {
      const start    = parseInt(document.getElementById('shift-start-'  + u.id)?.value ?? 10);
      const end      = parseInt(document.getElementById('shift-end-'    + u.id)?.value ?? 18);
      const discount = parseFloat(document.getElementById('discount-'   + u.id)?.value ?? 5);
      const daysOff  = [0,1,2,3,4,5,6].filter(i =>
        document.getElementById('dayoff-' + u.id + '-' + i)?.checked
      );

      userShifts[u.id] = { shiftStart: start, shiftEnd: end, discountThreshold: discount, daysOff };
    });

    await db.collection('settings').doc('main').set({ userShifts }, { merge: true });
    G.settings.userShifts = userShifts;

    await logAction('EDIT', 'Settings', 'User shift settings updated');
    toast('✅ Shift settings saved!', 'success');

  } catch (e) {
    toast('Save failed: ' + e.message, 'error');
  }
};

// Helper to get shift for current user
window.getCurrentUserShift = function() {
  const uid     = G.user?.username;
  const uShift  = G.settings?.userShifts?.[uid];
  return {
    shiftStart        : uShift?.shiftStart        ?? G.settings?.shiftStart        ?? 10,
    shiftEnd          : uShift?.shiftEnd          ?? G.settings?.shiftEnd          ?? 18,
    discountThreshold : uShift?.discountThreshold ?? G.settings?.discountThreshold ?? 5,
    daysOff           : uShift?.daysOff           ?? []
  };
};

// ============================================================
// RATE CARD SETTINGS — per car, tiered
// ============================================================
window.loadRateCardSettings = async function() {
  const content = document.getElementById('rate-card-content');
  if (!content) return;
  content.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';

  try {
    if (!G.fleet || !G.fleet.length) await loadFleetData();

    // Load all existing rate cards
    const cards = await loadRateCards(true);

    // Filter to active cars only
    const activeCars = G.fleet
      .filter(c => getCarStatusCategory(c) !== 'archived')
      .sort((a,b) => (a.car_label||'').localeCompare(b.car_label||''));

    if (!activeCars.length) {
      content.innerHTML = `
        <div class="empty-state">
          <p>No active cars found. Add cars to fleet first.</p>
        </div>`;
      return;
    }

    content.innerHTML = `
      <div style="display:grid;gap:12px;">
        ${activeCars.map(car => {
          const plateStr = formatPlate(car);
          const label    = car.car_label || getCarLabel(car, 'en');
          const carId    = car.id || car.ID;
          const existing = cards.find(c =>
            String(c.car_id) === String(carId) ||
            String(c.car_id) === String(parseInt(carId))
          );
          const tiers    = existing?.tiers || [];
          const cat      = getCarStatusCategory(car);
          const dotColor = {
            available:'#22c55e', rented:'#3b82f6',
            accident:'#ef4444', maintenance:'#f59e0b'
          }[cat] || '#64748b';

          return `
            <div class="panel">
              <div style="display:flex;align-items:center;justify-content:space-between;
                          margin-bottom:10px;flex-wrap:wrap;gap:8px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="width:8px;height:8px;border-radius:50%;
                               background:${dotColor};flex-shrink:0;"></span>
                  <div>
                    <div style="font-size:12px;font-weight:700;">${label}</div>
                    <div style="font-size:10px;color:var(--text3);">
                      ${plateStr ? `Plate: ${plateStr} | ` : ''}
                      ID: ${carId}
                    </div>
                  </div>
                </div>
                <button class="btn btn-primary btn-xs"
                  onclick="openRateCardEditor('${carId}')">
                  ${tiers.length > 0 ? '✏️ Edit Rates' : '➕ Add Rates'}
                </button>
              </div>

              ${tiers.length > 0
                ? buildRateTierDisplay(tiers)
                : `<div style="font-size:11px;color:var(--text3);
                               padding:8px;background:var(--surface);border-radius:6px;">
                     No rates set — click "Add Rates" to configure
                   </div>`}
            </div>`;
        }).join('')}
      </div>`;

  } catch (e) {
    content.innerHTML = `
      <div class="empty-state"><p>Could not load rate cards: ${e.message}</p></div>`;
  }
};

// ============================================================
// USER MANAGEMENT
// ============================================================
window.loadUserManagement = async function() {
  const list = document.getElementById('users-list');
  if (!list) return;
  list.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';

  try {
    const snap  = await db.collection('users').get();
    const users = snap.docs
      .map(d => ({ id:d.id, ...d.data() }))
      .sort((a,b) => {
        const order = { Admin:0, Executive:1, User:2 };
        return (order[a.role]||3) - (order[b.role]||3);
      });
    window._settingsUsers = users;

    list.innerHTML = `
      <div class="panel">
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Role</th>
                <th>Branch</th>
                <th>Shift</th>
                <th>Discount Limit</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(u => {
                const s = G.settings?.userShifts?.[u.id] || {};
                return `
                  <tr>
                    <td>
                      <div style="display:flex;align-items:center;gap:7px;">
                        <div style="width:26px;height:26px;border-radius:7px;flex-shrink:0;
                                    background:linear-gradient(135deg,var(--accent),var(--accent2));
                                    display:flex;align-items:center;justify-content:center;
                                    font-size:10px;font-weight:800;color:#fff;">
                          ${initials(u.id).toUpperCase()}
                        </div>
                        <strong>${u.id}</strong>
                      </div>
                    </td>
                    <td>
                      <span class="role-pill role-${u.role||'User'}">
                        ${u.role||'User'}
                      </span>
                    </td>
                    <td style="font-size:11px;">
                      ${BRANCH_MAP[u.branch]||u.branch||'All'}
                    </td>
                    <td style="font-size:11px;">
                      ${s.shiftStart??10}:00 → ${s.shiftEnd??18}:00
                    </td>
                    <td style="font-size:11px;">
                      ${s.discountThreshold??G.settings.discountThreshold??5}%
                    </td>
                    <td>
                      <div style="display:flex;gap:3px;">
                        <button class="btn btn-warning btn-xs"
                          onclick="openEditUserModal('${u.id}')">✏️</button>
                        ${u.id !== G.user?.username ? `
                          <button class="btn btn-danger btn-xs"
                            onclick="confirmDeleteUser('${u.id}')">🗑️</button>
                        ` : ''}
                      </div>
                    </td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;

  } catch (e) {
    list.innerHTML = `
      <div class="empty-state"><p>Could not load users: ${e.message}</p></div>`;
  }
};

window.openCreateUserModal = function() {
  const html = `
    <div style="font-size:11px;color:var(--text3);margin-bottom:13px;">
      Create a new portal account.
    </div>
    <div class="form-grid">
      <div class="field">
        <label>Username *</label>
        <input type="text" id="new-username"
          placeholder="e.g. ahmed_hrg (no spaces)"/>
      </div>
      <div class="field">
        <label>Password *</label>
        <input type="password" id="new-password"
          placeholder="Minimum 6 characters"/>
      </div>
      <div class="field">
        <label>Role</label>
        <select id="new-role">
          <option value="User">User</option>
          <option value="Executive">Executive</option>
          <option value="Admin">Admin</option>
        </select>
      </div>
      <div class="field">
        <label>Branch</label>
        <select id="new-branch">
          <option value="HRG">Hurghada</option>
          <option value="ALX">Alexandria</option>
          <option value="CAI">Cairo</option>
          <option value="RSH">Rashid</option>
        </select>
      </div>
      <div class="field">
        <label>Shift Start (hour)</label>
        <input type="number" id="new-shift-start" value="10" min="0" max="23"/>
      </div>
      <div class="field">
        <label>Shift End (hour)</label>
        <input type="number" id="new-shift-end" value="18" min="0" max="23"/>
      </div>
      <div class="field">
        <label>Max Discount %</label>
        <input type="number" id="new-discount"
          value="${G.settings.discountThreshold||5}" min="0" max="100" step="0.5"/>
      </div>
      <div class="field" style="grid-column:1/-1;">
        <label>Module Access (for User role)</label>
        <div style="display:flex;gap:11px;flex-wrap:wrap;margin-top:7px;">
          ${[
            {n:1, label:'Proposals'},
            {n:2, label:'EN Contract'},
            {n:3, label:'AR Contract'},
            {n:4, label:'Receipts'},
            {n:5, label:'Income & Expenses'}
          ].map(m => `
            <label style="display:flex;align-items:center;gap:5px;
                          font-size:11px;cursor:pointer;">
              <input type="checkbox" id="new-access-${m.n}"
                value="${m.n}" style="width:14px;height:14px;"/>
              ${m.n}. ${m.label}
            </label>`).join('')}
        </div>
      </div>
    </div>
    <div style="display:flex;gap:7px;margin-top:13px;">
      <button class="btn btn-success" onclick="saveNewUser()">💾 Create User</button>
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    </div>`;
  openModal('👤 Create New User', html);
};

window.saveNewUser = async function() {
  const username = (document.getElementById('new-username')?.value || '')
    .trim().toLowerCase().replace(/\s+/g, '_');
  const password   = document.getElementById('new-password')?.value;
  const role       = document.getElementById('new-role')?.value       || 'User';
  const branch     = document.getElementById('new-branch')?.value     || 'HRG';
  const shiftStart = parseInt(document.getElementById('new-shift-start')?.value ?? 10);
  const shiftEnd   = parseInt(document.getElementById('new-shift-end')?.value   ?? 18);
  const discount   = parseFloat(document.getElementById('new-discount')?.value  ?? 5);

  if (!username)                       { toast('Username is required', 'error'); return; }
  if (!password || password.length < 6){ toast('Password min 6 characters', 'error'); return; }

  const access = [];
  [1,2,3,4,5].forEach(n => {
    if (document.getElementById('new-access-' + n)?.checked) access.push(n);
  });

  try {
    const existing = await db.collection('users').doc(username).get();
    if (existing.exists) {
      toast(`Username "${username}" already exists`, 'error'); return;
    }

    await db.collection('users').doc(username).set({
      password,
      role,
      branch,
      access      : (role === 'Admin' || role === 'Executive') ? [1,2,3,4,5] : access,
      created_at  : Date.now(),
      created_by  : G.user?.username || ''
    });

    // Save shift settings for this user
    const userShifts = { ...(G.settings.userShifts || {}) };
    userShifts[username] = { shiftStart, shiftEnd, discountThreshold: discount, daysOff: [] };
    await db.collection('settings').doc('main').set({ userShifts }, { merge:true });
    G.settings.userShifts = userShifts;

    await logAction('ADD', 'Settings',
      `New user: ${username} | Role: ${role} | Branch: ${branch}`);
    toast(`User "${username}" created!`, 'success');
    closeModal();
    loadUserManagement();

  } catch (e) {
    toast('Failed: ' + e.message, 'error');
  }
};

window.openEditUserModal = async function(userId) {
  try {
    const snap = await db.collection('users').doc(userId).get();
    if (!snap.exists) { toast('User not found', 'error'); return; }
    const u = snap.data();
    const s = G.settings?.userShifts?.[userId] || {};

    const html = `
      <div style="font-size:11px;color:var(--accent);font-weight:700;margin-bottom:11px;">
        Editing: ${userId}
      </div>
      <div class="form-grid">
        <div class="field">
          <label>New Password (blank = keep)</label>
          <input type="password" id="edit-user-password"
            placeholder="Leave blank to keep current"/>
        </div>
        <div class="field">
          <label>Role</label>
          <select id="edit-user-role">
            <option value="User"      ${u.role==='User'      ?'selected':''}>User</option>
            <option value="Executive" ${u.role==='Executive' ?'selected':''}>Executive</option>
            <option value="Admin"     ${u.role==='Admin'     ?'selected':''}>Admin</option>
          </select>
        </div>
        <div class="field">
          <label>Branch</label>
          <select id="edit-user-branch">
            <option value="HRG" ${u.branch==='HRG'?'selected':''}>Hurghada</option>
            <option value="ALX" ${u.branch==='ALX'?'selected':''}>Alexandria</option>
            <option value="CAI" ${u.branch==='CAI'?'selected':''}>Cairo</option>
            <option value="RSH" ${u.branch==='RSH'?'selected':''}>Rashid</option>
          </select>
        </div>
        <div class="field" style="grid-column:1/-1;">
          <label>Module Access</label>
          <div style="display:flex;gap:11px;flex-wrap:wrap;margin-top:7px;">
            ${[{n:1,label:'Proposals'},{n:2,label:'EN Contract'},
               {n:3,label:'AR Contract'},{n:4,label:'Receipts'},
               {n:5,label:'Income & Expenses'}].map(m => `
              <label style="display:flex;align-items:center;gap:5px;
                            font-size:11px;cursor:pointer;">
                <input type="checkbox" id="edit-access-${m.n}" value="${m.n}"
                  ${(u.access||[]).includes(m.n)?'checked':''}
                  style="width:14px;height:14px;"/>
                ${m.n}. ${m.label}
              </label>`).join('')}
          </div>
        </div>
        <!-- Per-user shift settings -->
        <div class="field">
          <label>Shift Start (hour)</label>
          <input type="number" id="edit-shift-start"
            value="${s.shiftStart ?? G.settings.shiftStart ?? 10}"
            min="0" max="23"/>
        </div>
        <div class="field">
          <label>Shift End (hour)</label>
          <input type="number" id="edit-shift-end"
            value="${s.shiftEnd ?? G.settings.shiftEnd ?? 18}"
            min="0" max="23"/>
        </div>
        <div class="field">
          <label>Max Discount % (no approval)</label>
          <input type="number" id="edit-discount"
            value="${s.discountThreshold ?? G.settings.discountThreshold ?? 5}"
            min="0" max="100" step="0.5"/>
        </div>
        <div class="field">
          <label>Days Off</label>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;">
            ${['Fri','Sat','Sun','Mon','Tue','Wed','Thu'].map((day, idx) => `
              <label style="display:flex;flex-direction:column;align-items:center;
                            gap:2px;cursor:pointer;font-size:9px;">
                <input type="checkbox" id="edit-dayoff-${idx}"
                  ${(s.daysOff||[]).includes(idx)?'checked':''}
                  style="width:12px;height:12px;"/>
                ${day}
              </label>`).join('')}
          </div>
        </div>
      </div>
      <div style="display:flex;gap:7px;margin-top:13px;">
        <button class="btn btn-success"
          onclick="saveUserEdit('${userId}')">💾 Save Changes</button>
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      </div>`;

    openModal(`✏️ Edit User — ${userId}`, html);

  } catch (e) {
    toast('Could not load user: ' + e.message, 'error');
  }
};

window.saveUserEdit = async function(userId) {
  try {
    const newPassword  = document.getElementById('edit-user-password')?.value;
    const role         = document.getElementById('edit-user-role')?.value    || 'User';
    const branch       = document.getElementById('edit-user-branch')?.value  || 'HRG';
    const shiftStart   = parseInt(document.getElementById('edit-shift-start')?.value ?? 10);
    const shiftEnd     = parseInt(document.getElementById('edit-shift-end')?.value   ?? 18);
    const discount     = parseFloat(document.getElementById('edit-discount')?.value  ?? 5);
    const daysOff      = [0,1,2,3,4,5,6].filter(i =>
      document.getElementById('edit-dayoff-' + i)?.checked
    );

    if (newPassword && newPassword.length > 0 && newPassword.length < 6) {
      toast('Password min 6 characters', 'error'); return;
    }

    const access = [];
    [1,2,3,4,5].forEach(n => {
      if (document.getElementById('edit-access-' + n)?.checked) access.push(n);
    });

    const upd = {
      role,
      branch,
      access      : (role==='Admin'||role==='Executive') ? [1,2,3,4,5] : access,
      updated_at  : Date.now(),
      updated_by  : G.user?.username || ''
    };
    if (newPassword && newPassword.length >= 6) upd.password = newPassword;

    await db.collection('users').doc(userId).update(upd);

    // Save shift settings
    const userShifts = { ...(G.settings.userShifts||{}) };
    userShifts[userId] = { shiftStart, shiftEnd, discountThreshold: discount, daysOff };
    await db.collection('settings').doc('main').set({ userShifts }, { merge:true });
    G.settings.userShifts = userShifts;

    await logAction('EDIT', 'Settings',
      `User updated: ${userId} → Role:${role} Branch:${branch}`);
    toast(`User "${userId}" updated!`, 'success');
    closeModal();
    loadUserManagement();

  } catch (e) {
    toast('Save failed: ' + e.message, 'error');
  }
};

window.confirmDeleteUser = async function(userId) {
  if (userId === G.user?.username) {
    toast('Cannot delete your own account', 'error'); return;
  }
  if (!confirm(`Permanently delete user "${userId}"?\n\nThis cannot be undone.`)) return;
  try {
    await db.collection('users').doc(userId).delete();
    await logAction('DELETE', 'Settings', `User deleted: ${userId}`);
    toast(`User "${userId}" deleted`, 'success');
    loadUserManagement();
  } catch (e) {
    toast('Delete failed: ' + e.message, 'error');
  }
};

// ============================================================
// WHATSAPP KEYS
// ============================================================
window.loadWhatsAppKeys = async function() {
  const list = document.getElementById('whatsapp-keys-list');
  if (!list) return;
  list.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
  try {
    const snap  = await db.collection('users').get();
    const users = snap.docs.map(d => ({ id:d.id, ...d.data() }))
      .sort((a,b) => a.id.localeCompare(b.id));
    window._settingsUsers = users;

    list.innerHTML = `
      <div class="panel">
        <table class="data-table">
          <thead>
            <tr>
              <th>User</th><th>Role</th><th>Branch</th>
              <th>Phone (+country)</th><th>CallMeBot Key</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td><strong>${u.id}</strong></td>
                <td><span class="role-pill role-${u.role||'User'}">${u.role||'User'}</span></td>
                <td style="font-size:11px;">${BRANCH_MAP[u.branch]||u.branch||'All'}</td>
                <td>
                  <input type="text" id="wa-phone-${u.id}"
                    value="${G.settings.callmebotPhones?.[u.id]||''}"
                    placeholder="+201234567890"
                    style="width:160px;padding:5px 9px;background:var(--surface2);
                           border:1px solid var(--border);border-radius:7px;
                           color:var(--text);font-size:11px;"/>
                </td>
                <td>
                  <input type="text" id="wa-key-${u.id}"
                    value="${G.settings.callmebotKeys?.[u.id]||''}"
                    placeholder="API Key"
                    style="width:120px;padding:5px 9px;background:var(--surface2);
                           border:1px solid var(--border);border-radius:7px;
                           color:var(--text);font-size:11px;"/>
                </td>
                <td>
                  ${G.settings.callmebotKeys?.[u.id] && G.settings.callmebotPhones?.[u.id]
                    ? '<span class="pill pill-active">✅ Configured</span>'
                    : '<span class="pill pill-draft">Not set</span>'}
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
        <div style="margin-top:11px;font-size:11px;color:var(--text3);">
          After filling in, click <strong>Save All Settings</strong>.
        </div>
      </div>`;

  } catch (e) {
    list.innerHTML = `
      <div class="empty-state"><p>Could not load: ${e.message}</p></div>`;
  }
};

// ============================================================
// MAINTENANCE TOOLS
// ============================================================
window.confirmBulkCloseOldOrders = function() {
  const cutoff     = new Date('2026-01-01');
  const candidates = (window.allOrders || []).filter(o => {
    if (o.closed === true || o['حالة الطلب'] === 'Closed') return false;
    const end = parseDBDate(o['نهاية التعاقد'] || '');
    return end && end < cutoff;
  });

  if (!candidates.length) { toast('No open pre-2026 orders found.', 'info'); return; }

  const html = `
    <p style="font-size:13px;margin-bottom:10px;">
      This will mark
      <strong style="color:var(--danger);">${candidates.length} order(s)</strong>
      before 1 Jan 2026 as <strong>Closed</strong>.
    </p>
    <p style="font-size:11px;color:var(--text3);margin-bottom:14px;">
      This cannot be undone automatically.
    </p>
    <div style="display:flex;gap:8px;">
      <button class="btn btn-sm" style="background:var(--danger);color:#fff;flex:1;"
        onclick="closeModal();bulkCloseOldOrders()">✅ Yes, Close All</button>
      <button class="btn btn-ghost btn-sm" style="flex:1;"
        onclick="closeModal()">Cancel</button>
    </div>`;
  openModal('⚡ Bulk Close Confirmation', html);
};

window.bulkCloseOldOrders = async function() {
  const statusEl   = document.getElementById('bulk-close-status');
  if (statusEl) statusEl.textContent = 'Running…';
  const cutoff     = new Date('2026-01-01');
  const candidates = (window.allOrders || []).filter(o => {
    if (o.closed === true || o['حالة الطلب'] === 'Closed') return false;
    const end = parseDBDate(o['نهاية التعاقد'] || '');
    return end && end < cutoff;
  });

  if (!candidates.length) {
    toast('No open pre-2026 orders found.', 'info');
    if (statusEl) statusEl.textContent = '';
    return;
  }

  let closed = 0, failed = 0;
  const BATCH_SIZE = 400;
  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = db.batch();
    candidates.slice(i, i + BATCH_SIZE).forEach(o => {
      batch.update(db.collection('bookings').doc(o.id), {
        'حالة الطلب': 'Closed',
        'closed'     : true,
        '_sys_updated': Date.now()
      });
    });
    try {
      await batch.commit();
      closed += Math.min(BATCH_SIZE, candidates.length - i);
    } catch (_) {
      failed += Math.min(BATCH_SIZE, candidates.length - i);
    }
  }

  await logAction('EDIT', 'Order Book', `Bulk-closed ${closed} pre-2026 orders`);
  const msg = `Bulk close: ${closed} closed${failed ? `, ${failed} failed` : ''}`;
  toast(msg, failed ? 'error' : 'success');
  if (statusEl) statusEl.textContent = msg;
  await loadSharedData();
};

window.reloadAllCaches = async function() {
  toast('Reloading all caches...', 'info', 2000);
  try {
    await loadSharedData();
    toast('✅ All caches reloaded!', 'success');
    loadSettingsPage();
    showSettingsTab('maintenance', document.getElementById('set-tab-maintenance'));
  } catch (e) {
    toast('Reload failed: ' + e.message, 'error');
  }
};
