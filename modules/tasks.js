// ============================================================
// modules/tasks.js
// Task Manager — full lifecycle: create, assign, start,
// complete, appeal, resolve. Shift-based penalties,
// priority colors, due date tracking, admin resolution.
// ============================================================

// ============================================================
// ENTRY POINT
// ============================================================

window.renderTasks = function() {
  renderPageLoading('page-tasks', '✅', 'Task Manager');
  loadTasks();
};

window.loadTasks = async function() {
  const el     = document.getElementById('page-tasks');
  if (!el) return;
  const isPriv = ['Admin','Executive'].includes(G.user?.role);

  el.innerHTML = `
    <div class="section-header">
      <div>
        <h2>✅ Task Manager</h2>
        <p>${isPriv
          ? 'Create, assign and monitor all branch tasks'
          : 'My assigned tasks and deadlines'}</p>
      </div>
      <div style="display:flex;gap:7px;">
        ${isPriv ? `
          <button class="btn btn-primary btn-sm"
            onclick="openCreateTaskModal()">
            ➕ Create Task
          </button>
          <button class="btn btn-ghost btn-sm"
            onclick="clearCompletedTasks()"
            style="color:var(--text3);">
            🗑️ Clear Completed
          </button>` : ''}
      </div>
    </div>

    <!-- Filter Tabs -->
    <div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;">
      <button class="btn btn-ghost btn-sm task-tab-btn"
        id="task-tab-mine"
        style="border-color:var(--accent);color:var(--accent);"
        onclick="switchTaskTab('mine',this)">
        👤 My Tasks
      </button>
      ${isPriv ? `
        <button class="btn btn-ghost btn-sm task-tab-btn"
          id="task-tab-all"
          onclick="switchTaskTab('all',this)">
          📋 All Tasks
        </button>` : ''}
      <button class="btn btn-ghost btn-sm task-tab-btn"
        id="task-tab-pending"
        onclick="switchTaskTab('pending',this)">
        ⏳ Pending
      </button>
      <button class="btn btn-ghost btn-sm task-tab-btn"
        id="task-tab-done"
        onclick="switchTaskTab('done',this)">
        ✅ Completed
      </button>
      ${isPriv ? `
        <button class="btn btn-ghost btn-sm task-tab-btn"
          id="task-tab-appealed"
          onclick="switchTaskTab('appealed',this)">
          📝 Appealed
        </button>` : ''}
    </div>

    <div id="tasks-list"></div>`;

  switchTaskTab('mine', document.getElementById('task-tab-mine'));
};

// ============================================================
// SWITCH TAB
// ============================================================

