// ============================================================
// modules/approvals.js
// Approvals workflow — all types: rate_change, cancellation,
// task_appeal, deposit_waiver, expense, blacklist.
// Approve/reject with notes, auto-execute approved actions,
// requester notifications, pending badge.
// ============================================================

// ============================================================
// ENTRY POINT
// ============================================================

window.renderApprovals = function() {
  renderPageLoading('page-approvals', '🔔', 'Approvals');
  loadApprovals();
};

window.loadApprovals = async function() {
  const el     = document.getElementById('page-approvals');
  if (!el) return;
  const isPriv = ['Admin','Executive'].includes(G.user?.role);

  el.innerHTML = `
    <div class="section-header">
      <div>
        <h2>🔔 Approvals</h2>
        <p>Approval requests from all branches</p>
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

    <div id="approvals-list"></div>`;

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

    if (statusFilter === 'all') {
      if (isPriv) {
        snap = await db.collection('approvals').limit(150).get();
      } else {
        snap = await db.collection('approvals')
          .where('requested_by', '==', G.user.username)
          .limit(50).get();
      }
    } else if (statusFilter === 'pending') {
      if (isPriv) {
        snap = await db.collection('approvals')
          .where('status', '==', 'pending').limit(100).get();
      } else {
        snap = await db.collection('approvals')
          .where('requested_by', '==', G.user.username)
          .where('status', '==', 'pending').limit(50).get();
      }
    } else {
      if (isPriv) {
        snap = await db.collection('approvals')
          .where('status', '==', statusFilter).limit(100).get();
      } else {
        snap = await db.collection('approvals')
          .where('requested_by', '==', G.user.username)
          .where('status', '==', statusFilter).limit(50).get();
      }
    }

    if (snap.empty) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="es-icon">🔔</div>
          <p>No ${statusFilter === 'all' ? '' : statusFilter + ' '}approvals found</p>
        </div>`;
      return;
    }

    // Sort by created_at descending (client-side)
    const items = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a,b) => (b.created_at || 0) - (a.created_at || 0));

    const typeIcons = {
      rate_change:    '💲',
      cancellation:   '❌',
      task_appeal:    '📝',
      expense:        '💰',
      blacklist:      '🚫',
      deposit_waiver: '🔓',
      general:        '🔔'
    };

    const typeColors = {
      rate_change:    'rgba(245,158,11,0.1)',
      cancellation:   'rgba(239,68,68,0.1)',
      task_appeal:    'rgba(168,85,247,0.1)',
      expense:        'rgba(34,197,94,0.1)',
      blacklist:      'rgba(239,68,68,0.1)',
      deposit_waiver: 'rgba(59,130,246,0.1)',
      general:        'rgba(100,116,139,0.1)'
    };

    list.innerHTML = items.map(a => {
      const isPending  = a.status === 'pending';
      const isApproved = a.status === 'approved';
      const isRejected = a.status === 'rejected';
      const borderColor= isPending  ? 'rgba(245,158,11,0.3)' :
                         isApproved ? 'rgba(34,197,94,0.2)'   :
                         isRejected ? 'rgba(239,68,68,0.2)'   :
                                      'var(--border)';

      return `
        <div style="padding:14px;border-radius:var(--radius);
          margin-bottom:9px;background:var(--surface2);
          border:1px solid ${borderColor};">

          <div style="display:flex;align-items:flex-start;gap:11px;">

            <!-- Type icon -->
            <div style="width:40px;height:40px;border-radius:9px;
              flex-shrink:0;
              background:${typeColors[a.type] || typeColors.general};
              display:flex;align-items:center;justify-content:center;
              font-size:20px;">
              ${typeIcons[a.type] || '🔔'}
            </div>

            <div style="flex:1;">
              <!-- Title row -->
              <div style="display:flex;align-items:center;gap:7px;
                flex-wrap:wrap;margin-bottom:5px;">
                <span style="font-size:13px;font-weight:800;">
                  ${(a.type || '').replace(/_/g,' ').toUpperCase()}
                </span>
                <span class="pill pill-${a.status}">${a.status}</span>
                <span style="font-size:10px;color:var(--text3);">
                  ${getTimeAgo(a.created_at)}
                </span>
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

              <!-- Rate change specific -->
              ${a.type === 'rate_change' && a.current_value && a.requested_value ? `
                <div style="display:flex;gap:9px;align-items:center;
                  margin-bottom:7px;font-size:11px;">
                  <div style="padding:5px 9px;background:rgba(239,68,68,0.1);
                    border-radius:6px;">
                    <span style="color:var(--text3);">Current:</span>
                    <strong style="color:var(--danger);">
                      ${a.current_value}
                    </strong>
                  </div>
                  <span style="color:var(--text3);">→</span>
                  <div style="padding:5px 9px;background:rgba(34,197,94,0.1);
                    border-radius:6px;">
                    <span style="color:var(--text3);">Requested:</span>
                    <strong style="color:var(--success);">
                      ${a.requested_value}
                    </strong>
                  </div>
                </div>` : ''}

              <!-- Meta -->
              <div style="display:flex;gap:13px;font-size:10px;
                color:var(--text3);flex-wrap:wrap;">
                <span>
                  👤 Requested by:
                  <strong style="color:var(--accent);">
                    ${a.requested_by || '—'}
                  </strong>
                </span>
                ${a.branch ? `
                  <span>🏢 ${BRANCH_MAP[a.branch] || a.branch}</span>` : ''}
                ${a.decided_by ? `
                  <span>✓ Decided by: <strong>${a.decided_by}</strong></span>` : ''}
                ${a.decided_at ? `
                  <span>🕐 ${new Date(a.decided_at).toLocaleString('en-GB')}</span>` : ''}
              </div>

              <!-- Admin note -->
              ${a.admin_note ? `
                <div style="margin-top:9px;padding:8px 11px;
                  background:rgba(245,158,11,0.08);
                  border:1px solid rgba(245,158,11,0.25);
                  border-radius:7px;font-size:11px;">
                  <strong>Admin Note:</strong> ${a.admin_note}
                </div>` : ''}

              <!-- Quick link to order -->
              ${a.linked_ref && a.type === 'cancellation' ? `
                <div style="margin-top:7px;">
                  <button class="btn btn-ghost btn-xs"
                    onclick="openOrderDetail('${a.linked_ref}')">
                    📋 View Order #${a.linked_ref}
                  </button>
                </div>` : ''}

              <!-- Quick link to task appeal -->
              ${a.linked_ref && a.type === 'task_appeal' ? `
                <div style="margin-top:7px;">
                  <button class="btn btn-ghost btn-xs"
                    onclick="showPage('tasks')">
                    ✅ View Tasks
                  </button>
                </div>` : ''}
            </div>

            <!-- Admin action buttons -->
            ${isPriv && isPending ? `
              <div style="display:flex;flex-direction:column;
                gap:5px;flex-shrink:0;">
                <button class="btn btn-success btn-xs"
                  onclick="decideApproval('${a.id}','approved')">
                  ✅ Approve
                </button>
                <button class="btn btn-danger btn-xs"
                  onclick="openRejectModal('${a.id}')">
                  ❌ Reject
                </button>
              </div>` : ''}

          </div>
        </div>`;
    }).join('');

    // Update badge
    if (statusFilter === 'pending') {
      const ab = document.getElementById('badge-approvals');
      if (ab) {
        ab.textContent = items.length;
        ab.classList.toggle('hidden', items.length === 0);
      }
    }

  } catch (e) {
    list.innerHTML = `
      <div class="empty-state">
        <p>Could not load approvals: ${e.message}</p>
      </div>`;
    console.warn('Approvals error:', e);
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
      status:      decision,
      decided_by:  G.user.username,
      decided_at:  Date.now()
    });

    // ---- Execute approved actions automatically ----
    if (decision === 'approved') {

      // Close order
      if (a.type === 'cancellation' && a.linked_ref) {
        await db.collection('bookings').doc(a.linked_ref).update({
          'حالة الطلب': 'Closed',
          'closed':      true,
          '_sys_updated': Date.now()
        });
        // Update car status
        try {
          const bookSnap = await db.collection('bookings')
            .doc(a.linked_ref).get();
          if (bookSnap.exists) {
            const carId = bookSnap.data()['كود السيارة'];
            if (carId) {
              await db.collection('fleet')
                .doc(String(carId))
                .update({ status: 'available', _sys_updated: Date.now() })
                .catch(() => {});
            }
          }
        } catch (e) { /* silent */ }
        // Update local cache
        const idx  = allOrders.findIndex(o => o.id === a.linked_ref);
        if (idx > -1) {
          allOrders[idx]['حالة الطلب'] = 'Closed';
          allOrders[idx].closed        = true;
        }
        const idx2 = G.bookings.findIndex(b => b.id === a.linked_ref);
        if (idx2 > -1) {
          G.bookings[idx2]['حالة الطلب'] = 'Closed';
          G.bookings[idx2].closed        = true;
        }
        toast('Order closed as approved', 'success');
      }

      // Apply rate change
      if (a.type === 'rate_change' && a.linked_ref && a.requested_value) {
        await db.collection('bookings').doc(a.linked_ref).update({
          'سعر السيارة اليومي بالجنيه المصري': String(a.requested_value),
          '_sys_updated': Date.now()
        });
        const idx = allOrders.findIndex(o => o.id === a.linked_ref);
        if (idx > -1) {
          allOrders[idx]['سعر السيارة اليومي بالجنيه المصري'] = String(a.requested_value);
        }
        toast('Rate change applied to booking', 'success');
      }

      // Cancel task (task appeal approved)
      if (a.type === 'task_appeal' && a.linked_ref) {
        await db.collection('tasks').doc(a.linked_ref).update({
          status:        'cancelled',
          appeal_status: 'approved'
        });
        toast('Task appeal approved — task cancelled', 'success');
      }

      // Apply deposit waiver
      if (a.type === 'deposit_waiver' && a.linked_ref) {
        await db.collection('bookings').doc(a.linked_ref).update({
          'deposit_waiver': true,
          '_sys_updated':   Date.now()
        });
        toast('Deposit waiver applied', 'success');
      }
    }

    // Notify requester
    if (a.requested_by) {
      createNotification(
        a.requested_by,
        decision === 'approved' ? 'approval' : 'general',
        `Your ${(a.type || '').replace(/_/g,' ')} request was ` +
        `${decision} by ${G.user.username}`,
        'approvals',
        approvalId
      );
    }

    await logAction('EDIT', 'Approvals',
      `${decision.toUpperCase()}: ${a.type} from ${a.requested_by}`);

    toast(`Request ${decision}!`,
      decision === 'approved' ? 'success' : 'error');

    loadApprovals();

  } catch (e) {
    toast('Decision failed: ' + e.message, 'error');
  }
};

// ============================================================
// REJECT MODAL (with admin note)
// ============================================================

window.openRejectModal = function(approvalId) {
  const html = `
    <div style="margin-bottom:13px;font-size:11px;color:var(--text3);">
      Provide a reason for rejection.
      The employee will be notified with your note.
    </div>
    <div class="field">
      <label>Rejection Reason</label>
      <textarea id="reject-note"
        placeholder="Explain why this request is rejected.
Be clear and specific..."
        style="min-height:90px;"></textarea>
    </div>
    <div style="display:flex;gap:7px;margin-top:13px;">
      <button class="btn btn-danger"
        onclick="submitRejection('${approvalId}')">
        ❌ Confirm Rejection
      </button>
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    </div>`;

  openModal('❌ Reject Request', html);
};

window.submitRejection = async function(approvalId) {
  const note = document.getElementById('reject-note')?.value.trim();

  try {
    const snap = await db.collection('approvals').doc(approvalId).get();
    const a    = snap.data();

    await db.collection('approvals').doc(approvalId).update({
      status:      'rejected',
      decided_by:  G.user.username,
      decided_at:  Date.now(),
      admin_note:  note || ''
    });

    // Return task to pending if task appeal rejected
    if (a.type === 'task_appeal' && a.linked_ref) {
      await db.collection('tasks').doc(a.linked_ref).update({
        status:        'pending',
        appeal_status: 'rejected'
      });
    }

    // Notify requester
    if (a.requested_by) {
      createNotification(
        a.requested_by,
        'general',
        `Your ${(a.type || '').replace(/_/g,' ')} request was rejected.` +
        (note ? ` Reason: ${note}` : ''),
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
// REQUEST HELPERS
// Called from other modules to create approval requests
// ============================================================

/**
 * Submit a rate change approval request
 * Called from orders.js saveOrderEdit() when discount exceeds threshold
 */
window.requestRateChangeApproval = async function(
  orderId, orderNo, origRate, newRate, reason
) {
  const discountPct = origRate > 0
    ? ((origRate - newRate) / origRate * 100).toFixed(1)
    : 0;

  await db.collection('approvals').add({
    type:            'rate_change',
    requested_by:    G.user.username,
    branch:          G.user.branch,
    subject:        `Rate change for Order #${orderNo}`,
    details:        `Original: ${fmtMoney(origRate)} → Requested: ${fmtMoney(newRate)} (${discountPct}% discount)`,
    linked_ref:      orderId,
    current_value:   String(origRate),
    requested_value: String(newRate),
    reason:          reason || 'Rate change requested',
    status:          'pending',
    created_at:      Date.now()
  });

  // Notify all admins
  try {
    const adminSnap = await db.collection('users').get();
    adminSnap.docs.forEach(d => {
      if (['Admin','Executive'].includes(d.data().role)) {
        createNotification(
          d.id,
          'approval',
          `Rate change request from ${G.user.username} for Order #${orderNo}`,
          'approvals',
          orderId
        );
      }
    });
  } catch (e) { /* silent */ }

  toast(
    `Rate change ${discountPct}% exceeds threshold. Approval submitted.`,
    'warning',
    6000
  );
};

