// ============================================================
// modules/proposals.js
// Proposals module — form, A4 output (merged with
// proposal-generator.html design), overlap detection,
// proposals list, status updates, contract conversion
// ============================================================

// ============================================================
// ENTRY POINT
// ============================================================

window.renderProposals = function() {
  renderPageLoading('page-proposals', '📋', 'Proposals');
  loadProposalsPage();
};

window.loadProposalsPage = async function() {
  const el = document.getElementById('page-proposals');
  if (!el) return;

  el.innerHTML = `
    <div class="section-header">
      <div>
        <h2>📋 Proposals</h2>
        <p>Create price proposals, check availability and convert to contracts</p>
      </div>
      <div style="display:flex;gap:7px;align-items:center;">
        <button class="btn btn-ghost btn-sm"
          onclick="loadProposalsPage()">🔄 Refresh</button>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:480px 1fr;
      gap:16px;align-items:start;">

      <!-- ===== LEFT: PROPOSAL FORM ===== -->
      <div class="panel sticky-panel"
        style="overflow-x:hidden;max-height:calc(100vh - 120px);
          overflow-y:auto;">

        <div style="display:flex;align-items:center;
          justify-content:space-between;margin-bottom:13px;">
          <h3 style="font-size:13px;font-weight:800;">📋 New Proposal</h3>
          <span id="pr-ref-preview"
            style="font-size:10px;color:var(--accent);font-weight:700;">
          </span>
        </div>

        <!-- CRM Search -->
        <div class="crm-search-wrap">
          <div class="crm-search-header">
            🔍 SEARCH & AUTO-FILL CLIENT
            <span id="pr-crm-id"
              style="display:none;font-size:9px;color:var(--success);
                background:rgba(34,197,94,0.1);padding:2px 7px;
                border-radius:99px;">
            </span>
          </div>
          <div class="crm-input-row">
            <input type="text" id="pr-client-search"
              placeholder="Name, passport, phone..."
              oninput="crmSearch('pr')"/>
          </div>
          <div class="crm-actions">
            <button class="crm-action-btn new"
              onclick="openAddCustomerModal()">+ New</button>
            <button class="crm-action-btn edit" id="pr-edit-btn"
              style="display:none;" onclick="crmEditMode('pr')">✏️ Edit</button>
            <button class="crm-action-btn save" id="pr-save-btn"
              style="display:none;" onclick="crmSaveEdit('pr')">💾 Save</button>
            <button class="crm-action-btn cancel" id="pr-cancel-btn"
              style="display:none;" onclick="crmCancelEdit('pr')">✕</button>
          </div>
          <div class="crm-suggestions" id="pr-suggestions"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;
            gap:7px;margin-top:9px;">
            <div class="field">
              <label>First Name *</label>
              <input type="text" id="pr-fname"
                placeholder="First Name"/>
            </div>
            <div class="field">
              <label>Last Name *</label>
              <input type="text" id="pr-lname"
                placeholder="Last Name"/>
            </div>
            <div class="field">
              <label>Phone</label>
              <input type="text" id="pr-phone"
                placeholder="Phone" readonly/>
            </div>
            <div class="field">
              <label>Email</label>
              <input type="text" id="pr-email"
                placeholder="Email" readonly/>
            </div>
          </div>
        </div>

        <!-- Section 1: Dates -->
        <div style="margin-bottom:13px;">
          <div style="font-size:10px;font-weight:800;color:var(--accent);
            text-transform:uppercase;margin-bottom:8px;padding-bottom:5px;
            border-bottom:1px solid var(--border);">
            ① Rental Period
          </div>
          <div class="form-grid">
            <div class="field">
              <label>Pickup Date/Time *</label>
              <input type="datetime-local" id="pr-pickup"
                onchange="prCalc();prCheckOverlap()"/>
            </div>
            <div class="field">
              <label>Dropoff Date/Time *</label>
              <input type="datetime-local" id="pr-dropoff"
                onchange="prCalc();prCheckOverlap()"/>
            </div>
            <div class="field">
              <label>Pickup Location</label>
              <input type="text" id="pr-ploc"
                placeholder="Airport / Hotel / Office"/>
            </div>
            <div class="field">
              <label>Dropoff Location</label>
              <input type="text" id="pr-dloc"
                placeholder="Airport / Hotel / Office"/>
            </div>
          </div>
        </div>

        <!-- Section 2: Vehicle -->
        <div style="margin-bottom:13px;">
          <div style="font-size:10px;font-weight:800;color:var(--accent);
            text-transform:uppercase;margin-bottom:8px;padding-bottom:5px;
            border-bottom:1px solid var(--border);">
            ② Vehicle Selection
          </div>
          <div class="field" style="margin-bottom:7px;">
            <label>Select from Fleet</label>
            <select id="pr-car" onchange="prSelectCar()">
              <option value="">-- Select vehicle --</option>
            </select>
          </div>
          <div id="pr-car-badge" class="car-info-badge"></div>

          <!-- Overlap warning -->
          <div id="pr-overlap-warn"
            style="display:none;margin-top:9px;padding:9px;
              background:rgba(239,68,68,0.1);
              border:1px solid var(--danger);
              border-radius:8px;font-size:11px;color:var(--danger);">
          </div>
          <div id="pr-availability-ok"
            style="display:none;margin-top:9px;padding:7px 11px;
              background:rgba(34,197,94,0.08);
              border:1px solid rgba(34,197,94,0.3);
              border-radius:8px;font-size:11px;color:var(--success);">
            ✅ Car is available for this period
          </div>

          <div class="form-grid" style="margin-top:9px;">
            <div class="field">
              <label>Daily Rent (EGP) *</label>
              <input type="number" id="pr-daily"
                placeholder="0" min="0" oninput="prCalc()"/>
            </div>
            <div class="field">
              <label>Duration</label>
              <input type="text" id="pr-days" readonly
                style="background:var(--surface3);opacity:0.8;"/>
            </div>
          </div>
        </div>

        <!-- Section 3: Mileage & Insurance -->
        <div style="margin-bottom:13px;">
          <div style="font-size:10px;font-weight:800;color:var(--accent);
            text-transform:uppercase;margin-bottom:8px;padding-bottom:5px;
            border-bottom:1px solid var(--border);">
            ③ Mileage & Insurance
          </div>
          <div class="form-grid">
            <div class="field">
              <label>KM Package</label>
              <select id="pr-km" onchange="prCalc()">
                <option value="Standard (120 KM/Day)">Standard — 120 KM/Day</option>
                <option value="500 KM Extra">500 KM Package</option>
                <option value="750 KM Extra">750 KM Package</option>
                <option value="1000 KM Extra">1000 KM Package</option>
                <option value="Unlimited">Unlimited KM</option>
              </select>
            </div>
            <div class="field">
              <label>KM Package Cost (EGP)</label>
              <input type="number" id="pr-km-cost"
                value="0" min="0" oninput="prCalc()"/>
            </div>
            <div class="field">
              <label>Insurance Plan</label>
              <select id="pr-ins" onchange="prSuggestInsFee()">
                <option value="Basic">Basic (100% Liability)</option>
                <option value="Intermediate">Intermediate (70/30)</option>
                <option value="Full Protection">Full Protection (Zero Liability)</option>
              </select>
            </div>
            <div class="field">
              <label>Insurance Fee (Daily EGP)</label>
              <input type="number" id="pr-ins-fee"
                value="0" min="0" oninput="prCalc()"/>
            </div>
          </div>
        </div>

        <!-- Section 4: Extras -->
        <div style="margin-bottom:13px;">
          <div style="font-size:10px;font-weight:800;color:var(--accent);
            text-transform:uppercase;margin-bottom:8px;padding-bottom:5px;
            border-bottom:1px solid var(--border);">
            ④ Extras & Fees
          </div>
          <div class="form-grid">
            <div class="field">
              <label>Pickup / Dropoff Fee (EGP)</label>
              <input type="number" id="pr-pfee"
                value="0" min="0" oninput="prCalc()"/>
            </div>
            <div class="field">
              <label>Security Deposit (EGP)</label>
              <input type="number" id="pr-deposit"
                value="30000" min="0" oninput="prCalc()"/>
            </div>
          </div>
          <div style="display:flex;gap:13px;margin-top:9px;flex-wrap:wrap;">
            <label style="display:flex;align-items:center;gap:7px;
              font-size:11px;cursor:pointer;background:var(--surface2);
              padding:8px 12px;border-radius:8px;border:1px solid var(--border);">
              <input type="checkbox" id="pr-child-seat"
                onchange="prCalc()"
                style="width:16px;height:16px;accent-color:var(--accent);"/>
              Child Seat (+£250/day)
            </label>
            <label style="display:flex;align-items:center;gap:7px;
              font-size:11px;cursor:pointer;background:var(--surface2);
              padding:8px 12px;border-radius:8px;border:1px solid var(--border);">
              <input type="checkbox" id="pr-add-driver"
                onchange="prCalc()"
                style="width:16px;height:16px;accent-color:var(--accent);"/>
              Additional Driver (+£500/day)
            </label>
          </div>
        </div>

        <!-- Live Estimate -->
        <div style="background:var(--surface2);border:1px solid var(--border);
          border-radius:9px;padding:13px;margin-bottom:13px;">
          <div style="font-size:10px;color:var(--text3);font-weight:700;
            margin-bottom:9px;text-transform:uppercase;">
            💰 Live Estimate
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;
            gap:5px;font-size:11px;">
            <span style="color:var(--text3);">Base Rent:</span>
            <span id="pr-est-base" style="font-weight:700;">£0.00</span>
            <span style="color:var(--text3);">Insurance:</span>
            <span id="pr-est-ins">£0.00</span>
            <span style="color:var(--text3);">KM Package:</span>
            <span id="pr-est-km">£0.00</span>
            <span style="color:var(--text3);">Extras & Fees:</span>
            <span id="pr-est-extras">£0.00</span>
            <span style="color:var(--text3);">Security Deposit:</span>
            <span id="pr-est-dep">£0.00</span>
          </div>
          <div style="border-top:1px solid var(--border);margin-top:9px;
            padding-top:9px;display:flex;justify-content:space-between;
            align-items:center;">
            <span style="font-size:12px;font-weight:800;">TOTAL ESTIMATE</span>
            <span id="pr-est-total"
              style="font-size:19px;font-weight:900;color:var(--accent);">
              £0.00
            </span>
          </div>
        </div>

        <!-- Actions -->
        <button class="btn btn-primary btn-full"
          onclick="generateProposal()">
          📋 Generate & Save Proposal
        </button>
        <button class="btn btn-ghost btn-full mt-8"
          onclick="clearProposalForm()">
          ✕ Clear Form
        </button>
      </div>

      <!-- ===== RIGHT: PROPOSALS LIST + OUTPUT ===== -->
      <div>

        <!-- Proposals List -->
        <div class="panel" style="margin-bottom:14px;">
          <div style="display:flex;align-items:center;
            justify-content:space-between;margin-bottom:11px;
            flex-wrap:wrap;gap:7px;">
            <h3 style="font-size:13px;font-weight:800;">📁 Proposals List</h3>
            <div style="display:flex;gap:7px;align-items:center;">
              <input type="text" id="pr-list-search"
                placeholder="Search..."
                style="padding:5px 10px;background:var(--surface2);
                  border:1px solid var(--border);border-radius:7px;
                  color:var(--text);font-size:11px;width:130px;"
                oninput="renderProposalsList()"/>
              <select id="pr-filter" onchange="renderProposalsList()"
                style="padding:5px 9px;background:var(--surface2);
                  border:1px solid var(--border);border-radius:7px;
                  color:var(--text);font-size:11px;">
                <option value="all">All</option>
                <option value="Draft">Draft</option>
                <option value="Pending">Pending</option>
                <option value="Accepted">Accepted</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Converted">Converted</option>
              </select>
            </div>
          </div>

          <!-- Summary pills -->
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:11px;"
            id="pr-summary-pills"></div>

          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Ref</th><th>Client</th><th>Car</th>
                  <th>Period</th><th>Estimate</th>
                  <th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody id="proposals-tbody">
                <tr><td colspan="7">
                  <div class="empty-state" style="padding:20px;">
                    <p>No proposals yet</p>
                  </div>
                </td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- A4 Output -->
        <div id="pr-output" style="display:none;">
          <div style="display:flex;gap:7px;margin-bottom:11px;">
            <button class="btn btn-primary"
              onclick="printProposalWindow()">
              🖨️ Print / Save PDF
            </button>
            <button class="btn btn-success"
              onclick="convertLastProposalToContract()">
              📄 Convert to Contract
            </button>
            <button class="btn btn-ghost"
              onclick="document.getElementById('pr-output').style.display='none'">
              ✕ Close
            </button>
          </div>
          <!-- A4 page rendered here by buildProposalA4() -->
          <div id="pr-a4-wrap"></div>
        </div>

      </div>
    </div>`;

  // Populate fleet dropdown for proposals
  _populateProposalCarDropdown();
  renderProposalsList();
};

