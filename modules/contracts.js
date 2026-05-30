// ============================================================
// modules/contracts.js v4.2
// English contract (4-page) + Arabic contract (4-page)
// ============================================================

// ============================================================
// ENTRY POINTS
// ============================================================
window.renderENContract = function () {
  renderPageLoading('page-en-contract', '📄', 'English Contract');
  loadENContract();
};

window.renderARContract = function () {
  renderPageLoading('page-ar-contract', '📝', 'Arabic Contract');
  loadARContract();
};

// ============================================================
// SHARED TERMS (EN)
// ============================================================
const TERMS_EN = {
  1 : `* <strong>Minimum Age:</strong> You must be 21 years or older.<br>
* <strong>License:</strong> Valid ID and Driving License accepted in Egypt are mandatory.<br>
* <strong>Authorized Drivers:</strong> Only the person named on the contract may drive.
Additional drivers must be approved and listed.`,

  2 : `* <strong>24-Hour Cycle:</strong> Charges based on 24-hour units.<br>
* <strong>Rental Cycle:</strong> Every hour is charged from the 1st hour.
If the period is exceeded by 5 hours, a full additional day is charged.<br>
* <strong>Extensions:</strong> Any extension must be approved by the Company.
Unauthorized late returns are charged at a higher local tariff.<br>
* <strong>Early Return:</strong> No refunds are issued for vehicles returned early.`,

  3 : `* <strong>Free Cancellation:</strong> Full refund if cancelled more than 48 hours before pickup.<br>
* <strong>Late Cancellation (&lt;48h):</strong> 30% of the booking value is retained.<br>
* <strong>No Show:</strong> Failure to pick up the car without prior notice results in
100% forfeiture of the booking amount.`,

  4 : `* <strong>Mileage Limit:</strong> Standard limit is 120 KM/day unless an Extra KM Package
is purchased. Total allowance is summed. Extra KM charged upon return.<br>
* <strong>Delivery Locations:</strong> Delivery available to Hotels and Airports only.<br>
* <strong>One-Way Rental:</strong> Dropping off at a different branch incurs a specific fee.`,

  6 : `* <strong>Theft Policy:</strong> Theft is <strong>NOT</strong> covered by insurance.
The vehicle is the Lessee's sole responsibility and must be parked in secure locations.`,

  7 : `Insurance is considered <strong>NULL AND VOID</strong> in the following cases:<br>
1. Failure to provide an official <strong>Police Report</strong> immediately after an accident.<br>
2. Driving under the influence of alcohol or drugs.<br>
3. Driving off-road (Safari) or on unpaved roads.<br>
4. Driving by an unauthorized person.<br>
5. Gross negligence (e.g., failing to engage handbrake).`,

  8 : `The following items are NOT covered by any insurance plan:<br>
* <strong>Loss of Car Key:</strong> $400 USD<br>
* <strong>License Loss:</strong> $250 USD<br>
* <strong>Spare Tire/Tools:</strong> $300 USD<br>
* <strong>Fire Extinguisher:</strong> $200 USD<br>
* <strong>Tire Damage:</strong> $200 USD per tire<br>
* <strong>Interior Damage:</strong> $100–$1,000 USD<br>
* <strong>Dirty Return:</strong> Minimum $10 USD (350 EGP)`,

  9 : `* <strong>Deposit Block:</strong> A security amount is blocked/paid at pickup.<br>
* <strong>Refund Policy:</strong> Deposit is 100% refundable upon safe vehicle return.<br>
* <strong>Refund Method:</strong> Deposit returned in same currency mix as received.
Card deposits refunded as EGP CASH to avoid bank delays.<br>
* <strong>Release Time:</strong> Released only after Handover Inspection Report is signed.`,

  10: `<strong>Step 1: Independent Evaluation.</strong> Assessed by authorized independent
Car Service Center. Their quotation is final.<br>
<strong>Step 2: Liability.</strong> At-fault party pays Repair Cost + Lost Rental Days
+ Inspection Fee.<br>
<strong>Step 3: Legal.</strong> Unresolved disputes referred to Competent Court under
Egyptian Law.`,

  11: `The Lessee is fully responsible for any traffic violations (Speeding, Parking, Radar).
The Company reserves the right to charge these costs plus administrative fees.`,

  12: `In case of breakdown, call the Company immediately. Do not attempt unauthorized repairs.
If breakdown is due to Company fault (Battery/Engine), you pay nothing.
If due to negligence (e.g., wrong fuel), Lessee pays all costs.`,

  13: `* <strong>Interior Negligence:</strong> Insurance does NOT cover negligence inside
the vehicle.<br>
* <strong>Minor Damages:</strong> For small scratches where a Police Report is
impractical, Lessee agrees to pay repair cost directly.<br>
* <strong>Police Report:</strong> If Lessee refuses to settle damages, a Police
Report is MANDATORY.`
};

const INS_DETAILS_EN = {
  'Basic'         : `<strong>High Deductible.</strong> You pay 100% for Glass, Tires, and Undercarriage
damages.<br><strong>INCLUDES:</strong> Standard CDW (Body damage only with excess).<br>
<strong>EXCLUDES:</strong> All glass, tires, undercarriage, towing, and third party liability.`,
  'Intermediate'  : `<strong>Reduced Liability.</strong> Client pays 70% of repair costs.
Company pays 30%.<br><strong>INCLUDES:</strong> Undercarriage coverage up to 10K EGP.<br>
<strong>EXCLUDES:</strong> Glass, Tires, and Interior damage.`,
  'Full Protection': `<strong>Zero Deductible (Waiver).</strong> Reduces liability to ZERO for
covered items.<br><strong>CAPS:</strong> Roof (20k), Glass (25k), Undercarriage (40k),
Tires (4k/tire).<br><strong>EXCLUDES:</strong> Interior damage (saloon), misfueling, or
personal possessions.`
};

const INS_SIMPLE_EN = {
  'Basic'         : 'Basic Insurance: 100% Client Liability for Damages.',
  'Intermediate'  : 'Intermediate: 70% Client Liability / 30% Company Coverage.',
  'Full Protection': 'Full Protection: Zero Deductible (Subject to caps).'
};

// ============================================================
// SHARED TERMS (AR)
// ============================================================
const TERMS_AR = [
  { title: 'التمهيد والأطراف',
    text : 'الطرف الأول بصفته وكيلاً عن المالك بإدارة السيارة بالتوكيل الرسمي المذكور ببيانات العقد، ورغبة من الطرف الثاني في استلام السيارة لاستخدامها لشخصه فقط. التمهيد السابق جزء لا يتجزأ من هذا العقد ومكملاً لجميع بنوده.' },
  { title: 'حالة السيارة',
    text : 'أقر الطرف الثاني بأنه تسلم السيارة وهي بحالة جيدة مستوفاة لجميع الاشتراطات اللازمة للتسيير وكذا شروط الصلاحية الفنية والمرورية وأصبح مسئولاً عنها مسئولية قانونية منذ توقيعه على هذا العقد.' },
  { title: 'المخالفات والحوادث',
    text : 'أقر الطرف الثاني بأنه ملتزم بدفع كافة المخالفات المرورية وغيرها طوال فترة الإعارة وكذا تكلفة أي حادث (لا قدر الله) والقيمة الإيجارية لفترة الإصلاح.' },
  { title: 'الأمانة (عارية الاستخدام)',
    text : 'أقر الطرف الثاني بأنه تسلم السيارة على سبيل عارية الاستخدام وهي لديه على سبيل الأمانة وفي حالة عدم ردها للطرف الأول بالحالة التي تسلمها عليها أو قام بتبديدها أو إتلافها يكون خائناً للأمانة ويعاقب قانوناً.' },
  { title: 'الأنظمة والقوانين',
    text : 'أقر الطرف الثاني بأنه على علم كامل بقوانين المرور والأمن العام ويتعهد بتنفيذها بكل دقة وكذا بالتعديلات الواردة بقانون المرور رقم 66 لسنة 1973 وتعديلاته.' },
  { title: 'المسؤولية الشخصية',
    text : 'حق المستأجر في استخدام السيارة على مسؤوليته الشخصية، وهو مسؤول مسؤولية كاملة مدنياً وجنائياً عن السيارة والأضرار التي قد تحدث خلال فترة التعاقد.' },
  { title: 'تمديد الإيجار',
    text : 'في حالة رغبة الطرف الثاني بتمديد مدة الإيجار عليه بإبلاغ الطرف الأول بمدة لا تقل عن 24 ساعة من تاريخ انتهاء العقد وإبرام عقد جديد.' },
  { title: 'الإرجاع المبكر',
    text : 'في حالة التسليم قبل ميعاد انتهاء العقد، يجب إخطار الطرف الأول قبلها بـ 48 ساعة. وفي حالة التسليم الفوري يتحمل المستأجر قيمة إيجار يومين إضافيين.' },
  { title: 'الحوادث والإصلاح',
    text : 'في حالة وقوع حادث، يجب إعلام الطرف الأول فوراً، ولا يحق للمستأجر إصلاح السيارة إلا في المراكز التي يحددها المؤجر، وإلا تحمل كامل التكاليف والغرامات.' },
  { title: 'باقة التأمين المختارة', text: '' },
  { title: 'محظورات الاستخدام',
    text : 'يمنع استخدام السيارة في: السباقات، نقل الركاب بالأجر، الطرق غير الممهدة، أو تحت تأثير الكحول، أو أي أعمال مخالفة للقانون.' },
  { title: 'براءة الذمة',
    text : 'لا تخلو مسؤولية الطرف الثاني إلا بموجب إيصال رسمي دال على تسليم السيارة وإنهاء التعاقد.' },
  { title: 'فض المنازعات', text: '' },
  { title: 'توثيق العقد',
    text : 'حرر هذا العقد من نسختين، بيد كل طرف نسخة للعمل بموجبها.' }
];

const INS_DETAILS_AR = {
  'Basic'         : `<strong>مسؤولية عالية.</strong> تدفع 100% عن أضرار الزجاج والإطارات والهيكل السفلي.`,
  'Intermediate'  : `<strong>مسؤولية مخفضة.</strong> يدفع العميل 70% من تكاليف الإصلاح. تدفع الشركة 30%.`,
  'Full Protection': `<strong>إعفاء كامل من مبلغ التحمل (Waiver).</strong> يقلل المسؤولية إلى الصفر للأصناف المغطاة.`,
  'No Insurance'  : `<strong>بدون تأمين.</strong> المستأجر مسؤول مسؤولية كاملة (100%) عن جميع الأضرار والحوادث والسرقة.`
};

// ============================================================
// SHARED CONSTANTS & HELPERS
// ============================================================
const LOGO     = 'https://brothersegy.com/wp-content/uploads/2026/02/12345.png';
const CAR_IMG  = 'https://brothersegy.com/wp-content/uploads/2026/02/car-template.png';
const TIRE_IMG = 'https://brothersegy.com/wp-content/uploads/2026/02/wheel-tyre-illustration-png.png';

const BRANCH_AR_NAMES = {
  HRG:'الغردقة', ALX:'الإسكندرية',
  CAI:'القاهرة', RSH:'رشيد', GEN:'الغردقة'
};

function _insColorStyle(pkg) {
  const map = {
    'Basic'         : 'background:#ffebee;border:2px solid #c0392b;color:#c0392b;',
    'Intermediate'  : 'background:#fff3e0;border:2px solid #e67e22;color:#e67e22;',
    'Full Protection': 'background:#e8f5e9;border:2px solid #27ae60;color:#27ae60;',
    'No Insurance'  : 'background:#ffebee;border:2px solid #c0392b;color:#c0392b;'
  };
  return map[pkg] || map['Basic'];
}

function _kmAllowed(pkg, days) {
  const pkgKMMap = {
    standard:0, '500':500, '750':750, '1000':1000,
    '1500':1500, '2000':2000, '3000':3000, unlimited:999999
  };
  const km = pkgKMMap[pkg] || 0;
  if (km >= 999999) return { en:'Unlimited KM', ar:'مفتوح', unlimited:true };
  const total = 120 * days + km;
  return {
    en      : total.toLocaleString() + ' KM Total',
    ar      : total.toLocaleString('ar-EG') + ' كم إجمالي',
    unlimited: false
  };
}

function _watermark() {
  return `<div style="position:absolute;top:50%;left:50%;
    transform:translate(-50%,-50%);width:75%;opacity:0.05;
    z-index:0;pointer-events:none;">
    <img src="${LOGO}" style="width:100%;height:auto;">
  </div>`;
}

function _pageStyle(dir) {
  dir = dir || 'ltr';
  return 'width:210mm;height:296mm;padding:10mm 15mm;background:white;' +
    'color:#000;font-family:\'Segoe UI\',Arial,sans-serif;font-size:9.5pt;' +
    'line-height:1.35;box-sizing:border-box;overflow:hidden;' +
    'direction:' + dir + ';text-align:' + (dir === 'rtl' ? 'right' : 'left') + ';' +
    'display:flex;flex-direction:column;' +
    'box-shadow:0 0 20px rgba(0,0,0,0.15);position:relative;' +
    'page-break-after:always;margin:0 auto 20px auto;';
}

function _enTermBlock(title, content) {
  return '<div style="margin-bottom:10px;break-inside:avoid;">' +
    '<strong style="display:block;font-size:8.5pt;color:#04509D;text-transform:uppercase;' +
    'border-bottom:1px solid #999;padding-bottom:2px;margin-bottom:3px;">' + title + '</strong>' +
    '<div style="font-size:7.5pt;line-height:1.3;">' + content + '</div>' +
    '</div>';
}

function _inspectionChecklist(lang) {
  const isAr = lang === 'ar';
  const groups = isAr
    ? [
        { head:'الركاب', items:['(D) رفرف أمامي','(L) باب أمامي','(K) باب خلفي','(J) رفرف خلفي'] },
        { head:'الأمام', items:['(E) اكصدام','(F) كبوت','(W) زجاج أمامي'] },
        { head:'الخلف',  items:['(Q) شنطة','(H) اكصدام خلفي','(I) إضاءة خلفية'] },
        { head:'السائق', items:['(M) رفرف أمامي','(C) باب أمامي','(B) باب خلفي','(A) رفرف خلفي'] }
      ]
    : [
        { head:'PASSENGER', items:['(D) Front Fender','(L) Front Door','(K) Rear Door','(J) Rear Fender'] },
        { head:'FRONT',     items:['(E) Bumper','(F) Hood','(W) Windshield'] },
        { head:'REAR',      items:['(Q) Trunk','(H) Rear Bumper','(I) Rear Lights'] },
        { head:'DRIVER',    items:['(M) Front Fender','(C) Front Door','(B) Rear Door','(A) Rear Fender'] }
      ];

  const chkRow = lbl =>
    '<div style="display:flex;align-items:center;justify-content:space-between;' +
    'margin-bottom:3px;font-size:7pt;border-bottom:1px dotted #ccc;padding-bottom:2px;">' +
    '<span style="font-weight:bold;font-size:6.5pt;text-transform:uppercase;flex-grow:1;">' + lbl + '</span>' +
    '<div style="display:flex;gap:3px;">' +
    '<div style="width:12px;height:12px;border:1.5px solid #27ae60;display:inline-block;background:#e8f8f5;"></div>' +
    '<div style="width:12px;height:12px;border:1.5px solid #c0392b;display:inline-block;background:#fdedec;"></div>' +
    '</div></div>';

  return '<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:5px;">' +
    groups.map(g =>
      '<div style="width:48%;">' +
      '<div style="background:#000;color:#fff;font-weight:bold;font-size:7.5pt;padding:2px 4px;margin-bottom:3px;">' + g.head + '</div>' +
      g.items.map(chkRow).join('') +
      '</div>'
    ).join('') +
    '</div>';
}

