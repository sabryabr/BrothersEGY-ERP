// ============================================================
// modules/receipts.js
// Receipt generation — merges both receipt-generator.html
// reference designs:
// - Digital Receipt Generator (clean A4, auto-sign, QR+barcode)
// - Full ERP Receipt Generator (Firebase save, edit mode,
//   payment breakdown, type badges, verify URL)
// Plus: saved receipts list, filters, reprint, deposit flow
// ============================================================

// ============================================================
// ENTRY POINT
// ============================================================

window.renderReceipts = function() {
  renderPageLoading('page-receipts', '🧾', 'Receipts');
  loadReceiptsPage();
};

window.loadReceiptsPage = async function() {
  const el = document.getElementById('page-receipts');
  if (!el) return;

  // Cache for saved receipts
  window._receiptsCache = window._receiptsCache || [];

  el.innerHTML = `
    <div class="section-header">
      <div>
        <h2>🧾 Receipts</h2>
        <p>Generate, manage and reprint digital payment receipts</p>
      </div>
      <div style="display:flex;gap:6px;">
        <button class="btn btn-ghost btn-sm rc-main-tab"
          id="rc-tab-new"
          style="border-color:var(--accent);color:var(--accent);"
          onclick="switchReceiptTab('new',this)">
          ➕ New Receipt
        </button>
        <button class="btn btn-ghost btn-sm rc-main-tab"
          id="rc-tab-list"
          onclick="switchReceiptTab('list',this)">
          📋 Saved Receipts
        </button>
      </div>
    </div>

    <!-- ====================================================
         NEW RECEIPT PANE
    ==================================================== -->
    <div id="rc-new-pane">
      <div style="display:grid;grid-template-columns:400px 1fr;
        gap:14px;align-items:start;">

        <!-- CONTROL PANEL -->
        <div class="panel sticky-panel"
          style="max-height:calc(100vh - 120px);overflow-y:auto;">

          <div style="display:flex;align-items:center;
            justify-content:space-between;margin-bottom:13px;">
            <h3 style="font-size:13px;font-weight:800;">🧾 New Receipt</h3>
            <span id="rc-ref-preview"
              style="font-size:10px;color:var(--accent);font-weight:700;"></span>
          </div>

          <!-- Live rates -->
          <div style="display:flex;gap:7px;margin-bottom:13px;">
            <div style="flex:1;background:var(--glass);
              border:1px solid var(--border);border-radius:7px;
              padding:7px;text-align:center;">
              <div style="font-size:9px;color:var(--text3);">USD</div>
              <div id="rc-usd-rate"
                style="font-weight:800;color:var(--success);font-size:12px;">
                ${G.ratesUSD.toFixed(2)}
              </div>
            </div>
            <div style="flex:1;background:var(--glass);
              border:1px solid var(--border);border-radius:7px;
              padding:7px;text-align:center;">
              <div style="font-size:9px;color:var(--text3);">EUR</div>
              <div id="rc-eur-rate"
                style="font-weight:800;color:var(--success);font-size:12px;">
                ${G.ratesEUR.toFixed(2)}
              </div>
            </div>
          </div>

          <!-- ① Document Info -->
          <div style="margin-bottom:13px;">
            <div style="font-size:10px;font-weight:800;color:var(--accent);
              text-transform:uppercase;margin-bottom:8px;padding-bottom:5px;
              border-bottom:1px solid var(--border);">① Document Info</div>
            <div class="field" style="margin-bottom:7px;">
              <label>Contract / Order No.</label>
              <input type="text" id="rc-contract-no"
                placeholder="e.g. 578 or CN-HRG-0402-001"
                oninput="rcLookupDebounced()"/>
            </div>
            <div id="rc-lookup-status"
              style="font-size:10px;min-height:16px;margin-bottom:7px;"></div>
            <div id="rc-no-contract-warn"
              style="display:none;background:rgba(239,68,68,0.1);
                border:1px solid var(--danger);border-radius:8px;
                padding:9px;font-size:11px;color:var(--danger);
                margin-bottom:9px;">
              ⚠️ No contract found with this number.
              <button class="btn btn-ghost btn-xs" style="margin-left:7px;"
                onclick="showPage('en-contract')">Create Contract</button>
            </div>
            <div class="form-grid">
              <div class="field">
                <label>Receipt Date</label>
                <input type="date" id="rc-date"/>
              </div>
              <div class="field">
                <label>Receipt Title</label>
                <input type="text" id="rc-title"
                  placeholder="e.g. Rental Payment"/>
              </div>
              <div class="field" style="grid-column:1/-1;">
                <label>Receipt Type</label>
                <select id="rc-type" onchange="rcTypeChange()">
                  <option value="Income">💰 Rental Payment</option>
                  <option value="Deposit">🔒 Deposit Collected</option>
                  <option value="Deposit Return">✅ Deposit Returned</option>
                  <option value="Overdue Settlement">⚠️ Overdue Settlement</option>
                  <option value="Accident Settlement">🚨 Accident Settlement</option>
                  <option value="Partial Payment">📋 Partial Payment</option>
                  <option value="Penalty Payment">⚠️ Penalty Payment</option>
                </select>
              </div>
              <div class="field">
                <label>Branch</label>
                <select id="rc-branch">
                  <option value="HRG">Hurghada</option>
                  <option value="ALX">Alexandria</option>
                  <option value="CAI">Cairo</option>
                  <option value="RSH">Rashid</option>
                </select>
              </div>
            </div>
            <div id="rc-deposit-return-warn"
              style="display:none;margin-top:9px;padding:9px 11px;
                background:rgba(34,197,94,0.08);
                border:1px solid rgba(34,197,94,0.3);
                border-radius:8px;font-size:11px;color:var(--success);">
              ✅ Deposit Return: Order must be Closed or fully paid.
            </div>
          </div>

          <!-- ② Client & Vehicle (auto-filled) -->
          <div style="margin-bottom:13px;">
            <div style="font-size:10px;font-weight:800;color:var(--accent);
              text-transform:uppercase;margin-bottom:8px;padding-bottom:5px;
              border-bottom:1px solid var(--border);">
              ② Client & Vehicle
              <span style="font-weight:400;color:var(--text3);
                text-transform:none;font-size:9px;"> (auto-filled)</span>
            </div>
            <div class="form-grid">
              <div class="field">
                <label>Client Name</label>
                <input type="text" id="rc-client-name"
                  placeholder="Auto-filled from contract"/>
              </div>
              <div class="field">
                <label>Passport / ID</label>
                <input type="text" id="rc-client-id"
                  placeholder="Auto-filled"/>
              </div>
              <div class="field">
                <label>Phone</label>
                <input type="text" id="rc-phone"
                  placeholder="Auto-filled or enter manually"/>
              </div>
              <div class="field">
                <label>Vehicle</label>
                <input type="text" id="rc-vehicle"
                  placeholder="Auto-filled"/>
              </div>
              <div class="field">
                <label>Rental Start</label>
                <input type="text" id="rc-start"
                  placeholder="Auto-filled"/>
              </div>
              <div class="field">
                <label>Rental End</label>
                <input type="text" id="rc-end"
                  placeholder="Auto-filled"/>
              </div>
            </div>
          </div>

          <!-- ③ Payment Received -->
          <div style="margin-bottom:13px;">
            <div style="font-size:10px;font-weight:800;color:var(--accent);
              text-transform:uppercase;margin-bottom:8px;padding-bottom:5px;
              border-bottom:1px solid var(--border);">
              ③ Payment Received Now
            </div>
            <div class="form-grid g3" style="margin-bottom:8px;">
              <div class="field">
                <label>EGP</label>
                <input type="number" id="rc-egp"
                  value="0" min="0" oninput="rcCalc()"/>
              </div>
              <div class="field">
                <label>USD (×${G.ratesUSD.toFixed(2)})</label>
                <input type="number" id="rc-usd"
                  value="0" min="0" oninput="rcCalc()"/>
              </div>
              <div class="field">
                <label>EUR (×${G.ratesEUR.toFixed(2)})</label>
                <input type="number" id="rc-eur"
                  value="0" min="0" oninput="rcCalc()"/>
              </div>
            </div>
            <div class="form-grid" style="margin-bottom:10px;">
              <div class="field">
                <label>Card (EGP)</label>
                <input type="number" id="rc-card"
                  value="0" min="0" oninput="rcCalc()"/>
              </div>
            </div>

            <!-- Account Summary -->
            <div style="background:var(--surface2);border:1px solid var(--border);
              border-radius:9px;padding:11px;margin-top:9px;">
              <div style="font-size:10px;color:var(--text3);font-weight:700;
                margin-bottom:7px;text-transform:uppercase;">
                Account Summary
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;
                gap:4px;font-size:11px;">
                <span style="color:var(--text3);">Contract Value:</span>
                <span id="rc-total-due" style="font-weight:700;">£0.00</span>
                <span style="color:var(--text3);">Previously Paid:</span>
                <span id="rc-prev-paid">£0.00</span>
                <span style="color:var(--text3);">Held Deposit:</span>
                <span id="rc-held-deposit">£0.00</span>
                <span style="color:var(--text3);">This Payment:</span>
                <span id="rc-this-payment"
                  style="color:var(--success);font-weight:700;">£0.00</span>
              </div>
              <div style="border-top:1px solid var(--border);margin-top:7px;
                padding-top:7px;display:flex;justify-content:space-between;
                align-items:center;">
                <span style="font-size:11px;font-weight:700;">Outstanding After:</span>
                <span id="rc-outstanding"
                  style="font-size:14px;font-weight:900;color:var(--warning);">
                  £0.00
                </span>
              </div>
            </div>

            <!-- Notes & Auto-sign -->
            <div class="field" style="margin-top:10px;">
              <label>Additional Notes (optional)</label>
              <input type="text" id="rc-note"
                placeholder="e.g. Month 2 payment, partial settlement..."/>
            </div>
            <label style="display:flex;align-items:center;gap:9px;
              margin-top:10px;cursor:pointer;font-size:11px;">
              <input type="checkbox" id="rc-autosign"
                style="width:14px;height:14px;" checked/>
              Include digital auto-signature
            </label>
          </div>

          <!-- Actions -->
          <button class="btn btn-primary btn-full"
            onclick="generateReceipt()">
            🧾 Generate Receipt
          </button>
          <button class="btn btn-ghost btn-full mt-8"
            onclick="clearReceiptForm()">
            ✕ Clear Form
          </button>
        </div>

        <!-- OUTPUT PANEL -->
        <div>
          <div id="rc-output" style="display:none;">
            <div style="display:flex;gap:7px;margin-bottom:11px;flex-wrap:wrap;">
              <button class="btn btn-primary"
                onclick="printReceiptWindow()">
                🖨️ Print / Save PDF
              </button>
              <button class="btn btn-success"
                onclick="saveReceiptToERP()">
                💾 Save to ERP
              </button>
              <button class="btn btn-ghost"
                onclick="document.getElementById('rc-output').style.display='none';
                  document.getElementById('rc-placeholder').style.display='block'">
                ✕ Close
              </button>
            </div>
            <div id="rc-a4-wrap"></div>
          </div>
          <div id="rc-placeholder" class="empty-state"
            style="padding:80px 20px;">
            <div style="font-size:44px;margin-bottom:13px;">🧾</div>
            <p style="font-size:13px;font-weight:700;margin-bottom:5px;">
              Enter a contract number to begin
            </p>
            <p style="font-size:11px;">
              The system will auto-fill all client, vehicle and financial
              details from the database
            </p>
          </div>
        </div>

      </div>
    </div>

    <!-- ====================================================
         SAVED RECEIPTS PANE
    ==================================================== -->
    <div id="rc-list-pane" style="display:none;">

      <!-- KPI Row -->
      <div style="display:grid;
        grid-template-columns:repeat(auto-fill,minmax(140px,1fr));
        gap:10px;margin-bottom:14px;">
        <div class="kpi-card">
          <div class="kpi-label">Total Receipts</div>
          <div class="kpi-value text-accent" id="rcl-kpi-total">--</div>
          <div class="kpi-sub">In database</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total Collected</div>
          <div class="kpi-value text-success" id="rcl-kpi-collected">--</div>
          <div class="kpi-sub">All receipts</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Deposits Held</div>
          <div class="kpi-value text-warning" id="rcl-kpi-deposits">--</div>
          <div class="kpi-sub">Collected deposits</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Deposits Returned</div>
          <div class="kpi-value text-success" id="rcl-kpi-returned">--</div>
          <div class="kpi-sub">Refunded to clients</div>
        </div>
      </div>

      <!-- Filters -->
      <div class="panel" style="margin-bottom:14px;">
        <div style="display:flex;gap:9px;flex-wrap:wrap;align-items:flex-end;">
          <div style="flex:1;min-width:160px;">
            <div style="font-size:10px;color:var(--text3);
              margin-bottom:3px;font-weight:700;">🔍 SEARCH</div>
            <input type="text" id="rcl-search"
              placeholder="Client, receipt ref, contract..."
              style="width:100%;padding:7px 11px;background:var(--surface2);
                border:1px solid var(--border);border-radius:8px;color:var(--text);"
              oninput="filterSavedReceipts()"/>
          </div>
          <div>
            <div style="font-size:10px;color:var(--text3);
              margin-bottom:3px;font-weight:700;">TYPE</div>
            <select id="rcl-type" onchange="filterSavedReceipts()"
              style="padding:7px 9px;background:var(--surface2);
                border:1px solid var(--border);border-radius:8px;
                color:var(--text);">
              <option value="all">All Types</option>
              <option value="Income">Rental Payment</option>
              <option value="Deposit">Deposit</option>
              <option value="Deposit Return">Deposit Return</option>
              <option value="Overdue Settlement">Overdue Settlement</option>
              <option value="Accident Settlement">Accident Settlement</option>
              <option value="Partial Payment">Partial Payment</option>
              <option value="Penalty Payment">Penalty Payment</option>
            </select>
          </div>
          <div>
            <div style="font-size:10px;color:var(--text3);
              margin-bottom:3px;font-weight:700;">BRANCH</div>
            <select id="rcl-branch" onchange="filterSavedReceipts()"
              style="padding:7px 9px;background:var(--surface2);
                border:1px solid var(--border);border-radius:8px;
                color:var(--text);">
              <option value="all">All Branches</option>
              <option value="HRG">Hurghada</option>
              <option value="ALX">Alexandria</option>
              <option value="CAI">Cairo</option>
              <option value="RSH">Rashid</option>
            </select>
          </div>
          <div>
            <div style="font-size:10px;color:var(--text3);
              margin-bottom:3px;font-weight:700;">SORT</div>
            <select id="rcl-sort" onchange="filterSavedReceipts()"
              style="padding:7px 9px;background:var(--surface2);
                border:1px solid var(--border);border-radius:8px;
                color:var(--text);">
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="amount-high">Amount ↓</option>
              <option value="amount-low">Amount ↑</option>
            </select>
          </div>
          <button class="btn btn-ghost btn-sm"
            onclick="loadSavedReceipts()">🔄 Refresh</button>
          <button class="btn btn-ghost btn-sm" onclick="
            document.getElementById('rcl-search').value='';
            document.getElementById('rcl-type').value='all';
            document.getElementById('rcl-branch').value='all';
            filterSavedReceipts();">✕ Clear</button>
        </div>
      </div>

      <!-- Table -->
      <div class="panel">
        <div id="rcl-table-wrap" class="table-wrap">
          <div class="empty-state"><div class="spinner lg"></div></div>
        </div>
      </div>

    </div>`;

  // Set today's date
  const dateEl = document.getElementById('rc-date');
  if (dateEl) dateEl.value = todayISO();

  // Set branch from user
  const branchEl = document.getElementById('rc-branch');
  if (branchEl && G.user?.branch) branchEl.value = G.user.branch;

  // Load saved receipts in background
  loadSavedReceipts();
};