// ============================================================
// FLEET DROPDOWN (proposal-specific — brand+model only)
// ============================================================

function _populateProposalCarDropdown() {
  const sel = document.getElementById('pr-car');
  if (!sel) return;

  sel.innerHTML = '<option value="">-- Select vehicle type --</option>';
  const seen = new Set();

  G.fleet
    .filter(c => c.is_active !== false && !c.archived)
    .forEach(c => {
      const label = getCarLabel(c, 'en');
      // Show each unique model once but keep car id for overlap check
      if (!seen.has(label)) {
        seen.add(label);
        const opt = document.createElement('option');
        opt.value       = c.id;
        opt.textContent = label + (c.year ? ' (' + c.year + ')' : '');
        sel.appendChild(opt);
      }
    });
}

// ============================================================
// CALCULATIONS
// ============================================================

window.prCalc = function() {
  const pickup  = document.getElementById('pr-pickup')?.value;
  const dropoff = document.getElementById('pr-dropoff')?.value;
  const daily   = parseFloat(document.getElementById('pr-daily')?.value)   || 0;
  const kmCost  = parseFloat(document.getElementById('pr-km-cost')?.value) || 0;
  const insFee  = parseFloat(document.getElementById('pr-ins-fee')?.value) || 0;
  const pfee    = parseFloat(document.getElementById('pr-pfee')?.value)    || 0;
  const deposit = parseFloat(document.getElementById('pr-deposit')?.value) || 0;
  const seat    = document.getElementById('pr-child-seat')?.checked;
  const driver  = document.getElementById('pr-add-driver')?.checked;

  let days = 0;
  if (pickup && dropoff) {
    const diff = new Date(dropoff) - new Date(pickup);
    days = Math.max(0, Math.ceil(diff / 86400000));
  }

  const daysEl = document.getElementById('pr-days');
  if (daysEl) daysEl.value = days > 0
    ? `${days} day${days !== 1 ? 's' : ''}` : '—';

  const base     = daily   * days;
  const insTotal = insFee  * days;
  const seatFee  = seat    ? 250 * days : 0;
  const drvFee   = driver  ? 500 * days : 0;
  const extras   = pfee + seatFee + drvFee;
  const total    = base + insTotal + kmCost + extras;

  const s = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = fmtMoney(v);
  };
  s('pr-est-base',   base);
  s('pr-est-ins',    insTotal);
  s('pr-est-km',     kmCost);
  s('pr-est-extras', extras);
  s('pr-est-dep',    deposit);
  s('pr-est-total',  total);

  return { days, base, insTotal, kmCost, extras, total, deposit,
           seatFee, drvFee, daily, insFee, pfee };
};

