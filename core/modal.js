// ============================================================
// core/modal.js
// Global modal stack, back navigation, return banner,
// and command palette (Ctrl+K)
// ============================================================

// ============================================================
// MODAL SYSTEM
// Supports nested modals — each openModal() push to the stack
// closeModal() pops back to the previous modal or closes all
// ============================================================

/**
 * Open a modal with a title and HTML content
 * @param {string}  title   - Modal header title
 * @param {string}  html    - Inner HTML for modal body
 * @param {boolean} wide    - If true, uses wide modal class (880px)
 */
window.openModal = function(title, html, wide = false) {
  MODAL_HISTORY.push({ title, content: html, wide });
  _openModalDirect(title, html, wide);
  updateBackBtn();
};

/**
 * Internal — renders modal without pushing to history
 * Used by goBack() to restore previous modal
 */
window._openModalDirect = function(title, html, wide = false) {
  const titleEl = document.getElementById('global-modal-title');
  const bodyEl  = document.getElementById('global-modal-body');
  const boxEl   = document.getElementById('global-modal-box');
  const overlay = document.getElementById('global-modal');

  if (titleEl) titleEl.textContent = title;
  if (bodyEl)  bodyEl.innerHTML    = html;
  if (boxEl)   boxEl.className     = 'modal-box' + (wide ? ' wide' : '');
  if (overlay) overlay.classList.add('open');
};

/**
 * Close the top modal
 * If there is a previous modal in the stack, restores it
 * Otherwise closes the overlay entirely
 */
window.closeModal = function() {
  MODAL_HISTORY.pop();

  if (MODAL_HISTORY.length > 0) {
    const prev = MODAL_HISTORY[MODAL_HISTORY.length - 1];
    _openModalDirect(prev.title, prev.content, prev.wide);
  } else {
    document.getElementById('global-modal')?.classList.remove('open');
  }

  updateBackBtn();
};

// ============================================================
// BACK NAVIGATION
// ============================================================

/**
 * Push a navigation entry onto the back stack
 * @param {string}   description - Label shown in back button tooltip
 * @param {Function} restoreFn   - Function to call when going back
 */
window.pushNav = function(description, restoreFn) {
  NAV_HISTORY.push({
    description,
    restoreFn,
    ts: Date.now()
  });

  // Cap history at 30 entries to prevent memory growth
  if (NAV_HISTORY.length > 30) NAV_HISTORY.shift();

  updateBackBtn();
};

/**
 * Update the back button visibility and tooltip
 */
window.updateBackBtn = function() {
  const btn   = document.getElementById('back-btn');
  if (!btn) return;

  const total = NAV_HISTORY.length + MODAL_HISTORY.length;

  if (total > 0) {
    btn.style.display = 'flex';
    const last = NAV_HISTORY.length > 0
      ? NAV_HISTORY[NAV_HISTORY.length - 1]
      : null;
    btn.title = last ? 'Back to: ' + last.description : 'Back';
  } else {
    btn.style.display = 'none';
  }
};

/**
 * Handle back button click
 * Pops modal stack first, then page nav stack
 */
window.goBack = function() {
  if (MODAL_HISTORY.length > 0) {
    MODAL_HISTORY.pop();
    if (MODAL_HISTORY.length > 0) {
      const prev = MODAL_HISTORY[MODAL_HISTORY.length - 1];
      _openModalDirect(prev.title, prev.content, prev.wide);
    } else {
      document.getElementById('global-modal')?.classList.remove('open');
    }
  } else if (NAV_HISTORY.length > 0) {
    const prev = NAV_HISTORY.pop();
    G._navGoingBack = true;
    if (typeof prev.restoreFn === 'function') prev.restoreFn();
    else if (prev.page && typeof showPage === 'function') {
      showPage(prev.page, prev.params || {});
    }
  }

  updateBackBtn();
};

// ============================================================
// RETURN BANNER
// Shown when an action sets a pending return destination
// e.g. "Return to Order #123 after adding payment"
// ============================================================

window.setPendingReturn = function(from, destination, msg, onReturn) {
  G.pendingReturn = { from, destination, msg, onReturn };
};