// ============================================================
// TAB SWITCH
// ============================================================

window.switchReceiptTab = function(tab, btn) {
  document.querySelectorAll('.rc-main-tab').forEach(b => {
    b.style.borderColor = 'var(--border)';
    b.style.color       = 'var(--text2)';
  });
  if (btn) {
    btn.style.borderColor = 'var(--accent)';
    btn.style.color       = 'var(--accent)';
  }
  const newPane  = document.getElementById('rc-new-pane');
  const listPane = document.getElementById('rc-list-pane');
  if (newPane)  newPane.style.display  = tab === 'new'  ? 'block' : 'none';
  if (listPane) listPane.style.display = tab === 'list' ? 'block' : 'none';
  if (tab === 'list') loadSavedReceipts();
};

// ============================================================
// CONTRACT LOOKUP
// ============================================================

let _rcLookupTimer = null;
window.rcLookupDebounced = function() {
  clearTimeout(_rcLookupTimer);
  _rcLookupTimer = setTimeout(_doRCLookup, 600);
};

window._rcCurrentBooking = null;

async function _doRCLookup() {
  const no    = (document.getElementById('rc-contract-no')?.value || '').trim();
  const stEl  = document.getElementById('rc-lookup-status');
  const warnEl= document.getElementById('rc-no-contract-warn');

  if (!no || no.length < 2) {
    if (stEl) stEl.textContent = '';
    window._rcCurrentBooking = null;
    _resetReceiptSummary();
    return;
  }

  if (stEl) { stEl.textContent = '🔍 Searching...'; stEl.style.color = 'var(--text3)'; }

  try {
    let data = null;

    // Try direct document ID first
    const direct = await db.collection('bookings').doc(no).get();
    if (direct.exists) {
      data = { id: direct.id, ...direct.data() };
    } else {
      // Try by No. field
      const q = await db.collection('bookings')
        .where('No.', '==', no).limit(1).get();
      if (!q.empty) data = { id: q.docs[0].id, ...q.docs[0].data() };
    }

    if (!data) {
      if (stEl) { stEl.textContent = `No contract found for "${no}"`;
                  stEl.style.color = 'var(--danger)'; }
      if (warnEl) warnEl.style.display = 'block';
      window._rcCurrentBooking = null;
      _resetReceiptSummary();
      return;
    }

    if (warnEl) warnEl.style.display = 'none';
    window._rcCurrentBooking = data;

    // Auto-fill fields
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || '';
    };
    set('rc-client-name', data['اسم العميل'] || '');
    set('rc-vehicle',     data['اسم السيارة'] || '');
    set('rc-start',       data['بداية التعاقد'] || '');
    set('rc-end',         data['نهاية التعاقد'] || '');

    // Get client ID and phone
    const clientNo = data['كود العميل'];
    if (clientNo) {
      set('rc-client-id', String(clientNo));
      const cust = G.customers.find(
        c => String(c['No.']) === String(clientNo)
      );
      if (cust) set('rc-phone', cust['رقم التليفون'] || '');
    }

    // Set branch from order
    const branchEl = document.getElementById('rc-branch');
    if (branchEl && data['فرع الإصدار']) {
      branchEl.value = data['فرع الإصدار'];
    }

    // Calculate financials
    const totalDue    = parseAmount(data['إجمالي المستحق (Total)']);
    const prevPaidEGP = parseAmount(data['المدفوع EGP']);
    const prevPaidUSD = parseAmount(data['المدفوع USD'] || '0') * G.ratesUSD;
    const prevPaidEUR = parseAmount(data['المدفوع EUR'] || '0') * G.ratesEUR;
    const prevPaid    = prevPaidEGP + prevPaidUSD + prevPaidEUR;
    const heldDeposit = parseAmount(data['الوديعة المعلقة لدينا'] || '0');
    const outstanding = Math.max(0, totalDue - prevPaid);

    document.getElementById('rc-total-due').textContent    = fmtMoney(totalDue);
    document.getElementById('rc-prev-paid').textContent    = fmtMoney(prevPaid);
    document.getElementById('rc-held-deposit').textContent = fmtMoney(heldDeposit);
    document.getElementById('rc-outstanding').textContent  = fmtMoney(outstanding);

    rcCalc();

    // Status display
    const st    = getOrderStatus(data);
    const today = new Date();
    const { end } = getOrderDates(data);
    const daily = parseAmount(data['سعر السيارة اليومي بالجنيه المصري']) ||
                  (totalDue / Math.max(1, parseFloat(data.rental_days || 1)));
    const lateDays   = end && today > end && !data.closed
      ? Math.max(0, Math.ceil((today - end) / 86400000)) : 0;
    const latePenalty= lateDays * daily;
    const totalDue2  = totalDue + latePenalty;
    const ostanding2 = Math.max(0, totalDue2 - prevPaid);

    const stColor = st === 'Accident' ? 'var(--orange)' :
                    st === 'Overdue'  ? 'var(--danger)' :
                    st === 'Closed'   ? 'var(--text3)'  : 'var(--success)';

    if (stEl) {
      stEl.innerHTML = `
        <div style="display:flex;align-items:center;gap:9px;padding:9px;
          background:var(--surface2);border-radius:8px;">
          <span style="font-size:13px;">
            ${st === 'Accident' ? '🚨' : st === 'Overdue' ? '⚠️' :
              st === 'Closed'   ? '✅' : '🚗'}
          </span>
          <div style="flex:1;">
            <div style="font-size:11px;font-weight:700;color:${stColor};">
              Order #${data['No.'] || data.id} — ${data['اسم العميل'] || '—'}
              ${st === 'Overdue' ? `<span style="color:var(--danger);">
                (${lateDays}d overdue)</span>` : ''}
            </div>
            <div style="font-size:10px;color:var(--text3);margin-top:2px;">
              Due: ${fmtMoney(totalDue2)} | Paid: ${fmtMoney(prevPaid)} |
              <strong style="color:${ostanding2 > 0 ? 'var(--danger)' : 'var(--success)'};">
                ${ostanding2 > 0 ? 'Owes: ' + fmtMoney(ostanding2) : 'Fully Paid ✅'}
              </strong>
              ${heldDeposit > 0 ? `| Deposit: ${fmtMoney(heldDeposit)}` : ''}
            </div>
          </div>
        </div>`;
      stEl.style.color = '';
    }

  } catch (e) {
    if (stEl) {
      stEl.textContent = 'Lookup failed: ' + e.message;
      stEl.style.color = 'var(--danger)';
    }
  }
}

