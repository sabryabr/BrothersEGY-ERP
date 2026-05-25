// ============================================================
// modules/settings.js
// Settings — general config, user management, rate card,
// WhatsApp keys, penalties, bulk close old orders
// ============================================================

// ============================================================
// ENTRY POINT
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
      <button class="btn btn-success"
        onclick="saveAllSettings()">
        💾 Save All Settings
      </button>
    </div>

    <!-- Settings Tabs -->
    <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;">
      <button class="btn btn-ghost btn-sm settings-tab-btn"
        id="set-tab-general"
        style="border-color:var(--accent);color:var(--accent);"
        onclick="showSettingsTab('general',this)">
        ⚙️ General
      </button>
      <button class="btn btn-ghost btn-sm settings-tab-btn"
        id="set-tab-users"
        onclick="showSettingsTab('users',this)">
        👥 User Management
      </button>
      <button class="btn btn-ghost btn-sm settings-tab-btn"
        id="set-tab-rates"
        onclick="showSettingsTab('rates',this)">
        💲 Rate Card
      </button>
      <button class="btn btn-ghost btn-sm settings-tab-btn"
        id="set-tab-whatsapp"
        onclick="showSettingsTab('whatsapp',this)">
        📱 WhatsApp
      </button>
      <button class="btn btn-ghost btn-sm settings-tab-btn"
        id="set-tab-penalties"
        onclick="showSettingsTab('penalties',this)">
        ⚠️ Penalties
      </button>
      <button class="btn btn-ghost btn-sm settings-tab-btn"
        id="set-tab-maintenance"
        onclick="showSettingsTab('maintenance',this)">
        🔧 Maintenance
      </button>
    </div>

    <!-- General Settings -->
    <div id="set-pane-general">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">

        <div class="panel">
          <h3 style="font-size:13px;font-weight:800;margin-bottom:13px;">
            🕐 Shift Hours
          </h3>
          <p style="font-size:11px;color:var(--text3);margin-bottom:11px;">
            Defines the working day boundary. Tasks assigned on a given day
            expire at shift end.
          </p>
          <div class="form-grid">
            <div class="field">
              <label>Shift Start (Hour 0-23)</label>
              <input type="number" id="set-shift-start"
                value="${G.settings.shiftStart || 10}" min="0" max="23"/>
            </div>
            <div class="field">
              <label>Shift End (Hour 0-23)</label>
              <input type="number" id="set-shift-end"
                value="${G.settings.shiftEnd || 18}" min="0" max="23"/>
            </div>
          </div>
          <div style="margin-top:9px;padding:9px;background:var(--surface2);
            border-radius:8px;font-size:11px;color:var(--text3);">
            Current shift:
            <strong style="color:var(--text);">
              ${G.settings.shiftStart || 10}:00 →
              ${G.settings.shiftEnd || 18}:00
            </strong>
          </div>
        </div>

        <div class="panel">
          <h3 style="font-size:13px;font-weight:800;margin-bottom:13px;">
            💲 Discount Control
          </h3>
          <p style="font-size:11px;color:var(--text3);margin-bottom:11px;">
            Employees can offer discounts up to this percentage without Admin
            approval. Anything above triggers an automatic approval request.
          </p>
          <div class="field">
            <label>Max Discount % Without Approval</label>
            <input type="number" id="set-discount"
              value="${G.settings.discountThreshold || 5}"
              min="0" max="100" step="0.5"/>
          </div>
          <div style="margin-top:9px;padding:9px;
            background:rgba(245,158,11,0.08);
            border:1px solid rgba(245,158,11,0.25);
            border-radius:8px;font-size:11px;color:var(--warning);">
            ⚠️ Discounts above ${G.settings.discountThreshold || 5}%
            will auto-create an approval request
          </div>
        </div>

        <div class="panel">
          <h3 style="font-size:13px;font-weight:800;margin-bottom:13px;">
            🔒 Session & Security
          </h3>
          <div class="form-grid">
            <div class="field">
              <label>Session Timeout (minutes)</label>
              <input type="number" id="set-session-timeout"
                value="${G.settings.sessionTimeoutMins || 30}"
                min="5" max="480"/>
            </div>
            <div class="field">
              <label>Warning Before Timeout (minutes)</label>
              <input type="number" id="set-session-warn"
                value="${G.settings.sessionWarnMins || 25}"
                min="1" max="60"/>
            </div>
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
                value="${G.settings.proposalExpireDays || 14}"
                min="1" max="90"/>
            </div>
            <div class="field">
              <label>Max Proposals Per Car Simultaneously</label>
              <input type="number" id="set-max-proposals"
                value="${G.settings.maxProposalsPerCar || 1}"
                min="1" max="5"/>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- User Management -->
    <div id="set-pane-users" style="display:none;">
      <div style="display:flex;align-items:center;
        justify-content:space-between;margin-bottom:13px;">
        <h3 style="font-size:14px;font-weight:800;">👥 User Management</h3>
        <button class="btn btn-primary btn-sm"
          onclick="openCreateUserModal()">
          ➕ Create User
        </button>
      </div>
      <div id="users-list">
        <div class="empty-state"><div class="spinner"></div></div>
      </div>
    </div>

    <!-- Rate Card -->
    <div id="set-pane-rates" style="display:none;">
      <div style="display:flex;align-items:center;
        justify-content:space-between;margin-bottom:13px;">
        <h3 style="font-size:14px;font-weight:800;">💲 Rate Card</h3>
        <div style="font-size:11px;color:var(--text3);">
          Default daily rates per car model — auto-fills when selecting
          a car in contracts
        </div>
      </div>
      <div id="rate-card-content">
        <div class="empty-state"><div class="spinner"></div></div>
      </div>
    </div>

    <!-- WhatsApp -->
    <div id="set-pane-whatsapp" style="display:none;">
      <div style="margin-bottom:13px;padding:13px;
        background:rgba(34,197,94,0.08);
        border:1px solid rgba(34,197,94,0.25);
        border-radius:var(--radius);">
        <div style="font-size:12px;font-weight:700;
          color:var(--success);margin-bottom:7px;">
          📱 Setup WhatsApp Notifications via CallMeBot
        </div>
        <div style="font-size:11px;color:var(--text2);line-height:1.6;">
          1. Each employee sends
          <strong style="color:var(--accent);">
            "I allow callmebot to send me messages"
          </strong>
          to WhatsApp number <strong>+34 644 60 42 42</strong><br>
          2. They receive an API key back — enter it below<br>
          3. Save settings — they will now receive task assignments,
          approvals and alerts via WhatsApp
        </div>
      </div>
      <div id="whatsapp-keys-list">
        <div class="empty-state"><div class="spinner"></div></div>
      </div>
      <button class="btn btn-ghost btn-sm mt-8"
        onclick="loadWhatsAppKeys()">
        🔄 Reload Users
      </button>
    </div>

    <!-- Penalties -->
    <div id="set-pane-penalties" style="display:none;">
      <div class="panel" style="max-width:500px;">
        <h3 style="font-size:13px;font-weight:800;margin-bottom:5px;">
          ⚠️ Task Penalty Amounts (EGP)
        </h3>
        <p style="font-size:11px;color:var(--text3);margin-bottom:13px;">
          These amounts are automatically attached to tasks when created.
          They appear as pending deductions if the task is not completed
          by shift end.
        </p>
        <div class="form-grid">
          <div class="field">
            <label>Low Priority Penalty</label>
            <input type="number" id="set-pen-low"
              value="${G.settings.penaltyLow || 50}"/>
            <div style="font-size:10px;color:var(--text3);margin-top:3px;">
              e.g. Minor follow-up tasks
            </div>
          </div>
          <div class="field">
            <label>Medium Priority Penalty</label>
            <input type="number" id="set-pen-med"
              value="${G.settings.penaltyMedium || 100}"/>
            <div style="font-size:10px;color:var(--text3);margin-top:3px;">
              e.g. Standard assigned work
            </div>
          </div>
          <div class="field">
            <label>High Priority Penalty</label>
            <input type="number" id="set-pen-high"
              value="${G.settings.penaltyHigh || 200}"/>
            <div style="font-size:10px;color:var(--text3);margin-top:3px;">
              e.g. Urgent client issues
            </div>
          </div>
          <div class="field">
            <label>Urgent Priority Penalty</label>
            <input type="number" id="set-pen-urg"
              value="${G.settings.penaltyUrgent || 500}"/>
            <div style="font-size:10px;color:var(--text3);margin-top:3px;">
              e.g. Critical system failures
            </div>
          </div>
        </div>
        <div style="margin-top:13px;padding:9px;
          background:rgba(245,158,11,0.08);
          border:1px solid rgba(245,158,11,0.25);
          border-radius:8px;font-size:11px;color:var(--warning);">
          ⚠️ Penalty deductions are informational only.
          Actual payroll deductions must be processed separately.
        </div>
      </div>
    </div>

    <!-- Maintenance -->
    <div id="set-pane-maintenance" style="display:none;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">

        <div class="panel">
          <h3 style="font-size:13px;font-weight:800;margin-bottom:13px;">
            🗂️ Bulk Close Pre-2026 Orders
          </h3>
          <p style="font-size:11px;color:var(--text3);margin-bottom:11px;">
            Marks all open orders with a contract end date before
            1 January 2026 as Closed. Use this to clean up old data
            from the Google Sheets migration.
          </p>
          <div id="bulk-close-status"
            style="font-size:11px;color:var(--text3);
              margin-bottom:9px;min-height:14px;">
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
            Force a full refresh of fleet, bookings, customers and proposals
            from Firestore. Use if data appears stale.
          </p>
          <button class="btn btn-ghost"
            onclick="reloadAllCaches()">
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

    <!-- Save button at bottom -->
    <div style="margin-top:18px;padding-top:14px;border-top:1px solid var(--border);">
      <button class="btn btn-success" onclick="saveAllSettings()">
        💾 Save All Settings
      </button>
      <span style="font-size:11px;color:var(--text3);margin-left:11px;">
        Changes are saved to Firestore immediately
      </span>
    </div>`;

  showSettingsTab('general', document.getElementById('set-tab-general'));
};

// ============================================================
// TAB MANAGER
// ============================================================

window.showSettingsTab = function(tab, btn) {
  ['general','users','rates','whatsapp','penalties','maintenance'].forEach(t => {
    const p = document.getElementById(`set-pane-${t}`);
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
  const pane = document.getElementById(`set-pane-${tab}`);
  if (pane) pane.style.display = 'block';

  if (tab === 'users')    loadUserManagement();
  else if (tab === 'rates')     loadRateCard();
  else if (tab === 'whatsapp')  loadWhatsAppKeys();
};

// ============================================================
// SAVE ALL SETTINGS
// ============================================================

window.saveAllSettings = async function() {
  if (!confirm('Save all settings? This will affect the entire system.')) return;

  try {
    const phones = {}, keys = {};
    (window._settingsUsers || []).forEach(u => {
      const phone = document.getElementById(`wa-phone-${u.id}`)?.value.trim();
      const key   = document.getElementById(`wa-key-${u.id}`)?.value.trim();
      if (phone) phones[u.id] = phone;
      if (key)   keys[u.id]   = key;
    });

    const newSettings = {
      shiftStart:          parseInt(document.getElementById('set-shift-start')?.value  || 10),
      shiftEnd:            parseInt(document.getElementById('set-shift-end')?.value    || 18),
      discountThreshold:   parseFloat(document.getElementById('set-discount')?.value   || 5),
      sessionTimeoutMins:  parseInt(document.getElementById('set-session-timeout')?.value || 30),
      sessionWarnMins:     parseInt(document.getElementById('set-session-warn')?.value || 25),
      proposalExpireDays:  parseInt(document.getElementById('set-proposal-expire')?.value || 14),
      maxProposalsPerCar:  parseInt(document.getElementById('set-max-proposals')?.value || 1),
      penaltyLow:          parseFloat(document.getElementById('set-pen-low')?.value    || 50),
      penaltyMedium:       parseFloat(document.getElementById('set-pen-med')?.value    || 100),
      penaltyHigh:         parseFloat(document.getElementById('set-pen-high')?.value   || 200),
      penaltyUrgent:       parseFloat(document.getElementById('set-pen-urg')?.value    || 500),
      callmebotPhones:     phones,
      callmebotKeys:       keys
    };

    // Include rate card if it was loaded
    const rateCardData = window._rateCardData || {};
    if (Object.keys(rateCardData).length > 0) {
      newSettings.rateCard = rateCardData;
    }

    await db.collection('settings').doc('main').set(newSettings, { merge: true });
    G.settings = { ...G.settings, ...newSettings };

    await logAction('EDIT', 'Settings', 'System settings updated');
    toast('All settings saved successfully!', 'success');

  } catch (e) {
    toast('Save failed: ' + e.message, 'error');
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
    const snap = await db.collection('users').get();
    const users = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a,b) => {
        const order = { Admin:0, Executive:1, User:2 };
        return (order[a.role] || 3) - (order[b.role] || 3);
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
                <th>Access Modules</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(u => `
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:7px;">
                      <div style="width:26px;height:26px;border-radius:7px;
                        flex-shrink:0;
                        background:linear-gradient(135deg,var(--accent),var(--accent2));
                        display:flex;align-items:center;justify-content:center;
                        font-size:10px;font-weight:800;color:#fff;">
                        ${initials(u.id).toUpperCase()}
                      </div>
                      <strong>${u.id}</strong>
                    </div>
                  </td>
                  <td>
                    <span class="role-pill role-${u.role}">
                      ${u.role || 'User'}
                    </span>
                  </td>
                  <td style="font-size:11px;">
                    ${BRANCH_MAP[u.branch] || u.branch || 'All'}
                  </td>
                  <td style="font-size:10px;">
                    ${u.role === 'Admin' || u.role === 'Executive'
                      ? '<span style="color:var(--success);">All Access</span>'
                      : (u.access && u.access.length
                          ? u.access.sort((a,b) => a-b)
                            .map(n => `<span class="pill pill-accepted"
                              style="margin:1px;">${n}</span>`)
                            .join('')
                          : '<span style="color:var(--text3);">None</span>')}
                  </td>
                  <td>
                    <div style="display:flex;gap:3px;">
                      <button class="btn btn-warning btn-xs"
                        onclick="openEditUserModal('${u.id}')">
                        ✏️ Edit
                      </button>
                      ${u.id !== G.user?.username ? `
                        <button class="btn btn-danger btn-xs"
                          onclick="confirmDeleteUser('${u.id}')">
                          🗑️
                        </button>` : ''}
                    </div>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;

  } catch (e) {
    list.innerHTML = `
      <div class="empty-state">
        <p>Could not load users: ${e.message}</p>
      </div>`;
  }
};