window.prSuggestInsFee = function() {
  const plan = document.getElementById('pr-ins')?.value;
  const inp  = document.getElementById('pr-ins-fee');
  if (!inp) return;
  if (plan === 'Basic')           inp.value = '0';
  else if (plan === 'Intermediate')   inp.value = '400';
  else if (plan === 'Full Protection') inp.value = '900';
  prCalc();
};

window.prSelectCar = function() {
  const carId = document.getElementById('pr-car')?.value;
  showCarInfoBadge(carId, 'pr-car-badge');
  if (carId) prefillDailyRate(carId, 'pr-daily');
  prCalc();
  prCheckOverlap();
};

// ============================================================
// RATE CARD AUTO-FILL
// ============================================================

window.prefillDailyRate = function(carId, dailyInputId) {
  if (!carId) return null;
  const car = getCarById(carId);
  if (!car) return null;
  const model = car.model || car.Type || car['النوع'] || '';
  if (!model) return null;
  const rate = G.settings.rateCard?.[model];
  if (rate && rate > 0) {
    const inp = document.getElementById(dailyInputId);
    if (inp && (!inp.value || inp.value === '0')) {
      inp.value = String(rate);
      return rate;
    }
  }
  return null;
};

// ============================================================
// OVERLAP DETECTION
// ============================================================

let _prOverlapTimeout = null;

window.prCheckOverlap = function() {
  const carId   = document.getElementById('pr-car')?.value;
  const pickup  = document.getElementById('pr-pickup')?.value;
  const dropoff = document.getElementById('pr-dropoff')?.value;
  const warnEl  = document.getElementById('pr-overlap-warn');
  const okEl    = document.getElementById('pr-availability-ok');

  if (!carId || !pickup || !dropoff) {
    if (warnEl) warnEl.style.display = 'none';
    if (okEl)   okEl.style.display   = 'none';
    return;
  }

  clearTimeout(_prOverlapTimeout);
  _prOverlapTimeout = setTimeout(async () => {
    const start = new Date(pickup);
    const end   = new Date(dropoff);
    if (isNaN(start) || isNaN(end) || end <= start) {
      if (warnEl) warnEl.style.display = 'none';
      if (okEl)   okEl.style.display   = 'none';
      return;
    }

    try {
      // Check bookings
      const snap = await db.collection('bookings')
        .where('كود السيارة', '==', String(carId))
        .get();

      let conflict = null;
      snap.docs.forEach(d => {
        const b  = { id: d.id, ...d.data() };
        const st = getOrderStatus(b);
        if (st === 'Closed' || st === 'Cancelled') return;
        const { start: bs, end: be } = getOrderDates(b);
        if (!bs) return;
        const bEnd = be || new Date(bs.getTime() + 86400000);
        if (start < bEnd && end > bs) conflict = b;
      });

      // Check open proposals
      let propConflict = null;
      G.proposals.forEach(p => {
        if (p.status === 'Cancelled' || p.status === 'Converted') return;
        if (String(p.car_id) !== String(carId)) return;
        const ps = new Date(p.pickup_date);
        const pe = new Date(p.dropoff_date);
        if (!isNaN(ps) && !isNaN(pe) && start < pe && end > ps) {
          propConflict = p;
        }
      });

      if (conflict) {
        if (warnEl) {
          warnEl.style.display = 'block';
          const { start: cs, end: ce } = getOrderDates(conflict);
          warnEl.innerHTML = `
            ⚠️ <strong>Booking Conflict:</strong> This car has an active order
            #${conflict['No.'] || conflict.id}
            (${conflict['اسم العميل'] || 'Client'})
            from ${cs ? fmtDateShort(cs) : '?'} to ${ce ? fmtDateShort(ce) : '?'}.
            <br>Please select different dates or a different car.`;
        }
        if (okEl) okEl.style.display = 'none';

      } else if (propConflict) {
        if (warnEl) {
          warnEl.style.display = 'block';
          warnEl.innerHTML = `
            ⚠️ <strong>Proposal Conflict:</strong>
            There is already an open proposal (${propConflict.proposal_ref || '—'})
            for this car on overlapping dates.`;
        }
        if (okEl) okEl.style.display = 'none';

      } else {
        if (warnEl) warnEl.style.display = 'none';
        if (okEl)   okEl.style.display   = 'block';
      }

    } catch (e) {
      if (warnEl) warnEl.style.display = 'none';
      if (okEl)   okEl.style.display   = 'none';
    }
  }, 400);
};

// ============================================================
// GENERATE PROPOSAL
// ============================================================

