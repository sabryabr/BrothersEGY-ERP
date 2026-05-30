// ============================================================
// core/toast.js v4.1
// Toast notifications, WhatsApp alerts, reminder checker
// ============================================================

// ============================================================
// TOAST NOTIFICATION SYSTEM
// ============================================================
const _recentToasts = new Set();

/**
 * Show a toast notification
 * @param {string} msg      - Message to display
 * @param {string} type     - 'success' | 'error' | 'warning' | 'info'
 * @param {number} duration - ms before auto-dismiss (default 4500)
 */
window.toast = function(msg, type, duration) {
  type     = type     || 'info';
  duration = duration || 4500;

  // Deduplicate — same type+message within 2 seconds shows only once
  const key = `${type}:${String(msg).slice(0, 60)}`;
  if (_recentToasts.has(key)) return;
  _recentToasts.add(key);
  setTimeout(() => _recentToasts.delete(key), 2000);

  const icons = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' };

  const wrap = document.getElementById('toast-wrap');
  if (!wrap) return;

  const el      = document.createElement('div');
  el.className  = `toast ${type}`;
  el.innerHTML  = `
    <span>${icons[type] || ''}</span>
    <span style="flex:1">${msg}</span>
    <button onclick="this.parentElement.remove()"
      style="background:none;border:none;color:inherit;
             cursor:pointer;font-size:14px;padding:0 0 0 8px;
             opacity:0.7;flex-shrink:0;">✕</button>`;
  wrap.appendChild(el);

  setTimeout(() => {
    el.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }, duration);
};

// ============================================================
// NOTIFICATION SYSTEM
//
// Brothers EGY uses TWO notification mechanisms:
//
// 1. `notifications` collection — in-app bell dropdown
//    Created by toast.js createNotification()
//    Read by loadNotifications() → renders in dropdown
//
// 2. `reminders` collection — time-based reminders + approvals
//    Created by orders.js openReminderForm() and approvals.js
//    Read by auth.js loadNotifications() → fires toasts at due time
//
// Both are shown in the bell dropdown for the current user.
// ============================================================

/**
 * Create an in-app notification for a specific user
 * Saves to `notifications` collection AND optionally sends WhatsApp
 */
window.createNotification = async function(
  forUser, type, message, linkedModule, linkedId
) {
  if (!forUser || !message) return;
  try {
    await db.collection('notifications').add({
      for_user     : forUser,
      type,
      message,
      read         : false,
      linked_module: linkedModule || '',
      linked_id    : linkedId    || '',
      timestamp    : Date.now()
    });
    // ✅ Also try WhatsApp if configured
    sendWhatsApp(forUser, `Brothers EGY: ${message}`);
  } catch (e) {
    console.warn('createNotification failed:', e.message);
  }
};

/**
 * Load in-app notifications for the current user
 * Listens to `notifications` collection in realtime
 * Also merges recent `reminders` that are unfired
 */
window.loadNotifications = function() {
  if (!G.user) return;

  if (window.notifUnsub) {
    try { window.notifUnsub(); } catch (_) {}
    window.notifUnsub = null;
  }

  try {
    window.notifUnsub = db.collection('notifications')
      .where('for_user', '==', G.user.username)
      .orderBy('timestamp', 'desc')
      .limit(20)
      .onSnapshot(snap => {
        const items  = snap.docs.map(d => ({ id:d.id, ...d.data() }));
        const unread = items.filter(n => !n.read).length;
        G.notifUnread= unread;

        const badge = document.getElementById('notif-badge');
        if (badge) {
          if (unread > 0) {
            badge.textContent = unread > 9 ? '9+' : unread;
            badge.classList.remove('hidden');
          } else {
            badge.classList.add('hidden');
          }
        }

        renderNotifList(items);
      }, e => console.warn('Notifications error:', e.message));

    G.unsubscribers.push(window.notifUnsub);

  } catch (e) {
    console.warn('loadNotifications failed:', e.message);
  }
};

/**
 * Render the notifications dropdown list
 */
window.renderNotifList = function(items) {
  const list = document.getElementById('notif-list');
  if (!list) return;

  if (!items.length) {
    list.innerHTML = '<div class="notif-empty">No notifications</div>';
    return;
  }

  const icons = {
    task    : '✅',
    approval: '🔔',
    overdue : '⚠️',
    expiry  : '📅',
    receipt : '🧾',
    general : 'ℹ️',
    reminder: '🔔',
    session : '🔐'
  };
  const colors = {
    task    : 'rgba(34,197,94,0.2)',
    approval: 'rgba(245,158,11,0.2)',
    overdue : 'rgba(239,68,68,0.2)',
    expiry  : 'rgba(249,115,22,0.2)',
    receipt : 'rgba(59,130,246,0.2)',
    general : 'rgba(100,116,139,0.2)',
    reminder: 'rgba(168,85,247,0.2)',
    session : 'rgba(59,130,246,0.2)'
  };

  list.innerHTML = items.map(n => `
    <div class="notif-item ${n.read ? '' : 'unread'}"
         data-notif-id="${n.id}"
         data-module="${n.linked_module || ''}"
         data-linked-id="${n.linked_id || ''}">
      <div class="notif-icon"
           style="background:${colors[n.type] || colors.general}">
        ${icons[n.type] || 'ℹ️'}
      </div>
      <div class="notif-body">
        <div class="n-msg">${n.message}</div>
        <div class="n-time">
          ${new Date(n.timestamp).toLocaleString('en-GB', {
            timeZone: 'Africa/Cairo'
          })}
        </div>
      </div>
    </div>`).join('');

  list.querySelectorAll('.notif-item').forEach(el => {
    el.addEventListener('click', () => {
      const id     = el.dataset.notifId;
      const module = el.dataset.module;
      handleNotifClick(id, module);
    });
  });
};

