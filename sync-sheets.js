@'
const { google } = require("googleapis");
const admin      = require("firebase-admin");
const fs         = require("fs");

// ============================================================
// CONFIGURATION
// ============================================================

const SHEETS = {
  cars: {
    id:         "1tQVkPj7tCnrKsHEIs04a1WzzC04jpOWuLsXgXOkVMkk",
    tab:        "صفحة الإدخالات لقاعدة البيانات",
    collection: "fleet",
    idCol:      0,
    minFields:  2
  },
  orders: {
    id:         "1T6j2xnRBTY31crQcJHioKurs4Rvaj-VlEQkm6joGxGM",
    tab:        "صفحة الإدخالات للإيجارات",
    collection: "bookings",
    idCol:      0,
    minFields:  3
  },
  clients: {
    id:         "13YZOGdRCEy7IMZHiTmjLFyO417P8dD0m5Sh9xwKI8js",
    tab:        "صفحة الإدخالات لقاعدة البيانات",
    collection: "customers",
    idCol:      0,
    minFields:  2
  },
  collections: {
    id:         "1jtp-ihtAOt9NNHETZ5muiL5OA9yW3WrpBIIDAf5UAyg",
    tab:        "صفحة الإدخالات لقاعدة البيانات",
    collection: "collections",
    idCol:      null,
    minFields:  2
  },
  car_expenses: {
    id:         "1vDKKOywOEGfmLcHr4xk7KMTChHJ0_qquNopXpD81XVE",
    tab:        "صفحة الإدخالات لقاعدة البيانات",
    collection: "car_expenses",
    idCol:      null,
    minFields:  2
  },
  gen_expenses: {
    id:         "1hZoymf0CN1wOssc3ddQiZXxbJTdzJZBnamp_aCobl1Q",
    tab:        "صفحة الإدخالات لقاعدة البيانات",
    collection: "gen_expenses",
    idCol:      null,
    minFields:  2
  }
};

const SERVICE_ACCOUNT_PATH = "./service-account.json";
const GOOGLE_CREDS_PATH    = "./google-credentials.json";
const PROJECT_ID           = "brothers-egy-portal";
const BATCH_SIZE           = 400;

// Maximum consecutive empty rows before we consider it the end of data.
// Set high enough to handle any gaps in your sheets.
const MAX_CONSECUTIVE_EMPTY = 20;

// ============================================================
// INIT
// ============================================================

let db;
let sheets;

function initFirebase() {
  if (admin.apps.length) return;
  const sa = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, "utf8"));
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    projectId:  PROJECT_ID
  });
  db = admin.firestore();
  log("Firebase", "Initialized OK");
}

async function initSheets() {
  const creds = JSON.parse(fs.readFileSync(GOOGLE_CREDS_PATH, "utf8"));
  const auth  = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
  });
  const client = await auth.getClient();
  sheets = google.sheets({ version: "v4", auth: client });
  log("Sheets", "Initialized OK");
}

// ============================================================
// UTILITIES
// ============================================================

function log(section, msg) {
  const ts = new Date().toLocaleString("en-GB");
  console.log("[" + ts + "] [" + section + "] " + msg);
}

function safeStr(val) {
  if (val === null || val === undefined) return "";
  return String(val).trim();
}

function buildHeaders(rawHeaders) {
  const seen = {};
  return rawHeaders.map((h, i) => {
    let key = safeStr(h) || ("_col_" + i);
    if (seen[key] !== undefined) { seen[key]++; key = key + "_" + seen[key]; }
    else seen[key] = 0;
    return key;
  });
}

function countFilledCells(row) {
  return (row || []).filter(cell => safeStr(cell) !== "").length;
}

