// ============================================================
// modules/tasks.js  v3.0
// Smart task system with:
// - Dynamic user list from Firestore
// - Tag anything: order, car, client, payment
// - Quick-create from any page
// - Penalty system
// - Status tracking with timestamps
// ============================================================

// ── Task type config ──────────────────────────────────────────
const TASK_TYPES = {
  rental     : { icon:'🚗', label:'Rental Task',     color:'var(--accent)'   },
  admin      : { icon:'📋', label:'Admin Task',      color:'var(--text3)'    },
  maintenance: { icon:'🔧', label:'Maintenance',     color:'var(--warning)'  },
  followup   : { icon:'📞', label:'Follow-up',       color:'var(--success)'  },
  payment    : { icon:'💰', label:'Payment Task',    color:'var(--success)'  },
  pickup     : { icon:'📤', label:'Pickup',          color:'#8b5cf6'         },
  dropoff    : { icon:'📥', label:'Dropoff',         color:'#06b6d4'         },
  inspection : { icon:'🔍', label:'Inspection',      color:'var(--warning)'  },
  general    : { icon:'📌', label:'General',         color:'var(--text2)'    }
};

const PRIORITY_CONFIG = {
  low    : { label:'Low',    color:'var(--success)', penalty:50  },
  medium : { label:'Medium', color:'var(--warning)', penalty:100 },
  high   : { label:'High',   color:'var(--danger)',  penalty:200 },
  urgent : { label:'Urgent', color:'#dc2626',        penalty:500 }
};

// ============================================================
// ENTRY POINT
// ============================================================
window.renderTaskManager = function() {
  renderPageLoading('page-tasks', '✅', 'Task Manager');
  loadTaskManager();
};

window.loadTaskManager = async function() {
  const el = document.getElementById('page-tasks');
  if (!el) return;

  // Load users in background
  loadSystemUsers();

  // Collapsible header state
  const hKey      = 'tasks_header_collapsed';
  const collapsed = localStorage.getItem(hKey) === 'true';

  el.innerHTML = `
    <!-- Collapsible Header -->
    <div style="background:var(--surface2);border:1px solid var(--border);
                border-radius:var(--radius);margin-bottom:12px;overflow:hidden;">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;
                  padding:10px 14px;">
        <div style="flex:1;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <h2 style="margin:0;font-size:16px;font-weight:800;">✅ Task Manager</h2>
            <span style="color:var(--text3);font-size:11px;">
              Assign, track and close tasks across the team
            </span>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;"
             onclick="event.stopPropagation()">
          <button class="btn btn-primary btn-sm"
            onclick="openCreateTaskModal()">➕ New Task</button>
          <button class="btn btn-ghost btn-sm"
            onclick="loadTaskManager()">🔄 Refresh</button>
          <button id="tasks-toggle-btn"
            onclick="toggleTasksHeader()"
            style="background:var(--surface);border:1px solid var(--border);
                   border-radius:6px;padding:3px 8px;cursor:pointer;
                   color:var(--text3);font-size:11px;">
            ${collapsed ? '▼ Show' : '▲ Hide'}
          </button>
        </div>
      </div>

      <!-- Collapsible filters -->
      <div id="tasks-header-collapsible"
        style="overflow:hidden;transition:max-height 0.3s ease;
               max-height:${collapsed ? '0px' : '200px'};">
        <div style="padding:0 14px 12px;">
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;">
            <div>
              <div style="font-size:10px;font-weight:700;color:var(--text3);
                          margin-bottom:3px;">STATUS</div>
              <select id="task-filter-status" onchange="renderTaskList()"
                style="padding:6px 10px;background:var(--surface);
                       border:1px solid var(--border);border-radius:8px;
                       color:var(--text);font-size:11px;">
                <option value="all">All</option>
                <option value="pending"    selected>Pending</option>
                <option value="inprogress">In Progress</option>
                <option value="done">Done</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            <div>
              <div style="font-size:10px;font-weight:700;color:var(--text3);
                          margin-bottom:3px;">TYPE</div>
              <select id="task-filter-type" onchange="renderTaskList()"
                style="padding:6px 10px;background:var(--surface);
                       border:1px solid var(--border);border-radius:8px;
                       color:var(--text);font-size:11px;">
                <option value="all">All Types</option>
                ${Object.entries(TASK_TYPES).map(([k,v]) =>
                  `<option value="${k}">${v.icon} ${v.label}</option>`
                ).join('')}
              </select>
            </div>
            <div>
              <div style="font-size:10px;font-weight:700;color:var(--text3);
                          margin-bottom:3px;">ASSIGNED TO</div>
              <select id="task-filter-user" onchange="renderTaskList()"
                style="padding:6px 10px;background:var(--surface);
                       border:1px solid var(--border);border-radius:8px;
                       color:var(--text);font-size:11px;">
                <option value="all">All Users</option>
                <option value="${G.user?.username}"
                  ${['Admin','Executive'].includes(G.user?.role) ? '' : 'selected'}>
                  Me (${G.user?.username})
                </option>
              </select>
            </div>
            <div>
              <div style="font-size:10px;font-weight:700;color:var(--text3);
                          margin-bottom:3px;">PRIORITY</div>
              <select id="task-filter-priority" onchange="renderTaskList()"
                style="padding:6px 10px;background:var(--surface);
                       border:1px solid var(--border);border-radius:8px;
                       color:var(--text);font-size:11px;">
                <option value="all">All Priorities</option>
                ${Object.entries(PRIORITY_CONFIG).map(([k,v]) =>
                  `<option value="${k}">${v.label}</option>`
                ).join('')}
              </select>
            </div>
            <div style="flex:1;min-width:160px;">
              <div style="font-size:10px;font-weight:700;color:var(--text3);
                          margin-bottom:3px;">SEARCH</div>
              <input type="text" id="task-search"
                placeholder="Search tasks..."
                oninput="renderTaskList()"
                style="width:100%;padding:6px 10px;background:var(--surface);
                       border:1px solid var(--border);border-radius:8px;
                       color:var(--text);font-size:11px;"/>
            </div>
            <button class="btn btn-ghost btn-sm"
              onclick="clearTaskFilters()">✕ Clear</button>
          </div>
        </div>
      </div>
    </div>

    <!-- KPI Summary bar -->
    <div id="task-kpi-bar"
      style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;"></div>

    <!-- Task list -->
    <div id="task-list">
      <div class="empty-state"><div class="spinner lg"></div></div>
    </div>
  `;

  window.toggleTasksHeader = function() {
    const body = document.getElementById('tasks-header-collapsible');
    const btn  = document.getElementById('tasks-toggle-btn');
    if (!body) return;
    const isNowCollapsed = body.style.maxHeight !== '0px';
    body.style.maxHeight = isNowCollapsed ? '0px' : '200px';
    if (btn) btn.textContent = isNowCollapsed ? '▼ Show' : '▲ Hide';
    localStorage.setItem(hKey, isNowCollapsed ? 'true' : 'false');
  };

  subscribeTaskList();
};