function _resetReceiptSummary() {
  ['rc-total-due','rc-prev-paid','rc-held-deposit'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '£0.00';
  });
  document.getElementById('rc-this-payment').textContent = '£0.00';
  document.getElementById('rc-outstanding').textContent  = '£0.00';
}

window.rcTypeChange = function() {
  const type  = document.getElementById('rc-type')?.value;
  const warn  = document.getElementById('rc-deposit-return-warn');
  if (warn) warn.style.display = type === 'Deposit Return' ? 'block' : 'none';
};

window.rcCalc = function() {
  const egp  = parseFloat(document.getElementById('rc-egp')?.value)  || 0;
  const usd  = parseFloat(document.getElementById('rc-usd')?.value)  || 0;
  const eur  = parseFloat(document.getElementById('rc-eur')?.value)  || 0;
  const card = parseFloat(document.getElementById('rc-card')?.value) || 0;
  const total= egp + (usd * G.ratesUSD) + (eur * G.ratesEUR) + card;

  const tpEl = document.getElementById('rc-this-payment');
  if (tpEl) tpEl.textContent = fmtMoney(total);

  if (window._rcCurrentBooking) {
    const totalDue   = parseAmount(window._rcCurrentBooking['إجمالي المستحق (Total)']);
    const prevPaidEGP= parseAmount(window._rcCurrentBooking['المدفوع EGP']);
    const prevPaidUSD= parseAmount(window._rcCurrentBooking['المدفوع USD'] || '0') * G.ratesUSD;
    const prevPaidEUR= parseAmount(window._rcCurrentBooking['المدفوع EUR'] || '0') * G.ratesEUR;
    const prevPaid   = prevPaidEGP + prevPaidUSD + prevPaidEUR;
    const outstanding= Math.max(0, totalDue - prevPaid - total);
    const osEl = document.getElementById('rc-outstanding');
    if (osEl) {
      osEl.textContent = fmtMoney(outstanding);
      osEl.style.color = outstanding <= 0 ? 'var(--success)' : 'var(--warning)';
    }
  }

  return total;
};