// ============================================================
// FLEET DROPDOWN POPULATE (shared EN + AR)
// ============================================================
function populateFleetDropdowns() {
  ['en-car', 'ar-car'].forEach(selId => {
    const sel = document.getElementById(selId);
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Select Car --</option>';
    G.fleet
      .filter(c => c.is_active !== false && !c.archived)
      .sort((a, b) => (getCarLabel(a, 'en') > getCarLabel(b, 'en') ? 1 : -1))
      .forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        const label = getCarLabel(c, 'en');
        const year  = c.year ? ` (${c.year})` : '';
        const plate = c.plate ? ` | ${c.plate}` : '';
        opt.textContent = label + year + plate;
        sel.appendChild(opt);
      });
  });
}

// ============================================================
// EN CONTRACT — PAGE LOAD
// ============================================================
window.loadENContract = async function () {
  const wrap = document.getElementById('page-en-contract');
  if (!wrap) return;

  wrap.innerHTML = `
    <div style="display:grid;grid-template-columns:420px 1fr;gap:18px;align-items:start;">

      <!-- LEFT: Form -->
      <div class="panel sticky-panel"
        style="max-height:calc(100vh - 120px);overflow-y:auto;">

        <div style="display:flex;align-items:center;justify-content:space-between;
          margin-bottom:13px;">
          <h3 style="font-size:13px;font-weight:800;">📄 New Contract</h3>
          <span id="en-ref-preview"
            style="font-size:10px;color:var(--accent);font-weight:700;"></span>
        </div>

        <!-- Load from Proposal -->
        <div style="background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.25);
          border-radius:9px;padding:11px;margin-bottom:13px;">
          <div style="font-size:10px;font-weight:700;color:var(--accent);margin-bottom:7px;">
            📋 Load from Proposal (Optional)
          </div>
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

        <!-- ① Contract Info -->
        <div style="margin-bottom:13px;">
          <div style="font-size:10px;font-weight:800;color:var(--accent);
            text-transform:uppercase;margin-bottom:8px;padding-bottom:5px;
            border-bottom:1px solid var(--border);">① Contract Info</div>
          <div class="form-grid">
            <div class="field"><label>Issuing Branch</label>
              <select id="en-branch">
                <option value="HRG">Hurghada Branch</option>
                <option value="ALX">Alexandria (HQ)</option>
                <option value="CAI">Cairo Branch</option>
                <option value="RSH">Rashid Branch</option>
              </select>
            </div>
            <div class="field"><label>Rental Mode</label>
              <select id="en-mode" onchange="enCalc()">
                <option value="Daily">Daily (Short Term)</option>
                <option value="Monthly">Monthly (Long Term)</option>
              </select>
            </div>
            <div class="field"><label>Agreement Type</label>
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

        <!-- ② Vehicle -->
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
            <div class="field"><label>KM Out</label>
              <input type="number" id="en-km-out" placeholder="e.g. 52747"/></div>
            <div class="field"><label>Fuel Level</label>
              <select id="en-fuel">
                <option>Full (8/8)</option><option>3/4</option>
                <option>1/2</option><option>1/4</option><option>Reserve</option>
              </select>
            </div>
            <div class="field"><label>Daily Rent (EGP)</label>
              <input type="number" id="en-daily" placeholder="0" oninput="enCalc()"/></div>
            <div class="field"><label>Insurance Fee (Daily)</label>
              <input type="number" id="en-ins-fee" value="0" oninput="enCalc()"/></div>
          </div>
        </div>

        <!-- ③ Client -->
        <div style="margin-bottom:13px;">
          <div style="font-size:10px;font-weight:800;color:var(--accent);
            text-transform:uppercase;margin-bottom:8px;padding-bottom:5px;
            border-bottom:1px solid var(--border);">③ Client Details</div>
          <div class="crm-search-wrap">
            <div class="crm-search-header">🔍 SEARCH & AUTO-FILL CLIENT
              <span id="en-crm-id" style="display:none;"></span>
            </div>
            <div class="crm-input-row">
              <input type="text" id="en-client-search"
                placeholder="Name, passport, phone..." oninput="crmSearch('en')"/>
            </div>
            <div class="crm-actions">
              <button class="crm-action-btn new" onclick="openAddCustomerModal()">+ New</button>
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
            <div class="field"><label>First Name *</label>
              <input type="text" id="en-fname" readonly/></div>
            <div class="field"><label>Surname *</label>
              <input type="text" id="en-lname" readonly/></div>
            <div class="field"><label>Passport / National ID *</label>
              <input type="text" id="en-passport" readonly/></div>
            <div class="field"><label>Nationality</label>
              <input type="text" id="en-nationality" readonly/></div>
            <div class="field"><label>Phone</label>
              <input type="text" id="en-phone" readonly/></div>
            <div class="field"><label>Email</label>
              <input type="text" id="en-email" readonly/></div>
            <div class="field"><label>Driver License *</label>
              <input type="text" id="en-license" readonly/></div>
            <div class="field"><label>Address</label>
              <input type="text" id="en-address" readonly/></div>
            <div class="field"><label>Add. Driver Name</label>
              <input type="text" id="en-add-dr-name" placeholder="Optional"/></div>
            <div class="field"><label>Add. Driver License</label>
              <input type="text" id="en-add-dr-lic" placeholder="Optional"/></div>
          </div>
        </div>

        <!-- ④ Dates & Locations -->
        <div style="margin-bottom:13px;">
          <div style="font-size:10px;font-weight:800;color:var(--accent);
            text-transform:uppercase;margin-bottom:8px;padding-bottom:5px;
            border-bottom:1px solid var(--border);">④ Dates & Locations</div>
          <div class="form-grid">
            <div class="field"><label>Pickup Date/Time</label>
              <input type="datetime-local" id="en-pickup" onchange="enCalc()"/></div>
            <div class="field"><label>Dropoff Date/Time</label>
              <input type="datetime-local" id="en-dropoff" onchange="enCalc()"/></div>
            <div class="field"><label>Pickup Location</label>
              <select id="en-ploc-type">
                <option>Office</option><option>Airport</option><option>Hotel</option>
              </select>
            </div>
            <div class="field"><label>Pickup Address</label>
              <input type="text" id="en-ploc-addr" placeholder="Specific address"/></div>
            <div class="field"><label>Dropoff Location</label>
              <select id="en-dloc-type">
                <option>Office</option><option>Airport</option><option>Hotel</option>
              </select>
            </div>
            <div class="field"><label>Dropoff Address</label>
              <input type="text" id="en-dloc-addr" placeholder="Specific address"/></div>
          </div>
        </div>

        <!-- ⑤ Payments -->
        <div style="margin-bottom:13px;">
          <div style="font-size:10px;font-weight:800;color:var(--accent);
            text-transform:uppercase;margin-bottom:8px;padding-bottom:5px;
            border-bottom:1px solid var(--border);">⑤ Payments</div>
          <div style="font-size:10px;color:var(--text3);margin-bottom:5px;font-weight:700;">
            Rent Paid Now
          </div>
          <div class="form-grid g3" style="margin-bottom:7px;">
            <div class="field"><label>EGP</label>
              <input type="number" id="en-paid-egp" value="0" oninput="enCalc()"/></div>
            <div class="field"><label>USD</label>
              <input type="number" id="en-paid-usd" value="0" oninput="enCalc()"/></div>
            <div class="field"><label>EUR</label>
              <input type="number" id="en-paid-eur" value="0" oninput="enCalc()"/></div>
          </div>
          <div class="form-grid" style="margin-bottom:10px;">
            <div class="field"><label>Card (EGP)</label>
              <input type="number" id="en-paid-card" value="0" oninput="enCalc()"/></div>
            <div class="field"><label>Delivery Fee</label>
              <input type="number" id="en-del-fee" value="0" oninput="enCalc()"/></div>
            <div class="field"><label>Pickup Fee</label>
              <input type="number" id="en-pick-fee" value="0" oninput="enCalc()"/></div>
            <div class="field"><label>Required Deposit</label>
              <input type="number" id="en-req-dep" value="0" oninput="enCalc()"/></div>
          </div>
          <div style="font-size:10px;color:var(--text3);margin-bottom:5px;font-weight:700;">
            Deposit Held
          </div>
          <div class="form-grid g3" style="margin-bottom:7px;">
            <div class="field"><label>EGP</label>
              <input type="number" id="en-dep-egp" value="0" oninput="enCalc()"/></div>
            <div class="field"><label>USD</label>
              <input type="number" id="en-dep-usd" value="0" oninput="enCalc()"/></div>
            <div class="field"><label>EUR</label>
              <input type="number" id="en-dep-eur" value="0" oninput="enCalc()"/></div>
          </div>
          <div class="form-grid">
            <div class="field"><label>Deposit Card (EGP)</label>
              <input type="number" id="en-dep-card" value="0" oninput="enCalc()"/></div>
          </div>
        </div>

        <!-- ⑥ Packages -->
        <div style="margin-bottom:13px;">
          <div style="font-size:10px;font-weight:800;color:var(--accent);
            text-transform:uppercase;margin-bottom:8px;padding-bottom:5px;
            border-bottom:1px solid var(--border);">⑥ Package & Add-ons</div>
          <div class="form-grid">
            <div class="field"><label>Insurance Package</label>
              <select id="en-ins-pkg">
                <option value="Basic">Basic (100% Client Liability)</option>
                <option value="Intermediate">Intermediate (70% / 30%)</option>
                <option value="Full Protection">Full Protection (Zero Liability)</option>
              </select>
            </div>
            <div class="field"><label>KM Package</label>
              <select id="en-km-pkg" onchange="enCalc()">
                <option value="standard">Standard (120 KM/Day)</option>
                <option value="500">500 KM Extra</option>
                <option value="750">750 KM Extra</option>
                <option value="1000">1000 KM Extra</option>
                <option value="1500">1500 KM Package</option>
                <option value="2000">2000 KM Package</option>
                <option value="3000">3000 KM Package</option>
                <option value="unlimited">Unlimited KM</option>
              </select>
            </div>
            <div class="field"><label>KM Package Cost (EGP)</label>
              <input type="number" id="en-km-cost" value="0" oninput="enCalc()"/></div>
          </div>
          <div style="display:flex;gap:13px;margin-top:7px;flex-wrap:wrap;">
            <label style="display:flex;align-items:center;gap:5px;font-size:11px;
              cursor:pointer;background:var(--surface2);padding:7px 12px;
              border-radius:8px;border:1px solid var(--border);">
              <input type="checkbox" id="en-add-driver"
                onchange="enCalc()" style="width:14px;height:14px;"/>
              Additional Driver
              <input type="number" id="en-dr-rate" value="250" oninput="enCalc()"
                style="width:65px;padding:3px 7px;background:var(--surface2);
                  border:1px solid var(--border);border-radius:6px;color:var(--text);"/>
              <span style="font-size:10px;color:var(--text3);">EGP/day</span>
            </label>
            <label style="display:flex;align-items:center;gap:5px;font-size:11px;
              cursor:pointer;background:var(--surface2);padding:7px 12px;
              border-radius:8px;border:1px solid var(--border);">
              <input type="checkbox" id="en-add-seat"
                onchange="enCalc()" style="width:14px;height:14px;"/>
              Child Seat
              <input type="number" id="en-seat-rate" value="250" oninput="enCalc()"
                style="width:65px;padding:3px 7px;background:var(--surface2);
                  border:1px solid var(--border);border-radius:6px;color:var(--text);"/>
              <span style="font-size:10px;color:var(--text3);">EGP/day</span>
            </label>
          </div>
        </div>

        <!-- Live Estimate -->
        <div style="background:var(--surface2);border:1px solid var(--border);
          border-radius:9px;padding:11px;margin-bottom:13px;">
          <div style="font-size:10px;color:var(--text3);font-weight:700;
            margin-bottom:7px;text-transform:uppercase;">Rent Estimate</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:11px;">
            <span style="color:var(--text3);">Base:</span>
            <span id="en-est-base" style="font-weight:700;">£0.00</span>
            <span style="color:var(--text3);">Days:</span>
            <span id="en-est-days">0</span>
            <span style="color:var(--text3);">Fees/Add-ons:</span>
            <span id="en-est-fees">£0.00</span>
          </div>
          <div style="border-top:1px solid var(--border);margin-top:8px;padding-top:7px;
            display:flex;justify-content:space-between;">
            <span style="font-weight:700;">TOTAL</span>
            <span id="en-est-total"
              style="font-size:15px;font-weight:900;color:var(--accent);">£0.00</span>
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

        <button class="btn btn-primary btn-full" onclick="generateENContract()">
          📄 Generate Contract (4 Pages)
        </button>
        <button class="btn btn-ghost btn-full mt-8" onclick="clearContractForm('en')">
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
        <div id="en-placeholder" class="empty-state" style="padding:80px 20px;">
          <div style="font-size:40px;margin-bottom:11px;">📄</div>
          <p>Fill the form and click Generate Contract</p>
        </div>
      </div>
    </div>`;

  populateFleetDropdowns();
};

