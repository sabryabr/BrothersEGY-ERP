// ============================================================
// core/auth.js
// Authentication, session management, permissions,
// clock, particles, and typewriter animation
// ============================================================

// ============================================================
// LOGIN
// ============================================================

/**
 * Handle login form submission
 * Reads username + password, validates against Firestore users collection
 */
window.doLogin = async function() {
  const username = document.getElementById('li-user')?.value.trim();
  const password = document.getElementById('li-pass')?.value.trim();
  const errEl    = document.getElementById('login-err');
  const btn      = document.getElementById('login-btn');
  const spinner  = document.getElementById('login-spinner');
  const btnTxt   = document.getElementById('login-btn-text');

  if (errEl) errEl.textContent = '';

  // Basic validation
  if (!username || !password) {
    if (errEl) errEl.textContent = 'Please enter username and password.';
    _shakeLoginCard();
    return;
  }

  // Show loading state
  if (btn)    btn.disabled         = true;
  if (btnTxt) btnTxt.style.display = 'none';
  if (spinner) spinner.style.display = 'block';

  try {
    const snap = await db.collection('users').doc(username).get();

    if (!snap.exists) throw new Error('User not found.');

    const data = snap.data();

    // NOTE: Plain text password comparison
    // TODO: Migrate to Firebase Authentication for production security
    if (data.password !== password) throw new Error('Incorrect password.');

    // Build user session
    G.user = {
      username,
      role:   data.role   || 'User',
      branch: data.branch || '',
      access: (data.access || []).map(a => parseInt(a))
    };

    await logAction('LOGIN', 'Portal', `Login from branch ${G.user.branch}`);

    onLoginSuccess();

  } catch (e) {
    if (errEl) errEl.textContent = e.message;
    _shakeLoginCard();

    // Reset button state
    if (btn)     btn.disabled          = false;
    if (btnTxt)  btnTxt.style.display  = 'inline';
    if (spinner) spinner.style.display = 'none';
  }
};

/**
 * Called after successful authentication
 * Shows the app, populates user info, starts all services
 */
window.onLoginSuccess = function() {
  // Swap pages
  document.getElementById('login-page')?.classList.add('hidden');
  document.getElementById('app')?.classList.remove('hidden');

  const u = G.user;

  // Populate topbar user info
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

  // Apply role-based permissions
  applyPermissions();

  // Start all background services
  loadSharedData().then(() => initFleetFilterState());
  fetchRates();
  loadNotifications();
  loadSettings();
  startInactivityChecker();
  setTimeout(() => startReminderChecker(), 3000);

  // Navigate to dashboard
  if (typeof showPage === 'function') showPage('dashboard');
};

// ============================================================
// LOGOUT
// ============================================================

/**
 * Log out the current user
 * Cleans up all listeners, resets all state, returns to login
 */
window.doLogout = async function() {
  await logAction('LOGOUT', 'Portal', 'Session ended');

  // Stop all background services
  stopInactivityChecker();
  stopReminderChecker();

  // Stop log listener
  if (window.logUnsub) {
    try { window.logUnsub(); } catch (e) {}
    window.logUnsub = null;
  }

  // Stop notification listener
  if (window.notifUnsub) {
    try { window.notifUnsub(); } catch (e) {}
    window.notifUnsub = null;
  }

  // Unsubscribe all Firestore listeners
  G.unsubscribers.forEach(u => { try { u(); } catch (e) {} });
  G.unsubscribers = [];

  // Reset order subscription flags
  window._orderSubActive = false;
  window._ordersUnsub    = null;

  // Clear navigation history
  window.MODAL_HISTORY = [];
  window.NAV_HISTORY   = [];

  // Clear all cached data
  G.user          = null;
  G.fleet         = [];
  G.customers     = [];
  G.bookings      = [];
  G.activeBookings= [];
  G.proposals     = [];
  window.allOrders= [];

  // Reset UI to login state
  document.getElementById('app')?.classList.add('hidden');
  document.getElementById('login-page')?.classList.remove('hidden');

  // Clear login form
  const userEl    = document.getElementById('li-user');
  const passEl    = document.getElementById('li-pass');
  const btnEl     = document.getElementById('login-btn');
  const btnTxtEl  = document.getElementById('login-btn-text');
  const spinnerEl = document.getElementById('login-spinner');
  const errEl     = document.getElementById('login-err');

  if (userEl)    userEl.value            = '';
  if (passEl)    passEl.value            = '';
  if (btnEl)     btnEl.disabled          = false;
  if (btnTxtEl)  btnTxtEl.style.display  = 'inline';
  if (spinnerEl) spinnerEl.style.display = 'none';
  if (errEl)     errEl.textContent       = '';

  // Hide back button
  updateBackBtn();
};