window.generateProposal = async function() {
  const fname  = (document.getElementById('pr-fname')?.value || '').trim();
  const lname  = (document.getElementById('pr-lname')?.value || '').trim();
  const client = (fname + ' ' + lname).trim();
  const carId  = document.getElementById('pr-car')?.value;
  const pickup = document.getElementById('pr-pickup')?.value;
  const dropoff= document.getElementById('pr-dropoff')?.value;
  const daily  = parseFloat(document.getElementById('pr-daily')?.value) || 0;
  const ploc   = document.getElementById('pr-ploc')?.value.trim()  || 'Office';
  const dloc   = document.getElementById('pr-dloc')?.value.trim()  || 'Office';

  // Validations
  if (!client) {
    toast('Client name is required. Search and select a client first.', 'error');
    document.getElementById('pr-client-search')?.focus();
    return;
  }
  if (!carId)   { toast('Please select a vehicle.',           'error'); return; }
  if (!pickup || !dropoff) {
    toast('Pickup and dropoff dates are required.',            'error'); return;
  }
  if (new Date(dropoff) <= new Date(pickup)) {
    toast('Dropoff must be after pickup.',                     'error'); return;
  }
  if (daily <= 0) { toast('Daily rent must be greater than 0.','error'); return; }

  const calc  = prCalc();
  const { days, base, insTotal, kmCost, extras, total, deposit,
          seatFee, drvFee, insFee, pfee } = calc;

  const car       = getCarById(carId);
  const carLabel  = car ? getCarLabel(car, 'en') : '';
  const kmPkg     = document.getElementById('pr-km')?.value    || 'Standard (120 KM/Day)';
  const insPlan   = document.getElementById('pr-ins')?.value   || 'Basic';
  const branchCode= G.user?.branch || 'GEN';
  const ref       = await generateDocRef('PR', branchCode);

  document.getElementById('pr-ref-preview').textContent = ref;

  const proposalData = {
    proposal_ref:   ref,
    client_name:    client,
    client_crm_id:  window['_crm_pr_id'] || '',
    client_phone:   document.getElementById('pr-phone')?.value.trim() || '',
    client_email:   document.getElementById('pr-email')?.value.trim() || '',
    car_id:         carId,
    car_label:      carLabel,
    pickup_date:    pickup,
    dropoff_date:   dropoff,
    pickup_location: ploc,
    dropoff_location: dloc,
    duration_days:  days,
    daily_rate:     daily,
    km_package:     kmPkg,
    km_cost:        kmCost,
    insurance_plan: insPlan,
    insurance_fee:  insFee,
    pickup_fee:     pfee,
    child_seat:     document.getElementById('pr-child-seat')?.checked || false,
    extra_driver:   document.getElementById('pr-add-driver')?.checked || false,
    seat_fee:       seatFee,
    driver_fee:     drvFee,
    deposit_amount: deposit,
    total_estimate: total,
    status:         'Draft',
    issued_by:      G.user?.username || '',
    branch:         branchCode,
    timestamp:      Date.now()
  };

  try {
    await db.collection('proposals').doc(ref).set(proposalData);
    G.proposals.unshift({ id: ref, ...proposalData });
    _updateProposalsBadge();

    window._lastGeneratedProposal = { id: ref, ...proposalData };

    renderProposalsList();
    buildProposalA4(ref, proposalData);

    await logAction('GENERATE', 'Proposals',
      `Proposal ${ref} | Client: ${client} | Car: ${carLabel} | ${fmtMoney(total)}`);

    toast(`Proposal ${ref} saved!`, 'success');

  } catch (e) {
    toast('Failed to save proposal: ' + e.message, 'error');
  }
};

function _updateProposalsBadge() {
  const draftCount = G.proposals.filter(p => p.status === 'Draft').length;
  const pb = document.getElementById('badge-proposals');
  if (!pb) return;
  if (draftCount > 0) {
    pb.textContent = draftCount;
    pb.classList.remove('hidden');
  } else {
    pb.classList.add('hidden');
  }
}

// ============================================================
// BUILD A4 PROPOSAL
// Merges the ERP dark theme control panel with the
// professional proposal-generator.html A4 output design
// ============================================================

