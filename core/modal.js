// ============================================================
// core/modal.js v4.1
// Global modal stack, back navigation, return banner,
// command palette (Ctrl+K)
// ============================================================

// ============================================================
// COMMAND PALETTE PAGE DEFINITIONS
// ============================================================
const CMD_PAGES = [
  { id:'dashboard',       icon:'📊', title:'Dashboard',          sub:'Overview & KPIs'                },
  { id:'fleet-radar',     icon:'📡', title:'Fleet Radar',         sub:'Gantt chart — all cars'         },
  { id:'order-book',      icon:'📋', title:'Order Book',          sub:'All rental orders'              },
  { id:'vehicle-360',     icon:'🔭', title:'Vehicle 360',         sub:'Per-car financials'             },
  { id:'risk-radar',      icon:'⚠️', title:'Risk Radar',          sub:'License & insurance expiry'    },
  { id:'proposals',       icon:'📋', title:'Proposals',           sub:'Draft proposals'                },
  { id:'en-contract',     icon:'📄', title:'EN Contract',         sub:'Generate English contract'      },
  { id:'ar-contract',     icon:'📝', title:'AR Contract',         sub:'Generate Arabic contract'       },
  { id:'receipts',        icon:'🧾', title:'Receipts',            sub:'Generate & manage receipts'     },
  { id:'income-expenses', icon:'💰', title:'Income & Expenses',   sub:'Financial reports'              },
  { id:'crm',             icon:'👥', title:'CRM Hub',             sub:'Customer database'              },
  { id:'tasks',           icon:'✅', title:'Task Manager',        sub:'Assign & track tasks'           },
  { id:'approvals',       icon:'🔔', title:'Approvals',           sub:'Pending approval requests'      },
  { id:'system-logs',     icon:'📜', title:'System Logs',         sub:'Audit trail'                    },
  { id:'settings',        icon:'⚙️', title:'Settings',            sub:'System configuration'           }
];

// ============================================================
// MODAL SYSTEM
// ============================================================
window.openModal = function(title, html, wide) {
  wide = wide || false;
  MODAL_HISTORY.push({ title, content: html, wide });
  _openModalDirect(title, html, wide);
  updateBackBtn();
};

window._openModalDirect = function(title, html, wide) {
  wide = wide || false;
  const titleEl  = document.getElementById('global-modal-title');
  const bodyEl   = document.getElementById('global-modal-body');
  const boxEl    = document.getElementById('global-modal-box');
  const overlay  = document.getElementById('global-modal');
  if (titleEl) titleEl.textContent = title;
  if (bodyEl)  bodyEl.innerHTML    = html;
  if (boxEl)   boxEl.className     = 'modal-box' + (wide ? ' wide' : '');
  if (overlay) overlay.classList.add('open');

  // ✅ Auto-focus first interactive element
  setTimeout(() => {
    const first = bodyEl?.querySelector(
      'input:not([type="hidden"]),select,textarea,button'
    );
    if (first && typeof first.focus === 'function') first.focus();
  }, 80);
};

window.closeModal = function() {
  MODAL_HISTORY.pop();
  if (MODAL_HISTORY.length > 0) {
    const prev = MODAL_HISTORY[MODAL_HISTORY.length - 1];
    _openModalDirect(prev.title, prev.content, prev.wide);
  } else {
    const overlay = document.getElementById('global-modal');
    if (overlay) overlay.classList.remove('open');
    const body = document.getElementById('global-modal-body');
    if (body) body.innerHTML = '';
  }
  updateBackBtn();
};

// ============================================================
// BACK NAVIGATION
// ============================================================
window.pushNav = function(description, restoreFn) {
  NAV_HISTORY.push({ description, restoreFn, ts: Date.now() });
  if (NAV_HISTORY.length > 30) NAV_HISTORY.shift();
  updateBackBtn();
};

window.updateBackBtn = function() {
  const btn   = document.getElementById('back-btn');
  if (!btn) return;
  const total = (NAV_HISTORY||[]).length + (MODAL_HISTORY||[]).length;
  if (total > 0 && G.user) {
    btn.style.display = 'block';
    const last = NAV_HISTORY?.length > 0
      ? NAV_HISTORY[NAV_HISTORY.length - 1] : null;
    btn.title = last ? 'Back to: ' + last.description : 'Back';
  } else {
    btn.style.display = 'none';
  }
};

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
  const overlay  = document.getElementById('cmd-palette-overlay');
  const input    = document.getElementById('cmd-input');
  if (overlay) overlay.classList.add('open');
  if (input)   { input.value = ''; input.focus(); }
  renderCmdResults('');
};

window.closeCmdPalette = function() {
  window.cmdOpen = false;
  document.getElementById('cmd-palette-overlay')?.classList.remove('open');
};

