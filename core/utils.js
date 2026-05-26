// ============================================================
// core/utils.js
// Pure helper functions — no DOM, no Firebase, no side effects
// Updated to handle string booleans from Google Sheets sync
// ============================================================

// ============================================================
// AMOUNT PARSING
// ============================================================

window.parseAmount = function(str) {
  if (str === null || str === undefined || str === '') return 0;
  if (typeof str === 'number') return isNaN(str) ? 0 : str;
  const n = parseFloat(String(str).replace(/[£$€,\s]/g, '').trim());
  return isNaN(n) ? 0 : n;
};

// ============================================================
// DATE PARSING
// ============================================================

window.parseDBDate = function(str) {
  if (!str) return null;
  if (str && str.toDate) return str.toDate();

  // Excel serial date (5-digit number like 45855)
  const serial = typeof str === 'number'
    ? str
    : (typeof str === 'string' && /^\d{5}$/.test(str.trim())
        ? parseInt(str) : null);
  if (serial && serial > 40000 && serial < 60000) {
    return new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
  }

  const isPM = /مساءً|مساء|PM/i.test(str);
  const isAM = /صباحاً|صباح|AM/i.test(str);

  let clean = String(str)
    .replace(/[\u0600-\u06FF\u200c-\u200f\u202a-\u202e]/g, '')
    .replace(/,/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Normalize "2025-11-27 7:00" → "2025-11-27T7:00" for Safari
  clean = clean.replace(
    /^(\d{4}-\d{1,2}-\d{1,2})\s+(\d{1,2}:\d{2})/,
    '$1T$2'
  );

  let d = new Date(clean);
  if (!isNaN(d.getTime())) {
    if (isPM && d.getHours() < 12) d.setHours(d.getHours() + 12);
    if (isAM && d.getHours() === 12) d.setHours(0);
    return d;
  }

  // DD/MM/YYYY fallback
  const dmy = clean.match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[T\s]+(\d{1,2}):(\d{2}))?/
  );
  if (dmy) {
    let h = dmy[4] ? parseInt(dmy[4]) : 0;
    let m = dmy[5] ? parseInt(dmy[5]) : 0;
    if (isPM && h < 12) h += 12;
    if (isAM && h === 12) h = 0;
    d = new Date(parseInt(dmy[3]), parseInt(dmy[2]) - 1, parseInt(dmy[1]), h, m);
    return isNaN(d.getTime()) ? null : d;
  }

  // YYYY/MM/DD fallback
  const ymd = clean.match(
    /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:[T\s]+(\d{1,2}):(\d{2}))?/
  );
  if (ymd) {
    let h = ymd[4] ? parseInt(ymd[4]) : 0;
    let m = ymd[5] ? parseInt(ymd[5]) : 0;
    if (isPM && h < 12) h += 12;
    if (isAM && h === 12) h = 0;
    d = new Date(parseInt(ymd[1]), parseInt(ymd[2]) - 1, parseInt(ymd[3]), h, m);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
};

window.parseDateFromComponents = function(doc, prefix) {
  const day    = parseInt(doc[prefix + ' يوم']   || doc[prefix + '_day']   || 0);
  const month  = parseInt(doc[prefix + ' شهر']   || doc[prefix + '_month'] || 0);
  const year   = parseInt(doc[prefix + ' سنة']   || doc[prefix + '_year']  || 0);
  let   hour   = parseInt(doc[prefix + ' ساعة']  || 0);
  const min    = parseInt(doc[prefix + ' دقيقة'] || 0);
  const period = doc[prefix + ' الفترة'] || '';

  if (/مساءً|مساء|PM/i.test(period) && hour < 12) hour += 12;
  if (/صباحاً|صباح|AM/i.test(period) && hour === 12) hour = 0;
  if (!day || !month || !year) return null;

  const d = new Date(year, month - 1, day, hour, min);
  return isNaN(d.getTime()) ? null : d;
};

// ============================================================
// ORDER DATA ACCESSORS
// ============================================================

