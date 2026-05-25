// ============================================================
// sync-sheets.js
// Sheets → Firestore ONLY (Google Sheets is master)
//
// Uses your existing 6 spreadsheets from the Streamlit dashboard
// Run manually:  node sync-sheets.js
// Scheduled:     Windows Task Scheduler (see setup below)
// ============================================================

const { google } = require('googleapis');
const admin      = require('firebase-admin');
const fs         = require('fs');

// ============================================================
// YOUR EXACT SPREADSHEET IDs (from Streamlit dashboard)
// ============================================================

const SHEETS = {
  cars: {
    id:         '1tQVkPj7tCnrKsHEIs04a1WzzC04jpOWuLsXgXOkVMkk',
    tab:        'صفحة الإدخالات لقاعدة البيانات',
    collection: 'fleet',
    headerRow:  0,      // row 1 = index 0
    idCol:      0,      // column A = car code
    docIdPrefix:'car'
  },
  orders: {
    id:         '1T6j2xnRBTY31crQcJHioKurs4Rvaj-VlEQkm6joGxGM',
    tab:        'صفحة الإدخالات للإيجارات',
    collection: 'bookings',
    headerRow:  0,      // confirmed: row 1 only
    idCol:      0,      // column A = order No.
    docIdPrefix:'order'
  },
  clients: {
    id:         '13YZOGdRCEy7IMZHiTmjLFyO417P8dD0m5Sh9xwKI8js',
    tab:        'صفحة الإدخالات لقاعدة البيانات',
    collection: 'customers',
    headerRow:  0,
    idCol:      0,      // column A = client code
    docIdPrefix:'client'
  },
  collections: {
    id:         '1jtp-ihtAOt9NNHETZ5muiL5OA9yW3WrpBIIDAf5UAyg',
    tab:        'صفحة الإدخالات لقاعدة البيانات',
    collection: 'collections',
    headerRow:  0,
    idCol:      null,   // no stable ID col — use row index
    docIdPrefix:'coll'
  },
  car_expenses: {
    id:         '1vDKKOywOEGfmLcHr4xk7KMTChHJ0_qquNopXpD81XVE',
    tab:        'صفحة الإدخالات لقاعدة البيانات',
    collection: 'car_expenses',
    headerRow:  0,
    idCol:      null,
    docIdPrefix:'carexp'
  },
  gen_expenses: {
    id:         '1hZoymf0CN1wOssc3ddQiZXxbJTdzJZBnamp_aCobl1Q',
    tab:        'صفحة الإدخالات لقاعدة البيانات',
    collection: 'gen_expenses',
    headerRow:  0,
    idCol:      null,
    docIdPrefix:'genexp'
  }
};

// ============================================================
// CONFIG
// ============================================================

const SERVICE_ACCOUNT_PATH = './service-account.json';
const GOOGLE_CREDS_PATH    = './google-credentials.json';
const PROJECT_ID           = 'brothers-egy-portal';

// How many rows to write per Firestore batch (max 500)
const BATCH_SIZE = 400;

// ============================================================
// INIT
// ============================================================

let db;
let sheets;

function initFirebase() {
  if (admin.apps.length) return;
  const sa = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    projectId:  PROJECT_ID
  });
  db = admin.firestore();
  log('Firebase', 'Initialized ✅');
}

async function initSheets() {
  const creds  = JSON.parse(fs.readFileSync(GOOGLE_CREDS_PATH, 'utf8'));
  const auth   = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });
  const client = await auth.getClient();
  sheets = google.sheets({ version: 'v4', auth: client });
  log('Sheets', 'Initialized ✅');
}

// ============================================================
// UTILITIES
// ============================================================

function log(section, msg) {
  const ts = new Date().toLocaleString('en-GB');
  console.log(`[${ts}] [${section}] ${msg}`);
}

