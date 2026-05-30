// ============================================================
// modules/approvals.js v4.1
// Approvals workflow — all types, auto-execute, notifications
// ============================================================

window.renderApprovals = function() {
  renderPageLoading('page-approvals', '🔔', 'Approvals');
  loadApprovals();
};

window.loadApprovals = async function() {
  const el = document.getElementById('page-approvals');
  if (!el) return;

  el.innerHTML = `
    <div class="section-header">
      <div>
        <h2>🔔 Approvals</h2>
        <p>Approval requests from all branches — Admin review required</p>
      </div>
      <button class="btn btn-ghost btn-sm"
        onclick="loadApprovals()">🔄 Refresh</button>
    </div>

    <!-- Filter tabs -->
    <div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;">
      <button class="btn btn-ghost btn-sm approval-tab-btn"
        id="ap-tab-pending"
        style="border-color:var(--accent);color:var(--accent);"
        onclick="loadApprovalsList('pending',this)">
        ⏳ Pending
        <span id="ap-pending-count" style="margin-left:4px;background:var(--danger);
          color:#fff;padding:1px 5px;border-radius:99px;font-size:9px;font-weight:800;">
        </span>
      </button>
      <button class="btn btn-ghost btn-sm approval-tab-btn"
        id="ap-tab-approved"
        onclick="loadApprovalsList('approved',this)">
        ✅ Approved
      </button>
      <button class="btn btn-ghost btn-sm approval-tab-btn"
        id="ap-tab-rejected"
        onclick="loadApprovalsList('rejected',this)">
        ❌ Rejected
      </button>
      <button class="btn btn-ghost btn-sm approval-tab-btn"
        id="ap-tab-all"
        onclick="loadApprovalsList('all',this)">
        📋 All
      </button>
    </div>

    <div id="approvals-list">
      <div class="empty-state"><div class="spinner lg"></div></div>
    </div>
  `;

  loadApprovalsList('pending', document.getElementById('ap-tab-pending'));
};

