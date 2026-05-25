// ============================================================
// modules/contracts.js
// English and Arabic contract generation
// 4-page output: Contract, Terms, Inspection, Receipts
// Incorporates full design from contract-en.html reference
// ============================================================

// ============================================================
// ENTRY POINTS
// ============================================================

window.renderENContract = function() {
  renderPageLoading('page-en-contract', '📄', 'English Contract');
  loadENContract();
};

window.renderARContract = function() {
  renderPageLoading('page-ar-contract', '📝', 'Arabic Contract');
  loadARContract();
};

// ============================================================
// FULL TERMS TEXT (from contract-en.html reference)
// ============================================================

const TERMS_TEXT = {
  1: `* <strong>Minimum Age:</strong> You must be 21 years or older.<br>
      * <strong>License:</strong> Valid ID and Driving License accepted in Egypt are mandatory.<br>
      * <strong>Authorized Drivers:</strong> Only the person named on the contract may drive.
        Additional drivers must be approved and listed.`,
  2: `* <strong>24-Hour Cycle:</strong> Charges based on 24-hour units.<br>
      * <strong>Rental Cycle:</strong> Every hour is charged from the 1st hour.
        If the period is exceeded by 5 hours, a full additional day is charged.<br>
      * <strong>Extensions:</strong> Any extension must be approved by the Company.
        Unauthorized late returns are charged at a higher local tariff.<br>
      * <strong>Early Return:</strong> No refunds are issued for vehicles returned early.`,
  3: `* <strong>Free Cancellation:</strong> Full refund if cancelled more than 48 hours before pickup.<br>
      * <strong>Late Cancellation (&lt;48h):</strong> 30% of the booking value is retained.<br>
      * <strong>No Show:</strong> Failure to pick up the car without prior notice results in
        100% forfeiture of the booking amount.`,
  4: `* <strong>Mileage Limit:</strong> Standard limit is 120 KM/day unless an Extra KM Package
        is purchased. Total allowance is summed. Extra KM charged upon return.<br>
      * <strong>Delivery Locations:</strong> Delivery available to Hotels and Airports only.<br>
      * <strong>One-Way Rental:</strong> Dropping off at a different branch incurs a specific fee.`,
  6: `* <strong>Theft Policy:</strong> Theft is <strong>NOT</strong> covered by insurance.
        The vehicle is the Lessee's sole responsibility and must be parked in secure locations.`,
  7: `Insurance is considered <strong>NULL AND VOID</strong> in the following cases:<br>
      1. Failure to provide an official <strong>Police Report</strong> immediately after an accident.<br>
      2. Driving under the influence of alcohol or drugs.<br>
      3. Driving off-road (Safari) or on unpaved roads.<br>
      4. Driving by an unauthorized person.<br>
      5. Gross negligence (e.g., failing to engage handbrake).`,
  8: `The following items are NOT covered by any insurance plan:<br>
      * <strong>Loss of Car Key:</strong> $400 USD<br>
      * <strong>License Loss:</strong> $250 USD<br>
      * <strong>Spare Tire/Tools:</strong> $300 USD<br>
      * <strong>Fire Extinguisher:</strong> $200 USD<br>
      * <strong>Tire Damage:</strong> $200 USD per tire<br>
      * <strong>Interior Damage:</strong> $100–$1,000 USD<br>
      * <strong>Dirty Return:</strong> Minimum $10 USD (350 EGP)`,
  9: `* <strong>Deposit Block:</strong> A security amount is blocked/paid at pickup.<br>
      * <strong>Refund Policy:</strong> Deposit is 100% refundable upon safe vehicle return.<br>
      * <strong>Refund Method:</strong> Deposit returned in same currency mix as received.
        Card deposits refunded as EGP CASH to avoid bank delays.<br>
      * <strong>Release Time:</strong> Released only after Handover Inspection Report is signed.`,
  10: `<strong>Step 1: Independent Evaluation.</strong> Assessed by authorized independent Car Service Center. Their quotation is final.<br>
       <strong>Step 2: Liability.</strong> At-fault party pays Repair Cost + Lost Rental Days + Inspection Fee.<br>
       <strong>Step 3: Legal.</strong> Unresolved disputes referred to Competent Court under Egyptian Law.`,
  11: `The Lessee is fully responsible for any traffic violations (Speeding, Parking, Radar).
       The Company reserves the right to charge these costs plus administrative fees.`,
  12: `In case of breakdown, call the Company immediately. Do not attempt unauthorized repairs.
       If breakdown is due to Company fault (Battery/Engine), you pay nothing.
       If due to negligence (e.g., wrong fuel), Lessee pays all costs.`,
  13: `* <strong>Interior Negligence:</strong> Insurance does NOT cover negligence inside the vehicle.<br>
       * <strong>Minor Damages:</strong> For small scratches where a Police Report is impractical,
         Lessee agrees to pay repair cost directly.<br>
       * <strong>Police Report:</strong> If Lessee refuses to settle damages, a Police Report is MANDATORY.`
};

const INS_DETAILS = {
  'Basic': `<strong>High Deductible.</strong> You pay 100% for Glass, Tires, and Undercarriage damages.<br>
    <strong>INCLUDES:</strong> Standard CDW (Body damage only with excess).<br>
    <strong>EXCLUDES:</strong> All glass, tires, undercarriage, towing, and third party liability.`,
  'Intermediate': `<strong>Reduced Liability.</strong> Client pays 70% of repair costs. Company pays 30%.<br>
    <strong>INCLUDES:</strong> Undercarriage coverage up to 10K EGP.<br>
    <strong>EXCLUDES:</strong> Glass, Tires, and Interior damage.`,
  'Full Protection': `<strong>Zero Deductible (Waiver).</strong> Reduces liability to ZERO for covered items.<br>
    <strong>CAPS:</strong> Roof (20k), Glass (25k), Undercarriage (40k), Tires (4k/tire).<br>
    <strong>EXCLUDES:</strong> Interior damage (saloon), misfueling, or personal possessions.`
};

const INS_SIMPLE = {
  'Basic':          'Basic Insurance: 100% Client Liability for Damages.',
  'Intermediate':   'Intermediate: 70% Client Liability / 30% Company Coverage.',
  'Full Protection':'Full Protection: Zero Deductible (Subject to caps).'
};

// ============================================================
// EN CONTRACT PAGE
// ============================================================

