// ============================================================
// core/utils.js — Version 4.1
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
// EGYPT TIMEZONE
// ============================================================
window.getCairoNow = function() {
  const now = new Date();
  const cairoOffset = now.getTime() - new Date(
    now.toLocaleString('en-US', { timeZone: 'Africa/Cairo' })
  ).getTime();
  return new Date(now.getTime() - cairoOffset);
};

window.getCairoDateStr = function() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
};

window.getCairoDateTime = function() {
  return new Date().toLocaleString('en-GB', { timeZone: 'Africa/Cairo' });
};

window.getCairoTimestamp = function() {
  return new Date().toLocaleString('en-GB', {
    day:'2-digit', month:'short', year:'numeric',
    hour:'2-digit', minute:'2-digit', second:'2-digit',
    timeZone: 'Africa/Cairo'
  });
};

// ============================================================
// DATE PARSING
// ============================================================
window.parseDBDate = function(str) {
  if (!str) return null;
  if (str && str.toDate) return str.toDate();
  const serial = typeof str === 'number' ? str
    : (typeof str === 'string' && /^\d{5}$/.test(str.trim()) ? parseInt(str) : null);
  if (serial && serial > 40000 && serial < 60000)
    return new Date(Date.UTC(1899, 11, 30) + serial * 86400000);

  const isPM = /مساءً|مساء|PM/i.test(str);
  const isAM = /صباحاً|صباح|AM/i.test(str);
  let clean = String(str)
    .replace(/[\u0600-\u06FF\u200c-\u200f\u202a-\u202e]/g, '')
    .replace(/,/g, '').replace(/\s+/g, ' ').trim();
  clean = clean.replace(/^(\d{4}-\d{1,2}-\d{1,2})\s+(\d{1,2}:\d{2})/, '$1T$2');

  let d = new Date(clean);
  if (!isNaN(d.getTime())) {
    if (isPM && d.getHours() < 12) d.setHours(d.getHours() + 12);
    if (isAM && d.getHours() === 12) d.setHours(0);
    return d;
  }

  const dmy = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[T\s]+(\d{1,2}):(\d{2}))?/);
  if (dmy) {
    let h = dmy[4] ? parseInt(dmy[4]) : 0;
    let m = dmy[5] ? parseInt(dmy[5]) : 0;
    if (isPM && h < 12) h += 12;
    if (isAM && h === 12) h = 0;
    d = new Date(parseInt(dmy[3]), parseInt(dmy[2]) - 1, parseInt(dmy[1]), h, m);
    return isNaN(d.getTime()) ? null : d;
  }

  const ymd = clean.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:[T\s]+(\d{1,2}):(\d{2}))?/);
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
  const day   = parseInt(doc[prefix + ' يوم']   || doc[prefix + '_day']   || 0);
  const month = parseInt(doc[prefix + ' شهر']   || doc[prefix + '_month'] || 0);
  const year  = parseInt(doc[prefix + ' سنة']   || doc[prefix + '_year']  || 0);
  let   hour  = parseInt(doc[prefix + ' ساعة']  || 0);
  const min   = parseInt(doc[prefix + ' دقيقة'] || 0);
  const period= doc[prefix + ' الفترة'] || '';
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
  const startRaw = order['تاريخ بداية الإيجار'] || order['بداية التعاقد'] ||
                   order['col_L'] || order['L'] || order['start_date'] || '';
  const endRaw   = order['تاريخ نهاية الإيجار'] || order['نهاية التعاقد'] ||
                   order['col_T'] || order['T'] || order['end_date'] || '';
  let start = parseDBDate(startRaw);
  let end   = parseDBDate(endRaw);
  if (!start) start = parseDateFromComponents(order, 'بداية التعاقد') ||
                      parseDateFromComponents(order, 'تاريخ بداية الإيجار');
  if (!end)   end   = parseDateFromComponents(order, 'نهاية التعاقد') ||
                      parseDateFromComponents(order, 'تاريخ نهاية الإيجار');
  return { start, end };
};

window.getOrderTotal = function(order) {
  return parseAmount(
    order['إجمالي المستحق (Total)'] || order['قحتسملا يلامجإ (Total)'] ||
    order['col_AU'] || order['AU'] || 0
  );
};

window.getOrderPaid = function(order) {
  return parseAmount(
    order['المدفوع EGP'] || order['عوفدملا EGP'] ||
    order['col_AX'] || order['AX'] || 0
  );
};

window.getOrderClientName = function(order) {
  return order['اسم العميل'] || order['ليمعلا مسا'] ||
         order['col_C'] || order['C'] || '';
};

window.getOrderCarCode = function(order) {
  return order['كود السيارة'] || order['ةرايسلا دوك'] ||
         order['col_D'] || order['D'] || '';
};

window.getOrderNo = function(order) {
  return order['No.'] || order['col_A'] || order['A'] || order.id || '';
};

// ============================================================
// ORDER STATUS
// ============================================================
window.getOrderStatus = function(order) {
  if (!order) return 'Active';
  const raw = order['حالة الطلب'] || order['order_status'] || order['Status'] || '';
  if (raw === 'Accident' || raw === 'Cancelled') return raw;
  if (raw === 'Closed' || order.closed === true || order.closed === 'true') return 'Closed';

  const total = getOrderTotal(order);
  const paid  = getOrderPaid(order);
  if (total > 0 && paid >= total) return 'Closed';

  const { start, end } = getOrderDates(order);
  const today      = getCairoNow();
  const todayStart = new Date(today); todayStart.setHours(0, 0, 0, 0);

  if (start && end && start <= today && end >= todayStart) return 'Active';
  if (end && end < todayStart) {
    if (paid > 0) return 'Settled';
    return 'Overdue';
  }
  if (start && today < start) return 'Future';
  return 'Active';
};