window.showReturnBanner = function() {
  const msgEl    = document.getElementById('return-msg');
  const bannerEl = document.getElementById('return-banner');
  if (msgEl)    msgEl.textContent = G.pendingReturn?.msg || '';
  if (bannerEl) bannerEl.classList.add('show');
};

window.hideReturnBanner = function() {
  document.getElementById('return-banner')?.classList.remove('show');
};

window.cancelReturn = function() {
  G.pendingReturn = null;
  hideReturnBanner();
};

// ============================================================
// COMMAND PALETTE (Ctrl+K)
// ============================================================

window.toggleCmdPalette = function() {
  window.cmdOpen ? closeCmdPalette() : openCmdPalette();
};

window.openCmdPalette = function() {
  window.cmdOpen = true;
  window.cmdIdx  = -1;

  const overlay = document.getElementById('cmd-palette-overlay');
  const input   = document.getElementById('cmd-input');

  if (overlay) overlay.classList.add('open');
  if (input) {
    input.value = '';
    input.focus();
  }

  renderCmdResults('');
};

window.closeCmdPalette = function() {
  window.cmdOpen = false;
  document.getElementById('cmd-palette-overlay')?.classList.remove('open');
};

/**
 * Render command palette results for a given query string
 * Shows recent pages when query is empty
 * Searches pages, orders, customers and fleet when query is 2+ chars
 */