window.loadENContract = async function() {
  const wrap = document.getElementById('page-en-contract');
  if (!wrap) return;

  wrap.innerHTML = `
    <div style="display:grid;grid-template-columns:420px 1fr;
      gap:18px;align-items:start;">

      <!-- LEFT: Form Panel -->
      <div class="panel sticky-panel"
        style="max-height:calc(100vh - 120px);overflow-y:auto;">

        <div style="display:flex;align-items:center;
          justify-content:space-between;margin-bottom:13px;">
          <h3 style="font-size:13px;font-weight:800;">📄 New Contract</h3>
          <span id="en-ref-preview"
            style="font-size:10px;color:var(--accent);font-weight:700;"></span>
        </div>

        <!-- Load from Proposal -->
        <div style="background:rgba(59,130,246,0.08);
          border:1px solid rgba(59,130,246,0.25);
          border-radius:9px;padding:11px;margin-bottom:13px;">
          <div style="font-size:10px;font-weight:700;color:var(--accent);
            margin-bottom:7px;">📋 Load from Proposal (Optional)</div>
          <div style="display:flex;gap:7px;">
            <input type="text" id="en-proposal-ref"
              placeholder="Proposal Ref e.g. PR-HRG-..."
              style="flex:1;padding:7px 10px;background:var(--surface2);
                border:1px solid var(--border);border-radius:8px;color:var(--text);"
              oninput="searchProposalRef('en')"/>
            <button class="btn btn-ghost btn-xs"
              onclick="document.getElementById('en-proposal-ref').value='';
                document.getElementById('en-proposal-status').textContent=''">✕</button>
          </div>
          <div id="en-proposal-status"
            style="font-size:10px;color:var(--text2);margin-top:5px;"></div>
        </div>

        <!-- Section 1: Contract Info -->
        <div style="margin-bottom:13px;">
          <div style="font-size:10px;font-weight:800;color:var(--accent);
            text-transform:uppercase;margin-bottom:8px;padding-bottom:5px;
            border-bottom:1px solid var(--border);">① Contract Info</div>
          <div class="form-grid">
            <div class="field">
              <label>Issuing Branch</label>
              <select id="en-branch">
                <option value="HRG">Hurghada Branch</option>
                <option value="ALX">Alexandria (HQ)</option>
                <option value="CAI">Cairo Branch</option>
                <option value="RSH">Rashid Branch</option>
              </select>
            </div>
            <div class="field">
              <label>Rental Mode</label>
              <select id="en-mode" onchange="enCalc()">
                <option value="Daily">Daily (Short Term)</option>
                <option value="Monthly">Monthly (Long Term)</option>
              </select>
            </div>
            <div class="field">
              <label>Agreement Type</label>
              <select id="en-agr" onchange="enTogglePrev()">
                <option value="new">New Agreement</option>
                <option value="extension">Extension</option>
              </select>
            </div>
            <div class="field" id="en-prev-wrap" style="display:none;">
              <label>Prev. Contract No.</label>
              <input type="text" id="en-prev-con" placeholder="Previous No."/>
            </div>
          </div>
        </div>

        <!-- Section 2: Vehicle -->
        <div style="margin-bottom:13px;">
          <div style="font-size:10px;font-weight:800;color:var(--accent);
            text-transform:uppercase;margin-bottom:8px;padding-bottom:5px;
            border-bottom:1px solid var(--border);">② Vehicle Details</div>
          <div class="field" style="margin-bottom:7px;">
            <label>Select from Fleet</label>
            <select id="en-car" onchange="enSelectCar()">
              <option value="">-- Select Car --</option>
            </select>
          </div>
          <div id="en-car-badge" class="car-info-badge"></div>
          <div class="form-grid" style="margin-top:7px;">
            <div class="field">
              <label>KM Out</label>
              <input type="number" id="en-km-out" placeholder="e.g. 52747"/>
            </div>
            <div class="field">
              <label>Fuel Level</label>
              <select id="en-fuel">
                <option>Full (8/8)</option>
                <option>3/4</option>
                <option>1/2</option>
                <option>1/4</option>
                <option>Reserve</option>
              </select>
            </div>
            <div class="field">
              <label>Daily Rent (EGP)</label>
              <input type="number" id="en-daily"
                placeholder="0" oninput="enCalc()"/>
            </div>
            <div class="field">
              <label>Insurance Fee (Daily)</label>
              <input type="number" id="en-ins-fee"
                value="0" oninput="enCalc()"/>
            </div>
          </div>
        </div>

        <!-- Section 3: Client -->
        <div style="margin-bottom:13px;">
          <div style="font-size:10px;font-weight:800;color:var(--accent);
            text-transform:uppercase;margin-bottom:8px;padding-bottom:5px;
            border-bottom:1px solid var(--border);">③ Client Details</div>
          <div class="crm-search-wrap">
            <div class="crm-search-header">
              🔍 SEARCH & AUTO-FILL CLIENT
              <span id="en-crm-id" style="display:none;"></span>
            </div>
            <div class="crm-input-row">
              <input type="text" id="en-client-search"
                placeholder="Name, passport, phone..."
                oninput="crmSearch('en')"/>
            </div>
            <div class="crm-actions">
              <button class="crm-action-btn new"
                onclick="openAddCustomerModal()">+ New</button>
              <button class="crm-action-btn edit" id="en-edit-btn"
                style="display:none;" onclick="crmEditMode('en')">✏️ Edit</button>
              <button class="crm-action-btn save" id="en-save-btn"
                style="display:none;" onclick="crmSaveEdit('en')">💾 Save</button>
              <button class="crm-action-btn cancel" id="en-cancel-btn"
                style="display:none;" onclick="crmCancelEdit('en')">✕</button>
            </div>
            <div class="crm-suggestions" id="en-suggestions"></div>
          </div>
          <div class="form-grid">
            <div class="field">
              <label>First Name *</label>
              <input type="text" id="en-fname" readonly/>
            </div>
            <div class="field">
              <label>Surname *</label>
              <input type="text" id="en-lname" readonly/>
            </div>
            <div class="field">
              <label>Passport / National ID *</label>
              <input type="text" id="en-passport" readonly/>
            </div>
            <div class="field">
              <label>Nationality</label>
              <input type="text" id="en-nationality" readonly/>
            </div>
            <div class="field">
              <label>Phone</label>
              <input type="text" id="en-phone" readonly/>
            </div>
            <div class="field">
              <label>Email</label>
              <input type="text" id="en-email" readonly/>
            </div>
            <div class="field">
              <label>Driver License *</label>
              <input type="text" id="en-license" readonly/>
            </div>
            <div class="field">
              <label>Address</label>
              <input type="text" id="en-address" readonly/>
            </div>
            <div class="field">
              <label>Add. Driver Name</label>
              <input type="text" id="en-add-dr-name" placeholder="Optional"/>
            </div>
            <div class="field">
              <label>Add. Driver License</label>
              <input type="text" id="en-add-dr-lic" placeholder="Optional"/>
            </div>
          </div>
        </div>

        <!-- Section 4: Dates & Locations -->
        <div style="margin-bottom:13px;">
          <div style="font-size:10px;font-weight:800;color:var(--accent);
            text-transform:uppercase;margin-bottom:8px;padding-bottom:5px;
            border-bottom:1px solid var(--border);">④ Dates & Locations</div>
          <div class="form-grid">
            <div class="field">
              <label>Pickup Date/Time</label>
              <input type="datetime-local" id="en-pickup" onchange="enCalc()"/>
            </div>
            <div class="field">
              <label>Dropoff Date/Time</label>
              <input type="datetime-local" id="en-dropoff" onchange="enCalc()"/>
            </div>
            <div class="field">
              <label>Pickup Location</label>
              <select id="en-ploc-type">
                <option>Office</option>
                <option>Airport</option>
                <option>Hotel</option>
              </select>
            </div>
            <div class="field">
              <label>Pickup Address</label>
              <input type="text" id="en-ploc-addr" placeholder="Specific address"/>
            </div>
            <div class="field">
              <label>Dropoff Location</label>
              <select id="en-dloc-type">
                <option>Office</option>
                <option>Airport</option>
                <option>Hotel</option>
              </select>
            </div>
            <div class="field">
              <label>Dropoff Address</label>
              <input type="text" id="en-dloc-addr" placeholder="Specific address"/>
            </div>
          </div>
        </div>

        <!-- Section 5: Payments -->
        <div style="margin-bottom:13px;">
          <div style="font-size:10px;font-weight:800;color:var(--accent);
            text-transform:uppercase;margin-bottom:8px;padding-bottom:5px;
            border-bottom:1px solid var(--border);">⑤ Payments</div>
          <div style="font-size:10px;color:var(--text3);
            margin-bottom:5px;font-weight:700;">Rent Paid Now</div>
          <div class="form-grid g3" style="margin-bottom:7px;">
            <div class="field">
              <label>EGP</label>
              <input type="number" id="en-paid-egp" value="0" oninput="enCalc()"/>
            </div>
            <div class="field">
              <label>USD</label>
              <input type="number" id="en-paid-usd" value="0" oninput="enCalc()"/>
            </div>
            <div class="field">
              <label>EUR</label>
              <input type="number" id="en-paid-eur" value="0" oninput="enCalc()"/>
            </div>
          </div>
          <div class="form-grid" style="margin-bottom:10px;">
            <div class="field">
              <label>Card (EGP)</label>
              <input type="number" id="en-paid-card" value="0" oninput="enCalc()"/>
            </div>
            <div class="field">
              <label>Delivery Fee</label>
              <input type="number" id="en-del-fee" value="0" oninput="enCalc()"/>
            </div>
            <div class="field">
              <label>Pickup Fee</label>
              <input type="number" id="en-pick-fee" value="0" oninput="enCalc()"/>
            </div>
            <div class="field">
              <label>Required Deposit</label>
              <input type="number" id="en-req-dep" value="0" oninput="enCalc()"/>
            </div>
          </div>
          <div style="font-size:10px;color:var(--text3);
            margin-bottom:5px;font-weight:700;">Deposit Held</div>
          <div class="form-grid g3" style="margin-bottom:7px;">
            <div class="field">
              <label>EGP</label>
              <input type="number" id="en-dep-egp" value="0" oninput="enCalc()"/>
            </div>
            <div class="field">
              <label>USD</label>
              <input type="number" id="en-dep-usd" value="0" oninput="enCalc()"/>
            </div>
            <div class="field">
              <label>EUR</label>
              <input type="number" id="en-dep-eur" value="0" oninput="enCalc()"/>
            </div>
          </div>
          <div class="form-grid" style="margin-bottom:10px;">
            <div class="field">
              <label>Deposit Card (EGP)</label>
              <input type="number" id="en-dep-card" value="0" oninput="enCalc()"/>
            </div>
          </div>
        </div>

        <!-- Section 6: Packages -->
        <div style="margin-bottom:13px;">
          <div style="font-size:10px;font-weight:800;color:var(--accent);
            text-transform:uppercase;margin-bottom:8px;padding-bottom:5px;
            border-bottom:1px solid var(--border);">⑥ Package & Add-ons</div>
          <div class="form-grid">
            <div class="field">
              <label>Insurance Package</label>
              <select id="en-ins-pkg">
                <option value="Basic">Basic (100% Client Liability)</option>
                <option value="Intermediate">Intermediate (70% / 30%)</option>
                <option value="Full Protection">Full Protection (Zero Liability)</option>
              </select>
            </div>
            <div class="field">
              <label>KM Package</label>
              <select id="en-km-pkg" onchange="enCalc()">
                <option value="standard" data-km="0">Standard (120 KM/Day)</option>
                <option value="500"      data-km="500">500 KM Extra</option>
                <option value="750"      data-km="750">750 KM Extra</option>
                <option value="1000"     data-km="1000">1000 KM Extra</option>
                <option value="1500"     data-km="1500">1500 KM Package</option>
                <option value="2000"     data-km="2000">2000 KM Package</option>
                <option value="3000"     data-km="3000">3000 KM Package</option>
                <option value="unlimited" data-km="999999">Unlimited KM</option>
              </select>
            </div>
            <div class="field">
              <label>KM Package Cost (EGP)</label>
              <input type="number" id="en-km-cost" value="0" oninput="enCalc()"/>
            </div>
          </div>
          <div style="display:flex;gap:13px;margin-top:7px;flex-wrap:wrap;">
            <label style="display:flex;align-items:center;gap:5px;
              font-size:11px;cursor:pointer;background:var(--surface2);
              padding:7px 12px;border-radius:8px;border:1px solid var(--border);">
              <input type="checkbox" id="en-add-driver"
                onchange="enCalc()" style="width:14px;height:14px;"/>
              Additional Driver
              <input type="number" id="en-dr-rate" value="250"
                oninput="enCalc()"
                style="width:65px;padding:3px 7px;background:var(--surface2);
                  border:1px solid var(--border);border-radius:6px;color:var(--text);"
                title="Rate per day"/>
              <span style="font-size:10px;color:var(--text3);">EGP/day</span>
            </label>
            <label style="display:flex;align-items:center;gap:5px;
              font-size:11px;cursor:pointer;background:var(--surface2);
              padding:7px 12px;border-radius:8px;border:1px solid var(--border);">
              <input type="checkbox" id="en-add-seat"
                onchange="enCalc()" style="width:14px;height:14px;"/>
              Child Seat
              <input type="number" id="en-seat-rate" value="250"
                oninput="enCalc()"
                style="width:65px;padding:3px 7px;background:var(--surface2);
                  border:1px solid var(--border);border-radius:6px;color:var(--text);"
                title="Rate per day"/>
              <span style="font-size:10px;color:var(--text3);">EGP/day</span>
            </label>
          </div>
        </div>

        <!-- Live Estimate -->
        <div style="background:var(--surface2);border:1px solid var(--border);
          border-radius:9px;padding:11px;margin-bottom:13px;">
          <div style="font-size:10px;color:var(--text3);font-weight:700;
            margin-bottom:7px;text-transform:uppercase;">Rent Estimate</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;
            gap:4px;font-size:11px;">
            <span style="color:var(--text3);">Base:</span>
            <span id="en-est-base" style="font-weight:700;">£0.00</span>
            <span style="color:var(--text3);">Days:</span>
            <span id="en-est-days">0</span>
            <span style="color:var(--text3);">Fees/Add-ons:</span>
            <span id="en-est-fees">£0.00</span>
          </div>
          <div style="border-top:1px solid var(--border);margin-top:8px;
            padding-top:7px;display:flex;justify-content:space-between;">
            <span style="font-weight:700;">TOTAL</span>
            <span id="en-est-total"
              style="font-size:15px;font-weight:900;color:var(--accent);">
              £0.00
            </span>
          </div>
          <div style="border-top:1px solid var(--border);margin-top:7px;
            padding-top:7px;font-size:11px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
              <span style="color:var(--text3);">Deposit Target:</span>
              <span id="en-dep-target">£0.00</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
              <span style="color:var(--text3);">Paid Now:</span>
              <span id="en-paid-now" style="color:var(--success);">£0.00</span>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span style="color:var(--text3);">Rent Pending:</span>
              <span id="en-pending" style="color:var(--warning);">£0.00</span>
            </div>
          </div>
        </div>

        <button class="btn btn-primary btn-full"
          onclick="generateENContract()">
          📄 Generate Contract (4 Pages)
        </button>
        <button class="btn btn-ghost btn-full mt-8"
          onclick="clearContractForm('en')">
          ✕ Clear Form
        </button>
      </div>

      <!-- RIGHT: Output -->
      <div>
        <div id="en-output" style="display:none;">
          <div style="display:flex;gap:7px;margin-bottom:11px;">
            <button class="btn btn-primary"
              onclick="printContractWindow('en-contract-pages')">
              🖨️ Print / Save PDF
            </button>
            <button class="btn btn-ghost"
              onclick="document.getElementById('en-output').style.display='none'">
              ✕ Close
            </button>
          </div>
          <div id="en-contract-pages"></div>
        </div>
        <div id="en-placeholder" class="empty-state"
          style="padding:80px 20px;">
          <div style="font-size:40px;margin-bottom:11px;">📄</div>
          <p>Fill the form and click Generate Contract</p>
        </div>
      </div>

    </div>`;

  populateFleetDropdowns();
};

// ============================================================
// EN CONTRACT CALCULATIONS
// ============================================================

window.enCalc = function() {
  const pickup  = document.getElementById('en-pickup')?.value;
  const dropoff = document.getElementById('en-dropoff')?.value;
  const daily   = parseFloat(document.getElementById('en-daily')?.value)    || 0;
  const insFee  = parseFloat(document.getElementById('en-ins-fee')?.value)  || 0;
  const kmCost  = parseFloat(document.getElementById('en-km-cost')?.value)  || 0;
  const delFee  = parseFloat(document.getElementById('en-del-fee')?.value)  || 0;
  const pickFee = parseFloat(document.getElementById('en-pick-fee')?.value) || 0;
  const addDr   = document.getElementById('en-add-driver')?.checked;
  const drRate  = parseFloat(document.getElementById('en-dr-rate')?.value)  || 250;
  const addSt   = document.getElementById('en-add-seat')?.checked;
  const stRate  = parseFloat(document.getElementById('en-seat-rate')?.value)|| 250;
  const pEGP    = parseFloat(document.getElementById('en-paid-egp')?.value) || 0;
  const pUSD    = parseFloat(document.getElementById('en-paid-usd')?.value) || 0;
  const pEUR    = parseFloat(document.getElementById('en-paid-eur')?.value) || 0;
  const pCard   = parseFloat(document.getElementById('en-paid-card')?.value)|| 0;
  const reqDep  = parseFloat(document.getElementById('en-req-dep')?.value)  || 0;

  let days = 0;
  if (pickup && dropoff) {
    days = Math.max(0, Math.ceil((new Date(dropoff) - new Date(pickup)) / 86400000));
  }

  const base     = daily * days;
  const insT     = insFee * days;
  const drT      = addDr ? drRate * days : 0;
  const stT      = addSt ? stRate * days : 0;
  const fees     = delFee + pickFee + kmCost + drT + stT + insT;
  const total    = base + fees;
  const paidNow  = pEGP + (pUSD * G.ratesUSD) + (pEUR * G.ratesEUR) + pCard;
  const pending  = total - paidNow;

  const s = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  s('en-est-base',  fmtMoney(base));
  s('en-est-days',  String(days));
  s('en-est-fees',  fmtMoney(fees));
  s('en-est-total', fmtMoney(total));
  s('en-dep-target',fmtMoney(reqDep));
  s('en-paid-now',  fmtMoney(paidNow));
  s('en-pending',   fmtMoney(Math.max(0, pending)));

  return { days, base, insT, kmCost, delFee, pickFee,
           drT, stT, fees, total, paidNow, pending,
           daily, insFee, drRate, stRate, addDr, addSt,
           pEGP, pUSD, pEUR, pCard, reqDep };
};

window.enTogglePrev = function() {
  const agr  = document.getElementById('en-agr')?.value;
  const wrap = document.getElementById('en-prev-wrap');
  if (wrap) wrap.style.display = agr === 'extension' ? 'flex' : 'none';
};