window.getOrderPaymentStatus = function(order) {
  const total = getOrderTotal(order);
  const paid  = getOrderPaid(order);
  if (total <= 0) return 'unknown';
  const pct = paid / total;
  if (pct >= 1)   return 'paid';
  if (pct >= 0.5) return 'partial';
  if (pct > 0)    return 'deposit';
  return 'unpaid';
};

// ============================================================
// DATE FORMATTING
// ============================================================
window.fmtDate = function(d) {
  if (!d) return 'N/A';
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0') + ' ' +
    String(d.getHours()).padStart(2, '0') + ':' +
    String(d.getMinutes()).padStart(2, '0');
};

window.fmtDateShort = function(d) {
  if (!d) return 'N/A';
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
};

window.fmtDateTime = function(d, opts) {
  if (!d) return '—';
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return dt.toLocaleString('en-GB', {
    day:'2-digit', month:'short', year:'numeric',
    hour:'2-digit', minute:'2-digit',
    second: (opts && opts.seconds === false) ? undefined : '2-digit',
    timeZone: 'Africa/Cairo',
    ...(opts || {})
  });
};

window.fmtCRMDate = function(val) {
  if (!val) return '—';
  const n = typeof val === 'number' ? val
    : (typeof val === 'string' && /^\d{5}$/.test(val.trim()) ? parseInt(val) : null);
  if (n && n > 40000 && n < 60000)
    return new Date(Date.UTC(1899, 11, 30) + n * 86400000).toISOString().slice(0, 10);
  return String(val).slice(0, 10);
};

window.todayISO  = function() { return getCairoDateStr(); };

window.getTimeAgo = function(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1)  return 'just now';
  if (m < 60) return m + 'm ago';
  if (h < 24) return h + 'h ago';
  return d + 'd ago';
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
// ============================================================
window.getCarLabel = function(car, lang) {
  lang = lang || 'en';
  if (!car) return '';
  const plate    = formatPlate(car);
  const plateStr = plate ? ` | ${plate}` : '';
  if (lang === 'ar') {
    const name = car['الطراز'] || car['النوع'] || car.Model || '';
    const year = car['سنة الصنع'] || '';
    return `${name} (${year})${plateStr}`;
  }
  const label = car.car_label || '';
  if (label) return `${label}${plateStr}`;
  const type  = car.Type  || car['النوع']  || '';
  const model = car.Model || car['الطراز'] || '';
  const year  = car['سنة الصنع'] || '';
  const color = car.Color || car['اللون']  || '';
  return `${type} ${model} (${year}) ${color}${plateStr}`.trim();
};

window.getCarInfo = function(car) {
  const id          = String(car.id  || car.ID  || '');
  const brand       = String(car['col_C'] || car.Type  || '').trim();
  const model       = String(car['col_F'] || car.Model || car['col_E'] || '').trim();
  const year        = String(car['col_H'] || car['سنة الصنع'] || '').trim();
  const colorEN     = String(car.Color    || car['col_J'] || '').trim();
  const colorAR     = String(car['اللون'] || car['col_I'] || colorEN || '').trim();
  const plate       = formatPlate(car);
  const cityRaw     = String(car.City || car.Branch || car['col_CF'] ||
                        car['المحافظة'] || car['محافظة'] ||
                        car.current_location || '').trim();
  const branchCode  = getCarBranchCode(car);
  const branchName  = BRANCH_MAP[branchCode] || cityRaw || '—';
  const contractStatus = String(car['col_AZ'] || car.Contract || car['حاله التعاقد'] || '').trim();
  const ownerFirst  = String(car['col_BP'] || car['الاسم الأول'] || '').trim();
  const ownerLast   = String(car['col_BQ'] || car['الاسم الأخير'] || '').trim();
  const ownerName   = (ownerFirst + ' ' + ownerLast).trim() || '—';
  const monthlyFee  = parseAmount(car['col_CJ'] || car['monthly_fee'] || car['القيمة المالية'] || 0);
  return {
    id, brand, model, year, colorEN, colorAR, plate,
    branchCode, branchName, contractStatus, ownerName, monthlyFee,
    label  : getCarLabel(car, 'en'),
    labelAR: getCarLabel(car, 'ar')
  };
};

window.formatPlate = function(car) {
  if (!car) return '';
  if (car.plate && String(car.plate).trim() && String(car.plate).trim() !== '-')
    return String(car.plate).trim();
  const letter1 = String(car['احرف اللوحة'] || '').trim();
  const letter2 = String(car._c23 || '').trim();
  const letter3 = String(car._c24 || '').trim();
  const num1    = String(car['رقم اللوحة'] || '').trim();
  const num2    = String(car._c26 || '').trim();
  const num3    = String(car._c27 || '').trim();
  const num4    = String(car._c28 || '').trim();
  const letters = [letter1, letter2, letter3].filter(Boolean).join(' ');
  const numbers = [num1, num2, num3, num4].filter(Boolean).join(' ');
  if (letters || numbers) return [letters, numbers].filter(Boolean).join(' ');
  return String(car['حرف'] || car['حرف_1'] || '').trim();
};