window.switchTaskTab = async function(tab, btn) {
  // Update button styles
  document.querySelectorAll('.task-tab-btn').forEach(b => {
    b.style.borderColor = 'var(--border)';
    b.style.color       = 'var(--text2)';
  });
  if (btn) {
    btn.style.borderColor = 'var(--accent)';
    btn.style.color       = 'var(--accent)';
  }

  const isPriv = ['Admin','Executive'].includes(G.user?.role);
  const list   = document.getElementById('tasks-list');
  if (!list) return;

  list.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';

  try {
    let snap;

    if (tab === 'mine') {
      snap = await db.collection('tasks')
        .where('assigned_to', '==', G.user.username)
        .limit(50).get();
    } else if (tab === 'all' && isPriv) {
      snap = await db.collection('tasks').limit(150).get();
    } else if (tab === 'pending') {
      snap = await db.collection('tasks')
        .where('assigned_to', '==', G.user.username)
        .where('status', 'in', ['pending','inprogress'])
        .limit(50).get();
    } else if (tab === 'done') {
      snap = await db.collection('tasks')
        .where('assigned_to', '==', G.user.username)
        .where('status', '==', 'done')
        .limit(50).get();
    } else if (tab === 'appealed' && isPriv) {
      snap = await db.collection('tasks')
        .where('status', 'in', ['appealed'])
        .limit(50).get();
    } else {
      snap = await db.collection('tasks')
        .where('assigned_to', '==', G.user.username)
        .limit(50).get();
    }

    if (snap.empty) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="es-icon">✅</div>
          <p>No tasks found in this category</p>
        </div>`;
      return;
    }

    // Sort client-side: by priority then due date
    const priorityOrder = { urgent:0, high:1, medium:2, low:3 };
    const tasks = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a,b) => {
        const pa = priorityOrder[a.priority] ?? 2;
        const pb = priorityOrder[b.priority] ?? 2;
        if (pa !== pb) return pa - pb;
        return (a.due_date || 0) - (b.due_date || 0);
      });

    const pColors = {
      urgent: 'var(--danger)',
      high:   'var(--orange)',
      medium: 'var(--warning)',
      low:    'var(--success)'
    };

    const today = new Date();

    list.innerHTML = tasks.map(t => {
      const due  = t.due_date ? new Date(t.due_date) : null;
      const isOD = due && today > due &&
                   t.status !== 'done' && t.status !== 'cancelled';
      const pColor = pColors[t.priority] || 'var(--text3)';

      const shiftEnd   = G.settings.shiftEnd || 18;
      const dueDisplay = due
        ? (isOD
            ? `<span style="color:var(--danger);">
                ⚠️ Overdue: ${fmtDate(due)}
               </span>`
            : `<span style="color:var(--text3);">
                📅 Due: ${fmtDate(due)} (shift ends ${shiftEnd}:00)
               </span>`)
        : '<span style="color:var(--text3);">No deadline set</span>';

      return `
        <div style="padding:13px;border-radius:var(--radius);
          margin-bottom:9px;background:var(--surface2);
          border:1px solid ${isOD && t.status!=='done'
            ? 'rgba(239,68,68,0.35)' : 'var(--border)'};
          transition:all 0.2s;"
          onmouseover="this.style.borderColor='var(--accent)'"
          onmouseout="this.style.borderColor='${isOD && t.status!=='done'
            ? 'rgba(239,68,68,0.35)' : 'var(--border)'}'">

          <div style="display:flex;align-items:flex-start;gap:11px;">

            <!-- Priority stripe -->
            <div style="width:4px;min-height:44px;border-radius:2px;
              background:${pColor};flex-shrink:0;margin-top:2px;"></div>

            <div style="flex:1;">
              <!-- Title row -->
              <div style="display:flex;align-items:center;gap:7px;
                flex-wrap:wrap;margin-bottom:5px;">
                <span style="font-size:13px;font-weight:700;">
                  ${t.title || 'Task'}
                </span>
                <span class="pill pill-${t.status}">${t.status}</span>
                <span class="pill pill-${t.priority || 'low'}">
                  ${(t.priority || 'low').toUpperCase()}
                </span>
                ${isOD ? `
                  <span class="pill pill-high"
                    style="font-size:9px;animation:dashPulse 2s infinite;">
                    ⚠️ OVERDUE
                  </span>` : ''}
                ${t.type ? `
                  <span style="font-size:9px;color:var(--text3);
                    background:var(--surface3);padding:2px 6px;
                    border-radius:5px;">${t.type}</span>` : ''}
              </div>

              <!-- Description -->
              ${t.description ? `
                <div style="font-size:11px;color:var(--text2);
                  margin-bottom:7px;line-height:1.5;">
                  ${t.description}
                </div>` : ''}

              <!-- Meta row -->
              <div style="display:flex;gap:13px;flex-wrap:wrap;
                font-size:10px;margin-bottom:5px;">
                ${t.assigned_by ? `
                  <span style="color:var(--text3);">
                    👤 By: <strong style="color:var(--text2);">
                      ${t.assigned_by}
                    </strong>
                  </span>` : ''}
                ${isPriv && t.assigned_to !== G.user.username ? `
                  <span style="color:var(--accent);">
                    → <strong>${t.assigned_to}</strong>
                  </span>` : ''}
                ${t.branch ? `
                  <span style="color:var(--text3);">
                    🏢 ${BRANCH_MAP[t.branch] || t.branch}
                  </span>` : ''}
                ${t.linked_order ? `
                  <span style="color:var(--accent);cursor:pointer;"
                    onclick="openOrderDetail('${t.linked_order}')">
                    📋 Order #${t.linked_order}
                  </span>` : ''}
                ${t.penalty_amount > 0 ? `
                  <span style="color:var(--warning);">
                    ⚠️ Penalty: £${t.penalty_amount} EGP
                  </span>` : ''}
              </div>

              <!-- Due date -->
              <div style="font-size:10px;">${dueDisplay}</div>

              <!-- Appeal box -->
              ${t.appeal_reason ? `
                <div style="margin-top:7px;padding:7px 11px;
                  background:rgba(245,158,11,0.08);
                  border:1px solid rgba(245,158,11,0.25);
                  border-radius:7px;font-size:11px;">
                  📝 Appeal: ${t.appeal_reason}
                  ${t.appeal_status ? `
                    <span class="pill pill-${
                      t.appeal_status === 'approved' ? 'approved' :
                      t.appeal_status === 'rejected' ? 'rejected' : 'pending'
                    }" style="margin-left:7px;">
                      ${t.appeal_status}
                    </span>` : ''}
                </div>` : ''}
            </div>

            <!-- Action buttons -->
            <div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0;">
              ${t.status === 'pending' ? `
                <button class="btn btn-primary btn-xs"
                  onclick="updateTaskStatus('${t.id}','inprogress')">
                  ▶ Start
                </button>` : ''}
              ${t.status === 'inprogress' ? `
                <button class="btn btn-success btn-xs"
                  onclick="updateTaskStatus('${t.id}','done')">
                  ✅ Done
                </button>` : ''}
              ${t.status !== 'done' && t.status !== 'cancelled' &&
                t.status !== 'appealed' &&
                t.assigned_to === G.user.username ? `
                <button class="btn btn-warning btn-xs"
                  onclick="openTaskAppeal('${t.id}')">
                  📝 Appeal
                </button>` : ''}
              ${isPriv && t.status === 'appealed' ? `
                <button class="btn btn-success btn-xs"
                  onclick="resolveAppeal('${t.id}','approved')">
                  ✓ Approve
                </button>
                <button class="btn btn-danger btn-xs"
                  onclick="resolveAppeal('${t.id}','rejected')">
                  ✕ Reject
                </button>` : ''}
              ${isPriv ? `
                <button class="btn btn-danger btn-xs"
                  onclick="deleteTask('${t.id}')">
                  🗑️
                </button>` : ''}
            </div>

          </div>
        </div>`;
    }).join('');

  } catch (e) {
    list.innerHTML = `
      <div class="empty-state">
        <p>Could not load tasks: ${e.message}</p>
      </div>`;
    console.warn('Tasks error:', e);
  }
};

// ============================================================
// CREATE TASK MODAL
// ============================================================

window.openCreateTaskModal = function() {
  const html = `
    <div class="form-grid">
      <div class="field" style="grid-column:1/-1;">
        <label>Task Title *</label>
        <input type="text" id="task-title"
          placeholder="What needs to be done?"/>
      </div>
      <div class="field" style="grid-column:1/-1;">
        <label>Description</label>
        <textarea id="task-desc"
          placeholder="Details, instructions, expected outcome..."
          style="min-height:70px;"></textarea>
      </div>
      <div class="field">
        <label>Task Type</label>
        <select id="task-type">
          <option value="rental">Rental Task</option>
          <option value="admin">Admin Task</option>
          <option value="maintenance">Maintenance</option>
          <option value="followup">Follow-up</option>
          <option value="general">General</option>
        </select>
      </div>
      <div class="field">
        <label>Priority</label>
        <select id="task-priority">
          <option value="low">
            Low (£${G.settings.penaltyLow || 50} penalty)
          </option>
          <option value="medium" selected>
            Medium (£${G.settings.penaltyMedium || 100} penalty)
          </option>
          <option value="high">
            High (£${G.settings.penaltyHigh || 200} penalty)
          </option>
          <option value="urgent">
            Urgent (£${G.settings.penaltyUrgent || 500} penalty)
          </option>
        </select>
      </div>
      <div class="field">
        <label>Assign To (Username) *</label>
        <input type="text" id="task-assign"
          placeholder="Enter username exactly"/>
      </div>
      <div class="field">
        <label>Branch</label>
        <select id="task-branch">
          <option value="HRG">Hurghada</option>
          <option value="ALX">Alexandria</option>
          <option value="CAI">Cairo</option>
          <option value="RSH">Rashid</option>
        </select>
      </div>
      <div class="field">
        <label>
          Due Date
          <span style="font-size:9px;color:var(--text3);font-weight:400;">
            (deadline = end of shift ${G.settings.shiftEnd || 18}:00)
          </span>
        </label>
        <input type="date" id="task-due"/>
      </div>
      <div class="field">
        <label>Linked Order # (Optional)</label>
        <input type="text" id="task-order"
          placeholder="Order number if related"/>
      </div>
    </div>

    <div style="padding:9px 11px;background:rgba(245,158,11,0.08);
      border:1px solid rgba(245,158,11,0.25);border-radius:8px;
      font-size:11px;margin-top:11px;">
      ⏰ Deadline set to <strong>${G.settings.shiftEnd || 18}:00</strong>
      on the selected date (end of shift).
      Penalty applies if not completed by then.
    </div>

    <div style="display:flex;gap:7px;margin-top:14px;">
      <button class="btn btn-success" onclick="saveNewTask()">
        💾 Create & Assign Task
      </button>
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    </div>`;

  openModal('➕ Create New Task', html);
};

// ============================================================
// SAVE NEW TASK
// ============================================================

window.saveNewTask = async function() {
  const title    = document.getElementById('task-title')?.value.trim();
  const assignTo = document.getElementById('task-assign')?.value.trim();

  if (!title)    { toast('Task title is required', 'error');    return; }
  if (!assignTo) { toast('Assigned user is required', 'error'); return; }

  const dueDate  = document.getElementById('task-due')?.value;
  const branch   = document.getElementById('task-branch')?.value;
  const priority = document.getElementById('task-priority')?.value || 'medium';

  const penaltyMap = {
    low:    G.settings.penaltyLow    || 50,
    medium: G.settings.penaltyMedium || 100,
    high:   G.settings.penaltyHigh   || 200,
    urgent: G.settings.penaltyUrgent || 500
  };

  try {
    const shiftEnd   = G.settings.shiftEnd || 18;
    const dueDateFinal = dueDate ? new Date(dueDate) : new Date();
    dueDateFinal.setHours(shiftEnd, 0, 0, 0);

    await db.collection('tasks').add({
      title,
      description:   document.getElementById('task-desc')?.value.trim() || '',
      type:          document.getElementById('task-type')?.value,
      priority,
      assigned_to:   assignTo,
      assigned_by:   G.user.username,
      branch,
      linked_order:  document.getElementById('task-order')?.value.trim() || '',
      status:        'pending',
      due_date:      dueDateFinal.getTime(),
      created_at:    Date.now(),
      penalty_amount: penaltyMap[priority]
    });

    await createNotification(
      assignTo,
      'task',
      `New task assigned: "${title}" by ${G.user.username}. ` +
      `Due: ${dueDateFinal.toLocaleString('en-GB')}`,
      'tasks',
      ''
    );

    await logAction('ADD', 'Task Manager',
      `Task created: "${title}" → ${assignTo} | Priority: ${priority}`);

    toast(`Task "${title}" created and assigned to ${assignTo}!`, 'success');
    closeModal();
    loadTasks();

  } catch (e) {
    toast('Failed to create task: ' + e.message, 'error');
  }
};

// ============================================================
// UPDATE TASK STATUS
// ============================================================

window.updateTaskStatus = async function(taskId, newStatus) {
  try {
    const upd = { status: newStatus };
    if (newStatus === 'done')       upd.completed_at = Date.now();
    if (newStatus === 'inprogress') upd.started_at   = Date.now();

    await db.collection('tasks').doc(taskId).update(upd);

    await logAction('EDIT', 'Task Manager',
      `Task ${taskId} → ${newStatus}`);

    toast(`Task marked as ${newStatus}!`,
      newStatus === 'done' ? 'success' : 'info');

    loadTasks();

  } catch (e) {
    toast('Update failed: ' + e.message, 'error');
  }
};

// ============================================================
// TASK APPEAL
// ============================================================

window.openTaskAppeal = function(taskId) {
  const html = `
    <div style="margin-bottom:13px;font-size:11px;color:var(--text3);">
      Submitting an appeal will send it to Admin/Executive for review.
      Provide a clear reason and any supporting context.
    </div>
    <div class="field">
      <label>Appeal Reason *</label>
      <textarea id="appeal-reason"
        placeholder="Explain why you are appealing this task.