// ============================================================
// GENERATE RECEIPT
// ============================================================

window.generateReceipt = async function() {
  const contractNo  = document.getElementById('rc-contract-no')?.value.trim();
  const clientName  = document.getElementById('rc-client-name')?.value.trim();
  const rcDate      = document.getElementById('rc-date')?.value;
  const rcTitle     = document.getElementById('rc-title')?.value.trim() || 'Payment Receipt';
  const rcType      = document.getElementById('rc-type')?.value || 'Income';
  const egp         = parseFloat(document.getElementById('rc-egp')?.value)  || 0;
  const usd         = parseFloat(document.getElementById('rc-usd')?.value)  || 0;
  const eur         = parseFloat(document.getElementById('rc-eur')?.value)  || 0;
  const card        = parseFloat(document.getElementById('rc-card')?.value) || 0;
  const note        = document.getElementById('rc-note')?.value || '';
  const autoSign    = document.getElementById('rc-autosign')?.checked;
  const branchCode  = document.getElementById('rc-branch')?.value || G.user?.branch || 'GEN';
  const totalThisPayment = egp + (usd * G.ratesUSD) + (eur * G.ratesEUR) + card;

  // Validations
  if (!contractNo) { toast('Contract number is required', 'error'); return; }
  if (!clientName) { toast('Client name not found. Enter a valid contract number first.', 'error'); return; }
  if (totalThisPayment <= 0) { toast('Payment amount must be greater than 0', 'error'); return; }

  // Deposit return check
  if (rcType === 'Deposit Return' && window._rcCurrentBooking) {
    const status     = getOrderStatus(window._rcCurrentBooking);
    const heldDeposit= parseAmount(window._rcCurrentBooking['الوديعة المعلقة لدينا'] || '0');
    if (status !== 'Closed' && status !== 'Overdue') {
      if (!confirm('Warning: This order is not yet closed.\n\n' +
          'Deposit returns should normally happen after the order is closed.\n\n' +
          'Continue anyway?')) return;
    }
    if (heldDeposit <= 0) {
      toast('No deposit is currently held for this contract', 'warning');
    }
  }

  // Generate reference
  const ref = await generateDocRef('RC', branchCode);
  document.getElementById('rc-ref-preview').textContent = ref;

  // Gather previous financials
  let totalDue = 0, prevPaidEGP = 0, prevPaidUSD = 0, prevPaidEUR = 0,
      prevPaid = 0, heldDeposit = 0;
  if (window._rcCurrentBooking) {
    totalDue     = parseAmount(window._rcCurrentBooking['إجمالي المستحق (Total)']);
    prevPaidEGP  = parseAmount(window._rcCurrentBooking['المدفوع EGP']);
    prevPaidUSD  = parseAmount(window._rcCurrentBooking['المدفوع USD'] || '0');
    prevPaidEUR  = parseAmount(window._rcCurrentBooking['المدفوع EUR'] || '0');
    prevPaid     = prevPaidEGP + (prevPaidUSD * G.ratesUSD) + (prevPaidEUR * G.ratesEUR);
    heldDeposit  = parseAmount(window._rcCurrentBooking['الوديعة المعلقة لدينا'] || '0');
  }

  const newTotalPaid  = prevPaid + totalThisPayment;
  const newOutstanding= Math.max(0, totalDue - newTotalPaid);

  // Build payment rows
  const payRows = [
    egp   > 0 ? ['Cash – EGP',     fmtMoney(egp)]  : null,
    usd   > 0 ? ['Cash – USD',     `$${usd} × ${G.ratesUSD.toFixed(2)} = ${fmtMoney(usd * G.ratesUSD)}`] : null,
    eur   > 0 ? ['Cash – EUR',     `€${eur} × ${G.ratesEUR.toFixed(2)} = ${fmtMoney(eur * G.ratesEUR)}`] : null,
    card  > 0 ? ['Card Payment – EGP', fmtMoney(card)] : null
  ].filter(Boolean);

  // Save to Firestore
  try {
    const receiptData = {
      receipt_ref:      ref,
      contract_no:      contractNo,
      client_name:      clientName,
      client_id:        document.getElementById('rc-client-id')?.value.trim()  || '',
      car_label:        document.getElementById('rc-vehicle')?.value.trim()    || '',
      branch:           branchCode,
      branch_code:      branchCode,
      issued_by:        G.user?.username || '',
      receipt_title:    rcTitle,
      receipt_date:     rcDate,
      type:             rcType,
      amount_egp:       egp,
      amount_usd:       usd,
      amount_eur:       eur,
      amount_card:      card,
      total_egp_equiv:  totalThisPayment,
      running_total_paid: newTotalPaid,
      outstanding_balance: newOutstanding,
      rental_start:     document.getElementById('rc-start')?.value.trim() || '',
      rental_end:       document.getElementById('rc-end')?.value.trim()   || '',
      phone:            document.getElementById('rc-phone')?.value.trim() || '',
      note,
      timestamp:        Date.now()
    };

    await db.collection('receipts').doc(ref).set(receiptData);

    // Update booking
    if (window._rcCurrentBooking) {
      const bookingRef = window._rcCurrentBooking.id;
      const updateData = { '_sys_updated': Date.now() };

      if (rcType !== 'Deposit Return') {
        updateData['المدفوع EGP'] = String(prevPaidEGP + egp);
        if (usd  > 0) updateData['المدفوع USD'] = String(prevPaidUSD + usd);
        if (eur  > 0) updateData['المدفوع EUR'] = String(prevPaidEUR + eur);
      } else {
        const newDeposit = Math.max(0, heldDeposit - totalThisPayment);
        updateData['الوديعة المعلقة لدينا'] = fmtMoney(newDeposit);
        if (newDeposit <= 0) {
          updateData['closed']      = true;
          updateData['حالة الطلب'] = 'Closed';
          const carId = window._rcCurrentBooking['كود السيارة'];
          if (carId) {
            await db.collection('fleet').doc(String(carId))
              .update({ status: 'available', _sys_updated: Date.now() })
              .catch(() => {});
          }
          toast('Deposit fully returned — order closed!', 'success');
        }
      }

      // Auto-close if fully paid and past end
      const { end } = getOrderDates(window._rcCurrentBooking);
      const status  = getOrderStatus(window._rcCurrentBooking);
      if (rcType !== 'Deposit Return' &&
          newTotalPaid >= totalDue && end && new Date() > end &&
          status !== 'Accident' && !updateData['closed']) {
        updateData['closed']      = true;
        updateData['حالة الطلب'] = 'Closed';
        const carId = window._rcCurrentBooking['كود السيارة'];
        if (carId) {
          await db.collection('fleet').doc(String(carId))
            .update({ status: 'available', _sys_updated: Date.now() })
            .catch(() => {});
        }
        toast('Order fully paid and automatically closed!', 'success');
      }

      await db.collection('bookings').doc(bookingRef).update(updateData);
      window._rcCurrentBooking = { ...window._rcCurrentBooking, ...updateData };
    }

    await logAction('GENERATE', 'Receipts',
      `Receipt ${ref} | Contract: ${contractNo} | Client: ${clientName} | ` +
      `${fmtMoney(totalThisPayment)} | Outstanding: ${fmtMoney(newOutstanding)}`);

    toast(`Receipt ${ref} generated and saved!`, 'success');

  } catch (e) {
    toast('Warning: Could not save to database. ' + e.message, 'warning');
  }

  // Build A4 output
  const html = _buildReceiptA4({
    ref, rcTitle, contractNo, rcDate, rcType, branchCode,
    clientName,
    clientId:    document.getElementById('rc-client-id')?.value   || '',
    phone:       document.getElementById('rc-phone')?.value       || '',
    vehicle:     document.getElementById('rc-vehicle')?.value     || '',
    rentalStart: document.getElementById('rc-start')?.value       || '',
    rentalEnd:   document.getElementById('rc-end')?.value         || '',
    payRows, totalThisPayment,
    totalDue, prevPaid, newTotalPaid, newOutstanding,
    heldDeposit,
    isDepositReturn: rcType === 'Deposit Return',
    autoSign, note
  });

  const wrap = document.getElementById('rc-a4-wrap');
  if (wrap) wrap.innerHTML = html;

  document.getElementById('rc-output').style.display = 'block';
  document.getElementById('rc-placeholder').style.display = 'none';

  attachQRAndBarcode(ref);
};