// ============================================================
// TASK SUBSCRIPTION
// ============================================================
let _taskUnsub = null;
window._allTasks = [];

window.subscribeTaskList = function() {
  if (_taskUnsub) { _taskUnsub(); _taskUnsub = null; }

  const isPriv = ['Admin','Executive'].includes(G.user?.role);
  const query  = isPriv
    ? db.collection('tasks').orderBy('created_at','desc').limit(500)
    : db.collection('tasks')
        .where('assigned_to','==', G.user?.username || '')
        .orderBy('created_at','desc').limit(200);

  _taskUnsub = query.onSnapshot(snap => {
    window._allTasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderTaskList();
    renderTaskKPIBar();

    // Also update user dropdown
    _populateUserFilterDropdown();
  }, e => console.warn('Task subscription error:', e.message));

  G.unsubscribers.push(_taskUnsub);
};

function _populateUserFilterDropdown() {
  const sel = document.getElementById('task-filter-user');
  if (!sel || window.G_USERS.length === 0) return;
  const cur = sel.value;
  sel.innerHTML = `
    <option value="all">All Users</option>
    <option value="${G.user?.username}">Me (${G.user?.username})</option>
    ${window.G_USERS
      .filter(u => u.username !== G.user?.username)
      .map(u => `<option value="${u.username}"
        ${u.username === cur ? 'selected' : ''}>${u.username}</option>`)
      .join('')}
  `;
}

// ============================================================
// RENDER TASK KPI BAR
// ============================================================
window.renderTaskKPIBar = function() {
  const bar = document.getElementById('task-kpi-bar');
  if (!bar) return;
  const today    = getCairoNow();
  const tasks    = window._allTasks || [];
  const pending  = tasks.filter(t => t.status === 'pending').length;
  const inprog   = tasks.filter(t => t.status === 'inprogress').length;
  const done     = tasks.filter(t => t.status === 'done').length;
  const overdue  = tasks.filter(t => {
    if (t.status === 'done') return false;
    return t.due_date && new Date(t.due_date) < today;
  }).length;
  const totalPenalty = tasks
    .filter(t => t.status === 'done' && t.penalty_applied)
    .reduce((s,t) => s + (t.penalty_amount || 0), 0);

  const kpis = [
    { label:'Pending',     value:pending,  color:'var(--accent)',   click:"setTaskFilter('pending')"   },
    { label:'In Progress', value:inprog,   color:'#8b5cf6',         click:"setTaskFilter('inprogress')" },
    { label:'Done',        value:done,     color:'var(--success)',  click:"setTaskFilter('done')"      },
    { label:'Overdue',     value:overdue,  color:'var(--danger)',   click:"setTaskFilter('overdue')"   },
    { label:'Penalties',   value:fmtMoney(totalPenalty), color:'var(--warning)', click:'' }
  ];

  bar.innerHTML = kpis.map(k => `
    <div style="background:var(--surface2);border:1px solid var(--border);
                border-radius:10px;padding:8px 14px;text-align:center;
                min-width:100px;cursor:${k.click?'pointer':'default'};"
         ${k.click ? `onclick="${k.click}"` : ''}>
      <div style="font-size:10px;font-weight:700;color:var(--text3);
                  margin-bottom:3px;">${k.label}</div>
      <div style="font-size:18px;font-weight:900;color:${k.color};">
        ${k.value}
      </div>
    </div>`).join('');
};

window.setTaskFilter = function(status) {
  const sel = document.getElementById('task-filter-status');
  if (sel) sel.value = status;
  renderTaskList();
};

window.clearTaskFilters = function() {
  ['task-filter-status','task-filter-type','task-filter-priority'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = 'all';
  });
  const s = document.getElementById('task-search');
  if (s) s.value = '';
  renderTaskList();
};

// ============================================================
// RENDER TASK LIST
// ============================================================
window.renderTaskList = function() {
  const listEl    = document.getElementById('task-list');
  if (!listEl) return;

  const today     = getCairoNow();
  const statusF   = document.getElementById('task-filter-status')?.value  || 'all';
  const typeF     = document.getElementById('task-filter-type')?.value    || 'all';
  const userF     = document.getElementById('task-filter-user')?.value    || 'all';
  const priorityF = document.getElementById('task-filter-priority')?.value|| 'all';
  const searchF   = (document.getElementById('task-search')?.value || '').toLowerCase().trim();

  let tasks = [...(window._allTasks || [])];

  tasks = tasks.filter(t => {
    // Status filter
    if (statusF === 'overdue') {
      if (t.status === 'done') return false;
      return t.due_date && new Date(t.due_date) < today;
    }
    if (statusF !== 'all' && t.status !== statusF) return false;

    // Type filter
    if (typeF !== 'all' && t.type !== typeF) return false;

    // User filter
    if (userF !== 'all' && t.assigned_to !== userF) return false;

    // Priority filter
    if (priorityF !== 'all' && t.priority !== priorityF) return false;

    // Search
    if (searchF) {
      const hay = [
        t.title, t.description, t.assigned_to,
        t.linked_order_no, t.linked_car_label,
        t.linked_client_name, t.type, t.created_by
      ].join(' ').toLowerCase();
      if (!hay.includes(searchF)) return false;
    }

    return true;
  });

  // Sort: overdue first, then by due date, then by priority weight
  const priorityWeight = { urgent:4, high:3, medium:2, low:1 };
  tasks.sort((a, b) => {
    const aOD = a.due_date && new Date(a.due_date) < today && a.status !== 'done';
    const bOD = b.due_date && new Date(b.due_date) < today && b.status !== 'done';
    if (aOD && !bOD) return -1;
    if (!aOD && bOD) return 1;
    if (a.due_date && b.due_date) return new Date(a.due_date) - new Date(b.due_date);
    return (priorityWeight[b.priority]||0) - (priorityWeight[a.priority]||0);
  });

  if (!tasks.length) {
    listEl.innerHTML = `
      <div class="empty-state" style="padding:60px 20px;">
        <div style="font-size:40px;margin-bottom:12px;">✅</div>
        <p style="font-size:14px;color:var(--text3);">No tasks match your filters</p>
        <button class="btn btn-primary btn-sm" style="margin-top:12px;"
          onclick="openCreateTaskModal()">➕ Create First Task</button>
      </div>`;
    return;
  }

  listEl.innerHTML = `
    <div style="display:grid;gap:8px;">
      ${tasks.map(t => _buildTaskCard(t, today)).join('')}
    </div>`;
};