// ============================================================
// PERMISSIONS
// ============================================================

/**
 * Show/hide nav items and admin-only elements based on user role
 * Called once after login
 */
window.applyPermissions = function() {
  const isPriv  = ['Admin', 'Executive'].includes(G.user?.role);
  const access  = G.user?.access || [];
  const hasAccess = n => isPriv || access.includes(n);

  // Hide admin-only sidebar items for non-admin users
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = isPriv ? '' : 'none';
  });

  // Module access control (non-privileged users)
  const pageAccess = {
    'proposals':       1,
    'en-contract':     2,
    'ar-contract':     3,
    'receipts':        4,
    'income-expenses': 5
  };

  Object.entries(pageAccess).forEach(([page, num]) => {
    const navItem = document.querySelector(
      `.nav-item[data-page="${page}"]`
    );
    if (navItem) navItem.style.display = hasAccess(num) ? '' : 'none';
  });
};

// ============================================================
// INACTIVITY TIMEOUT
// Uses timestamp comparison instead of setTimeout
// so it works correctly in background tabs
// ============================================================

const INACTIVE_MS = 30 * 60 * 1000;  // 30 minutes → auto logout
const WARN_MS     = 25 * 60 * 1000;  // 25 minutes → show warning

/**
 * Reset the inactivity timer on any user interaction
 */
window.resetInactivity = function() {
  window.sessionStartTime = Date.now();
  document.getElementById('inactivity-bar').style.display = 'none';
};

/**
 * Start the inactivity checker interval
 * Checks every 30 seconds using timestamp delta
 */
window.startInactivityChecker = function() {
  stopInactivityChecker();

  window.sessionStartTime = Date.now();

  window.inactivityInterval = setInterval(() => {
    if (!G.user) return;

    const elapsed = Date.now() - window.sessionStartTime;

    if (elapsed >= INACTIVE_MS) {
      toast('Session expired due to inactivity.', 'warning');
      doLogout();
    } else if (elapsed >= WARN_MS) {
      document.getElementById('inactivity-bar').style.display = 'block';
    }
  }, 30000);

  // Reset timer on any user activity
  ['mousemove', 'keydown', 'click', 'touchstart'].forEach(evt =>
    document.addEventListener(evt, resetInactivity, { passive: true })
  );
};

/**
 * Stop the inactivity checker (called on logout)
 */
window.stopInactivityChecker = function() {
  if (window.inactivityInterval) {
    clearInterval(window.inactivityInterval);
    window.inactivityInterval = null;
  }
};

// ============================================================
// EXCHANGE RATES
// ============================================================

/**
 * Fetch live exchange rates from open.er-api.com
 * Falls back to defaults if fetch fails
 * Auto-refreshes every 30 minutes
 */
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
  } catch (e) {
    // Use defaults silently
    if (window.rateOverrides.usd === null) {
      updateRateDisplay('usd', G.ratesUSD, false);
    }
    if (window.rateOverrides.eur === null) {
      updateRateDisplay('eur', G.ratesEUR, false);
    }
  }

  // Schedule next refresh in 30 minutes
  setTimeout(fetchRates, 30 * 60 * 1000);
};

/**
 * Update the rate pill display in the topbar
 */
window.updateRateDisplay = function(currency, rate, isOverride) {
  const valEl    = document.getElementById(`tb-${currency}`);
  const pillEl   = document.querySelector(`#${currency}-pill-wrap .rate-pill-full`);
  const resetBtn = document.getElementById(`${currency}-reset-btn`);

  if (valEl)    valEl.textContent = rate.toFixed(2);
  if (pillEl)   pillEl.classList.toggle('overridden', isOverride);
  if (resetBtn) resetBtn.classList.toggle('hidden', !isOverride);
};

/**
 * Open the manual rate edit popup for a currency
 */
