// ============================================================
// core/auth.js v4.1
// Authentication, session management, permissions,
// clock, particles, typewriter animation
// ============================================================

// ============================================================
// GLOBAL STATE INIT
// ============================================================
// Rate override state — null means use live rate
window.rateOverrides = window.rateOverrides || { usd: null, eur: null };

// ============================================================
// LOGIN
// ============================================================
window.doLogin = async function() {
  const username  = document.getElementById('li-user')?.value.trim();
  const password  = document.getElementById('li-pass')?.value.trim();
  const errEl     = document.getElementById('login-err');
  const btn       = document.getElementById('login-btn');
  const spinner   = document.getElementById('login-spinner');
  const btnTxt    = document.getElementById('login-btn-text');

  if (errEl) errEl.textContent = '';

  if (!username || !password) {
    if (errEl) errEl.textContent = 'Please enter username and password.';
    _shakeLoginCard();
    return;
  }

  if (btn)    btn.disabled          = true;
  if (btnTxt) btnTxt.style.display  = 'none';
  if (spinner)spinner.style.display = 'block';

  try {
    const snap = await db.collection('users').doc(username).get();
    if (!snap.exists) throw new Error('User not found.');

    const data = snap.data();

    if (data.password !== password) throw new Error('Incorrect password.');

    G.user = {
      username,
      role    : data.role   || 'User',
      branch  : data.branch || '',
      access  : (data.access || []).map(a => parseInt(a))
    };

    await logAction('LOGIN', 'Portal', `Login from branch ${G.user.branch}`);
    onLoginSuccess();

  } catch (e) {
    if (errEl) errEl.textContent = e.message;
    _shakeLoginCard();
    if (btn)    btn.disabled          = false;
    if (btnTxt) btnTxt.style.display  = 'inline';
    if (spinner)spinner.style.display = 'none';
  }
};

// ============================================================
// ON LOGIN SUCCESS
// ============================================================
window.onLoginSuccess = function() {
  // ── Swap pages ──────────────────────────────────────────────
  document.getElementById('login-page')?.classList.add('hidden');
  document.getElementById('app')?.classList.remove('hidden');

  const u = G.user;

  // ── Populate topbar user info ─────────────────────────────
  const nameEl   = document.getElementById('ub-name');
  const avatarEl = document.getElementById('user-avatar');
  const roleEl   = document.getElementById('ub-role-pill');
  const branchEl = document.getElementById('ub-branch');

  if (nameEl)   nameEl.textContent   = u.username;
  if (avatarEl) avatarEl.textContent = initials(u.username).toUpperCase();
  if (roleEl) {
    roleEl.textContent = u.role;
    roleEl.className   = `role-pill role-${u.role}`;
  }
  if (branchEl) branchEl.textContent = u.branch || 'All';

  // ── Apply role-based permissions ──────────────────────────
  applyPermissions();

  // ── Start background services ─────────────────────────────
  loadSharedData().then(() => initFleetFilterState());
  fetchRates();
  loadNotifications();
  loadSettings().then(() => {
    // ✅ Start session management AFTER settings are loaded
    // so session duration comes from G.settings
    if (typeof window._initSessionManagement === 'function') {
      window._initSessionManagement();
    }
    // ✅ Wire up stay-logged-in button for app.js session modal
    const stayBtn = document.getElementById('stay-logged-in-btn');
    if (stayBtn) {
      stayBtn.onclick = function() {
        if (typeof window.extendSession === 'function') {
          window.extendSession();
        } else {
          resetInactivity();
        }
      };
    }
  });

  // ✅ Start legacy inactivity checker as fallback
  // (app.js session management will override if loaded)
  startInactivityChecker();

  setTimeout(() => startReminderChecker(), 3000);

  // ── Navigate to dashboard ─────────────────────────────────
  if (typeof showPage === 'function') showPage('dashboard');
};