window.getOrderDates = function(order) {
  const startRaw =
    order['تاريخ بداية الإيجار'] ||
    order['بداية التعاقد']       ||
    order['راجيالا ةيادب خيرات'] ||
    order['col_L']               ||
    order['L']                   ||
    order['start_date']          || '';

  const endRaw =
    order['تاريخ نهاية الإيجار'] ||
    order['نهاية التعاقد']       ||
    order['راجيالا ةياهن خيرات'] ||
    order['col_T']               ||
    order['T']                   ||
    order['end_date']            || '';

  let start = parseDBDate(startRaw);
  let end   = parseDBDate(endRaw);

  if (!start) start =
    parseDateFromComponents(order, 'بداية التعاقد') ||
    parseDateFromComponents(order, 'تاريخ بداية الإيجار');
  if (!end) end =
    parseDateFromComponents(order, 'نهاية التعاقد') ||
    parseDateFromComponents(order, 'تاريخ نهاية الإيجار');

  return { start, end };
};

window.getOrderTotal = function(order) {
  return parseAmount(
    order['إجمالي المستحق (Total)'] ||
    order['قحتسملا يلامجإ (Total)'] ||
    order['col_AU']                  ||
    order['AU']                      || 0
  );
};

window.getOrderPaid = function(order) {
  return parseAmount(
    order['المدفوع EGP'] ||
    order['عوفدملا EGP'] ||
    order['col_AX']      ||
    order['AX']          || 0
  );
};

window.getOrderClientName = function(order) {
  return order['اسم العميل'] ||
         order['ليمعلا مسا'] ||
         order['col_C']      ||
         order['C']          || '';
};

window.getOrderCarCode = function(order) {
  return order['كود السيارة'] ||
         order['ةرايسلا دوك'] ||
         order['col_D']       ||
         order['D']           || '';
};

window.getOrderNo = function(order) {
  return order['No.'] ||
         order['col_A'] ||
         order['A']     ||
         order.id       || '';
};

// ============================================================
// ORDER STATUS
// ============================================================

window.getOrderStatus = function(order) {
  if (!order) return 'Active';

  const raw =
    order['حالة الطلب']  ||
    order['order_status'] ||
    order['Status']       || '';

  if (raw === 'Accident'  || raw === 'Cancelled') return raw;

  const total = getOrderTotal(order);
  const paid  = getOrderPaid(order);
  if (total > 0 && paid >= total) return 'Closed';

  if (raw === 'Closed' || order.closed === true || order.closed === 'true')
    return 'Closed';

  const { start, end } = getOrderDates(order);
  const today      = new Date();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  if (start && end && start <= today && end >= todayStart) return 'Active';
  if (end && end < todayStart)                             return 'Overdue';
  if (start && today < start)                              return 'Future';

  return 'Active';
};

// ============================================================
// DATE FORMATTING
// ============================================================