window.getCarById = function(id) {
  if (!id) return null;
  const s = String(id).trim();
  return G.fleet.find(c =>
    String(c.id  || '').trim() === s ||
    String(c.ID  || '').trim() === s ||
    String(c['No.']   || '').trim() === s ||
    String(c['col_A'] || '').trim() === s
  ) || null;
};

// ============================================================
// CAR STATUS CATEGORY
// ============================================================
window.getCarStatusCategory = function(car) {
  if (!car) return 'available';
  const today       = getCairoNow();
  const carCode     = String(car.ID || car.id || '').trim();
  const carCodeInt  = String(parseInt(carCode) || '');
  const carNo       = String(car['No.'] || '').trim();

  function findActiveBooking() {
    if (!G.bookings || !G.bookings.length || !carCode) return null;
    return G.bookings.find(b => {
      const bCarRaw = String(b['كود السيارة'] || b.car_id || '').trim();
      const bCarInt = String(parseInt(bCarRaw) || '');
      const matches = bCarRaw === carCode ||
                      bCarRaw === carNo ||
                      (bCarInt && carCodeInt && bCarInt === carCodeInt);
      if (!matches) return false;
      const bSt = String(b['حالة الطلب'] || b.status || '').toLowerCase();
      if (b.closed === true || b.closed === 'true') return false;
      if (bSt === 'closed' || bSt === 'cancelled') return false;
      if (bSt === 'accident') return true;
      const { start, end } = getOrderDates(b);
      if (!start || !end) return false;
      return start <= today && today <= end;
    });
  }

  const statusField = String(car.status || car['الحالة'] || '').toLowerCase();
  if (statusField === 'maintenance' || statusField === 'صيانة') return 'maintenance';

  const isExplicitlyArchived =
    car.archived === true || car.archived === 'true' ||
    car.is_active === false || car.is_active === 'false' ||
    car.is_active === 0     || car.is_active === '0';
  const contract = String(car.Contract || car['حاله التعاقد'] || '').toLowerCase();
  const contractExpired = contract === 'expired'  || contract === 'منتهي' ||
                          contract === 'finished' || contract === 'cancelled';
  const handover       = car['تاريخ التسليم'] || car.handover_date || '';
  const handoverPassed = handover
    ? (!isNaN(new Date(handover).getTime()) && new Date(handover) < today)
    : false;

  if (isExplicitlyArchived || contractExpired || handoverPassed) {
    const activeBooking = findActiveBooking();
    if (activeBooking) {
      const bSt = String(activeBooking['حالة الطلب'] || '').toLowerCase();
      return bSt === 'accident' ? 'accident' : 'rented';
    }
    return 'archived';
  }

  const activeBooking = findActiveBooking();
  if (activeBooking) {
    const bSt = String(activeBooking['حالة الطلب'] || '').toLowerCase();
    return bSt === 'accident' ? 'accident' : 'rented';
  }

  if (statusField === 'accident') return 'accident';
  if (statusField === 'rented')   return 'rented';
  return 'available';
};

// ============================================================
// CAR COUNTS
// ============================================================
window.getCarCounts = function() {
  const counts = { available:0, rented:0, future:0, archived:0, accident:0, maintenance:0 };
  const bc     = { HRG:0, ALX:0, CAI:0, RSH:0 };

  G.fleet.forEach(car => {
    const cat = getCarStatusCategory(car);
    if      (cat === 'archived')    counts.archived++;
    else if (cat === 'accident')    counts.accident++;
    else if (cat === 'maintenance') counts.maintenance++;
    else if (cat === 'rented')      counts.rented++;
    else                            counts.available++;

    const b   = (car.Branch || car.City || car['المحافظة'] || car['محافظة'] ||
                 car['col_CF'] || car.current_location || '').toLowerCase();
    const loc = (car.current_location || '').toUpperCase();
    let branch = '';
    if      (loc.startsWith('HRG') || b.includes('hurghada')   || b.includes('الغردقة'))   branch = 'HRG';
    else if (loc.startsWith('ALX') || b.includes('alexandria') || b.includes('اسكندرية')) branch = 'ALX';
    else if (loc.startsWith('CAI') || b.includes('cairo')      || b.includes('قاهرة'))    branch = 'CAI';
    else if (loc.startsWith('RSH') || b.includes('rashid')     || b.includes('رشيد'))     branch = 'RSH';
    if (!branch) branch = G.user?.branch || 'HRG';
    if (bc[branch] !== undefined) bc[branch]++;
  });

  counts.active = counts.available;
  return { counts, branchCounts: bc };
};

window.getCarBranchCode = function(car) {
  const b = (car.Branch || car.City || car['المحافظة'] || car['محافظة'] ||
             car['col_CF'] || car.current_location || '').toLowerCase();
  if (b.includes('hurghada')   || b.includes('الغردقة')   || b.includes('hrg')) return 'HRG';
  if (b.includes('alexandria') || b.includes('اسكندرية') || b.includes('alx')) return 'ALX';
  if (b.includes('cairo')      || b.includes('قاهرة')    || b.includes('cai')) return 'CAI';
  if (b.includes('rashid')     || b.includes('رشيد')     || b.includes('rsh')) return 'RSH';
  return '';
};

// ============================================================
// RATE CARD SYSTEM
// ============================================================
window._rateCardCache     = null;
window._rateCardCacheTime = 0;