window.buildProposalA4 = function(ref, d) {
  const wrap = document.getElementById('pr-a4-wrap');
  if (!wrap) return;

  const pickup  = d.pickup_date  ? new Date(d.pickup_date)  : null;
  const dropoff = d.dropoff_date ? new Date(d.dropoff_date) : null;
  const today   = new Date().toLocaleDateString('en-GB');

  const kmSel  = document.getElementById('pr-km');
  const kmLabel= d.km_package || 'Standard (120 KM/Day)';

  // Total KM description
  const isUnlimited = kmLabel.toLowerCase().includes('unlimited');
  const totalKMDesc = isUnlimited
    ? 'Unlimited KM'
    : `${(d.duration_days * 120).toLocaleString()} KM Total`;

  // Insurance texts
  const insTexts = {
    'Basic':
      'Basic CDW (100% Liability): Client pays 100% for Glass, Tires, and Undercarriage damages. Insurance becomes void if no Police Report is filed immediately.',
    'Intermediate':
      'Reduced Liability (70/30): Client pays 70% of costs. Company covers 30% of body damage. Police Report mandatory.',
    'Full Protection':
      'Zero Deductible Waiver: Reduces client liability to ZERO for covered body, glass, and undercarriage items. Excludes theft and gross negligence.'
  };
  const insText = insTexts[d.insurance_plan] || insTexts['Basic'];

  // Build financial breakdown rows
  const rows = [];
  rows.push({
    desc:   'Base Rental',
    detail: `${fmtMoney(d.daily_rate)} × ${d.duration_days} Days`,
    amount: fmtMoney(d.daily_rate * d.duration_days)
  });
  if ((d.insurance_fee || 0) > 0) {
    rows.push({
      desc:   'Insurance Fee',
      detail: `${fmtMoney(d.insurance_fee)} × ${d.duration_days} Days`,
      amount: fmtMoney((d.insurance_fee || 0) * d.duration_days)
    });
  }
  if ((d.km_cost || 0) > 0) {
    rows.push({
      desc:   `KM Package (${kmLabel})`,
      detail: 'Flat Fee',
      amount: fmtMoney(d.km_cost)
    });
  }
  if (d.child_seat && (d.seat_fee || 0) > 0) {
    rows.push({
      desc:   'Child Car Seat',
      detail: `£250 × ${d.duration_days} Days`,
      amount: fmtMoney(d.seat_fee)
    });
  }
  if (d.extra_driver && (d.driver_fee || 0) > 0) {
    rows.push({
      desc:   'Additional Driver',
      detail: `£500 × ${d.duration_days} Days`,
      amount: fmtMoney(d.driver_fee)
    });
  }
  if ((d.pickup_fee || 0) > 0) {
    rows.push({
      desc:   'Pick-up / Drop-off Fee',
      detail: 'Logistics Fixed Fee',
      amount: fmtMoney(d.pickup_fee)
    });
  }

  const logo = 'https://brothersegy.com/wp-content/uploads/2026/02/12345.png';
  const termsQR = 'https://api.qrserver.com/v1/create-qr-code/?data=https://brothersegy.com/terms-conditions/&size=60x60';

  // Build A4 HTML using proposal-generator.html visual design
  wrap.innerHTML = `
    <div style="width:210mm;min-height:296mm;padding:10mm 15mm;
      background:white;color:#333;font-family:'Segoe UI',Tahoma,sans-serif;
      font-size:9.5pt;box-sizing:border-box;display:flex;
      flex-direction:column;box-shadow:0 0 20px rgba(0,0,0,0.15);
      margin:0 auto;" id="pr-a4-content">

      <!-- Header -->
      <div style="display:flex;justify-content:space-between;
        align-items:center;border-bottom:2px solid #04509D;
        padding-bottom:10px;margin-bottom:15px;">
        <img src="${logo}" style="height:45px;">
        <div style="text-align:right;">
          <h2 style="margin:0;color:#04509D;font-size:16pt;">
            PRICE PROPOSAL
          </h2>
          <p style="margin:0;font-weight:bold;font-size:10pt;">
            Ref: ${ref} &nbsp;|&nbsp; Date: ${today}
          </p>
          <p style="margin:0;font-size:9pt;color:#555;">
            Issued by: ${d.issued_by} &nbsp;|&nbsp;
            ${BRANCH_MAP[d.branch] || d.branch || ''}
          </p>
        </div>
      </div>

      <!-- Client & Period Box -->
      <div style="border:1px solid #000;padding:8px;margin-bottom:10px;
        position:relative;border-radius:4px;">
        <div style="background:#000;color:white;padding:1px 8px;
          font-weight:bold;font-size:9pt;position:absolute;
          top:-10px;left:8px;text-transform:uppercase;">
          CLIENT & PERIOD
        </div>
        <table style="width:100%;border-collapse:collapse;margin:5px 0;
          font-size:9pt;">
          <tr>
            <th style="border:1px solid #000;padding:5px;
              background:#f0f0f0;font-weight:bold;width:15%;">
              Client Name
            </th>
            <td style="border:1px solid #000;padding:5px;" colspan="3">
              <strong>${d.client_name}</strong>
            </td>
          </tr>
          <tr>
            <th style="border:1px solid #000;padding:5px;background:#f0f0f0;">
              Phone
            </th>
            <td style="border:1px solid #000;padding:5px;width:35%;">
              ${d.client_phone || '—'}
            </td>
            <th style="border:1px solid #000;padding:5px;
              background:#f0f0f0;width:15%;">Email</th>
            <td style="border:1px solid #000;padding:5px;">
              ${d.client_email || '—'}
            </td>
          </tr>
          <tr>
            <th style="border:1px solid #000;padding:5px;background:#f0f0f0;">
              Pickup
            </th>
            <td style="border:1px solid #000;padding:5px;">
              ${pickup ? pickup.toLocaleString('en-GB') : '—'}
            </td>
            <th style="border:1px solid #000;padding:5px;background:#f0f0f0;">
              Dropoff
            </th>
            <td style="border:1px solid #000;padding:5px;">
              ${dropoff ? dropoff.toLocaleString('en-GB') : '—'}
            </td>
          </tr>
          <tr>
            <th style="border:1px solid #000;padding:5px;background:#f0f0f0;">
              Pickup Loc
            </th>
            <td style="border:1px solid #000;padding:5px;">
              ${d.pickup_location || 'Office'}
            </td>
            <th style="border:1px solid #000;padding:5px;background:#f0f0f0;">
              Dropoff Loc
            </th>
            <td style="border:1px solid #000;padding:5px;">
              ${d.dropoff_location || 'Office'}
            </td>
          </tr>
          <tr>
            <th style="border:1px solid #000;padding:5px;background:#f0f0f0;">
              Duration
            </th>
            <td style="border:1px solid #000;padding:5px;">
              <strong>${d.duration_days} Days</strong>
            </td>
            <th style="border:1px solid #000;padding:5px;background:#f0f0f0;">
              KM Allowance
            </th>
            <td style="border:1px solid #000;padding:5px;">
              ${totalKMDesc}
            </td>
          </tr>
        </table>
      </div>

      <!-- Vehicle Box -->
      <div style="border:1px solid #000;padding:8px;margin-bottom:10px;
        position:relative;border-radius:4px;">
        <div style="background:#000;color:white;padding:1px 8px;
          font-weight:bold;font-size:9pt;position:absolute;
          top:-10px;left:8px;text-transform:uppercase;">
          VEHICLE DETAILS
        </div>
        <table style="width:100%;border-collapse:collapse;margin:5px 0;
          font-size:9pt;">
          <tr>
            <th style="border:1px solid #000;padding:5px;
              background:#f0f0f0;width:15%;">Model</th>
            <td style="border:1px solid #000;padding:5px;" colspan="3">
              <strong>${d.car_label || '—'}</strong>
            </td>
          </tr>
        </table>
      </div>

      <!-- Financial Breakdown Box -->
      <div style="border:1px solid #000;padding:8px;margin-bottom:10px;
        position:relative;border-radius:4px;">
        <div style="background:#000;color:white;padding:1px 8px;
          font-weight:bold;font-size:9pt;position:absolute;
          top:-10px;left:8px;text-transform:uppercase;">
          FINANCIAL BREAKDOWN
        </div>
        <table style="width:100%;border-collapse:collapse;margin:5px 0;
          font-size:9pt;">
          <thead>
            <tr>
              <th style="border:1px solid #000;padding:5px;
                background:#f0f0f0;font-weight:bold;">Description</th>
              <th style="border:1px solid #000;padding:5px;
                background:#f0f0f0;font-weight:bold;">Details</th>
              <th style="border:1px solid #000;padding:5px;
                background:#f0f0f0;font-weight:bold;text-align:right;">
                Total (EGP)
              </th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td style="border:1px solid #000;padding:5px;">${r.desc}</td>
                <td style="border:1px solid #000;padding:5px;color:#555;">
                  ${r.detail}
                </td>
                <td style="border:1px solid #000;padding:5px;
                  text-align:right;font-weight:bold;">${r.amount}</td>
              </tr>`).join('')}
          </tbody>
          <tfoot>
            <tr style="font-weight:bold;background:#f0f0f0;">
              <td colspan="2" style="border:1px solid #000;padding:5px;
                text-align:right;">TOTAL PROPOSAL VALUE:</td>
              <td style="border:1px solid #000;padding:5px;text-align:right;
                font-size:11pt;color:#04509D;">
                ${fmtMoney(d.total_estimate)}
              </td>
            </tr>
            <tr>
              <td colspan="2" style="border:1px solid #000;padding:5px;
                text-align:right;">Security Deposit (Held, Refundable):</td>
              <td style="border:1px solid #000;padding:5px;text-align:right;">
                ${fmtMoney(d.deposit_amount)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Insurance Box -->
      <div style="border:1px solid #000;padding:8px;margin-bottom:10px;
        position:relative;border-radius:4px;">
        <div style="background:#000;color:white;padding:1px 8px;
          font-weight:bold;font-size:9pt;position:absolute;
          top:-10px;left:8px;text-transform:uppercase;">
          INSURANCE & LIABILITY: ${(d.insurance_plan || 'Basic').toUpperCase()}
        </div>
        <p style="margin:5px 0 0 0;font-size:8.5pt;line-height:1.4;">
          ${insText}
        </p>
      </div>

      <!-- Terms + QR -->
      <div style="display:flex;justify-content:space-between;
        align-items:flex-start;margin-bottom:8px;">
        <div style="flex-grow:1;">
          <div style="font-weight:bold;border-bottom:1px solid #ddd;
            font-size:8.5pt;color:#04509D;padding-bottom:3px;
            margin-bottom:5px;">
            RENTAL TERMS &amp; CONDITIONS — Summary &nbsp;&nbsp;
            <a href="https://brothersegy.com/terms-conditions/"
              target="_blank"
              style="color:#04509D;font-size:8pt;text-decoration:underline;">
              View Full Terms Online →
            </a>
          </div>
          <div style="font-size:7.2pt;column-count:2;column-gap:20px;
            text-align:justify;line-height:1.3;">
            <div style="margin-bottom:4px;">
              <strong>1. ELIGIBILITY:</strong>
              Min age 21. Valid License and ID/Passport mandatory.
              Authorized drivers only.
            </div>
            <div style="margin-bottom:4px;">
              <strong>2. RENTAL CYCLE:</strong>
              Charges based on 24-hour units. Exceeding by 5+ hours = full extra day.
            </div>
            <div style="margin-bottom:4px;">
              <strong>3. MILEAGE:</strong>
              120 KM/day included. Excess KM charged at return rates.
            </div>
            <div style="margin-bottom:4px;">
              <strong>4. FUEL:</strong>
              "Same to Same" policy. Return with same level as pickup.
            </div>
            <div style="margin-bottom:4px;">
              <strong>5. INSURANCE VOID:</strong>
              Plan is null if no Police Report is filed immediately after accident.
            </div>
            <div style="margin-bottom:4px;">
              <strong>6. DEPOSIT:</strong>
              Refunded upon safe return. Card refunds processed as EGP cash.
            </div>
            <div>
              <strong>7. LIABILITY:</strong>
              Lessee bears full legal and criminal liability for the vehicle
              during the rental period.
            </div>
          </div>
        </div>
        <div style="text-align:center;margin-left:15px;flex-shrink:0;">
          <img src="${termsQR}" style="height:50px;">
          <div style="font-size:6pt;font-weight:bold;margin-top:2px;">
            SCAN FOR FAQ
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div style="text-align:center;font-weight:bold;font-size:9.5pt;
        color:#04509D;margin-top:auto;padding-top:10px;
        border-top:1.5px solid #04509D;">
        We look forward to serving you. Best Regards, Brothers EGY Team
        <br>
        <span style="font-size:8pt;font-weight:normal;color:#555;">
          Proposal Ref: ${ref} &nbsp;|&nbsp; Valid for 7 days
        </span>
      </div>

    </div>`;

  // Show output panel
  const outEl = document.getElementById('pr-output');
  if (outEl) outEl.style.display = 'block';

  // Scroll to output
  setTimeout(() => {
    outEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 200);
};

// ============================================================
// PRINT PROPOSAL
// Opens A4 content in a new window for clean PDF saving
// ============================================================

window.printProposalWindow = function() {
  const content = document.getElementById('pr-a4-content')?.outerHTML;
  if (!content) {
    toast('Generate a proposal first', 'warning');
    return;
  }

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="UTF-8">
    <title>Brothers EGY - Proposal</title>
    <style>
      body { font-family:'Segoe UI',Tahoma,sans-serif;
             margin:0;padding:0;background:white; }
      @page { size:A4; margin:0; }
      @media print {
        body { -webkit-print-color-adjust:exact;
               print-color-adjust:exact; }
        .no-print { display:none !important; }
      }
      .print-btn { position:fixed;top:10px;right:10px;
        background:#04509D;color:white;border:none;
        padding:10px 20px;border-radius:6px;cursor:pointer;
        font-weight:bold;z-index:999; }
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
// PROPOSALS LIST
// ============================================================

window.renderProposalsList = function() {
  const filter = document.getElementById('pr-filter')?.value  || 'all';
  const search = (document.getElementById('pr-list-search')?.value || '').toLowerCase();
  const tbody  = document.getElementById('proposals-tbody');
  if (!tbody) return;

  let list = filter === 'all'
    ? G.proposals
    : G.proposals.filter(p => p.status === filter);

  if (search) {
    list = list.filter(p =>
      [p.proposal_ref, p.client_name, p.car_label]
        .join(' ').toLowerCase().includes(search)
    );
  }

  // Build summary pills
  const summaryEl = document.getElementById('pr-summary-pills');
  if (summaryEl) {
    const counts = {};
    G.proposals.forEach(p => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    summaryEl.innerHTML = Object.entries(counts).map(([status, count]) => `
      <span class="pill pill-${status.toLowerCase()}"
        style="cursor:pointer;"
        onclick="document.getElementById('pr-filter').value='${status}';
          renderProposalsList();">
        ${status}: ${count}
      </span>`).join('');
  }

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="7">
      <div class="empty-state" style="padding:18px;">
        <p>No proposals found</p>
      </div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(p => {
    const pickupDate  = p.pickup_date  ? new Date(p.pickup_date).toLocaleDateString('en-GB')  : '—';
    const dropoffDate = p.dropoff_date ? new Date(p.dropoff_date).toLocaleDateString('en-GB') : '—';
    const age         = p.timestamp
      ? Math.floor((Date.now() - p.timestamp) / 86400000) : null;
    const isExpiring  = age !== null && age >= 6 && p.status === 'Draft';

    return `
      <tr style="${isExpiring ? 'background:rgba(239,68,68,0.04);' : ''}">
        <td>
          <div style="color:var(--accent);font-weight:700;
            font-size:11px;cursor:pointer;"
            onclick="previewProposal('${p.id}')">
            ${p.proposal_ref || p.id}
          </div>
          ${isExpiring
            ? `<div style="font-size:9px;color:var(--danger);">⚠️ Day ${age}</div>`
            : ''}
          ${age !== null
            ? `<div style="font-size:9px;color:var(--text3);">${age}d ago</div>`
            : ''}
        </td>
        <td>
          <div style="font-weight:600;font-size:11px;">
            ${p.client_name || '—'}
          </div>
          ${p.client_phone
            ? `<div style="font-size:10px;color:var(--text3);">
                ${p.client_phone}
              </div>` : ''}
        </td>
        <td style="font-size:11px;max-width:130px;white-space:nowrap;
          overflow:hidden;text-overflow:ellipsis;">
          ${p.car_label || '—'}
        </td>
        <td style="font-size:10px;white-space:nowrap;">
          ${pickupDate}<br>
          <span style="color:var(--text3);">→ ${dropoffDate}</span><br>
          <span style="color:var(--accent);font-weight:700;">
            ${p.duration_days || '?'}d
          </span>
        </td>
        <td style="white-space:nowrap;">
          <strong>${fmtMoney(p.total_estimate)}</strong>
          ${(p.deposit_amount || 0) > 0
            ? `<div style="font-size:9px;color:var(--warning);">
                +${fmtMoney(p.deposit_amount)} dep.
              </div>` : ''}
        </td>
        <td>
          <span class="pill pill-${(p.status || 'draft').toLowerCase()}">
            ${p.status || 'Draft'}
          </span>
        </td>
        <td>
          <div style="display:flex;gap:3px;flex-wrap:wrap;">
            <button class="btn btn-ghost btn-xs"
              onclick="previewProposal('${p.id}')"
              title="Preview">👁</button>
            <button class="btn btn-ghost btn-xs"
              onclick="printProposalFromId('${p.id}')"
              title="Print">🖨️</button>
            ${p.status === 'Draft' || p.status === 'Pending' ? `
              <button class="btn btn-success btn-xs"
                onclick="convertProposalToOrder('${p.id}')"
                title="Convert to Order">✅ Order</button>
              <button class="btn btn-warning btn-xs"
                onclick="updateProposalStatus('${p.id}','Accepted')"
                title="Accept">✓ Accept</button>
              <button class="btn btn-danger btn-xs"
                onclick="updateProposalStatus('${p.id}','Cancelled')"
                title="Cancel">✕</button>` : ''}
            ${['Draft','Pending','Cancelled'].includes(p.status) ? `
              <button class="btn btn-danger btn-xs"
                onclick="if(confirm('Delete proposal ${p.proposal_ref || p.id}?'))
                  deleteProposal('${p.id}')"
                title="Delete">🗑️</button>` : ''}
          </div>
        </td>
      </tr>`;
  }).join('');
};

// ============================================================
// PROPOSAL ACTIONS
// ============================================================

window.previewProposal = function(proposalId) {
  const p = G.proposals.find(x => x.id === proposalId);
  if (!p) { toast('Proposal not found in cache', 'error'); return; }

  window._lastGeneratedProposal = { id: proposalId, ...p };
  buildProposalA4(proposalId, p);

  setTimeout(() => {
    document.getElementById('pr-output')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 200);
};

window.printProposalFromId = function(proposalId) {
  previewProposal(proposalId);
  setTimeout(printProposalWindow, 500);
};

window.updateProposalStatus = async function(id, status) {
  try {
    await db.collection('proposals').doc(id).update({ status });
    const idx = G.proposals.findIndex(p => p.id === id);
    if (idx > -1) G.proposals[idx].status = status;
    _updateProposalsBadge();
    renderProposalsList();
    await logAction('EDIT', 'Proposals', `Proposal ${id} → ${status}`);
    toast(`Proposal marked as ${status}`,
      status === 'Cancelled' ? 'warning' : 'success');
  } catch (e) {
    toast('Update failed: ' + e.message, 'error');
  }
};

window.deleteProposal = async function(proposalId) {
  try {
    await db.collection('proposals').doc(proposalId).delete();
    G.proposals = G.proposals.filter(p => p.id !== proposalId);
    _updateProposalsBadge();
    renderProposalsList();
    toast('Proposal deleted', 'success');
  } catch (e) {
    toast('Delete failed: ' + e.message, 'error');
  }
};

// ============================================================
// CONVERT PROPOSAL TO ORDER
// ============================================================

window.convertLastProposalToContract = function() {
  const p = window._lastGeneratedProposal;
  if (!p) { toast('No proposal generated in this session.', 'error'); return; }
  convertProposalToOrder(p.id);
};

window.convertProposalToOrder = function(proposalId) {
  const p = G.proposals.find(x => x.id === proposalId);
  if (!p) { toast('Proposal not found', 'error'); return; }

  // Show car selection modal since proposals don't bind to specific plate
  const cars = G.fleet.filter(c => c.is_active !== false && !c.archived);

  const html = `
    <div style="margin-bottom:11px;font-size:11px;color:var(--text3);">
      Proposal <strong style="color:var(--accent);">
        ${p.proposal_ref || proposalId}
      </strong> —
      <strong>${p.client_name}</strong><br>
      Vehicle requested: <strong style="color:var(--accent);">
        ${p.car_label || '—'}
      </strong>
    </div>
    <div class="field" style="margin-bottom:12px;">
      <label>Select Actual Car from Fleet</label>
      <select id="conv-car-sel"
        style="width:100%;padding:8px 10px;background:var(--surface2);
          border:1px solid var(--border);border-radius:8px;color:var(--text);">
        <option value="">-- Select car --</option>
        ${cars.map(c => {
          const cat = getCarStatusCategory(c);
          const dot = cat === 'available' ? '🟢' :
                      cat === 'rented'    ? '🔵' :
                      cat === 'accident'  ? '🔴' : '🟡';
          return `<option value="${c.id}">
            ${dot} ${getCarLabel(c,'en')} | ${c.plate || ''}
          </option>`;
        }).join('')}
      </select>
    </div>
    <div style="display:flex;gap:7px;">
      <button class="btn btn-primary btn-full"
        onclick="
          const sel  = document.getElementById('conv-car-sel');
          const car  = G.fleet.find(c => c.id === sel.value);
          if (!car) { toast('Please select a car','error'); return; }
          closeModal();
          setTimeout(() => _doConvertProposal(
            '${proposalId}', car.id, getCarLabel(car,'en')
          ), 100);">
        ✅ Confirm & Convert to Order
      </button>
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    </div>`;

  openModal('Select Car for Order', html);
};

window._doConvertProposal = async function(proposalId, carId, carLabel) {
  const p = G.proposals.find(x => x.id === proposalId);
  if (!p) return;

  try {
    const branchCode = p.branch || G.user?.branch || 'GEN';
    const orderRef   = await generateDocRef('ORD', branchCode);

    await db.collection('bookings').add({
      'No.':                                orderRef,
      'اسم العميل':                          p.client_name,
      'كود العميل':                          p.client_crm_id || '',
      'كود السيارة':                         carId || '',
      car_label:                            carLabel || '',
      'col_L':                              p.pickup_date,
      'col_T':                              p.dropoff_date,
      'مكان الاستلام':                      p.pickup_location  || '',
      'مكان التسليم':                       p.dropoff_location || '',
      'سعر السيارة اليومي بالجنيه المصري':  p.daily_rate || 0,
      'إجمالي المستحق (Total)':              p.total_estimate || 0,
      branch:                               branchCode,
      'فرع الإصدار':                        branchCode,
      'حالة الطلب':                          'Active',
      closed:                               false,
      from_proposal:                        proposalId,
      insurance_plan:                       p.insurance_plan || 'Basic',
      km_package:                           p.km_package     || 'Standard (120 KM/Day)',
      rental_days:                          String(p.duration_days || ''),
      _sys_created:   firebase.firestore.FieldValue.serverTimestamp()
    });

    await db.collection('proposals').doc(proposalId).update({
      status:       'Converted',
      converted_to: orderRef,
      converted_at: new Date().toISOString()
    });

    const idx = G.proposals.findIndex(x => x.id === proposalId);
    if (idx >= 0) {
      G.proposals[idx].status       = 'Converted';
      G.proposals[idx].converted_to = orderRef;
    }

    _updateProposalsBadge();
    renderProposalsList();

    await logAction('GENERATE', 'Proposals',
      `Proposal ${proposalId} converted to Order ${orderRef}`);

    toast(`✅ Proposal converted to Order: ${orderRef}`, 'success');

  } catch (e) {
    toast('Conversion failed: ' + e.message, 'error');
  }
};

// ============================================================
// CLEAR FORM
// ============================================================

window.clearProposalForm = function() {
  [
    'pr-client-search', 'pr-fname', 'pr-lname',
    'pr-phone', 'pr-email',
    'pr-pickup', 'pr-dropoff',
    'pr-ploc', 'pr-dloc', 'pr-days'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  ['pr-daily', 'pr-km-cost', 'pr-ins-fee',
   'pr-pfee'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '0';
  });

  const depEl = document.getElementById('pr-deposit');
  if (depEl) depEl.value = '30000';

  const carEl = document.getElementById('pr-car');
  if (carEl) carEl.value = '';

  const kmEl = document.getElementById('pr-km');
  if (kmEl) kmEl.value = 'Standard (120 KM/Day)';

  const insEl = document.getElementById('pr-ins');
  if (insEl) insEl.value = 'Basic';

  ['pr-child-seat', 'pr-add-driver'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = false;
  });

  const badge = document.getElementById('pr-car-badge');
  if (badge) badge.className = 'car-info-badge';

  const crmId = document.getElementById('pr-crm-id');
  if (crmId) crmId.style.display = 'none';

  const editBtn = document.getElementById('pr-edit-btn');
  if (editBtn) editBtn.style.display = 'none';

  const warnEl = document.getElementById('pr-overlap-warn');
  if (warnEl) warnEl.style.display = 'none';

  const okEl = document.getElementById('pr-availability-ok');
  if (okEl) okEl.style.display = 'none';

  const outEl = document.getElementById('pr-output');
  if (outEl) outEl.style.display = 'none';

  const refPrev = document.getElementById('pr-ref-preview');
  if (refPrev) refPrev.textContent = '';

  window['_crm_pr_id'] = null;
  window._lastGeneratedProposal = null;

  prCalc();
};

// ============================================================
// CRM SEARCH INTEGRATION
// Used by contracts, proposals and receipts
// ============================================================

let _crmSearchTimeout = null;

window.crmSearch = function(prefix) {
  clearTimeout(_crmSearchTimeout);
  _crmSearchTimeout = setTimeout(() => _doCrmSearch(prefix), 350);
};

function _doCrmSearch(prefix) {
  const q      = (document.getElementById(`${prefix}-client-search`)?.value || '')
    .toLowerCase().trim();
  const sugBox = document.getElementById(`${prefix}-suggestions`);
  if (!sugBox) return;

  if (!q || q.length < 2) { sugBox.style.display = 'none'; return; }

  const matches = G.customers.filter(c => {
    const name     = String((c['الاسم الأول'] || '') + ' ' + (c['الاسم الأخير'] || '')).toLowerCase();
    const passport = String(c['رقم جواز السفر'] || '').toLowerCase();
    const natid    = String(c['الرقم القومي']    || '').toLowerCase();
    const phone    = String(c['رقم التليفون']    || '').toLowerCase();
    return name.includes(q) || passport.includes(q) ||
           natid.includes(q) || phone.includes(q);
  });

  if (!matches.length) { sugBox.style.display = 'none'; return; }

  sugBox.style.display = 'block';
  sugBox.innerHTML = matches.slice(0, 8).map(c => {
    const name = ((c['الاسم الأول'] || '') + ' ' + (c['الاسم الأخير'] || '')).trim();
    const id   = c['رقم جواز السفر'] || c['الرقم القومي'] || '';
    return `
      <div class="crm-suggestion-item"
        onclick="fillCrmFields('${prefix}','${c.id}')">
        <div class="sug-avatar">${initials(name).toUpperCase()}</div>
        <div class="sug-info">
          <div class="sug-name">${name}</div>
          <div class="sug-id">${id} | #${c['No.'] || c.id}</div>
        </div>
      </div>`;
  }).join('');
}

window.fillCrmFields = function(prefix, customerId) {
  const c = G.customers.find(x => x.id === customerId);
  if (!c) return;

  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) {
      el.value    = val || '';
      el.readOnly = true;
    }
  };

  set(`${prefix}-fname`,       c['الاسم الأول']            || c.col_C || '');
  set(`${prefix}-lname`,       c['الاسم الأخير']           || c.col_D || '');
  set(`${prefix}-phone`,       c['رقم التليفون']           || '');
  set(`${prefix}-email`,       c['عنوان البريد الإلكتروني'] || '');
  set(`${prefix}-passport`,    c['رقم جواز السفر']         || c['الرقم القومي'] || '');
  set(`${prefix}-license`,     c['رقم رخصة القيادة']       || '');
  set(`${prefix}-address`,     c['العنوان']                 || '');
  set(`${prefix}-nationality`, c['رمز الدولة']              || '');

  const searchEl = document.getElementById(`${prefix}-client-search`);
  if (searchEl) {
    searchEl.value = ((c['الاسم الأول'] || c.col_C || '') + ' ' +
                      (c['الاسم الأخير'] || c.col_D || '')).trim();
  }

  const sugBox = document.getElementById(`${prefix}-suggestions`);
  if (sugBox) sugBox.style.display = 'none';

  const crmIdEl = document.getElementById(`${prefix}-crm-id`);
  if (crmIdEl) {
    crmIdEl.textContent = `CRM ID: ${c['No.'] || c.id} (LINKED)`;
    crmIdEl.style.display = 'inline';
  }

  const editBtn = document.getElementById(`${prefix}-edit-btn`);
  if (editBtn) editBtn.style.display = 'inline-flex';

  window[`_crm_${prefix}_id`] = c.id;
};

window.crmEditMode = function(prefix) {
  ['fname','lname','phone','email','passport','license','address','nationality']
    .forEach(f => {
      const el = document.getElementById(`${prefix}-${f}`);
      if (el) el.readOnly = false;
    });
  const saveBtn   = document.getElementById(`${prefix}-save-btn`);
  const cancelBtn = document.getElementById(`${prefix}-cancel-btn`);
  const editBtn   = document.getElementById(`${prefix}-edit-btn`);
  if (saveBtn)   saveBtn.style.display   = 'inline-flex';
  if (cancelBtn) cancelBtn.style.display = 'inline-flex';
  if (editBtn)   editBtn.style.display   = 'none';
};

window.crmSaveEdit = async function(prefix) {
  const customerId = window[`_crm_${prefix}_id`];
  if (!customerId) return;

  try {
    const upd = {
      'الاسم الأول':            document.getElementById(`${prefix}-fname`)?.value.trim()        || '',
      'الاسم الأخير':           document.getElementById(`${prefix}-lname`)?.value.trim()        || '',
      'رقم التليفون':           document.getElementById(`${prefix}-phone`)?.value.trim()        || '',
      'عنوان البريد الإلكتروني':document.getElementById(`${prefix}-email`)?.value.trim()        || '',
      'رقم جواز السفر':         document.getElementById(`${prefix}-passport`)?.value.trim()     || '',
      'رقم رخصة القيادة':       document.getElementById(`${prefix}-license`)?.value.trim()      || '',
      'العنوان':                 document.getElementById(`${prefix}-address`)?.value.trim()      || '',
      'رمز الدولة':              document.getElementById(`${prefix}-nationality`)?.value.trim()  || '',
      '_sys_updated':            Date.now()
    };

    await db.collection('customers').doc(customerId).update(upd);

    const idx = G.customers.findIndex(c => c.id === customerId);
    if (idx > -1) G.customers[idx] = { ...G.customers[idx], ...upd };

    ['fname','lname','phone','email','passport','license','address','nationality']
      .forEach(f => {
        const el = document.getElementById(`${prefix}-${f}`);
        if (el) el.readOnly = true;
      });

    const saveBtn   = document.getElementById(`${prefix}-save-btn`);
    const cancelBtn = document.getElementById(`${prefix}-cancel-btn`);
    const editBtn   = document.getElementById(`${prefix}-edit-btn`);
    if (saveBtn)   saveBtn.style.display   = 'none';
    if (cancelBtn) cancelBtn.style.display = 'none';
    if (editBtn)   editBtn.style.display   = 'inline-flex';

    toast('Client details updated!', 'success');

  } catch (e) {
    toast('Update failed: ' + e.message, 'error');
  }
};

window.crmCancelEdit = function(prefix) {
  const customerId = window[`_crm_${prefix}_id`];
  if (customerId) fillCrmFields(prefix, customerId);

  const saveBtn   = document.getElementById(`${prefix}-save-btn`);
  const cancelBtn = document.getElementById(`${prefix}-cancel-btn`);
  const editBtn   = document.getElementById(`${prefix}-edit-btn`);
  if (saveBtn)   saveBtn.style.display   = 'none';
  if (cancelBtn) cancelBtn.style.display = 'none';
  if (editBtn)   editBtn.style.display   = 'inline-flex';
};