// ============================================================
// LOAD APPROVALS LIST
// ============================================================
window.loadApprovalsList = async function(statusFilter, btn) {
  // Update tab styles
  if (btn) {
    document.querySelectorAll('.approval-tab-btn').forEach(b => {
      b.style.borderColor = 'var(--border)';
      b.style.color       = 'var(--text2)';
    });
    btn.style.borderColor = 'var(--accent)';
    btn.style.color       = 'var(--accent)';
  }

  const list   = document.getElementById('approvals-list');
  if (!list) return;
  const isPriv = ['Admin','Executive'].includes(G.user?.role);

  list.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';

  try {
    let snap;

    // ✅ No orderBy to avoid needing composite index — sort client-side
    if (statusFilter === 'all') {
      snap = isPriv
        ? await db.collection('approvals').limit(150).get()
        : await db.collection('approvals')
            .where('requested_by', '==', G.user?.username || '')
            .limit(50).get();
    } else if (statusFilter === 'pending') {
      snap = isPriv
        ? await db.collection('approvals')
            .where('status', '==', 'pending').limit(100).get()
        : await db.collection('approvals')
            .where('requested_by', '==', G.user?.username || '')
            .where('status', '==', 'pending').limit(50).get();
    } else {
      snap = isPriv
        ? await db.collection('approvals')
            .where('status', '==', statusFilter).limit(100).get()
        : await db.collection('approvals')
            .where('requested_by', '==', G.user?.username || '')
            .where('status', '==', statusFilter).limit(50).get();
    }

    // ✅ Sort client-side — newest first
    const items = snap.docs
      .map(d => ({ id:d.id, ...d.data() }))
      .sort((a, b) => (b.created_at||0) - (a.created_at||0));

    // Update pending count badge
    if (statusFilter === 'pending') {
      const countEl = document.getElementById('ap-pending-count');
      if (countEl) countEl.textContent = items.length > 0 ? items.length : '';
      const ab = document.getElementById('badge-approvals');
      if (ab) {
        ab.textContent = items.length;
        ab.classList.toggle('hidden', items.length === 0);
      }
    }

    if (!items.length) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="es-icon">🔔</div>
          <p>No ${statusFilter === 'all' ? '' : statusFilter + ' '}approvals found</p>
          ${statusFilter === 'pending' ? `
            <p style="font-size:11px;color:var(--success);margin-top:8px;">
              ✅ All caught up!
            </p>` : ''}
        </div>`;
      return;
    }

    const typeIcons = {
      rate_change    : '💲',
      cancellation   : '❌',
      task_appeal    : '📝',
      expense        : '💰',
      blacklist      : '🚫',
      deposit_waiver : '🔓',
      general        : '🔔'
    };

    const typeColors = {
      rate_change    : 'rgba(245,158,11,0.1)',
      cancellation   : 'rgba(239,68,68,0.1)',
      task_appeal    : 'rgba(168,85,247,0.1)',
      expense        : 'rgba(34,197,94,0.1)',
      blacklist      : 'rgba(239,68,68,0.1)',
      deposit_waiver : 'rgba(59,130,246,0.1)',
      general        : 'rgba(100,116,139,0.1)'
    };

    list.innerHTML = items.map(a => {
      const isPending  = a.status === 'pending';
      const isApproved = a.status === 'approved';
      const isRejected = a.status === 'rejected';

      const borderColor = isPending  ? 'rgba(245,158,11,0.4)'
                        : isApproved ? 'rgba(34,197,94,0.3)'
                        : isRejected ? 'rgba(239,68,68,0.3)'
                        : 'var(--border)';

      const bgColor = isPending  ? 'rgba(245,158,11,0.04)'
                    : isApproved ? 'rgba(34,197,94,0.04)'
                    : isRejected ? 'rgba(239,68,68,0.04)'
                    : 'var(--surface2)';

      return `
        <div style="padding:14px;border-radius:var(--radius);margin-bottom:9px;
                    background:${bgColor};border:1px solid ${borderColor};">
          <div style="display:flex;align-items:flex-start;gap:11px;">

            <!-- Type icon -->
            <div style="width:40px;height:40px;border-radius:9px;flex-shrink:0;
                        background:${typeColors[a.type]||typeColors.general};
                        display:flex;align-items:center;justify-content:center;
                        font-size:20px;">
              ${typeIcons[a.type]||'🔔'}
            </div>

            <div style="flex:1;min-width:0;">
              <!-- Title row -->
              <div style="display:flex;align-items:center;gap:7px;
                          flex-wrap:wrap;margin-bottom:5px;">
                <span style="font-size:13px;font-weight:800;">
                  ${(a.type||'').replace(/_/g,' ').toUpperCase()}
                </span>
                <span class="pill pill-${a.status}">${a.status}</span>
                <span style="font-size:10px;color:var(--text3);">
                  ${getTimeAgo(a.created_at)}
                </span>
                ${a.branch ? `
                  <span style="font-size:10px;color:var(--text3);">
                    🏢 ${BRANCH_MAP[a.branch]||a.branch}
                  </span>` : ''}
              </div>

              <!-- Subject -->
              <div style="font-size:12px;font-weight:600;
                          margin-bottom:4px;color:var(--text);">
                ${a.subject || '—'}
              </div>

              <!-- Details -->
              <div style="font-size:11px;color:var(--text2);
                          margin-bottom:5px;line-height:1.5;">
                ${a.details || '—'}
              </div>

              <!-- Rate change comparison -->
              ${a.type === 'rate_change' && a.current_value && a.requested_value ? `
                <div style="display:flex;gap:9px;align-items:center;
                            margin-bottom:7px;font-size:11px;flex-wrap:wrap;">
                  <div style="padding:5px 9px;background:rgba(239,68,68,0.1);
                              border-radius:6px;">
                    <span style="color:var(--text3);">Current:</span>
                    <strong style="color:var(--danger);">
                      £${parseFloat(a.current_value||0).toLocaleString()}
                    </strong>
                  </div>
                  <span style="color:var(--text3);">→</span>
                  <div style="padding:5px 9px;background:rgba(34,197,94,0.1);
                              border-radius:6px;">
                    <span style="color:var(--text3);">Requested:</span>
                    <strong style="color:var(--success);">
                      £${parseFloat(a.requested_value||0).toLocaleString()}
                    </strong>
                  </div>
                  ${a.current_value && a.requested_value ? `
                    <div style="padding:5px 9px;background:rgba(245,158,11,0.1);
                                border-radius:6px;font-size:10px;">
                      Discount:
                      <strong style="color:var(--warning);">
                        ${parseFloat(a.current_value)>0
                          ? ((parseFloat(a.current_value)-parseFloat(a.requested_value))
                             /parseFloat(a.current_value)*100).toFixed(1)+'%'
                          : '—'}
                      </strong>
                    </div>` : ''}
                </div>` : ''}

              <!-- Reason if provided -->
              ${a.reason ? `
                <div style="font-size:11px;color:var(--text3);
                            margin-bottom:5px;font-style:italic;">
                  💬 "${a.reason}"
                </div>` : ''}

              <!-- Meta -->
              <div style="display:flex;gap:13px;font-size:10px;
                          color:var(--text3);flex-wrap:wrap;">
                <span>
                  👤 By:
                  <strong style="color:var(--accent);">${a.requested_by||'—'}</strong>
                </span>
                ${a.decided_by ? `
                  <span>✓ Decided by: <strong>${a.decided_by}</strong></span>` : ''}
                ${a.decided_at ? `
                  <span>🕐 ${new Date(a.decided_at).toLocaleString('en-GB',{
                    timeZone:'Africa/Cairo'
                  })}</span>` : ''}
              </div>

              <!-- Admin note -->
              ${a.admin_note ? `
                <div style="margin-top:9px;padding:8px 11px;
                            background:rgba(245,158,11,0.08);
                            border:1px solid rgba(245,158,11,0.25);
                            border-radius:7px;font-size:11px;">
                  <strong>Admin Note:</strong> ${a.admin_note}
                </div>` : ''}

              <!-- Quick links -->
              ${a.linked_ref && (a.type==='cancellation'||a.type==='rate_change'||a.type==='deposit_waiver') ? `
                <div style="margin-top:7px;">
                  <button class="btn btn-ghost btn-xs"
                    onclick="openOrderDetail('${a.linked_ref}')">
                    📋 View Order
                  </button>
                </div>` : ''}
              ${a.linked_ref && a.type==='task_appeal' ? `
                <div style="margin-top:7px;">
                  <button class="btn btn-ghost btn-xs"
                    onclick="closeModal();showPage('tasks')">
                    ✅ View Tasks
                  </button>
                </div>` : ''}
            </div>

            <!-- Admin action buttons -->
            ${isPriv && isPending ? `
              <div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0;">
                <button class="btn btn-success btn-sm"
                  onclick="decideApproval('${a.id}','approved')">
                  ✅ Approve
                </button>
                <button class="btn btn-danger btn-sm"
                  onclick="openRejectModal('${a.id}')">
                  ❌ Reject
                </button>
              </div>` : ''}
          </div>
        </div>`;
    }).join('');

  } catch (e) {
    list.innerHTML = `
      <div class="empty-state">
        <p>Could not load approvals: ${e.message}</p>
        <button class="btn btn-ghost btn-sm" style="margin-top:12px;"
          onclick="loadApprovalsList('${statusFilter}')">
          🔄 Retry
        </button>
      </div>`;
    console.warn('Approvals error:', e.message);
  }
};

// ============================================================
// DECIDE APPROVAL
// ============================================================
window.decideApproval = async function(approvalId, decision) {
  try {
    const snap = await db.collection('approvals').doc(approvalId).get();
    if (!snap.exists) return;
    const a = snap.data();

    await db.collection('approvals').doc(approvalId).update({
      status     : decision,
      decided_by : G.user?.username || '',
      decided_at : Date.now()
    });

    // ── Execute approved actions ───────────────────────────
    if (decision === 'approved') {

      // Close order
      if (a.type === 'cancellation' && a.linked_ref) {
        await db.collection('bookings').doc(a.linked_ref).update({
          'حالة الطلب': 'Closed',
          'closed'     : true,
          '_sys_updated': Date.now()
        });
        try {
          const bookSnap = await db.collection('bookings').doc(a.linked_ref).get();
          if (bookSnap.exists) {
            const carId = bookSnap.data()['كود السيارة'];
            if (carId) {
              await db.collection('fleet').doc(String(carId))
                .update({ status:'available', _sys_updated:Date.now() })
                .catch(()=>{});
            }
          }
        } catch (_) {}
        _updateLocalOrderCache(a.linked_ref, { 'حالة الطلب':'Closed', closed:true });
        toast('Order closed as approved', 'success');
      }

      // Apply rate change
      if (a.type === 'rate_change' && a.linked_ref && a.requested_value) {
        await db.collection('bookings').doc(a.linked_ref).update({
          'سعر السيارة اليومي بالجنيه المصري': String(a.requested_value),
          '_sys_updated': Date.now()
        });
        _updateLocalOrderCache(a.linked_ref, {
          'سعر السيارة اليومي بالجنيه المصري': String(a.requested_value)
        });
        toast('Rate change applied to booking', 'success');
      }

      // Cancel task
      if (a.type === 'task_appeal' && a.linked_ref) {
        await db.collection('tasks').doc(a.linked_ref).update({
          status       : 'cancelled',
          appeal_status: 'approved'
        });
        toast('Task appeal approved — task cancelled', 'success');
      }

      // Deposit waiver
      if (a.type === 'deposit_waiver' && a.linked_ref) {
        await db.collection('bookings').doc(a.linked_ref).update({
          'deposit_waiver': true, '_sys_updated': Date.now()
        });
        toast('Deposit waiver applied', 'success');
      }
    }

    // ── Notify requester ───────────────────────────────────
    if (a.requested_by) {
      await _createApprovalNotification(
        a.requested_by,
        decision === 'approved' ? 'approval' : 'general',
        `Your ${(a.type||'').replace(/_/g,' ')} request was ${decision} by ${G.user?.username}`,
        'approvals',
        approvalId
      );
    }

    await logAction('EDIT', 'Approvals',
      `${decision.toUpperCase()}: ${a.type} from ${a.requested_by}`);

    toast(`Request ${decision}!`, decision === 'approved' ? 'success' : 'error');
    loadApprovals();

  } catch (e) {
    toast('Decision failed: ' + e.message, 'error');
  }
};

// ============================================================
// REJECT MODAL
// ============================================================
window.openRejectModal = function(approvalId) {
  const html = `
    <div style="margin-bottom:13px;font-size:11px;color:var(--text3);">
      Provide a reason for rejection.
      The employee will be notified with your note.
    </div>
    <div class="field">
      <label>Rejection Reason *</label>
      <textarea id="reject-note"
        placeholder="Explain why this request is rejected. Be clear and specific..."
        style="min-height:90px;width:100%;padding:8px;background:var(--surface2);
               border:1px solid var(--border);border-radius:8px;color:var(--text);
               resize:vertical;"></textarea>
    </div>
    <div style="display:flex;gap:7px;margin-top:13px;">
      <button class="btn btn-danger" style="flex:1;"
        onclick="submitRejection('${approvalId}')">
        ❌ Confirm Rejection
      </button>
      <button class="btn btn-ghost" style="flex:1;"
        onclick="closeModal()">Cancel</button>
    </div>`;
  openModal('❌ Reject Request', html);
};

window.submitRejection = async function(approvalId) {
  const note = document.getElementById('reject-note')?.value.trim();
  if (!note) { toast('Please provide a rejection reason', 'error'); return; }

  try {
    const snap = await db.collection('approvals').doc(approvalId).get();
    if (!snap.exists) return;
    const a = snap.data();

    await db.collection('approvals').doc(approvalId).update({
      status     : 'rejected',
      decided_by : G.user?.username || '',
      decided_at : Date.now(),
      admin_note : note
    });

    // Return task to pending if task appeal rejected
    if (a.type === 'task_appeal' && a.linked_ref) {
      await db.collection('tasks').doc(a.linked_ref).update({
        status       : 'pending',
        appeal_status: 'rejected'
      });
    }

    // Notify requester
    if (a.requested_by) {
      await _createApprovalNotification(
        a.requested_by,
        'general',
        `Your ${(a.type||'').replace(/_/g,' ')} request was rejected.${
          note ? ` Reason: ${note}` : ''}`,
        'approvals',
        approvalId
      );
    }

    await logAction('EDIT', 'Approvals',
      `REJECTED: ${a.type} from ${a.requested_by}. Note: ${note}`);

    toast('Request rejected', 'error');
    closeModal();
    loadApprovals();

  } catch (e) {
    toast('Rejection failed: ' + e.message, 'error');
  }
};

// ============================================================
// NOTIFICATION HELPER — internal to approvals
// ✅ Defined here so createNotification is always available
// ============================================================
async function _createApprovalNotification(
  toUser, type, message, module, linkedRef
) {
  try {
    await db.collection('reminders').add({
      assigned_to: toUser,
      category   : type === 'approval' ? 'Approval Update' : 'System Notification',
      note       : message,
      remind_at  : Date.now(),
      module     : module || 'approvals',
      linked_ref : linkedRef || '',
      fired      : false,
      dismissed  : false,
      created_at : Date.now(),
      created_by : G.user?.username || 'system'
    });
  } catch (_) {}
}

// ✅ Global alias — called by other modules
window.createNotification = async function(
  toUser, type, message, module, linkedRef
) {
  return _createApprovalNotification(toUser, type, message, module, linkedRef);
};

// ============================================================
// LOCAL CACHE UPDATER — helper
// ============================================================
function _updateLocalOrderCache(orderId, updates) {
  const idx = (window.allOrders||[]).findIndex(o => o.id === orderId);
  if (idx > -1) Object.assign(window.allOrders[idx], updates);
  const idx2 = (G.bookings||[]).findIndex(b => b.id === orderId);
  if (idx2 > -1) Object.assign(G.bookings[idx2], updates);
}

// ============================================================
// REQUEST HELPERS — called from other modules
// ============================================================

// ✅ Notify ALL admins (not just one)
async function _notifyAllAdmins(message, module, linkedRef) {
  try {
    const adminSnap = await db.collection('users').get();
    const promises  = [];
    adminSnap.docs.forEach(d => {
      const u = d.data();
      if (['Admin','Executive'].includes(u.role)) {
        promises.push(_createApprovalNotification(
          d.id, 'approval', message, module, linkedRef
        ));
      }
    });
    await Promise.allSettled(promises);
  } catch (_) {}
}

window.requestRateChangeApproval = async function(
  orderId, orderNo, origRate, newRate, reason
) {
  const discountPct = origRate > 0
    ? ((origRate - newRate) / origRate * 100).toFixed(1) : 0;

  const ref = await db.collection('approvals').add({
    type           : 'rate_change',
    requested_by   : G.user?.username || '',
    branch         : G.user?.branch   || '',
    subject        : `Rate change for Order #${orderNo}`,
    details        : `Original: ${fmtMoney(origRate)} → Requested: ${fmtMoney(newRate)} (${discountPct}% discount)`,
    linked_ref     : orderId,
    current_value  : String(origRate),
    requested_value: String(newRate),
    reason         : reason || 'Rate change requested',
    status         : 'pending',
    created_at     : Date.now()
  });

  // ✅ Notify ALL admins
  await _notifyAllAdmins(
    `Rate change ${discountPct}% from ${G.user?.username}: Order #${orderNo}`,
    'approvals', ref.id
  );

  toast(
    `Rate change ${discountPct}% exceeds threshold. Sent to all admins.`,
    'warning', 6000
  );
};