window.openRateEdit = function(currency) {
  const popup = document.getElementById(`${currency}-edit-popup`);
  const input = document.getElementById(`${currency}-edit-input`);
  const other = currency === 'usd' ? 'eur' : 'usd';

  // Close the other popup first
  document.getElementById(`${other}-edit-popup`)?.classList.add('hidden');

  if (!popup) return;
  popup.classList.toggle('hidden');

  if (!popup.classList.contains('hidden')) {
    if (input) {
      input.value = currency === 'usd'
        ? G.ratesUSD.toFixed(2)
        : G.ratesEUR.toFixed(2);
      setTimeout(() => { input.focus(); input.select(); }, 50);
    }
  }
};

/**
 * Confirm and apply a manual rate override
 */
window.confirmRateEdit = function(currency) {
  const input = document.getElementById(`${currency}-edit-input`);
  const val   = parseFloat(input?.value);

  if (!val || val <= 0 || val > 10000) {
    input?.classList.add('shake');
    setTimeout(() => input?.classList.remove('shake'), 500);
    return;
  }

  window.rateOverrides[currency] = val;
  if (currency === 'usd') G.ratesUSD = val;
  else                    G.ratesEUR = val;

  updateRateDisplay(currency, val, true);
  closeRateEdit(currency);

  toast(
    `${currency.toUpperCase()} rate set to ${val.toFixed(2)} EGP`,
    'warning', 4000
  );
  logAction(
    'EDIT', 'Exchange Rates',
    `Override: 1 ${currency.toUpperCase()} = ${val.toFixed(2)} EGP`
  );
};

/**
 * Close a rate edit popup
 */
window.closeRateEdit = function(currency) {
  document.getElementById(`${currency}-edit-popup`)
    ?.classList.add('hidden');
};

/**
 * Reset a manual rate override and restore live rate
 */
window.resetRate = function(currency) {
  window.rateOverrides[currency] = null;
  fetchRates();
  toast(`${currency.toUpperCase()} rate restored to live rate.`, 'info');
  logAction('EDIT', 'Exchange Rates', `Override cleared: ${currency.toUpperCase()}`);
};

// ============================================================
// CLOCK
// ============================================================

/**
 * Start the live clock in the topbar
 * Updates every second
 */