window.renderCmdResults = function(query) {
  const results = document.getElementById('cmd-results');
  if (!results) return;

  const q = query.toLowerCase().trim();
  let html = '';
  window.cmdItems = [];

  // ── Empty query: show recent + all pages ──────────────────
  if (!q) {
    const recent = JSON.parse(localStorage.getItem('cmdRecent') || '[]').slice(0, 3);
    if (recent.length) {
      html += `<div class="cmd-group">Recent</div>`;
      recent.forEach(r => {
        const p = CMD_PAGES.find(x => x.id === r);
        if (p) {
          window.cmdItems.push({ type:'page', id:p.id });
          html += _cmdItemHTML(p.icon, p.title, p.sub, 'Page');
        }
      });
    }
    html += `<div class="cmd-group">Pages</div>`;
    CMD_PAGES.forEach(p => {
      if (!recent.includes(p.id)) {
        window.cmdItems.push({ type:'page', id:p.id });
        html += _cmdItemHTML(p.icon, p.title, p.sub, 'Page');
      }
    });
    results.innerHTML = html;
    highlightCmdItem(0);
    return;
  }

  // ── Search pages ───────────────────────────────────────────
  const matchedPages = CMD_PAGES.filter(p =>
    p.title.toLowerCase().includes(q) ||
    p.sub.toLowerCase().includes(q)   ||
    p.id.includes(q)
  );
  if (matchedPages.length) {
    html += `<div class="cmd-group">Pages</div>`;
    matchedPages.forEach(p => {
      window.cmdItems.push({ type:'page', id:p.id });
      html += _cmdItemHTML(p.icon, _highlightMatch(p.title, q), p.sub, 'Page');
    });
  }

  // ── Search orders ──────────────────────────────────────────
  if (q.length >= 2 && Array.isArray(window.allOrders) && window.allOrders.length) {
    const matched = window.allOrders.filter(o => {
      const hay = [
        o['No.'], o['اسم العميل'], o['كود العميل'],
        o['اسم السيارة'], o.id
      ].join(' ').toLowerCase();
      return hay.includes(q);
    }).slice(0, 6);

    if (matched.length) {
      html += `<div class="cmd-group">Orders</div>`;
      matched.forEach(o => {
        window.cmdItems.push({ type:'order', id:o.id });
        const no     = o['No.'] || o.id;
        const client = o['اسم العميل'] || '—';
        const car    = o['اسم السيارة'] || '—';
        const st     = typeof getOrderStatus === 'function' ? getOrderStatus(o) : '';
        html += _cmdItemHTML(
          '📋',
          _highlightMatch(`#${no} — ${client}`, q),
          car, st
        );
      });
    }
  }

  // ── Search customers ────────────────────────────────────────
  if (q.length >= 2 && G.customers?.length) {
    const matched = G.customers.filter(c => {
      const name     = `${c['الاسم الأول']||''} ${c['الاسم الأخير']||''}`.toLowerCase();
      const phone    = String(c['رقم التليفون'] || '').toLowerCase();
      const passport = String(c['رقم جواز السفر'] || '').toLowerCase();
      const natid    = String(c['الرقم القومي'] || '').toLowerCase();
      return name.includes(q) || phone.includes(q) ||
             passport.includes(q) || natid.includes(q);
    }).slice(0, 6);

    if (matched.length) {
      html += `<div class="cmd-group">Customers</div>`;
      matched.forEach(c => {
        window.cmdItems.push({ type:'customer', id:c.id });
        const name  = `${c['الاسم الأول']||''} ${c['الاسم الأخير']||''}`.trim();
        const phone = c['رقم التليفون'] || '';
        html += _cmdItemHTML(
          '👤',
          _highlightMatch(name, q),
          `#${c['No.']||c.id} · ${phone}`,
          'CRM'
        );
      });
    }
  }

  // ── Search fleet ───────────────────────────────────────────
  if (q.length >= 2 && G.fleet?.length) {
    const matched = G.fleet.filter(c => {
      const label = typeof getCarLabel === 'function' ? getCarLabel(c,'en') : '';
      const plate = typeof formatPlate === 'function' ? formatPlate(c) : (c.plate||'');
      const id    = String(c.ID || c.id || '');
      return label.toLowerCase().includes(q) ||
             plate.toLowerCase().includes(q) ||
             id.includes(q);
    }).slice(0, 6);

    if (matched.length) {
      html += `<div class="cmd-group">Fleet</div>`;
      matched.forEach(c => {
        window.cmdItems.push({ type:'car', id:c.ID||c.id });
        const label  = typeof getCarLabel === 'function'
          ? getCarLabel(c,'en') : String(c.ID||c.id);
        const plate  = typeof formatPlate === 'function' ? formatPlate(c) : (c.plate||'');
        const status = c.status || c.Contract || '';
        html += _cmdItemHTML(
          '🚗',
          _highlightMatch(label, q),
          plate || status,
          status
        );
      });
    }
  }

  // ── Search proposals ────────────────────────────────────────
  if (q.length >= 2 && G.proposals?.length) {
    const matched = G.proposals.filter(p => {
      const hay = [p.client_name, p.car_label, p.contract_no, p.proposal_ref]
        .join(' ').toLowerCase();
      return hay.includes(q);
    }).slice(0, 4);

    if (matched.length) {
      html += `<div class="cmd-group">Proposals</div>`;
      matched.forEach(p => {
        window.cmdItems.push({ type:'page', id:'proposals' });
        html += _cmdItemHTML(
          '📋',
          _highlightMatch(p.client_name || p.proposal_ref || '—', q),
          p.car_label || '—',
          p.status || '—'
        );
      });
    }
  }

  // ── No results ─────────────────────────────────────────────
  if (!html) {
    html = `
      <div style="text-align:center;padding:30px;color:var(--text3);font-size:12px;">
        No results for "<strong>${query}</strong>"
      </div>`;
  }

  results.innerHTML = html;
  highlightCmdItem(0);
};