window.fmtDate = function(d) {
  if (!d) return 'N/A';
  const Y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, '0');
  const D = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${Y}-${M}-${D} ${h}:${m}`;
};

window.fmtDateShort = function(d) {
  if (!d) return 'N/A';
  const Y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, '0');
  const D = String(d.getDate()).padStart(2, '0');
  return `${Y}-${M}-${D}`;
};

window.fmtCRMDate = function(val) {
  if (!val) return '—';
  const n = typeof val === 'number'
    ? val
    : (typeof val === 'string' && /^\d{5}$/.test(val.trim())
        ? parseInt(val) : null);
  if (n && n > 40000 && n < 60000) {
    return new Date(Date.UTC(1899, 11, 30) + n * 86400000)
      .toISOString().slice(0, 10);
  }
  return String(val).slice(0, 10);
};

window.todayISO = function() {
  const n = new Date();
  return n.getFullYear() + '-'
    + String(n.getMonth() + 1).padStart(2, '0') + '-'
    + String(n.getDate()).padStart(2, '0');
};

window.getTimeAgo = function(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
};

// ============================================================
// MONEY FORMATTING
// ============================================================

window.fmtMoney = function(n) {
  return '£' + Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// ============================================================
// STRING HELPERS
// ============================================================

window.initials = function(name) {
  if (!name) return '?';
  const p = name.trim().split(' ');
  return (p[0]?.[0] || '') + (p[1]?.[0] || '');
};

// ============================================================
// FLEET HELPERS
// Updated to handle pre-built labels from Sheets sync
// and string booleans ("true"/"false" instead of true/false)
// ============================================================

window.getCarLabel = function(car, lang = 'en') {
  // Use pre-built labels from Sheets sync
  if (lang === 'ar' && car.car_label_ar) return car.car_label_ar;
  if (lang === 'en' && car.car_label)    return car.car_label;
  if (lang === 'ar' && car.car_label)    return car.car_label;

  // Build from individual fields
  const typeEN  = String(car.Type    || car['النوع']   || car['col_C'] || '').trim();
  const modelEN = String(car.Model   || car['col_F']   || '').trim();
  const modelAR = String(car['الطراز'] || car['col_E'] || '').trim();
  const year    = String(car['سنة الصنع'] || car['col_H'] || '').trim();
  const plate   = formatPlate(car);

  if (lang === 'ar') {
    const typeAR  = String(car['النوع'] || typeEN).replace(/_/g, ' ');
    const colorAR = String(car['اللون'] || car['col_I'] || car.Color || '').trim();
    return `${modelAR || typeAR} (${year}) ${colorAR} | ${plate}`.trim();
  }

  const colorEN = String(car.Color || car['col_J'] || car['اللون'] || '').trim();
  return `${modelEN || typeEN || 'Unknown'} (${year}) ${colorEN} | ${plate}`.trim();
};

window.formatPlate = function(car) {
  // Pre-built plate from sync
  if (car.plate && car.plate.length > 2) return car.plate;

  // Build from column fields
  const parts = [
    car['col_W'],  car['col_X'],  car['col_Y'],
    car['col_Z'],  car['col_AA'], car['col_AB'], car['col_AC']
  ]
    .filter(p => p && String(p).trim() && String(p).trim() !== '0')
    .map(p => String(p).trim());

  return parts.length ? parts.join(' ') : (car.plate || 'No Plate');
};

window.getCarById = function(id) {
  if (!id) return null;
  const strId = String(id).trim();

  // Match against every possible ID field
  return G.fleet.find(c =>
    String(c.id       || '').trim() === strId ||
    String(c.ID       || '').trim() === strId ||
    String(c['No.']   || '').trim() === strId ||
    String(c['col_A'] || '').trim() === strId ||
    String(c['A']     || '').trim() === strId
  ) || null;
};

// ============================================================
// CAR STATUS CATEGORY
// Handles both boolean and string boolean values from sync
// e.g. archived = "true" (string) as well as archived = true
// ============================================================

window.getCarStatusCategory = function(car) {

  // ---- Archived / inactive flags ----
  const isArchivedFlag = car.archived  === true  || car.archived  === 'true';
  const isInactiveFlag = car.is_active === false  || car.is_active === 'false';
  if (isArchivedFlag || isInactiveFlag) return 'archived';

  // ---- Contract status ----
  const contractAZ = String(car['col_AZ']       || '').toLowerCase().trim();
  const contractEN = String(
    car['Contract'] || car['حاله التعاقد'] || ''
  ).toLowerCase().trim();
  const combined   = contractAZ + ' ' + contractEN;

  const isExpired =
    combined.includes('منتهي')   ||
    combined.includes('منتهى')   ||
    combined.includes('expired') ||
    combined.includes('finished');

  if (isExpired) return 'archived';

  // ---- Handover date ----
  const handover = parseDBDate(
    car['تاريخ التسليم'] || car['handover_date'] || ''
  );
  if (handover && new Date() > handover) return 'archived';

  // ---- Operational status ----
  const st  = (car.status || 'available').toLowerCase().trim();
  const cEN = contractEN;

  if (st === 'accident'    || cEN === 'accident')    return 'accident';
  if (st === 'maintenance' || cEN === 'maintenance') return 'maintenance';
  if (st === 'rented')                               return 'rented';

  // ---- Live booking check ----
  // The Firestore document ID is the car code used in bookings
  // e.g. car doc "34" matches booking where كود السيارة = "34"
  if (G.bookings && G.bookings.length) {
    const today = new Date();

    // Use the Firestore document ID as the primary match key
    // This is the car code from column A of your sheet
    const carDocId = String(car.id || '').trim();

    // Also check the ID field as fallback
    const carIdField = String(car.ID || car['col_A'] || car['No.'] || '').trim();

    const carOrders = G.bookings.filter(b => {
      const bCarId = String(
        b['كود السيارة'] ||
        b['col_D']       ||
        b['D']           || ''
      ).trim();

      if (!bCarId) return false;

      // Match against both document ID and ID field
      return bCarId === carDocId || bCarId === carIdField;
    });

    const hasActive = carOrders.some(o => {
      const { start, end } = getOrderDates(o);
      return start && end && start <= today && today <= end;
    });
    if (hasActive) return 'rented';

    const hasOverdue = carOrders.some(o => getOrderStatus(o) === 'Overdue');
    if (hasOverdue) return 'overdue';

    const hasFuture = carOrders.some(o => {
      const { start } = getOrderDates(o);
      return start && start > today;
    });
    if (hasFuture) return 'future';
  }

  return 'available';
};

// ============================================================
// CAR COUNTS
// ============================================================

window.getCarCounts = function() {
  const counts = {
    active: 0, archived: 0, accident: 0, maintenance: 0, rented: 0
  };
  const bc = { HRG: 0, ALX: 0, CAI: 0, RSH: 0 };

  G.fleet.forEach(car => {
    const cat = getCarStatusCategory(car);

    if      (cat === 'archived')    counts.archived++;
    else if (cat === 'accident')    counts.accident++;
    else if (cat === 'maintenance') counts.maintenance++;
    else if (cat === 'rented')      counts.rented++;
    else                            counts.active++;

    if (cat === 'archived') return;

    // Branch from your sheet fields
    const b   = (
      car.Branch        ||
      car.City          ||
      car['محافظة']     ||
      car['المحافظة']   ||
      car['col_CF']     ||
      car.current_location || ''
    ).toLowerCase();

    const loc = (car.current_location || '').toUpperCase();
    let branch = '';

    if (loc.startsWith('HRG') || b.includes('hurghada') ||
        b.includes('hrg') || b.includes('الغردقة'))      branch = 'HRG';
    else if (loc.startsWith('ALX') || b.includes('alexandria') ||
        b.includes('alx') || b.includes('اسكندرية') ||
        b.includes('الاسكندرية'))                         branch = 'ALX';
    else if (loc.startsWith('CAI') || b.includes('cairo') ||
        b.includes('cai') || b.includes('قاهرة'))         branch = 'CAI';
    else if (loc.startsWith('RSH') || b.includes('rashid') ||
        b.includes('rsh') || b.includes('رشيد'))          branch = 'RSH';

    if (!branch) branch = G.user?.branch || 'HRG';
    if (bc[branch] !== undefined) bc[branch]++;
  });

  return { counts, branchCounts: bc };
};

window.getCarBranchCode = function(car) {
  const b = (
    car.Branch        ||
    car.City          ||
    car['المحافظة']   ||
    car['محافظة']     ||
    car['col_CF']     ||
    car.current_location || ''
  ).toLowerCase();

  if (b.includes('hurghada')   || b.includes('الغردقة')    || b.includes('hrg')) return 'HRG';
  if (b.includes('alexandria') || b.includes('اسكندرية')   || b.includes('alx')) return 'ALX';
  if (b.includes('cairo')      || b.includes('قاهرة')      || b.includes('cai')) return 'CAI';
  if (b.includes('rashid')     || b.includes('رشيد')        || b.includes('rsh')) return 'RSH';
  return '';
};

// ============================================================
// DOCUMENT REFERENCE GENERATOR
// ============================================================

window.generateDocRef = async function(type, branchCode) {
  const n    = new Date();
  const ddmm = String(n.getDate()).padStart(2, '0')
             + String(n.getMonth() + 1).padStart(2, '0');
  const key  = `${type}-${branchCode || 'GEN'}-${ddmm}`;

  try {
    const seq = await db.runTransaction(async tx => {
      const ref  = db.collection('_counters').doc(key);
      const doc  = await tx.get(ref);
      const next = doc.exists ? (doc.data().seq || 0) + 1 : 1;
      tx.set(ref, { seq: next, updated: Date.now() }, { merge: true });
      return next;
    });
    return `${type}-${branchCode || 'GEN'}-${ddmm}-${String(seq).padStart(3, '0')}`;
  } catch (e) {
    return `${type}-${branchCode || 'GEN'}-${ddmm}-${Date.now().toString().slice(-4)}`;
  }
};

// ============================================================
// QR CODE AND BARCODE
// ============================================================

window.attachQRAndBarcode = function(ref) {
  const qrId      = 'qr-' + ref.replace(/[^a-zA-Z0-9]/g, '');
  const bcId      = 'bc-' + ref.replace(/[^a-zA-Z0-9]/g, '');
  const verifyUrl = `https://sabryabr.github.io/BrothersEGY-ERP/verify.html?ref=${ref}`;

  setTimeout(() => {
    const qrEl = document.getElementById(qrId);
    if (qrEl) {
      qrEl.innerHTML = '';
      try {
        new QRCode(qrEl, {
          text:         verifyUrl,
          width:        80,
          height:       80,
          colorDark:    '#1e40af',
          colorLight:   '#ffffff',
          correctLevel: QRCode.CorrectLevel.M
        });
      } catch (e) { qrEl.textContent = ref; }
    }

    const bcEl = document.getElementById(bcId);
    if (bcEl) {
      try {
        JsBarcode('#' + bcId, ref, {
          format:       'CODE128',
          lineColor:    '#1e40af',
          width:        1.5,
          height:       35,
          displayValue: true,
          fontSize:     8,
          margin:       2,
          background:   '#f8fafc'
        });
      } catch (e) { /* barcode library not ready */ }
    }
  }, 300);
};