// ============================================================
// LOGOUT
// ============================================================
window.doLogout = async function() {
  await logAction('LOGOUT', 'Portal', 'Session ended').catch(() => {});

  // ── Stop session management timers ───────────────────────
  // These are defined in app.js
  if (window._idleTimer)        clearTimeout(window._idleTimer);
  if (window._idleWarnTimer)    clearTimeout(window._idleWarnTimer);
  if (window._sessionTimer)     clearTimeout(window._sessionTimer);
  if (window._sessionCountdown) clearTimeout(window._sessionCountdown);
  if (window._taskDueChecker)   clearInterval(window._taskDueChecker);

  // Remove session warning modal if visible
  const warnModal = document.getElementById('session-warn-modal');
  if (warnModal) {
    if (warnModal._countInterval) clearInterval(warnModal._countInterval);
    warnModal.remove();
  }

  // ── Stop legacy inactivity checker ───────────────────────
  stopInactivityChecker();
  stopReminderChecker();

  // ── Stop all Firestore listeners ──────────────────────────
  if (window.logUnsub) {
    try { window.logUnsub(); } catch (_) {}
    window.logUnsub = null;
  }
  if (window.notifUnsub) {
    try { window.notifUnsub(); } catch (_) {}
    window.notifUnsub = null;
  }
  if (window._ordersUnsub) {
    try { window._ordersUnsub(); } catch (_) {}
    window._ordersUnsub = null;
  }

  G.unsubscribers.forEach(u => { try { u(); } catch (_) {} });
  G.unsubscribers = [];

  // ── Clear flags ───────────────────────────────────────────
  window._orderSubActive          = false;
  window._notifiedTasks           = null;
  window._overdueNotifiedTasks    = null;

  // ── Clear navigation history ──────────────────────────────
  window.MODAL_HISTORY = [];
  window.NAV_HISTORY   = [];

  // ── Clear all cached data ────────────────────────────────
  G.user          = null;
  G.fleet         = [];
  G.customers     = [];
  G.bookings      = [];
  G.activeBookings= [];
  G.proposals     = [];
  window.allOrders= [];
  window._allTasks= [];
  window._rateCardCache    = null;
  window._rateCardCacheTime= 0;

  // ── Reset UI to login state ───────────────────────────────
  document.getElementById('app')?.classList.add('hidden');
  document.getElementById('login-page')?.classList.remove('hidden');

  // ── Clear login form ──────────────────────────────────────
  const userEl    = document.getElementById('li-user');
  const passEl    = document.getElementById('li-pass');
  const btnEl     = document.getElementById('login-btn');
  const btnTxtEl  = document.getElementById('login-btn-text');
  const spinnerEl = document.getElementById('login-spinner');
  const errEl     = document.getElementById('login-err');

  if (userEl)    userEl.value             = '';
  if (passEl)    passEl.value             = '';
  if (btnEl)     btnEl.disabled           = false;
  if (btnTxtEl)  btnTxtEl.style.display   = 'inline';
  if (spinnerEl) spinnerEl.style.display  = 'none';
  if (errEl)     errEl.textContent        = '';

  updateBackBtn();
};

// ============================================================
// PERMISSIONS
// ============================================================
window.applyPermissions = function() {
  const isPriv   = ['Admin', 'Executive'].includes(G.user?.role);
  const access   = G.user?.access || [];
  const hasAccess= n => isPriv || access.includes(n);

  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = isPriv ? '' : 'none';
  });

  const pageAccess = {
    'proposals'      : 1,
    'en-contract'    : 2,
    'ar-contract'    : 3,
    'receipts'       : 4,
    'income-expenses': 5
  };

  Object.entries(pageAccess).forEach(([page, num]) => {
    const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (navItem) navItem.style.display = hasAccess(num) ? '' : 'none';
  });
};

// ============================================================
// INACTIVITY TIMEOUT (legacy — app.js session management
// is the primary handler after loadSettings resolves)
// These are kept as fallback for when app.js hasn't loaded yet
// ============================================================
const INACTIVE_MS = 30 * 60 * 1000; // 30 minutes
const WARN_MS     = 25 * 60 * 1000; // 25 minutes → show bar

window.resetInactivity = function() {
  window.sessionStartTime = Date.now();
  const bar = document.getElementById('inactivity-bar');
  if (bar) bar.style.display = 'none';
  bar?.classList.remove('visible');
};

window.startInactivityChecker = function() {
  stopInactivityChecker();
  window.sessionStartTime   = Date.now();
  window.inactivityInterval = setInterval(() => {
    if (!G.user) return;

    // ✅ If app.js session management is running, don't duplicate
    if (window._sessionTimer) return;

    const elapsed = Date.now() - window.sessionStartTime;
    if (elapsed >= INACTIVE_MS) {
      toast('Session expired due to inactivity.', 'warning');
      doLogout();
    } else if (elapsed >= WARN_MS) {
      const bar = document.getElementById('inactivity-bar');
      if (bar) bar.classList.add('visible');
    }
  }, 30000);

  ['mousemove','keydown','click','touchstart'].forEach(evt =>
    document.addEventListener(evt, resetInactivity, { passive:true })
  );
};