window.highlightCmdItem = function(idx) {
  window.cmdIdx = idx;
  document.querySelectorAll('.cmd-item').forEach((el, i) => {
    el.classList.toggle('active', i === idx);
    if (i === idx) el.scrollIntoView({ block:'nearest' });
  });
};

window.executeCmdItem = function(idx) {
  const item = window.cmdItems[idx];
  if (!item) return;
  closeCmdPalette();

  if (item.type === 'page') {
    if (typeof showPage === 'function') showPage(item.id);
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
// INTERNAL HELPERS
// ============================================================
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

function _highlightMatch(text, q) {
  if (!q || !text) return text || '';
  const idx = String(text).toLowerCase().indexOf(q);
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
// ============================================================
document.addEventListener('DOMContentLoaded', () => {

  // ── Modal close button ─────────────────────────────────────
  document.getElementById('modal-close-btn')
    ?.addEventListener('click', closeModal);

  // ── Close modal by clicking overlay background ────────────
  document.getElementById('global-modal')
    ?.addEventListener('click', e => {
      if (e.target === document.getElementById('global-modal')) {
        closeModal();
      }
    });

  // ── Back button ────────────────────────────────────────────
  // ✅ Only attach here — auth.js goBack() is the same function
  document.getElementById('back-btn')
    ?.addEventListener('click', goBack);

  // ── Cancel return banner ───────────────────────────────────
  document.getElementById('cancel-return-btn')
    ?.addEventListener('click', cancelReturn);

  // ── Command palette trigger ────────────────────────────────
  document.getElementById('cmd-trigger')
    ?.addEventListener('click', toggleCmdPalette);

  // ── Close palette by clicking overlay ─────────────────────
  document.getElementById('cmd-palette-overlay')
    ?.addEventListener('click', e => {
      if (e.target === document.getElementById('cmd-palette-overlay')) {
        closeCmdPalette();
      }
    });

  // ── Command palette live search ────────────────────────────
  const cmdInput = document.getElementById('cmd-input');
  if (cmdInput) {
    let _cmdTimer = null;
    cmdInput.addEventListener('input', () => {
      clearTimeout(_cmdTimer);
      _cmdTimer = setTimeout(() => renderCmdResults(cmdInput.value), 120);
    });
  }

  // ── Keyboard shortcuts ─────────────────────────────────────
  document.addEventListener('keydown', e => {

    // Ctrl+K / Cmd+K — open palette
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      toggleCmdPalette();
      return;
    }

    // Palette-specific keys
    if (window.cmdOpen) {
      if (e.key === 'Escape') {
        closeCmdPalette(); e.preventDefault(); return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        highlightCmdItem(Math.min(window.cmdIdx + 1, window.cmdItems.length - 1));
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

    // Escape — close modal → dropdown → rate popups
    if (e.key === 'Escape') {
      const modal = document.getElementById('global-modal');
      if (modal?.classList.contains('open')) { closeModal(); return; }

      const dd = document.getElementById('notif-dropdown');
      if (dd?.classList.contains('open')) { dd.classList.remove('open'); return; }

      ['usd','eur'].forEach(c => {
        document.getElementById(c + '-edit-popup')?.classList.add('hidden');
      });
    }
  });

  // ── Close rate edit popups when clicking outside ───────────
  document.addEventListener('click', e => {
    ['usd','eur'].forEach(c => {
      const wrap  = document.getElementById(c + '-pill-wrap');
      const popup = document.getElementById(c + '-edit-popup');
      if (wrap && popup && !wrap.contains(e.target)) {
        popup.classList.add('hidden');
      }
    });
  });

  // ── Close CRM suggestion dropdowns when clicking outside ───
  document.addEventListener('click', e => {
    ['pr','en','ar'].forEach(prefix => {
      const sugBox = document.getElementById(prefix + '-suggestions');
      const input  = document.getElementById(prefix + '-client-search');
      if (sugBox && input &&
          !sugBox.contains(e.target) && e.target !== input) {
        sugBox.style.display = 'none';
      }
    });
  });

  // ✅ NOTE: notif-btn toggle and mark-all-read-btn are wired
  // in toast.js DOMContentLoaded — not duplicated here
});