window.enSelectCar = function() {
  const carId = document.getElementById('en-car')?.value;
  showCarInfoBadge(carId, 'en-car-badge');
  if (carId) {
    const prefilled = prefillDailyRate(carId, 'en-daily');
    if (prefilled) toast(`Rate pre-filled: £${prefilled}/day`, 'info', 2000);
  }
  enCalc();
};

// ============================================================
// GENERATE EN CONTRACT
// ============================================================

window.generateENContract = async function() {
  const fname    = document.getElementById('en-fname')?.value.trim();
  const lname    = document.getElementById('en-lname')?.value.trim();
  const carId    = document.getElementById('en-car')?.value;
  const pickup   = document.getElementById('en-pickup')?.value;
  const dropoff  = document.getElementById('en-dropoff')?.value;
  const daily    = parseFloat(document.getElementById('en-daily')?.value) || 0;
  const passport = document.getElementById('en-passport')?.value.trim();

  if (!fname || !lname) { toast('Client name required. Search and select first.', 'error'); return; }
  if (!pickup || !dropoff) { toast('Dates required.', 'error'); return; }
  if (daily <= 0) { toast('Daily rent must be greater than 0.', 'error'); return; }

  const branchCode = document.getElementById('en-branch')?.value || G.user?.branch || 'GEN';
  const ref        = await generateDocRef('CN', branchCode);
  document.getElementById('en-ref-preview').textContent = ref;

  const car      = getCarById(carId);
  const carLabel = car ? getCarLabel(car, 'en') : (carId || '-');
  const plate    = car ? (car.plate || formatPlate(car)) : '';

  const calc = enCalc();
  const {
    days, base, insT, kmCost, delFee, pickFee,
    drT, stT, fees, total, paidNow, pending,
    daily: dly, insFee, drRate, stRate, addDr, addSt,
    pEGP, pUSD, pEUR, pCard, reqDep
  } = calc;

  const dEGP  = parseFloat(document.getElementById('en-dep-egp')?.value)  || 0;
  const dUSD  = parseFloat(document.getElementById('en-dep-usd')?.value)  || 0;
  const dEUR  = parseFloat(document.getElementById('en-dep-eur')?.value)  || 0;
  const dCard = parseFloat(document.getElementById('en-dep-card')?.value) || 0;
  const depHeld = dEGP + (dUSD * G.ratesUSD) + (dEUR * G.ratesEUR) + dCard;

  const insPkg  = document.getElementById('en-ins-pkg')?.value  || 'Basic';
  const kmPkg   = document.getElementById('en-km-pkg')?.value   || 'standard';
  const plocType= document.getElementById('en-ploc-type')?.value || 'Office';
  const plocAddr= document.getElementById('en-ploc-addr')?.value || '';
  const dlocType= document.getElementById('en-dloc-type')?.value || 'Office';
  const dlocAddr= document.getElementById('en-dloc-addr')?.value || '';
  const addDrName=document.getElementById('en-add-dr-name')?.value || '';
  const addDrLic= document.getElementById('en-add-dr-lic')?.value  || '';
  const prevCon = document.getElementById('en-prev-con')?.value    || '';
  const agr     = document.getElementById('en-agr')?.value         || 'new';
  const mode    = document.getElementById('en-mode')?.value        || 'Daily';
  const kmCostVal = parseFloat(document.getElementById('en-km-cost')?.value) || 0;

  // Build payment strings
  const rentParts = [];
  if (pEGP  > 0) rentParts.push(`${pEGP.toLocaleString()} Cash (EGP)`);
  if (pUSD  > 0) rentParts.push(`${pUSD} USD (×${G.ratesUSD.toFixed(2)})`);
  if (pEUR  > 0) rentParts.push(`${pEUR} EUR (×${G.ratesEUR.toFixed(2)})`);
  if (pCard > 0) rentParts.push(`${pCard.toLocaleString()} Card (EGP)`);
  const rentPayStr = rentParts.join(' + ');

  const depParts = [];
  if (dEGP  > 0) depParts.push(`${dEGP.toLocaleString()} EGP`);
  if (dUSD  > 0) depParts.push(`${dUSD} USD`);
  if (dEUR  > 0) depParts.push(`${dEUR} EUR`);
  if (dCard > 0) depParts.push(`${dCard.toLocaleString()} Card`);
  const depPayStr = depParts.join(' + ');

  // Save to Firestore
  try {
    await db.collection('bookings').doc(ref).set({
      'No.':                                ref,
      'اسم العميل':                          `${fname} ${lname}`,
      'اسم السيارة':                         carLabel,
      'كود السيارة':                         String(carId || ''),
      'بداية التعاقد':                       pickup,
      'نهاية التعاقد':                       dropoff,
      'سعر السيارة اليومي بالجنيه المصري':  fmtMoney(daily),
      'إجمالي المستحق (Total)':              fmtMoney(total),
      'المدفوع EGP':                        String(pEGP),
      'المدفوع USD':                        String(pUSD),
      'المدفوع EUR':                        String(pEUR),
      'الوديعة المعلقة لدينا':             fmtMoney(dEGP),
      'حالة الطلب':                         'Active',
      'closed':                              false,
      'فرع الإصدار':                        branchCode,
      'assigned_user':                       G.user?.username || '',
      'rental_days':                         String(days),
      'مكان الاستلام':                      `${plocType}${plocAddr ? ' - ' + plocAddr : ''}`,
      'مكان التسليم':                       `${dlocType}${dlocAddr ? ' - ' + dlocAddr : ''}`,
      'insurance_plan':                      insPkg,
      'km_package':                          kmPkg,
      'contract_generated':                  true,
      'contract_generated_at':              new Date().toISOString(),
      '_sys_updated':                        Date.now()
    });

    if (pEGP  > 0) await autoCreateReceipt(ref, ref, pEGP,  'EGP',  `${fname} ${lname}`, carLabel, branchCode);
    if (pUSD  > 0) await autoCreateReceipt(ref, ref, pUSD * G.ratesUSD,  'USD', `${fname} ${lname}`, carLabel, branchCode);
    if (pEUR  > 0) await autoCreateReceipt(ref, ref, pEUR * G.ratesEUR,  'EUR', `${fname} ${lname}`, carLabel, branchCode);
    if (pCard > 0) await autoCreateReceipt(ref, ref, pCard, 'Card', `${fname} ${lname}`, carLabel, branchCode);

    await logAction('GENERATE', 'English Contract',
      `Contract ${ref} for ${fname} ${lname} | ${carLabel} | ${fmtMoney(total)}`);

    toast(`✅ Contract ${ref} saved!`, 'success', 6000);

  } catch (e) {
    toast('Warning: Could not save to database. ' + e.message, 'warning');
  }

  // Build 4-page contract
  const contractData = {
    ref, branchCode, mode, agr, prevCon,
    fname, lname,
    passport,
    nationality: document.getElementById('en-nationality')?.value  || '',
    phone:       document.getElementById('en-phone')?.value        || '',
    email:       document.getElementById('en-email')?.value        || '',
    license:     document.getElementById('en-license')?.value      || '',
    address:     document.getElementById('en-address')?.value      || '',
    addDrName, addDrLic,
    carLabel, plate,
    carVin:   car?.chassis || car?.['رقم الشاسيه'] || '',
    carMotor: car?.['رقم الموتور'] || '',
    carYear:  car?.year || car?.['سنة الصنع'] || '',
    kmOut:    document.getElementById('en-km-out')?.value || '',
    fuelLevel: document.getElementById('en-fuel')?.value || 'Full (8/8)',
    pickup, dropoff, days, mode,
    plocType, plocAddr, dlocType, dlocAddr,
    daily, insFee, kmCostVal, delFee, pickFee,
    addDr, drRate, addSt, stRate,
    base, insT, drT, stT, fees, total,
    paidNow, pending,
    pEGP, pUSD, pEUR, pCard,
    dEGP, dUSD, dEUR, dCard, depHeld, reqDep,
    rentPayStr, depPayStr,
    insPkg, kmPkg
  };

  const pagesEl = document.getElementById('en-contract-pages');
  if (pagesEl) pagesEl.innerHTML = _buildENContractPages(contractData);

  document.getElementById('en-output').style.display = 'block';
  document.getElementById('en-placeholder').style.display = 'none';
};

// ============================================================
// BUILD 4-PAGE CONTRACT HTML
// ============================================================