// ============================================================
// BUILD RECEIPT A4
// Merges both reference designs:
// - Clean professional layout from receipt-generator.html
// - Type badges, payment breakdown, verify URL, auto-sign
// ============================================================

function _buildReceiptA4(d) {
  const typeColors = {
    'Income':             '#166534',
    'Deposit':            '#854d0e',
    'Deposit Return':     '#166534',
    'Overdue Settlement': '#7f1d1d',
    'Accident Settlement':'#7c2d12',
    'Partial Payment':    '#1e3a5f',
    'Penalty Payment':    '#78350f'
  };
  const typeBgMap = {
    'Income':             '#f0fdf4',
    'Deposit':            '#fefce8',
    'Deposit Return':     '#f0fdf4',
    'Overdue Settlement': '#fff1f2',
    'Accident Settlement':'#fff7ed',
    'Partial Payment':    '#eff6ff',
    'Penalty Payment':    '#fffbeb'
  };

  const hdrColor = typeColors[d.rcType]  || '#1e40af';
  const bg       = typeBgMap[d.rcType]   || '#f0fdf4';
  const logo     = 'https://brothersegy.com/wp-content/uploads/2026/02/12345.png';
  const verifyUrl= `https://sabryabr.github.io/BrothersEGY-ERP/verify.html?ref=${d.ref}`;
  const qrId     = 'qr-'  + d.ref.replace(/[^a-zA-Z0-9]/g, '');
  const qrId2    = 'qr2-' + d.ref.replace(/[^a-zA-Z0-9]/g, '');
  const bcId     = 'bc-'  + d.ref.replace(/[^a-zA-Z0-9]/g, '');
  const dateStr  = d.rcDate
    ? new Date(d.rcDate).toLocaleDateString('en-GB')
    : new Date().toLocaleDateString('en-GB');
  const branchName = BRANCH_MAP[d.branchCode] || d.branchCode;

  const receiptHalf = (copyType, qrElId) => `
    <div style="height:48%;border:2px solid #1e40af;padding:13px;
      display:flex;flex-direction:column;box-sizing:border-box;
      position:relative;background:#fff;">

      <!-- Copy badge -->
      <div style="position:absolute;top:8px;right:10px;font-size:8px;
        background:#1e40af;color:#fff;padding:2px 8px;
        border-radius:4px;font-weight:700;">${copyType}</div>

      <!-- Header -->
      <div style="display:flex;justify-content:space-between;
        align-items:flex-start;border-bottom:2px solid #1e40af;
        padding-bottom:8px;margin-bottom:10px;">
        <div>
          <img src="${logo}" style="height:36px;object-fit:contain;" alt="Logo"/>
          <div style="font-size:9px;color:#64748b;margin-top:2px;">
            Car Rental Services • www.brothersegy.com
          </div>
          <div style="font-size:8px;color:#64748b;">${branchName} Branch</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:14pt;font-weight:bold;color:#1e40af;">
            PAYMENT RECEIPT
          </div>
          <div style="background:${bg};color:${hdrColor};padding:2px 9px;
            border-radius:4px;font-size:9px;font-weight:800;
            display:inline-block;margin-top:3px;">
            ${d.rcType}
          </div>
          <div style="font-size:9px;color:#64748b;margin-top:3px;">
            Ref: <strong>${d.ref}</strong>
          </div>
          <div style="font-size:9px;color:#64748b;">Date: ${dateStr}</div>
          <div style="font-size:9px;color:#64748b;">
            Issued by: ${G.user?.username || 'Staff'}
          </div>
        </div>
      </div>

      <!-- Client & Vehicle info -->
      <div style="display:flex;gap:16px;margin-bottom:10px;font-size:9.5pt;">
        <div style="flex:1;">
          <div style="font-weight:800;color:#1e40af;font-size:9px;
            text-transform:uppercase;margin-bottom:4px;">Client Information</div>
          <div style="font-weight:700;">${d.clientName}</div>
          ${d.clientId ? `<div style="color:#64748b;">ID: ${d.clientId}</div>` : ''}
          ${d.phone    ? `<div style="color:#64748b;">📞 ${d.phone}</div>` : ''}
          <div style="margin-top:4px;font-weight:700;color:#1e40af;">
            Contract: ${d.contractNo}
          </div>
        </div>
        <div style="flex:1;">
          <div style="font-weight:800;color:#1e40af;font-size:9px;
            text-transform:uppercase;margin-bottom:4px;">Rental Details</div>
          ${d.vehicle     ? `<div style="font-weight:700;">${d.vehicle}</div>` : ''}
          ${d.rentalStart ? `<div style="color:#64748b;font-size:9px;">From: ${d.rentalStart}</div>` : ''}
          ${d.rentalEnd   ? `<div style="color:#64748b;font-size:9px;">To: ${d.rentalEnd}</div>` : ''}
          <div style="font-weight:700;color:#1e40af;margin-top:4px;">${d.rcTitle}</div>
        </div>
      </div>

      <!-- Payment breakdown -->
      <div style="border:1px solid #e2e8f0;border-radius:5px;
        padding:9px;margin-bottom:9px;font-size:9.5pt;">
        ${d.payRows.map(([lbl, val]) => `
          <div style="display:flex;justify-content:space-between;
            border-bottom:1px dotted #e2e8f0;padding:3px 0;">
            <span style="font-weight:600;">${lbl}</span>
            <span style="font-weight:700;">${val}</span>
          </div>`).join('')}
        <div style="display:flex;justify-content:space-between;
          margin-top:6px;padding-top:6px;border-top:2px solid #1e40af;">
          <span style="font-weight:800;font-size:11pt;color:#1e40af;">TOTAL</span>
          <span style="font-weight:900;font-size:14pt;color:#1e40af;">
            ${fmtMoney(d.totalThisPayment)}
          </span>
        </div>
      </div>

      <!-- Account summary row -->
      ${d.totalDue > 0 ? `
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;
        gap:6px;font-size:8pt;background:#f8fafc;
        border-radius:4px;padding:6px;margin-bottom:8px;">
        <div style="text-align:center;">
          <div style="color:#666;">Contract Total</div>
          <div style="font-weight:bold;">£${d.totalDue.toLocaleString()}</div>
        </div>
        <div style="text-align:center;">
          <div style="color:#666;">Total Paid</div>
          <div style="font-weight:bold;color:#16a34a;">
            £${d.newTotalPaid.toLocaleString()}
          </div>
        </div>
        <div style="text-align:center;">
          <div style="color:#666;">Outstanding</div>
          <div style="font-weight:bold;
            color:${d.newOutstanding > 0 ? '#dc2626' : '#16a34a'};">
            ${d.newOutstanding > 0
              ? '£' + d.newOutstanding.toLocaleString()
              : '✅ PAID'}
          </div>
        </div>
      </div>` : ''}

      <!-- Deposit return note -->
      ${d.isDepositReturn ? `
      <div style="font-size:8pt;color:#dc2626;font-weight:bold;margin-bottom:6px;">
        * Security deposit returned to client.
        Remaining held: £${Math.max(0, d.heldDeposit - d.totalThisPayment).toLocaleString()}
      </div>` : ''}

      <!-- Outstanding warning -->
      ${!d.isDepositReturn && d.newOutstanding > 0 ? `
      <div style="font-size:8pt;color:#dc2626;font-weight:bold;margin-bottom:6px;">
        ⚠ OUTSTANDING BALANCE: ${fmtMoney(d.newOutstanding)}
      </div>` : ''}

      <!-- Note -->
      ${d.note ? `
      <div style="font-size:8pt;color:#64748b;margin-bottom:6px;
        font-style:italic;">Note: ${d.note}</div>` : ''}

      <!-- Signatures & QR -->
      <div style="margin-top:auto;display:flex;justify-content:space-between;
        align-items:flex-end;padding-top:8px;">

        <!-- Client signature -->
        <div style="text-align:center;width:35%;">
          ${d.autoSign ? '<div style="font-size:22px;color:#1e40af;font-style:italic;margin-bottom:2px;">Brothers EGY</div>' : '<div style="height:26px;"></div>'}
          <div style="border-top:1px solid #000;padding-top:3px;font-size:8px;color:#64748b;">
            Client Signature<br>${d.clientName}
          </div>
        </div>

        <!-- QR code -->
        <div style="text-align:center;">
          <div id="${qrElId}"
            style="width:60px;height:60px;margin:0 auto;"></div>
          <div style="font-size:7px;color:#64748b;margin-top:2px;">Verify online</div>
        </div>

        <!-- Cashier signature -->
        <div style="text-align:center;width:35%;">
          ${d.autoSign ? '<div style="font-size:22px;color:#1e40af;font-style:italic;margin-bottom:2px;">Brothers EGY</div>' : '<div style="height:26px;"></div>'}
          <div style="border-top:1px solid #000;padding-top:3px;font-size:8px;color:#64748b;">
            Cashier Signature<br>Brothers EGY — ${branchName}
          </div>
        </div>

      </div>
    </div>`;

  return `
    <div style="width:210mm;min-height:296mm;padding:10mm 14mm;
      background:#fff;font-family:'Segoe UI',Arial,sans-serif;
      font-size:10pt;line-height:1.35;color:#000;
      box-shadow:0 4px 24px rgba(0,0,0,.12);
      display:flex;flex-direction:column;gap:0;">

      ${receiptHalf('CLIENT COPY', qrId)}

      <div style="text-align:center;font-size:9px;color:#94a3b8;
        padding:4px 0;border-top:1px dashed #e2e8f0;
        border-bottom:1px dashed #e2e8f0;margin:3px 0;">
        ✂ — — — — — — CUT HERE — — — — — — ✂
      </div>

      ${receiptHalf('COMPANY COPY', qrId2)}

      <!-- Footer bar with barcode and verify URL -->
      <div style="display:flex;align-items:center;gap:12px;
        background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;
        padding:8px 12px;margin-top:8px;">
        <canvas id="${bcId}"
          style="max-width:200px;height:40px;display:block;">
        </canvas>
        <div style="flex:1;font-size:9px;color:#64748b;">
          <div style="font-weight:800;color:#1e40af;">
            BROTHERS EGY OFFICIAL RECEIPT
          </div>
          <div>Ref: ${d.ref} | Contract: ${d.contractNo}</div>
          <div>
            Verify: sabryabr.github.io/BrothersEGY-ERP/verify.html?ref=${d.ref}
          </div>
        </div>
      </div>

    </div>`;
}

// ============================================================
// ATTACH QR AND BARCODE (override for receipts — uses two QRs)
// ============================================================

window._attachReceiptQR = function(ref) {
  const qrId  = 'qr-'  + ref.replace(/[^a-zA-Z0-9]/g, '');
  const qrId2 = 'qr2-' + ref.replace(/[^a-zA-Z0-9]/g, '');
  const bcId  = 'bc-'  + ref.replace(/[^a-zA-Z0-9]/g, '');
  const verifyUrl = `https://sabryabr.github.io/BrothersEGY-ERP/verify.html?ref=${ref}`;

  setTimeout(() => {
    [qrId, qrId2].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.innerHTML = '';
        try {
          new QRCode(el, {
            text:         verifyUrl,
            width:        60, height: 60,
            colorDark:    '#1e40af',
            colorLight:   '#ffffff',
            correctLevel: QRCode.CorrectLevel.M
          });
        } catch (e) { el.textContent = ref; }
      }
    });

    const bcEl = document.getElementById(bcId);
    if (bcEl) {
      try {
        JsBarcode('#' + bcId, ref, {
          format:       'CODE128',
          lineColor:    '#1e40af',
          width:        1.5,
          height:       30,
          displayValue: true,
          fontSize:     7,
          margin:       2,
          background:   '#f8fafc'
        });
      } catch (e) { /* barcode not ready */ }
    }
  }, 200);
};

