// ============================================================
// core/globals.js
// Global state object and all shared constants
// Every module reads from window.G — never duplicates state
// ============================================================

// ============================================================
// MAIN STATE OBJECT
// All runtime data lives here — one place, one truth
// ============================================================
window.G = {
  // Authenticated user
  user: null,

  // Cached Firestore data
  fleet:     [],
  customers: [],
  proposals: [],
  bookings:  [],

  // Filtered active bookings (pre-computed, refreshed on load)
  activeBookings: [],

  // Exchange rates (defaults, overwritten by live fetch)
  ratesUSD: 50,
  ratesEUR: 54,

  // Navigation state
  currentPage:      'dashboard',
  currentParams:    {},
  sidebarCollapsed: false,

  // Pending return workflow
  pendingReturn: null,

  // Active Firestore unsubscribe functions (cleared on logout)
  unsubscribers: [],

  // Notification count
  notifUnread: 0,

  // System settings (loaded from Firestore settings/main)
  settings: {
    shiftStart:         10,
    shiftEnd:           18,
    discountThreshold:  5,
    penaltyLow:         50,
    penaltyMedium:      100,
    penaltyHigh:        200,
    penaltyUrgent:      500,
    callmebotKeys:      {},
    callmebotPhones:    {}
  }
};

// ============================================================
// BRANCH MAPS
// ============================================================

// English branch code → full English name
window.BRANCH_MAP = {
  HRG: 'Hurghada',
  ALX: 'Alexandria',
  CAI: 'Cairo',
  RSH: 'Rashid',
  // Arabic keys → English (for mixed data from sheets)
  'الغردقة':    'Hurghada',
  'الاسكندرية': 'Alexandria',
  'القاهرة':    'Cairo',
  'رشيد':       'Rashid'
};

// English branch code → Arabic name
window.BRANCH_AR = {
  HRG: 'الغردقة',
  ALX: 'الاسكندرية',
  CAI: 'القاهرة',
  RSH: 'رشيد'
};

// ============================================================
// NAVIGATION HISTORY STACKS
// ============================================================
window.NAV_HISTORY   = [];   // page-level back stack
window.MODAL_HISTORY = [];   // modal-level back stack

// ============================================================
// RATE OVERRIDES
// Stores manual exchange rate overrides until reset
// ============================================================
window.rateOverrides = {
  usd: null,
  eur: null
};

// ============================================================
// FLEET FILTER STATE
// Shared between Fleet Radar and Gantt chart
// ============================================================
window.FLEET_FILTER = {
  status: {
    active:      true,
    archived:    false,
    accident:    true,
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
// MISC SHARED STATE
// Small pieces of state used across multiple modules
// ============================================================

// Dashboard chart instances (destroyed before re-render)
window.dashCharts = {};

// System logs cache (populated by logs.js realtime listener)
window.allLogs = [];

// All orders cache (kept in sync by orders.js)
window.allOrders = [];

// Gantt timeline range in days
window.ganttDays = 90;

// Gantt drag state
window.ganttDrag = {
  active:     false,
  startX:     0,
  startY:     0,
  scrollLeft: 0,
  scrollTop:  0
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
window.crmLimit = 500;

// Rate card (loaded from settings)
window.rateCardData = {};

// Settings users cache (used by WhatsApp keys form)
window.settingsUsers = [];

// Command palette state
window.cmdOpen  = false;
window.cmdIdx   = -1;
window.cmdItems = [];

// Bulk order selection
window.bulkMode     = false;
window.bulkSelected = new Set();

// Reminder interval reference (cleared on logout)
window.reminderInterval = null;

// Inactivity check interval reference (cleared on logout)
window.inactivityInterval = null;

// Session start time (used for inactivity calculation)
window.sessionStartTime = Date.now();

// Log listener unsubscribe (managed separately from G.unsubscribers)
window.logUnsub = null;

// Notification listener unsubscribe
window.notifUnsub = null;

// ============================================================
// COMMAND PALETTE PAGE DEFINITIONS
// Full list of navigable pages with search metadata
// ============================================================
window.CMD_PAGES = [
  { id: 'dashboard',       icon: '📊', title: 'Dashboard',          sub: 'Overview & KPIs' },
  { id: 'fleet-radar',     icon: '📡', title: 'Fleet Radar',         sub: 'Car availability & Gantt' },
  { id: 'order-book',      icon: '📋', title: 'Order Book',          sub: 'All rental contracts' },
  { id: 'vehicle-360',     icon: '🔭', title: 'Vehicle 360',         sub: 'Full car profile & history' },
  { id: 'risk-radar',      icon: '⚠️', title: 'Risk Radar',          sub: 'Expiry alerts & risks' },
  { id: 'proposals',       icon: '📋', title: 'Proposals',           sub: 'Create & manage quotes' },
  { id: 'en-contract',     icon: '📄', title: 'EN Contract',         sub: 'English rental agreement' },
  { id: 'ar-contract',     icon: '📝', title: 'AR Contract',         sub: 'Arabic rental agreement' },
  { id: 'receipts',        icon: '🧾', title: 'Receipts',            sub: 'Generate payment receipts' },
  { id: 'income-expenses', icon: '💰', title: 'Income & Expenses',   sub: 'Financial ledger' },
  { id: 'crm',             icon: '👥', title: 'CRM Hub',             sub: 'Customer database' },
  { id: 'tasks',           icon: '✅', title: 'Task Manager',        sub: 'Tasks & deadlines' },
  { id: 'approvals',       icon: '🔔', title: 'Approvals',           sub: 'Pending requests' },
  { id: 'system-logs',     icon: '📜', title: 'System Logs',         sub: 'Audit trail' },
  { id: 'settings',        icon: '⚙️', title: 'Settings',            sub: 'System configuration' }
];