window.loadRateCards = async function(forceRefresh) {
  const now = Date.now();
  if (!forceRefresh && window._rateCardCache &&
      now - window._rateCardCacheTime < 5 * 60 * 1000) {
    return window._rateCardCache;
  }
  try {
    const snap = await db.collection('rate_cards').get();
    window._rateCardCache     = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    window._rateCardCacheTime = now;
    return window._rateCardCache;
  } catch (e) {
    console.warn('Rate cards load error:', e.message);
    return window._rateCardCache || [];
  }
};

window.getRateForCar = async function(carId, days) {
  days = Math.max(1, parseInt(days) || 1);
  const cards = await loadRateCards();
  const card  = cards.find(c =>
    String(c.car_id) === String(carId) ||
    String(c.car_id) === String(parseInt(carId))
  );

  if (card && card.tiers && card.tiers.length) {
    const tier = card.tiers
      .slice()
      .sort((a, b) => a.min_days - b.min_days)
      .find(t =>
        days >= t.min_days &&
        (t.max_days === null || t.max_days === undefined || days <= t.max_days)
      );
    if (tier) {
      const label = tier.max_days
        ? `${tier.min_days}–${tier.max_days} days`
        : `${tier.min_days}+ days`;
      return { dailyRate: tier.daily_rate, tierLabel: label,
               source: 'rate_card', cardId: card.id };
    }
  }

  if (!card) {
    const car = getCarById(String(carId));
    if (car) {
      const carType  = (car.Type  || car['النوع']  || '').toLowerCase();
      const carModel = (car.Model || car['الطراز'] || '').toLowerCase();
      const modelCard = cards.find(c => {
        const cType  = (c.car_type  || '').toLowerCase();
        const cModel = (c.car_model || '').toLowerCase();
        return (cType  && carType.includes(cType)) ||
               (cModel && carModel.includes(cModel));
      });
      if (modelCard && modelCard.tiers && modelCard.tiers.length) {
        const tier = modelCard.tiers
          .slice()
          .sort((a, b) => a.min_days - b.min_days)
          .find(t =>
            days >= t.min_days &&
            (t.max_days === null || t.max_days === undefined || days <= t.max_days)
          );
        if (tier) {
          const label = tier.max_days
            ? `${tier.min_days}–${tier.max_days} days`
            : `${tier.min_days}+ days`;
          return { dailyRate: tier.daily_rate, tierLabel: label,
                   source: 'model_match', cardId: modelCard.id };
        }
      }
    }
  }

  return { dailyRate: 0, tierLabel: '—', source: 'none', cardId: null };
};

window.getRateTiersForCar = async function(carId) {
  const cards = await loadRateCards();
  const card  = cards.find(c =>
    String(c.car_id) === String(carId) ||
    String(c.car_id) === String(parseInt(carId))
  );
  if (!card || !card.tiers) return [];
  return card.tiers.slice().sort((a, b) => a.min_days - b.min_days);
};

window.saveRateCard = async function(carId, tiers, branch) {
  if (!['Admin', 'Executive'].includes(G.user?.role)) {
    toast('Admin access required to edit rate cards', 'error');
    return false;
  }
  const car = getCarById(String(carId));
  if (!car) { toast('Car not found', 'error'); return false; }

  const carLabel = car.car_label || getCarLabel(car, 'en');
  const carModel = car.Model     || car['الطراز'] || '';
  const carType  = car.Type      || car['النوع']  || '';
  const carYear  = car['سنة الصنع'] || '';

  if (!tiers || !tiers.length) { toast('At least one tier is required', 'error'); return false; }

  const sorted = tiers
    .slice()
    .sort((a, b) => a.min_days - b.min_days)
    .map(t => ({
      min_days  : parseInt(t.min_days) || 1,
      max_days  : t.max_days ? parseInt(t.max_days) : null,
      daily_rate: parseAmount(t.daily_rate)
    }));

  for (const t of sorted) {
    if (t.daily_rate <= 0) {
      toast('All tiers must have a rate greater than 0', 'error');
      return false;
    }
  }

  try {
    const existing = await db.collection('rate_cards')
      .where('car_id', '==', String(carId)).limit(1).get();

    const data = {
      car_id    : String(carId),
      car_label : carLabel,
      car_model : carModel,
      car_type  : carType,
      car_year  : carYear,
      branch    : branch || getCarBranchCode(car) || '',
      tiers     : sorted,
      updated_by: G.user?.username || '',
      updated_at: Date.now()
    };

    if (!existing.empty) {
      await db.collection('rate_cards').doc(existing.docs[0].id).update(data);
    } else {
      await db.collection('rate_cards').add(data);
    }

    window._rateCardCache     = null;
    window._rateCardCacheTime = 0;

    await logAction('EDIT', 'Rate Card',
      `Updated rate card for ${carLabel} — ${sorted.length} tiers`);
    // ✅ FIX 1: was tagged template literal
    toast(`✅ Rate card saved for ${carLabel}`, 'success');
    return true;
  } catch (e) {
    toast('Failed to save rate card: ' + e.message, 'error');
    return false;
  }
};