// Build stable Firestore document ID.
// Uses the raw value from the ID column — NO prefix added.
// e.g. car code "50" → Firestore doc ID "50"
function buildDocId(config, row, rowIndex) {
  if (config.idCol !== null) {
    const idVal = safeStr(row[config.idCol] || "")
      .replace(/\s+/g, "_")
      .replace(/\./g, "")
      .replace(/\//g, "_")
      .substring(0, 80);
    if (idVal && idVal !== "" && idVal !== "0") {
      return idVal;
    }
  }
  return "row_" + (rowIndex + 2);
}

// ============================================================
// SYNC ONE SHEET → ONE FIRESTORE COLLECTION
// ============================================================

async function syncSheet(sheetKey, config) {
  log(sheetKey, "Syncing to: " + config.collection);

  // ---- Fetch from Google Sheets ----
  let rows;
  try {
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: config.id,
      range:         "'" + config.tab + "'!A:ZZ"
    });
    rows = resp.data.values || [];
  } catch (e) {
    log(sheetKey, "ERROR fetching sheet: " + e.message);
    return { written: 0, skipped: 0, error: e.message };
  }

  if (rows.length < 2) {
    log(sheetKey, "No data rows found");
    return { written: 0, skipped: 0 };
  }

  const headers  = buildHeaders(rows[0] || []);
  const allRows  = rows.slice(1);

  log(sheetKey, "Raw rows from sheet: " + allRows.length);

  // ---- Write to Firestore ----
  // Strategy: process ALL rows but skip individual empty ones.
  // Stop only when we hit MAX_CONSECUTIVE_EMPTY empty rows in a row
  // which indicates we have reached the true end of the data.
  let written           = 0;
  let skipped           = 0;
  let consecutiveEmpty  = 0;
  let batch             = db.batch();
  let batchCount        = 0;

  for (let i = 0; i < allRows.length; i++) {
    const row    = allRows[i] || [];
    const filled = countFilledCells(row);

    // Empty row handling
    if (filled < (config.minFields || 1)) {
      consecutiveEmpty++;
      skipped++;

      // Stop processing if we have seen too many consecutive empty rows
      // This avoids syncing hundreds of blank rows at the end of the sheet
      if (consecutiveEmpty >= MAX_CONSECUTIVE_EMPTY) {
        log(sheetKey, "  Stopping at row " + (i + 2) +
          " — " + MAX_CONSECUTIVE_EMPTY + " consecutive empty rows");
        break;
      }
      continue;
    }

    // Reset consecutive empty counter when we find a real row
    consecutiveEmpty = 0;

    // For collections with an ID column, skip rows where ID is blank
    if (config.idCol !== null) {
      const idVal = safeStr(row[config.idCol] || "");
      if (!idVal || idVal === "" || idVal === "0") {
        skipped++;
        continue;
      }
    }

    // Build doc object — store ALL non-empty fields
    const doc = {};
    headers.forEach((h, j) => {
      const v = safeStr(row[j] || "");
      if (v !== "") doc[h] = v;
    });

    // Sync metadata
    doc._synced_at  = String(Date.now());
    doc._source     = "sheets";
    doc._sheet_key  = sheetKey;
    doc._row_index  = String(i + 2);

    const docId = buildDocId(config, row, i);
    const ref   = db.collection(config.collection).doc(docId);

    // merge: true = update existing, add if new — NEVER deletes
    batch.set(ref, doc, { merge: true });
    batchCount++;
    written++;

    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      log(sheetKey, "  Committed batch of " + batchCount + " docs...");
      batch      = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) await batch.commit();

  log(sheetKey, "Done  written=" + written + "  skipped=" + skipped);
  return { written, skipped };
}

// ============================================================
// FULL SYNC
// ============================================================

async function runFullSync() {
  const start = Date.now();

  console.log("");
  console.log("================================================");
  console.log("  Brothers EGY ERP - Sheets to Firestore Sync  ");
  console.log("================================================");
  console.log("");

  const results = {};
  for (const [key, config] of Object.entries(SHEETS)) {
    results[key] = await syncSheet(key, config);
    console.log("");
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log("================================================");
  console.log("  Sync complete in " + elapsed + "s");
  console.log("");
  Object.entries(results).forEach(([key, r]) => {
    const icon = r.error ? "FAIL" : "OK  ";
    console.log("  " + icon + "  " + key.padEnd(14) +
      "written: " + (r.written || 0) +
      "  skipped: " + (r.skipped || 0));
  });
  console.log("================================================");
  console.log("");

  try {
    await db.collection("_sync_log").add({
      timestamp:  Date.now(),
      elapsed_ms: Date.now() - start,
      results:    JSON.stringify(results)
    });
  } catch (e) {}
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
    console.error("[FATAL] " + e.message);
    console.error(e.stack);
    process.exit(1);
  }
}

main();
'@ | Out-File -FilePath "C:\Users\sabryabr\BrothersEGY-ERP\sync-sheets.js" -Encoding UTF8

Write-Host "sync-sheets.js written"