/**
 * Handle notification click — marks read, navigates
 */
window.handleNotifClick = async function(id, module) {
  try {
    await db.collection('notifications').doc(id).update({ read:true });
  } catch (_) {}

  document.getElementById('notif-dropdown')?.classList.remove('open');
  if (module && typeof showPage === 'function') showPage(module);
};

/**
 * Mark all notifications as read
 */
window.markAllRead = async function() {
  if (!G.user) return;
  try {
    const snap = await db.collection('notifications')
      .where('for_user', '==', G.user.username)
      .where('read',     '==', false)
      .get();
    const batch = db.batch();
    snap.docs.forEach(d => batch.update(d.ref, { read:true }));
    await batch.commit();
  } catch (e) {
    console.warn('markAllRead failed:', e.message);
  }
};

// ============================================================
// WHATSAPP (CallMeBot) — best-effort, fails silently
// ============================================================
window.sendWhatsApp = async function(username, message) {
  const apiKey = G.settings?.callmebotKeys?.[username];
  const phone  = G.settings?.callmebotPhones?.[username];
  if (!apiKey || !phone) return;
  try {
    await fetch(
      `https://api.callmebot.com/whatsapp.php?phone=${phone}` +
      `&text=${encodeURIComponent(message)}&apikey=${apiKey}`,
      { mode:'no-cors' }
    );
  } catch (_) {}
};

/**
 * Send WhatsApp to ALL admins — used for critical alerts
 */
window.sendWhatsAppToAdmins = async function(message) {
  if (!G.settings?.callmebotKeys) return;
  Object.keys(G.settings.callmebotKeys).forEach(username => {
    sendWhatsApp(username, message);
  });
};

// ============================================================
// REMINDER CHECKER
// Polls `reminders` collection for due items every 60 seconds
// ✅ FIXED: query uses `assigned_to` not `created_by`
// ============================================================
window.startReminderChecker = function() {
  stopReminderChecker();

  window.reminderInterval = setInterval(async () => {
    if (!G.user?.username) return;
    try {
      const now  = Date.now();
      const snap = await db.collection('reminders')
        .where('assigned_to', '==', G.user.username)
        .where('fired',       '==', false)
        .where('dismissed',   '==', false)
        .get().catch(() => null);

      if (!snap) return;

      snap.docs.forEach(async doc => {
        const r = doc.data();
        if (r.remind_at && r.remind_at <= now) {
          // Find order label
          const order = (window.allOrders || G.bookings || [])
            .find(o => o.id === r.order_id);
          const label = order
            ? `Order #${order['No.'] || r.order_id}`
            : (r.order_id ? `Order ${r.order_id}` : '');

          toast(
            `🔔 Reminder: ${r.category||'Task'}${label?' — '+label:''}${
              r.note ? ' — ' + r.note : ''}`,
            'info', 8000
          );

          await doc.ref.update({ fired:true }).catch(() => {});

          // Create in-app notification
          createNotification(
            G.user.username,
            'reminder',
            `${r.category||'Reminder'}${label?' — '+label:''}${
              r.note ? ': ' + r.note : ''}`,
            'order-book',
            r.order_id || ''
          );
        }
      });
    } catch (_) {}
  }, 60000);

  // Run immediately on start
  setTimeout(async () => {
    if (!G.user?.username) return;
    try {
      const now  = Date.now();
      const snap = await db.collection('reminders')
        .where('assigned_to', '==', G.user.username)
        .where('fired',       '==', false)
        .where('dismissed',   '==', false)
        .get().catch(() => null);

      if (!snap) return;

      snap.docs.forEach(async doc => {
        const r = doc.data();
        if (r.remind_at && r.remind_at <= now) {
          const order = (window.allOrders || G.bookings || [])
            .find(o => o.id === r.order_id);
          const label = order
            ? `Order #${order['No.'] || r.order_id}` : '';
          toast(
            `🔔 Reminder: ${r.category||'Task'}${label?' — '+label:''}`,
            'info', 8000
          );
          await doc.ref.update({ fired:true }).catch(() => {});
        }
      });
    } catch (_) {}
  }, 5000);
};

window.stopReminderChecker = function() {
  if (window.reminderInterval) {
    clearInterval(window.reminderInterval);
    window.reminderInterval = null;
  }
};

// ============================================================
// NOTIFICATION BELL TOGGLE — DOM setup
// Called once on DOMContentLoaded
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  const notifBtn      = document.getElementById('notif-btn');
  const notifDropdown = document.getElementById('notif-dropdown');

  if (notifBtn && notifDropdown) {
    notifBtn.addEventListener('click', e => {
      e.stopPropagation();
      notifDropdown.classList.toggle('open');
      // ✅ Mark all read when opening dropdown
      if (notifDropdown.classList.contains('open')) {
        setTimeout(markAllRead, 1500);
      }
    });
    document.addEventListener('click', () => {
      notifDropdown.classList.remove('open');
    });
    notifDropdown.addEventListener('click', e => {
      e.stopPropagation();
    });
  }

  document.getElementById('mark-all-read-btn')
    ?.addEventListener('click', async () => {
      await markAllRead();
      toast('All notifications cleared', 'success', 2000);
    });
});