window.openCreateUserModal = function() {
  const html = `
    <div style="font-size:11px;color:var(--text3);margin-bottom:13px;">
      Create a new portal account. The username becomes the Firestore document ID.
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
      <div class="field" style="grid-column:1/-1;">
        <label>Module Access (for User role)</label>
        <div style="display:flex;gap:11px;flex-wrap:wrap;margin-top:7px;">
          ${[
            { n:1, label:'Proposals' },
            { n:2, label:'EN Contract' },
            { n:3, label:'AR Contract' },
            { n:4, label:'Receipts' },
            { n:5, label:'Income & Expenses' }
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
      <button class="btn btn-success" onclick="saveNewUser()">
        💾 Create User
      </button>
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    </div>`;

  openModal('👤 Create New User', html);
};

window.saveNewUser = async function() {
  const username = document.getElementById('new-username')?.value
    .trim().toLowerCase().replace(/\s+/g,'_');
  const password = document.getElementById('new-password')?.value;
  const role     = document.getElementById('new-role')?.value     || 'User';
  const branch   = document.getElementById('new-branch')?.value   || 'HRG';

  if (!username) { toast('Username is required', 'error'); return; }
  if (!password || password.length < 6) {
    toast('Password must be at least 6 characters', 'error'); return;
  }

  const access = [];
  [1,2,3,4,5].forEach(n => {
    if (document.getElementById(`new-access-${n}`)?.checked) access.push(n);
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
      access: (role === 'Admin' || role === 'Executive') ? [1,2,3,4,5] : access,
      created_at: Date.now(),
      created_by: G.user.username
    });

    await logAction('ADD', 'Settings',
      `New user created: ${username} | Role: ${role} | Branch: ${branch}`);

    toast(`User "${username}" created!`, 'success');
    closeModal();
    loadUserManagement();

  } catch (e) {
    toast('Failed to create user: ' + e.message, 'error');
  }
};