window.stopInactivityChecker = function() {
  if (window.inactivityInterval) {
    clearInterval(window.inactivityInterval);
    window.inactivityInterval = null;
  }
};

// ============================================================
// SETTINGS LOADER
// ============================================================
window.loadSettings = async function() {
  try {
    const snap = await db.collection('settings').doc('main').get();
    if (snap.exists) {
      G.settings = { ...G.settings, ...snap.data() };
    }
  } catch (e) {
    console.warn('Settings load failed:', e.message);
  }
};

// ============================================================
// EXCHANGE RATES
// ============================================================
window.fetchRates = async function() {
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/EGP');
    const j = await r.json();
    if (j?.rates) {
      if (window.rateOverrides.usd === null) {
        G.ratesUSD = 1 / j.rates.USD;
        updateRateDisplay('usd', G.ratesUSD, false);
      }
      if (window.rateOverrides.eur === null) {
        G.ratesEUR = 1 / j.rates.EUR;
        updateRateDisplay('eur', G.ratesEUR, false);
      }
    }
  } catch (_) {
    if (window.rateOverrides.usd === null) updateRateDisplay('usd', G.ratesUSD, false);
    if (window.rateOverrides.eur === null) updateRateDisplay('eur', G.ratesEUR, false);
  }
  setTimeout(fetchRates, 30 * 60 * 1000);
};

window.updateRateDisplay = function(currency, rate, isOverride) {
  const valEl   = document.getElementById('tb-' + currency);
  const pillEl  = document.querySelector('#' + currency + '-pill-wrap .rate-pill-full');
  const resetBtn= document.getElementById(currency + '-reset-btn');
  if (valEl)    valEl.textContent = rate.toFixed(2);
  if (pillEl)   pillEl.classList.toggle('overridden', isOverride);
  if (resetBtn) resetBtn.classList.toggle('hidden', !isOverride);
};

window.openRateEdit = function(currency) {
  const popup = document.getElementById(currency + '-edit-popup');
  const input = document.getElementById(currency + '-edit-input');
  const other = currency === 'usd' ? 'eur' : 'usd';
  document.getElementById(other + '-edit-popup')?.classList.add('hidden');
  if (!popup) return;
  popup.classList.toggle('hidden');
  if (!popup.classList.contains('hidden') && input) {
    input.value = currency === 'usd'
      ? G.ratesUSD.toFixed(2)
      : G.ratesEUR.toFixed(2);
    setTimeout(() => { input.focus(); input.select(); }, 50);
  }
};

window.confirmRateEdit = function(currency) {
  const input = document.getElementById(currency + '-edit-input');
  const val   = parseFloat(input?.value);
  if (!val || val <= 0 || val > 10000) {
    input?.classList.add('shake');
    setTimeout(() => input?.classList.remove('shake'), 500);
    return;
  }
  window.rateOverrides[currency] = val;
  if (currency === 'usd') G.ratesUSD = val;
  else                     G.ratesEUR = val;
  updateRateDisplay(currency, val, true);
  closeRateEdit(currency);
  toast(`${currency.toUpperCase()} rate set to ${val.toFixed(2)} EGP`, 'warning', 4000);
  logAction('EDIT', 'Exchange Rates',
    `Override: 1 ${currency.toUpperCase()} = ${val.toFixed(2)} EGP`);
};

window.closeRateEdit = function(currency) {
  document.getElementById(currency + '-edit-popup')?.classList.add('hidden');
};

window.resetRate = function(currency) {
  window.rateOverrides[currency] = null;
  fetchRates();
  toast(`${currency.toUpperCase()} rate restored to live rate.`, 'info');
  logAction('EDIT', 'Exchange Rates', `Override cleared: ${currency.toUpperCase()}`);
};

// ============================================================
// CLOCK — Cairo timezone
// ============================================================
window.startClock = function() {
  const update = () => {
    const n = new Date();
    // ✅ Use Cairo timezone for clock display
    const date = n.toLocaleDateString('en-GB', {
      day:'2-digit', month:'2-digit', year:'numeric',
      timeZone: 'Africa/Cairo'
    });
    const time = n.toLocaleTimeString('en-GB', {
      timeZone: 'Africa/Cairo'
    });
    const ldEl  = document.getElementById('live-date');
    const ltEl  = document.getElementById('live-time');
    const ld2El = document.getElementById('login-date');
    if (ldEl)  ldEl.textContent  = date;
    if (ltEl)  ltEl.textContent  = time;
    if (ld2El) ld2El.textContent = date;
  };
  update();
  setInterval(update, 1000);
};

