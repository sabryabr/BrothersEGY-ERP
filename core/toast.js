// ============================================================
// core/toast.js
// Toast notifications and WhatsApp alerts
// No dependencies except window.G (from globals.js)
// ============================================================

// ============================================================
// TOAST NOTIFICATION SYSTEM
// ============================================================

// Tracks recently shown toasts to prevent duplicates
const _recentToasts = new Set();

/**
 * Show a toast notification
 * @param {string} msg      - Message to display
 * @param {string} type     - 'success' | 'error' | 'warning' | 'info'
 * @param {number} duration - Milliseconds before auto-dismiss (default 4500)
 */
window.toast = function(msg, type = 'info', duration = 4500) {
  // Deduplicate — same type+message within 2 seconds shows only once
  const key = `${type}:${String(msg).slice(0, 60)}`;
  if (_recentToasts.has(key)) return;
  _recentToasts.add(key);
  setTimeout(() => _recentToasts.delete(key), 2000);

  const icons = {
    success: '✅',
    error:   '❌',
    warning: '⚠️',
    info:    'ℹ️'
  };

  const wrap = document.getElementById('toast-wrap');
  if (!wrap) return;

  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `
    <span>${icons[type] || ''}</span>
    <span style="flex:1">${msg}</span>
    <button onclick="this.parentElement.remove()"
      style="background:none;border:none;color:inherit;
             cursor:pointer;font-size:14px;padding:0 0 0 8px;
             opacity:0.7;flex-shrink:0;">✕</button>`;

  wrap.appendChild(el);

  // Auto dismiss
  setTimeout(() => {
    el.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }, duration);
};

// ============================================================
// NOTIFICATIONS (Firestore)
// ============================================================

/**
 * Create an in-app notification for a specific user
 * Also triggers a WhatsApp message if that user has keys configured
 */
window.createNotification = async function(
  forUser, type, message, linkedModule, linkedId
) {
  try {
    await db.collection('notifications').add({
      for_user:      forUser,
      type,
      message,
      read:          false,
      linked_module: linkedModule || '',
      linked_id:     linkedId    || '',
      timestamp:     Date.now()
    });

    // Attempt WhatsApp if configured
    sendWhatsApp(forUser, `Brothers EGY: ${message}`);

  } catch (e) {
    console.warn('createNotification failed:', e.message);
  }
};

/**
 * Load notifications for the current user via realtime listener
 * Updates the badge count and renders the dropdown list
 * Replaces any existing listener before attaching a new one
 */
window.loadNotifications = function() {
  if (!G.user) return;

  // Clean up existing listener
  if (window.notifUnsub) {
    try { window.notifUnsub(); } catch (e) {}
    window.notifUnsub = null;
  }

  try {
    window.notifUnsub = db.collection('notifications')
      .where('for_user', '==', G.user.username)
      .orderBy('timestamp', 'desc')
      .limit(20)
      .onSnapshot(snap => {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const unread = items.filter(n => !n.read).length;

        G.notifUnread = unread;

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
 * Render the notifications list inside the dropdown
 */
window.renderNotifList = function(items) {
  const list = document.getElementById('notif-list');
  if (!list) return;

  if (!items.length) {
    list.innerHTML = '<div class="notif-empty">No notifications</div>';
    return;
  }

  const icons = {
    task:     '✅',
    approval: '🔔',
    overdue:  '⚠️',
    expiry:   '📅',
    receipt:  '🧾',
    general:  'ℹ️',
    reminder: '🔔'
  };

  const colors = {
    task:     'rgba(34,197,94,0.2)',
    approval: 'rgba(245,158,11,0.2)',
    overdue:  'rgba(239,68,68,0.2)',
    expiry:   'rgba(249,115,22,0.2)',
    receipt:  'rgba(59,130,246,0.2)',
    general:  'rgba(100,116,139,0.2)',
    reminder: 'rgba(168,85,247,0.2)'
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
          ${new Date(n.timestamp).toLocaleString('en-GB')}
        </div>
      </div>
    </div>`).join('');

  // Attach click handlers
  list.querySelectorAll('.notif-item').forEach(el => {
    el.addEventListener('click', () => {
      const id       = el.dataset.notifId;
      const module   = el.dataset.module;
      handleNotifClick(id, module);
    });
  });
};

/**
 * Handle clicking a notification item
 * Marks it as read and navigates to the linked module
 */
window.handleNotifClick = async function(id, module) {
  try {
    await db.collection('notifications').doc(id).update({ read: true });
  } catch (e) { /* silent */ }

  // Close dropdown
  document.getElementById('notif-dropdown')?.classList.remove('open');

  // Navigate if module is specified
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
      .where('read', '==', false)
      .get();

    const batch = db.batch();
    snap.docs.forEach(d => batch.update(d.ref, { read: true }));
    await batch.commit();
  } catch (e) {
    console.warn('markAllRead failed:', e.message);
  }
};

// ============================================================
// WHATSAPP (CallMeBot)
// ============================================================

/**
 * Send a WhatsApp message via CallMeBot API
 * Fails silently if user has no API key configured
 */
window.sendWhatsApp = async function(username, message) {
  const apiKey = G.settings.callmebotKeys?.[username];
  const phone  = G.settings.callmebotPhones?.[username];
  if (!apiKey || !phone) return;

  try {
    await fetch(
      `https://api.callmebot.com/whatsapp.php?phone=${phone}` +
      `&text=${encodeURIComponent(message)}&apikey=${apiKey}`,
      { mode: 'no-cors' }
    );
  } catch (e) { /* silent — CallMeBot is best-effort */ }
};

// ============================================================
// REMINDER SYSTEM
// ============================================================

/**
 * Start polling Firestore for due reminders every 60 seconds
 * Clears any existing interval before starting a new one
 */
window.startReminderChecker = function() {
  // Clear existing interval to prevent duplicates
  if (window.reminderInterval) {
    clearInterval(window.reminderInterval);
    window.reminderInterval = null;
  }

  window.reminderInterval = setInterval(async () => {
    if (!G.user?.username) return;

    try {
      const now  = Date.now();
      const snap = await db.collection('reminders')
        .where('created_by',  '==', G.user.username)
        .where('fired',       '==', false)
        .where('dismissed',   '==', false)
        .get();

      snap.docs.forEach(async doc => {
        const r = doc.data();
        if (r.remind_at <= now) {
          const order = allOrders.find(o => o.id === r.order_id);
          const label = order
            ? `Order #${order['No.'] || r.order_id}`
            : r.order_id;

          toast(
            `🔔 Reminder: ${r.category} — ${label}` +
            `${r.note ? ' — ' + r.note : ''}`,
            'info', 8000
          );

          await doc.ref.update({ fired: true }).catch(() => {});

          createNotification(
            G.user.username,
            'reminder',
            `${r.category}: ${label}${r.note ? ' — ' + r.note : ''}`,
            'order-book',
            r.order_id
          );
        }
      });
    } catch (e) { /* silent */ }

  }, 60000);
};

/**
 * Stop the reminder checker (called on logout)
 */
window.stopReminderChecker = function() {
  if (window.reminderInterval) {
    clearInterval(window.reminderInterval);
    window.reminderInterval = null;
  }
};