// Override attachQRAndBarcode for receipt page context
const _origAttach = window.attachQRAndBarcode;
window.attachQRAndBarcode = function(ref) {
  // Use receipt-specific version if on receipts page
  const isReceiptPage = document.querySelector('.page-section.active')?.id === 'page-receipts';
  if (isReceiptPage) {
    window._attachReceiptQR(ref);
  } else {
    if (typeof _origAttach === 'function') _origAttach(ref);
  }
};

// ============================================================
// PRINT RECEIPT
// ============================================================

window.printReceiptWindow = function() {
  const content = document.getElementById('rc-a4-wrap')?.innerHTML;
  if (!content) { toast('Generate a receipt first', 'warning'); return; }

  const contractNo = document.getElementById('rc-contract-no')?.value || 'RECEIPT';
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="UTF-8">
    <title>Receipt-${contractNo}</title>
    <style>
      body { font-family:'Segoe UI',Arial,sans-serif;
             margin:0;padding:0;background:white; }
      @page { size:A4; margin:0; }
      @media print {
        body { -webkit-print-color-adjust:exact;
               print-color-adjust:exact; }
        .no-print { display:none !important; }
      }
      .print-btn {
        position:fixed;top:10px;right:10px;
        background:#1e40af;color:white;border:none;
        padding:10px 20px;border-radius:6px;
        cursor:pointer;font-weight:bold;z-index:999;
      }
    </style>
    </head><body>
    <button class="print-btn no-print"
      onclick="window.print()">🖨️ Print / Save PDF</button>
    ${content}
    </body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 500);
};