function _buildENContractPages(d) {
  const logo   = 'https://brothersegy.com/wp-content/uploads/2026/02/12345.png';
  const carImg = 'https://brothersegy.com/wp-content/uploads/2026/02/car-template.png';
  const tireImg= 'https://brothersegy.com/wp-content/uploads/2026/02/wheel-tyre-illustration-png.png';
  const today  = new Date().toLocaleDateString('en-GB');

  const kmSel     = document.getElementById('en-km-pkg');
  const pkgKM     = kmSel
    ? parseInt(kmSel.options[kmSel.selectedIndex]?.getAttribute('data-km') || '0')
    : 0;
  const isUnlimited = pkgKM >= 999999;
  const kmAllowed   = isUnlimited
    ? 'Unlimited KM'
    : `${(120 * d.days + pkgKM).toLocaleString()} KM Total`;

  const pText = d.plocType + (d.plocAddr ? ` (${d.plocAddr})` : '');
  const dText = d.dlocType + (d.dlocAddr ? ` (${d.dlocAddr})` : '');
  const extHtml = d.agr === 'extension' && d.prevCon
    ? `<div style="font-size:10pt;font-weight:bold;margin-top:3px;">
        (EXTENSION TO ${d.prevCon})
       </div>` : '';

  const insClass = d.insPkg === 'Full Protection' ? 'ins-full' :
                   d.insPkg === 'Intermediate'    ? 'ins-inter' : 'ins-basic';
  const insClassColors = {
    'ins-basic': 'background:#ffebee;border:2px solid #c0392b;color:#c0392b;',
    'ins-inter': 'background:#fff3e0;border:2px solid #e67e22;color:#e67e22;',
    'ins-full':  'background:#e8f5e9;border:2px solid #27ae60;color:#27ae60;'
  };
  const insColor = insClassColors[insClass] || insClassColors['ins-basic'];

  const rateTxt = d.mode === 'Monthly'
    ? `${d.daily.toLocaleString()} × ${Math.ceil(d.days/30)} Mo`
    : `${d.daily.toLocaleString()} × ${d.days} Days`;
  const baseAmt = d.mode === 'Monthly'
    ? d.daily * Math.ceil(d.days/30)
    : d.base;

  // ---- PAGE 1: CONTRACT ----
  const page1 = `
    <div style="width:210mm;height:296mm;padding:10mm 15mm;background:white;
      color:#000;font-family:Arial,sans-serif;font-size:9.5pt;line-height:1.35;
      box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;
      box-shadow:0 0 20px rgba(0,0,0,0.15);position:relative;
      page-break-after:always;margin:0 auto 20px auto;">

      <!-- Watermark -->
      <div style="position:absolute;top:50%;left:50%;
        transform:translate(-50%,-50%);width:75%;opacity:0.05;
        z-index:0;pointer-events:none;">
        <img src="${logo}" style="width:100%;height:auto;">
      </div>

      <div style="position:relative;z-index:2;height:100%;
        display:flex;flex-direction:column;">

        <!-- Header -->
        <div style="display:flex;justify-content:space-between;
          align-items:flex-start;border-bottom:2px solid #04509D;
          padding-bottom:10px;margin-bottom:12px;">
          <img src="${logo}" style="width:180px;height:auto;object-fit:contain;">
          <div style="text-align:center;">
            <h1 style="margin:0;font-size:18pt;color:#04509D;">
              CAR RENTAL AGREEMENT
            </h1>
            <div style="font-weight:bold;font-size:12pt;">${d.ref}</div>
            ${extHtml}
          </div>
          <div style="font-size:8pt;color:#555;line-height:1.4;text-align:right;">
            <strong>BROTHERS EGY HQ</strong><br>
            50 Abd Al Latef Al Soufani, Sidi Gabir, Alexandria<br>
            Tax: 589-464-418 | CR: 10770<br>
            Branch: ${d.branchCode}
          </div>
        </div>

        <!-- Parties -->
        <div style="border:1px solid #000;padding:8px;margin-bottom:10px;
          position:relative;border-radius:4px;">
          <div style="background:#000;color:white;padding:1px 8px;
            font-weight:bold;font-size:8pt;position:absolute;
            top:-10px;left:8px;text-transform:uppercase;">PARTIES</div>
          <table style="width:100%;border-collapse:collapse;font-size:9pt;">
            <tr>
              <td style="border:1px solid #000;padding:4px;width:30%;
                background:#f9f9f9;">
                <strong>LESSOR</strong><br>
                El Alakhua El Mutahidun<br>
                ${d.branchCode} Branch
              </td>
              <td style="border:1px solid #000;padding:4px;">
                <strong>LESSEE</strong><br>
                <b>Name:</b> ${d.fname} ${d.lname}<br>
                <b>Passport/ID:</b> ${d.passport || '—'} |
                <b>License:</b> ${d.license || '—'} |
                <b>Nation:</b> ${d.nationality || '—'}<br>
                <b>Phone:</b> ${d.phone || '—'} |
                <b>Email:</b> ${d.email || '—'}<br>
                <b>Addr:</b> ${d.address || '—'}<br>
                ${d.addDrName
                  ? `<b>Add. Driver:</b> ${d.addDrName}
                     ${d.addDrLic ? '| <b>Lic:</b> ' + d.addDrLic : ''}`
                  : ''}
              </td>
            </tr>
          </table>
        </div>

        <!-- Vehicle & Period -->
        <div style="border:1px solid #000;padding:8px;margin-bottom:10px;
          position:relative;border-radius:4px;">
          <div style="background:#000;color:white;padding:1px 8px;
            font-weight:bold;font-size:8pt;position:absolute;
            top:-10px;left:8px;text-transform:uppercase;">
            VEHICLE & PERIOD
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:9pt;">
            <tr>
              <th style="border:1px solid #000;padding:4px;background:#f0f0f0;">Model</th>
              <td style="border:1px solid #000;padding:4px;">${d.carLabel}</td>
              <th style="border:1px solid #000;padding:4px;background:#f0f0f0;">Plate</th>
              <td style="border:1px solid #000;padding:4px;font-weight:bold;">
                ${d.plate || '—'}
              </td>
              <th style="border:1px solid #000;padding:4px;background:#f0f0f0;">KM Out</th>
              <td style="border:1px solid #000;padding:4px;">${d.kmOut || '—'}</td>
            </tr>
            <tr>
              <th style="border:1px solid #000;padding:4px;background:#f0f0f0;">VIN</th>
              <td style="border:1px solid #000;padding:4px;">${d.carVin || '—'}</td>
              <th style="border:1px solid #000;padding:4px;background:#f0f0f0;">Motor</th>
              <td style="border:1px solid #000;padding:4px;">${d.carMotor || '—'}</td>
              <th style="border:1px solid #000;padding:4px;background:#f0f0f0;">Allow</th>
              <td style="border:1px solid #000;padding:4px;font-weight:bold;">
                ${kmAllowed}
              </td>
            </tr>
            <tr>
              <th style="border:1px solid #000;padding:4px;background:#f0f0f0;">Pickup</th>
              <td style="border:1px solid #000;padding:4px;" colspan="2">
                ${d.pickup.replace('T', ' ')}<br>${pText}
              </td>
              <th style="border:1px solid #000;padding:4px;background:#f0f0f0;">Dropoff</th>
              <td style="border:1px solid #000;padding:4px;" colspan="2">
                ${d.dropoff.replace('T', ' ')}<br>${dText}
              </td>
            </tr>
          </table>
        </div>

        <!-- Financial Breakdown -->
        <div style="border:1px solid #000;padding:8px;margin-bottom:10px;
          position:relative;border-radius:4px;">
          <div style="background:#000;color:white;padding:1px 8px;
            font-weight:bold;font-size:8pt;position:absolute;
            top:-10px;left:8px;text-transform:uppercase;">
            FINANCIAL BREAKDOWN
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:9pt;">
            <thead>
              <tr>
                <th style="border:1px solid #000;padding:4px;background:#f0f0f0;">
                  Description
                </th>
                <th style="border:1px solid #000;padding:4px;background:#f0f0f0;">
                  Rate / Calculation
                </th>
                <th style="border:1px solid #000;padding:4px;background:#f0f0f0;
                  text-align:right;">Amount (EGP)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="border:1px solid #000;padding:4px;">Base Rent</td>
                <td style="border:1px solid #000;padding:4px;">${rateTxt}</td>
                <td style="border:1px solid #000;padding:4px;text-align:right;">
                  ${Math.round(baseAmt).toLocaleString()}
                </td>
              </tr>
              ${d.insT > 0 ? `
              <tr>
                <td style="border:1px solid #000;padding:4px;">Insurance Fees</td>
                <td style="border:1px solid #000;padding:4px;">
                  ${d.insFee} × ${d.days} Days
                </td>
                <td style="border:1px solid #000;padding:4px;text-align:right;">
                  ${Math.round(d.insT).toLocaleString()}
                </td>
              </tr>` : ''}
              ${d.kmCostVal > 0 ? `
              <tr>
                <td style="border:1px solid #000;padding:4px;">
                  Mileage Package (${d.kmPkg})
                </td>
                <td style="border:1px solid #000;padding:4px;">Package Fee</td>
                <td style="border:1px solid #000;padding:4px;text-align:right;">
                  ${d.kmCostVal.toLocaleString()}
                </td>
              </tr>` : ''}
              ${d.addDr ? `
              <tr>
                <td style="border:1px solid #000;padding:4px;">Additional Driver</td>
                <td style="border:1px solid #000;padding:4px;">
                  ${d.drRate} × ${d.days} Days
                </td>
                <td style="border:1px solid #000;padding:4px;text-align:right;">
                  ${Math.round(d.drT).toLocaleString()}
                </td>
              </tr>` : ''}
              ${d.addSt ? `
              <tr>
                <td style="border:1px solid #000;padding:4px;">Child Car Seat</td>
                <td style="border:1px solid #000;padding:4px;">
                  ${d.stRate} × ${d.days} Days
                </td>
                <td style="border:1px solid #000;padding:4px;text-align:right;">
                  ${Math.round(d.stT).toLocaleString()}
                </td>
              </tr>` : ''}
              ${d.delFee > 0 ? `
              <tr>
                <td style="border:1px solid #000;padding:4px;">
                  Delivery Fee (${pText})
                </td>
                <td style="border:1px solid #000;padding:4px;">Fixed</td>
                <td style="border:1px solid #000;padding:4px;text-align:right;">
                  ${d.delFee.toLocaleString()}
                </td>
              </tr>` : ''}
              ${d.pickFee > 0 ? `
              <tr>
                <td style="border:1px solid #000;padding:4px;">
                  Pickup Fee (${dText})
                </td>
                <td style="border:1px solid #000;padding:4px;">Fixed</td>
                <td style="border:1px solid #000;padding:4px;text-align:right;">
                  ${d.pickFee.toLocaleString()}
                </td>
              </tr>` : ''}
            </tbody>
            <tfoot>
              <tr style="font-weight:bold;border-top:2px solid #000;
                background:#f0f0f0;">
                <td colspan="2" style="border:1px solid #000;padding:4px;
                  text-align:right;">TOTAL CONTRACT VALUE:</td>
                <td style="border:1px solid #000;padding:4px;text-align:right;
                  font-size:11pt;color:#04509D;">
                  ${Math.round(d.total).toLocaleString()} EGP
                </td>
              </tr>
            </tfoot>
          </table>

          <!-- Insurance badge -->
          <div style="${insColor}padding:5px;text-align:center;
            font-size:9pt;margin-bottom:5px;border-radius:4px;margin-top:5px;">
            ${INS_SIMPLE[d.insPkg] || INS_SIMPLE['Basic']}
          </div>

          <!-- Payment summary -->
          <div style="background:#eee;padding:5px;text-align:center;
            font-size:9pt;">
            PAID NOW: <strong>${Math.round(d.paidNow).toLocaleString()} EGP</strong>
            ${d.rentPayStr ? `<span style="font-size:8pt;"> (${d.rentPayStr})</span>` : ''}
            <br>
            <span style="color:${d.pending > 0 ? '#c0392b' : '#27ae60'};
              font-weight:bold;">
              PENDING: ${Math.max(0, Math.round(d.pending)).toLocaleString()} EGP
            </span>
          </div>
        </div>

        ${d.reqDep > 0 || d.depHeld > 0 ? `
        <div style="border:2px solid orange;padding:5px;margin-bottom:10px;
          font-size:9pt;border-radius:4px;">
          <strong>DEPOSIT HELD:</strong>
          <strong>${Math.round(d.depHeld).toLocaleString()} EGP</strong>
          ${d.depPayStr ? `<span style="font-size:8pt;"> (${d.depPayStr})</span>` : ''}
        </div>` : ''}

        <!-- Disclaimer -->
        <div style="text-align:center;border:2px dashed #000;padding:8px;
          font-size:8.5pt;border-radius:4px;">
          <strong>IMPORTANT:</strong>
          Contract is void for any period NOT covered by an official payment receipt.<br>
          <strong>LIABILITY:</strong> The Lessee bears full legal and criminal liability
          for the rented vehicle during the entire rental period.
        </div>

        <!-- Signatures -->
        <div style="margin-top:auto;border-top:2px solid #000;padding-top:10px;">
          <div style="display:flex;justify-content:space-between;
            text-align:center;font-weight:bold;font-size:10pt;">
            <div style="width:40%;">
              LESSOR SIGNATURE<br><br><br>
              ____________________
              <div style="font-size:9pt;margin-top:5px;">Date: ................</div>
            </div>
            <div style="width:40%;">
              LESSEE SIGNATURE<br><br><br>
              ____________________
              <div style="font-size:9pt;margin-top:5px;">Date: ................</div>
            </div>
          </div>
        </div>

      </div>
    </div>`;

  // ---- PAGE 2: TERMS ----
  const insContent = INS_DETAILS[d.insPkg] || INS_DETAILS['Basic'];

  const page2 = `
    <div style="width:210mm;height:296mm;padding:10mm 15mm;background:white;
      color:#000;font-family:Arial,sans-serif;font-size:9pt;line-height:1.35;
      box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;
      box-shadow:0 0 20px rgba(0,0,0,0.15);position:relative;
      page-break-after:always;margin:0 auto 20px auto;">

      <div style="position:absolute;top:50%;left:50%;
        transform:translate(-50%,-50%);width:75%;opacity:0.05;
        z-index:0;pointer-events:none;">
        <img src="${logo}" style="width:100%;height:auto;">
      </div>

      <div style="position:relative;z-index:2;height:100%;
        display:flex;flex-direction:column;">

        <div style="display:flex;justify-content:space-between;
          align-items:center;border-bottom:1px solid #04509D;
          padding-bottom:6px;margin-bottom:10px;">
          <strong style="font-size:13pt;color:#04509D;">
            TERMS & CONDITIONS
          </strong>
          <span style="font-size:9pt;color:#555;">
            Contract: ${d.ref} | Page 2/4
          </span>
        </div>

        <div style="font-size:8.5pt;text-align:justify;column-count:2;
          column-gap:25px;line-height:1.3;flex-grow:1;">

          ${_termBlock('1. DRIVER REQUIREMENTS & ELIGIBILITY', TERMS_TEXT[1])}
          ${_termBlock('2. RENTAL CYCLE & EXTENSIONS',        TERMS_TEXT[2])}
          ${_termBlock('3. CANCELLATION & NO-SHOW POLICY',    TERMS_TEXT[3])}
          ${_termBlock('4. DELIVERY & MILEAGE',               TERMS_TEXT[4])}

          <div style="border:2px solid #e67e22;padding:5px;
            background:#fff8e1;break-inside:avoid;margin-bottom:10px;">
            <strong style="display:block;font-size:9pt;color:#e67e22;
              text-transform:uppercase;border-bottom:1px solid #e67e22;
              padding-bottom:2px;margin-bottom:4px;">
              5. YOUR INSURANCE: ${d.insPkg.toUpperCase()}
            </strong>
            <div style="font-size:8pt;line-height:1.3;">${insContent}</div>
          </div>

          ${_termBlock('6. THEFT & LOSS WAIVER',              TERMS_TEXT[6])}
          ${_termBlock('7. VOIDING OF INSURANCE',             TERMS_TEXT[7])}
          ${_termBlock('8. SCHEDULE OF PENALTIES',            TERMS_TEXT[8])}
          ${_termBlock('9. SECURITY DEPOSIT & REFUNDS',       TERMS_TEXT[9])}
          ${_termBlock('10. DISPUTE RESOLUTION',              TERMS_TEXT[10])}
          ${_termBlock('11. TRAFFIC FINES',                   TERMS_TEXT[11])}
          ${_termBlock('12. MECHANICAL DIFFICULTIES',         TERMS_TEXT[12])}
          ${_termBlock('13. INSURANCE & LIABILITY NOTICES',   TERMS_TEXT[13])}
        </div>

        <div style="margin-top:auto;padding:10px;border-top:1px solid #000;
          font-weight:bold;text-align:center;">
          <strong>I have read and accepted all terms & conditions.</strong>
          <br><br>
          <div style="display:flex;justify-content:center;gap:50px;
            align-items:flex-end;margin-top:5px;">
            <div>Signature: ______________________________</div>
            <div style="font-size:9pt;">Date: ................</div>
          </div>
        </div>

      </div>
    </div>`;

  // ---- PAGE 3: INSPECTION ----
  const chkRow = lbl => `
    <div style="display:flex;align-items:center;justify-content:space-between;
      margin-bottom:3px;font-size:7pt;border-bottom:1px dotted #ccc;
      padding-bottom:2px;">
      <span style="font-weight:bold;font-size:6.5pt;text-transform:uppercase;
        flex-grow:1;">${lbl}</span>
      <div style="display:flex;gap:3px;">
        <div style="width:12px;height:12px;border:1.5px solid #27ae60;
          display:inline-block;background:#e8f8f5;"></div>
        <div style="width:12px;height:12px;border:1.5px solid #c0392b;
          display:inline-block;background:#fdedec;"></div>
      </div>
    </div>`;

  const checklistHtml = `
    <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:5px;">
      <div style="width:48%;">
        <div style="background:#000;color:#fff;font-weight:bold;font-size:7.5pt;
          padding:2px 4px;margin-bottom:3px;text-transform:uppercase;">
          PASSENGER SIDE
        </div>
        ${chkRow('(D) Front Fender')}
        ${chkRow('(L) Front Door')}
        ${chkRow('(K) Rear Door')}
        ${chkRow('(J) Rear Fender')}
      </div>
      <div style="width:48%;">
        <div style="background:#000;color:#fff;font-weight:bold;font-size:7.5pt;
          padding:2px 4px;margin-bottom:3px;text-transform:uppercase;">FRONT</div>
        ${chkRow('(E) Bumper')}
        ${chkRow('(F) Hood')}
        ${chkRow('(W) Windshield')}
      </div>
      <div style="width:48%;">
        <div style="background:#000;color:#fff;font-weight:bold;font-size:7.5pt;
          padding:2px 4px;margin-bottom:3px;text-transform:uppercase;">REAR</div>
        ${chkRow('(Q) Trunk')}
        ${chkRow('(H) Rear Bumper')}
        ${chkRow('(I) Rear Lights')}
      </div>
      <div style="width:48%;">
        <div style="background:#000;color:#fff;font-weight:bold;font-size:7.5pt;
          padding:2px 4px;margin-bottom:3px;text-transform:uppercase;">
          DRIVER SIDE
        </div>
        ${chkRow('(M) Front Fender')}
        ${chkRow('(C) Front Door')}
        ${chkRow('(B) Rear Door')}
        ${chkRow('(A) Rear Fender')}
      </div>
    </div>`;

  const pickupInsp = `
    <div style="width:50%;border-right:1px dashed #000;padding-right:10px;
      display:flex;flex-direction:column;">
      <div style="background:#eee;font-weight:bold;padding:5px;
        text-align:center;font-size:9pt;border-bottom:1px solid #000;
        margin-bottom:5px;text-transform:uppercase;">
        PICKUP CHECK (Start of Rental)
      </div>
      <table style="width:100%;border-collapse:collapse;
        font-size:7pt;margin-bottom:5px;">
        <tr style="background:#eee;">
          <th style="border:1px solid #000;padding:3px;">KM OUT</th>
          <td style="border:1px solid #000;padding:3px;text-align:center;">
            ${d.kmOut || '—'}
          </td>
        </tr>
        <tr style="background:#eee;">
          <th style="border:1px solid #000;padding:3px;">FUEL LEVEL</th>
          <td style="border:1px solid #000;padding:3px;text-align:center;">
            ${d.fuelLevel}
          </td>
        </tr>
      </table>
      <div style="text-align:center;font-size:7pt;font-weight:bold;
        margin-bottom:3px;">EXISTING DAMAGES:</div>
      <div style="width:100%;aspect-ratio:960/618;display:flex;
        align-items:center;justify-content:center;margin-bottom:2px;">
        <img src="${carImg}"
          style="width:100%;height:100%;object-fit:contain;">
      </div>
      <div style="display:flex;align-items:center;gap:5px;
        justify-content:center;margin-top:2px;">
        <img src="${tireImg}" style="height:40px;object-fit:contain;">
        <div style="font-size:7pt;"><strong>TIRE:</strong> _______________</div>
      </div>
      ${checklistHtml}
      <div style="margin-top:5px;border:1px solid #ccc;padding:3px;
        min-height:35px;font-size:7pt;">
        <strong>ACCESSORIES:</strong>
        Spare Tire [ ] Jack [ ] Fire Ext [ ] Triangle [ ]
      </div>
    </div>`;

  const returnInsp = `
    <div style="width:50%;padding-left:10px;display:flex;flex-direction:column;">
      <div style="background:#eee;font-weight:bold;padding:5px;
        text-align:center;font-size:9pt;border-bottom:1px solid #000;
        margin-bottom:5px;text-transform:uppercase;">
        RETURN CHECK (End of Rental)
      </div>
      <table style="width:100%;border-collapse:collapse;
        font-size:7pt;margin-bottom:5px;">
        <tr style="background:#eee;">
          <th style="border:1px solid #000;padding:3px;">
            KM IN (${kmAllowed} Max)
          </th>
          <td style="border:1px solid #000;padding:3px;">
            ____________________
          </td>
        </tr>
        <tr style="background:#eee;">
          <th style="border:1px solid #000;padding:3px;">FUEL LEVEL</th>
          <td style="border:1px solid #000;padding:3px;font-size:7pt;">
            [ ] Full [ ] 3/4 [ ] 1/2 [ ] 1/4 [ ] Empty
          </td>
        </tr>
      </table>
      <div style="text-align:center;font-size:7pt;font-weight:bold;
        margin-bottom:3px;">MARK NEW DAMAGES:</div>
      <div style="width:100%;aspect-ratio:960/618;display:flex;
        align-items:center;justify-content:center;margin-bottom:2px;">
        <img src="${carImg}"
          style="width:100%;height:100%;object-fit:contain;">
      </div>
      <div style="display:flex;align-items:center;gap:5px;
        justify-content:center;margin-top:2px;">
        <img src="${tireImg}" style="height:40px;object-fit:contain;">
        <div style="font-size:7pt;"><strong>TIRE:</strong> _______________</div>
      </div>
      ${checklistHtml}
      <div style="border:1px solid #000;margin-top:5px;padding:3px;">
        <div style="background:#000;color:#fff;font-weight:bold;
          font-size:7.5pt;padding:2px 4px;margin-bottom:3px;">
          FINAL SETTLEMENT
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:8pt;">
          <tr>
            <th style="border:1px solid #000;padding:3px;">Item</th>
            <th style="border:1px solid #000;padding:3px;">Rate × Qty</th>
            <th style="border:1px solid #000;padding:3px;">Total EGP</th>
          </tr>
          ${['Excess KM','Late Return','Cleaning Fees','Fuel Shortage',
             'Traffic Fines','New Damages'].map(item => `
            <tr>
              <td style="border:1px solid #000;padding:3px;">${item}</td>
              <td style="border:1px solid #000;padding:3px;text-align:center;">
                _____ × _____
              </td>
              <td style="border:1px solid #000;padding:3px;text-align:right;">
                ___________
              </td>
            </tr>`).join('')}
          <tr style="font-weight:bold;background:#f0f0f0;">
            <td colspan="2" style="border:1px solid #000;padding:3px;
              text-align:right;">TOTAL DEDUCTIONS:</td>
            <td style="border:1px solid #000;padding:3px;text-align:right;">
              _________ EGP
            </td>
          </tr>
        </table>
      </div>
      <div style="font-size:7.5pt;font-weight:bold;margin-top:5px;
        border:1px solid #000;padding:3px;background:#fff3e0;">
        If RETURN CHECK is not signed, Lessee retains full liability.
      </div>
    </div>`;

  const page3 = `
    <div style="width:210mm;height:296mm;padding:10mm 15mm;background:white;
      color:#000;font-family:Arial,sans-serif;font-size:9pt;line-height:1.35;
      box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;
      box-shadow:0 0 20px rgba(0,0,0,0.15);position:relative;
      page-break-after:always;margin:0 auto 20px auto;">

      <div style="position:absolute;top:50%;left:50%;
        transform:translate(-50%,-50%);width:75%;opacity:0.05;
        z-index:0;pointer-events:none;">
        <img src="${logo}" style="width:100%;height:auto;">
      </div>

      <div style="position:relative;z-index:2;height:100%;
        display:flex;flex-direction:column;">

        <div style="display:flex;justify-content:space-between;
          align-items:center;border-bottom:1px solid #04509D;
          padding-bottom:6px;margin-bottom:8px;">
          <strong style="font-size:13pt;color:#04509D;">
            VISUAL INSPECTION REPORT
          </strong>
          <span style="font-size:9pt;color:#555;">
            Contract: ${d.ref} | Date: ${today} | Page 3/4
          </span>
        </div>

        <div style="display:flex;width:100%;gap:0;flex:1;">
          ${pickupInsp}
          ${returnInsp}
        </div>

        <div style="margin-top:auto;border-top:2px solid #000;
          padding-top:10px;">
          <div style="display:flex;justify-content:space-between;
            text-align:center;font-weight:bold;font-size:10pt;">
            <div style="width:30%;">
              PICKUP — Lessee<br><br><br>
              ____________________
              <div style="font-size:8pt;margin-top:5px;">Date: .............</div>
            </div>
            <div style="width:30%;">
              RETURN — Lessee<br><br><br>
              ____________________
              <div style="font-size:8pt;margin-top:5px;">Date: .............</div>
            </div>
            <div style="width:30%;">
              RETURN — Employee<br><br><br>
              ____________________
            </div>
          </div>
        </div>

      </div>
    </div>`;

  // ---- PAGE 4: RECEIPTS ----
  // Build dynamic receipt pages (supports monthly loop)
  let receiptPages = '';
  const pickupDate   = new Date(d.pickup);
  const dropoffDate  = new Date(d.dropoff);
  const loopCount    = d.mode === 'Monthly' ? Math.max(1, Math.ceil(d.days / 30)) : 1;
  const monthlyAmt   = loopCount > 0 ? Math.round(d.total / loopCount) : d.total;
  let   segmentStart = new Date(pickupDate);

  for (let j = 1; j <= loopCount; j++) {
    let segmentEnd = new Date(segmentStart);
    if (d.mode === 'Monthly') {
      segmentEnd.setMonth(segmentEnd.getMonth() + 1);
      if (segmentEnd > dropoffDate) segmentEnd = new Date(dropoffDate);
    } else {
      segmentEnd = new Date(dropoffDate);
    }

    const isFirst   = j === 1;
    const isBlank   = !isFirst;
    const amtNum    = isFirst ? Math.round(d.paidNow) : monthlyAmt;
    const amtStr    = isBlank
      ? '_______________ EGP'
      : `${amtNum.toLocaleString()} EGP`;
    const detStr    = isBlank
      ? '______________________________'
      : d.rentPayStr || `${amtNum.toLocaleString()} EGP`;
    const periodStr = `${segmentStart.toLocaleDateString('en-GB')} → ${segmentEnd.toLocaleDateString('en-GB')}`;
    const title     = d.mode === 'Monthly'
      ? `RENTAL PAYMENT (Month ${j})`
      : 'RENTAL PAYMENT';

    receiptPages += _buildReceiptPageHTML(
      logo, d.ref, d.fname + ' ' + d.lname,
      d.passport || '—', d.phone || '—',
      d.carLabel + (d.plate ? ' | ' + d.plate : ''),
      title, amtStr, detStr, periodStr, false,
      d.pending, j, isBlank, today
    );

    segmentStart = new Date(segmentEnd);
  }

  // Deposit receipt page (if applicable)
  if (d.reqDep > 0 || d.depHeld > 0) {
    const depAmt = Math.round(d.depHeld > 0 ? d.depHeld : d.reqDep);
    receiptPages += _buildReceiptPageHTML(
      logo, d.ref, d.fname + ' ' + d.lname,
      d.passport || '—', d.phone || '—',
      d.carLabel + (d.plate ? ' | ' + d.plate : ''),
      'SECURITY DEPOSIT',
      d.depHeld > 0 ? `${depAmt.toLocaleString()} EGP` : '_______________ EGP',
      d.depPayStr || '______________________________',
      '', true, 0, 1, d.depHeld <= 0, today
    );
  }

  return page1 + page2 + page3 + receiptPages;
}