// ============================================================
// NOTIFICATIONS
// ============================================================
window.loadNotifications = function() {
  if (!G.user) return;

  // Unsubscribe previous
  if (window.notifUnsub) {
    try { window.notifUnsub(); } catch (_) {}
  }

  try {
    window.notifUnsub = db.collection('reminders')
      .where('assigned_to', '==', G.user.username)
      .where('dismissed', '==', false)
      .onSnapshot(snap => {
        const now        = getCairoNow();
        const due        = snap.docs
          .map(d => ({ id:d.id, ...d.data() }))
          .filter(r => r.remind_at && r.remind_at <= now.getTime() && !r.fired);

        const badge  = document.getElementById('notif-badge');
        const list   = document.getElementById('notif-list');
        const allDue = snap.docs.map(d => ({ id:d.id, ...d.data() }))
          .filter(r => !r.dismissed);

        if (badge) {
          if (allDue.length > 0) {
            badge.textContent = allDue.length;
            badge.classList.remove('hidden');
          } else {
            badge.classList.add('hidden');
          }
        }

        if (list) {
          if (!allDue.length) {
            list.innerHTML = '<div class="notif-empty">No notifications</div>';
          } else {
            list.innerHTML = allDue.slice(0,10).map(r => `
              <div style="padding:10px 14px;border-bottom:1px solid var(--border);
                          font-size:11px;">
                <div style="font-weight:700;margin-bottom:3px;">
                  🔔 ${r.category || 'Reminder'}
                </div>
                <div style="color:var(--text3);">${r.note || ''}</div>
                <div style="display:flex;justify-content:space-between;
                            margin-top:6px;align-items:center;">
                  <span style="font-size:10px;color:var(--text3);">
                    ${r.remind_at
                      ? new Date(r.remind_at).toLocaleString('en-GB',{
                          timeZone:'Africa/Cairo', day:'2-digit',
                          month:'short', hour:'2-digit', minute:'2-digit'
                        })
                      : '—'}
                  </span>
                  <button class="btn btn-ghost btn-xs"
                    onclick="dismissReminder('${r.id}')">✓ Done</button>
                </div>
              </div>`).join('');
          }
        }

        // Show toast for newly fired reminders
        due.forEach(r => {
          toast(`🔔 Reminder: ${r.category || 'Task'} — ${r.note || ''}`, 'info', 8000);
          db.collection('reminders').doc(r.id).update({ fired:true }).catch(()=>{});
        });

      }, e => console.warn('Notifications error:', e.message));

    G.unsubscribers.push(window.notifUnsub);

  } catch (e) {
    console.warn('Notifications setup failed:', e.message);
  }
};

window.dismissReminder = async function(reminderId) {
  try {
    await db.collection('reminders').doc(reminderId).update({ dismissed:true });
  } catch (_) {}
};

// ============================================================
// REMINDER CHECKER (fires reminders at due time)
// ============================================================
window.startReminderChecker = function() {
  stopReminderChecker();
  window._reminderInterval = setInterval(async () => {
    if (!G.user) return;
    try {
      const now  = getCairoNow().getTime();
      const snap = await db.collection('reminders')
        .where('assigned_to', '==', G.user.username)
        .where('fired',       '==', false)
        .where('dismissed',   '==', false)
        .get().catch(() => null);
      if (!snap) return;
      snap.docs.forEach(d => {
        const r = { id:d.id, ...d.data() };
        if (r.remind_at && r.remind_at <= now) {
          toast(`🔔 Reminder: ${r.category||'Task'} — ${r.note||''}`, 'info', 10000);
          db.collection('reminders').doc(r.id).update({ fired:true }).catch(()=>{});
        }
      });
    } catch (_) {}
  }, 60000); // check every minute
};

window.stopReminderChecker = function() {
  if (window._reminderInterval) {
    clearInterval(window._reminderInterval);
    window._reminderInterval = null;
  }
};