window.openEditUserModal = async function(userId) {
  try {
    const snap = await db.collection('users').doc(userId).get();
    if (!snap.exists) { toast('User not found', 'error'); return; }
    const u = snap.data();

    const html = `
      <div style="font-size:11px;color:var(--accent);
        font-weight:700;margin-bottom:11px;">
        Editing: ${userId}
      </div>
      <div class="form-grid">
        <div class="field">
          <label>New Password (leave blank to keep)</label>
          <input type="password" id="edit-user-password"
            placeholder="Leave blank to keep current"/>
        </div>
        <div class="field">
          <label>Role</label>
          <select id="edit-user-role">
            <option value="User"      ${u.role==='User'      ? 'selected':''}>User</option>
            <option value="Executive" ${u.role==='Executive' ? 'selected':''}>Executive</option>
            <option value="Admin"     ${u.role==='Admin'     ? 'selected':''}>Admin</option>
          </select>
        </div>
        <div class="field">
          <label>Branch</label>
          <select id="edit-user-branch">
            <option value="HRG" ${u.branch==='HRG' ? 'selected':''}>Hurghada</option>
            <option value="ALX" ${u.branch==='ALX' ? 'selected':''}>Alexandria</option>
            <option value="CAI" ${u.branch==='CAI' ? 'selected':''}>Cairo</option>
            <option value="RSH" ${u.branch==='RSH' ? 'selected':''}>Rashid</option>
          </select>
        </div>
        <div class="field" style="grid-column:1/-1;">
          <label>Module Access</label>
          <div style="display:flex;gap:11px;flex-wrap:wrap;margin-top:7px;">
            ${[
              { n:1, label:'Proposals' },
              { n:2, label:'EN Contract' },
              { n:3, label:'AR Contract' },
              { n:4, label:'Receipts' },
              { n:5, label:'Income & Expenses' }
            ].map(m => `
              <label style="display:flex;align-items:center;gap:5px;
                font-size:11px;cursor:pointer;">
                <input type="checkbox" id="edit-access-${m.n}"
                  value="${m.n}"
                  ${(u.access || []).includes(m.n) ? 'checked' : ''}
                  style="width:14px;height:14px;"/>
                ${m.n}. ${m.label}
              </label>`).join('')}
          </div>
        </div>
      </div>
      <div style="display:flex;gap:7px;margin-top:13px;">
        <button class="btn btn-success"
          onclick="saveUserEdit('${userId}')">
          💾 Save Changes
        </button>
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      </div>`;

    openModal(`✏️ Edit User — ${userId}`, html);

  } catch (e) {
    toast('Could not load user: ' + e.message, 'error');
  }
};