// ============================================================
// EN CALCULATIONS
// ============================================================
window.enCalc = function () {
  const daily   = parseFloat(document.getElementById('en-daily')?.value)     || 0;
  const insFee  = parseFloat(document.getElementById('en-ins-fee')?.value)   || 0;
  const kmCost  = parseFloat(document.getElementById('en-km-cost')?.value)   || 0;
  const delFee  = parseFloat(document.getElementById('en-del-fee')?.value)   || 0;
  const pickFee = parseFloat(document.getElementById('en-pick-fee')?.value)  || 0;
  const addDr   = document.getElementById('en-add-driver')?.checked;
  const drRate  = parseFloat(document.getElementById('en-dr-rate')?.value)   || 250;
  const addSt   = document.getElementById('en-add-seat')?.checked;
  const stRate  = parseFloat(document.getElementById('en-seat-rate')?.value) || 250;
  const pEGP    = parseFloat(document.getElementById('en-paid-egp')?.value)  || 0;
  const pUSD    = parseFloat(document.getElementById('en-paid-usd')?.value)  || 0;
  const pEUR    = parseFloat(document.getElementById('en-paid-eur')?.value)  || 0;
  const pCard   = parseFloat(document.getElementById('en-paid-card')?.value) || 0;
  const reqDep  = parseFloat(document.getElementById('en-req-dep')?.value)   || 0;
  const pickup  = document.getElementById('en-pickup')?.value;
  const dropoff = document.getElementById('en-dropoff')?.value;

  let days = 0;
  if (pickup && dropoff) {
    days = Math.max(0, Math.ceil((new Date(dropoff) - new Date(pickup)) / 86400000));
  }

  const base    = daily * days;
  const insT    = insFee * days;
  const drT     = addDr ? drRate * days : 0;
  const stT     = addSt ? stRate * days : 0;
  const fees    = delFee + pickFee + kmCost + drT + stT + insT;
  const total   = base + fees;
  const paidNow = pEGP + (pUSD * G.ratesUSD) + (pEUR * G.ratesEUR) + pCard;
  const pending = total - paidNow;

  const s = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  s('en-est-base',  fmtMoney(base));
  s('en-est-days',  String(days));
  s('en-est-fees',  fmtMoney(fees));
  s('en-est-total', fmtMoney(total));
  s('en-dep-target',fmtMoney(reqDep));
  s('en-paid-now',  fmtMoney(paidNow));
  s('en-pending',   fmtMoney(Math.max(0, pending)));

  return { days, base, insT, kmCost, delFee, pickFee, drT, stT, fees, total,
           paidNow, pending, daily, insFee, drRate, stRate, addDr, addSt,
           pEGP, pUSD, pEUR, pCard, reqDep };
};

window.enTogglePrev = function () {
  const agr  = document.getElementById('en-agr')?.value;
  const wrap = document.getElementById('en-prev-wrap');
  if (wrap) wrap.style.display = agr === 'extension' ? 'flex' : 'none';
};

window.enSelectCar = async function () {
  const carId = document.getElementById('en-car')?.value;
  if (typeof showCarInfoBadge === 'function') showCarInfoBadge(carId, 'en-car-badge');
  if (carId) await prefillDailyRate(carId, 'en-daily');
  enCalc();
};