function _termBlock(title, content) {
  return `
    <div style="margin-bottom:10px;break-inside:avoid;">
      <strong style="display:block;font-size:8.5pt;
        text-transform:uppercase;border-bottom:1px solid #999;
        padding-bottom:2px;margin-bottom:3px;color:#04509D;">
        ${title}
      </strong>
      <div style="font-size:7.5pt;line-height:1.3;">${content}</div>
    </div>`;
}

function _buildReceiptPageHTML(
  logo, contractNo, clientName, passport, phone,
  carStr, title, amtStr, detStr, periodStr,
  isDeposit, pending, monthNum, isBlank, today
) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=https://brothersegy.com&size=80x80`;

  const singleRec = copyType => `
    <div style="height:48%;border:2px solid #000;padding:15px;
      display:flex;flex-direction:column;box-sizing:border-box;">
      <div style="display:flex;justify-content:space-between;
        align-items:flex-start;border-bottom:2px solid #000;
        padding-bottom:10px;margin-bottom:15px;">
        <img src="${logo}" style="height:45px;object-fit:contain;">
        <div style="text-align:center;flex:1;">
          <div style="font-size:16pt;font-weight:bold;color:#04509D;
            text-transform:uppercase;">OFFICIAL RECEIPT</div>
          <div style="font-size:9pt;">${copyType}</div>
        </div>
        <div style="text-align:right;">
          <img src="${qrUrl}" style="height:45px;"><br>
          <div style="font-size:8pt;font-weight:bold;margin-top:3px;">
            DATE: ${isBlank ? '___/___/202_' : today}
          </div>
          <div style="font-weight:bold;font-size:9pt;">${title}</div>
        </div>
      </div>

      <div style="display:flex;gap:20px;font-size:9pt;line-height:1.6;
        border-bottom:1px dashed #ccc;padding-bottom:10px;margin-bottom:10px;">
        <div style="flex:1;">
          <div style="display:flex;justify-content:space-between;
            border-bottom:1px dotted #eee;">
            <span style="font-weight:bold;font-size:8.5pt;">RECEIVED FROM</span>
            <span style="font-weight:bold;">${clientName}</span>
          </div>
          <div style="display:flex;justify-content:space-between;
            border-bottom:1px dotted #eee;">
            <span style="font-weight:bold;font-size:8.5pt;">PASSPORT / ID</span>
            <span>${passport}</span>
          </div>
          <div style="display:flex;justify-content:space-between;
            border-bottom:1px dotted #eee;">
            <span style="font-weight:bold;font-size:8.5pt;">PHONE</span>
            <span>${phone}</span>
          </div>
        </div>
        <div style="flex:1;">
          <div style="display:flex;justify-content:space-between;
            border-bottom:1px dotted #eee;">
            <span style="font-weight:bold;font-size:8.5pt;">CONTRACT NO</span>
            <span style="font-weight:bold;">${contractNo}</span>
          </div>
          <div style="display:flex;justify-content:space-between;
            border-bottom:1px dotted #eee;">
            <span style="font-weight:bold;font-size:8.5pt;">VEHICLE</span>
            <span style="font-size:8pt;">${carStr}</span>
          </div>
          ${!isDeposit && periodStr ? `
          <div style="display:flex;justify-content:space-between;
            border-bottom:1px dotted #eee;">
            <span style="font-weight:bold;font-size:8.5pt;">PERIOD</span>
            <span style="font-size:8pt;">${periodStr}</span>
          </div>` : ''}
        </div>
      </div>

      <div style="border:1px solid #ccc;background:#fbfbfb;
        padding:10px 15px;margin-bottom:5px;">
        <div style="display:flex;justify-content:space-between;
          align-items:center;margin-bottom:5px;">
          <span style="font-weight:bold;font-size:10pt;
            text-transform:uppercase;color:#555;">AMOUNT RECEIVED</span>
          <span style="font-size:18pt;font-weight:bold;">${amtStr}</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="font-weight:bold;font-size:8pt;
            text-transform:uppercase;color:#555;">PAYMENT DETAILS</span>
          <span style="font-size:8pt;">${detStr}</span>
        </div>
      </div>

      <div style="font-size:7pt;color:#666;margin-top:5px;">
        ${isDeposit
          ? '<strong style="color:#c0392b;">* Fully refundable if returned in same condition.</strong>'
          : (pending > 0 && !isBlank
              ? `<span style="color:#c0392b;font-weight:bold;">
                  ⚠ OUTSTANDING BALANCE: ${Math.round(pending).toLocaleString()} EGP
                 </span>`
              : '')}
      </div>

      <div style="margin-top:auto;display:flex;
        justify-content:flex-end;padding-top:10px;">
        <div style="text-align:center;border-top:1px solid #000;
          width:200px;padding-top:5px;font-size:9pt;font-weight:bold;">
          AUTHORIZED SIGNATURE
          <div style="font-size:8pt;margin-top:2px;">Date: .............</div>
        </div>
      </div>
    </div>`;

  return `
    <div style="width:210mm;height:296mm;padding:10mm 15mm;background:white;
      color:#000;font-family:Arial,sans-serif;font-size:9pt;line-height:1.35;
      box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;
      box-shadow:0 0 20px rgba(0,0,0,0.15);
      page-break-after:always;margin:0 auto 20px auto;">
      ${singleRec('CLIENT COPY')}
      <div style="text-align:center;border-top:1px dashed #999;color:#999;
        padding:8px 0;font-size:8pt;">- - - - - DETACH HERE - - - - -</div>
      ${singleRec('COMPANY COPY')}
    </div>`;
}