function _buildTaskCard(t, today) {
  const tc      = TASK_TYPES[t.type]    || TASK_TYPES.general;
  const pc      = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.medium;
  const due     = t.due_date ? new Date(t.due_date) : null;
  const isOD    = due && today > due && t.status !== 'done';
  const isDone  = t.status === 'done';
  const isPriv  = ['Admin','Executive'].includes(G.user?.role);
  const isOwn   = t.assigned_to === G.user?.username || t.created_by === G.user?.username;

  const statusColors = {
    pending   : 'var(--accent)',
    inprogress: '#8b5cf6',
    done      : 'var(--success)',
    cancelled : 'var(--text3)'
  };
  const statusColor = isOD ? 'var(--danger)' : (statusColors[t.status] || 'var(--text3)');

  const rowBg = isOD  ? 'rgba(239,68,68,0.06)'  :
                isDone ? 'rgba(34,197,94,0.04)'  : 'var(--surface2)';

  return `
    <div style="background:${rowBg};border:1px solid ${isOD
        ? 'rgba(239,68,68,0.3)' : 'var(--border)'};
                border-radius:10px;padding:12px 14px;transition:all 0.2s;"
         onmouseover="this.style.borderColor='var(--accent)'"
         onmouseout="this.style.borderColor='${isOD
           ? 'rgba(239,68,68,0.3)' : 'var(--border)'}'">

      <!-- Header row -->
      <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;">

        <!-- Type icon -->
        <div style="width:32px;height:32px;border-radius:8px;flex-shrink:0;
                    background:${tc.color}22;display:flex;align-items:center;
                    justify-content:center;font-size:16px;">
          ${tc.icon}
        </div>

        <!-- Title + badges -->
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <span style="font-size:13px;font-weight:700;
                         ${isDone ? 'text-decoration:line-through;opacity:0.6;' : ''}">
              ${t.title || 'Untitled Task'}
            </span>
            <!-- Priority badge -->
            <span style="padding:2px 7px;border-radius:99px;font-size:9px;
                         font-weight:800;background:${pc.color}22;
                         color:${pc.color};border:1px solid ${pc.color}44;">
              ${pc.label}
              ${pc.penalty ? `• £${pc.penalty}` : ''}
            </span>
            <!-- Status badge -->
            <span style="padding:2px 7px;border-radius:99px;font-size:9px;
                         font-weight:800;background:${statusColor}22;
                         color:${statusColor};border:1px solid ${statusColor}44;">
              ${isOD ? '⚠️ OVERDUE' : t.status?.toUpperCase() || 'PENDING'}
            </span>
          </div>

          <!-- Assigned info -->
          <div style="font-size:11px;color:var(--text3);margin-top:3px;">
            👤 <strong>${t.assigned_to || '—'}</strong>
            ${t.created_by && t.created_by !== t.assigned_to
              ? ` • by ${t.created_by}` : ''}
            ${t.branch
              ? ` • ${BRANCH_MAP[t.branch] || t.branch}` : ''}
          </div>
        </div>

        <!-- Due date -->
        <div style="text-align:right;flex-shrink:0;">
          ${due ? `
            <div style="font-size:11px;font-weight:700;
                        color:${isOD ? 'var(--danger)' : 'var(--text3)'};">
              ${isOD ? '⚠️ ' : '📅 '}
              ${due.toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}
            </div>
            <div style="font-size:9px;color:var(--text3);">
              ${isOD
                ? Math.abs(Math.ceil((today-due)/86400000)) + 'd overdue'
                : Math.ceil((due-today)/86400000) + 'd left'}
            </div>
          ` : '<div style="font-size:10px;color:var(--text3);">No deadline</div>'}
        </div>
      </div>

      <!-- Description -->
      ${t.description ? `
        <div style="font-size:11px;color:var(--text2);margin-bottom:8px;
                    background:var(--surface);border-radius:6px;padding:6px 8px;">
          ${t.description}
        </div>` : ''}

      <!-- Links row -->
      ${(t.linked_order_id || t.linked_car_id || t.linked_client_id) ? `
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
          ${t.linked_order_id ? `
            <button class="btn btn-ghost btn-xs"
              onclick="openOrderDetail('${t.linked_order_id}')">
              📋 Order #${t.linked_order_no || t.linked_order_id}
            </button>` : ''}
          ${t.linked_car_id ? `
            <button class="btn btn-ghost btn-xs"
              onclick="openCarDetailModal('${t.linked_car_id}')">
              🚗 ${t.linked_car_label || t.linked_car_id}
            </button>` : ''}
          ${t.linked_client_id ? `
            <button class="btn btn-ghost btn-xs"
              onclick="openClientProfile('${t.linked_client_id}')">
              👤 ${t.linked_client_name || t.linked_client_id}
            </button>` : ''}
        </div>` : ''}

      <!-- Tags -->
      ${t.tags && t.tags.length ? `
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;">
          ${t.tags.map(tag => `
            <span style="padding:1px 7px;border-radius:99px;font-size:9px;
                         font-weight:700;background:var(--surface3);
                         color:var(--text3);">
              #${tag}
            </span>`).join('')}
        </div>` : ''}

      <!-- Actions -->
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;">
        ${!isDone ? `
          <button class="btn btn-success btn-xs"
            onclick="markTaskDone('${t.id}')">✅ Done</button>
          ${t.status === 'pending' ? `
            <button class="btn btn-ghost btn-xs"
              onclick="markTaskInProgress('${t.id}')">▶️ Start</button>
          ` : ''}` : `
          <span style="font-size:10px;color:var(--success);">
            ✅ Completed ${t.completed_at
              ? new Date(t.completed_at).toLocaleDateString('en-GB') : ''}
          </span>
          ${t.penalty_applied ? `
            <span style="font-size:10px;color:var(--danger);">
              💰 Penalty: ${fmtMoney(t.penalty_amount)}
            </span>` : ''}
        `}
        ${(isPriv || isOwn) ? `
          <button class="btn btn-ghost btn-xs"
            onclick="openEditTaskModal('${t.id}')">✏️ Edit</button>
        ` : ''}
        ${isPriv ? `
          <button class="btn btn-danger btn-xs"
            onclick="deleteTask('${t.id}')">🗑️</button>
        ` : ''}
        <button class="btn btn-ghost btn-xs"
          onclick="openTaskDetail('${t.id}')">👁 Details</button>
      </div>
    </div>`;
}