window.saveUserEdit = async function(userId) {
  try {
    const newPassword = document.getElementById('edit-user-password')?.value;
    const role        = document.getElementById('edit-user-role')?.value   || 'User';
    const branch      = document.getElementById('edit-user-branch')?.value || 'HRG';
    const access      = [];

    [1,2,3,4,5].forEach(n => {
      if (document.getElementById(`edit-access-${n}`)?.checked) access.push(n);
    });

    if (newPassword && newPassword.length > 0 && newPassword.length < 6) {
      toast('Password must be at least 6 characters', 'error'); return;
    }

    const upd = {
      role,
      branch,
      access: (role === 'Admin' || role === 'Executive') ? [1,2,3,4,5] : access,
      updated_at: Date.now(),
      updated_by: G.user.username
    };
    if (newPassword && newPassword.length >= 6) upd.password = newPassword;

    await db.collection('users').doc(userId).update(upd);
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
// RATE CARD
// ============================================================

window.loadRateCard = async function() {
  const content = document.getElementById('rate-card-content');
  if (!content) return;
  content.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';

  try {
    const snap    = await db.collection('settings').doc('main').get();
    const existing= snap.exists ? snap.data().rateCard || {} : {};
    window._rateCardData = existing;

    const models = [...new Set(
      G.fleet.map(c => c.model || c.Type || c['النوع'] || '').filter(Boolean)
    )].sort();

    if (!models.length) {
      content.innerHTML = `
        <div class="empty-state">
          <p>No car models found in fleet. Add cars first.</p>
        </div>`;
      return;
    }

    content.innerHTML = `
      <div class="panel" style="max-width:700px;">
        <div style="display:flex;align-items:center;
          justify-content:space-between;margin-bottom:13px;">
          <h3 style="font-size:13px;font-weight:800;">
            💲 Standard Daily Rates Per Car Model
          </h3>
          <button class="btn btn-success btn-sm"
            onclick="saveRateCard()">
            💾 Save Rates
          </button>
        </div>
        <p style="font-size:11px;color:var(--text3);margin-bottom:13px;">
          These rates auto-fill the Daily Rent field when an employee
          selects a car in contracts or proposals.
          Leave blank to not pre-fill.
        </p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;">
          ${models.map(model => {
            const currentRate = existing[model] || '';
            const carCount    = G.fleet.filter(c =>
              (c.model || c.Type || c['النوع'] || '') === model
            ).length;
            return `
              <div class="field">
                <label>
                  ${model}
                  <span style="color:var(--text3);font-weight:400;">
                    (${carCount} car${carCount !== 1 ? 's' : ''})
                  </span>
                </label>
                <div style="display:flex;gap:7px;align-items:center;">
                  <span style="color:var(--text3);font-size:13px;">£</span>
                  <input type="number"
                    id="rate-${model.replace(/\s+/g,'_')}"
                    value="${currentRate}"
                    placeholder="e.g. 500"
                    style="flex:1;"
                    oninput="window._rateCardData['${model}']=
                      this.value ? parseFloat(this.value) : ''"/>
                  <span style="font-size:10px;color:var(--text3);">EGP/day</span>
                </div>
              </div>`;
          }).join('')}
        </div>
        <div style="margin-top:13px;padding:9px;
          background:rgba(59,130,246,0.08);
          border:1px solid rgba(59,130,246,0.2);
          border-radius:8px;font-size:11px;color:var(--text2);">
          ℹ️ Rate Card data is stored in the
          <code>settings</code> document and loaded fresh each time
          a contract or proposal is opened.
        </div>
      </div>`;

  } catch (e) {
    content.innerHTML = `
      <div class="empty-state">
        <p>Could not load rate card: ${e.message}</p>
      </div>`;
  }
};

window.saveRateCard = async function() {
  try {
    const rateCard = {};
    G.fleet.forEach(c => {
      const model = c.model || c.Type || c['النوع'] || '';
      if (!model) return;
      const input = document.getElementById(
        `rate-${model.replace(/\s+/g,'_')}`
      );
      if (input && input.value) rateCard[model] = parseFloat(input.value) || 0;
    });

    window._rateCardData = rateCard;
    await db.collection('settings').doc('main').set(
      { rateCard }, { merge: true }
    );
    G.settings.rateCard = rateCard;

    await logAction('EDIT', 'Settings',
      `Rate card updated: ${Object.keys(rateCard).length} models`);
    toast('Rate card saved!', 'success');

  } catch (e) {
    toast('Save failed: ' + e.message, 'error');
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
    const users = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a,b) => a.id.localeCompare(b.id));

    window._settingsUsers = users;

    list.innerHTML = `
      <div class="panel">
        <table class="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Branch</th>
              <th>Phone (with +country code)</th>
              <th>CallMeBot API Key</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td><strong>${u.id}</strong></td>
                <td>
                  <span class="role-pill role-${u.role || 'User'}">
                    ${u.role || 'User'}
                  </span>
                </td>
                <td style="font-size:11px;">
                  ${BRANCH_MAP[u.branch] || u.branch || 'All'}
                </td>
                <td>
                  <input type="text" id="wa-phone-${u.id}"
                    value="${G.settings.callmebotPhones?.[u.id] || ''}"
                    placeholder="+201234567890"
                    style="width:160px;padding:5px 9px;
                      background:var(--surface2);
                      border:1px solid var(--border);
                      border-radius:7px;color:var(--text);font-size:11px;"/>
                </td>
                <td>
                  <input type="text" id="wa-key-${u.id}"
                    value="${G.settings.callmebotKeys?.[u.id] || ''}"
                    placeholder="API Key"
                    style="width:120px;padding:5px 9px;
                      background:var(--surface2);
                      border:1px solid var(--border);
                      border-radius:7px;color:var(--text);font-size:11px;"/>
                </td>
                <td>
                  ${G.settings.callmebotKeys?.[u.id] &&
                    G.settings.callmebotPhones?.[u.id]
                    ? '<span class="pill pill-active">✅ Configured</span>'
                    : '<span class="pill pill-draft">Not set</span>'}
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
        <div style="margin-top:11px;font-size:11px;color:var(--text3);">
          After filling in phone and key, click
          <strong>Save All Settings</strong> at the bottom.
        </div>
      </div>`;

  } catch (e) {
    list.innerHTML = `
      <div class="empty-state">
        <p>Could not load users: ${e.message}</p>
      </div>`;
  }
};