// ============================================================
// NOTIFICATION BELL TOGGLE
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  const notifBtn      = document.getElementById('notif-btn');
  const notifDropdown = document.getElementById('notif-dropdown');

  if (notifBtn && notifDropdown) {
    notifBtn.addEventListener('click', e => {
      e.stopPropagation();
      notifDropdown.classList.toggle('open');
    });
    document.addEventListener('click', () => {
      notifDropdown.classList.remove('open');
    });
  }

  document.getElementById('mark-all-read-btn')?.addEventListener('click', async () => {
    if (!G.user) return;
    try {
      const snap = await db.collection('reminders')
        .where('assigned_to','==', G.user.username)
        .where('dismissed','==',false).get();
      const batch = db.batch();
      snap.docs.forEach(d => batch.update(d.ref, { dismissed:true }));
      await batch.commit();
      toast('All notifications cleared', 'success');
    } catch (_) {}
  });
});

// ============================================================
// BACK BUTTON
// ============================================================
window.updateBackBtn = function() {
  const btn = document.getElementById('back-btn');
  if (!btn) return;
  const history = window.NAV_HISTORY || [];
  btn.style.display = (history.length > 0 && G.user) ? 'block' : 'none';
};

window.goBack = function() {
  const history = window.NAV_HISTORY || [];
  if (!history.length) return;
  const prev = history[history.length - 1];
  G._navGoingBack = true;
  if (prev.restoreFn) prev.restoreFn();
  window.NAV_HISTORY = history.slice(0, -1);
  updateBackBtn();
};

// ============================================================
// RETURN BANNER
// ============================================================
window.showReturnBanner = function() {
  const banner = document.getElementById('return-banner');
  const msg    = document.getElementById('return-msg');
  if (banner) banner.style.display = 'flex';
  if (msg && G.pendingReturn?.message) msg.textContent = G.pendingReturn.message;
};

window.hideReturnBanner = function() {
  const banner = document.getElementById('return-banner');
  if (banner) banner.style.display = 'none';
};