// ============================================================
// PRINT CONTRACT
// ============================================================

window.printContractWindow = function(containerId) {
  const content = document.getElementById(containerId)?.innerHTML;
  if (!content) { toast('Generate the contract first', 'warning'); return; }

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="UTF-8">
    <title>Brothers EGY - Contract</title>
    <style>
      body { font-family:Arial,sans-serif; margin:0; padding:0; background:white; }
      @page { size:A4; margin:0; }
      @media print {
        body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
        .no-print { display:none !important; }
      }
      .print-btn {
        position:fixed; top:10px; right:10px;
        background:#04509D; color:white; border:none;
        padding:10px 20px; border-radius:6px;
        cursor:pointer; font-weight:bold; z-index:999;
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
// PROPOSAL REF LOOKUP (for loading proposal into contract)
// ============================================================

window.searchProposalRef = function(prefix) {
  const val   = (document.getElementById(`${prefix}-proposal-ref`)?.value || '').trim();
  const stEl  = document.getElementById(`${prefix}-proposal-status`);
  if (!val || val.length < 4) { if (stEl) stEl.textContent = ''; return; }

  const p = G.proposals.find(x =>
    (x.proposal_ref || x.id).toLowerCase().includes(val.toLowerCase())
  );

  if (stEl) {
    if (p) {
      stEl.textContent = `✅ Found: ${p.proposal_ref || p.id} | ${p.client_name} | ${fmtMoney(p.total_estimate)} | ${p.status}`;
      stEl.style.color = 'var(--success)';
      if (p.status === 'Accepted' || p.status === 'Draft') {
        fillContractFromProposal(prefix, p);
      }
    } else {
      stEl.textContent = 'No proposal found with this reference.';
      stEl.style.color = 'var(--danger)';
    }
  }
};

window.fillContractFromProposal = function(prefix, p) {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  };

  set(`${prefix}-pickup`,  p.pickup_date  || '');
  set(`${prefix}-dropoff`, p.dropoff_date || '');
  set(`${prefix}-daily`,   String(p.daily_rate  || 0));
  set(`${prefix}-ins-fee`, String(p.insurance_fee || 0));
  set(`${prefix}-km-cost`, String(p.km_cost || 0));
  set(`${prefix}-pick-fee`,String(p.pickup_fee || 0));
  set(`${prefix}-req-dep`, String(p.deposit_amount || 0));

  const kmEl  = document.getElementById(`${prefix}-km-pkg`);
  if (kmEl) kmEl.value = p.km_package || 'standard';

  const insEl = document.getElementById(`${prefix}-ins-pkg`);
  if (insEl) insEl.value = p.insurance_plan || 'Basic';

  const carSel = document.getElementById(`${prefix}-car`);
  if (carSel && p.car_id) {
    carSel.value = p.car_id;
    showCarInfoBadge(p.car_id, `${prefix}-car-badge`);
  }

  // Fill client if CRM ID available
  if (p.client_crm_id) {
    const c = G.customers.find(x => x.id === p.client_crm_id);
    if (c && typeof fillCrmFields === 'function') fillCrmFields(prefix, c.id);
  } else if (p.client_name) {
    const parts = p.client_name.split(' ');
    set(`${prefix}-fname`, parts[0] || '');
    set(`${prefix}-lname`, parts.slice(1).join(' ') || '');
    set(`${prefix}-phone`, p.client_phone || '');
    set(`${prefix}-email`, p.client_email || '');
    // Make editable since no CRM record
    ['fname','lname','phone','email'].forEach(f => {
      const el = document.getElementById(`${prefix}-${f}`);
      if (el) el.readOnly = false;
    });
  }

  const stEl = document.getElementById(`${prefix}-proposal-status`);
  if (stEl) {
    stEl.textContent = `✅ Loaded: ${p.proposal_ref || p.id} | ${p.client_name} | ${fmtMoney(p.total_estimate)}`;
    stEl.style.color = 'var(--success)';
  }

  if (prefix === 'en') enCalc();
  else                 arCalc();

  updateProposalStatus(p.id, 'Accepted').catch(() => {});
  toast(`Proposal ${p.proposal_ref || p.id} loaded into contract form!`, 'success');
};

// ============================================================
// CLEAR CONTRACT FORM
// ============================================================

window.clearContractForm = function(prefix) {
  const fields = [
    'fname','lname','phone','email','passport','nationality',
    'license','address','add-dr-name','add-dr-lic',
    'pickup','dropoff','km-out','client-search','proposal-ref'
  ];
  fields.forEach(f => {
    const el = document.getElementById(`${prefix}-${f}`);
    if (el) el.value = '';
  });

  const zeros = [
    'paid-egp','paid-usd','paid-eur','paid-card',
    'dep-egp','dep-usd','dep-eur','dep-card',
    'ins-fee','km-cost','del-fee','pick-fee','req-dep'
  ];
  zeros.forEach(f => {
    const el = document.getElementById(`${prefix}-${f}`);
    if (el) el.value = '0';
  });

  const carEl = document.getElementById(`${prefix}-car`);
  if (carEl) carEl.value = '';

  const badge = document.getElementById(`${prefix}-car-badge`);
  if (badge) badge.className = 'car-info-badge';

  const crmId = document.getElementById(`${prefix}-crm-id`);
  if (crmId) crmId.style.display = 'none';

  const editBtn = document.getElementById(`${prefix}-edit-btn`);
  if (editBtn) editBtn.style.display = 'none';

  window[`_crm_${prefix}_id`] = null;

  const outEl = document.getElementById(`${prefix}-output`);
  if (outEl) outEl.style.display = 'none';

  const phEl = document.getElementById(`${prefix}-placeholder`);
  if (phEl) phEl.style.display = 'block';

  const refPrev = document.getElementById(`${prefix}-ref-preview`);
  if (refPrev) refPrev.textContent = '';

  const stEl = document.getElementById(`${prefix}-proposal-status`);
  if (stEl) stEl.textContent = '';

  if (prefix === 'en') enCalc();
  else                 arCalc();
};

// ============================================================
// AR CONTRACT PAGE
// ============================================================

window.loadARContract = async function() {
  const wrap = document.getElementById('page-ar-contract');
  if (!wrap) return;

  wrap.innerHTML = `
    <div style="display:grid;grid-template-columns:420px 1fr;
      gap:18px;align-items:start;">

      <!-- LEFT: Form Panel (RTL) -->
      <div class="panel sticky-panel"
        style="max-height:calc(100vh - 120px);overflow-y:auto;direction:rtl;">

        <div style="display:flex;align-items:center;
          justify-content:space-between;margin-bottom:13px;">
          <h3 style="font-size:13px;font-weight:800;">📝 عقد جديد</h3>
          <span id="ar-ref-preview"
            style="font-size:10px;color:var(--accent);font-weight:700;"></span>
        </div>

        <!-- Section 1: Branch -->
        <div style="margin-bottom:13px;">
          <div style="font-size:10px;font-weight:800;color:var(--accent);
            text-transform:uppercase;margin-bottom:8px;padding-bottom:5px;
            border-bottom:1px solid var(--border);">① الفرع ونظام الإيجار</div>
          <div class="form-grid">
            <div class="field">
              <label>فرع الإصدار</label>
              <select id="ar-branch">
                <option value="HRG">فرع الغردقة</option>
                <option value="ALX">الإسكندرية (المركز الرئيسي)</option>
                <option value="CAI">فرع القاهرة</option>
                <option value="RSH">فرع رشيد</option>
              </select>
            </div>
            <div class="field">
              <label>نظام الإيجار</label>
              <select id="ar-mode" onchange="arCalc()">
                <option value="Daily">يومي (قصير الأمد)</option>
                <option value="Monthly">شهري (طويل الأمد)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Section 2: Vehicle -->
        <div style="margin-bottom:13px;">
          <div style="font-size:10px;font-weight:800;color:var(--accent);
            text-transform:uppercase;margin-bottom:8px;padding-bottom:5px;
            border-bottom:1px solid var(--border);">② تفاصيل المركبة</div>
          <div class="field" style="margin-bottom:7px;">
            <label>اختر من الأسطول</label>
            <select id="ar-car" onchange="arSelectCar()">
              <option value="">-- اختر السيارة --</option>
            </select>
          </div>
          <div id="ar-car-badge" class="car-info-badge"></div>
          <div class="form-grid" style="margin-top:7px;">
            <div class="field">
              <label>عداد الخروج</label>
              <input type="number" id="ar-km-out" placeholder="مثال 52747"/>
            </div>
            <div class="field">
              <label>مستوى الوقود</label>
              <select id="ar-fuel">
                <option value="ممتلئ (8/8)">ممتلئ (8/8)</option>
                <option value="3/4">3/4</option>
                <option value="1/2">1/2</option>
                <option value="1/4">1/4</option>
                <option value="احتياطي">احتياطي</option>
              </select>
            </div>
            <div class="field">
              <label>الإيجار اليومي (ج.م)</label>
              <input type="number" id="ar-daily"
                placeholder="0" oninput="arCalc()"/>
            </div>
            <div class="field">
              <label>رسوم التأمين (يومي)</label>
              <input type="number" id="ar-ins-fee"
                value="0" oninput="arCalc()"/>
            </div>
          </div>
        </div>

        <!-- Section 3: Client -->
        <div style="margin-bottom:13px;">
          <div style="font-size:10px;font-weight:800;color:var(--accent);
            text-transform:uppercase;margin-bottom:8px;padding-bottom:5px;
            border-bottom:1px solid var(--border);">③ بيانات العميل</div>
          <div class="crm-search-wrap">
            <div class="crm-search-header">
              🔍 بحث وتعبئة تلقائية للعميل
              <span id="ar-crm-id" style="display:none;"></span>
            </div>
            <div class="crm-input-row">
              <input type="text" id="ar-client-search"
                placeholder="الاسم، جواز السفر، الهاتف..."
                oninput="crmSearch('ar')"/>
            </div>
            <div class="crm-actions">
              <button class="crm-action-btn new"
                onclick="openAddCustomerModal()">+ جديد</button>
              <button class="crm-action-btn edit" id="ar-edit-btn"
                style="display:none;" onclick="crmEditMode('ar')">✏️ تعديل</button>
              <button class="crm-action-btn save" id="ar-save-btn"
                style="display:none;" onclick="crmSaveEdit('ar')">💾 حفظ</button>
              <button class="crm-action-btn cancel" id="ar-cancel-btn"
                style="display:none;" onclick="crmCancelEdit('ar')">✕</button>
            </div>
            <div class="crm-suggestions" id="ar-suggestions"></div>
          </div>
          <div class="form-grid">
            <div class="field">
              <label>الاسم الأول *</label>
              <input type="text" id="ar-fname" readonly/>
            </div>
            <div class="field">
              <label>اللقب *</label>
              <input type="text" id="ar-lname" readonly/>
            </div>
            <div class="field">
              <label>جواز السفر / الهوية *</label>
              <input type="text" id="ar-passport" readonly/>
            </div>
            <div class="field">
              <label>الجنسية</label>
              <input type="text" id="ar-nationality" readonly/>
            </div>
            <div class="field">
              <label>الهاتف</label>
              <input type="text" id="ar-phone" readonly/>
            </div>
            <div class="field">
              <label>البريد الإلكتروني</label>
              <input type="text" id="ar-email" readonly/>
            </div>
            <div class="field">
              <label>رخصة القيادة *</label>
              <input type="text" id="ar-license" readonly/>
            </div>
            <div class="field">
              <label>العنوان</label>
              <input type="text" id="ar-address" readonly/>
            </div>
          </div>
        </div>

        <!-- Section 4: Dates -->
        <div style="margin-bottom:13px;">
          <div style="font-size:10px;font-weight:800;color:var(--accent);
            text-transform:uppercase;margin-bottom:8px;padding-bottom:5px;
            border-bottom:1px solid var(--border);">④ التواريخ والمواقع</div>
          <div class="form-grid">
            <div class="field">
              <label>تاريخ/وقت الاستلام</label>
              <input type="datetime-local" id="ar-pickup" onchange="arCalc()"/>
            </div>
            <div class="field">
              <label>تاريخ/وقت التسليم</label>
              <input type="datetime-local" id="ar-dropoff" onchange="arCalc()"/>
            </div>
            <div class="field">
              <label>نوع مكان الاستلام</label>
              <select id="ar-ploc-type">
                <option>المكتب</option>
                <option>المطار</option>
                <option>الفندق</option>
              </select>
            </div>
            <div class="field">
              <label>تفاصيل مكان الاستلام</label>
              <input type="text" id="ar-ploc-addr"
                placeholder="العنوان بالتفصيل"/>
            </div>
            <div class="field">
              <label>نوع مكان التسليم</label>
              <select id="ar-dloc-type">
                <option>المكتب</option>
                <option>المطار</option>
                <option>الفندق</option>
              </select>
            </div>
            <div class="field">
              <label>تفاصيل مكان التسليم</label>
              <input type="text" id="ar-dloc-addr"
                placeholder="العنوان بالتفصيل"/>
            </div>
          </div>
        </div>

        <!-- Section 5: Payments (simplified) -->
        <div style="margin-bottom:13px;">
          <div style="font-size:10px;font-weight:800;color:var(--accent);
            text-transform:uppercase;margin-bottom:8px;padding-bottom:5px;
            border-bottom:1px solid var(--border);">⑤ المدفوعات</div>
          <div class="form-grid g3" style="margin-bottom:7px;">
            <div class="field">
              <label>ج.م (نقداً)</label>
              <input type="number" id="ar-paid-egp" value="0" oninput="arCalc()"/>
            </div>
            <div class="field">
              <label>دولار</label>
              <input type="number" id="ar-paid-usd" value="0" oninput="arCalc()"/>
            </div>
            <div class="field">
              <label>يورو</label>
              <input type="number" id="ar-paid-eur" value="0" oninput="arCalc()"/>
            </div>
          </div>
          <div class="form-grid">
            <div class="field">
              <label>بطاقة (ج.م)</label>
              <input type="number" id="ar-paid-card" value="0" oninput="arCalc()"/>
            </div>
            <div class="field">
              <label>التأمين المطلوب</label>
              <input type="number" id="ar-req-dep" value="0" oninput="arCalc()"/>
            </div>
            <div class="field">
              <label>التأمين المحتجز (ج.م)</label>
              <input type="number" id="ar-dep-egp" value="0" oninput="arCalc()"/>
            </div>
          </div>
        </div>

        <!-- Section 6: Packages -->
        <div style="margin-bottom:13px;">
          <div style="font-size:10px;font-weight:800;color:var(--accent);
            text-transform:uppercase;margin-bottom:8px;padding-bottom:5px;
            border-bottom:1px solid var(--border);">⑥ الباقات</div>
          <div class="form-grid">
            <div class="field">
              <label>باقة التأمين</label>
              <select id="ar-ins-pkg">
                <option value="Basic">أساسي (مسؤولية 100%)</option>
                <option value="Intermediate">متوسط (70% / 30%)</option>
                <option value="Full Protection">حماية كاملة (صفر)</option>
              </select>
            </div>
            <div class="field">
              <label>باقة الكيلومترات</label>
              <select id="ar-km-pkg" onchange="arCalc()">
                <option value="standard">قياسي (120 كم/يوم)</option>
                <option value="500">500 كم إضافي</option>
                <option value="750">750 كم إضافي</option>
                <option value="1000">1000 كم إضافي</option>
                <option value="unlimited">كيلومتر مفتوح</option>
              </select>
            </div>
            <div class="field">
              <label>تكلفة باقة الكيلومترات</label>
              <input type="number" id="ar-km-cost" value="0" oninput="arCalc()"/>
            </div>
          </div>
        </div>

        <!-- Live Estimate AR -->
        <div style="background:var(--surface2);border:1px solid var(--border);
          border-radius:9px;padding:11px;margin-bottom:13px;">
          <div style="font-size:10px;color:var(--text3);font-weight:700;
            margin-bottom:7px;text-transform:uppercase;">تقدير الإيجار</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;
            gap:4px;font-size:11px;">
            <span style="color:var(--text3);">الأساسي:</span>
            <span id="ar-est-base" style="font-weight:700;">£0.00</span>
            <span style="color:var(--text3);">الأيام:</span>
            <span id="ar-est-days">0</span>
          </div>
          <div style="border-top:1px solid var(--border);margin-top:8px;
            padding-top:7px;display:flex;justify-content:space-between;">
            <span style="font-weight:700;">الإجمالي</span>
            <span id="ar-est-total"
              style="font-size:15px;font-weight:900;color:var(--accent);">
              £0.00
            </span>
          </div>
        </div>

        <button class="btn btn-primary btn-full"
          onclick="generateARContract()">
          📝 إنشاء العقد
        </button>
        <button class="btn btn-ghost btn-full mt-8"
          onclick="clearContractForm('ar')">
          ✕ مسح النموذج
        </button>
      </div>

      <!-- RIGHT: AR Output -->
      <div>
        <div id="ar-output" style="display:none;">
          <div style="display:flex;gap:7px;margin-bottom:11px;">
            <button class="btn btn-primary"
              onclick="printContractWindow('ar-contract-pages')">
              🖨️ طباعة / حفظ PDF
            </button>
            <button class="btn btn-ghost"
              onclick="document.getElementById('ar-output').style.display='none'">
              ✕ إغلاق
            </button>
          </div>
          <div id="ar-contract-pages"></div>
        </div>
        <div id="ar-placeholder" class="empty-state"
          style="padding:80px 20px;">
          <div style="font-size:40px;margin-bottom:11px;">📝</div>
          <p>املأ النموذج واضغط إنشاء العقد</p>
        </div>
      </div>

    </div>`;

  populateFleetDropdowns();
};

// ============================================================
// AR CONTRACT CALCULATIONS
// ============================================================

window.arCalc = function() {
  const pickup  = document.getElementById('ar-pickup')?.value;
  const dropoff = document.getElementById('ar-dropoff')?.value;
  const daily   = parseFloat(document.getElementById('ar-daily')?.value)    || 0;
  const insFee  = parseFloat(document.getElementById('ar-ins-fee')?.value)  || 0;
  const kmCost  = parseFloat(document.getElementById('ar-km-cost')?.value)  || 0;
  const pEGP    = parseFloat(document.getElementById('ar-paid-egp')?.value) || 0;
  const pUSD    = parseFloat(document.getElementById('ar-paid-usd')?.value) || 0;
  const pEUR    = parseFloat(document.getElementById('ar-paid-eur')?.value) || 0;
  const pCard   = parseFloat(document.getElementById('ar-paid-card')?.value)|| 0;

  let days = 0;
  if (pickup && dropoff) {
    days = Math.max(0, Math.ceil((new Date(dropoff) - new Date(pickup)) / 86400000));
  }

  const base    = daily   * days;
  const insT    = insFee  * days;
  const total   = base + insT + kmCost;
  const paidNow = pEGP + (pUSD * G.ratesUSD) + (pEUR * G.ratesEUR) + pCard;

  const s = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  s('ar-est-base',  fmtMoney(base));
  s('ar-est-days',  String(days));
  s('ar-est-total', fmtMoney(total));

  return { days, base, insT, kmCost, total, paidNow,
           daily, insFee, pEGP, pUSD, pEUR, pCard };
};

window.arSelectCar = function() {
  const carId = document.getElementById('ar-car')?.value;
  showCarInfoBadge(carId, 'ar-car-badge');
  if (carId) prefillDailyRate(carId, 'ar-daily');
  arCalc();
};

// ============================================================
// GENERATE AR CONTRACT
// ============================================================

window.generateARContract = async function() {
  const fname   = document.getElementById('ar-fname')?.value.trim();
  const lname   = document.getElementById('ar-lname')?.value.trim();
  const carId   = document.getElementById('ar-car')?.value;
  const pickup  = document.getElementById('ar-pickup')?.value;
  const dropoff = document.getElementById('ar-dropoff')?.value;
  const daily   = parseFloat(document.getElementById('ar-daily')?.value) || 0;

  if (!fname || !lname) { toast('اسم العميل مطلوب.', 'error'); return; }
  if (!pickup || !dropoff) { toast('التواريخ مطلوبة.', 'error'); return; }
  if (daily <= 0) { toast('الإيجار اليومي يجب أن يكون أكبر من صفر.', 'error'); return; }

  const branchCode = document.getElementById('ar-branch')?.value || G.user?.branch || 'GEN';
  const ref        = await generateDocRef('CN', branchCode);
  document.getElementById('ar-ref-preview').textContent = ref;

  const car      = getCarById(carId);
  const carLabel = car ? getCarLabel(car, 'ar') : (carId || '-');
  const plate    = car ? (car.plate || formatPlate(car)) : '';
  const calc     = arCalc();
  const { days, base, insT, kmCost, total, paidNow,
          pEGP, pUSD, pEUR, pCard } = calc;
  const depEGP   = parseFloat(document.getElementById('ar-dep-egp')?.value) || 0;
  const insPkg   = document.getElementById('ar-ins-pkg')?.value || 'Basic';
  const kmPkg    = document.getElementById('ar-km-pkg')?.value  || 'standard';
  const plocType = document.getElementById('ar-ploc-type')?.value || 'المكتب';
  const plocAddr = document.getElementById('ar-ploc-addr')?.value || '';
  const dlocType = document.getElementById('ar-dloc-type')?.value || 'المكتب';
  const dlocAddr = document.getElementById('ar-dloc-addr')?.value || '';

  // Save to Firestore
  try {
    await db.collection('bookings').doc(ref).set({
      'No.':                                ref,
      'اسم العميل':                          `${fname} ${lname}`,
      'اسم السيارة':                         carLabel,
      'كود السيارة':                         String(carId || ''),
      'بداية التعاقد':                       pickup,
      'نهاية التعاقد':                       dropoff,
      'سعر السيارة اليومي بالجنيه المصري':  fmtMoney(daily),
      'إجمالي المستحق (Total)':              fmtMoney(total),
      'المدفوع EGP':                        String(pEGP),
      'حالة الطلب':                         'Active',
      'closed':                              false,
      'فرع الإصدار':                        branchCode,
      'assigned_user':                       G.user?.username || '',
      'rental_days':                         String(days),
      '_sys_updated':                        Date.now()
    });

    await logAction('GENERATE', 'Arabic Contract',
      `Contract ${ref} for ${fname} ${lname} | ${carLabel} | ${fmtMoney(total)}`);

    toast(`✅ العقد ${ref} تم حفظه!`, 'success', 6000);

  } catch (e) {
    toast('تحذير: فشل الحفظ. ' + e.message, 'warning');
  }

  // Build Arabic A4 (single page — simplified version)
  const arBranchNames = {
    HRG: 'الغردقة', ALX: 'الإسكندرية',
    CAI: 'القاهرة', RSH: 'رشيد'
  };
  const logo  = 'https://brothersegy.com/wp-content/uploads/2026/02/12345.png';
  const today = new Date().toLocaleDateString('ar-EG');

  const arHtml = `
    <div style="width:210mm;min-height:296mm;padding:10mm 15mm;
      background:white;color:#000;font-family:Arial,sans-serif;
      font-size:9.5pt;line-height:1.5;box-sizing:border-box;
      direction:rtl;text-align:right;
      box-shadow:0 0 20px rgba(0,0,0,0.15);margin:0 auto 20px auto;">

      <!-- Header -->
      <div style="display:flex;justify-content:space-between;
        align-items:flex-start;border-bottom:2px solid #04509D;
        padding-bottom:10px;margin-bottom:12px;">
        <div style="text-align:right;">
          <div style="font-size:16pt;font-weight:bold;color:#04509D;">
            عقد إيجار سيارة
          </div>
          <div style="font-weight:bold;font-size:10pt;">
            رقم العقد: ${ref}
          </div>
          <div style="font-size:9pt;color:#555;">
            التاريخ: ${today} | الفرع: ${arBranchNames[branchCode] || branchCode}
          </div>
        </div>
        <img src="${logo}" style="height:45px;object-fit:contain;">
      </div>

      <!-- Parties -->
      <div style="border:1px solid #000;padding:8px;margin-bottom:10px;
        position:relative;border-radius:4px;">
        <div style="background:#000;color:white;padding:1px 8px;
          font-weight:bold;font-size:8pt;position:absolute;
          top:-10px;right:8px;">الأطراف</div>
        <table style="width:100%;border-collapse:collapse;font-size:9pt;">
          <tr>
            <td style="border:1px solid #000;padding:4px;width:30%;
              background:#f9f9f9;text-align:center;">
              <strong>المؤجر</strong><br>
              الاخوة المتحدون<br>فرع ${arBranchNames[branchCode] || branchCode}
            </td>
            <td style="border:1px solid #000;padding:4px;">
              <strong>المستأجر</strong><br>
              <b>الاسم:</b> ${fname} ${lname}<br>
              <b>جواز السفر/الهوية:</b> ${document.getElementById('ar-passport')?.value || '—'}
              | <b>رخصة القيادة:</b> ${document.getElementById('ar-license')?.value || '—'}<br>
              <b>الجنسية:</b> ${document.getElementById('ar-nationality')?.value || '—'}
              | <b>الهاتف:</b> ${document.getElementById('ar-phone')?.value || '—'}<br>
              <b>العنوان:</b> ${document.getElementById('ar-address')?.value || '—'}
            </td>
          </tr>
        </table>
      </div>

      <!-- Vehicle & Period -->
      <div style="border:1px solid #000;padding:8px;margin-bottom:10px;
        position:relative;border-radius:4px;">
        <div style="background:#000;color:white;padding:1px 8px;
          font-weight:bold;font-size:8pt;position:absolute;
          top:-10px;right:8px;">المركبة والفترة</div>
        <table style="width:100%;border-collapse:collapse;font-size:9pt;">
          <tr>
            <th style="border:1px solid #000;padding:4px;background:#f0f0f0;">الطراز</th>
            <td style="border:1px solid #000;padding:4px;">${carLabel}</td>
            <th style="border:1px solid #000;padding:4px;background:#f0f0f0;">اللوحة</th>
            <td style="border:1px solid #000;padding:4px;font-weight:bold;">${plate || '—'}</td>
          </tr>
          <tr>
            <th style="border:1px solid #000;padding:4px;background:#f0f0f0;">الاستلام</th>
            <td style="border:1px solid #000;padding:4px;">
              ${pickup.replace('T', ' ')}<br>
              ${plocType}${plocAddr ? ' - ' + plocAddr : ''}
            </td>
            <th style="border:1px solid #000;padding:4px;background:#f0f0f0;">التسليم</th>
            <td style="border:1px solid #000;padding:4px;">
              ${dropoff.replace('T', ' ')}<br>
              ${dlocType}${dlocAddr ? ' - ' + dlocAddr : ''}
            </td>
          </tr>
          <tr>
            <th style="border:1px solid #000;padding:4px;background:#f0f0f0;">المدة</th>
            <td style="border:1px solid #000;padding:4px;font-weight:bold;">
              ${days} يوم
            </td>
            <th style="border:1px solid #000;padding:4px;background:#f0f0f0;">عداد الخروج</th>
            <td style="border:1px solid #000;padding:4px;">
              ${document.getElementById('ar-km-out')?.value || '—'}
            </td>
          </tr>
        </table>
      </div>

      <!-- Financial -->
      <div style="border:1px solid #000;padding:8px;margin-bottom:10px;
        position:relative;border-radius:4px;">
        <div style="background:#000;color:white;padding:1px 8px;
          font-weight:bold;font-size:8pt;position:absolute;
          top:-10px;right:8px;">الملخص المالي</div>
        <table style="width:100%;border-collapse:collapse;font-size:9pt;">
          <thead>
            <tr>
              <th style="border:1px solid #000;padding:4px;background:#f0f0f0;">البيان</th>
              <th style="border:1px solid #000;padding:4px;background:#f0f0f0;">الحساب</th>
              <th style="border:1px solid #000;padding:4px;background:#f0f0f0;">المبلغ (ج.م)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border:1px solid #000;padding:4px;">الإيجار الأساسي</td>
              <td style="border:1px solid #000;padding:4px;">
                ${daily.toLocaleString()} × ${days} يوم
              </td>
              <td style="border:1px solid #000;padding:4px;text-align:left;font-weight:bold;">
                ${Math.round(base).toLocaleString()}
              </td>
            </tr>
            ${insT > 0 ? `
            <tr>
              <td style="border:1px solid #000;padding:4px;">رسوم التأمين</td>
              <td style="border:1px solid #000;padding:4px;">
                ${calc.insFee} × ${days} يوم
              </td>
              <td style="border:1px solid #000;padding:4px;text-align:left;">
                ${Math.round(insT).toLocaleString()}
              </td>
            </tr>` : ''}
            ${kmCost > 0 ? `
            <tr>
              <td style="border:1px solid #000;padding:4px;">باقة الكيلومترات</td>
              <td style="border:1px solid #000;padding:4px;">رسوم ثابتة</td>
              <td style="border:1px solid #000;padding:4px;text-align:left;">
                ${kmCost.toLocaleString()}
              </td>
            </tr>` : ''}
          </tbody>
          <tfoot>
            <tr style="font-weight:bold;background:#f0f0f0;">
              <td colspan="2" style="border:1px solid #000;padding:4px;
                text-align:right;">إجمالي قيمة العقد:</td>
              <td style="border:1px solid #000;padding:4px;text-align:left;
                font-size:11pt;color:#04509D;">
                ${Math.round(total).toLocaleString()} ج.م
              </td>
            </tr>
          </tfoot>
        </table>
        <div style="background:#eee;padding:5px;text-align:center;
          font-size:9pt;margin-top:5px;">
          المدفوع الآن: <strong>${Math.round(paidNow).toLocaleString()} ج.م</strong>
          | المتبقي: <strong style="color:${total - paidNow > 0 ? '#c0392b' : '#27ae60'};">
            ${Math.max(0, Math.round(total - paidNow)).toLocaleString()} ج.م
          </strong>
        </div>
        ${depEGP > 0 ? `
        <div style="border:2px solid orange;padding:5px;margin-top:5px;
          font-size:9pt;border-radius:4px;">
          <strong>التأمين المحتجز:</strong>
          <strong>${depEGP.toLocaleString()} ج.م</strong>
        </div>` : ''}
      </div>

      <!-- Terms Arabic Summary -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:5px;
        padding:9px 11px;font-size:8.5pt;line-height:1.6;margin-bottom:11px;">
        <div style="font-size:10px;font-weight:800;color:#04509D;margin-bottom:6px;">
          الشروط والأحكام (ملخص)
        </div>
        <strong>١. الأهلية:</strong> الحد الأدنى للسن 21 عامًا. رخصة قيادة وهوية سارية إلزامية.<br>
        <strong>٢. دورة الإيجار:</strong> وحدات 24 ساعة. تجاوز 5 ساعات = يوم كامل إضافي.<br>
        <strong>٣. الكيلومترات:</strong> 120 كم/يوم مشمولة. الزائد يُحتسب عند الإرجاع.<br>
        <strong>٤. الوقود:</strong> سياسة المثل بالمثل.<br>
        <strong>٥. التأمين:</strong> يُلغى في حالة عدم تقديم محضر شرطي فوري.<br>
        <strong>٦. التأمين الأمني:</strong> يُرد عند الإرجاع السليم.<br>
        <strong>٧. المسؤولية:</strong> المستأجر يتحمل كامل المسؤولية القانونية خلال فترة الإيجار.
      </div>

      <!-- Signatures -->
      <div style="display:flex;justify-content:space-between;
        align-items:flex-end;margin-bottom:11px;margin-top:auto;">
        <div style="text-align:center;">
          <div style="width:150px;border-top:1px solid #334155;
            margin-bottom:3px;"></div>
          <div style="font-size:9px;color:#64748b;">توقيع المستأجر</div>
          <div style="font-size:9px;">${fname} ${lname}</div>
        </div>
        <div style="text-align:center;">
          <div style="width:150px;border-top:1px solid #334155;
            margin-bottom:3px;"></div>
          <div style="font-size:9px;color:#64748b;">توقيع المؤجر</div>
          <div style="font-size:9px;">
            برازرز إيجي – ${arBranchNames[branchCode] || branchCode}
          </div>
        </div>
      </div>

      ${a4FooterHTML(ref, 'عقد إيجار', true)}
    </div>`;

  const pagesEl = document.getElementById('ar-contract-pages');
  if (pagesEl) pagesEl.innerHTML = arHtml;

  document.getElementById('ar-output').style.display = 'block';
  document.getElementById('ar-placeholder').style.display = 'none';
};