window.a4FooterHTML = function(ref, docType, isRTL) {
  const qrId      = 'qr-' + ref.replace(/[^a-zA-Z0-9]/g, '');
  const bcId      = 'bc-' + ref.replace(/[^a-zA-Z0-9]/g, '');
  const verifyUrl = `https://sabryabr.github.io/BrothersEGY-ERP/verify.html?ref=${ref}`;

  return `
    <div style="display:flex;align-items:center;gap:14px;background:#f8fafc;
      border:1px solid #e2e8f0;border-radius:8px;padding:10px 13px;
      margin-top:14px;${isRTL ? 'direction:rtl;' : ''}">
      <div id="${qrId}" style="flex-shrink:0;width:80px;height:80px;"></div>
      <div style="flex:1;">
        <div style="font-size:11px;font-weight:800;color:#1e40af;">
          BROTHERS EGY – ${docType}
        </div>
        <div style="font-size:9px;color:#64748b;margin-top:2px;">
          Ref: ${ref}
        </div>
        <div style="font-size:9px;color:#64748b;">
          Issued by: ${G.user?.username || '-'} |
          ${new Date().toLocaleString('en-GB')}
        </div>
        <div style="font-size:8px;color:#3b82f6;margin-top:2px;">
          Verify: sabryabr.github.io/BrothersEGY-ERP/verify.html?ref=${ref}
        </div>
        <canvas id="${bcId}"
          style="max-width:180px;height:45px;display:block;margin-top:4px;">
        </canvas>
      </div>
      <div style="border:3px solid #1e40af;border-radius:50%;
        width:68px;height:68px;flex-shrink:0;
        display:flex;flex-direction:column;align-items:center;
        justify-content:center;background:rgba(30,64,175,0.06);">
        <div style="font-size:8px;font-weight:900;color:#1e40af;
          text-align:center;">
          ${(G.user?.username || 'STAFF').toUpperCase()}
        </div>
        <div style="font-size:7px;color:#64748b;text-align:center;">
          ${BRANCH_MAP[G.user?.branch] || G.user?.branch || ''}
        </div>
        <div style="font-size:6px;color:#94a3b8;text-align:center;">
          ${new Date().toLocaleDateString('en-GB')}
        </div>
      </div>
    </div>`;
};