Be specific about why you cannot complete it,
or dispute the penalty..."
        style="min-height:110px;"></textarea>
    </div>
    <div style="display:flex;gap:7px;margin-top:13px;">
      <button class="btn btn-warning"
        onclick="submitTaskAppeal('${taskId}')">
        📝 Submit Appeal
      </button>
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    </div>`;

  openModal('📝 Appeal Task', html);
};

window.submitTaskAppeal = async function(taskId) {
  const reason = document.getElementById('appeal-reason')?.value.trim();
  if (!reason) { toast('Appeal reason is required', 'error'); return; }

  try {
    await db.collection('tasks').doc(taskId).update({
      status:         'appealed',
      appeal_reason:  reason,
      appeal_status:  'pending',
      appeal_at:      Date.now()
    });

    await db.collection('approvals').add({
      type:         'task_appeal',
      requested_by:  G.user.username,
      branch:        G.user.branch,
      subject:      `Task appeal from ${G.user.username}`,
      details:       reason,
      linked_ref:    taskId,
      status:        'pending',
      created_at:    Date.now()
    });

    // Notify all admins
    const adminSnap = await db.collection('users').get();
    adminSnap.docs.forEach(d => {
      if (['Admin','Executive'].includes(d.data().role)) {
        createNotification(
          d.id,
          'approval',
          `Task appeal from ${G.user.username}: ${reason.slice(0,60)}`,
          'approvals',
          taskId
        );
      }
    });

    await logAction('ADD', 'Task Manager', `Task appeal submitted: ${taskId}`);
    toast('Appeal submitted for Admin review', 'info');
    closeModal();
    loadTasks();

  } catch (e) {
    toast('Appeal failed: ' + e.message, 'error');
  }
};

// ============================================================
// RESOLVE APPEAL (Admin only)
// ============================================================

window.resolveAppeal = async function(taskId, decision) {
  try {
    const upd = { appeal_status: decision };
    if (decision === 'approved') upd.status = 'cancelled';
    else                         upd.status = 'pending'; // return to queue

    await db.collection('tasks').doc(taskId).update(upd);

    // Update linked approval
    const apSnap = await db.collection('approvals')
      .where('linked_ref', '==', taskId)
      .where('status',     '==', 'pending')
      .get();

    if (!apSnap.empty) {
      await apSnap.docs[0].ref.update({
        status:      decision === 'approved' ? 'approved' : 'rejected',
        decided_by:  G.user.username,
        decided_at:  Date.now()
      });
    }

    // Notify the task assignee
    const taskSnap = await db.collection('tasks').doc(taskId).get();
    if (taskSnap.exists) {
      const t = taskSnap.data();
      createNotification(
        t.assigned_to,
        decision === 'approved' ? 'approval' : 'general',
        `Your task appeal was ${
          decision === 'approved'
            ? 'APPROVED — task cancelled'
            : 'REJECTED — task returned to pending'}`,
        'tasks',
        taskId
      );
    }

    await logAction('EDIT', 'Task Manager',
      `Appeal ${decision}: ${taskId}`);

    toast(`Appeal ${decision}!`,
      decision === 'approved' ? 'success' : 'warning');

    loadTasks();

  } catch (e) {
    toast('Failed: ' + e.message, 'error');
  }
};

// ============================================================
// DELETE TASK
// ============================================================

window.deleteTask = async function(taskId) {
  if (!confirm('Permanently delete this task? This cannot be undone.')) return;

  try {
    await db.collection('tasks').doc(taskId).delete();
    await logAction('DELETE', 'Task Manager', `Task deleted: ${taskId}`);
    toast('Task deleted', 'success');
    loadTasks();
  } catch (e) {
    toast('Delete failed: ' + e.message, 'error');
  }
};

// ============================================================
// CLEAR COMPLETED TASKS (Admin only)
// ============================================================

window.clearCompletedTasks = async function() {
  if (!confirm('Delete all completed tasks? This cannot be undone.')) return;

  try {
    const snap = await db.collection('tasks')
      .where('status', '==', 'done').get();

    if (!snap.size) { toast('No completed tasks to clear', 'info'); return; }

    const CHUNK = 400;
    for (let i = 0; i < snap.docs.length; i += CHUNK) {
      const batch = db.batch();
      snap.docs.slice(i, i + CHUNK).forEach(d => batch.delete(d.ref));
      await batch.commit();
    }

    await logAction('DELETE', 'Task Manager',
      `Cleared ${snap.size} completed tasks`);

    toast(`✅ Cleared ${snap.size} completed tasks`, 'success');
    loadTasks();

  } catch (e) {
    toast('Failed: ' + e.message, 'error');
  }
};