function safeStr(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

// Build clean headers — handles duplicates and empty columns
function buildHeaders(rawHeaders) {
  const seen    = {};
  const headers = [];
  rawHeaders.forEach((h, i) => {
    let key = safeStr(h) || `_col_${i}`;
    if (seen[key] !== undefined) {
      seen[key]++;
      key = `${key}_${seen[key]}`;
    } else {
      seen[key] = 0;
    }
    headers.push(key);
  });
  return headers;
}

// Convert a sheet row array to a Firestore-safe object
function rowToDoc(headers, row, rowIndex, sheetKey) {
  const doc = {};
  headers.forEach((h, i) => {
    const val = safeStr(row[i] || '');
    if (val !== '') doc[h] = val;
  });

  // Sync metadata — never overwrites real data
  doc._synced_at  = Date.now();
  doc._source     = 'sheets';
  doc._sheet_key  = sheetKey;
  doc._row_index  = rowIndex + 2; // 1-based, +1 for header row

  return doc;
}

// Build a stable Firestore document ID for each row
function buildDocId(sheetConfig, doc, rowIndex) {
  const prefix = sheetConfig.docIdPrefix;

  // Use the ID column if configured
  if (sheetConfig.idCol !== null) {
    const headers = Object.keys(doc).filter(k => !k.startsWith('_'));
    const idHeader= headers[sheetConfig.idCol];
    const idVal   = safeStr(doc[idHeader] || '');
    if (idVal && idVal !== '') {
      // Clean the ID — remove spaces, dots, slashes
      const cleanId = idVal
        .replace(/\s+/g, '_')
        .replace(/\./g, '')
        .replace(/\//g, '_')
        .slice(0, 80);
      return `${prefix}_${cleanId}`;
    }
  }

  // Fallback: use row index (stable as long as rows aren't inserted)
  return `${prefix}_row_${rowIndex + 2}`;
}

// ============================================================
// CORE SYNC FUNCTION
// Pull one sheet → write to Firestore collection
// ============================================================

async function syncSheet(sheetKey, config) {
  log(sheetKey, `Syncing "${config.tab}" → ${config.collection}...`);

  // ---- Fetch from Google Sheets ----
  let rows;
  try {
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: config.id,
      range:         `'${config.tab}'!A:ZZ`
    });
    rows = resp.data.values || [];
  } catch (e) {
    log(sheetKey, `❌ Sheets fetch error: ${e.message}`);
    return { written: 0, skipped: 0, error: e.message };
  }

  if (rows.length < 2) {
    log(sheetKey, 'No data rows found — skipping');
    return { written: 0, skipped: 0 };
  }

  // ---- Parse headers and data rows ----
  const rawHeaders = rows[config.headerRow] || [];
  const headers    = buildHeaders(rawHeaders);
  const dataRows   = rows.slice(config.headerRow + 1);

  log(sheetKey, `Found ${dataRows.length} data rows, ${headers.length} columns`);

  // ---- Write to Firestore in batches ----
  let written   = 0;
  let skipped   = 0;
  let batch     = db.batch();
  let batchCount= 0;

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];

    // Skip completely empty rows
    const isEmpty = (row || []).every(cell => !safeStr(cell));
    if (isEmpty) { skipped++; continue; }

    const doc   = rowToDoc(headers, row, i, sheetKey);
    const docId = buildDocId(config, doc, i);
    const ref   = db.collection(config.collection).doc(docId);

    batch.set(ref, doc, { merge: true });
    batchCount++;
    written++;

    // Commit when batch is full
    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      log(sheetKey, `  Committed batch of ${batchCount} docs...`);
      batch      = db.batch();
      batchCount = 0;
    }
  }

  // Commit remaining docs
  if (batchCount > 0) {
    await batch.commit();
  }

  log(sheetKey, `✅ Written: ${written}, Skipped empty: ${skipped}`);
  return { written, skipped };
}

// ============================================================
// FULL SYNC — runs all 6 sheets
// ============================================================

async function runFullSync() {
  const start = Date.now();

  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('  Brothers EGY ERP — Sheets → Firestore Sync  ');
  console.log('═══════════════════════════════════════════════');
  console.log('');

  const results = {};

  for (const [key, config] of Object.entries(SHEETS)) {
    results[key] = await syncSheet(key, config);
    console.log('');
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log('═══════════════════════════════════════════════');
  console.log(`  Sync complete in ${elapsed}s`);
  console.log('');
  console.log('  Results:');
  Object.entries(results).forEach(([key, r]) => {
    const status = r.error ? '❌' : '✅';
    console.log(`    ${status} ${key.padEnd(14)} written: ${r.written || 0}`);
  });
  console.log('═══════════════════════════════════════════════');
  console.log('');

  // Write sync log to Firestore
  try {
    await db.collection('_sync_log').add({
      timestamp:  Date.now(),
      elapsed_ms: Date.now() - start,
      direction:  'sheets_to_firestore',
      results
    });
  } catch (e) { /* silent — non-critical */ }
}

// ============================================================
// ENTRY POINT
// ============================================================

async function main() {
  try {
    initFirebase();
    await initSheets();
    await runFullSync();
    process.exit(0);
  } catch (e) {
    console.error('[FATAL]', e.message);
    console.error(e.stack);
    process.exit(1);
  }
}

main();