/**
 * Submit an order close approval request
 * Called from orders.js requestCloseOrder() for non-privileged users
 */
window.requestCloseOrderApproval = async function(orderId, orderNo, clientName) {
  await db.collection('approvals').add({
    type:         'cancellation',
    requested_by:  G.user.username,
    branch:        G.user.branch,
    subject:      `Close Order #${orderNo}`,
    details:      `Request to close order for ${clientName || 'client'}`,
    linked_ref:    orderId,
    status:        'pending',
    created_at:    Date.now()
  });

  try {
    const adminSnap = await db.collection('users').get();
    adminSnap.docs.forEach(d => {
      if (['Admin','Executive'].includes(d.data().role)) {
        createNotification(
          d.id,
          'approval',
          `Order close request from ${G.user.username}: #${orderNo}`,
          'approvals',
          orderId
        );
      }
    });
  } catch (e) { /* silent */ }

  toast('Close request submitted for Admin approval', 'info');
};

/**
 * Submit a deposit waiver approval request
 */
window.requestDepositWaiver = async function(orderId, orderNo, reason) {
  await db.collection('approvals').add({
    type:         'deposit_waiver',
    requested_by:  G.user.username,
    branch:        G.user.branch,
    subject:      `Deposit waiver for Order #${orderNo}`,
    details:       reason || 'Deposit waiver requested',
    linked_ref:    orderId,
    status:        'pending',
    created_at:    Date.now()
  });

  try {
    const adminSnap = await db.collection('users').get();
    adminSnap.docs.forEach(d => {
      if (['Admin','Executive'].includes(d.data().role)) {
        createNotification(
          d.id,
          'approval',
          `Deposit waiver request from ${G.user.username}: Order #${orderNo}`,
          'approvals',
          orderId
        );
      }
    });
  } catch (e) { /* silent */ }

  toast('Deposit waiver request submitted for Admin approval', 'info');
};