// ============================================================
// CREATE TASK MODAL
// ============================================================
window.openCreateTaskModal = async function(prefill = {}) {
  await loadSystemUsers();

  const html = `
    <div style="display:grid;gap:12px;">

      <!-- Title -->
      <div>
        <label style="font-size:11px;font-weight:700;color:var(--text3);">
          Task Title *
        </label>
        <input type="text" id="task-title"
          placeholder="e.g. Call client about overdue payment"
          value="${prefill.title || ''}"
          style="width:100%;margin-top:4px;padding:8px;background:var(--surface2);
                 border:1px solid var(--border);border-radius:8px;color:var(--text);"/>
      </div>

      <!-- Description -->
      <div>
        <label style="font-size:11px;font-weight:700;color:var(--text3);">
          Description
        </label>
        <textarea id="task-desc" rows="2"
          placeholder="Additional details..."
          style="width:100%;margin-top:4px;padding:8px;background:var(--surface2);
                 border:1px solid var(--border);border-radius:8px;color:var(--text);
                 resize:vertical;">${prefill.description || ''}</textarea>
      </div>

      <!-- Type + Priority row -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div>
          <label style="font-size:11px;font-weight:700;color:var(--text3);">
            Task Type
          </label>
          <select id="task-type"
            style="width:100%;margin-top:4px;padding:8px;background:var(--surface2);
                   border:1px solid var(--border);border-radius:8px;color:var(--text);">
            ${Object.entries(TASK_TYPES).map(([k,v]) =>
              `<option value="${k}" ${prefill.type===k?'selected':''}>
                ${v.icon} ${v.label}
              </option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:var(--text3);">
            Priority
          </label>
          <select id="task-priority"
            onchange="updatePenaltyDisplay()"
            style="width:100%;margin-top:4px;padding:8px;background:var(--surface2);
                   border:1px solid var(--border);border-radius:8px;color:var(--text);">
            ${Object.entries(PRIORITY_CONFIG).map(([k,v]) =>
              `<option value="${k}" ${prefill.priority===k?'selected':''}>
                ${v.label} (£${v.penalty} penalty)
              </option>`).join('')}
          </select>
        </div>
      </div>

      <!-- Penalty notice -->
      <div id="task-penalty-notice"
        style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);
               border-radius:8px;padding:8px 12px;font-size:11px;color:var(--warning);">
        ⏰ Penalty: <strong id="task-penalty-amount">£100</strong>
        if not completed by deadline
      </div>

      <!-- Assign To — dynamic user list -->
      <div>
        <label style="font-size:11px;font-weight:700;color:var(--text3);">
          Assign To *
        </label>
        <div style="display:flex;gap:6px;margin-top:4px;">
          <select id="task-assign-to"
            style="flex:1;padding:8px;background:var(--surface2);
                   border:1px solid var(--border);border-radius:8px;color:var(--text);">
            ${buildUserDropdown('task-assign-to', prefill.assigned_to || G.user?.username)}
          </select>
          <!-- Quick-assign me button -->
          <button class="btn btn-ghost btn-sm"
            onclick="document.getElementById('task-assign-to').value='${G.user?.username}'">
            👤 Me
          </button>
        </div>
      </div>

      <!-- Branch + Due Date row -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div>
          <label style="font-size:11px;font-weight:700;color:var(--text3);">
            Branch
          </label>
          <select id="task-branch"
            style="width:100%;margin-top:4px;padding:8px;background:var(--surface2);
                   border:1px solid var(--border);border-radius:8px;color:var(--text);">
            <option value="">All Branches</option>
            <option value="HRG" ${prefill.branch==='HRG'?'selected':''}>🌊 Hurghada</option>
            <option value="ALX" ${prefill.branch==='ALX'?'selected':''}>🏙 Alexandria</option>
            <option value="CAI" ${prefill.branch==='CAI'?'selected':''}>🏛 Cairo</option>
            <option value="RSH" ${prefill.branch==='RSH'?'selected':''}>⚓ Rashid</option>
          </select>
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:var(--text3);">
            Due Date *
          </label>
          <input type="date" id="task-due-date"
            value="${prefill.due_date || ''}"
            style="width:100%;margin-top:4px;padding:8px;background:var(--surface2);
                   border:1px solid var(--border);border-radius:8px;color:var(--text);"/>
          <div style="font-size:9px;color:var(--text3);margin-top:3px;">
            ⏰ Deadline set to <strong>18:00</strong> on selected date
          </div>
        </div>
      </div>

      <!-- Linked Items — smart search -->
      <div style="border:1px solid var(--border);border-radius:8px;padding:10px;">
        <div style="font-size:11px;font-weight:700;color:var(--text3);
                    margin-bottom:8px;">🔗 Link to (Optional)</div>

        <!-- Order link -->
        <div style="margin-bottom:8px;">
          <label style="font-size:10px;font-weight:700;color:var(--text3);">
            Order
          </label>
          <div style="display:flex;gap:6px;margin-top:3px;">
            <input type="text" id="task-order-search"
              placeholder="Search by order # or client name..."
              oninput="searchTaskLinkOrders(this.value)"
              style="flex:1;padding:6px 8px;background:var(--surface);
                     border:1px solid var(--border);border-radius:6px;
                     color:var(--text);font-size:11px;"/>
            <button class="btn btn-ghost btn-xs"
              onclick="clearTaskLink('order')">✕</button>
          </div>
          <div id="task-order-results"
            style="max-height:100px;overflow-y:auto;"></div>
          <div id="task-order-selected"
            style="font-size:11px;color:var(--accent);margin-top:3px;"></div>
          <input type="hidden" id="task-linked-order-id"/>
          <input type="hidden" id="task-linked-order-no"/>
          <input type="hidden" id="task-linked-client-name"/>
          <input type="hidden" id="task-linked-client-id"/>
        </div>

        <!-- Car link -->
        <div style="margin-bottom:8px;">
          <label style="font-size:10px;font-weight:700;color:var(--text3);">
            Car
          </label>
          <div style="display:flex;gap:6px;margin-top:3px;">
            <input type="text" id="task-car-search"
              placeholder="Search by plate, model..."
              oninput="searchTaskLinkCars(this.value)"
              style="flex:1;padding:6px 8px;background:var(--surface);
                     border:1px solid var(--border);border-radius:6px;
                     color:var(--text);font-size:11px;"/>
            <button class="btn btn-ghost btn-xs"
              onclick="clearTaskLink('car')">✕</button>
          </div>
          <div id="task-car-results"
            style="max-height:80px;overflow-y:auto;"></div>
          <div id="task-car-selected"
            style="font-size:11px;color:var(--accent);margin-top:3px;"></div>
          <input type="hidden" id="task-linked-car-id"/>
          <input type="hidden" id="task-linked-car-label"/>
        </div>

        <!-- Tags -->
        <div>
          <label style="font-size:10px;font-weight:700;color:var(--text3);">
            Tags (comma separated)
          </label>
          <input type="text" id="task-tags"
            placeholder="e.g. overdue, pickup, deposit"
            value="${prefill.tags ? prefill.tags.join(', ') : ''}"
            style="width:100%;margin-top:3px;padding:6px 8px;background:var(--surface);
                   border:1px solid var(--border);border-radius:6px;
                   color:var(--text);font-size:11px;"/>
        </div>
      </div>

      <!-- Submit -->
      <div style="display:flex;gap:8px;margin-top:4px;">
        <button class="btn btn-primary" style="flex:1;"
          onclick="saveNewTask()">💾 Create & Assign Task</button>
        <button class="btn btn-ghost" style="flex:1;"
          onclick="closeModal()">Cancel</button>
      </div>
    </div>
  `;

  openModal('➕ Create New Task', html, true);

  // Pre-fill linked order if provided
  if (prefill.linked_order_id) {
    document.getElementById('task-linked-order-id').value  = prefill.linked_order_id;
    document.getElementById('task-linked-order-no').value  = prefill.linked_order_no  || '';
    document.getElementById('task-linked-client-name').value = prefill.linked_client_name || '';
    const sel = document.getElementById('task-order-selected');
    if (sel) sel.textContent = `📋 Order #${prefill.linked_order_no} — ${prefill.linked_client_name || ''}`;
  }
  if (prefill.linked_car_id) {
    document.getElementById('task-linked-car-id').value    = prefill.linked_car_id;
    document.getElementById('task-linked-car-label').value = prefill.linked_car_label || '';
    const sel = document.getElementById('task-car-selected');
    if (sel) sel.textContent = `🚗 ${prefill.linked_car_label}`;
  }

  // Set priority display
  updatePenaltyDisplay();
};