window.deleteRateCard = async function(cardId, carLabel) {
  if (G.user?.role !== 'Admin') { toast('Admin only', 'error'); return false; }
  // ✅ FIX 2: was tagged template literal confirm
  if (!confirm(`Delete rate card for ${carLabel}? This cannot be undone.`)) return false;
  try {
    await db.collection('rate_cards').doc(cardId).delete();
    window._rateCardCache     = null;
    window._rateCardCacheTime = 0;
    toast('Rate card deleted', 'success');
    return true;
  } catch (e) {
    toast('Delete failed: ' + e.message, 'error');
    return false;
  }
};

window.buildRateTierDisplay = function(tiers) {
  if (!tiers || !tiers.length)
    return '<span style="color:var(--text3);">No rates set</span>';
  return tiers.slice().sort((a, b) => a.min_days - b.min_days).map(t => {
    const label = t.max_days
      ? `${t.min_days}–${t.max_days} days`
      : `${t.min_days}+ days`;
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;
        padding:4px 8px;background:var(--surface);border-radius:6px;
        font-size:11px;margin-bottom:3px;">
        <span style="color:var(--text3);">📅 ${label}</span>
        <span style="font-weight:700;color:var(--success);">
          ${fmtMoney(t.daily_rate)}/day
        </span>
      </div>`;
  }).join('');
};

window.autoFillRateFromCard = async function(carId, days, rateInputId) {
  if (!carId || !days) return;
  const result = await getRateForCar(carId, days);
  if (result.dailyRate > 0) {
    const el = document.getElementById(rateInputId);
    if (el) {
      el.value = result.dailyRate;
      el.dispatchEvent(new Event('input'));
    }
    toast(
      `💰 Rate auto-filled: ${fmtMoney(result.dailyRate)}/day (${result.tierLabel})`,
      'info', 3000
    );
  }
};

// ============================================================
// DOCUMENT REFERENCE GENERATOR
// ============================================================
window.generateDocRef = async function(type, branchCode) {
  const n    = new Date();
  const ddmm = String(n.getDate()).padStart(2, '0') +
               String(n.getMonth() + 1).padStart(2, '0');
  const key  = type + '-' + (branchCode || 'GEN') + '-' + ddmm;
  try {
    const seq = await db.runTransaction(async tx => {
      const ref = db.collection('_counters').doc(key);
      const doc = await tx.get(ref);
      const next = doc.exists ? (doc.data().seq || 0) + 1 : 1;
      tx.set(ref, { seq: next, updated: Date.now() }, { merge: true });
      return next;
    });
    return type + '-' + (branchCode || 'GEN') + '-' + ddmm + '-' +
           String(seq).padStart(3, '0');
  } catch (e) {
    return type + '-' + (branchCode || 'GEN') + '-' + ddmm + '-' +
           Date.now().toString().slice(-4);
  }
};

// ============================================================
// QR CODE AND BARCODE
// ============================================================
window.attachQRAndBarcode = function(ref) {
  const qrId     = 'qr-' + ref.replace(/[^a-zA-Z0-9]/g, '');
  const bcId     = 'bc-' + ref.replace(/[^a-zA-Z0-9]/g, '');
  const verifyUrl = 'https://sabryabr.github.io/BrothersEGY-ERP/verify.html?ref=' + ref;
  setTimeout(() => {
    const qrEl = document.getElementById(qrId);
    if (qrEl) {
      qrEl.innerHTML = '';
      try {
        new QRCode(qrEl, {
          text: verifyUrl, width:80, height:80,
          colorDark:'#1e40af', colorLight:'#ffffff',
          correctLevel: QRCode.CorrectLevel.M
        });
      } catch (e) { qrEl.textContent = ref; }
    }
    const bcEl = document.getElementById(bcId);
    if (bcEl) {
      try {
        JsBarcode('#' + bcId, ref, {
          format:'CODE128', lineColor:'#1e40af', width:1.5,
          height:35, displayValue:true, fontSize:8, margin:2, background:'#f8fafc'
        });
      } catch (e) {}
    }
  }, 300);
};

window.a4FooterHTML = function(ref, docType, isRTL) {
  const qrId = 'qr-' + ref.replace(/[^a-zA-Z0-9]/g, '');
  const bcId = 'bc-' + ref.replace(/[^a-zA-Z0-9]/g, '');
  return `
    <div style="display:flex;align-items:center;gap:14px;background:#f8fafc;
      border:1px solid #e2e8f0;border-radius:8px;padding:10px 13px;
      margin-top:14px;${isRTL ? 'direction:rtl;' : ''}">
      <div id="${qrId}" style="flex-shrink:0;width:80px;height:80px;"></div>
      <div style="flex:1;">
        <div style="font-size:11px;font-weight:800;color:#1e40af;">
          BROTHERS EGY – ${docType}
        </div>
        <div style="font-size:9px;color:#64748b;margin-top:2px;">Ref: ${ref}</div>
        <div style="font-size:9px;color:#64748b;">
          Issued by: ${G.user?.username || '-'} |
          ${new Date().toLocaleString('en-GB', { timeZone:'Africa/Cairo' })}
        </div>
        <div style="font-size:8px;color:#3b82f6;margin-top:2px;">
          Verify: sabryabr.github.io/BrothersEGY-ERP/verify.html?ref=${ref}
        </div>
        <canvas id="${bcId}"
          style="max-width:180px;height:45px;display:block;margin-top:4px;">
        </canvas>
      </div>
      <div style="border:3px solid #1e40af;border-radius:50%;width:68px;height:68px;
        flex-shrink:0;display:flex;flex-direction:column;align-items:center;
        justify-content:center;background:rgba(30,64,175,0.06);">
        <div style="font-size:8px;font-weight:900;color:#1e40af;text-align:center;">
          ${(G.user?.username || 'STAFF').toUpperCase()}
        </div>
        <div style="font-size:7px;color:#64748b;text-align:center;">
          ${BRANCH_MAP[G.user?.branch] || G.user?.branch || ''}
        </div>
        <div style="font-size:6px;color:#94a3b8;text-align:center;">
          ${new Date().toLocaleDateString('en-GB', { timeZone:'Africa/Cairo' })}
        </div>
      </div>
    </div>`;
};

// ============================================================
// IMAGE COMPRESSION
// ============================================================
window.compressImage = function(file, maxW, quality) {
  const outputType    = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const outputQuality = file.type === 'image/png' ? undefined : quality;
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = function() {
      const scale  = Math.min(1, maxW / img.width);
      const canvas = document.createElement('canvas');
      canvas.width  = img.width  * scale;
      canvas.height = img.height * scale;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(b => { resolve(b); }, outputType, outputQuality);
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
  style.id = 'print-iso';
  style.textContent =
    `@media print{body *{visibility:hidden!important;}` +
    `#${a4Id},#${a4Id} *{visibility:visible!important;}` +
    `#${a4Id}{position:fixed!important;left:0!important;top:0!important;` +
    `width:100%!important;margin:0!important;padding:20px!important;` +
    `box-shadow:none!important;background:#fff!important;color:#111!important;}` +
    `@page{margin:0.5cm;size:A4;}}`;
  document.head.appendChild(style);
  if (typeof logAction === 'function') logAction('PRINT', G.currentPage, 'Printed: ' + a4Id);
  setTimeout(() => {
    window.print();
    setTimeout(() => { document.getElementById('print-iso')?.remove(); }, 500);
  }, 150);
};

// ============================================================
// DEBOUNCE
// ============================================================
window.debounce = function(fn, delay) {
  let timer;
  return function() {
    const args = arguments, ctx = this;
    clearTimeout(timer);
    timer = setTimeout(() => { fn.apply(ctx, args); }, delay);
  };
};

// ============================================================
// LOGGING
// ============================================================
window.logAction = async function(action, module, details) {
  if (!G.user) return;
  try {
    await db.collection('logs').add({
      user     : G.user.username,
      role     : G.user.role   || '',
      branch   : G.user.branch || '',
      action, module, details,
      timestamp: Date.now(),
      timeStr  : new Date().toLocaleString('en-GB', { timeZone: 'Africa/Cairo' })
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
  const cairoDate  = getCairoDateStr();
  const now        = new Date();
  const monthStr   = String(now.getMonth() + 1).padStart(2, '0');
  const dayStr     = String(now.getDate()).padStart(2, '0');
  const branchCode = (branch || 'HRG').toUpperCase().slice(0, 3);
  try {
    const snap = await db.collection('receipts')
      .where('branch_code', '==', branchCode)
      .where('receipt_date', '==', cairoDate)
      .get();
    const rcRef = 'RC-' + branchCode + '-' + monthStr + dayStr + '-' +
                  String(snap.size + 1).padStart(3, '0');
    await db.collection('receipts').add({
      receipt_ref    : rcRef,
      contract_no    : String(orderNo),
      order_id       : orderId,
      client_name    : clientName,
      car_label      : carLabel,
      branch, branch_code: branchCode,
      receipt_date   : cairoDate,
      type           : 'Income',
      currency       : currency || 'EGP',
      amount_egp     : parseFloat(amount) || 0,
      total_egp_equiv: parseFloat(amount) || 0,
      collected_by   : G.user?.username || '',
      note           : 'Auto-generated on contract creation',
      timestamp      : Date.now(),
      _sys_created   : firebase.firestore.FieldValue.serverTimestamp()
    });
    return rcRef;
  } catch (e) {
    console.warn('autoCreateReceipt failed:', e.message);
  }
};

// ============================================================
// VERIFY URL
// ============================================================
window.buildVerifyUrl = function(refOrOrder) {
  if (!refOrOrder) return '';
  if (typeof refOrOrder === 'string') {
    return `https://sabryabr.github.io/BrothersEGY-ERP/verify.html?ref=${
      encodeURIComponent(refOrOrder)}`;
  }
  const ref = String(refOrOrder['No.'] || refOrOrder.id || '').trim();
  if (!ref) return '';
  return `https://sabryabr.github.io/BrothersEGY-ERP/verify.html?ref=${
    encodeURIComponent(ref)}`;
};

// ============================================================
// COLLAPSIBLE PANEL HELPER
// ============================================================
window.buildCollapsibleHeader = function(id, html, defaultOpen) {
  defaultOpen = defaultOpen !== false;
  const storageKey  = `panel_collapsed_${id}`;
  const isCollapsed = localStorage.getItem(storageKey) === 'true' ? true : !defaultOpen;
  return `
    <div id="panel-header-${id}"
      style="position:relative;margin-bottom:${isCollapsed ? '8px' : '0'};">
      <div style="display:flex;align-items:center;justify-content:space-between;
        flex-wrap:wrap;gap:8px;">
        <div style="flex:1;min-width:0;">${html}</div>
        <button id="panel-toggle-${id}"
          onclick="togglePanelHeader('${id}')"
          style="background:var(--surface2);border:1px solid var(--border);
            border-radius:6px;padding:4px 8px;cursor:pointer;
            color:var(--text3);font-size:12px;white-space:nowrap;
            flex-shrink:0;transition:all 0.2s;"
          title="${isCollapsed ? 'Show' : 'Hide'} panel">
          ${isCollapsed ? '▼ Show' : '▲ Hide'}
        </button>
      </div>
      <div id="panel-body-${id}"
        style="overflow:hidden;transition:max-height 0.3s ease;
          max-height:${isCollapsed ? '0px' : '500px'};">
      </div>
    </div>`;
};

window.togglePanelHeader = function(id) {
  const storageKey = `panel_collapsed_${id}`;
  // ✅ FIX 3: were tagged template literals
  const body   = document.getElementById(`panel-body-${id}`);
  const btn    = document.getElementById(`panel-toggle-${id}`);
  const header = document.getElementById(`panel-header-${id}`);
  if (!body) return;
  const isNowCollapsed = body.style.maxHeight !== '0px';
  body.style.maxHeight = isNowCollapsed ? '0px' : '500px';
  if (btn)    btn.textContent          = isNowCollapsed ? '▼ Show' : '▲ Hide';
  if (header) header.style.marginBottom = isNowCollapsed ? '8px' : '0';
  localStorage.setItem(storageKey, isNowCollapsed ? 'true' : 'false');
};

// ============================================================
// PAYMENT STATUS HELPERS
// ============================================================
window.PAYMENT_STATUS_COLORS = {
  paid   : '#22c55e',
  partial: '#f59e0b',
  unpaid : '#ef4444',
  overdue: '#dc2626',
  clear  : '#22c55e'
};

window.getPaymentStatus = function(order) {
  const total = parseAmount(order['إجمالي المستحق (Total)'] || 0);
  const paid  = parseAmount(order['المدفوع EGP'] || 0);
  if (total <= 0) return 'clear';
  if (paid  <= 0) return 'unpaid';
  if (paid  >= total) return 'paid';
  const { end } = getOrderDates(order);
  const today   = getCairoNow();
  if (end && today > end && !order.closed) return 'overdue';
  return 'partial';
};

window.getPaymentStatusLabel = function(order) {
  return {
    paid   : '✅ Paid',
    partial: '⚡ Partial',
    unpaid : '❌ Unpaid',
    overdue: '🔴 Overdue Debt',
    clear  : '✅ Clear'
  }[window.getPaymentStatus(order)] || '—';
};

// ============================================================
// GLOBAL USER REGISTRY
// ============================================================
window.G_USERS = window.G_USERS || [];

window.loadSystemUsers = async function() {
  if (window.G_USERS.length > 0) return window.G_USERS;
  try {
    const snap = await db.collection('users').get();
    window.G_USERS = snap.docs.map(d => ({
      id      : d.id,
      username: d.data().username || d.data().name || d.id,
      role    : d.data().role   || 'Staff',
      branch  : d.data().branch || '',
      email   : d.data().email  || ''
    }));
  } catch (_) {
    try {
      const logSnap = await db.collection('logs')
        .orderBy('timestamp', 'desc').limit(200).get();
      const seen = new Set();
      logSnap.docs.forEach(d => {
        const u = d.data().user;
        if (u && !seen.has(u)) {
          seen.add(u);
          window.G_USERS.push({ username: u, role: 'Staff', branch: '' });
        }
      });
    } catch (_) {}
  }
  return window.G_USERS;
};

window.buildUserDropdown = function(selectId, selectedValue, extraOption) {
  selectedValue = selectedValue || '';
  extraOption   = extraOption   || '<option value="">-- Select User --</option>';
  const users   = window.G_USERS.length > 0
    ? window.G_USERS
    : [{ username: G.user?.username || 'me', role: G.user?.role || '' }];
  const opts = users.map(u => `
    <option value="${u.username}"
      ${u.username === selectedValue ? 'selected' : ''}>
      ${u.username}${u.role ? ' (' + u.role + ')' : ''}
      ${u.branch ? ' — ' + (BRANCH_MAP[u.branch] || u.branch) : ''}
    </option>`).join('');
  return extraOption + opts;
};

// ============================================================
// renderPageLoading
// ============================================================
window.renderPageLoading = function(pageId, icon, title) {
  const el = document.getElementById(pageId);
  if (!el) return;
  el.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;
      justify-content:center;padding:80px 20px;color:var(--text3);">
      <div style="font-size:48px;margin-bottom:16px;">${icon}</div>
      <div style="font-size:14px;font-weight:700;margin-bottom:8px;">${title}</div>
      <div class="spinner lg"></div>
    </div>`;
};

// ============================================================
// NAVIGATION STACK
// ============================================================
window._navStack = window._navStack || [];
window.pushNav   = function(label, fn) { window._navStack.push({ label, fn }); };
window.popNav    = function() {
  if (window._navStack.length > 1) {
    window._navStack.pop();
    const prev = window._navStack[window._navStack.length - 1];
    if (prev?.fn) prev.fn();
  }
};

// ============================================================
// loadSharedData
// ============================================================
window.loadSharedData = async function() {
  const promises = [];
  if (!G.fleet.length)    promises.push(loadFleetData());
  if (!G.bookings.length) promises.push(loadBookingsData());
  if (!G.customers || !G.customers.length) {
    promises.push(
      db.collection('customers').limit(1000).get()
        .then(snap => {
          G.customers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }).catch(() => {})
    );
  }
  await Promise.allSettled(promises);
};

// ============================================================
// loadFleetData / loadBookingsData
// ============================================================
window.loadFleetData = async function() {
  try {
    const snap = await db.collection('fleet').get();
    G.fleet = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // ✅ FIX 4: were tagged template literals
    console.log(`[Fleet] Loaded ${G.fleet.length} cars`);
    const rented    = G.fleet.filter(c => getCarStatusCategory(c) === 'rented').length;
    const available = G.fleet.filter(c => getCarStatusCategory(c) === 'available').length;
    console.log(`[Fleet] Active: ${rented} rented | ${available} available`);
  } catch (e) {
    console.warn('[Fleet] Load error:', e.message);
  }
};

window.loadBookingsData = async function() {
  try {
    const isPriv = ['Admin', 'Executive'].includes(G.user?.role);
    const snap   = await db.collection('bookings').limit(isPriv ? 2000 : 600).get();
    let orders   = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (!isPriv) {
      orders = orders.filter(o =>
        o['فرع الإصدار'] === G.user?.branch ||
        o.assigned_user  === G.user?.username ||
        (!o['فرع الإصدار'] && !o.assigned_user)
      );
    }
    G.bookings      = orders;
    G.activeBookings= orders;
    window.allOrders= orders;
  } catch (e) {
    console.warn('[Bookings] Load error:', e.message);
  }
};

// ============================================================
// MODAL HELPERS
// ============================================================
window.openModal = function(title, html, wide) {
  const modal   = document.getElementById('global-modal');
  const titleEl = document.getElementById('global-modal-title');
  const bodyEl  = document.getElementById('global-modal-body');
  if (!modal || !bodyEl) return;
  if (titleEl) titleEl.textContent = title;
  bodyEl.innerHTML = html;
  modal.classList.add('open');
  if (wide) modal.classList.add('wide');
  else      modal.classList.remove('wide');
  setTimeout(() => {
    const first = bodyEl.querySelector('input,select,textarea,button');
    if (first) first.focus();
  }, 100);
};

window.closeModal = function() {
  const modal = document.getElementById('global-modal');
  if (modal) {
    modal.classList.remove('open');
    modal.classList.remove('wide');
  }
};

// ============================================================
// TOAST
// ============================================================
window.toast = function(message, type, duration) {
  type     = type     || 'info';
  duration = duration || 3500;
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText =
      'position:fixed;bottom:20px;right:20px;z-index:99999;' +
      'display:flex;flex-direction:column;gap:8px;pointer-events:none;';
    document.body.appendChild(container);
  }
  const colors = {
    success: { bg:'#22c55e', icon:'✅' },
    error  : { bg:'#ef4444', icon:'❌' },
    warning: { bg:'#f59e0b', icon:'⚠️' },
    info   : { bg:'#3b82f6', icon:'ℹ️' }
  };
  const cfg = colors[type] || colors.info;
  const el  = document.createElement('div');
  el.style.cssText =
    `background:${cfg.bg};color:#fff;padding:10px 16px;border-radius:10px;` +
    `font-size:13px;font-weight:600;box-shadow:0 4px 20px rgba(0,0,0,0.4);` +
    `max-width:340px;pointer-events:auto;opacity:0;transition:opacity 0.2s;` +
    `display:flex;align-items:center;gap:8px;`;
  el.innerHTML = `<span>${cfg.icon}</span><span>${message}</span>`;
  container.appendChild(el);
  requestAnimationFrame(() => { el.style.opacity = '1'; });
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 250);
  }, duration);
};

// ============================================================
// CONSTANTS (safeguard re-declarations)
// ============================================================
if (!window.BRANCH_MAP) {
  window.BRANCH_MAP = { HRG:'Hurghada', ALX:'Alexandria', CAI:'Cairo', RSH:'Rashid' };
}
if (!window.BRANCH_AR) {
  window.BRANCH_AR = { HRG:'الغردقة', ALX:'الإسكندرية', CAI:'القاهرة', RSH:'رشيد' };
}
if (!window.FLEET_FILTER) {
  window.FLEET_FILTER = {
    status  : { active:true, archived:false, accident:true, maintenance:true },
    branches: { HRG:true, ALX:true, CAI:true, RSH:true },
    search  : ''
  };
}

window.saveFleetFilterState = function() {
  try { localStorage.setItem('fleet_filter', JSON.stringify(FLEET_FILTER)); } catch (_) {}
};

window.loadFleetFilterState = function() {
  try {
    const saved = localStorage.getItem('fleet_filter');
    if (saved) {
      const parsed = JSON.parse(saved);
      Object.assign(FLEET_FILTER.status,   parsed.status   || {});
      Object.assign(FLEET_FILTER.branches, parsed.branches || {});
      FLEET_FILTER.search = parsed.search || '';
    }
    if (!['Admin', 'Executive'].includes(G.user?.role)) {
      Object.keys(FLEET_FILTER.branches).forEach(b => {
        FLEET_FILTER.branches[b] = (b === G.user?.branch);
      });
    }
  } catch (_) {}
};

if (!window.G) {
  window.G = {
    user: null, fleet: [], bookings: [], customers: [],
    proposals: [], activeBookings: [],
    ratesUSD: 55, ratesEUR: 60,
    settings: {}, unsubscribers: []
  };
}

if (!window.dashCharts) window.dashCharts = {};