// ============================================================
// LOGIN PAGE ANIMATIONS
// ============================================================
window.initParticles = function() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W = canvas.width  = window.innerWidth;
  let H = canvas.height = window.innerHeight;

  window.addEventListener('resize', () => {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  });

  let mouse = { x: W / 2, y: H / 2 };
  window.addEventListener('mousemove', e => {
    mouse.x = e.clientX; mouse.y = e.clientY;
  });

  const P = Array.from({ length:80 }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    r: Math.random() * 2 + 1,
    alpha: Math.random() * 0.5 + 0.2
  }));

  function draw() {
    ctx.clearRect(0, 0, W, H);
    P.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(59,130,246,${p.alpha})`;
      ctx.fill();
    });
    for (let i = 0; i < P.length; i++) {
      for (let j = i + 1; j < P.length; j++) {
        const dx = P[i].x - P[j].x, dy = P[i].y - P[j].y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(P[i].x, P[i].y);
          ctx.lineTo(P[j].x, P[j].y);
          ctx.strokeStyle = `rgba(59,130,246,${0.15*(1-dist/120)})`;
          ctx.lineWidth = 0.5; ctx.stroke();
        }
      }
      const dx = P[i].x - mouse.x, dy = P[i].y - mouse.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 150) {
        ctx.beginPath();
        ctx.moveTo(P[i].x, P[i].y);
        ctx.lineTo(mouse.x, mouse.y);
        ctx.strokeStyle = `rgba(99,102,241,${0.3*(1-dist/150)})`;
        ctx.lineWidth = 0.8; ctx.stroke();
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
};

window.startTypewriter = function() {
  const texts = [
    'EXECUTIVE HUB',
    'SECURE ACCESS PORTAL',
    'BROTHERS EGY ERP v3.0'
  ];
  let ti = 0, ci = 0, deleting = false;
  const el = document.getElementById('login-typewriter');
  if (!el) return;
  function type() {
    const current = texts[ti];
    if (!deleting) {
      el.textContent = current.substring(0, ci + 1);
      ci++;
      if (ci === current.length) {
        deleting = true;
        setTimeout(type, 1800); return;
      }
    } else {
      el.textContent = current.substring(0, ci - 1);
      ci--;
      if (ci === 0) { deleting = false; ti = (ti + 1) % texts.length; }
    }
    setTimeout(type, deleting ? 60 : 90);
  }
  type();
};

window.togglePW = function() {
  const inp = document.getElementById('li-pass');
  const btn = document.getElementById('pw-toggle-btn');
  if (!inp) return;
  inp.type         = inp.type === 'password' ? 'text' : 'password';
  btn.textContent  = inp.type === 'password' ? '👁' : '🙈';
};

// ============================================================
// INTERNAL HELPERS
// ============================================================
function _shakeLoginCard() {
  const card = document.querySelector('.login-card');
  if (!card) return;
  card.classList.add('shake');
  setTimeout(() => card.classList.remove('shake'), 500);
}

// ============================================================
// EVENT LISTENERS
// ============================================================
document.addEventListener('DOMContentLoaded', () => {

  // ── Login form ─────────────────────────────────────────────
  document.getElementById('login-form')
    ?.addEventListener('submit', e => { e.preventDefault(); doLogin(); });

  document.getElementById('pw-toggle-btn')
    ?.addEventListener('click', togglePW);

  // ── Logout ─────────────────────────────────────────────────
  document.getElementById('logout-btn')
    ?.addEventListener('click', doLogout);

  // ── Back button ────────────────────────────────────────────
  document.getElementById('back-btn')
    ?.addEventListener('click', goBack);

  // ── Return banner cancel ───────────────────────────────────
  document.getElementById('cancel-return-btn')
    ?.addEventListener('click', () => {
      G.pendingReturn = null;
      hideReturnBanner();
    });

  // ── Stay logged in (legacy inactivity bar) ────────────────
  document.getElementById('stay-logged-in-btn')
    ?.addEventListener('click', () => {
      if (typeof window.extendSession === 'function') {
        window.extendSession();
      } else {
        resetInactivity();
      }
    });

  // ── Login button ripple ────────────────────────────────────
  document.getElementById('login-btn')
    ?.addEventListener('click', function(e) {
      const r    = document.createElement('span');
      r.className= 'ripple';
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      r.style.cssText = `
        width:${size}px; height:${size}px;
        left:${e.clientX - rect.left - size/2}px;
        top:${e.clientY - rect.top  - size/2}px;`;
      this.appendChild(r);
      setTimeout(() => r.remove(), 600);
    });

  // ── Topbar brand → dashboard ──────────────────────────────
  document.getElementById('topbar-brand')
    ?.addEventListener('click', () => {
      if (typeof showPage === 'function') showPage('dashboard');
    });

  // ── Topbar action buttons ─────────────────────────────────
  document.querySelectorAll('.topbar-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      if (page && typeof showPage === 'function') showPage(page);
    });
  });

  // ── Rate pill handlers ────────────────────────────────────
  document.getElementById('usd-pill')
    ?.addEventListener('click', () => openRateEdit('usd'));
  document.getElementById('eur-pill')
    ?.addEventListener('click', () => openRateEdit('eur'));
  document.getElementById('usd-confirm-btn')
    ?.addEventListener('click', () => confirmRateEdit('usd'));
  document.getElementById('eur-confirm-btn')
    ?.addEventListener('click', () => confirmRateEdit('eur'));
  document.getElementById('usd-cancel-btn')
    ?.addEventListener('click', () => closeRateEdit('usd'));
  document.getElementById('eur-cancel-btn')
    ?.addEventListener('click', () => closeRateEdit('eur'));
  document.getElementById('usd-reset-btn')
    ?.addEventListener('click', e => { e.stopPropagation(); resetRate('usd'); });
  document.getElementById('eur-reset-btn')
    ?.addEventListener('click', e => { e.stopPropagation(); resetRate('eur'); });

  ['usd','eur'].forEach(c => {
    document.getElementById(c + '-edit-input')
      ?.addEventListener('keydown', e => {
        if (e.key === 'Enter')  confirmRateEdit(c);
        if (e.key === 'Escape') closeRateEdit(c);
      });
  });

  // ── Background video fallback ─────────────────────────────
  document.getElementById('bg-video')
    ?.addEventListener('error', () => {
      const vid     = document.getElementById('bg-video');
      const overlay = document.getElementById('bg-overlay');
      if (vid)     vid.style.display    = 'none';
      if (overlay) overlay.style.background =
        'linear-gradient(135deg,rgba(7,11,20,1) 0%,' +
        'rgba(13,19,33,0.98) 50%,rgba(7,11,20,1) 100%)';
    });

  // ── Start clock and login animations ─────────────────────
  startClock();
  initParticles();
  startTypewriter();

  // ── Set login date ────────────────────────────────────────
  const loginDateEl = document.getElementById('login-date');
  if (loginDateEl) {
    loginDateEl.textContent = new Date().toLocaleDateString('en-GB', {
      weekday:'long', year:'numeric', month:'long', day:'numeric',
      timeZone: 'Africa/Cairo'
    });
  }
});