window.updatePenaltyDisplay = function() {
  const pSel    = document.getElementById('task-priority')?.value || 'medium';
  const pc      = PRIORITY_CONFIG[pSel] || PRIORITY_CONFIG.medium;
  const amtEl   = document.getElementById('task-penalty-amount');
  const noticeEl= document.getElementById('task-penalty-notice');
  if (amtEl)    amtEl.textContent    = `£${pc.penalty}`;
  if (noticeEl) noticeEl.style.color = pc.color;
};

// ── Order search for linking ───────────────────────────────────
window.searchTaskLinkOrders = debounce(function(query) {
  const resultsEl = document.getElementById('task-order-results');
  if (!resultsEl) return;
  if (!query || query.length < 2) { resultsEl.innerHTML = ''; return; }

  const q    = query.toLowerCase();
  const hits = (G.bookings || []).filter(o => {
    const hay = [
      getOrderNo(o), getOrderClientName(o),
      o['كود العميل'], o['اسم السيارة']
    ].join(' ').toLowerCase();
    return hay.includes(q);
  }).slice(0, 8);

  if (!hits.length) {
    resultsEl.innerHTML = `
      <div style="font-size:10px;color:var(--text3);padding:4px;">
        No orders found
      </div>`;
    return;
  }

  resultsEl.innerHTML = hits.map(o => `
    <div style="padding:5px 8px;cursor:pointer;border-radius:4px;font-size:11px;
                border-bottom:1px solid var(--border);"
         onmouseover="this.style.background='var(--surface2)'"
         onmouseout="this.style.background=''"
         onclick="selectTaskLinkOrder('${o.id}','${getOrderNo(o)}','${
           getOrderClientName(o).replace(/'/g,"\\'")}','${o['كود العميل']||''}')">
      <strong>#${getOrderNo(o)}</strong> — ${getOrderClientName(o)}
      <span style="color:var(--text3);font-size:10px;"> | ${getOrderStatus(o)}</span>
    </div>`).join('');
}, 200);

window.selectTaskLinkOrder = function(id, no, clientName, clientId) {
  document.getElementById('task-linked-order-id').value    = id;
  document.getElementById('task-linked-order-no').value    = no;
  document.getElementById('task-linked-client-name').value = clientName;
  document.getElementById('task-linked-client-id').value   = clientId;
  document.getElementById('task-order-results').innerHTML  = '';
  document.getElementById('task-order-search').value       = '';
  const sel = document.getElementById('task-order-selected');
  if (sel) sel.innerHTML = `
    <span style="color:var(--accent);">
      ✅ 📋 Order #${no} — ${clientName}
    </span>`;
};