// ============================================================
// IMAGE COMPRESSION
// ============================================================

window.compressImage = function(file, maxW, quality) {
  const outputType    = file.type === 'image/png' ? 'image/png'  : 'image/jpeg';
  const outputQuality = file.type === 'image/png' ? undefined    : quality;

  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale  = Math.min(1, maxW / img.width);
      const canvas = document.createElement('canvas');
      canvas.width  = img.width  * scale;
      canvas.height = img.height * scale;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(b => resolve(b), outputType, outputQuality);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
};

// ============================================================
// PRINT ISOLATION
// ============================================================

window.printModule = function(a4Id) {
  const a4El = document.getElementById(a4Id);
  if (!a4El) { toast('Nothing to print', 'warning'); return; }

  document.getElementById('print-iso')?.remove();

  const style = document.createElement('style');
  style.id    = 'print-iso';
  style.textContent = `
    @media print {
      body * { visibility: hidden !important; }
      #${a4Id}, #${a4Id} * { visibility: visible !important; }
      #${a4Id} {
        position: fixed !important;
        left: 0 !important; top: 0 !important;
        width: 100% !important; margin: 0 !important;
        padding: 20px !important; box-shadow: none !important;
        background: #fff !important; color: #111 !important;
      }
      @page { margin: 0.5cm; size: A4; }
    }`;
  document.head.appendChild(style);

  if (typeof logAction === 'function') {
    logAction('PRINT', G.currentPage, `Printed: ${a4Id}`);
  }

  setTimeout(() => {
    window.print();
    setTimeout(() => document.getElementById('print-iso')?.remove(), 500);
  }, 150);
};

