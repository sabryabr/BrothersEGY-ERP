// ============================================================
// core/globals.js v4.1
// Global state object and all shared constants
// Every module reads from window.G — never duplicates state
// ============================================================

// ============================================================
// MAIN STATE OBJECT
// ============================================================
window.G = {
  // Authenticated user
  user          : null,

  // Cached Firestore data
  fleet         : [],
  customers     : [],
  proposals     : [],
  bookings      : [],

  // Filtered active bookings (pre-computed, refreshed on load)
  activeBookings: [],

  // Exchange rates (defaults, overwritten by live fetch)
  ratesUSD      : 50,
  ratesEUR      : 54,

  // Navigation state
  currentPage   : 'dashboard',
  currentParams : {},
  sidebarCollapsed: false,
  _navGoingBack : false,

  // Pending return workflow
  pendingReturn : null,

  // Active Firestore unsubscribe functions (cleared on logout)
  unsubscribers : [],

  // Notification count
  notifUnread   : 0,

  // System settings (loaded from Firestore settings/main)
  settings: {
    // ── Shift hours (global defaults, overridden per-user) ──
    shiftStart          : 10,
    shiftEnd            : 18,

    // ── Per-user shift config ─────────────────────────────
    // Structure: { username: { shiftStart, shiftEnd, discountThreshold, daysOff[] } }
    userShifts          : {},

    // ── Discount control ──────────────────────────────────
    discountThreshold   : 5,

    // ── Task penalties ────────────────────────────────────
    penaltyLow          : 50,
    penaltyMedium       : 100,
    penaltyHigh         : 200,
    penaltyUrgent       : 500,

    // ── Session management ────────────────────────────────
    // ✅ Added — used by app.js _initSessionManagement()
    sessionTimeoutMins  : 60,   // total session duration
    idleTimeoutMins     : 5,    // idle before logout

    // ── Proposal settings ─────────────────────────────────
    proposalExpireDays  : 14,
    maxProposalsPerCar  : 1,

    // ── WhatsApp notifications ────────────────────────────
    callmebotKeys       : {},
    callmebotPhones     : {},

    // ── Rate card (legacy model-based, kept for compat) ───
    rateCard            : {}
  }
};

// ============================================================
// BRANCH MAPS
// ============================================================
window.BRANCH_MAP = {
  HRG           : 'Hurghada',
  ALX           : 'Alexandria',
  CAI           : 'Cairo',
  RSH           : 'Rashid',
  // Arabic keys → English (for mixed data from sheets)
  'الغردقة'    : 'Hurghada',
  'الاسكندرية' : 'Alexandria',
  'القاهرة'    : 'Cairo',
  'رشيد'        : 'Rashid'
};

window.BRANCH_AR = {
  HRG : 'الغردقة',
  ALX : 'الاسكندرية',
  CAI : 'القاهرة',
  RSH : 'رشيد'
};

// ============================================================
// NAVIGATION HISTORY STACKS
// ============================================================
window.NAV_HISTORY   = []; // page-level back stack
window.MODAL_HISTORY = []; // modal-level back stack

// ============================================================
// RATE OVERRIDES
// ============================================================
window.rateOverrides = { usd: null, eur: null };

// ============================================================
// FLEET FILTER STATE
// ============================================================
window.FLEET_FILTER = {
  status: {
    active     : true,
    archived   : false,
    accident   : true,
    maintenance: true
  },
  branches: {
    HRG: true,
    ALX: true,
    CAI: true,
    RSH: true
  },
  search: ''
};

// ============================================================
// SESSION MANAGEMENT
// ✅ _sessionStart is the authoritative session start time
// Used by app.js timers and logs.js session clock
// ============================================================
window._sessionStart = Date.now();

// ============================================================
// GLOBAL USER REGISTRY
// ✅ Loaded by utils.js loadSystemUsers()
// Used by tasks.js, settings.js, approvals.js
// ============================================================
window.G_USERS = [];

// ============================================================
// RATE CARD CACHE
// ✅ Centralized here — used by utils.js getRateForCar()
// ============================================================
window._rateCardCache     = null;
window._rateCardCacheTime = 0;

// ============================================================
// PAYMENT STATUS COLORS
// ✅ Global — used by fleet.js, dashboard.js, vehicle360.js,
// orders.js, crm.js. Defined early so all modules can access.
// ============================================================
window.PAYMENT_STATUS_COLORS = {
  paid   : '#22c55e',
  partial: '#f59e0b',
  unpaid : '#ef4444',
  overdue: '#dc2626',
  clear  : '#22c55e'
};