// ── Car search for linking ─────────────────────────────────────
window.searchTaskLinkCars = debounce(function(query) {
  const resultsEl = document.getElementById('task-car-results');
  if (!resultsEl) return;
  if (!query || query.length < 1) { resultsEl.innerHTML = ''; return; }

  const q    = query.toLowerCase();
  const hits = (G.fleet || [])
    .filter(c => getCarStatusCategory(c) !== 'archived')
    .filter(c => {
      const plt = formatPlate(c);
      const hay = [plt, c.car_label, c.Type, c.Model, c.Color,
                   c['الطراز'], c['النوع']].join(' ').toLowerCase();
      return hay.includes(q);
    }).slice(0, 8);

  if (!hits.length) {
    resultsEl.innerHTML = `
      <div style="font-size:10px;color:var(--text3);padding:4px;">No cars found</div>`;
    return;
  }

  resultsEl.innerHTML = hits.map(c => {
    const plt = formatPlate(c);
    const lbl = c.car_label || getCarLabel(c,'en');
    return `
      <div style="padding:5px 8px;cursor:pointer;border-radius:4px;font-size:11px;
                  border-bottom:1px solid var(--border);"
           onmouseover="this.style.background='var(--surface2)'"
           onmouseout="this.style.background=''"
           onclick="selectTaskLinkCar('${c.id||c.ID}','${
             lbl.replace(/'/g,"\\'")} | ${plt}')">
        <strong>${lbl}</strong>
        ${plt ? `<span style="color:var(--text3);font-size:10px;"> | ${plt}</span>` : ''}
      </div>`;
  }).join('');
}, 200);

window.selectTaskLinkCar = function(id, label) {
  document.getElementById('task-linked-car-id').value    = id;
  document.getElementById('task-linked-car-label').value = label;
  document.getElementById('task-car-results').innerHTML  = '';
  document.getElementById('task-car-search').value       = '';
  const sel = document.getElementById('task-car-selected');
  if (sel) sel.innerHTML = `<span style="color:var(--accent);">✅ 🚗 ${label}</span>`;
};