// ============================================================
// GENERATE EN CONTRACT
// ============================================================
window.generateENContract = async function () {
  const fname  = (document.getElementById('en-fname')?.value  || '').trim();
  const lname  = (document.getElementById('en-lname')?.value  || '').trim();
  const carId  = document.getElementById('en-car')?.value;
  const pickup = document.getElementById('en-pickup')?.value;
  const dropoff= document.getElementById('en-dropoff')?.value;
  const daily  = parseFloat(document.getElementById('en-daily')?.value) || 0;

  if (!fname || !lname) { toast('Client name required.', 'error'); return; }
  if (!pickup || !dropoff) { toast('Dates required.', 'error'); return; }
  if (daily <= 0) { toast('Daily rent must be greater than 0.', 'error'); return; }

  const branchCode = document.getElementById('en-branch')?.value || G.user?.branch || 'GEN';
  const mode       = document.getElementById('en-mode')?.value   || 'Daily';
  const agr        = document.getElementById('en-agr')?.value    || 'new';
  const prevCon    = (document.getElementById('en-prev-con')?.value || '').trim();
  const ref        = await generateDocRef('CN', branchCode);
  document.getElementById('en-ref-preview').textContent = ref;

  const car      = getCarById(carId);
  const carLabel = car ? getCarLabel(car, 'en') : (carId || '-');
  const plate    = car ? (car.plate || formatPlate(car)) : '';
  const carVin   = car?.chassis || car?.['رقم الشاسيه'] || '';
  const carMotor = car?.['رقم الموتور'] || '';
  const carYear  = car?.year || car?.['سنة الصنع'] || '';

  const calc = enCalc();
  const { days, base, insT, kmCost, delFee, pickFee,
          drT, stT, fees, total, paidNow, pending,
          daily:dly, insFee, drRate, stRate, addDr, addSt,
          pEGP, pUSD, pEUR, pCard, reqDep } = calc;

  const dEGP  = parseFloat(document.getElementById('en-dep-egp')?.value)  || 0;
  const dUSD  = parseFloat(document.getElementById('en-dep-usd')?.value)  || 0;
  const dEUR  = parseFloat(document.getElementById('en-dep-eur')?.value)  || 0;
  const dCard = parseFloat(document.getElementById('en-dep-card')?.value) || 0;
  const depHeld = dEGP + (dUSD * G.ratesUSD) + (dEUR * G.ratesEUR) + dCard;

  const insPkg    = document.getElementById('en-ins-pkg')?.value    || 'Basic';
  const kmPkg     = document.getElementById('en-km-pkg')?.value     || 'standard';
  const plocType  = document.getElementById('en-ploc-type')?.value  || 'Office';
  const plocAddr  = (document.getElementById('en-ploc-addr')?.value || '').trim();
  const dlocType  = document.getElementById('en-dloc-type')?.value  || 'Office';
  const dlocAddr  = (document.getElementById('en-dloc-addr')?.value || '').trim();
  const kmCostVal = parseFloat(document.getElementById('en-km-cost')?.value) || 0;
  const addDrName = (document.getElementById('en-add-dr-name')?.value || '').trim();
  const addDrLic  = (document.getElementById('en-add-dr-lic')?.value  || '').trim();

  // Build payment strings
  const rentParts = [];
  if (pEGP  > 0) rentParts.push(pEGP.toLocaleString() + ' Cash (EGP)');
  if (pUSD  > 0) rentParts.push(pUSD + ' USD (\u00d7' + G.ratesUSD.toFixed(2) + ')');
  if (pEUR  > 0) rentParts.push(pEUR + ' EUR (\u00d7' + G.ratesEUR.toFixed(2) + ')');
  if (pCard > 0) rentParts.push(pCard.toLocaleString() + ' Card (EGP)');
  const rentPayStr = rentParts.join(' + ');

  const depParts = [];
  if (dEGP  > 0) depParts.push(dEGP.toLocaleString() + ' EGP');
  if (dUSD  > 0) depParts.push(dUSD + ' USD');
  if (dEUR  > 0) depParts.push(dEUR + ' EUR');
  if (dCard > 0) depParts.push(dCard.toLocaleString() + ' Card');
  const depPayStr = depParts.join(' + ');

  // Save to Firestore
  try {
    await db.collection('bookings').doc(ref).set({
      'No.'                                : ref,
      'اسم العميل'                         : fname + ' ' + lname,
      'اسم السيارة'                        : carLabel,
      'كود السيارة'                        : String(carId || ''),
      'بداية التعاقد'                      : pickup,
      'نهاية التعاقد'                      : dropoff,
      'سعر السيارة اليومي بالجنيه المصري' : fmtMoney(daily),
      'إجمالي المستحق (Total)'             : fmtMoney(total),
      'المدفوع EGP'                        : String(pEGP),
      'المدفوع USD'                        : String(pUSD),
      'المدفوع EUR'                        : String(pEUR),
      'الوديعة المعلقة لدينا'             : fmtMoney(dEGP),
      'حالة الطلب'                         : 'Active',
      closed                               : false,
      'فرع الإصدار'                        : branchCode,
      assigned_user                        : G.user?.username || '',
      rental_days                          : String(days),
      'مكان الاستلام'                      : plocType + (plocAddr ? ' - ' + plocAddr : ''),
      'مكان التسليم'                       : dlocType + (dlocAddr ? ' - ' + dlocAddr : ''),
      insurance_plan                       : insPkg,
      km_package                           : kmPkg,
      contract_generated                   : true,
      contract_generated_at                : new Date().toISOString(),
      _sys_updated                         : Date.now()
    });

    if (pEGP  > 0) await autoCreateReceipt(ref, ref, pEGP,              'EGP',  fname + ' ' + lname, carLabel, branchCode);
    if (pUSD  > 0) await autoCreateReceipt(ref, ref, pUSD * G.ratesUSD, 'USD',  fname + ' ' + lname, carLabel, branchCode);
    if (pEUR  > 0) await autoCreateReceipt(ref, ref, pEUR * G.ratesEUR, 'EUR',  fname + ' ' + lname, carLabel, branchCode);
    if (pCard > 0) await autoCreateReceipt(ref, ref, pCard,             'Card', fname + ' ' + lname, carLabel, branchCode);

    await logAction('GENERATE', 'English Contract',
      'Contract ' + ref + ' for ' + fname + ' ' + lname + ' | ' + carLabel + ' | ' + fmtMoney(total));
    toast('Contract ' + ref + ' saved!', 'success', 6000);
  } catch (e) {
    toast('Warning: Could not save to database. ' + e.message, 'warning');
  }

  const contractData = {
    ref, branchCode, mode, agr, prevCon,
    fname, lname,
    passport   : (document.getElementById('en-passport')?.value    || '').trim(),
    nationality: (document.getElementById('en-nationality')?.value || '').trim(),
    phone      : (document.getElementById('en-phone')?.value       || '').trim(),
    email      : (document.getElementById('en-email')?.value       || '').trim(),
    license    : (document.getElementById('en-license')?.value     || '').trim(),
    address    : (document.getElementById('en-address')?.value     || '').trim(),
    addDrName, addDrLic,
    carLabel, plate, carVin, carMotor, carYear,
    kmOut     : document.getElementById('en-km-out')?.value || '',
    fuelLevel : document.getElementById('en-fuel')?.value   || 'Full (8/8)',
    pickup, dropoff, days,
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
  document.getElementById('en-output').style.display      = 'block';
  document.getElementById('en-placeholder').style.display = 'none';
};

// ============================================================
// BUILD EN CONTRACT PAGES
// ============================================================
function _buildENContractPages(d) {
  const today   = new Date().toLocaleDateString('en-GB');
  const kmInfo  = _kmAllowed(d.kmPkg, d.days);
  const pText   = d.plocType + (d.plocAddr ? ' (' + d.plocAddr + ')' : '');
  const dText   = d.dlocType + (d.dlocAddr ? ' (' + d.dlocAddr + ')' : '');
  const extHtml = d.agr === 'extension' && d.prevCon
    ? '<div style="font-size:10pt;font-weight:bold;margin-top:3px;">(EXTENSION TO ' + d.prevCon + ')</div>' : '';
  const rateTxt = d.mode === 'Monthly'
    ? d.daily.toLocaleString() + ' \u00d7 ' + Math.ceil(d.days / 30) + ' Mo'
    : d.daily.toLocaleString() + ' \u00d7 ' + d.days + ' Days';
  const baseAmt   = d.mode === 'Monthly' ? d.daily * Math.ceil(d.days / 30) : d.base;
  const insColor  = _insColorStyle(d.insPkg);
  const insContent= INS_DETAILS_EN[d.insPkg] || INS_DETAILS_EN['Basic'];

  const page1 = _buildENPage1(d, today, extHtml, rateTxt, baseAmt, insColor, pText, dText, kmInfo);
  const page2 = _buildENPage2(d, insColor, insContent);
  const page3 = _buildENPage3(d, today, kmInfo);
  const receiptPages = _buildReceiptPages({
    ref: d.ref, clientName: d.fname + ' ' + d.lname,
    passport: d.passport, phone: d.phone,
    carStr: d.carLabel + (d.plate ? ' | ' + d.plate : ''),
    pickup: d.pickup, dropoff: d.dropoff, days: d.days, mode: d.mode,
    total: d.total, paidNow: d.paidNow, pending: d.pending,
    rentPayStr: d.rentPayStr, depHeld: d.depHeld,
    depPayStr: d.depPayStr, reqDep: d.reqDep,
    lang: 'en', today
  });
  return page1 + page2 + page3 + receiptPages;
}

function _buildENPage1(d, today, extHtml, rateTxt, baseAmt, insColor, pText, dText, kmInfo) {
  return `
    <div style="${_pageStyle()}">
      ${_watermark()}
      <div style="position:relative;z-index:2;height:100%;display:flex;flex-direction:column;">

        <div style="display:flex;justify-content:space-between;align-items:flex-start;
          border-bottom:2px solid #04509D;padding-bottom:10px;margin-bottom:12px;">
          <img src="${LOGO}" style="width:180px;height:auto;object-fit:contain;">
          <div style="text-align:center;">
            <h1 style="margin:0;font-size:18pt;color:#04509D;">CAR RENTAL AGREEMENT</h1>
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

        <div style="border:1px solid #000;padding:8px;margin-bottom:10px;
          position:relative;border-radius:4px;">
          <div style="background:#000;color:white;padding:1px 8px;font-weight:bold;
            font-size:8pt;position:absolute;top:-10px;left:8px;
            text-transform:uppercase;">PARTIES</div>
          <table style="width:100%;border-collapse:collapse;font-size:9pt;">
            <tr>
              <td style="border:1px solid #000;padding:4px;width:30%;background:#f9f9f9;">
                <strong>LESSOR</strong><br>El Alakhua El Mutahidun<br>${d.branchCode} Branch
              </td>
              <td style="border:1px solid #000;padding:4px;">
                <strong>LESSEE</strong><br>
                <b>Name:</b> ${d.fname} ${d.lname}<br>
                <b>Passport/ID:</b> ${d.passport || '—'} | <b>License:</b> ${d.license || '—'} | <b>Nation:</b> ${d.nationality || '—'}<br>
                <b>Phone:</b> ${d.phone || '—'} | <b>Email:</b> ${d.email || '—'}<br>
                <b>Addr:</b> ${d.address || '—'}
                ${d.addDrName ? '<br><b>Add. Driver:</b> ' + d.addDrName + (d.addDrLic ? ' | <b>Lic:</b> ' + d.addDrLic : '') : ''}
              </td>
            </tr>
          </table>
        </div>

        <div style="border:1px solid #000;padding:8px;margin-bottom:10px;
          position:relative;border-radius:4px;">
          <div style="background:#000;color:white;padding:1px 8px;font-weight:bold;
            font-size:8pt;position:absolute;top:-10px;left:8px;
            text-transform:uppercase;">VEHICLE & PERIOD</div>
          <table style="width:100%;border-collapse:collapse;font-size:9pt;margin-top:5px;">
            <tr>
              <th style="border:1px solid #000;padding:4px;background:#f0f0f0;">Model</th>
              <td style="border:1px solid #000;padding:4px;">${d.carLabel}</td>
              <th style="border:1px solid #000;padding:4px;background:#f0f0f0;">Plate</th>
              <td style="border:1px solid #000;padding:4px;font-weight:bold;">${d.plate || '—'}</td>
              <th style="border:1px solid #000;padding:4px;background:#f0f0f0;">KM Out</th>
              <td style="border:1px solid #000;padding:4px;">${d.kmOut || '—'}</td>
            </tr>
            <tr>
              <th style="border:1px solid #000;padding:4px;background:#f0f0f0;">VIN</th>
              <td style="border:1px solid #000;padding:4px;">${d.carVin || '—'}</td>
              <th style="border:1px solid #000;padding:4px;background:#f0f0f0;">Motor</th>
              <td style="border:1px solid #000;padding:4px;">${d.carMotor || '—'}</td>
              <th style="border:1px solid #000;padding:4px;background:#f0f0f0;">Allow</th>
              <td style="border:1px solid #000;padding:4px;font-weight:bold;">${kmInfo.en}</td>
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

        <div style="border:1px solid #000;padding:8px;margin-bottom:10px;
          position:relative;border-radius:4px;">
          <div style="background:#000;color:white;padding:1px 8px;font-weight:bold;
            font-size:8pt;position:absolute;top:-10px;left:8px;
            text-transform:uppercase;">FINANCIAL BREAKDOWN</div>
          <table style="width:100%;border-collapse:collapse;font-size:9pt;margin-top:5px;">
            <thead>
              <tr>
                <th style="border:1px solid #000;padding:4px;background:#f0f0f0;">Description</th>
                <th style="border:1px solid #000;padding:4px;background:#f0f0f0;">Rate / Calculation</th>
                <th style="border:1px solid #000;padding:4px;background:#f0f0f0;text-align:right;">Amount (EGP)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="border:1px solid #000;padding:4px;">Base Rent</td>
                <td style="border:1px solid #000;padding:4px;">${rateTxt}</td>
                <td style="border:1px solid #000;padding:4px;text-align:right;">${Math.round(baseAmt).toLocaleString()}</td>
              </tr>
              ${d.insT > 0 ? `<tr>
                <td style="border:1px solid #000;padding:4px;">Insurance Fees</td>
                <td style="border:1px solid #000;padding:4px;">${d.insFee} \u00d7 ${d.days} Days</td>
                <td style="border:1px solid #000;padding:4px;text-align:right;">${Math.round(d.insT).toLocaleString()}</td>
              </tr>` : ''}
              ${d.kmCostVal > 0 ? `<tr>
                <td style="border:1px solid #000;padding:4px;">Mileage Package (${d.kmPkg})</td>
                <td style="border:1px solid #000;padding:4px;">Package Fee</td>
                <td style="border:1px solid #000;padding:4px;text-align:right;">${d.kmCostVal.toLocaleString()}</td>
              </tr>` : ''}
              ${d.addDr ? `<tr>
                <td style="border:1px solid #000;padding:4px;">Additional Driver</td>
                <td style="border:1px solid #000;padding:4px;">${d.drRate} \u00d7 ${d.days} Days</td>
                <td style="border:1px solid #000;padding:4px;text-align:right;">${Math.round(d.drT).toLocaleString()}</td>
              </tr>` : ''}
              ${d.addSt ? `<tr>
                <td style="border:1px solid #000;padding:4px;">Child Car Seat</td>
                <td style="border:1px solid #000;padding:4px;">${d.stRate} \u00d7 ${d.days} Days</td>
                <td style="border:1px solid #000;padding:4px;text-align:right;">${Math.round(d.stT).toLocaleString()}</td>
              </tr>` : ''}
              ${d.delFee > 0 ? `<tr>
                <td style="border:1px solid #000;padding:4px;">Delivery Fee (${pText})</td>
                <td style="border:1px solid #000;padding:4px;">Fixed</td>
                <td style="border:1px solid #000;padding:4px;text-align:right;">${d.delFee.toLocaleString()}</td>
              </tr>` : ''}
              ${d.pickFee > 0 ? `<tr>
                <td style="border:1px solid #000;padding:4px;">Pickup Fee (${dText})</td>
                <td style="border:1px solid #000;padding:4px;">Fixed</td>
                <td style="border:1px solid #000;padding:4px;text-align:right;">${d.pickFee.toLocaleString()}</td>
              </tr>` : ''}
            </tbody>
            <tfoot>
              <tr style="font-weight:bold;border-top:2px solid #000;background:#f0f0f0;">
                <td colspan="2" style="border:1px solid #000;padding:4px;text-align:right;">
                  TOTAL CONTRACT VALUE:
                </td>
                <td style="border:1px solid #000;padding:4px;text-align:right;
                  font-size:11pt;color:#04509D;">
                  ${Math.round(d.total).toLocaleString()} EGP
                </td>
              </tr>
            </tfoot>
          </table>
          <div style="${insColor}padding:5px;text-align:center;font-size:9pt;margin-top:4px;border-radius:4px;">
            ${INS_SIMPLE_EN[d.insPkg] || INS_SIMPLE_EN['Basic']}
          </div>
          <div style="background:#eee;padding:5px;text-align:center;font-size:9pt;margin-top:3px;">
            PAID NOW: <strong>${Math.round(d.paidNow).toLocaleString()} EGP</strong>
            ${d.rentPayStr ? '<span style="font-size:8pt;"> (' + d.rentPayStr + ')</span>' : ''}<br>
            <span style="color:${d.pending > 0 ? '#c0392b' : '#27ae60'};font-weight:bold;">
              PENDING: ${Math.max(0, Math.round(d.pending)).toLocaleString()} EGP
            </span>
          </div>
        </div>

        ${d.reqDep > 0 || d.depHeld > 0 ? `
          <div style="border:2px solid orange;padding:5px;margin-bottom:8px;font-size:9pt;border-radius:4px;">
            <strong>DEPOSIT HELD:</strong>
            <strong>${Math.round(d.depHeld).toLocaleString()} EGP</strong>
            ${d.depPayStr ? '<span style="font-size:8pt;"> (' + d.depPayStr + ')</span>' : ''}
          </div>` : ''}

        <div style="text-align:center;border:2px dashed #000;padding:8px;font-size:8.5pt;border-radius:4px;">
          <strong>IMPORTANT:</strong>
          Contract is void for any period NOT covered by an official payment receipt.<br>
          <strong>LIABILITY:</strong>
          The Lessee bears full legal and criminal liability for the rented vehicle during the entire rental period.
        </div>

        <div style="margin-top:auto;border-top:2px solid #000;padding-top:10px;">
          <div style="display:flex;justify-content:space-between;text-align:center;
            font-weight:bold;font-size:10pt;">
            <div style="width:40%;">LESSOR SIGNATURE<br><br><br>____________________
              <div style="font-size:9pt;margin-top:5px;">Date: ................</div>
            </div>
            <div style="width:40%;">LESSEE SIGNATURE<br><br><br>____________________
              <div style="font-size:9pt;margin-top:5px;">Date: ................</div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

function _buildENPage2(d, insColor, insContent) {
  return `
    <div style="${_pageStyle()}">
      ${_watermark()}
      <div style="position:relative;z-index:2;height:100%;display:flex;flex-direction:column;">
        <div style="display:flex;justify-content:space-between;align-items:center;
          border-bottom:1px solid #04509D;padding-bottom:6px;margin-bottom:10px;">
          <strong style="font-size:13pt;color:#04509D;">TERMS &amp; CONDITIONS</strong>
          <span style="font-size:9pt;color:#555;">Contract: ${d.ref} | Page 2/4</span>
        </div>
        <div style="font-size:8.5pt;column-count:2;column-gap:25px;line-height:1.3;flex-grow:1;">
          ${_enTermBlock('1. DRIVER REQUIREMENTS & ELIGIBILITY', TERMS_EN[1])}
          ${_enTermBlock('2. RENTAL CYCLE & EXTENSIONS', TERMS_EN[2])}
          ${_enTermBlock('3. CANCELLATION & NO-SHOW POLICY', TERMS_EN[3])}
          ${_enTermBlock('4. DELIVERY & MILEAGE', TERMS_EN[4])}
          <div style="border:2px solid #e67e22;padding:5px;background:#fff8e1;
            break-inside:avoid;margin-bottom:10px;">
            <strong style="display:block;font-size:8.5pt;color:#e67e22;
              border-bottom:1px solid #e67e22;padding-bottom:2px;margin-bottom:4px;">
              5. YOUR INSURANCE: ${d.insPkg.toUpperCase()}
            </strong>
            <div style="font-size:7.5pt;line-height:1.3;">${insContent}</div>
          </div>
          ${_enTermBlock('6. THEFT & LOSS WAIVER', TERMS_EN[6])}
          ${_enTermBlock('7. VOIDING OF INSURANCE', TERMS_EN[7])}
          ${_enTermBlock('8. SCHEDULE OF PENALTIES', TERMS_EN[8])}
          ${_enTermBlock('9. SECURITY DEPOSIT & REFUNDS', TERMS_EN[9])}
          ${_enTermBlock('10. DISPUTE RESOLUTION', TERMS_EN[10])}
          ${_enTermBlock('11. TRAFFIC FINES', TERMS_EN[11])}
          ${_enTermBlock('12. MECHANICAL DIFFICULTIES', TERMS_EN[12])}
          ${_enTermBlock('13. INSURANCE & LIABILITY NOTICES', TERMS_EN[13])}
        </div>
        <div style="margin-top:auto;padding:10px;border-top:1px solid #000;
          font-weight:bold;text-align:center;">
          <strong>I have read and accepted all terms &amp; conditions.</strong><br><br>
          <div style="display:flex;justify-content:center;gap:50px;align-items:flex-end;margin-top:5px;">
            <div>Signature: ______________________________</div>
            <div style="font-size:9pt;">Date: ................</div>
          </div>
        </div>
      </div>
    </div>`;
}

function _buildENPage3(d, today, kmInfo) {
  const checklist    = _inspectionChecklist('en');
  const accessories  = 'Spare Tire [ ] Jack [ ] Fire Ext [ ] Triangle [ ]';

  const pickupCol = `
    <div style="width:50%;border-right:1px dashed #000;padding-right:10px;display:flex;flex-direction:column;">
      <div style="background:#eee;font-weight:bold;padding:5px;text-align:center;font-size:9pt;
        border-bottom:1px solid #000;margin-bottom:5px;text-transform:uppercase;">
        PICKUP CHECK (Start of Rental)
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:7pt;margin-bottom:5px;">
        <tr style="background:#eee;">
          <th style="border:1px solid #000;padding:3px;">KM OUT</th>
          <td style="border:1px solid #000;padding:3px;text-align:center;">${d.kmOut || '—'}</td>
        </tr>
        <tr style="background:#eee;">
          <th style="border:1px solid #000;padding:3px;">FUEL LEVEL</th>
          <td style="border:1px solid #000;padding:3px;text-align:center;">${d.fuelLevel}</td>
        </tr>
      </table>
      <div style="text-align:center;font-size:7pt;font-weight:bold;margin-bottom:3px;">EXISTING DAMAGES:</div>
      <div style="width:100%;aspect-ratio:960/618;display:flex;align-items:center;justify-content:center;margin-bottom:2px;">
        <img src="${CAR_IMG}" style="width:100%;height:100%;object-fit:contain;">
      </div>
      <div style="display:flex;align-items:center;gap:5px;justify-content:center;margin-top:2px;">
        <img src="${TIRE_IMG}" style="height:40px;object-fit:contain;">
        <div style="font-size:7pt;"><strong>TIRE:</strong> _____________</div>
      </div>
      ${checklist}
      <div style="margin-top:5px;border:1px solid #ccc;padding:3px;min-height:35px;font-size:7pt;">
        <strong>ACCESSORIES:</strong> ${accessories}
      </div>
    </div>`;

  const returnCol = `
    <div style="width:50%;padding-left:10px;display:flex;flex-direction:column;">
      <div style="background:#eee;font-weight:bold;padding:5px;text-align:center;font-size:9pt;
        border-bottom:1px solid #000;margin-bottom:5px;text-transform:uppercase;">
        RETURN CHECK (End of Rental)
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:7pt;margin-bottom:5px;">
        <tr style="background:#eee;">
          <th style="border:1px solid #000;padding:3px;">KM IN (${kmInfo.en} Max)</th>
          <td style="border:1px solid #000;padding:3px;">____________________</td>
        </tr>
        <tr style="background:#eee;">
          <th style="border:1px solid #000;padding:3px;">FUEL LEVEL</th>
          <td style="border:1px solid #000;padding:3px;font-size:6.5pt;">
            [ ] Full [ ] 3/4 [ ] 1/2 [ ] 1/4 [ ] Empty
          </td>
        </tr>
      </table>
      <div style="text-align:center;font-size:7pt;font-weight:bold;margin-bottom:3px;">MARK NEW DAMAGES:</div>
      <div style="width:100%;aspect-ratio:960/618;display:flex;align-items:center;justify-content:center;margin-bottom:2px;">
        <img src="${CAR_IMG}" style="width:100%;height:100%;object-fit:contain;">
      </div>
      <div style="display:flex;align-items:center;gap:5px;justify-content:center;margin-top:2px;">
        <img src="${TIRE_IMG}" style="height:40px;object-fit:contain;">
        <div style="font-size:7pt;"><strong>TIRE:</strong> _____________</div>
      </div>
      ${checklist}
      <div style="border:1px solid #000;margin-top:5px;padding:3px;">
        <div style="background:#000;color:#fff;font-weight:bold;font-size:7.5pt;padding:2px 4px;margin-bottom:3px;">
          FINAL SETTLEMENT
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:8pt;">
          <tr>
            <th style="border:1px solid #000;padding:3px;">Item</th>
            <th style="border:1px solid #000;padding:3px;">Rate \u00d7 Qty</th>
            <th style="border:1px solid #000;padding:3px;">Total EGP</th>
          </tr>
          ${['Excess KM','Late Return','Cleaning Fees','Fuel Shortage','Traffic Fines','New Damages'].map(item =>
            '<tr><td style="border:1px solid #000;padding:3px;">' + item + '</td>' +
            '<td style="border:1px solid #000;padding:3px;text-align:center;">___ \u00d7 ___</td>' +
            '<td style="border:1px solid #000;padding:3px;text-align:right;">___________</td></tr>'
          ).join('')}
          <tr style="font-weight:bold;background:#f0f0f0;">
            <td colspan="2" style="border:1px solid #000;padding:3px;text-align:right;">TOTAL DEDUCTIONS:</td>
            <td style="border:1px solid #000;padding:3px;text-align:right;">________ EGP</td>
          </tr>
        </table>
      </div>
      <div style="font-size:7.5pt;font-weight:bold;margin-top:5px;border:1px solid #000;
        padding:3px;background:#fff3e0;">
        If RETURN CHECK is not signed, Lessee retains full liability.
      </div>
    </div>`;

  return `
    <div style="${_pageStyle()}">
      ${_watermark()}
      <div style="position:relative;z-index:2;height:100%;display:flex;flex-direction:column;">
        <div style="display:flex;justify-content:space-between;align-items:center;
          border-bottom:1px solid #04509D;padding-bottom:6px;margin-bottom:8px;">
          <strong style="font-size:13pt;color:#04509D;">VISUAL INSPECTION REPORT</strong>
          <span style="font-size:9pt;color:#555;">Contract: ${d.ref} | Date: ${today} | Page 3/4</span>
        </div>
        <div style="display:flex;width:100%;gap:0;flex:1;">
          ${pickupCol}
          ${returnCol}
        </div>
        <div style="margin-top:auto;border-top:2px solid #000;padding-top:10px;">
          <div style="display:flex;justify-content:space-between;text-align:center;font-weight:bold;font-size:10pt;">
            <div style="width:30%;">PICKUP — Lessee<br><br><br>____________________
              <div style="font-size:8pt;margin-top:5px;">Date: .............</div>
            </div>
            <div style="width:30%;">RETURN — Lessee<br><br><br>____________________
              <div style="font-size:8pt;margin-top:5px;">Date: .............</div>
            </div>
            <div style="width:30%;">RETURN — Employee<br><br><br>____________________</div>
          </div>
        </div>
      </div>
    </div>`;
}

// ============================================================
// AR CONTRACT — PAGE LOAD
// ============================================================
window.loadARContract = async function () {
  const wrap = document.getElementById('page-ar-contract');
  if (!wrap) return;

  wrap.innerHTML = `
    <div style="display:grid;grid-template-columns:420px 1fr;gap:18px;align-items:start;">
      <div class="panel sticky-panel"
        style="max-height:calc(100vh - 120px);overflow-y:auto;direction:rtl;">

        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:13px;">
          <h3 style="font-size:13px;font-weight:800;">📝 عقد جديد</h3>
          <span id="ar-ref-preview" style="font-size:10px;color:var(--accent);font-weight:700;"></span>
        </div>

        <!-- ① Branch & Mode -->
        <div style="margin-bottom:13px;">
          <div style="font-size:10px;font-weight:800;color:var(--accent);text-transform:uppercase;
            margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid var(--border);">
            ① الفرع ونظام الإيجار
          </div>
          <div class="form-grid">
            <div class="field"><label>فرع الإصدار</label>
              <select id="ar-branch">
                <option value="HRG">فرع الغردقة</option>
                <option value="ALX">الإسكندرية (المركز الرئيسي)</option>
                <option value="CAI">فرع القاهرة</option>
                <option value="RSH">فرع رشيد</option>
              </select>
            </div>
            <div class="field"><label>نظام الإيجار</label>
              <select id="ar-mode" onchange="arCalc()">
                <option value="Daily">يومي</option>
                <option value="Monthly">شهري</option>
              </select>
            </div>
            <div class="field"><label>نوع الاتفاقية</label>
              <select id="ar-agr" onchange="arTogglePrev()">
                <option value="new">اتفاقية جديدة</option>
                <option value="extension">تمديد</option>
              </select>
            </div>
            <div class="field" id="ar-prev-wrap" style="display:none;">
              <label>رقم العقد السابق</label>
              <input type="text" id="ar-prev-con"/>
            </div>
          </div>
        </div>

        <!-- ② Vehicle -->
        <div style="margin-bottom:13px;">
          <div style="font-size:10px;font-weight:800;color:var(--accent);text-transform:uppercase;
            margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid var(--border);">
            ② تفاصيل المركبة
          </div>
          <div class="field" style="margin-bottom:7px;">
            <label>اختر من الأسطول</label>
            <select id="ar-car" onchange="arSelectCar()">
              <option value="">-- اختر السيارة --</option>
            </select>
          </div>
          <div id="ar-car-badge" class="car-info-badge"></div>
          <div class="form-grid" style="margin-top:7px;">
            <div class="field"><label>عداد الخروج</label>
              <input type="number" id="ar-km-out"/></div>
            <div class="field"><label>مستوى الوقود</label>
              <select id="ar-fuel">
                <option value="ممتلئ (8/8)">ممتلئ (8/8)</option>
                <option value="3/4">3/4</option>
                <option value="1/2">1/2</option>
                <option value="1/4">1/4</option>
                <option value="احتياطي">احتياطي</option>
              </select>
            </div>
            <div class="field"><label>الإيجار اليومي (ج.م)</label>
              <input type="number" id="ar-daily" placeholder="0" oninput="arCalc()"/></div>
            <div class="field"><label>رسوم التأمين (يومي)</label>
              <input type="number" id="ar-ins-fee" value="0" oninput="arCalc()"/></div>
          </div>
        </div>

        <!-- ③ Client -->
        <div style="margin-bottom:13px;">
          <div style="font-size:10px;font-weight:800;color:var(--accent);text-transform:uppercase;
            margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid var(--border);">
            ③ بيانات العميل
          </div>
          <div class="crm-search-wrap">
            <div class="crm-search-header">🔍 بحث وتعبئة تلقائية
              <span id="ar-crm-id" style="display:none;"></span>
            </div>
            <div class="crm-input-row">
              <input type="text" id="ar-client-search"
                placeholder="الاسم، جواز السفر، الهاتف..." oninput="crmSearch('ar')"/>
            </div>
            <div class="crm-actions">
              <button class="crm-action-btn new" onclick="openAddCustomerModal()">+ جديد</button>
              <button class="crm-action-btn edit" id="ar-edit-btn" style="display:none;"
                onclick="crmEditMode('ar')">✏️</button>
              <button class="crm-action-btn save" id="ar-save-btn" style="display:none;"
                onclick="crmSaveEdit('ar')">💾</button>
              <button class="crm-action-btn cancel" id="ar-cancel-btn" style="display:none;"
                onclick="crmCancelEdit('ar')">✕</button>
            </div>
            <div class="crm-suggestions" id="ar-suggestions"></div>
          </div>
          <div class="form-grid">
            <div class="field"><label>الاسم الأول *</label>
              <input type="text" id="ar-fname" readonly/></div>
            <div class="field"><label>اللقب *</label>
              <input type="text" id="ar-lname" readonly/></div>
            <div class="field"><label>جواز السفر / الهوية *</label>
              <input type="text" id="ar-passport" readonly/></div>
            <div class="field"><label>الجنسية</label>
              <input type="text" id="ar-nationality" readonly/></div>
            <div class="field"><label>الهاتف</label>
              <input type="text" id="ar-phone" readonly/></div>
            <div class="field"><label>البريد الإلكتروني</label>
              <input type="text" id="ar-email" readonly/></div>
            <div class="field"><label>رخصة القيادة *</label>
              <input type="text" id="ar-license" readonly/></div>
            <div class="field"><label>العنوان</label>
              <input type="text" id="ar-address" readonly/></div>
          </div>
        </div>

        <!-- ④ Dates -->
        <div style="margin-bottom:13px;">
          <div style="font-size:10px;font-weight:800;color:var(--accent);text-transform:uppercase;
            margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid var(--border);">
            ④ التواريخ والمواقع
          </div>
          <div class="form-grid">
            <div class="field"><label>تاريخ/وقت الاستلام</label>
              <input type="datetime-local" id="ar-pickup" onchange="arCalc()"/></div>
            <div class="field"><label>تاريخ/وقت التسليم</label>
              <input type="datetime-local" id="ar-dropoff" onchange="arCalc()"/></div>
            <div class="field"><label>نوع مكان الاستلام</label>
              <select id="ar-ploc-type">
                <option>المكتب</option><option>المطار</option><option>الفندق</option>
              </select>
            </div>
            <div class="field"><label>تفاصيل مكان الاستلام</label>
              <input type="text" id="ar-ploc-addr"/></div>
            <div class="field"><label>نوع مكان التسليم</label>
              <select id="ar-dloc-type">
                <option>المكتب</option><option>المطار</option><option>الفندق</option>
              </select>
            </div>
            <div class="field"><label>تفاصيل مكان التسليم</label>
              <input type="text" id="ar-dloc-addr"/></div>
          </div>
        </div>

        <!-- ⑤ Payments -->
        <div style="margin-bottom:13px;">
          <div style="font-size:10px;font-weight:800;color:var(--accent);text-transform:uppercase;
            margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid var(--border);">
            ⑤ المدفوعات
          </div>
          <div class="form-grid g3" style="margin-bottom:7px;">
            <div class="field"><label>ج.م</label>
              <input type="number" id="ar-paid-egp" value="0" oninput="arCalc()"/></div>
            <div class="field"><label>دولار</label>
              <input type="number" id="ar-paid-usd" value="0" oninput="arCalc()"/></div>
            <div class="field"><label>يورو</label>
              <input type="number" id="ar-paid-eur" value="0" oninput="arCalc()"/></div>
          </div>
          <div class="form-grid" style="margin-bottom:10px;">
            <div class="field"><label>بطاقة (ج.م)</label>
              <input type="number" id="ar-paid-card" value="0" oninput="arCalc()"/></div>
            <div class="field"><label>رسوم التوصيل</label>
              <input type="number" id="ar-del-fee" value="0" oninput="arCalc()"/></div>
            <div class="field"><label>رسوم الاستلام</label>
              <input type="number" id="ar-pick-fee" value="0" oninput="arCalc()"/></div>
            <div class="field"><label>التأمين المطلوب</label>
              <input type="number" id="ar-req-dep" value="0" oninput="arCalc()"/></div>
          </div>
          <div class="form-grid g3" style="margin-bottom:7px;">
            <div class="field"><label>تأمين ج.م</label>
              <input type="number" id="ar-dep-egp" value="0" oninput="arCalc()"/></div>
            <div class="field"><label>تأمين دولار</label>
              <input type="number" id="ar-dep-usd" value="0" oninput="arCalc()"/></div>
            <div class="field"><label>تأمين يورو</label>
              <input type="number" id="ar-dep-eur" value="0" oninput="arCalc()"/></div>
          </div>
          <div class="form-grid">
            <div class="field"><label>تأمين بطاقة (ج.م)</label>
              <input type="number" id="ar-dep-card" value="0" oninput="arCalc()"/></div>
          </div>
        </div>

        <!-- ⑥ Packages -->
        <div style="margin-bottom:13px;">
          <div style="font-size:10px;font-weight:800;color:var(--accent);text-transform:uppercase;
            margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid var(--border);">
            ⑥ الباقات
          </div>
          <div class="form-grid">
            <div class="field"><label>باقة التأمين</label>
              <select id="ar-ins-pkg">
                <option value="No Insurance">بدون تأمين</option>
                <option value="Basic">أساسي</option>
                <option value="Intermediate">متوسط</option>
                <option value="Full Protection">حماية كاملة</option>
              </select>
            </div>
            <div class="field"><label>باقة الكيلومترات</label>
              <select id="ar-km-pkg" onchange="arCalc()">
                <option value="standard">قياسي (120 كم/يوم)</option>
                <option value="500">500 كم إضافي</option>
                <option value="750">750 كم إضافي</option>
                <option value="1000">1000 كم إضافي</option>
                <option value="1500">باقة 1500 كم</option>
                <option value="2000">باقة 2000 كم</option>
                <option value="3000">باقة 3000 كم</option>
                <option value="unlimited">مفتوح</option>
              </select>
            </div>
            <div class="field"><label>تكلفة باقة كم (ج.م)</label>
              <input type="number" id="ar-km-cost" value="0" oninput="arCalc()"/></div>
          </div>
        </div>

        <!-- AR Estimate -->
        <div style="background:var(--surface2);border:1px solid var(--border);
          border-radius:9px;padding:11px;margin-bottom:13px;">
          <div style="font-size:10px;color:var(--text3);font-weight:700;
            margin-bottom:7px;text-transform:uppercase;">تقدير الإيجار</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:11px;">
            <span style="color:var(--text3);">الأساسي:</span>
            <span id="ar-est-base" style="font-weight:700;">£0.00</span>
            <span style="color:var(--text3);">الأيام:</span>
            <span id="ar-est-days">0</span>
            <span style="color:var(--text3);">رسوم:</span>
            <span id="ar-est-fees">£0.00</span>
          </div>
          <div style="border-top:1px solid var(--border);margin-top:8px;padding-top:7px;
            display:flex;justify-content:space-between;">
            <span style="font-weight:700;">الإجمالي</span>
            <span id="ar-est-total"
              style="font-size:15px;font-weight:900;color:var(--accent);">£0.00</span>
          </div>
          <div style="border-top:1px solid var(--border);margin-top:7px;padding-top:7px;font-size:11px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
              <span style="color:var(--text3);">التأمين:</span>
              <span id="ar-dep-target">£0.00</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
              <span style="color:var(--text3);">المدفوع:</span>
              <span id="ar-paid-now" style="color:var(--success);">£0.00</span>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span style="color:var(--text3);">المتبقي:</span>
              <span id="ar-pending" style="color:var(--warning);">£0.00</span>
            </div>
          </div>
        </div>

        <button class="btn btn-primary btn-full" onclick="generateARContract()">
          📝 إنشاء العقد (4 صفحات)
        </button>
        <button class="btn btn-ghost btn-full mt-8" onclick="clearContractForm('ar')">
          ✕ مسح النموذج
        </button>
      </div>

      <!-- RIGHT: Output -->
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
        <div id="ar-placeholder" class="empty-state" style="padding:80px 20px;">
          <div style="font-size:40px;margin-bottom:11px;">📝</div>
          <p>املأ النموذج واضغط إنشاء العقد</p>
        </div>
      </div>
    </div>`;

  populateFleetDropdowns();
};

// ============================================================
// AR CALCULATIONS
// ============================================================
window.arCalc = function () {
  const daily   = parseFloat(document.getElementById('ar-daily')?.value)     || 0;
  const insFee  = parseFloat(document.getElementById('ar-ins-fee')?.value)   || 0;
  const kmCost  = parseFloat(document.getElementById('ar-km-cost')?.value)   || 0;
  const delFee  = parseFloat(document.getElementById('ar-del-fee')?.value)   || 0;
  const pickFee = parseFloat(document.getElementById('ar-pick-fee')?.value)  || 0;
  const pEGP    = parseFloat(document.getElementById('ar-paid-egp')?.value)  || 0;
  const pUSD    = parseFloat(document.getElementById('ar-paid-usd')?.value)  || 0;
  const pEUR    = parseFloat(document.getElementById('ar-paid-eur')?.value)  || 0;
  const pCard   = parseFloat(document.getElementById('ar-paid-card')?.value) || 0;
  const reqDep  = parseFloat(document.getElementById('ar-req-dep')?.value)   || 0;
  const pickup  = document.getElementById('ar-pickup')?.value;
  const dropoff = document.getElementById('ar-dropoff')?.value;

  let days = 0;
  if (pickup && dropoff) {
    days = Math.max(0, Math.ceil((new Date(dropoff) - new Date(pickup)) / 86400000));
  }

  const base    = daily * days;
  const insT    = insFee * days;
  const fees    = delFee + pickFee + kmCost + insT;
  const total   = base + fees;
  const paidNow = pEGP + (pUSD * G.ratesUSD) + (pEUR * G.ratesEUR) + pCard;
  const pending = total - paidNow;

  const s = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  s('ar-est-base',  fmtMoney(base));
  s('ar-est-days',  String(days));
  s('ar-est-fees',  fmtMoney(fees));
  s('ar-est-total', fmtMoney(total));
  s('ar-dep-target',fmtMoney(reqDep));
  s('ar-paid-now',  fmtMoney(paidNow));
  s('ar-pending',   fmtMoney(Math.max(0, pending)));

  return { days, base, insT, kmCost, delFee, pickFee, drT:0, stT:0, fees, total,
           paidNow, pending, daily, insFee, drRate:250, stRate:250, addDr:false, addSt:false,
           pEGP, pUSD, pEUR, pCard, reqDep };
};

window.arTogglePrev = function () {
  const agr  = document.getElementById('ar-agr')?.value;
  const wrap = document.getElementById('ar-prev-wrap');
  if (wrap) wrap.style.display = agr === 'extension' ? 'flex' : 'none';
};

window.arSelectCar = async function () {
  const carId = document.getElementById('ar-car')?.value;
  if (typeof showCarInfoBadge === 'function') showCarInfoBadge(carId, 'ar-car-badge');
  if (carId) await prefillDailyRate(carId, 'ar-daily');
  arCalc();
};

// ============================================================
// GENERATE AR CONTRACT
// ============================================================
window.generateARContract = async function () {
  const fname  = (document.getElementById('ar-fname')?.value  || '').trim();
  const lname  = (document.getElementById('ar-lname')?.value  || '').trim();
  const carId  = document.getElementById('ar-car')?.value;
  const pickup = document.getElementById('ar-pickup')?.value;
  const dropoff= document.getElementById('ar-dropoff')?.value;
  const daily  = parseFloat(document.getElementById('ar-daily')?.value) || 0;

  if (!fname || !lname) { toast('اسم العميل مطلوب.', 'error'); return; }
  if (!pickup || !dropoff) { toast('التواريخ مطلوبة.', 'error'); return; }
  if (daily <= 0) { toast('الإيجار اليومي يجب أن يكون أكبر من صفر.', 'error'); return; }

  const branchCode = document.getElementById('ar-branch')?.value || G.user?.branch || 'GEN';
  const mode       = document.getElementById('ar-mode')?.value   || 'Daily';
  const agr        = document.getElementById('ar-agr')?.value    || 'new';
  const prevCon    = (document.getElementById('ar-prev-con')?.value || '').trim();
  const ref        = await generateDocRef('CN', branchCode);
  document.getElementById('ar-ref-preview').textContent = ref;

  const car      = getCarById(carId);
  const carLabel = car ? getCarLabel(car, 'ar') : (carId || '-');
  const plate    = car ? (car.plate || formatPlate(car)) : '';
  const carColor = car?.['اللون'] || car?.Color || '';
  const carVin   = car?.chassis || car?.['رقم الشاسيه'] || car?.['رقم الشاسية'] || '';
  const carMotor = car?.['رقم الموتور'] || '';
  const carYear  = car?.year || car?.['سنة الصنع'] || '';
  const poaNum   = car?.poa_n || car?.['رقم التوكيل'] || '';
  const poaChar  = car?.poa_c || car?.['حرف التوكيل'] || '';
  const poaDate  = car?.poa_d || car?.['تاريخ التوكيل'] || '';

  const calc = arCalc();
  const { days, base, insT, kmCost, delFee, pickFee,
          drT, stT, fees, total, paidNow, pending,
          daily:dly, insFee, pEGP, pUSD, pEUR, pCard, reqDep } = calc;

  const dEGP  = parseFloat(document.getElementById('ar-dep-egp')?.value)  || 0;
  const dUSD  = parseFloat(document.getElementById('ar-dep-usd')?.value)  || 0;
  const dEUR  = parseFloat(document.getElementById('ar-dep-eur')?.value)  || 0;
  const dCard = parseFloat(document.getElementById('ar-dep-card')?.value) || 0;
  const depHeld = dEGP + (dUSD * G.ratesUSD) + (dEUR * G.ratesEUR) + dCard;

  const insPkg    = document.getElementById('ar-ins-pkg')?.value    || 'Basic';
  const kmPkg     = document.getElementById('ar-km-pkg')?.value     || 'standard';
  const plocType  = document.getElementById('ar-ploc-type')?.value  || 'المكتب';
  const plocAddr  = (document.getElementById('ar-ploc-addr')?.value || '').trim();
  const dlocType  = document.getElementById('ar-dloc-type')?.value  || 'المكتب';
  const dlocAddr  = (document.getElementById('ar-dloc-addr')?.value || '').trim();
  const kmCostVal = parseFloat(document.getElementById('ar-km-cost')?.value) || 0;

  // Build payment strings
  const rentParts = [];
  if (pEGP  > 0) rentParts.push(pEGP.toLocaleString('ar-EG') + ' كاش (ج.م)');
  if (pUSD  > 0) rentParts.push(pUSD + ' دولار (سعر: ' + G.ratesUSD.toFixed(2) + ')');
  if (pEUR  > 0) rentParts.push(pEUR + ' يورو (سعر: ' + G.ratesEUR.toFixed(2) + ')');
  if (pCard > 0) rentParts.push(pCard.toLocaleString('ar-EG') + ' بطاقة (ج.م)');
  const rentPayStr = rentParts.join(' + ');

  const depParts = [];
  if (dEGP  > 0) depParts.push(dEGP.toLocaleString('ar-EG') + ' ج.م');
  if (dUSD  > 0) depParts.push(dUSD + ' دولار');
  if (dEUR  > 0) depParts.push(dEUR + ' يورو');
  if (dCard > 0) depParts.push(dCard.toLocaleString('ar-EG') + ' بطاقة');
  const depPayStr = depParts.join(' + ');

  // Save to Firestore
  try {
    await db.collection('bookings').doc(ref).set({
      'No.'                                : ref,
      'اسم العميل'                         : fname + ' ' + lname,
      'اسم السيارة'                        : carLabel,
      'كود السيارة'                        : String(carId || ''),
      'بداية التعاقد'                      : pickup,
      'نهاية التعاقد'                      : dropoff,
      'سعر السيارة اليومي بالجنيه المصري' : fmtMoney(daily),
      'إجمالي المستحق (Total)'             : fmtMoney(total),
      'المدفوع EGP'                        : String(pEGP),
      'حالة الطلب'                         : 'Active',
      closed                               : false,
      'فرع الإصدار'                        : branchCode,
      assigned_user                        : G.user?.username || '',
      rental_days                          : String(days),
      'مكان الاستلام'                      : plocType + (plocAddr ? ' - ' + plocAddr : ''),
      'مكان التسليم'                       : dlocType + (dlocAddr ? ' - ' + dlocAddr : ''),
      insurance_plan                       : insPkg,
      km_package                           : kmPkg,
      _sys_updated                         : Date.now()
    });

    if (pEGP  > 0) await autoCreateReceipt(ref, ref, pEGP,              'EGP',  fname + ' ' + lname, carLabel, branchCode);
    if (pUSD  > 0) await autoCreateReceipt(ref, ref, pUSD * G.ratesUSD, 'USD',  fname + ' ' + lname, carLabel, branchCode);
    if (pEUR  > 0) await autoCreateReceipt(ref, ref, pEUR * G.ratesEUR, 'EUR',  fname + ' ' + lname, carLabel, branchCode);
    if (pCard > 0) await autoCreateReceipt(ref, ref, pCard,             'Card', fname + ' ' + lname, carLabel, branchCode);

    await logAction('GENERATE', 'Arabic Contract',
      'Contract ' + ref + ' for ' + fname + ' ' + lname + ' | ' + carLabel + ' | ' + fmtMoney(total));
    toast('العقد ' + ref + ' تم حفظه!', 'success', 6000);
  } catch (e) {
    toast('تحذير: فشل الحفظ. ' + e.message, 'warning');
  }

  const contractData = {
    ref, branchCode, mode, agr, prevCon,
    fname, lname,
    passport   : (document.getElementById('ar-passport')?.value    || '').trim(),
    nationality: (document.getElementById('ar-nationality')?.value || '').trim(),
    phone      : (document.getElementById('ar-phone')?.value       || '').trim(),
    email      : (document.getElementById('ar-email')?.value       || '').trim(),
    license    : (document.getElementById('ar-license')?.value     || '').trim(),
    address    : (document.getElementById('ar-address')?.value     || '').trim(),
    addDrName  : '',
    addDrLic   : '',
    carLabel, plate, carColor, carVin, carMotor, carYear,
    poaNum, poaChar, poaDate,
    kmOut     : document.getElementById('ar-km-out')?.value || '',
    fuelLevel : document.getElementById('ar-fuel')?.value   || 'ممتلئ (8/8)',
    pickup, dropoff, days,
    plocType, plocAddr, dlocType, dlocAddr,
    daily, insFee, kmCostVal, delFee, pickFee,
    addDr:false, drRate:250, addSt:false, stRate:250,
    base, insT, drT:0, stT:0, fees, total,
    paidNow, pending,
    pEGP, pUSD, pEUR, pCard,
    dEGP, dUSD, dEUR, dCard, depHeld, reqDep,
    rentPayStr, depPayStr,
    insPkg, kmPkg
  };

  const pagesEl = document.getElementById('ar-contract-pages');
  if (pagesEl) pagesEl.innerHTML = _buildARContractPages(contractData);
  document.getElementById('ar-output').style.display      = 'block';
  document.getElementById('ar-placeholder').style.display = 'none';
};

// ============================================================
// BUILD AR CONTRACT PAGES
// ============================================================
function _buildARContractPages(d) {
  const now        = new Date();
  const today      = now.toLocaleDateString('ar-EG');
  const weekday    = now.toLocaleDateString('ar-EG', { weekday:'long' });
  const branchName = BRANCH_AR_NAMES[d.branchCode] || d.branchCode;
  const poaText    = d.poaNum
    ? 'بموجب التوكيل رقم (' + d.poaNum + ')' +
      (d.poaChar ? ' حرف ' + d.poaChar : '') +
      (d.poaDate ? ' بتاريخ ' + d.poaDate : '')
    : '';

  const insNamesAr = {
    'Basic':'تأمين أساسي', 'Intermediate':'تأمين متوسط',
    'Full Protection':'حماية كاملة', 'No Insurance':'بدون تأمين'
  };
  const insNameAr = insNamesAr[d.insPkg] || 'تأمين أساسي';

  const simpleInsTextAr = {
    'Basic'         : 'تأمين أساسي: مسؤولية العميل 100%.',
    'Intermediate'  : 'تأمين متوسط: مسؤولية العميل 70% / الشركة 30%.',
    'Full Protection': 'حماية كاملة: إعفاء كامل (تطبق الحدود القصوى).',
    'No Insurance'  : 'بدون تأمين: مسؤولية العميل 100%.'
  };

  const insColor  = _insColorStyle(d.insPkg);
  const insDetail = INS_DETAILS_AR[d.insPkg] || INS_DETAILS_AR['Basic'];
  const kmInfo    = _kmAllowed(d.kmPkg, d.days);
  const pText     = d.plocType + (d.plocAddr ? ' (' + d.plocAddr + ')' : '');
  const dText     = d.dlocType + (d.dlocAddr ? ' (' + d.dlocAddr + ')' : '');
  const rateTxt   = d.mode === 'Monthly'
    ? d.daily.toLocaleString('ar-EG') + ' \u00d7 ' + Math.ceil(d.days / 30) + ' شهر'
    : d.daily.toLocaleString('ar-EG') + ' \u00d7 ' + d.days + ' يوم';
  const baseAmt   = d.mode === 'Monthly' ? d.daily * Math.ceil(d.days / 30) : d.base;
  const extHtml   = d.agr === 'extension' && d.prevCon
    ? '<div style="font-size:10pt;font-weight:bold;margin-top:3px;">(تمديد للعقد رقم ' + d.prevCon + ')</div>' : '';
  const checklist = _inspectionChecklist('ar');

  const termBlock = (title, text) =>
    '<div style="margin-bottom:10px;break-inside:avoid;">' +
    '<strong style="display:block;font-size:8.5pt;color:#04509D;' +
    'border-bottom:1px solid #999;padding-bottom:2px;margin-bottom:3px;">' + title + '</strong>' +
    '<div style="font-size:7.5pt;line-height:1.3;">' + text + '</div>' +
    '</div>';

  const page1 = `
    <div style="${_pageStyle('rtl')}">
      ${_watermark()}
      <div style="position:relative;z-index:2;height:100%;display:flex;flex-direction:column;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;
          border-bottom:2px solid #04509D;padding-bottom:10px;margin-bottom:10px;">
          <img src="${LOGO}" style="width:180px;height:auto;object-fit:contain;">
          <div style="text-align:center;">
            <h1 style="margin:0;font-size:17pt;color:#04509D;">عقد تأجير سيارة (رسمي)</h1>
            <div style="font-weight:bold;font-size:11pt;">${d.ref}</div>
            ${extHtml}
          </div>
          <div style="font-size:8pt;color:#555;line-height:1.4;text-align:left;">
            <strong>إدارة بروذر إيجي Brothers EGY</strong><br>
            بطاقة ضريبية: 589-464-418<br>
            سجل تجاري: 10770 | الفرع: ${d.branchCode}
          </div>
        </div>

        <div style="font-size:9pt;margin-bottom:8px;font-weight:bold;
          border-bottom:1px solid #000;padding-bottom:5px;">
          إنه في يوم: ${weekday} | الموافق: ${today}<br>
          تم تحرير هذا العقد بين كل من:
        </div>

        <div style="border:1px solid #000;padding:8px;margin-bottom:8px;
          position:relative;border-radius:3px;">
          <div style="background:#000;color:white;padding:1px 8px;font-weight:bold;
            font-size:8pt;position:absolute;top:-10px;right:8px;">الأطراف</div>
          <div style="font-size:8.5pt;line-height:1.4;padding-top:5px;">
            <strong>أولاً (المؤجر):</strong> شركة الأخوة المتحدون (أي جي) ${poaText}.<br>
            <strong>ثانياً (المستأجر):</strong>
            السيد/ <strong>${d.fname} ${d.lname}</strong><br>
            جواز سفر: ${d.passport || '—'} | الجنسية: ${d.nationality || '—'} | هاتف: ${d.phone || '—'}<br>
            العنوان: ${d.address || '—'} | رخصة قيادة: ${d.license || '—'}
          </div>
        </div>

        <div style="border:1px solid #000;padding:8px;margin-bottom:8px;
          position:relative;border-radius:3px;">
          <div style="background:#000;color:white;padding:1px 8px;font-weight:bold;
            font-size:8pt;position:absolute;top:-10px;right:8px;">بيانات السيارة</div>
          <table style="width:100%;border-collapse:collapse;font-size:8.5pt;margin-top:5px;">
            <tr>
              <th style="border:1px solid #000;padding:4px;background:#f0f0f0;">نوع السيارة</th>
              <td style="border:1px solid #000;padding:4px;">${d.carLabel}</td>
              <th style="border:1px solid #000;padding:4px;background:#f0f0f0;">الموديل</th>
              <td style="border:1px solid #000;padding:4px;">${d.carYear || '—'}</td>
              <th style="border:1px solid #000;padding:4px;background:#f0f0f0;">اللوحة</th>
              <td style="border:1px solid #000;padding:4px;font-weight:bold;">${d.plate || '—'}</td>
            </tr>
            <tr>
              <th style="border:1px solid #000;padding:4px;background:#f0f0f0;">موتور</th>
              <td style="border:1px solid #000;padding:4px;">${d.carMotor || '—'}</td>
              <th style="border:1px solid #000;padding:4px;background:#f0f0f0;">شاسيه</th>
              <td style="border:1px solid #000;padding:4px;">${d.carVin || '—'}</td>
              <th style="border:1px solid #000;padding:4px;background:#f0f0f0;">العداد</th>
              <td style="border:1px solid #000;padding:4px;">${d.kmOut || '—'}</td>
            </tr>
          </table>
        </div>

        <div style="border:1px solid #000;padding:8px;margin-bottom:8px;
          position:relative;border-radius:3px;">
          <div style="background:#000;color:white;padding:1px 8px;font-weight:bold;
            font-size:8pt;position:absolute;top:-10px;right:8px;">الفترة والبيان المالي</div>
          <table style="width:100%;border-collapse:collapse;font-size:8.5pt;margin-top:5px;">
            <tr>
              <th style="border:1px solid #000;padding:4px;background:#f0f0f0;">تاريخ الاستلام</th>
              <td style="border:1px solid #000;padding:4px;">${d.pickup.replace('T', ' ')}</td>
              <th style="border:1px solid #000;padding:4px;background:#f0f0f0;">تاريخ التسليم</th>
              <td style="border:1px solid #000;padding:4px;">${d.dropoff.replace('T', ' ')}</td>
              <th style="border:1px solid #000;padding:4px;background:#f0f0f0;">المدة</th>
              <td style="border:1px solid #000;padding:4px;font-weight:bold;">${d.days} يوم</td>
            </tr>
            <tr>
              <th style="border:1px solid #000;padding:4px;background:#f0f0f0;">مكان الاستلام</th>
              <td style="border:1px solid #000;padding:4px;">${pText}</td>
              <th style="border:1px solid #000;padding:4px;background:#f0f0f0;">مكان التسليم</th>
              <td style="border:1px solid #000;padding:4px;">${dText}</td>
              <th style="border:1px solid #000;padding:4px;background:#f0f0f0;">المسموح</th>
              <td style="border:1px solid #000;padding:4px;font-weight:bold;">${kmInfo.ar}</td>
            </tr>
            <tr>
              <th style="border:1px solid #000;padding:4px;background:#f0f0f0;">القيمة الإيجارية</th>
              <td style="border:1px solid #000;padding:4px;">${rateTxt}</td>
              <th style="border:1px solid #000;padding:4px;background:#f0f0f0;">الإجمالي</th>
              <td style="border:1px solid #000;padding:4px;font-weight:bold;font-size:11pt;
                color:#04509D;" colspan="3">
                ${Math.round(d.total).toLocaleString('ar-EG')} ج.م
              </td>
            </tr>
          </table>
          <div style="${insColor}padding:5px;text-align:center;font-size:8.5pt;margin-top:4px;border-radius:4px;">
            ${simpleInsTextAr[d.insPkg] || simpleInsTextAr['Basic']}
          </div>
          <div style="background:#eee;padding:5px;text-align:center;font-size:8.5pt;margin-top:3px;">
            مدفوع الآن: <strong>${Math.round(d.paidNow).toLocaleString('ar-EG')} ج.م</strong>
            ${d.rentPayStr ? '<span style="font-size:8pt;"> (' + d.rentPayStr + ')</span>' : ''}<br>
            <span style="color:${d.pending > 0 ? '#c0392b' : '#27ae60'};font-weight:bold;">
              المتبقي: ${Math.max(0, Math.round(d.pending)).toLocaleString('ar-EG')} ج.م
            </span>
          </div>
        </div>

        ${d.depHeld > 0 ? `
          <div style="border:2px solid orange;padding:5px;margin-bottom:8px;font-size:8.5pt;border-radius:3px;">
            <strong>التأمين المحتجز:</strong>
            <strong>${Math.round(d.depHeld).toLocaleString('ar-EG')} ج.م</strong>
            ${d.depPayStr ? '<span style="font-size:8pt;"> (' + d.depPayStr + ')</span>' : ''}
          </div>` : ''}

        <div style="margin-top:auto;border-top:2px solid #000;padding-top:8px;">
          <div style="display:flex;justify-content:space-between;text-align:center;font-weight:bold;font-size:10pt;">
            <div style="width:40%;">توقيع المؤجر<br><br><br>____________________
              <div style="font-size:9pt;margin-top:5px;">التاريخ: .............</div>
            </div>
            <div style="width:40%;">توقيع المستأجر<br><br><br>____________________
              <div style="font-size:9pt;margin-top:5px;">التاريخ: .............</div>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  const page2 = `
    <div style="${_pageStyle('rtl')}">
      ${_watermark()}
      <div style="position:relative;z-index:2;height:100%;display:flex;flex-direction:column;">
        <div style="display:flex;justify-content:space-between;align-items:center;
          border-bottom:1px solid #04509D;padding-bottom:6px;margin-bottom:10px;">
          <strong style="font-size:13pt;color:#04509D;">البنود العامة للشروط والأحكام</strong>
          <span style="font-size:9pt;color:#555;">العقد: ${d.ref} | صفحة 2/4</span>
        </div>
        <div style="font-size:8.5pt;column-count:2;column-gap:20px;line-height:1.3;flex-grow:1;">
          ${TERMS_AR.slice(0, 9).map((t, i) =>
            termBlock((i + 1) + '. ' + t.title, t.text)
          ).join('')}
          <div style="border:2px solid #e67e22;padding:5px;background:#fff8e1;
            break-inside:avoid;margin-bottom:10px;">
            <strong style="display:block;font-size:8.5pt;color:#e67e22;
              border-bottom:1px solid #e67e22;padding-bottom:2px;margin-bottom:4px;">
              10. باقة التأمين: ${insNameAr}
            </strong>
            <div style="font-size:7.5pt;line-height:1.3;">${insDetail}</div>
          </div>
          ${termBlock('11. ' + TERMS_AR[10].title, TERMS_AR[10].text)}
          ${termBlock('12. ' + TERMS_AR[11].title, TERMS_AR[11].text)}
          ${termBlock('13. فض المنازعات',
            'تختص محكمة ' + branchName + ' بالنظر في أي نزاع ينشأ حول بنود هذا العقد لا قدر الله.')}
          ${termBlock('14. ' + TERMS_AR[13].title, TERMS_AR[13].text)}
        </div>
        <div style="margin-top:auto;padding:8px;border-top:1px solid #000;
          font-weight:bold;text-align:center;">
          <strong>أقر بأنني قرأت وفهمت جميع الشروط والأحكام المذكورة أعلاه وأوافق عليها.</strong>
          <br><br>
          <div style="display:flex;justify-content:space-between;margin-top:5px;font-size:9pt;">
            <div style="width:45%;">توقيع المستأجر<br><br>____________________
              <div style="font-size:7.5pt;margin-top:5px;">التاريخ: .............</div>
            </div>
            <div style="width:45%;">توقيع الموظف<br><br>____________________</div>
          </div>
        </div>
      </div>
    </div>`;

  const page3 = `
    <div style="${_pageStyle('rtl')}">
      ${_watermark()}
      <div style="position:relative;z-index:2;height:100%;display:flex;flex-direction:column;">
        <div style="display:flex;justify-content:space-between;align-items:center;
          border-bottom:1px solid #04509D;padding-bottom:5px;margin-bottom:6px;">
          <strong style="font-size:12pt;color:#04509D;">المقر بما فيه</strong>
          <span style="font-size:9pt;color:#555;">العقد: ${d.ref} | صفحة 3/4</span>
        </div>
        <div style="margin-bottom:6px;padding:6px;border:1.5px solid #000;
          background:#fff;line-height:1.4;font-size:8.5pt;border-radius:3px;">
          اقر أنا: <strong>${d.fname} ${d.lname}</strong>
          بطاقة رقم: <strong>${d.passport || '.............'}</strong><br>
          رخصة قيادة رقم: <strong>${d.license || '.............'}</strong>
          بأنني استلمت السيارة نوع: <strong>${d.carLabel}</strong>
          لوحات رقم: <strong>${d.plate || '.............'}</strong>
          لون: <strong>${d.carColor || '..........'}</strong><br>
          بأنني استأجرت السيارة وأنها على مسؤوليتي الشخصية الكاملة مدنياً وجنائياً.
          وأقر بأنني قرأت الشروط والأحكام العامة الواردة في العقد.
        </div>
        <div style="display:flex;width:100%;gap:0;flex:1;">
          <div style="width:50%;padding-left:10px;display:flex;flex-direction:column;">
            <div style="background:#eee;font-weight:bold;padding:4px;text-align:center;
              font-size:8.5pt;border-bottom:1px solid #000;margin-bottom:5px;">بيان الاستلام</div>
            <table style="width:100%;border-collapse:collapse;font-size:7pt;margin-bottom:5px;">
              <tr style="background:#eee;">
                <th style="border:1px solid #000;padding:3px;">وقت وتاريخ الاستلام</th>
                <td style="border:1px solid #000;padding:3px;">${d.pickup.replace('T', ' ')}</td>
              </tr>
              <tr style="background:#eee;">
                <th style="border:1px solid #000;padding:3px;">عداد الخروج</th>
                <td style="border:1px solid #000;padding:3px;">${d.kmOut || '—'}</td>
              </tr>
              <tr style="background:#eee;">
                <th style="border:1px solid #000;padding:3px;">مستوى الوقود</th>
                <td style="border:1px solid #000;padding:3px;">${d.fuelLevel}</td>
              </tr>
            </table>
            <div style="width:100%;aspect-ratio:960/618;display:flex;align-items:center;justify-content:center;">
              <img src="${CAR_IMG}" style="width:100%;height:100%;object-fit:contain;">
            </div>
            ${checklist}
          </div>
          <div style="width:50%;border-left:1px dashed #000;padding-right:10px;display:flex;flex-direction:column;">
            <div style="background:#eee;font-weight:bold;padding:4px;text-align:center;
              font-size:8.5pt;border-bottom:1px solid #000;margin-bottom:5px;">بيان العودة</div>
            <table style="width:100%;border-collapse:collapse;font-size:7pt;margin-bottom:5px;">
              <tr style="background:#eee;">
                <th style="border:1px solid #000;padding:3px;">وقت وتاريخ العودة</th>
                <td style="border:1px solid #000;padding:3px;">____________________</td>
              </tr>
              <tr style="background:#eee;">
                <th style="border:1px solid #000;padding:3px;">عداد العودة (${kmInfo.ar})</th>
                <td style="border:1px solid #000;padding:3px;">____________________</td>
              </tr>
              <tr style="background:#eee;">
                <th style="border:1px solid #000;padding:3px;">مستوى الوقود</th>
                <td style="border:1px solid #000;padding:3px;font-size:6.5pt;">
                  [ ] ممتلئ [ ] 3/4 [ ] 1/2 [ ] 1/4 [ ] فارغ
                </td>
              </tr>
            </table>
            <div style="width:100%;aspect-ratio:960/618;display:flex;align-items:center;justify-content:center;">
              <img src="${CAR_IMG}" style="width:100%;height:100%;object-fit:contain;">
            </div>
            ${checklist}
          </div>
        </div>
        <div style="margin-top:5px;font-size:8pt;border-top:1px solid #000;padding-top:5px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-end;">
            <div style="width:50%;background:#f9f9f9;padding:5px;border:1px solid #000;
              border-radius:3px;font-size:9pt;">
              <strong>المقر بما فيه (المستأجر)</strong><br>
              الاسم: ${d.fname} ${d.lname}<br>
              التوقيع: ____________________
            </div>
            <div style="width:45%;text-align:center;font-size:9pt;">
              <strong>العودة: الموظف</strong><br><br>____________________
            </div>
          </div>
        </div>
      </div>
    </div>`;

  const receiptPages = _buildReceiptPages({
    ref: d.ref, clientName: d.fname + ' ' + d.lname,
    passport: d.passport, phone: d.phone,
    carStr: d.carLabel + (d.plate ? ' | ' + d.plate : ''),
    pickup: d.pickup, dropoff: d.dropoff, days: d.days, mode: d.mode || 'Daily',
    total: d.total, paidNow: d.paidNow, pending: d.pending,
    rentPayStr: d.rentPayStr, depHeld: d.depHeld,
    depPayStr: d.depPayStr, reqDep: d.reqDep,
    lang: 'ar', today
  });

  return page1 + page2 + page3 + receiptPages;
}

// ============================================================
// SHARED RECEIPT PAGE BUILDER (used by EN + AR contracts)
// ============================================================
function _buildReceiptPages(p) {
  const isAr       = p.lang === 'ar';
  const qrUrl      = 'https://api.qrserver.com/v1/create-qr-code/?data=https://brothersegy.com&size=80x80';
  const pickupDate = new Date(p.pickup);
  const dropoffDate= new Date(p.dropoff);
  const loopCount  = p.mode === 'Monthly' ? Math.max(1, Math.ceil(p.days / 30)) : 1;
  const monthlyAmt = loopCount > 0 ? Math.round(p.total / loopCount) : p.total;

  let segStart = new Date(pickupDate);
  let pages    = '';

  for (let j = 1; j <= loopCount; j++) {
    let segEnd = new Date(segStart);
    if (p.mode === 'Monthly') {
      segEnd.setMonth(segEnd.getMonth() + 1);
      if (segEnd > dropoffDate) segEnd = new Date(dropoffDate);
    } else {
      segEnd = new Date(dropoffDate);
    }

    const isFirst  = j === 1;
    const isBlank  = !isFirst;
    const amtNum   = isFirst ? Math.round(p.paidNow) : monthlyAmt;
    const locale   = isAr ? 'ar-EG' : 'en-GB';
    const amtStr   = amtNum.toLocaleString(locale) + ' ' + (isAr ? 'ج.م' : 'EGP');
    const detStr   = isFirst ? (p.rentPayStr || amtNum.toLocaleString(locale) + ' ' + (isAr ? 'ج.م' : 'EGP')) : '';
    const sStr     = segStart.toLocaleDateString(locale);
    const eStr     = segEnd.toLocaleDateString(locale);
    const periodStr= isAr ? 'من ' + sStr + ' إلى ' + eStr : sStr + ' to ' + eStr;
    const title    = p.mode === 'Monthly'
      ? (isAr ? 'دفعة إيجار (شهر ' + j + ')' : 'RENTAL PAYMENT (Month ' + j + ')')
      : (isAr ? 'دفعة إيجار' : 'RENTAL PAYMENT');

    pages += _singleReceiptPage({
      ref: p.ref, clientName: p.clientName, passport: p.passport,
      phone: p.phone, carStr: p.carStr, title,
      amtStr, detStr, periodStr, isDeposit: false,
      pending: p.pending, isBlank, today: p.today, isAr, qrUrl,
      copyTypeClient : isAr ? 'نسخة العميل'  : 'CLIENT COPY',
      copyTypeCompany: isAr ? 'نسخة الشركة' : 'COMPANY COPY',
      detachText     : isAr ? '- - - - - قصّه من هنا - - - - -' : '- - - - - DETACH HERE - - - - -',
      receiptTitle   : isAr ? 'إيصال استلام رسمي' : 'OFFICIAL RECEIPT'
    });

    segStart = new Date(segEnd);
  }

  // Deposit receipt
  if (p.reqDep > 0 || p.depHeld > 0) {
    const depAmt   = Math.round(p.depHeld > 0 ? p.depHeld : p.reqDep);
    const locale   = isAr ? 'ar-EG' : 'en-GB';
    const depStr   = depAmt.toLocaleString(locale) + ' ' + (isAr ? 'ج.م' : 'EGP');
    const isBlank  = p.depHeld <= 0;

    pages += _singleReceiptPage({
      ref: p.ref, clientName: p.clientName, passport: p.passport,
      phone: p.phone, carStr: p.carStr,
      title      : isAr ? 'مبلغ التأمين'    : 'SECURITY DEPOSIT',
      amtStr     : depStr, detStr: p.depPayStr || '',
      periodStr  : '', isDeposit: true, pending: 0, isBlank,
      today: p.today, isAr, qrUrl,
      copyTypeClient : isAr ? 'نسخة العميل'  : 'CLIENT COPY',
      copyTypeCompany: isAr ? 'نسخة الشركة' : 'COMPANY COPY',
      detachText     : isAr ? '- - - - - قصّه من هنا - - - - -' : '- - - - - DETACH HERE - - - - -',
      receiptTitle   : isAr ? 'إيصال استلام رسمي' : 'OFFICIAL RECEIPT'
    });
  }

  return pages;
}

function _singleReceiptPage(p) {
  const dir  = p.isAr ? 'rtl' : 'ltr';
  const ta   = p.isAr ? 'left' : 'right';

  const half = copyType =>
    '<div style="height:48%;border:2px solid #000;padding:15px;display:flex;' +
    'flex-direction:column;box-sizing:border-box;direction:' + dir + ';">' +

    '<div style="display:flex;justify-content:space-between;align-items:flex-start;' +
    'border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:12px;">' +
    '<img src="' + LOGO + '" style="height:40px;object-fit:contain;">' +
    '<div style="text-align:center;flex:1;">' +
    '<div style="font-size:15pt;font-weight:bold;color:#04509D;text-transform:uppercase;">' +
    p.receiptTitle + '</div>' +
    '<div style="font-size:9pt;">' + copyType + '</div>' +
    '</div>' +
    '<div style="text-align:' + ta + ';">' +
    '<img src="' + p.qrUrl + '" style="height:45px;"><br>' +
    '<div style="font-size:8pt;font-weight:bold;margin-top:3px;">' +
    (p.isAr ? 'التاريخ:' : 'DATE:') + ' ' +
    (p.isBlank ? (p.isAr ? '___/___/202_' : '__/__/202_') : p.today) +
    '</div><div style="font-weight:bold;font-size:9pt;">' + p.title + '</div>' +
    '</div></div>' +

    '<div style="display:flex;gap:20px;font-size:9pt;line-height:1.6;' +
    'border-bottom:1px dashed #ccc;padding-bottom:10px;margin-bottom:10px;">' +
    '<div style="flex:1;">' +
    _rcRow(p.isAr ? 'استلمنا من'    : 'RECEIVED FROM', p.clientName) +
    _rcRow(p.isAr ? 'جواز السفر'    : 'PASSPORT / ID', p.passport || '—') +
    _rcRow(p.isAr ? 'الهاتف'        : 'PHONE',         p.phone    || '—') +
    '</div><div style="flex:1;">' +
    _rcRow(p.isAr ? 'رقم العقد'     : 'CONTRACT NO',   p.ref) +
    _rcRow(p.isAr ? 'المركبة'       : 'VEHICLE',       p.carStr) +
    (!p.isDeposit && p.periodStr
      ? _rcRow(p.isAr ? 'الفترة' : 'PERIOD', p.periodStr) : '') +
    '</div></div>' +

    '<div style="border:1px solid #ccc;background:#fbfbfb;padding:10px 15px;margin-bottom:5px;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">' +
    '<span style="font-weight:bold;font-size:10pt;color:#555;text-transform:uppercase;">' +
    (p.isAr ? 'المبلغ المستلم' : 'AMOUNT RECEIVED') + '</span>' +
    '<span style="font-size:' + (p.isBlank ? '14pt' : '18pt') + ';font-weight:bold;">' +
    (p.isBlank ? (p.isAr ? '______________ ج.م' : '______________ EGP') : p.amtStr) +
    '</span></div>' +
    '<div style="display:flex;justify-content:space-between;">' +
    '<span style="font-weight:bold;font-size:8pt;color:#555;">' +
    (p.isAr ? 'تفاصيل الدفع' : 'PAYMENT DETAILS') + '</span>' +
    '<span style="font-size:8pt;">' +
    (p.isBlank ? '______________________________' : (p.detStr || '—')) +
    '</span></div></div>' +

    '<div style="font-size:7pt;color:#666;margin-top:4px;">' +
    (p.isDeposit
      ? '<strong style="color:#c0392b;">' +
        (p.isAr
          ? '* مبلغ التأمين مسترد بالكامل عند عودة السيارة بحالتها الأصلية.'
          : '* Fully refundable if returned in same condition.') + '</strong>'
      : (p.pending > 0 && !p.isBlank
          ? '<span style="color:#c0392b;font-weight:bold;">' +
            (p.isAr
              ? 'الرصيد المتبقي: ' + Math.round(p.pending).toLocaleString('ar-EG') + ' ج.م'
              : 'OUTSTANDING: ' + Math.round(p.pending).toLocaleString() + ' EGP') +
            '</span>'
          : '')) +
    '</div>' +

    '<div style="margin-top:auto;display:flex;justify-content:space-between;' +
    'align-items:flex-end;padding-top:8px;">' +
    '<div style="text-align:center;font-weight:bold;font-size:9pt;width:40%;">' +
    (p.isAr ? 'توقيع المستأجر' : 'LESSEE SIGNATURE') +
    '<br><br>____________________' +
    '<div style="font-size:8pt;margin-top:2px;">' +
    (p.isAr ? 'التاريخ: .............' : 'Date: .............') + '</div>' +
    '</div>' +
    '<div style="text-align:center;border-top:1px solid #000;width:200px;' +
    'padding-top:5px;font-size:9pt;font-weight:bold;">' +
    (p.isAr ? 'توقيع معتمد' : 'AUTHORIZED SIGNATURE') +
    '<div style="font-size:8pt;margin-top:2px;">' +
    (p.isAr ? 'التاريخ: .............' : 'Date: .............') + '</div>' +
    '</div></div></div>';

  return '<div style="' + _pageStyle(p.isAr ? 'rtl' : 'ltr') + '">' +
    half(p.copyTypeClient) +
    '<div style="text-align:center;border-top:1px dashed #999;color:#999;' +
    'padding:8px 0;font-size:8pt;">' + p.detachText + '</div>' +
    half(p.copyTypeCompany) +
    '</div>';
}

function _rcRow(label, value) {
  return '<div style="display:flex;justify-content:space-between;border-bottom:1px dotted #eee;">' +
    '<span style="font-weight:bold;font-size:8.5pt;">' + label + '</span>' +
    '<span>' + value + '</span>' +
    '</div>';
}

// ============================================================
// PRINT CONTRACT WINDOW
// ============================================================
window.printContractWindow = function (containerId) {
  const content = document.getElementById(containerId)?.innerHTML;
  if (!content) { toast('Generate the contract first', 'warning'); return; }
  const win = window.open('', '_blank');
  win.document.write(
    '<!DOCTYPE html><html><head>' +
    '<meta charset="UTF-8"><title>Brothers EGY - Contract</title>' +
    '<style>' +
    'body { font-family:\'Segoe UI\',Arial,sans-serif; margin:0; padding:0; background:white; }' +
    '@page { size:A4; margin:0; }' +
    '@media print {' +
    'body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }' +
    '.no-print { display:none !important; }' +
    '}' +
    '.print-btn { position:fixed; top:10px; right:10px; background:#04509D; color:white;' +
    'border:none; padding:10px 20px; border-radius:6px; cursor:pointer; font-weight:bold; z-index:999; }' +
    '</style></head><body>' +
    '<button class="print-btn no-print" onclick="window.print()">🖨️ Print / Save PDF</button>' +
    content +
    '</body></html>'
  );
  win.document.close();
  setTimeout(() => win.print(), 500);
};

// ============================================================
// PROPOSAL REF LOOKUP
// ============================================================
window.searchProposalRef = function (prefix) {
  const val  = (document.getElementById(prefix + '-proposal-ref')?.value || '').trim();
  const stEl = document.getElementById(prefix + '-proposal-status');
  if (!val || val.length < 4) { if (stEl) stEl.textContent = ''; return; }

  const p = G.proposals.find(x =>
    (x.proposal_ref || x.id).toLowerCase().includes(val.toLowerCase())
  );

  if (stEl) {
    if (p) {
      stEl.textContent =
        '✅ Found: ' + (p.proposal_ref || p.id) + ' | ' + p.client_name +
        ' | ' + fmtMoney(p.total_estimate) + ' | ' + p.status;
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

window.fillContractFromProposal = function (prefix, p) {
  const set = (id, val) => {
    const el = document.getElementById(id); if (el) el.value = val || '';
  };
  set(prefix + '-pickup',   p.pickup_date  || '');
  set(prefix + '-dropoff',  p.dropoff_date || '');
  set(prefix + '-daily',    String(p.daily_rate       || 0));
  set(prefix + '-ins-fee',  String(p.insurance_fee    || 0));
  set(prefix + '-km-cost',  String(p.km_cost          || 0));
  set(prefix + '-pick-fee', String(p.pickup_fee       || 0));
  set(prefix + '-req-dep',  String(p.deposit_amount   || 0));

  const kmEl = document.getElementById(prefix + '-km-pkg');
  if (kmEl) kmEl.value = p.km_package    || 'standard';

  const insEl = document.getElementById(prefix + '-ins-pkg');
  if (insEl) insEl.value = p.insurance_plan || 'Basic';

  const carSel = document.getElementById(prefix + '-car');
  if (carSel && p.car_id) {
    carSel.value = p.car_id;
    if (typeof showCarInfoBadge === 'function')
      showCarInfoBadge(p.car_id, prefix + '-car-badge');
  }

  if (p.client_crm_id) {
    const c = G.customers.find(x => x.id === p.client_crm_id);
    if (c && typeof fillCrmFields === 'function') fillCrmFields(prefix, c.id);
  } else if (p.client_name) {
    const parts = p.client_name.split(' ');
    set(prefix + '-fname', parts[0] || '');
    set(prefix + '-lname', parts.slice(1).join(' ') || '');
    set(prefix + '-phone', p.client_phone || '');
    set(prefix + '-email', p.client_email || '');
    ['fname','lname','phone','email'].forEach(f => {
      const el = document.getElementById(prefix + '-' + f);
      if (el) el.readOnly = false;
    });
  }

  const stEl = document.getElementById(prefix + '-proposal-status');
  if (stEl) {
    stEl.textContent = '✅ Loaded: ' + (p.proposal_ref || p.id) + ' | ' + p.client_name;
    stEl.style.color = 'var(--success)';
  }

  if (prefix === 'en') enCalc(); else arCalc();
  updateProposalStatus(p.id, 'Accepted').catch(() => {});
  toast('Proposal ' + (p.proposal_ref || p.id) + ' loaded into contract form!', 'success');
};

// ============================================================
// UPDATE PROPOSAL STATUS (from contracts module)
// ============================================================
window.updateProposalStatus = async function (proposalId, status) {
  if (!proposalId) return;
  try {
    await db.collection('proposals').doc(proposalId).update({
      status      : status,
      _sys_updated: Date.now()
    });
    const idx = (G.proposals || []).findIndex(p => p.id === proposalId);
    if (idx > -1) G.proposals[idx].status = status;
  } catch (_) {}
};

// ============================================================
// RATE CARD AUTO-FILL
// ============================================================
window.prefillDailyRate = async function (carId, dailyInputId) {
  if (!carId) return null;
  const inp = document.getElementById(dailyInputId);
  if (!inp || (inp.value && inp.value !== '0')) return null;

  try {
    const result = await getRateForCar(carId, 1);
    if (result.dailyRate > 0) {
      inp.value = String(result.dailyRate);
      toast('Rate pre-filled: ' + fmtMoney(result.dailyRate) + '/day (' + result.tierLabel + ')', 'info', 2000);
      return result.dailyRate;
    }
  } catch (_) {}

  // Legacy fallback
  const car   = getCarById(carId);
  const model = car?.model || car?.Type || car?.['النوع'] || '';
  const rate  = G.settings.rateCard?.[model];
  if (rate && rate > 0) {
    inp.value = String(rate);
    return rate;
  }
  return null;
};

// ============================================================
// CLEAR CONTRACT FORM
// ============================================================
window.clearContractForm = function (prefix) {
  ['fname','lname','phone','email','passport','nationality',
   'license','address','add-dr-name','add-dr-lic',
   'pickup','dropoff','km-out','client-search','proposal-ref'
  ].forEach(f => {
    const el = document.getElementById(prefix + '-' + f);
    if (el) { el.value = ''; el.readOnly = false; }
  });

  ['paid-egp','paid-usd','paid-eur','paid-card',
   'dep-egp','dep-usd','dep-eur','dep-card',
   'ins-fee','km-cost','del-fee','pick-fee','req-dep'
  ].forEach(f => {
    const el = document.getElementById(prefix + '-' + f);
    if (el) el.value = '0';
  });

  const carEl  = document.getElementById(prefix + '-car');
  if (carEl)  carEl.value = '';

  const badge  = document.getElementById(prefix + '-car-badge');
  if (badge)  badge.className = 'car-info-badge';

  const crmId  = document.getElementById(prefix + '-crm-id');
  if (crmId)  crmId.style.display = 'none';

  const editBtn = document.getElementById(prefix + '-edit-btn');
  if (editBtn) editBtn.style.display = 'none';

  window['_crm_' + prefix + '_id'] = null;

  const outEl  = document.getElementById(prefix + '-output');
  if (outEl)  outEl.style.display = 'none';

  const phEl   = document.getElementById(prefix + '-placeholder');
  if (phEl)   phEl.style.display = 'block';

  const refPrev = document.getElementById(prefix + '-ref-preview');
  if (refPrev) refPrev.textContent = '';

  const stEl   = document.getElementById(prefix + '-proposal-status');
  if (stEl)   stEl.textContent = '';

  if (prefix === 'en') enCalc(); else arCalc();
};