// ============================================================
// MAINTENANCE TOOLS
// ============================================================

window.confirmBulkCloseOldOrders = function() {
  const cutoff     = new Date('2026-01-01');
  const candidates = allOrders.filter(o => {
    if (o.closed === true || o['حالة الطلب'] === 'Closed') return false;
    const end = parseDBDate(o['نهاية التعاقد'] || '');
    return end && end < cutoff;
  });

  if (!candidates.length) {
    toast('No open pre-2026 orders found.', 'info'); return;
  }

  const html = `
    <p style="font-size:13px;margin-bottom:10px;">
      This will mark
      <strong style="color:var(--danger);">
        ${candidates.length} order(s)
      </strong>
      with a contract end date before 1 Jan 2026 as
      <strong>Closed</strong>.
    </p>
    <p style="font-size:11px;color:var(--text3);margin-bottom:14px;">
      This cannot be undone automatically. Proceed?
    </p>
    <div style="display:flex;gap:8px;">
      <button class="btn btn-sm"
        style="background:var(--danger);color:#fff;flex:1;"
        onclick="closeModal();bulkCloseOldOrders()">
        ✅ Yes, Close All
      </button>
      <button class="btn btn-ghost btn-sm"
        style="flex:1;" onclick="closeModal()">Cancel</button>
    </div>`;

  openModal('⚡ Bulk Close Confirmation', html);
};