window.renderCmdResults = function(query) {
  const results = document.getElementById('cmd-results');
  if (!results) return;

  const q = query.toLowerCase().trim();
  let html = '';
  window.cmdItems = [];

  // ---- Empty query: show recent + all pages ----
  if (!q) {
    const recent = JSON.parse(
      localStorage.getItem('cmdRecent') || '[]'
    ).slice(0, 3);

    if (recent.length) {
      html += `<div class="cmd-group">Recent</div>`;
      recent.forEach(r => {
        const p = CMD_PAGES.find(x => x.id === r);
        if (p) {
          window.cmdItems.push({ type: 'page', id: p.id });
          html += _cmdItemHTML(p.icon, p.title, p.sub, 'Page');
        }
      });
    }

    html += `<div class="cmd-group">Pages</div>`;
    CMD_PAGES.forEach(p => {
      if (!recent.includes(p.id)) {
        window.cmdItems.push({ type: 'page', id: p.id });
        html += _cmdItemHTML(p.icon, p.title, p.sub, 'Page');
      }
    });

    results.innerHTML = html;
    highlightCmdItem(0);
    return;
  }

  // ---- Search pages ----
  const matchedPages = CMD_PAGES.filter(p =>
    p.title.toLowerCase().includes(q) ||
    p.sub.toLowerCase().includes(q)   ||
    p.id.includes(q)
  );

  if (matchedPages.length) {
    html += `<div class="cmd-group">Pages</div>`;
    matchedPages.forEach(p => {
      window.cmdItems.push({ type: 'page', id: p.id });
      html += _cmdItemHTML(
        p.icon,
        _highlightMatch(p.title, q),
        p.sub,
        'Page'
      );
    });
  }

  // ---- Search orders (min 2 chars) ----
  if (q.length >= 2 && Array.isArray(allOrders) && allOrders.length) {
    const matched = allOrders.filter(o => {
      const hay = [
        o['No.'], o['اسم العميل'], o['كود العميل'],
        o['اسم السيارة'], o.id
      ].join(' ').toLowerCase();
      return hay.includes(q);
    }).slice(0, 6);

    if (matched.length) {
      html += `<div class="cmd-group">Orders</div>`;
      matched.forEach(o => {
        window.cmdItems.push({ type: 'order', id: o.id });
        const no     = o['No.'] || o.id;
        const client = o['اسم العميل'] || '—';
        const car    = o['اسم السيارة'] || '—';
        const st     = typeof getOrderStatus === 'function'
          ? getOrderStatus(o) : '';
        html += _cmdItemHTML(
          '📋',
          _highlightMatch(`#${no} — ${client}`, q),
          car,
          st
        );
      });
    }
  }

  // ---- Search customers (min 2 chars) ----
  if (q.length >= 2 && G.customers?.length) {
    const matched = G.customers.filter(c => {
      const name     = String((c['الاسم الأول'] || '') + ' ' + (c['الاسم الأخير'] || '')).toLowerCase();
      const phone    = String(c['رقم التليفون']     || '').toLowerCase();
      const passport = String(c['رقم جواز السفر']  || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || passport.includes(q);
    }).slice(0, 6);

    if (matched.length) {
      html += `<div class="cmd-group">Customers</div>`;
      matched.forEach(c => {
        window.cmdItems.push({ type: 'customer', id: c.id });
        const name  = ((c['الاسم الأول'] || '') + ' ' + (c['الاسم الأخير'] || '')).trim();
        const phone = c['رقم التليفون'] || '';
        html += _cmdItemHTML(
          '👤',
          _highlightMatch(name, q),
          `#${c['No.'] || c.id} · ${phone}`,
          'CRM'
        );
      });
    }
  }

  // ---- Search fleet (min 2 chars) ----
  if (q.length >= 2 && G.fleet?.length) {
    const matched = G.fleet.filter(c => {
      const label = typeof getCarLabel === 'function' ? getCarLabel(c, 'en') : '';
      const plate = c.plate || '';
      const id    = String(c.ID || c.id || '');
      return (
        label.toLowerCase().includes(q) ||
        plate.toLowerCase().includes(q) ||
        id.includes(q)
      );
    }).slice(0, 6);

    if (matched.length) {
      html += `<div class="cmd-group">Fleet</div>`;
      matched.forEach(c => {
        window.cmdItems.push({ type: 'car', id: c.ID || c.id });
        const label  = typeof getCarLabel === 'function'
          ? getCarLabel(c, 'en')
          : (c.ID || c.id);
        const status = c.status || c.Contract || '';
        html += _cmdItemHTML(
          '🚗',
          _highlightMatch(label, q),
          c.plate || '',
          status
        );
      });
    }
  }

  // ---- No results ----
  if (!html) {
    html = `<div style="text-align:center;padding:30px;
      color:var(--text3);font-size:12px;">
      No results for "${query}"
    </div>`;
  }

  results.innerHTML = html;
  highlightCmdItem(0);
};

/**
 * Highlight the command item at a given index
 */
window.highlightCmdItem = function(idx) {
  window.cmdIdx = idx;
  document.querySelectorAll('.cmd-item').forEach((el, i) => {
    el.classList.toggle('active', i === idx);
    if (i === idx) el.scrollIntoView({ block: 'nearest' });
  });
};

/**
 * Execute the selected command palette item
 */
window.executeCmdItem = function(idx) {
  const item = window.cmdItems[idx];
  if (!item) return;

  closeCmdPalette();

  if (item.type === 'page') {
    if (typeof showPage === 'function') showPage(item.id);

    // Save to recent pages
    let recent = JSON.parse(localStorage.getItem('cmdRecent') || '[]');
    recent = recent.filter(r => r !== item.id);
    recent.unshift(item.id);
    localStorage.setItem('cmdRecent', JSON.stringify(recent.slice(0, 8)));

  } else if (item.type === 'order') {
    if (typeof openOrderDetail === 'function') openOrderDetail(item.id);

  } else if (item.type === 'customer') {
    if (typeof openClientProfile === 'function') openClientProfile(item.id);

  } else if (item.type === 'car') {
    if (typeof openCarDetailModal === 'function') openCarDetailModal(item.id);
  }
};

// ============================================================
// INTERNAL HELPERS (not exposed to window)
// ============================================================

/** Build HTML for a single command palette result item */
function _cmdItemHTML(icon, title, sub, badge) {
  const idx = window.cmdItems.length - 1;
  return `
    <div class="cmd-item"
      onmouseenter="highlightCmdItem(${idx})"
      onclick="executeCmdItem(${idx})">
      <span class="ci-icon">${icon}</span>
      <div class="ci-body">
        <div class="ci-title">${title}</div>
        ${sub ? `<div class="ci-sub">${sub}</div>` : ''}
      </div>
      ${badge ? `<span class="ci-badge">${badge}</span>` : ''}
    </div>`;
}

/** Highlight matching text within a string */
function _highlightMatch(text, q) {
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return text;
  return (
    text.slice(0, idx) +
    `<span style="color:var(--accent);font-weight:800;">` +
    text.slice(idx, idx + q.length) +
    `</span>` +
    text.slice(idx + q.length)
  );
}

// ============================================================
// EVENT LISTENERS
// All modal and palette keyboard/click handlers in one place
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  // ---- Modal close button ----
  document.getElementById('modal-close-btn')
    ?.addEventListener('click', closeModal);

  // ---- Close modal by clicking overlay background ----
  document.getElementById('global-modal')
    ?.addEventListener('click', e => {
      if (e.target === document.getElementById('global-modal')) {
        closeModal();
      }
    });

  // ---- Back button ----
  document.getElementById('back-btn')
    ?.addEventListener('click', goBack);

  // ---- Cancel return banner ----
  document.getElementById('cancel-return-btn')
    ?.addEventListener('click', cancelReturn);

  // ---- Command palette trigger button ----
  document.getElementById('cmd-trigger')
    ?.addEventListener('click', toggleCmdPalette);

  // ---- Close palette by clicking overlay ----
  document.getElementById('cmd-palette-overlay')
    ?.addEventListener('click', e => {
      if (e.target === document.getElementById('cmd-palette-overlay')) {
        closeCmdPalette();
      }
    });

  // ---- Command palette live search (debounced) ----
  const cmdInput = document.getElementById('cmd-input');
  if (cmdInput) {
    let _cmdTimer = null;
    cmdInput.addEventListener('input', () => {
      clearTimeout(_cmdTimer);
      _cmdTimer = setTimeout(
        () => renderCmdResults(cmdInput.value),
        120
      );
    });
  }

  // ---- Keyboard shortcuts ----
  document.addEventListener('keydown', e => {

    // Ctrl+K or Cmd+K — open palette
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      toggleCmdPalette();
      return;
    }

    // Keys only active when palette is open
    if (window.cmdOpen) {
      if (e.key === 'Escape') {
        closeCmdPalette();
        e.preventDefault();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        highlightCmdItem(
          Math.min(window.cmdIdx + 1, window.cmdItems.length - 1)
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        highlightCmdItem(Math.max(window.cmdIdx - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (window.cmdIdx >= 0) executeCmdItem(window.cmdIdx);
        return;
      }
    }

    // Escape — close modal or dropdowns
    if (e.key === 'Escape') {
      const modal = document.getElementById('global-modal');
      if (modal?.classList.contains('open')) {
        closeModal();
        return;
      }
      const dd = document.getElementById('notif-dropdown');
      if (dd?.classList.contains('open')) {
        dd.classList.remove('open');
        return;
      }
      // Close rate edit popups
      ['usd', 'eur'].forEach(c => {
        document.getElementById(`${c}-edit-popup`)
          ?.classList.add('hidden');
      });
    }
  });

  // ---- Close notification dropdown when clicking outside ----
  document.addEventListener('click', e => {
    const dd  = document.getElementById('notif-dropdown');
    const btn = document.getElementById('notif-btn');
    if (dd && btn &&
        !dd.contains(e.target) &&
        !btn.contains(e.target)) {
      dd.classList.remove('open');
    }
  });

  // ---- Close rate edit popups when clicking outside ----
  document.addEventListener('click', e => {
    ['usd', 'eur'].forEach(c => {
      const wrap  = document.getElementById(`${c}-pill-wrap`);
      const popup = document.getElementById(`${c}-edit-popup`);
      if (wrap && popup && !wrap.contains(e.target)) {
        popup.classList.add('hidden');
      }
    });
  });

  // ---- Close CRM suggestion dropdowns when clicking outside ----
  document.addEventListener('click', e => {
    ['pr', 'en', 'ar'].forEach(prefix => {
      const sugBox = document.getElementById(`${prefix}-suggestions`);
      const input  = document.getElementById(`${prefix}-client-search`);
      if (sugBox && input &&
          !sugBox.contains(e.target) &&
          e.target !== input) {
        sugBox.style.display = 'none';
      }
    });
  });

  // ---- Mark all notifications read ----
  document.getElementById('mark-all-read-btn')
    ?.addEventListener('click', markAllRead);

  // ---- Notification dropdown toggle ----
  document.getElementById('notif-btn')
    ?.addEventListener('click', () => {
      document.getElementById('notif-dropdown')
        ?.classList.toggle('open');
    });

});