window.clearTaskLink = function(type) {
  if (type === 'order') {
    ['task-linked-order-id','task-linked-order-no',
     'task-linked-client-name','task-linked-client-id'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    const sel = document.getElementById('task-order-selected');
    if (sel) sel.innerHTML = '';
    const res = document.getElementById('task-order-results');
    if (res) res.innerHTML = '';
    const inp = document.getElementById('task-order-search');
    if (inp) inp.value = '';
  } else if (type === 'car') {
    ['task-linked-car-id','task-linked-car-label'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    const sel = document.getElementById('task-car-selected');
    if (sel) sel.innerHTML = '';
    const res = document.getElementById('task-car-results');
    if (res) res.innerHTML = '';
    const inp = document.getElementById('task-car-search');
    if (inp) inp.value = '';
  }
};

// ============================================================
// SAVE NEW TASK
// ============================================================
window.saveNewTask = async function() {
  const title    = document.getElementById('task-title')?.value.trim();
  const assignTo = document.getElementById('task-assign-to')?.value;
  const dueDate  = document.getElementById('task-due-date')?.value;

  if (!title)    { toast('Task title is required', 'error'); return; }
  if (!assignTo) { toast('Please assign to a user', 'error'); return; }
  if (!dueDate)  { toast('Please set a due date', 'error'); return; }

  const priority = document.getElementById('task-priority')?.value  || 'medium';
  const type     = document.getElementById('task-type')?.value      || 'general';
  const branch   = document.getElementById('task-branch')?.value    || '';
  const desc     = document.getElementById('task-desc')?.value.trim() || '';
  const tagsRaw  = document.getElementById('task-tags')?.value      || '';
  const tags     = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);

  const pc       = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;

  // Deadline = selected date at 18:00 Cairo
  const deadline = new Date(`${dueDate}T18:00:00`);

  const linkedOrderId    = document.getElementById('task-linked-order-id')?.value   || '';
  const linkedOrderNo    = document.getElementById('task-linked-order-no')?.value    || '';
  const linkedClientName = document.getElementById('task-linked-client-name')?.value || '';
  const linkedClientId   = document.getElementById('task-linked-client-id')?.value   || '';
  const linkedCarId      = document.getElementById('task-linked-car-id')?.value      || '';
  const linkedCarLabel   = document.getElementById('task-linked-car-label')?.value   || '';

  const task = {
    title,
    description       : desc,
    type,
    priority,
    assigned_to       : assignTo,
    assigned_by       : G.user?.username || '',
    created_by        : G.user?.username || '',
    branch,
    due_date          : deadline.toISOString(),
    due_date_display  : dueDate,
    status            : 'pending',
    penalty_amount    : pc.penalty,
    penalty_applied   : false,
    tags,
    linked_order_id   : linkedOrderId,
    linked_order_no   : linkedOrderNo,
    linked_client_name: linkedClientName,
    linked_client_id  : linkedClientId,
    linked_car_id     : linkedCarId,
    linked_car_label  : linkedCarLabel,
    created_at        : Date.now(),
    _sys_created      : firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    await db.collection('tasks').add(task);
    await logAction('ADD', 'Task Manager',
      `Created task: "${title}" → ${assignTo}`);
    toast(`✅ Task created and assigned to ${assignTo}`, 'success');
    closeModal();
  } catch (e) {
    toast('Failed to create task: ' + e.message, 'error');
  }
};

// ============================================================
// TASK ACTIONS
// ============================================================
window.markTaskDone = async function(taskId) {
  const task  = window._allTasks.find(t => t.id === taskId);
  if (!task) return;

  const now      = getCairoNow();
  const due      = task.due_date ? new Date(task.due_date) : null;
  const isLate   = due && now > due;
  const penalty  = isLate && task.penalty_amount ? task.penalty_amount : 0;

  try {
    await db.collection('tasks').doc(taskId).update({
      status         : 'done',
      completed_at   : now.toISOString(),
      completed_by   : G.user?.username || '',
      penalty_applied: isLate && penalty > 0,
      penalty_amount : penalty,
      _sys_updated   : Date.now()
    });

    if (isLate && penalty > 0) {
      toast(`✅ Task done — ⚠️ Penalty £${penalty} applied (completed late)`, 'warning', 5000);
    } else {
      toast('✅ Task marked as done!', 'success');
    }

    await logAction('EDIT', 'Task Manager',
      `Completed task: "${task.title}"${isLate ? ` (LATE — £${penalty} penalty)` : ''}`);
  } catch (e) {
    toast('Failed: ' + e.message, 'error');
  }
};

window.markTaskInProgress = async function(taskId) {
  try {
    await db.collection('tasks').doc(taskId).update({
      status      : 'inprogress',
      started_at  : getCairoNow().toISOString(),
      _sys_updated: Date.now()
    });
    toast('Task started!', 'info');
  } catch (e) {
    toast('Failed: ' + e.message, 'error');
  }
};

window.deleteTask = async function(taskId) {
  if (G.user?.role !== 'Admin') { toast('Admin only', 'error'); return; }
  const task = window._allTasks.find(t => t.id === taskId);
  if (!confirm(`Delete task "${task?.title}"?`)) return;
  try {
    await db.collection('tasks').doc(taskId).delete();
    toast('Task deleted', 'success');
  } catch (e) {
    toast('Failed: ' + e.message, 'error');
  }
};

// ============================================================
// TASK DETAIL MODAL
// ============================================================
window.openTaskDetail = function(taskId) {
  const t    = window._allTasks.find(x => x.id === taskId);
  if (!t) return;
  const tc   = TASK_TYPES[t.type]         || TASK_TYPES.general;
  const pc   = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.medium;
  const due  = t.due_date ? new Date(t.due_date) : null;
  const today= getCairoNow();
  const isOD = due && today > due && t.status !== 'done';

  const html = `
    <div style="display:grid;gap:12px;">
      <!-- Banner -->
      <div style="background:${tc.color}11;border:1px solid ${tc.color}33;
                  border-radius:10px;padding:12px 14px;
                  display:flex;align-items:center;gap:10px;">
        <span style="font-size:28px;">${tc.icon}</span>
        <div>
          <div style="font-size:15px;font-weight:800;">${t.title}</div>
          <div style="font-size:11px;color:var(--text3);">
            ${tc.label} • ${pc.label} Priority
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:11px;">
        <div>
          <div style="color:var(--text3);font-size:10px;font-weight:700;
                      margin-bottom:3px;">ASSIGNED TO</div>
          <div style="font-weight:700;">👤 ${t.assigned_to || '—'}</div>
        </div>
        <div>
          <div style="color:var(--text3);font-size:10px;font-weight:700;
                      margin-bottom:3px;">CREATED BY</div>
          <div>${t.created_by || '—'}</div>
        </div>
        <div>
          <div style="color:var(--text3);font-size:10px;font-weight:700;
                      margin-bottom:3px;">DUE DATE</div>
          <div style="color:${isOD ? 'var(--danger)' : 'var(--text)'};">
            ${due ? due.toLocaleString('en-GB',{
              day:'2-digit', month:'short', year:'numeric',
              hour:'2-digit', minute:'2-digit',
              timeZone:'Africa/Cairo'}) : '—'}
          </div>
        </div>
        <div>
          <div style="color:var(--text3);font-size:10px;font-weight:700;
                      margin-bottom:3px;">STATUS</div>
          <div style="font-weight:700;color:${isOD ? 'var(--danger)' : 'var(--success)'};">
            ${isOD ? '⚠️ OVERDUE' : t.status?.toUpperCase()}
          </div>
        </div>
        <div>
          <div style="color:var(--text3);font-size:10px;font-weight:700;
                      margin-bottom:3px;">PENALTY</div>
          <div style="color:var(--warning);">£${t.penalty_amount || 0}</div>
        </div>
        <div>
          <div style="color:var(--text3);font-size:10px;font-weight:700;
                      margin-bottom:3px;">BRANCH</div>
          <div>${BRANCH_MAP[t.branch] || t.branch || 'All'}</div>
        </div>
      </div>

      ${t.description ? `
        <div style="background:var(--surface2);border-radius:8px;padding:10px;">
          <div style="font-size:10px;font-weight:700;color:var(--text3);
                      margin-bottom:4px;">DESCRIPTION</div>
          <div style="font-size:12px;">${t.description}</div>
        </div>` : ''}

      ${(t.linked_order_id || t.linked_car_id) ? `
        <div style="background:var(--surface2);border-radius:8px;padding:10px;">
          <div style="font-size:10px;font-weight:700;color:var(--text3);
                      margin-bottom:8px;">LINKED TO</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            ${t.linked_order_id ? `
              <button class="btn btn-ghost btn-sm"
                onclick="closeModal();openOrderDetail('${t.linked_order_id}')">
                📋 Order #${t.linked_order_no}
                ${t.linked_client_name ? '— ' + t.linked_client_name : ''}
              </button>` : ''}
            ${t.linked_car_id ? `
              <button class="btn btn-ghost btn-sm"
                onclick="closeModal();openCarDetailModal('${t.linked_car_id}')">
                🚗 ${t.linked_car_label}
              </button>` : ''}
          </div>
        </div>` : ''}

      ${t.tags && t.tags.length ? `
        <div style="display:flex;gap:4px;flex-wrap:wrap;">
          ${t.tags.map(tag => `
            <span style="padding:2px 9px;border-radius:99px;font-size:10px;
                         font-weight:700;background:var(--surface3);
                         color:var(--text3);">#${tag}</span>`).join('')}
        </div>` : ''}

      <div style="display:flex;gap:8px;">
        ${t.status !== 'done' ? `
          <button class="btn btn-success" style="flex:1;"
            onclick="closeModal();markTaskDone('${taskId}')">
            ✅ Mark Done
          </button>` : ''}
        <button class="btn btn-ghost" onclick="closeModal()">Close</button>
      </div>
    </div>`;

  openModal(`${tc.icon} Task Detail`, html, true);
};

// ============================================================
// EDIT TASK MODAL
// ============================================================
window.openEditTaskModal = async function(taskId) {
  const t = window._allTasks.find(x => x.id === taskId);
  if (!t) return;
  await loadSystemUsers();

  const dueDate = t.due_date_display ||
    (t.due_date ? new Date(t.due_date).toISOString().slice(0,10) : '');

  const html = `
    <div style="display:grid;gap:10px;">
      <div>
        <label style="font-size:11px;font-weight:700;color:var(--text3);">Title</label>
        <input type="text" id="edit-task-title" value="${(t.title||'').replace(/"/g,'&quot;')}"
          style="width:100%;margin-top:4px;padding:8px;background:var(--surface2);
                 border:1px solid var(--border);border-radius:8px;color:var(--text);"/>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:var(--text3);">Description</label>
        <textarea id="edit-task-desc" rows="2"
          style="width:100%;margin-top:4px;padding:8px;background:var(--surface2);
                 border:1px solid var(--border);border-radius:8px;color:var(--text);
                 resize:vertical;">${t.description || ''}</textarea>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div>
          <label style="font-size:11px;font-weight:700;color:var(--text3);">Status</label>
          <select id="edit-task-status"
            style="width:100%;margin-top:4px;padding:8px;background:var(--surface2);
                   border:1px solid var(--border);border-radius:8px;color:var(--text);">
            <option value="pending"    ${t.status==='pending'    ?'selected':''}>Pending</option>
            <option value="inprogress" ${t.status==='inprogress' ?'selected':''}>In Progress</option>
            <option value="done"       ${t.status==='done'       ?'selected':''}>Done</option>
            <option value="cancelled"  ${t.status==='cancelled'  ?'selected':''}>Cancelled</option>
          </select>
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:var(--text3);">Priority</label>
          <select id="edit-task-priority"
            style="width:100%;margin-top:4px;padding:8px;background:var(--surface2);
                   border:1px solid var(--border);border-radius:8px;color:var(--text);">
            ${Object.entries(PRIORITY_CONFIG).map(([k,v]) =>
              `<option value="${k}" ${t.priority===k?'selected':''}>${v.label}</option>`
            ).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:var(--text3);">Assign To</label>
          <select id="edit-task-assign"
            style="width:100%;margin-top:4px;padding:8px;background:var(--surface2);
                   border:1px solid var(--border);border-radius:8px;color:var(--text);">
            ${buildUserDropdown('edit-task-assign', t.assigned_to)}
          </select>
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:var(--text3);">Due Date</label>
          <input type="date" id="edit-task-due" value="${dueDate}"
            style="width:100%;margin-top:4px;padding:8px;background:var(--surface2);
                   border:1px solid var(--border);border-radius:8px;color:var(--text);"/>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:4px;">
        <button class="btn btn-success" style="flex:1;"
          onclick="saveTaskEdit('${taskId}')">💾 Save Changes</button>
        <button class="btn btn-ghost" style="flex:1;"
          onclick="closeModal()">Cancel</button>
      </div>
    </div>`;

  openModal(`✏️ Edit Task`, html);
};

window.saveTaskEdit = async function(taskId) {
  const title    = document.getElementById('edit-task-title')?.value.trim();
  const desc     = document.getElementById('edit-task-desc')?.value.trim();
  const status   = document.getElementById('edit-task-status')?.value;
  const priority = document.getElementById('edit-task-priority')?.value;
  const assignTo = document.getElementById('edit-task-assign')?.value;
  const dueDate  = document.getElementById('edit-task-due')?.value;

  if (!title) { toast('Title required', 'error'); return; }

  const upd = {
    title, description: desc, status, priority,
    assigned_to  : assignTo,
    due_date     : dueDate ? new Date(`${dueDate}T18:00:00`).toISOString() : '',
    due_date_display: dueDate,
    _sys_updated : Date.now()
  };

  if (status === 'done' && !window._allTasks.find(t => t.id === taskId)?.completed_at) {
    upd.completed_at = getCairoNow().toISOString();
    upd.completed_by = G.user?.username || '';
  }

  try {
    await db.collection('tasks').doc(taskId).update(upd);
    await logAction('EDIT', 'Task Manager', `Updated task: "${title}"`);
    toast('Task updated!', 'success');
    closeModal();
  } catch (e) {
    toast('Failed: ' + e.message, 'error');
  }
};

// ============================================================
// QUICK CREATE FROM ANYWHERE IN THE ERP
// ============================================================

// Call this from any page to open task creation with pre-filled context
window.quickCreateTask = async function(context = {}) {
  await loadSystemUsers();
  openCreateTaskModal(context);
};

// ── From an order ─────────────────────────────────────────────
window.createTaskFromOrder = async function(orderId) {
  const order = (window.allOrders || G.bookings || []).find(o => o.id === orderId);
  if (!order) return;
  const { end } = getOrderDates(order);
  const today   = getCairoNow();
  const isOD    = end && today > end && !order.closed;
  const st      = getOrderStatus(order);

  await quickCreateTask({
    title             : isOD
      ? `Follow up overdue order #${getOrderNo(order)} — ${getOrderClientName(order)}`
      : `Task for order #${getOrderNo(order)} — ${getOrderClientName(order)}`,
    type              : isOD ? 'payment' : 'followup',
    priority          : isOD ? 'high' : 'medium',
    linked_order_id   : orderId,
    linked_order_no   : getOrderNo(order),
    linked_client_name: getOrderClientName(order),
    linked_client_id  : order['كود العميل'] || '',
    tags              : [st.toLowerCase(), isOD ? 'overdue' : 'order'],
    due_date          : new Date().toISOString().slice(0,10),
    branch            : order['فرع الإصدار'] || ''
  });
};

// ── From a car ────────────────────────────────────────────────
window.createTaskFromCar = async function(carId) {
  const car = G.fleet.find(c => String(c.id || c.ID) === String(carId));
  if (!car) return;
  const cat = getCarStatusCategory(car);
  const plt = formatPlate(car);
  const lbl = getCarLabel(car,'en');

  await quickCreateTask({
    title         : cat === 'maintenance'
      ? `Maintenance check: ${lbl} | ${plt}`
      : `Inspection: ${lbl} | ${plt}`,
    type          : cat === 'maintenance' ? 'maintenance' : 'inspection',
    priority      : 'medium',
    linked_car_id : carId,
    linked_car_label: `${lbl} | ${plt}`,
    tags          : [cat, 'car']
  });
};

// ── From a pickup/dropoff ─────────────────────────────────────
window.createPickupTask = async function(orderId) {
  const order = (window.allOrders || G.bookings || []).find(o => o.id === orderId);
  if (!order) return;
  const { start } = getOrderDates(order);
  await quickCreateTask({
    title             : `PICKUP: ${getOrderClientName(order)} — Order #${getOrderNo(order)}`,
    type              : 'pickup',
    priority          : 'high',
    linked_order_id   : orderId,
    linked_order_no   : getOrderNo(order),
    linked_client_name: getOrderClientName(order),
    tags              : ['pickup'],
    due_date          : start ? start.toISOString().slice(0,10) : '',
    branch            : order['فرع الإصدار'] || ''
  });
};

window.createDropoffTask = async function(orderId) {
  const order = (window.allOrders || G.bookings || []).find(o => o.id === orderId);
  if (!order) return;
  const { end } = getOrderDates(order);
  await quickCreateTask({
    title             : `DROPOFF: ${getOrderClientName(order)} — Order #${getOrderNo(order)}`,
    type              : 'dropoff',
    priority          : 'high',
    linked_order_id   : orderId,
    linked_order_no   : getOrderNo(order),
    linked_client_name: getOrderClientName(order),
    tags              : ['dropoff'],
    due_date          : end ? end.toISOString().slice(0,10) : '',
    branch            : order['فرع الإصدار'] || ''
  });
};