// ============================================================
// DEBOUNCE
// ============================================================

window.debounce = function(fn, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
};

// ============================================================
// LOGGING
// ============================================================

window.logAction = async function(action, module, details) {
  if (!G.user) return;
  try {
    await db.collection('logs').add({
      user:      G.user.username,
      role:      G.user.role   || '',
      branch:    G.user.branch || '',
      action,
      module,
      details,
      timestamp: Date.now(),
      timeStr:   new Date().toLocaleString('en-GB')
    });
  } catch (e) {
    console.warn('Log failed:', e.message);
  }
};

// ============================================================
// AUTO RECEIPT CREATION
// ============================================================

window.autoCreateReceipt = async function(
  orderId, orderNo, amount, currency, clientName, carLabel, branch
) {
  if (!amount || amount <= 0) return;

  const now        = new Date();
  const dateStr    = now.toISOString().slice(0, 10);
  const monthStr   = String(now.getMonth() + 1).padStart(2, '0');
  const dayStr     = String(now.getDate()).padStart(2, '0');
  const branchCode = (branch || 'HRG').toUpperCase().slice(0, 3);

  try {
    const snap = await db.collection('receipts')
      .where('branch_code', '==', branchCode)
      .where('receipt_date', '==', dateStr)
      .get();

    const nextNum    = String(snap.size + 1).padStart(3, '0');
    const receiptRef = `RC-${branchCode}-${monthStr}${dayStr}-${nextNum}`;

    await db.collection('receipts').add({
      receipt_ref:     receiptRef,
      contract_no:     String(orderNo),
      order_id:        orderId,
      client_name:     clientName,
      car_label:       carLabel,
      branch,
      branch_code:     branchCode,
      receipt_date:    dateStr,
      type:            'Income',
      currency:        currency || 'EGP',
      amount_egp:      parseFloat(amount) || 0,
      total_egp_equiv: parseFloat(amount) || 0,
      collected_by:    G.user?.username || '',
      note:            'Auto-generated on contract creation',
      timestamp:       Date.now(),
      _sys_created:    firebase.firestore.FieldValue.serverTimestamp()
    });

    return receiptRef;
  } catch (e) {
    console.warn('autoCreateReceipt failed:', e.message);
  }
};