window.requestCloseOrderApproval = async function(orderId, orderNo, clientName) {
  const ref = await db.collection('approvals').add({
    type        : 'cancellation',
    requested_by: G.user?.username || '',
    branch      : G.user?.branch   || '',
    subject     : `Close Order #${orderNo}`,
    details     : `Request to close order for ${clientName || 'client'}`,
    linked_ref  : orderId,
    status      : 'pending',
    created_at  : Date.now()
  });

  await _notifyAllAdmins(
    `Order close request from ${G.user?.username}: #${orderNo}`,
    'approvals', ref.id
  );

  toast('Close request submitted for Admin approval', 'info');
};

window.requestDepositWaiver = async function(orderId, orderNo, reason) {
  const ref = await db.collection('approvals').add({
    type        : 'deposit_waiver',
    requested_by: G.user?.username || '',
    branch      : G.user?.branch   || '',
    subject     : `Deposit waiver for Order #${orderNo}`,
    details     : reason || 'Deposit waiver requested',
    linked_ref  : orderId,
    status      : 'pending',
    created_at  : Date.now()
  });

  await _notifyAllAdmins(
    `Deposit waiver request from ${G.user?.username}: Order #${orderNo}`,
    'approvals', ref.id
  );

  toast('Deposit waiver request submitted for Admin approval', 'info');
};

// ✅ General purpose approval request — usable from any module
window.submitApprovalRequest = async function(type, subject, details, linkedRef, extraData) {
  const ref = await db.collection('approvals').add({
    type        : type,
    requested_by: G.user?.username || '',
    branch      : G.user?.branch   || '',
    subject,
    details,
    linked_ref  : linkedRef || '',
    status      : 'pending',
    created_at  : Date.now(),
    ...(extraData || {})
  });

  await _notifyAllAdmins(
    `New ${type.replace(/_/g,' ')} request from ${G.user?.username}: ${subject}`,
    'approvals', ref.id
  );

  toast('Request submitted for Admin approval', 'info');
  return ref.id;
};