window.bulkCloseOldOrders = async function() {
  const statusEl  = document.getElementById('bulk-close-status');
  if (statusEl) statusEl.textContent = 'Running…';

  const cutoff     = new Date('2026-01-01');
  const candidates = allOrders.filter(o => {
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
        'closed':      true,
        '_sys_updated': Date.now()
      });
    });
    try {
      await batch.commit();
      closed += Math.min(BATCH_SIZE, candidates.length - i);
    } catch (e) {
      failed += Math.min(BATCH_SIZE, candidates.length - i);
    }
  }

  await logAction('EDIT', 'Order Book',
    `Bulk-closed ${closed} pre-2026 orders`);

  const msg = `Bulk close complete: ${closed} closed${failed ? `, ${failed} failed` : ''}`;
  toast(msg, failed ? 'error' : 'success');
  if (statusEl) statusEl.textContent = msg;

  // Reload caches
  await loadSharedData();
};

window.reloadAllCaches = async function() {
  toast('Reloading all caches...', 'info', 2000);
  try {
    await loadSharedData();
    toast('✅ All caches reloaded!', 'success');
    // Refresh stats in the maintenance tab
    loadSettingsPage();
    showSettingsTab(
      'maintenance',
      document.getElementById('set-tab-maintenance')
    );
  } catch (e) {
    toast('Reload failed: ' + e.message, 'error');
  }
};