// ============================================================
// MISC SHARED STATE
// ============================================================

// Dashboard chart instances (destroyed before re-render)
window.dashCharts = {};

// System logs cache (populated by logs.js realtime listener)
window.allLogs    = [];

// All orders cache (kept in sync by orders.js)
window.allOrders  = [];

// Task list cache (kept in sync by tasks.js subscription)
// Used by app.js task due date notification checker
window._allTasks  = [];

// Gantt timeline range in days
window.ganttDays = 90;

// Gantt drag state
window.ganttDrag = {
  active    : false,
  startX    : 0,
  startY    : 0,
  scrollLeft: 0,
  scrollTop : 0
};

// Gantt tooltip data store (keyed by bar ID)
window.ganttData = {};

// Gantt location filter
window.GANTT_LOCATION_FILTER = 'all';

// Gantt pixels per day (adjusts with timeline range)
window.GANTT_PX_PER_DAY = 14;

// Receipt page current booking reference
window.rcCurrentBooking = null;

// CRM load limit (increases when user clicks "load more")
window._crmLimit = 500;

// Settings users cache (used by WhatsApp keys form)
window._settingsUsers = [];

// Command palette state
window.cmdOpen  = false;
window.cmdIdx   = -1;
window.cmdItems = [];

// Bulk order selection
window.bulkMode     = false;
window.bulkSelected = new Set();

// Interval/timer references (all cleared on logout)
window.reminderInterval    = null;
window.inactivityInterval  = null;
window._idleTimer          = null;
window._idleWarnTimer      = null;
window._sessionTimer       = null;
window._sessionCountdown   = null;
window._taskDueChecker     = null;
window._notifiedTasks      = null;
window._overdueNotifiedTasks = null;

// Firestore listener references (managed separately from G.unsubscribers)
window.logUnsub   = null;
window.notifUnsub = null;

// Session start time (set on login by app.js _initSessionManagement)
window.sessionStartTime = Date.now();

// ============================================================
// COMMAND PALETTE PAGE DEFINITIONS
// ✅ Single source of truth — modal.js reads from this
// ============================================================
window.CMD_PAGES = [
  { id:'dashboard',       icon:'📊', title:'Dashboard',         sub:'Overview & KPIs'                  },
  { id:'fleet-radar',     icon:'📡', title:'Fleet Radar',        sub:'Car availability & Gantt'          },
  { id:'order-book',      icon:'📋', title:'Order Book',         sub:'All rental contracts'              },
  { id:'vehicle-360',     icon:'🔭', title:'Vehicle 360',        sub:'Full car profile & history'        },
  { id:'risk-radar',      icon:'⚠️', title:'Risk Radar',         sub:'Expiry alerts & risks'             },
  { id:'proposals',       icon:'📋', title:'Proposals',          sub:'Create & manage quotes'            },
  { id:'en-contract',     icon:'📄', title:'EN Contract',        sub:'English rental agreement'          },
  { id:'ar-contract',     icon:'📝', title:'AR Contract',        sub:'Arabic rental agreement'           },
  { id:'receipts',        icon:'🧾', title:'Receipts',           sub:'Generate payment receipts'         },
  { id:'income-expenses', icon:'💰', title:'Income & Expenses',  sub:'Financial ledger & reports'        },
  { id:'crm',             icon:'👥', title:'CRM Hub',            sub:'Customer database'                 },
  { id:'tasks',           icon:'✅', title:'Task Manager',       sub:'Tasks, deadlines & penalties'      },
  { id:'approvals',       icon:'🔔', title:'Approvals',          sub:'Pending approval requests'         },
  { id:'system-logs',     icon:'📜', title:'System Logs',        sub:'Real-time audit trail'             },
  { id:'settings',        icon:'⚙️', title:'Settings',           sub:'System configuration'              }
];

// ============================================================
// RUNTIME SAFEGUARDS
// Ensure critical globals are never undefined
// Even if globals.js loads before other modules define things
// ============================================================
if (!window.allOrders)  window.allOrders  = [];
if (!window.allLogs)    window.allLogs    = [];
if (!window._allTasks)  window._allTasks  = [];
if (!window.G_USERS)    window.G_USERS    = [];
if (!window.dashCharts) window.dashCharts = {};
if (!window.PAYMENT_STATUS_COLORS) {
  window.PAYMENT_STATUS_COLORS = {
    paid:'#22c55e', partial:'#f59e0b',
    unpaid:'#ef4444', overdue:'#dc2626', clear:'#22c55e'
  };
}