window.startClock = function() {
  const update = () => {
    const n    = new Date();
    const date = n.toLocaleDateString('en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
    const time = n.toLocaleTimeString('en-GB');

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
// SETTINGS LOADER
// ============================================================

/**
 * Load system settings from Firestore into G.settings
 */
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
// LOGIN PAGE ANIMATIONS
// ============================================================

/**
 * Particle canvas animation on the login background
 */
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
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  const P = Array.from({ length: 80 }, () => ({
    x:     Math.random() * W,
    y:     Math.random() * H,
    vx:    (Math.random() - 0.5) * 0.4,
    vy:    (Math.random() - 0.5) * 0.4,
    r:     Math.random() * 2 + 1,
    alpha: Math.random() * 0.5 + 0.2
  }));

  function draw() {
    ctx.clearRect(0, 0, W, H);

    P.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H;
      if (p.y > H) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(59,130,246,${p.alpha})`;
      ctx.fill();
    });

    // Particle connections
    for (let i = 0; i < P.length; i++) {
      for (let j = i + 1; j < P.length; j++) {
        const dx   = P[i].x - P[j].x;
        const dy   = P[i].y - P[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(P[i].x, P[i].y);
          ctx.lineTo(P[j].x, P[j].y);
          ctx.strokeStyle = `rgba(59,130,246,${0.15 * (1 - dist / 120)})`;
          ctx.lineWidth   = 0.5;
          ctx.stroke();
        }
      }

      // Mouse connections
      const dx   = P[i].x - mouse.x;
      const dy   = P[i].y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 150) {
        ctx.beginPath();
        ctx.moveTo(P[i].x, P[i].y);
        ctx.lineTo(mouse.x, mouse.y);
        ctx.strokeStyle = `rgba(99,102,241,${0.3 * (1 - dist / 150)})`;
        ctx.lineWidth   = 0.8;
        ctx.stroke();
      }
    }

    requestAnimationFrame(draw);
  }

  draw();
};

/**
 * Typewriter animation for the login page subtitle
 */
window.startTypewriter = function() {
  const texts   = [
    'EXECUTIVE HUB',
    'SECURE ACCESS PORTAL',
    'BROTHERS EGY ERP v3.0'
  ];
  let ti       = 0;
  let ci       = 0;
  let deleting = false;

  const el = document.getElementById('login-typewriter');
  if (!el) return;

  function type() {
    const current = texts[ti];

    if (!deleting) {
      el.textContent = current.substring(0, ci + 1);
      ci++;
      if (ci === current.length) {
        deleting = true;
        setTimeout(type, 1800);
        return;
      }
    } else {
      el.textContent = current.substring(0, ci - 1);
      ci--;
      if (ci === 0) {
        deleting = false;
        ti = (ti + 1) % texts.length;
      }
    }

    setTimeout(type, deleting ? 60 : 90);
  }

  type();
};

/**
 * Toggle password visibility on the login form
 */
window.togglePW = function() {
  const inp = document.getElementById('li-pass');
  const btn = document.getElementById('pw-toggle-btn');
  if (!inp) return;
  inp.type     = inp.type === 'password' ? 'text' : 'password';
  btn.textContent = inp.type === 'password' ? '👁' : '🙈';
};

// ============================================================
// INTERNAL HELPERS
// ============================================================

/** Shake the login card to signal an error */
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

  // ---- Login form submit ----
  document.getElementById('login-form')
    ?.addEventListener('submit', e => {
      e.preventDefault();
      doLogin();
    });

  // ---- Password toggle ----
  document.getElementById('pw-toggle-btn')
    ?.addEventListener('click', togglePW);

  // ---- Logout button ----
  document.getElementById('logout-btn')
    ?.addEventListener('click', doLogout);

  // ---- Stay logged in button ----
  document.getElementById('stay-logged-in-btn')
    ?.addEventListener('click', resetInactivity);

  // ---- Login button ripple effect ----
  document.getElementById('login-btn')
    ?.addEventListener('click', function(e) {
      const r    = document.createElement('span');
      r.className = 'ripple';
      const rect  = this.getBoundingClientRect();
      const size  = Math.max(rect.width, rect.height);
      r.style.cssText = `
        width:${size}px; height:${size}px;
        left:${e.clientX - rect.left - size / 2}px;
        top:${e.clientY - rect.top  - size / 2}px;`;
      this.appendChild(r);
      setTimeout(() => r.remove(), 600);
    });

  // ---- Topbar brand click → dashboard ----
  document.getElementById('topbar-brand')
    ?.addEventListener('click', () => {
      if (typeof showPage === 'function') showPage('dashboard');
    });

  // ---- Topbar action buttons (Proposal, EN Contract etc.) ----
  document.querySelectorAll('.topbar-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      if (page && typeof showPage === 'function') showPage(page);
    });
  });

  // ---- Rate pill click handlers ----
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
    ?.addEventListener('click', e => {
      e.stopPropagation();
      resetRate('usd');
    });
  document.getElementById('eur-reset-btn')
    ?.addEventListener('click', e => {
      e.stopPropagation();
      resetRate('eur');
    });

  // ---- Rate edit input keyboard shortcuts ----
  ['usd', 'eur'].forEach(c => {
    document.getElementById(`${c}-edit-input`)
      ?.addEventListener('keydown', e => {
        if (e.key === 'Enter')  confirmRateEdit(c);
        if (e.key === 'Escape') closeRateEdit(c);
      });
  });

  // ---- Background video fallback ----
  document.getElementById('bg-video')
    ?.addEventListener('error', () => {
      const vid     = document.getElementById('bg-video');
      const overlay = document.getElementById('bg-overlay');
      if (vid)     vid.style.display = 'none';
      if (overlay) overlay.style.background =
        'linear-gradient(135deg,rgba(7,11,20,1) 0%,' +
        'rgba(13,19,33,0.98) 50%,rgba(7,11,20,1) 100%)';
    });

  // ---- Start clock and login animations ----
  startClock();
  initParticles();
  startTypewriter();

  // ---- Set login date ----
  const loginDateEl = document.getElementById('login-date');
  if (loginDateEl) {
    loginDateEl.textContent = new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      year:    'numeric',
      month:   'long',
      day:     'numeric'
    });
  }

});