// ============================================================
// SAVE RECEIPT TO ERP (update booking record)
// ============================================================

window.saveReceiptToERP = async function() {
  const ref = document.getElementById('rc-ref-preview')?.textContent;
  if (!ref) { toast('Please generate a receipt first', 'error'); return; }
  try {
    if (window._rcCurrentBooking) {
      await db.collection('bookings')
        .doc(window._rcCurrentBooking.id)
        .update({
          last_receipt_ref: ref,
          _last_printed:    new Date().toISOString()
        }).catch(() => {});
    }
    toast(`✅ Receipt ${ref} saved to ERP!`, 'success');
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  }
};

// ============================================================
// CLEAR FORM
// ============================================================

window.clearReceiptForm = function() {
  [
    'rc-contract-no','rc-client-name','rc-client-id',
    'rc-phone','rc-vehicle','rc-start','rc-end','rc-note'
  ].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

  ['rc-egp','rc-usd','rc-eur','rc-card']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = '0'; });

  const dateEl = document.getElementById('rc-date');
  if (dateEl) dateEl.value = todayISO();

  const typeEl = document.getElementById('rc-type');
  if (typeEl) typeEl.value = 'Income';

  const stEl  = document.getElementById('rc-lookup-status');
  if (stEl)  stEl.innerHTML = '';

  const warnEl = document.getElementById('rc-no-contract-warn');
  if (warnEl) warnEl.style.display = 'none';

  const dWarn = document.getElementById('rc-deposit-return-warn');
  if (dWarn) dWarn.style.display = 'none';

  _resetReceiptSummary();

  const out = document.getElementById('rc-output');
  if (out) out.style.display = 'none';
  const ph = document.getElementById('rc-placeholder');
  if (ph) ph.style.display = 'block';
  const refPrev = document.getElementById('rc-ref-preview');
  if (refPrev) refPrev.textContent = '';

  window._rcCurrentBooking = null;
};

// ============================================================
// SAVED RECEIPTS LIST
// ============================================================

window.loadSavedReceipts = async function() {
  const wrap   = document.getElementById('rcl-table-wrap');
  if (!wrap) return;
  wrap.innerHTML = '<div class="empty-state"><div class="spinner lg"></div></div>';

  const isPriv = ['Admin','Executive'].includes(G.user?.role);

  try {
    let snap;
    if (isPriv) {
      snap = await db.collection('receipts')
        .orderBy('timestamp', 'desc').limit(300).get();
    } else {
      snap = await db.collection('receipts')
        .where('branch', '==', G.user?.branch || '')
        .orderBy('timestamp', 'desc').limit(150).get();
    }

    const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    window._receiptsCache = all;

    // Populate KPIs
    _setEl('rcl-kpi-total',     all.length);
    _setEl('rcl-kpi-collected', fmtMoney(
      all.reduce((s, r) => s + (r.total_egp_equiv || 0), 0)
    ));
    _setEl('rcl-kpi-deposits', fmtMoney(
      all.filter(r => r.type === 'Deposit')
         .reduce((s, r) => s + (r.total_egp_equiv || 0), 0)
    ));
    _setEl('rcl-kpi-returned', fmtMoney(
      all.filter(r => r.type === 'Deposit Return')
         .reduce((s, r) => s + (r.total_egp_equiv || 0), 0)
    ));

    filterSavedReceipts();

  } catch (e) {
    wrap.innerHTML = `<div class="empty-state">
      <p>Could not load receipts: ${e.message}</p>
    </div>`;
  }
};

window.filterSavedReceipts = debounce(function() {
  const search  = (document.getElementById('rcl-search')?.value  || '').toLowerCase();
  const type    = document.getElementById('rcl-type')?.value     || 'all';
  const branch  = document.getElementById('rcl-branch')?.value   || 'all';
  const sort    = document.getElementById('rcl-sort')?.value     || 'newest';

  let receipts = [...(window._receiptsCache || [])];

  if (search) receipts = receipts.filter(r =>
    [r.receipt_ref, r.client_name, r.contract_no, r.client_id, r.car_label]
      .join(' ').toLowerCase().includes(search)
  );
  if (type   !== 'all') receipts = receipts.filter(r => r.type   === type);
  if (branch !== 'all') receipts = receipts.filter(r => r.branch === branch);

  if (sort === 'newest')      receipts.sort((a,b) => (b.timestamp||0)-(a.timestamp||0));
  else if (sort === 'oldest') receipts.sort((a,b) => (a.timestamp||0)-(b.timestamp||0));
  else if (sort === 'amount-high') receipts.sort((a,b) => (b.total_egp_equiv||0)-(a.total_egp_equiv||0));
  else if (sort === 'amount-low')  receipts.sort((a,b) => (a.total_egp_equiv||0)-(b.total_egp_equiv||0));

  _renderReceiptsTable(receipts);
}, 150);

const RC_TYPE_PILLS = {
  'Income':             'pill-active',
  'Deposit':            'pill-warning',
  'Deposit Return':     'pill-accepted',
  'Overdue Settlement': 'pill-overdue',
  'Accident Settlement':'pill-accident',
  'Partial Payment':    'pill-draft',
  'Penalty Payment':    'pill-draft'
};

function _renderReceiptsTable(receipts) {
  const wrap = document.getElementById('rcl-table-wrap');
  if (!wrap) return;

  if (!receipts.length) {
    wrap.innerHTML = `<div class="empty-state">
      <div class="es-icon">🧾</div>
      <p>No receipts match your current filters</p>
    </div>`;
    return;
  }

  const verifyBase = 'https://sabryabr.github.io/BrothersEGY-ERP/verify.html';

  wrap.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Receipt Ref</th>
          <th>Date</th>
          <th>Client</th>
          <th>Contract</th>
          <th>Vehicle</th>
          <th>Type</th>
          <th>Amount</th>
          <th>Outstanding</th>
          <th>Branch</th>
          <th>Issued By</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${receipts.map(r => {
          const rRef       = r.receipt_ref || r.id;
          const verifyLink = `${verifyBase}?ref=${rRef}`;
          return `
            <tr>
              <td>
                <span style="color:var(--accent);font-weight:700;cursor:pointer;"
                  onclick="reprintReceipt('${r.id}')">
                  ${rRef}
                </span>
              </td>
              <td style="font-size:10px;white-space:nowrap;">
                ${r.receipt_date
                  ? new Date(r.receipt_date).toLocaleDateString('en-GB')
                  : r.timestamp
                    ? new Date(r.timestamp).toLocaleDateString('en-GB') : '—'}
              </td>
              <td>
                <div style="font-weight:600;font-size:11px;">
                  ${r.client_name || '—'}
                </div>
                ${r.client_id
                  ? `<div style="font-size:10px;color:var(--text3);">
                      ID: ${r.client_id}
                    </div>` : ''}
              </td>
              <td>
                <span style="color:var(--accent);cursor:pointer;font-weight:700;"
                  onclick="openOrderByNo('${r.contract_no || ''}')">
                  ${r.contract_no || '—'}
                </span>
              </td>
              <td style="font-size:11px;max-width:130px;white-space:nowrap;
                overflow:hidden;text-overflow:ellipsis;">
                ${r.car_label || '—'}
              </td>
              <td>
                <span class="pill ${RC_TYPE_PILLS[r.type] || 'pill-draft'}">
                  ${r.type || '—'}
                </span>
              </td>
              <td>
                <strong style="color:var(--success);">
                  ${fmtMoney(r.total_egp_equiv || 0)}
                </strong>
              </td>
              <td style="color:${(r.outstanding_balance||0)>0
                ? 'var(--danger)' : 'var(--success)'};">
                <strong>
                  ${(r.outstanding_balance||0) > 0
                    ? fmtMoney(r.outstanding_balance)
                    : '✅ Clear'}
                </strong>
              </td>
              <td style="font-size:11px;">
                ${BRANCH_MAP[r.branch] || r.branch || '—'}
              </td>
              <td style="font-size:11px;">${r.issued_by || '—'}</td>
              <td>
                <div style="display:flex;gap:3px;flex-wrap:wrap;">
                  <button class="btn btn-primary btn-xs"
                    onclick="reprintReceipt('${r.id}')"
                    title="Reprint">
                    🖨️ Print
                  </button>
                  <a href="${verifyLink}"
                    target="_blank"
                    class="btn btn-ghost btn-xs"
                    title="Verify">
                    🔗 Verify
                  </a>
                  ${r.contract_no ? `
                  <button class="btn btn-ghost btn-xs"
                    onclick="openOrderByNo('${r.contract_no}')"
                    title="Open order">
                    📋 Order
                  </button>` : ''}
                </div>
              </td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>
    <div style="padding:9px 11px;font-size:11px;color:var(--text3);
      border-top:1px solid var(--border);display:flex;justify-content:space-between;">
      <span>Showing ${receipts.length} receipt${receipts.length !== 1 ? 's' : ''}</span>
      <span style="color:var(--success);font-weight:700;">
        Total: ${fmtMoney(receipts.reduce((s,r) => s + (r.total_egp_equiv||0), 0))}
      </span>
    </div>`;
}

// ============================================================
// REPRINT RECEIPT
// ============================================================

window.reprintReceipt = async function(receiptId) {
  let r = (window._receiptsCache || []).find(x => x.id === receiptId);
  if (!r) {
    try {
      const d = await db.collection('receipts').doc(receiptId).get();
      if (d.exists) r = { id: d.id, ...d.data() };
    } catch (e) { toast('Receipt not found', 'error'); return; }
  }
  if (!r) { toast('Receipt not found', 'error'); return; }

  // Switch to new tab and pre-fill
  switchReceiptTab('new', document.getElementById('rc-tab-new'));

  setTimeout(async () => {
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || '';
    };

    set('rc-contract-no', r.contract_no || '');
    set('rc-client-name', r.client_name || '');
    set('rc-client-id',   r.client_id   || '');
    set('rc-phone',       r.phone        || '');
    set('rc-vehicle',     r.car_label    || '');
    set('rc-start',       r.rental_start || '');
    set('rc-end',         r.rental_end   || '');
    set('rc-date',        r.receipt_date || todayISO());
    set('rc-title',       r.receipt_title || 'Payment Receipt');
    set('rc-egp',         String(r.amount_egp  || 0));
    set('rc-usd',         String(r.amount_usd  || 0));
    set('rc-eur',         String(r.amount_eur  || 0));
    set('rc-card',        String(r.amount_card || 0));
    set('rc-note',        r.note || '');

    const typeEl = document.getElementById('rc-type');
    if (typeEl) typeEl.value = r.type || 'Income';

    const branchEl = document.getElementById('rc-branch');
    if (branchEl && r.branch) branchEl.value = r.branch;

    // Update summary display
    _setEl('rc-total-due',    '—');
    _setEl('rc-prev-paid',    '—');
    _setEl('rc-held-deposit', '—');
    _setEl('rc-this-payment', fmtMoney(r.total_egp_equiv || 0));
    _setEl('rc-outstanding',  fmtMoney(r.outstanding_balance || 0));

    const refPrev = document.getElementById('rc-ref-preview');
    if (refPrev) refPrev.textContent = r.receipt_ref || r.id;

    toast('Receipt loaded for reprint. Click Print to save as PDF.', 'info');

    // Build A4 for reprint
    const payRows = [
      (r.amount_egp  || 0) > 0 ? ['Cash – EGP',         fmtMoney(r.amount_egp)]  : null,
      (r.amount_usd  || 0) > 0 ? ['Cash – USD',          `$${r.amount_usd}`]       : null,
      (r.amount_eur  || 0) > 0 ? ['Cash – EUR',          `€${r.amount_eur}`]       : null,
      (r.amount_card || 0) > 0 ? ['Card Payment – EGP',  fmtMoney(r.amount_card)] : null
    ].filter(Boolean);

    const html = _buildReceiptA4({
      ref:             r.receipt_ref || r.id,
      rcTitle:         r.receipt_title || 'Payment Receipt',
      contractNo:      r.contract_no  || '',
      rcDate:          r.receipt_date  || '',
      rcType:          r.type          || 'Income',
      branchCode:      r.branch        || G.user?.branch || '',
      clientName:      r.client_name   || '',
      clientId:        r.client_id     || '',
      phone:           r.phone          || '',
      vehicle:         r.car_label      || '',
      rentalStart:     r.rental_start   || '',
      rentalEnd:       r.rental_end     || '',
      payRows,
      totalThisPayment: r.total_egp_equiv || 0,
      totalDue:         0,
      prevPaid:         r.running_total_paid || 0,
      newTotalPaid:     r.running_total_paid || 0,
      newOutstanding:   r.outstanding_balance || 0,
      heldDeposit:      0,
      isDepositReturn:  r.type === 'Deposit Return',
      autoSign:         true,
      note:             r.note || ''
    });

    const wrap = document.getElementById('rc-a4-wrap');
    if (wrap) wrap.innerHTML = html;

    document.getElementById('rc-output').style.display = 'block';
    document.getElementById('rc-placeholder').style.display = 'none';

    window._attachReceiptQR(r.receipt_ref || r.id);

    await logAction('PRINT', 'Receipts', `Reprinted: ${r.receipt_ref || r.id}`);

  }, 200);
};

// ============================================================
// OPEN ORDER FROM RECEIPT TABLE
// ============================================================

window.openOrderByNo = async function(orderNo) {
  if (!orderNo) return;
  let found = allOrders.find(o => String(o['No.']) === String(orderNo));
  if (!found) {
    try {
      const q = await db.collection('bookings')
        .where('No.', '==', String(orderNo)).limit(1).get();
      if (!q.empty) found = { id: q.docs[0].id, ...q.docs[0].data() };
    } catch (e) { /* silent */ }
  }
  if (found) openOrderDetail(found.id || found['No.']);
  else toast(`Order #${orderNo} not found`, 'info');
};

// ============================================================
// INTERNAL HELPERS
// ============================================================

function _setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
