const API_STATE = "/api/state";
const LEGACY_STORAGE_KEY = "personal-budget-monitor-v1";
const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

let state;
let dbTransactions = [];

let editingBudgetId = null;
let editingTransactionId = null;
let currentUser = null;

const els = {
  authContainer: document.querySelector("#authContainer"),
  loginScreen: document.querySelector("#loginScreen"),
  registerScreen: document.querySelector("#registerScreen"),
  loginForm: document.querySelector("#loginForm"),
  registerForm: document.querySelector("#registerForm"),
  loginEmail: document.querySelector("#loginEmail"),
  loginPassword: document.querySelector("#loginPassword"),
  loginError: document.querySelector("#loginError"),
  registerName: document.querySelector("#registerName"),
  registerEmail: document.querySelector("#registerEmail"),
  registerPassword: document.querySelector("#registerPassword"),
  registerError: document.querySelector("#registerError"),
  showRegisterBtn: document.querySelector("#showRegister"),
  showLoginBtn: document.querySelector("#showLogin"),
  logoutBtn: document.querySelector("#logoutBtn"),
  userDisplay: document.querySelector("#userDisplay"),
  monthSelect: document.querySelector("#monthSelect"),
  pageTitle: document.querySelector("#pageTitle"),
  tabs: document.querySelectorAll(".tab-button"),
  views: {
    overview: document.querySelector("#overviewView"),
    transactions: document.querySelector("#transactionsView"),
    reports: document.querySelector("#reportsView"),
    goals: document.querySelector("#goalsView"),
    investmentTracker: document.querySelector("#investmentTrackerView")
  },
  incomeMetric: document.querySelector("#incomeMetric"),
  expenseMetric: document.querySelector("#expenseMetric"),
  leftMetric: document.querySelector("#leftMetric"),
  remainingBudgetMetric: document.querySelector("#remainingBudgetMetric"),
  actualRemainingMetric: document.querySelector("#actualRemainingMetric"),
  largestMetric: document.querySelector("#largestMetric"),
  savedAmount: document.querySelector("#savedAmount"),
  budgetUsed: document.querySelector("#budgetUsed"),
  chartTotal: document.querySelector("#chartTotal"),
  categoryChart: document.querySelector("#categoryChart"),
  comparisonSummary: document.querySelector("#comparisonSummary"),
  compareBaseMonth: document.querySelector("#compareBaseMonth"),
  compareTargetMonth: document.querySelector("#compareTargetMonth"),
  comparisonChart: document.querySelector("#comparisonChart"),
  overviewAlerts: document.querySelector("#overviewAlerts"),
  balanceForm: document.querySelector("#balanceForm"),
  incomeDescriptionInput: document.querySelector("#incomeDescriptionInput"),
  incomeInput: document.querySelector("#incomeInput"),
  incomeTable: document.querySelector("#incomeTable"),
  emptyIncome: document.querySelector("#emptyIncome"),
  budgetForm: document.querySelector("#budgetForm"),
  budgetNameInput: document.querySelector("#budgetNameInput"),
  budgetSuggestionList: document.querySelector("#budgetSuggestionList"),
  budgetAmountInput: document.querySelector("#budgetAmountInput"),
  budgetCancelBtn: document.querySelector("#budgetCancelBtn"),
  budgetTable: document.querySelector("#budgetTable"),
  emptyBudgets: document.querySelector("#emptyBudgets"),
  budgetCategoryList: document.querySelector("#budgetCategoryList"),
  limitText: document.querySelector("#limitText"),
  limitProgress: document.querySelector("#limitProgress"),
  transactionForm: document.querySelector("#transactionForm"),
  typeInput: document.querySelector("#transactionType"),
  categoryInput: document.querySelector("#transactionCategory"),
  incomeSuggestionList: document.querySelector("#incomeSuggestionList"),
  categorySuggestionList: document.querySelector("#categorySuggestionList"),
  amountInput: document.querySelector("#amountInput"),
  dateInput: document.querySelector("#dateInput"),
  noteInput: document.querySelector("#noteInput"),
  transactionCancelBtn: document.querySelector("#transactionCancelBtn"),
  transactionTable: document.querySelector("#transactionTable"),
  transactionCategoryFilter: document.querySelector("#transactionCategoryFilter"),
  emptyTransactions: document.querySelector("#emptyTransactions"),
  clearMonthBtn: document.querySelector("#clearMonthBtn"),
  
  goalForm: document.querySelector("#goalForm"),
  goalNameInput: document.querySelector("#goalNameInput"),
  goalTargetInput: document.querySelector("#goalTargetInput"),
  goalSavedInput: document.querySelector("#goalSavedInput"),
  goalsList: document.querySelector("#goalsList"),
  emptyGoals: document.querySelector("#emptyGoals"),
  goalTemplate: document.querySelector("#goalTemplate"),
  exportBtn: document.querySelector("#exportBtn"),
  importInput: document.querySelector("#importInput"),
  resetSampleBtn: document.querySelector("#resetSampleBtn"),
  
  emiPlannerForm: document.querySelector("#emiPlannerForm"),
  emiNameInput: document.querySelector("#emiNameInput"),
  emiLoanAmountInput: document.querySelector("#emiLoanAmountInput"),
  emiAmountInput: document.querySelector("#emiAmountInput"),
  emiStartDateInput: document.querySelector("#emiStartDateInput"),
  emiDueDayInput: document.querySelector("#emiDueDayInput"),
  emiTotalMonthsInput: document.querySelector("#emiTotalMonthsInput"),
  emiNotesInput: document.querySelector("#emiNotesInput"),
  emiEditingId: document.querySelector("#emiEditingId"),
  emiSaveBtn: document.querySelector("#emiSaveBtn"),
  emiCancelBtn: document.querySelector("#emiCancelBtn"),
  emiResetBtn: document.querySelector("#emiResetBtn"),
  addEmiScrollBtn: document.querySelector("#addEmiScrollBtn"),
  emiPlannerListBody: document.querySelector("#emiPlannerListBody"),
  emiScheduleTitle: document.querySelector("#emiScheduleTitle"),
  emiScheduleTableBody: document.querySelector("#emiScheduleTableBody"),
  emiConfirmPaymentPanel: document.querySelector("#emiConfirmPaymentPanel"),
  emiConfirmName: document.querySelector("#emiConfirmName"),
  emiConfirmDate: document.querySelector("#emiConfirmDate"),
  emiConfirmAmount: document.querySelector("#emiConfirmAmount"),
  emiConfirmForm: document.querySelector("#emiConfirmForm"),
  emiConfirmDateInput: document.querySelector("#emiConfirmDateInput"),
  emiConfirmModeSelect: document.querySelector("#emiConfirmModeSelect"),
  emiConfirmNotesInput: document.querySelector("#emiConfirmNotesInput"),
  emiConfirmCancelBtn: document.querySelector("#emiConfirmCancelBtn"),
  emiAutoTransactionPanel: document.querySelector("#emiAutoTransactionPanel"),
  emiAutoTransactionTableBody: document.querySelector("#emiAutoTransactionTableBody"),
  emiProgressTitle: document.querySelector("#emiProgressTitle"),
  emiProgressPaidCount: document.querySelector("#emiProgressPaidCount"),
  emiProgressRemainingCount: document.querySelector("#emiProgressRemainingCount"),
  emiProgressRemainingAmount: document.querySelector("#emiProgressRemainingAmount"),
  emiProgressBarFill: document.querySelector("#emiProgressBarFill"),
  emiProgressPercentText: document.querySelector("#emiProgressPercentText"),
  emiImpactIncome: document.querySelector("#emiImpactIncome"),
  emiImpactExpenses: document.querySelector("#emiImpactExpenses"),
  emiImpactTotal: document.querySelector("#emiImpactTotal"),
  emiImpactBalance: document.querySelector("#emiImpactBalance"),
  emiClosedListBody: document.querySelector("#emiClosedListBody"),
  emiActiveCount: document.querySelector("#emiActiveCount"),
  emiMonthlyCommitment: document.querySelector("#emiMonthlyCommitment"),
  emiTotalRemaining: document.querySelector("#emiTotalRemaining"),
  emiPaidTillNow: document.querySelector("#emiPaidTillNow"),
  emiUpcomingBox: document.querySelector("#emiUpcomingBox"),
  emiUpcomingName: document.querySelector("#emiUpcomingName"),
  emiUpcomingAmount: document.querySelector("#emiUpcomingAmount"),
  emiUpcomingDate: document.querySelector("#emiUpcomingDate"),
  emiUpcomingMarkPaidBtn: document.querySelector("#emiUpcomingMarkPaidBtn"),
  emiPlannerAlerts: document.querySelector("#emiPlannerAlerts")
};

async function fetchCategories() {
  const response = await fetch("/api/categories");

  if (!response.ok) {
    throw new Error("Unable to load categories");
  }

  const data = await response.json();

  return data.categories || [];
}

/*async function fetchTransactions() {
  const response = await fetch("/api/transactions");

  if (!response.ok) {
    throw new Error("Unable to load transactions");
  }

  const data = await response.json();

  return data.transactions || [];
}*/

async function fetchCategories() {

    const response = await fetch("/api/categories");

    if (!response.ok) {
        throw new Error("Unable to load categories");
    }

    const data = await response.json();

    return data.categories || [];
}

function renderCategoryDropdown() {
  // Category is now a text input, dropdown rendering is no longer needed.
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function apiFetch(path, options = {}) {
  const opts = { credentials: 'same-origin', ...options };
  if (opts.body && typeof opts.body === 'object' && !(opts.body instanceof FormData)) {
    opts.headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    opts.body = JSON.stringify(opts.body);
  }
  return fetch(path, opts);
}

async function deleteTransactionFromServer(transaction) {
  const response = await apiFetch(`/api/transactions/${encodeURIComponent(transaction.id)}`, {
    method: 'DELETE',
    body: { transaction }
  });
  if (!response.ok) {
    let details = '';
    try {
      const body = await response.json();
      details = body && body.error ? `: ${body.error}` : '';
    } catch (e) {
      // ignore parse failures
    }
    throw new Error(`Unable to delete transaction${details}`);
  }
}

async function updateTransactionOnServer(previousTransaction, transaction) {
  const response = await apiFetch(`/api/transactions/${encodeURIComponent(transaction.id)}`, {
    method: 'POST',
    body: {
      previousTransaction,
      transaction
    }
  });

  if (!response.ok) {
    let details = '';
    try {
      const body = await response.json();
      details = body && body.error ? `: ${body.error}` : '';
    } catch (e) {
      // ignore parse failures
    }
    throw new Error(`Unable to update transaction${details}`);
  }

  return response.json().catch(() => ({}));
}

async function createTransactionOnServer(transaction) {
  const response = await apiFetch("/api/transactions", {
    method: "POST",
    body: transaction
  });

  if (!response.ok) {
    let details = "";
    try {
      const body = await response.json();
      details = body && body.error ? `: ${body.error}` : "";
    } catch (e) {
      // ignore parse failures
    }
    throw new Error(`Unable to create transaction${details}`);
  }

  return response.json().catch(() => ({}));
}

function confirmTransactionDelete() {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";
    overlay.innerHTML = `
      <div class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirmDeleteTitle">
        <h3 id="confirmDeleteTitle">Delete transaction?</h3>
        <p>This record will be removed from the screen and PostgreSQL.</p>
        <div class="confirm-actions">
          <button class="ghost-button" type="button" data-confirm="no">No</button>
          <button class="danger-button" type="button" data-confirm="yes">Yes</button>
        </div>
      </div>
    `;

    function close(result) {
      overlay.remove();
      document.removeEventListener("keydown", onKeyDown);
      resolve(result);
    }

    function onKeyDown(event) {
      if (event.key === "Escape") {
        close(false);
      }
    }

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        close(false);
        return;
      }

      const button = event.target.closest("button[data-confirm]");
      if (!button) return;
      close(button.dataset.confirm === "yes");
    });

    document.addEventListener("keydown", onKeyDown);
    document.body.appendChild(overlay);
    overlay.querySelector("button[data-confirm='no']").focus();
  });
}

async function loadTransactions() {
  const response = await apiFetch("/api/transactions");

  if (!response.ok) {
    throw new Error("Unable to load transactions");
  }

  const data = await response.json();

  return data.transactions || [];
}


function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showAuthScreen(screen) {
  els.authContainer.classList.remove("hidden");
  els.loginScreen.classList.toggle("active", screen === "login");
  els.registerScreen.classList.toggle("active", screen === "register");
  els.loginError.textContent = "";
  els.registerError.textContent = "";
}

function showAppShell() {
  els.authContainer.classList.add("hidden");
  document.querySelector(".app-shell").classList.remove("hidden");
}

function hideAppShell() {
  document.querySelector(".app-shell").classList.add("hidden");
}

async function loadAppState() {
  await loadState();
  try {
    await syncStateToDatabase();
  } catch (error) {
    console.warn("Database sync after load failed", error);
  }
  // Always default to the current month on page load.
  // The user can change it freely during the session.
  state.selectedMonth = currentMonth();
  els.monthSelect.value = state.selectedMonth;
  els.dateInput.value = defaultDateForSelectedMonth();
  render();
  renderCategoryDropdown();
  initPushNotifications();
}

function updateUserDisplay() {
  if (!currentUser) {
    els.userDisplay.textContent = "";
    els.logoutBtn.disabled = true;
    return;
  }
  els.userDisplay.textContent = `Signed in as ${currentUser.name || currentUser.email}`;
  els.logoutBtn.disabled = false;
}

async function authenticateLogin(email, password) {
  els.loginError.textContent = '';
  try {
    const res = await apiFetch('/api/auth/login', { method: 'POST', body: { email, password } });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      els.loginError.textContent = body.error || 'Invalid credentials';
      return false;
    }
    currentUser = body.user || null;
    updateUserDisplay();
    await loadAppState();
    showAppShell();
    return true;
  } catch (e) {
    els.loginError.textContent = 'Network error';
    return false;
  }
}

async function authenticateRegistration(name, email, password) {
  els.registerError.textContent = '';
  if (!name.trim()) {
    els.registerError.textContent = 'Enter your full name.';
    return false;
  }
  if (!isValidEmail(email)) {
    els.registerError.textContent = 'Enter a valid email address.';
    return false;
  }
  if (password.length < 6) {
    els.registerError.textContent = 'Password must be at least 6 characters.';
    return false;
  }
  try {
    const res = await apiFetch('/api/auth/register', { method: 'POST', body: { name, email, password } });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      els.registerError.textContent = body.error || 'Registration failed';
      return false;
    }
    currentUser = body.user || null;
    updateUserDisplay();
    await loadAppState();
    showAppShell();
    return true;
  } catch (e) {
    els.registerError.textContent = 'Network error';
    return false;
  }
}

async function ensureAuthenticated() {
  try {
    const res = await apiFetch('/api/auth/me');
    if (!res.ok) {
      hideAppShell();
      showAuthScreen('login');
      return false;
    }
    const body = await res.json().catch(() => ({}));
    currentUser = body.user || null;
    updateUserDisplay();
    showAppShell();
    return true;
  } catch (e) {
    hideAppShell();
    showAuthScreen('login');
    return false;
  }
}

function clearAuthFormErrors() {
  els.loginError.textContent = "";
  els.registerError.textContent = "";
}

function resetAuthForms() {
  els.loginForm.reset();
  els.registerForm.reset();
  clearAuthFormErrors();
}

async function logoutUser() {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' });
  } catch (e) {
    // ignore network errors
  }
  currentUser = null;
  updateUserDisplay();
  resetAuthForms();
  hideAppShell();
  showAuthScreen('login');
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function defaultDateForSelectedMonth() {
  return state?.selectedMonth === currentMonth() ? today() : `${state.selectedMonth}-01`;
}

function monthFromDate(value) {
  return String(value || currentMonth()).slice(0, 7);
}

function monthsForYear(year) {
  return Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, "0")}`);
}

function getInitialState() {
  const month = currentMonth();
  return {
    selectedMonth: month,
    plans: {
      [month]: {
        income: 0,
        incomes: [],
        budgets: []
      }
    },
    savedIncomeDescriptions: [],
    savedBudgetNames: [],
    compareBaseMonth: month,
    compareTargetMonth: month,
    transactions: [],
    goals: [],
    emis: [],
    investments: []
  };
}

function getSampleState() {
  const month = currentMonth();
  return {
    selectedMonth: month,
    plans: {
      [month]: {
        income: 0,
        incomes: [
          { id: crypto.randomUUID(), description: "Monthly salary", amount: 50000 }
        ],
        budgets: [
          { id: crypto.randomUUID(), name: "House Rent", amount: 15000 },
          { id: crypto.randomUUID(), name: "To Dad", amount: 10000 },
          { id: crypto.randomUUID(), name: "School Fees", amount: 8000 },
          { id: crypto.randomUUID(), name: "House Hold expenses", amount: 20000 }
        ]
      }
    },
    savedIncomeDescriptions: ["Monthly salary"],
    savedBudgetNames: ["House Rent", "To Dad", "School Fees", "House Hold expenses"],
    compareBaseMonth: month,
    compareTargetMonth: month,
    transactions: [
      { id: crypto.randomUUID(), type: "expense", category: "House Rent", amount: 15000, date: `${month}-03`, note: "Monthly rent paid" },
      { id: crypto.randomUUID(), type: "expense", category: "House Hold expenses", amount: 1500, date: `${month}-07`, note: "Grocery" }
    ],
    goals: [
      { id: crypto.randomUUID(), name: "Emergency fund", target: 8000, saved: 2700 },
      { id: crypto.randomUUID(), name: "Travel", target: 2500, saved: 840 }
    ],
    emis: [
      {
        id: "bike-loan-id",
        name: "Bike Loan",
        loanAmount: 120000,
        emiAmount: 4000,
        startDate: "2026-07-01",
        dueDay: 5,
        totalMonths: 36,
        notes: "Personal Bike Loan",
        status: "active",
        paidMonths: {}
      },
      {
        id: "personal-loan-id",
        name: "Personal Loan",
        loanAmount: 576000,
        emiAmount: 12000,
        startDate: "2025-09-01",
        dueDay: 5,
        totalMonths: 48,
        notes: "Personal Loan",
        status: "active",
        paidMonths: {
          "2025-09": "2025-09-05", "2025-10": "2025-10-05", "2025-11": "2025-11-05", "2025-12": "2025-12-05",
          "2026-01": "2026-01-05", "2026-02": "2026-02-05", "2026-03": "2026-03-05", "2026-04": "2026-04-05",
          "2026-05": "2026-05-05", "2026-06": "2026-06-05"
        }
      }
    ],
    investments: [
      {
        id: "inv-rd-sbi",
        name: "SBI RD (24M)",
        type: "RD",
        investedAmount: 100000,
        currentValue: 106500,
        investmentDate: "2026-06-25",
        maturityDate: "2028-06-25",
        interestPercent: 6.50,
        interestPeriod: "Yearly",
        sipAmount: 5000,
        notes: "RD Installment",
        status: "Active"
      },
      {
        id: "inv-mf-sbi",
        name: "SBI Bluechip Fund",
        type: "Mutual Fund",
        investedAmount: 100000,
        currentValue: 112500,
        investmentDate: "2026-06-18",
        maturityDate: "",
        interestPercent: 12.50,
        interestPeriod: "Yearly",
        sipAmount: 5000,
        notes: "Monthly SIP",
        status: "Active"
      },
      {
        id: "inv-stk-reliance",
        name: "Reliance Industries",
        type: "Stocks",
        investedAmount: 250000,
        currentValue: 305000,
        investmentDate: "2026-06-15",
        maturityDate: "",
        interestPercent: 22.00,
        interestPeriod: "Yearly",
        sipAmount: null,
        notes: "",
        status: "Active"
      },
      {
        id: "inv-fd-icici",
        name: "ICICI Bank FD",
        type: "FD",
        investedAmount: 300000,
        currentValue: 318000,
        investmentDate: "2026-06-10",
        maturityDate: "2026-08-15",
        interestPercent: 6.00,
        interestPeriod: "Yearly",
        sipAmount: null,
        notes: "",
        status: "Active"
      },
      {
        id: "inv-gold-etf",
        name: "Gold ETF",
        type: "Gold",
        investedAmount: 50000,
        currentValue: 55000,
        investmentDate: "2026-06-05",
        maturityDate: "",
        interestPercent: 10.00,
        interestPeriod: "Yearly",
        sipAmount: null,
        notes: "",
        status: "Active"
      },
      {
        id: "inv-ppf-acc",
        name: "PPF Account",
        type: "PPF",
        investedAmount: 200000,
        currentValue: 205000,
        investmentDate: "2021-01-01",
        maturityDate: "2041-01-01",
        interestPercent: 2.50,
        interestPeriod: "Yearly",
        sipAmount: null,
        notes: "",
        status: "Active"
      },
      {
        id: "inv-crypto-btc",
        name: "Bitcoin",
        type: "Crypto",
        investedAmount: 50000,
        currentValue: 76000,
        investmentDate: "2026-06-01",
        maturityDate: "",
        interestPercent: 52.00,
        interestPeriod: "Yearly",
        sipAmount: null,
        notes: "",
        status: "Active"
      }
    ]
  };
}

async function loadState() {

  try {

    const response = await fetch(API_STATE);

    if (!response.ok) {
      throw new Error("Unable to load state");
    }

    const payload = await response.json();

    state = payload.state || getInitialState();

    try {
      state.categories = await fetchCategories();
    } catch (e) {
      console.error("Category load failed", e);
      state.categories = [];
    }

    try {
      dbTransactions = await loadTransactions();

      state.transactions = dbTransactions.map(tx => ({
      id: tx.id,
      type: tx.type,
      category: tx.category,
      amount: Number(tx.amount),
      date: tx.transaction_date,
      note: tx.note || ""
  }));
      
    } catch (e) {
      console.error("Transaction load failed", e);
      dbTransactions = [];
    }

    normalizeState();
    clearMoneyIfMonthIsEmpty();

    console.log("STATE READY", state);

  } catch (err) {

    console.error(err);

    state = getInitialState();

    normalizeState();
  }
}

function loadLegacyState() {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function syncStateToDatabase() {
  if (!state) return;

  const response = await apiFetch("/api/sync-state", {
    method: "POST",
    body: { state }
  });

  if (!response.ok) {
    let details = "";
    try {
      const body = await response.json();
      details = body && body.error ? `: ${body.error}` : "";
    } catch (e) {
      // ignore JSON parse errors
    }
    throw new Error(`Unable to sync PostgreSQL tables${details}`);
  }
}

async function saveState(skipSync = false) {
  // Snapshot current state so we can roll back on failure
  const prevState = JSON.parse(JSON.stringify(state || {}));
  try {
    const response = await fetch(API_STATE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state })
    });
    if (!response.ok) {
      let details = "";
      try {
        const body = await response.json();
        details = body && body.error ? `: ${body.error}` : "";
      } catch (e) {
        // ignore JSON parse errors
      }
      // restore previous state and UI
      state = prevState;
      try { render(); } catch (e) { /* ignore render errors during rollback */ }
      throw new Error(`Unable to save database state${details}`);
    }
    if (!skipSync) {
      try {
        await syncStateToDatabase();
      } catch (syncError) {
        console.warn("PostgreSQL table sync failed; app state was saved", syncError);
      }
    }
  } catch (err) {
    // on network/other errors, restore previous state and re-render
    state = prevState;
    try { render(); } catch (e) { /* ignore render errors during rollback */ }
    throw err;
  }
}

function normalizeState() {
  state.selectedMonth ||= currentMonth();
  state.plans ||= {};
  state.transactions ||= [];
  state.goals ||= [];
  state.emis ||= [];
  state.investments ||= [];
  state.compareBaseMonth ||= "";
  state.compareTargetMonth ||= "";
  
  state.investments = state.investments.map((item) => ({
    id: item.id || crypto.randomUUID(),
    name: String(item.name || "").trim(),
    type: String(item.type || "Mutual Fund").trim(),
    investedAmount: Number(item.investedAmount) || 0,
    currentValue: Number(item.currentValue) || 0,
    investmentDate: item.investmentDate || `${state.selectedMonth}-01`,
    maturityDate: item.maturityDate || "",
    interestPercent: item.interestPercent !== undefined && item.interestPercent !== null && item.interestPercent !== "" ? Number(item.interestPercent) : null,
    interestPeriod: item.interestPeriod || "Yearly",
    sipAmount: item.sipAmount !== undefined && item.sipAmount !== null && item.sipAmount !== "" ? Number(item.sipAmount) : null,
    notes: item.notes || "",
    status: item.status || "Active",
    investmentStyle: item.investmentStyle || "one-time",
    monthlyAmount: item.monthlyAmount !== undefined && item.monthlyAmount !== null && item.monthlyAmount !== "" ? Number(item.monthlyAmount) : null,
    totalInvestment: item.totalInvestment !== undefined && item.totalInvestment !== null && item.totalInvestment !== "" ? Number(item.totalInvestment) : null,
    expectedDuration: item.expectedDuration !== undefined && item.expectedDuration !== null && item.expectedDuration !== "" ? Number(item.expectedDuration) : null,
    expectedDurationUnit: item.expectedDurationUnit || "Months",
    expectedReturnPercent: item.expectedReturnPercent !== undefined && item.expectedReturnPercent !== null && item.expectedReturnPercent !== "" ? Number(item.expectedReturnPercent) : null,
    interestCalculation: item.interestCalculation || "Monthly Compounding",
    paidMonths: item.paidMonths || {}
  }));
  
  if (!state.selectedEmiId && state.emis.length > 0) {
    state.selectedEmiId = state.emis[0].id;
  }
  
  state.transactions = state.transactions.map((item) => ({
    id: item.id || crypto.randomUUID(),
    type: item.type === "income" ? "income" : "expense",
    category: String(item.category || "").trim(),
    amount: Number(item.amount) || 0,
    date: item.date || item.transaction_date || `${state.selectedMonth}-01`,
    note: item.note || ""
  }));
  state.savedIncomeDescriptions = uniqueSorted([
    ...(Array.isArray(state.savedIncomeDescriptions) ? state.savedIncomeDescriptions : []),
    ...Object.values(state.plans).flatMap((plan) => Array.isArray(plan.incomes) ? plan.incomes.map((item) => item.description) : [])
  ]);
  state.savedBudgetNames = uniqueSorted([
    ...(Array.isArray(state.savedBudgetNames) ? state.savedBudgetNames : []),
    ...Object.values(state.plans).flatMap((plan) => Array.isArray(plan.budgets) ? plan.budgets.map((item) => item.name) : [])
  ]);
  for (const plan of Object.values(state.plans)) {
    if (!Array.isArray(plan.incomes)) {
      plan.incomes = Number(plan.income) > 0
        ? [{ id: crypto.randomUUID(), description: "Income", amount: Number(plan.income) }]
        : [];
    }
    plan.income = Number(plan.income) || 0;
    if (!Array.isArray(plan.budgets)) {
      const amount = Number(plan.income) || 0;
      plan.budgets = amount ? [{ id: crypto.randomUUID(), name: "Monthly Budget", amount }] : [];
    }
  }
}

function rememberValue(collection, value) {
  const cleanValue = value.trim();
  if (!cleanValue) return;
  state[collection] = uniqueSorted([...(state[collection] || []), cleanValue]);
}

function uniqueSorted(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
}

function getPlanForMonth(monthStr) {
  if (!state) {
    state = getInitialState();
  }

  if (!state.plans) {
    state.plans = {};
  }

  if (!state.plans[monthStr]) {
    state.plans[monthStr] = {
      income: 0,
      incomes: [],
      budgets: []
    };
    const plan = state.plans[monthStr];
    if (Array.isArray(state.categories) && state.categories.length > 0) {
      plan.budgets = state.categories
        .filter(c => c.type === "expense")
        .map(c => ({
          id: c.id,
          name: c.name,
          amount: Number(c.amount) || 0
        }));
      plan.incomes = state.categories
        .filter(c => c.type === "income")
        .map(c => ({
          id: c.id,
          description: c.name,
          amount: Number(c.amount) || 0
        }));
    }
  }

  if (!Array.isArray(state.plans[monthStr].incomes)) {
    state.plans[monthStr].incomes = [];
  }

  if (!Array.isArray(state.plans[monthStr].budgets)) {
    state.plans[monthStr].budgets = [];
  }

  return state.plans[monthStr];
}

function getPlan() {
  if (!state) {
    state = getInitialState();
  }

  if (!state.selectedMonth) {
    state.selectedMonth = currentMonth();
  }

  return getPlanForMonth(state.selectedMonth);
}

function monthlyTransactions() {
  return state.transactions
    .filter((item) => monthFromDate(item.date) === state.selectedMonth)
    .sort((a, b) => b.date.localeCompare(a.date));
}

function clearMoneyIfMonthIsEmpty() {
  const plan = getPlan();
  const hasBudgets = plan.budgets.length > 0;
  const hasIncomeRows = plan.incomes.length > 0;
  const hasTransactions = state.transactions.some((item) => monthFromDate(item.date) === state.selectedMonth);
  if (!hasBudgets && !hasIncomeRows && !hasTransactions) {
    plan.income = 0;
  }
}

function totals() {
  const plan = getPlan();
  const rows = monthlyTransactions();
  const budgetTotal = plan.budgets.reduce((sum, item) => sum + item.amount, 0);
  const income = plan.incomes.reduce((sum, item) => sum + item.amount, 0);
  plan.income = income;
  const available = income;

  // Calculate EMI expectations and payments for current month
  const emis = state.emis || [];
  const currentMonthEmiAmount = emis
    .filter(e => isEmiScheduledForMonth(e, state.selectedMonth))
    .reduce((sum, e) => sum + e.emiAmount, 0);

  const currentMonthPaidEmiAmount = emis
    .filter(e => e.paidMonths && e.paidMonths[state.selectedMonth])
    .reduce((sum, e) => sum + e.emiAmount, 0);

  // Non-EMI expenses (transactions where category does not start with "EMI - ")
  const nonEmiExpenses = rows
    .filter((row) => row.type === "expense" && (!row.category || !row.category.startsWith("EMI - ")))
    .reduce((sum, row) => sum + row.amount, 0);

  // Expected Monthly Budget includes category budgets + expected EMIs
  const expenseLimit = budgetTotal + currentMonthEmiAmount;

  // Actual Expenses includes non-EMI expenses + paid EMIs
  const expenses = nonEmiExpenses + currentMonthPaidEmiAmount;

  // Expected Remaining Amount = Income - Expected Budget - Current Month EMI Amount
  const expectedRemaining = income - budgetTotal - currentMonthEmiAmount;

  // Actual Remaining = Income - Actual Expenses - Current Month Paid EMI Amount
  const actualRemaining = income - nonEmiExpenses - currentMonthPaidEmiAmount;

  const remainingBudget = expenseLimit - expenses;

  return {
    income,
    available,
    expenses,
    expenseLimit,
    saved: actualRemaining,
    leftToSave: actualRemaining,
    expectedRemaining,
    actualRemaining,
    remainingBudget,
    overspent: Math.max(expenses - expenseLimit, 0),
    plan
  };
}

function categoryTotals() {
  const map = new Map();
  for (const item of monthlyTransactions()) {
    if (item.type !== "expense") continue;
    const key = item.category.trim() || "Other";
    map.set(key, (map.get(key) || 0) + item.amount);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function availableReportMonths() {
  const selectedYear = Number((state.selectedMonth || currentMonth()).slice(0, 4));
  const months = new Set([
    ...monthsForYear(selectedYear),
    state.selectedMonth,
    ...Object.keys(state.plans),
    ...state.transactions.map((item) => monthFromDate(item.date))
  ]);
  return [...months].filter(Boolean).sort();
}

function expenseCategoriesForMonth(month) {
  const map = new Map();
  for (const item of state.transactions) {
    if (item.type !== "expense" || monthFromDate(item.date) !== month) continue;
    const category = item.category.trim() || "Other";
    map.set(category, (map.get(category) || 0) + item.amount);
  }
  return map;
}

function ensureComparisonMonths(months) {
  if (!months.length) return { baseMonth: state.selectedMonth, targetMonth: state.selectedMonth };
  const targetMonth = months.includes(state.compareTargetMonth) ? state.compareTargetMonth : state.selectedMonth;
  const targetIndex = Math.max(0, months.indexOf(targetMonth));
  const fallbackBase = months[Math.max(0, targetIndex - 1)] || targetMonth;
  const baseMonth = months.includes(state.compareBaseMonth) ? state.compareBaseMonth : fallbackBase;
  state.compareBaseMonth = baseMonth;
  state.compareTargetMonth = targetMonth;
  return { baseMonth, targetMonth };
}

function budgetRows() {
  const spent = new Map(categoryTotals());
  const budgets = getPlan().budgets;
  const totalExpenses = monthlyTransactions()
    .filter((row) => row.type === "expense")
    .reduce((sum, row) => sum + row.amount, 0);
  return budgets.map((budget) => {
    const actual = budgets.length === 1 ? totalExpenses : spent.get(budget.name) || 0;
    return { ...budget, actual, remaining: budget.amount - actual };
  });
}

function getOverspentDescription() {
  const overspent = budgetRows().filter((row) => row.remaining < 0).map((row) => row.name.trim()).filter(Boolean);
  if (!overspent.length) return "";
  if (overspent.length === 1) return overspent[0];
  if (overspent.length === 2) return `${overspent[0]}, ${overspent[1]}`;
  return `${overspent[0]}, ${overspent[1]} +${overspent.length - 2} more`;
}

function render() {
  const total = totals();
  const categories = categoryTotals();
  const spentPercent = total.expenseLimit > 0 ? Math.min((total.expenses / total.expenseLimit) * 100, 999) : 0;
  const overspentDescription = getOverspentDescription();

  els.monthSelect.value = state.selectedMonth;
  els.incomeMetric.textContent = currency.format(total.income);
  els.expenseMetric.textContent = currency.format(total.expenseLimit);
  els.leftMetric.textContent = currency.format(total.expenses);
  els.remainingBudgetMetric.textContent = currency.format(total.expectedRemaining);
  els.actualRemainingMetric.textContent = currency.format(total.actualRemaining);
  els.largestMetric.textContent = overspentDescription || currency.format(total.overspent);
  els.savedAmount.textContent = currency.format(total.saved);
  els.budgetUsed.textContent = `${Math.round(spentPercent)}%`;
  els.limitText.textContent = `${currency.format(total.expenses)} of ${currency.format(total.expenseLimit)}`;
  els.limitProgress.style.width = `${Math.min(spentPercent, 100)}%`;
  els.chartTotal.textContent = `${currency.format(total.expenses)} total`;

  renderOverviewAlerts(total);
  renderSuggestionLists();
  renderIncomeRows();
  renderBudgets();
  renderCategoryDropdown();
  renderTransactions();
  renderGoals();
  drawChart(categories);
  renderComparisonReport();
  renderEmiPlanner();
  renderInvestmentTracker();
}

function renderSuggestionLists() {
  renderBudgetNameSuggestions();
  renderIncomeDescriptionSuggestions();
  renderCategorySuggestions();
}

function renderOverviewAlerts(total) {
  const alerts = [];
  if (total.expenseLimit > total.income) {
    alerts.push({
      icon: "⚠️",
      type: "warning",
      message: "Expected Monthly Budget exceeds income. Review your planned budgets, but you may continue."
    });
  }
  if (total.expenses > total.expenseLimit) {
    alerts.push({
      icon: "❗",
      type: "danger",
      message: "Actual Expenses exceed the Expected Monthly Budget. Track overspending, but you may continue."
    });
  }
  
  const upcoming = getUpcomingInstallments();
  if (upcoming.length > 0) {
    const nextEmi = upcoming[0];
    const targetDate = new Date(nextEmi.dueDate);
    targetDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays >= 0 && diffDays <= 1) {
      const label = diffDays === 0 ? "Due Today" : "Due Tomorrow";
      alerts.push({
        icon: "⏰",
        type: "warning",
        message: `EMI ${label}: ${nextEmi.emi.name} of ${currency.format(nextEmi.amount)} is due on ${formatDateWithSpace(nextEmi.dueDate)}.`
      });
    }
  }
  
  if (!els.overviewAlerts) return;
  if (alerts.length) {
    els.overviewAlerts.hidden = false;
    els.overviewAlerts.innerHTML = alerts.map((alert) => `
      <div class="alert-message alert-message--${alert.type}">
        <span class="alert-icon" aria-hidden="true">${alert.icon}</span>
        <span>${escapeHtml(alert.message)}</span>
      </div>
    `).join("");
  } else {
    els.overviewAlerts.hidden = true;
    els.overviewAlerts.innerHTML = "";
  }
}

function renderDatalist(list, values) {
  list.innerHTML = "";
  for (const value of values) {
    const option = document.createElement("option");
    option.value = value;
    list.appendChild(option);
  }
}

function renderBudgetNameSuggestions() {
  // Only display the custom suggestion dropdown when the input is focused
  if (document.activeElement !== els.budgetNameInput) {
    els.budgetSuggestionList.hidden = true;
    return;
  }

  const query = els.budgetNameInput.value.trim().toLowerCase();
  const values = (state.savedBudgetNames || []).filter((name) => {
    return !query || name.toLowerCase().includes(query);
  });

  if (!els.budgetSuggestionList) return;
  els.budgetSuggestionList.innerHTML = "";
  if (!values.length) {
    els.budgetSuggestionList.hidden = true;
    return;
  }

  for (const name of values) {
    const item = document.createElement("div");
    item.className = "budget-suggestion-item";

    const selectButton = document.createElement("button");
    selectButton.type = "button";
    selectButton.className = "budget-suggestion-select";
    selectButton.dataset.name = name;
    selectButton.textContent = name;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "budget-suggestion-remove";
    removeButton.dataset.name = name;
    removeButton.title = `Remove ${name}`;
    removeButton.textContent = "×";

    item.appendChild(selectButton);
    item.appendChild(removeButton);
    els.budgetSuggestionList.appendChild(item);
  }

  els.budgetSuggestionList.hidden = false;
}

function hideBudgetSuggestions() {
  els.budgetSuggestionList.hidden = true;
}

function hideIncomeSuggestions() {
  if (els.incomeSuggestionList) {
    els.incomeSuggestionList.hidden = true;
  }
}

function hideCategorySuggestions() {
  if (els.categorySuggestionList) {
    els.categorySuggestionList.hidden = true;
  }
}

function renderIncomeDescriptionSuggestions() {
  if (!els.incomeSuggestionList) return;
  if (document.activeElement !== els.incomeDescriptionInput) {
    els.incomeSuggestionList.hidden = true;
    return;
  }
  const query = els.incomeDescriptionInput.value.trim().toLowerCase();
  const values = (state.savedIncomeDescriptions || []).filter((name) => {
    return !query || name.toLowerCase().includes(query);
  });

  if (!els.incomeSuggestionList) return;
  els.incomeSuggestionList.innerHTML = "";
  if (!values.length) {
    els.incomeSuggestionList.hidden = true;
    return;
  }

  for (const name of values) {
    const item = document.createElement("div");
    item.className = "budget-suggestion-item";

    const selectButton = document.createElement("button");
    selectButton.type = "button";
    selectButton.className = "budget-suggestion-select";
    selectButton.dataset.name = name;
    selectButton.textContent = name;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "budget-suggestion-remove";
    removeButton.dataset.name = name;
    removeButton.title = `Remove ${name}`;
    removeButton.textContent = "×";

    item.appendChild(selectButton);
    item.appendChild(removeButton);
    els.incomeSuggestionList.appendChild(item);
  }

  els.incomeSuggestionList.hidden = false;
}

function renderCategorySuggestions() {
  if (!els.categorySuggestionList) return;
  if (document.activeElement !== els.categoryInput) {
    els.categorySuggestionList.hidden = true;
    return;
  }
  const query = els.categoryInput.value.trim().toLowerCase();
  const isIncome = els.typeInput.value === "income";
  const suggestionsSource = isIncome ? state.savedIncomeDescriptions : state.savedBudgetNames;
  const values = (suggestionsSource || []).filter((name) => {
    return !query || name.toLowerCase().includes(query);
  });

  if (!els.categorySuggestionList) return;
  els.categorySuggestionList.innerHTML = "";
  if (!values.length) {
    els.categorySuggestionList.hidden = true;
    return;
  }

  for (const name of values) {
    const item = document.createElement("div");
    item.className = "budget-suggestion-item";

    const selectButton = document.createElement("button");
    selectButton.type = "button";
    selectButton.className = "budget-suggestion-select";
    selectButton.dataset.name = name;
    selectButton.textContent = name;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "budget-suggestion-remove";
    removeButton.dataset.name = name;
    removeButton.title = `Remove ${name}`;
    removeButton.textContent = "×";

    item.appendChild(selectButton);
    item.appendChild(removeButton);
    els.categorySuggestionList.appendChild(item);
  }

  els.categorySuggestionList.hidden = false;
}

function startBudgetEdit(budgetId) {
  const plan = getPlan();
  const budget = plan.budgets.find((item) => item.id == budgetId);
  if (!budget) return;
  editingBudgetId = budgetId;
  els.budgetNameInput.value = budget.name;
  els.budgetAmountInput.value = budget.amount;
  els.budgetCancelBtn.hidden = false;
  els.budgetForm.querySelector("button[type=submit]").textContent = "Update Budget";
  els.budgetNameInput.focus();
}

function resetBudgetEdit() {
  editingBudgetId = null;
  els.budgetForm.reset();
  els.budgetCancelBtn.hidden = true;
  els.budgetForm.querySelector("button[type=submit]").textContent = "Add Budget";
}

function startTransactionEdit(transactionId) {
  const transaction = state.transactions.find((item) => item.id == transactionId);
  if (!transaction) return;
  editingTransactionId = transactionId;
  els.typeInput.value = transaction.type;
  renderCategoryDropdown();
  els.categoryInput.value = transaction.category;
  els.amountInput.value = transaction.amount;
  els.dateInput.value = transaction.date;
  els.noteInput.value = transaction.note || "";
  els.transactionCancelBtn.hidden = false;
  els.transactionForm.querySelector("button[type=submit]").textContent = "Update";
  els.categoryInput.focus();
}

function resetTransactionEdit() {
  editingTransactionId = null;
  els.transactionForm.reset();
  els.transactionCancelBtn.hidden = true;
  els.transactionForm.querySelector("button[type=submit]").textContent = "Add";
  renderCategoryDropdown();
}

function renderComparisonReport() {
  const months = availableReportMonths();
  const { baseMonth, targetMonth } = ensureComparisonMonths(months);
  renderSelectOptions(els.compareBaseMonth, months, baseMonth);
  renderSelectOptions(els.compareTargetMonth, months, targetMonth);

  const baseExpenses = expenseCategoriesForMonth(baseMonth);
  const targetExpenses = expenseCategoriesForMonth(targetMonth);
  const categories = [...new Set([...baseExpenses.keys(), ...targetExpenses.keys()])];
  const rows = categories.map((category) => {
    const baseAmount = baseExpenses.get(category) || 0;
    const targetAmount = targetExpenses.get(category) || 0;
    return { category, baseAmount, targetAmount, difference: targetAmount - baseAmount };
  }).sort((a, b) => Math.max(b.baseAmount, b.targetAmount) - Math.max(a.baseAmount, a.targetAmount));

  const baseTotal = rows.reduce((sum, row) => sum + row.baseAmount, 0);
  const targetTotal = rows.reduce((sum, row) => sum + row.targetAmount, 0);
  const change = targetTotal - baseTotal;
  const changeText = change >= 0 ? `increased by ${currency.format(change)}` : `decreased by ${currency.format(Math.abs(change))}`;
  els.comparisonSummary.textContent = `${baseMonth}: ${currency.format(baseTotal)} | ${targetMonth}: ${currency.format(targetTotal)} (${changeText})`;
  drawComparisonChart(rows, baseMonth, targetMonth);
}

function renderSelectOptions(select, months, selectedMonth) {
  if (!select) return;
  select.innerHTML = "";
  for (const month of months) {
    const option = document.createElement("option");
    option.value = month;
    option.textContent = month;
    option.selected = month === selectedMonth;
    select.appendChild(option);
  }
}

function renderIncomeRows() {
  const plan = getPlan();
  const rows = [
    ...plan.incomes.map((item) => ({ ...item, type: "Income", kind: "income" }))
  ];
  if (els.incomeTable) els.incomeTable.innerHTML = "";
  els.emptyIncome.hidden = rows.length > 0;

  for (const row of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(row.type)}</td>
      <td>${escapeHtml(row.description)}</td>
      <td class="amount-cell">${currency.format(row.amount)}</td>
      <td><button class="delete-row" type="button" title="Delete ${escapeHtml(row.type)}" data-income-kind="${row.kind}" data-income-id="${row.id}">x</button></td>
    `;
    if (els.incomeTable) els.incomeTable.appendChild(tr);
  }
}

function renderBudgets() {
  const rows = budgetRows();
  if (els.budgetTable) els.budgetTable.innerHTML = "";
  if (els.budgetCategoryList) els.budgetCategoryList.innerHTML = "";
  els.emptyBudgets.hidden = rows.length > 0;

  for (const name of state.savedBudgetNames || []) {
    const option = document.createElement("option");
    option.value = name;
    if (els.budgetCategoryList) els.budgetCategoryList.appendChild(option);
  }

  for (const row of rows) {
    const tr = document.createElement("tr");
    if (row.remaining === 0) tr.classList.add("budget-zero");
    if (row.remaining < 0) tr.classList.add("budget-negative");
    tr.innerHTML = `
      <td>${escapeHtml(row.name)}</td>
      <td class="amount-cell">${currency.format(row.amount)}</td>
      <td class="amount-cell">${currency.format(row.actual)}</td>
      <td class="amount-cell remaining-cell">${currency.format(row.remaining)}</td>
      <td>
        <button class="edit-row" type="button" title="Edit budget" data-budget-edit-id="${row.id}">Edit</button>
        <button class="delete-row" type="button" title="Delete budget" data-budget-id="${row.id}">x</button>
      </td>
    `;
    if (els.budgetTable) els.budgetTable.appendChild(tr);
  }
}

/*async function renderCategoryDropdown() {

  const select = document.getElementById("transactionCategory");

  if (!select) return;

  const type = document.getElementById("transactionType").value;

  select.innerHTML = "";

  const categories = (state.categories || [])
    .filter(c => c.type === type.toLowerCase());

  categories.forEach(category => {

    const option = document.createElement("option");

    option.value = category.id;
    option.textContent = category.name;

    select.appendChild(option);

  });

}*/

function renderTransactions() {
  const filterText = (els.transactionCategoryFilter?.value || "").trim().toLowerCase();
  const rows = monthlyTransactions().filter((row) => {
    if (!filterText) return true;
    return String(row.category || "").toLowerCase().includes(filterText);
  });
  if (els.transactionTable) els.transactionTable.innerHTML = "";
  if (filterText && rows.length === 0) {
    els.emptyTransactions.textContent = "there is no items";
  } else {
    els.emptyTransactions.textContent = "No transactions for this month yet.";
  }
  els.emptyTransactions.hidden = rows.length > 0;

  for (const row of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(row.date)}</td>
      <td>${escapeHtml(titleCase(row.type))}</td>
      <td>${escapeHtml(row.category || "")}</td>
      <td>${escapeHtml(row.note || "")}</td>
      <td class="amount-cell">${row.type === "expense" ? "-" : ""}${currency.format(row.amount)}</td>
      <td>
        <button class="edit-row" type="button" title="Edit transaction" data-transaction-id="${row.id}">Edit</button>
        <button class="delete-row" type="button" title="Delete transaction" data-id="${row.id}">x</button>
      </td>
    `;
    if (els.transactionTable) els.transactionTable.appendChild(tr);
  }
}

function renderGoals() {
  if (els.goalsList) els.goalsList.innerHTML = "";
  els.emptyGoals.hidden = state.goals.length > 0;

  for (const goal of state.goals) {
    const node = els.goalTemplate.content.firstElementChild.cloneNode(true);
    const percent = goal.target > 0 ? Math.min((goal.saved / goal.target) * 100, 100) : 0;
    node.querySelector("h3").textContent = goal.name;
    node.querySelector("button").dataset.id = goal.id;
    node.querySelector(".goal-money").textContent = `${currency.format(goal.saved)} saved of ${currency.format(goal.target)}`;
    node.querySelector(".progress-fill").style.width = `${percent}%`;
    if (els.goalsList) els.goalsList.appendChild(node);
  }
}

function drawChart(categories) {
  const canvas = els.categoryChart;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, rect.width, rect.height);

  const palette = ["#2f7d57", "#247e83", "#b77b20", "#4b6f9e", "#b55343", "#6b7280"];
  const pad = 26;
  const width = rect.width - pad * 2;
  const height = rect.height - pad * 2;

  if (!categories.length) {
    ctx.fillStyle = "#69746d";
    ctx.font = "600 15px system-ui";
    ctx.fillText("No spending data for this month.", pad, pad + 20);
    return;
  }

  const max = Math.max(...categories.map(([, value]) => value));
  const barGap = 12;
  const barHeight = Math.max(22, Math.min(42, (height - barGap * (categories.length - 1)) / categories.length));

  categories.slice(0, 6).forEach(([name, value], index) => {
    const y = pad + index * (barHeight + barGap);
    const barWidth = Math.max(6, (value / max) * (width - 130));
    ctx.fillStyle = "#eef3ef";
    roundRect(ctx, pad, y, width - 130, barHeight, 8);
    ctx.fill();
    ctx.fillStyle = palette[index % palette.length];
    roundRect(ctx, pad, y, barWidth, barHeight, 8);
    ctx.fill();
    ctx.fillStyle = "#17211d";
    ctx.font = "700 13px system-ui";
    ctx.fillText(name.slice(0, 20), pad + 10, y + barHeight / 2 + 5);
    ctx.fillStyle = "#38453f";
    ctx.textAlign = "right";
    ctx.fillText(currency.format(value), rect.width - pad, y + barHeight / 2 + 5);
    ctx.textAlign = "left";
  });
}

function drawComparisonChart(rows, baseMonth, targetMonth) {
  const canvas = els.comparisonChart;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, rect.width, rect.height);

  const pad = 34;
  const chartWidth = rect.width - pad * 2;
  const chartHeight = rect.height - pad * 2;

  if (!rows.length) {
    ctx.fillStyle = "#69746d";
    ctx.font = "600 15px system-ui";
    ctx.fillText("No expense data for the selected months.", pad, pad + 20);
    return;
  }

  const visibleRows = rows.slice(0, 8);
  const max = Math.max(...visibleRows.flatMap((row) => [row.baseAmount, row.targetAmount]), 1);
  const labelWidth = Math.min(190, chartWidth * 0.28);
  const valueWidth = chartWidth - labelWidth - 95;
  const rowGap = 13;
  const rowHeight = Math.max(26, Math.min(36, (chartHeight - 42 - rowGap * (visibleRows.length - 1)) / visibleRows.length));
  const baseColor = "#4b6f9e";
  const targetColor = "#b77b20";

  ctx.font = "700 12px system-ui";
  ctx.fillStyle = baseColor;
  ctx.fillText(baseMonth, pad + labelWidth, pad + 4);
  ctx.fillStyle = targetColor;
  ctx.fillText(targetMonth, pad + labelWidth + 90, pad + 4);

  visibleRows.forEach((row, index) => {
    const y = pad + 22 + index * (rowHeight + rowGap);
    const baseWidth = Math.max(4, (row.baseAmount / max) * valueWidth);
    const targetWidth = Math.max(4, (row.targetAmount / max) * valueWidth);
    const halfHeight = Math.max(8, (rowHeight - 6) / 2);

    ctx.fillStyle = "#17211d";
    ctx.font = "700 13px system-ui";
    ctx.fillText(row.category.slice(0, 22), pad, y + rowHeight / 2 + 4);

    ctx.fillStyle = "#eef3ef";
    roundRect(ctx, pad + labelWidth, y, valueWidth, halfHeight, 5);
    ctx.fill();
    roundRect(ctx, pad + labelWidth, y + halfHeight + 4, valueWidth, halfHeight, 5);
    ctx.fill();

    ctx.fillStyle = baseColor;
    roundRect(ctx, pad + labelWidth, y, baseWidth, halfHeight, 5);
    ctx.fill();
    ctx.fillStyle = targetColor;
    roundRect(ctx, pad + labelWidth, y + halfHeight + 4, targetWidth, halfHeight, 5);
    ctx.fill();

    ctx.fillStyle = row.difference >= 0 ? "#8d1f13" : "#2f7d57";
    ctx.textAlign = "right";
    const differenceText = row.difference >= 0 ? `+${currency.format(row.difference)}` : `-${currency.format(Math.abs(row.difference))}`;
    ctx.fillText(differenceText, rect.width - pad, y + rowHeight / 2 + 4);
    ctx.textAlign = "left";
  });
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function buildExcelWorkbook() {
  const total = totals();
  const plan = getPlan();
  const budgets = budgetRows();
  const transactions = monthlyTransactions();
  const summaryRows = [
    ["Month", state.selectedMonth],
    ["Income Amount", total.income],
    ["Expected Monthly Budget", total.expenseLimit],
    ["Actual Expenses", total.expenses],
    ["Expected Remaining Amount", total.expectedRemaining],
    ["Actual Remaining", total.actualRemaining],
    ["Remaining Budget", total.remainingBudget],
    ["Budget Overspent", total.overspent],
    ["Budget Used", total.expenseLimit > 0 ? `${Math.round((total.expenses / total.expenseLimit) * 100)}%` : "0%"],
    [],
    ["Budget Name", "Expected Budget", "Actual Expenses", "Remaining Budget"],
    ...budgets.map((item) => [item.name, item.amount, item.actual, item.remaining])
  ];
  const transactionRows = [
    ["Date", "Type", "Category", "Note", "Amount"],
    ...transactions.map((item) => [item.date, titleCase(item.type), item.category, item.note || "", item.amount])
  ];
  const incomeRows = [
    ["Type", "Description", "Amount"],
    ...plan.incomes.map((item) => ["Income", item.description, item.amount])
  ];
  const goalRows = [
    ["Goal", "Target", "Saved", "Progress"],
    ...state.goals.map((goal) => [
      goal.name,
      goal.target,
      goal.saved,
      goal.target > 0 ? `${Math.round((goal.saved / goal.target) * 100)}%` : "0%"
    ])
  ];

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; }
        table { border-collapse: collapse; margin-bottom: 28px; }
        th { background: #2f7d57; color: #fff; }
        th, td { border: 1px solid #b8c5bc; padding: 8px 10px; }
        .sheet-title { font-size: 18px; font-weight: 700; color: #17211d; }
      </style>
    </head>
    <body>
      ${excelSheet("Summary", summaryRows)}
      ${excelSheet("Income", incomeRows)}
      ${excelSheet("Transactions", transactionRows)}
      ${excelSheet("Goals", goalRows)}
    </body>
    </html>
  `;
}

function excelSheet(name, rows) {
  return `
    <table>
      <tr><td class="sheet-title" colspan="8">${escapeHtml(name)}</td></tr>
      ${rows.map((row, index) => {
        if (!row.length) return "<tr><td></td></tr>";
        const cell = index === 0 || row[0] === "Budget" || row[0] === "Budget Name" ? "th" : "td";
        return `<tr>${row.map((value) => `<${cell}>${escapeHtml(value)}</${cell}>`).join("")}</tr>`;
      }).join("")}
    </table>
  `;
}

function parseImportedWorkbook(fileText) {
  const doc = new DOMParser().parseFromString(fileText, "text/html");
  const sheets = [...doc.querySelectorAll("table")].map(readSheet);
  const summary = sheets.find((sheet) => sheet.name === "Summary");
  const incomeSheet = sheets.find((sheet) => sheet.name === "Income");
  const transactions = sheets.find((sheet) => sheet.name === "Transactions");
  const goals = sheets.find((sheet) => sheet.name === "Goals");

  if (!summary) throw new Error("Missing Summary sheet.");

  const month = valueAt(summary.rows, "Month") || currentMonth();
  const income = Number(valueAt(summary.rows, "Income Amount") || valueAt(summary.rows, "Expected Budget")) || 0;
  const incomeRows = readIncomeRows(incomeSheet?.rows || [], income);
  const importedState = {
    selectedMonth: month,
    plans: {
      [month]: {
        income,
        incomes: incomeRows,
        budgets: readBudgetRows(summary.rows)
      }
    },
    transactions: readTransactionRows(transactions?.rows || []),
    goals: readGoalRows(goals?.rows || [])
  };

  return importedState;
}

function readIncomeRows(rows, fallbackIncome) {
  const headerIndex = rows.findIndex((row) => row[0] === "Type");
  if (headerIndex === -1) {
    return fallbackIncome > 0 ? [{ id: crypto.randomUUID(), description: "Income", amount: fallbackIncome }] : [];
  }

  const incomes = [];
  for (const row of rows.slice(headerIndex + 1).filter((item) => item[1] || item[2])) {
    if (row[0] !== "Income") continue;
    const entry = {
      id: crypto.randomUUID(),
      description: row[1] || "Income",
      amount: Number(row[2]) || 0
    };
    incomes.push(entry);
  }
  return incomes;
}

function readSheet(table) {
  const rows = [...table.querySelectorAll("tr")].map((row) =>
    [...row.children].map((cell) => cell.textContent.trim())
  );
  const titleRow = rows.shift() || [];
  return { name: titleRow[0] || "", rows };
}

function valueAt(rows, label) {
  const row = rows.find((item) => item[0] === label);
  return row ? row[1] : "";
}

function readBudgetRows(rows) {
  const headerIndex = rows.findIndex((row) => row[0] === "Budget Name" || row[0] === "Budget");
  if (headerIndex === -1) return [];

  return rows.slice(headerIndex + 1)
    .filter((row) => row[0])
    .map((row) => ({
      id: crypto.randomUUID(),
      name: row[0],
      amount: Number(row[1]) || 0
    }));
}

function readTransactionRows(rows) {
  const headerIndex = rows.findIndex((row) => row[0] === "Date");
  if (headerIndex === -1) return [];

  return rows.slice(headerIndex + 1)
    .filter((row) => row[0])
    .map((row) => ({
      id: crypto.randomUUID(),
      date: row[0],
      type: row[1]?.toLowerCase() === "income" ? "income" : "expense",
      category: row[2] || "Other",
      note: row[3] || "",
      amount: Number(row[4]) || 0
    }));
}

function readGoalRows(rows) {
  const headerIndex = rows.findIndex((row) => row[0] === "Goal");
  if (headerIndex === -1) return [];

  return rows.slice(headerIndex + 1)
    .filter((row) => row[0])
    .map((row) => ({
      id: crypto.randomUUID(),
      name: row[0],
      target: Number(row[1]) || 0,
      saved: Number(row[2]) || 0
    }));
}

function reportError(error) {
  console.error(error);
  const message = (error && error.message) ? `: ${error.message}` : "";
  alert(`Database action failed. Please make sure the backend server is running${message}`);
}

function getDueDateForMonthIndex(startDateStr, dueDay, index) {
  const parts = startDateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed
  
  const d = new Date(year, month + index, 1);
  const maxDay = new Date(year, month + index + 1, 0).getDate();
  const targetDay = Math.min(parseInt(dueDay, 10) || 5, maxDay);
  
  const targetYear = d.getFullYear();
  const targetMonth = String(d.getMonth() + 1).padStart(2, '0');
  const targetDayStr = String(targetDay).padStart(2, '0');
  return `${targetYear}-${targetMonth}-${targetDayStr}`;
}

function getUpcomingInstallments() {
  const upcoming = [];
  const activeEmis = (state.emis || []).filter(e => e.status === "active");
  
  for (const emi of activeEmis) {
    const paidMonthsKeys = Object.keys(emi.paidMonths || {});
    for (let i = 0; i < emi.totalMonths; i++) {
      const dueDate = getDueDateForMonthIndex(emi.startDate, emi.dueDay, i);
      const monthStr = dueDate.slice(0, 7); // YYYY-MM
      if (!paidMonthsKeys.includes(monthStr)) {
        upcoming.push({
          emi,
          dueDate,
          monthStr,
          amount: emi.emiAmount
        });
        break;
      }
    }
  }
  
  upcoming.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return upcoming;
}

function isEmiScheduledForMonth(emi, monthStr) {
  for (let i = 0; i < emi.totalMonths; i++) {
    const dueDate = getDueDateForMonthIndex(emi.startDate, emi.dueDay, i);
    if (dueDate.slice(0, 7) === monthStr) {
      return true;
    }
  }
  return false;
}

function formatDateWithSpace(dateStr) {
  if (!dateStr) return "-";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = String(parseInt(parts[2], 10)).padStart(2, '0');
  const monthIdx = parseInt(parts[1], 10) - 1;
  const month = months[monthIdx] || parts[1];
  const year = parts[0];
  return `${day} ${month} ${year}`;
}

function formatDateWithDash(dateStr) {
  if (!dateStr) return "-";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = String(parseInt(parts[2], 10)).padStart(2, '0');
  const monthIdx = parseInt(parts[1], 10) - 1;
  const month = months[monthIdx] || parts[1];
  const year = parts[0];
  return `${day}-${month}-${year}`;
}

function checkEmiDueReminders() {
  const upcoming = getUpcomingInstallments();
  
  if (els.emiPlannerAlerts) {
    els.emiPlannerAlerts.hidden = true;
    els.emiPlannerAlerts.innerHTML = "";
  }
  
  if (upcoming.length > 0) {
    const nextEmi = upcoming[0];
    const targetDate = new Date(nextEmi.dueDate);
    targetDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays >= 0 && diffDays <= 1) {
      const label = diffDays === 0 ? "Due Today" : "Due Tomorrow";
      if (els.emiPlannerAlerts) {
        els.emiPlannerAlerts.hidden = false;
        els.emiPlannerAlerts.innerHTML = `
          <div class="alert-message alert-message--warning">
            <span class="alert-icon" aria-hidden="true">⚠️</span>
            <div>
              <strong>EMI ${label}</strong>
              <p style="margin: 2px 0 0 0; font-size: 13px;">${escapeHtml(nextEmi.emi.name)} | Amount: ${currency.format(nextEmi.amount)} | Due Date: ${formatDateWithSpace(nextEmi.dueDate)}</p>
            </div>
          </div>
        `;
      }
      
      if (Notification.permission === "granted") {
        const sentKey = `emi-notif-${nextEmi.emi.id}-${nextEmi.dueDate}`;
        if (!localStorage.getItem(sentKey)) {
          new Notification(`EMI ${label}`, {
            body: `${nextEmi.emi.name} of ${currency.format(nextEmi.amount)} is due on ${formatDateWithSpace(nextEmi.dueDate)}`
          });
          localStorage.setItem(sentKey, "true");
        }
      }
    }
  }
}

function initPushNotifications() {
  if ("Notification" in window) {
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }
}

function renderEmiPlanner() {
  if (!state || !state.emis) return;
  
  const activeEmis = state.emis.filter(e => e.status === "active");
  const monthlyCommitment = activeEmis.reduce((sum, e) => sum + e.emiAmount, 0);
  
  let totalRemaining = 0;
  let paidTillNow = 0;
  
  for (const emi of state.emis) {
    const paidCount = Object.keys(emi.paidMonths || {}).length;
    const paidAmt = paidCount * emi.emiAmount;
    paidTillNow += paidAmt;
    
    if (emi.status === "active") {
      const remainingCount = emi.totalMonths - paidCount;
      const remainingAmt = remainingCount * emi.emiAmount;
      totalRemaining += remainingAmt;
    }
  }
  
  if (els.emiActiveCount) els.emiActiveCount.textContent = activeEmis.length;
  if (els.emiMonthlyCommitment) els.emiMonthlyCommitment.textContent = currency.format(monthlyCommitment);
  if (els.emiTotalRemaining) els.emiTotalRemaining.textContent = currency.format(totalRemaining);
  if (els.emiPaidTillNow) els.emiPaidTillNow.textContent = currency.format(paidTillNow);
  
  const upcoming = getUpcomingInstallments();
  if (els.emiUpcomingBox) {
    if (upcoming.length > 0) {
      const nextEmi = upcoming[0];
      if (els.emiUpcomingName) els.emiUpcomingName.textContent = nextEmi.emi.name;
      if (els.emiUpcomingAmount) els.emiUpcomingAmount.textContent = currency.format(nextEmi.amount);
      if (els.emiUpcomingDate) els.emiUpcomingDate.textContent = formatDateWithSpace(nextEmi.dueDate);
      
      els.emiUpcomingMarkPaidBtn.style.display = "inline-block";
      els.emiUpcomingMarkPaidBtn.onclick = () => {
        if (els.emiConfirmPaymentPanel) {
          els.emiConfirmName.textContent = nextEmi.emi.name;
          els.emiConfirmDate.textContent = formatDateWithSpace(nextEmi.dueDate);
          els.emiConfirmAmount.textContent = currency.format(nextEmi.amount);
          
          els.emiConfirmDateInput.value = nextEmi.dueDate;
          els.emiConfirmNotesInput.value = `Paid installment for ${formatDateWithDash(nextEmi.dueDate).slice(3)}`;
          
          els.emiConfirmForm.dataset.emiId = nextEmi.emi.id;
          els.emiConfirmForm.dataset.monthStr = nextEmi.monthStr;
          els.emiConfirmForm.dataset.dueDate = nextEmi.dueDate;
          els.emiConfirmForm.dataset.amount = nextEmi.amount;
          
          els.emiConfirmPaymentPanel.style.display = "block";
          els.emiConfirmPaymentPanel.scrollIntoView({ behavior: 'smooth' });
        }
      };
    } else {
      if (els.emiUpcomingName) els.emiUpcomingName.textContent = "No Upcoming EMI";
      if (els.emiUpcomingAmount) els.emiUpcomingAmount.textContent = "";
      if (els.emiUpcomingDate) els.emiUpcomingDate.textContent = "-";
      els.emiUpcomingMarkPaidBtn.style.display = "none";
    }
  }
  
  if (els.emiPlannerListBody) {
    els.emiPlannerListBody.innerHTML = "";
    if (activeEmis.length === 0) {
      els.emiPlannerListBody.innerHTML = `<tr><td colspan="7" style="text-align: center;">No active EMI plans.</td></tr>`;
    } else {
      activeEmis.forEach(emi => {
        const paidCount = Object.keys(emi.paidMonths || {}).length;
        const remainingCount = emi.totalMonths - paidCount;
        const isSelected = emi.id === state.selectedEmiId;
        
        const tr = document.createElement("tr");
        if (isSelected) {
          tr.style.backgroundColor = "rgba(26, 115, 232, 0.08)";
        }
        tr.innerHTML = `
          <td><strong>${escapeHtml(emi.name)}</strong></td>
          <td>${currency.format(emi.emiAmount)}</td>
          <td>${emi.totalMonths}</td>
          <td>${paidCount}</td>
          <td>${remainingCount}</td>
          <td><span class="emi-badge active" style="background-color: #e8f0fe; color: #1a73e8;">Active</span></td>
          <td>
            <button class="edit-row view-details-btn" type="button" title="View details" style="background: #e8f0fe; color: #1a73e8; border-color: #d2e3fc; min-width: 34px; height: 34px; padding: 0;">👁️</button>
            <button class="edit-row edit-plan-btn" type="button" title="Edit plan" style="min-width: 50px; height: 34px;">Edit</button>
            <button class="delete-row delete-plan-btn" type="button" title="Delete plan" style="width: 34px; height: 34px;">x</button>
          </td>
        `;
        
        tr.querySelector(".view-details-btn").addEventListener("click", () => {
          state.selectedEmiId = emi.id;
          renderEmiPlanner();
        });
        
        tr.querySelector(".edit-plan-btn").addEventListener("click", () => {
          els.emiEditingId.value = emi.id;
          els.emiNameInput.value = emi.name;
          els.emiLoanAmountInput.value = emi.loanAmount;
          els.emiAmountInput.value = emi.emiAmount;
          els.emiStartDateInput.value = emi.startDate;
          els.emiDueDayInput.value = emi.dueDay;
          els.emiTotalMonthsInput.value = emi.totalMonths;
          els.emiNotesInput.value = emi.notes || "";
          
          els.emiSaveBtn.textContent = "Update EMI Plan";
          els.emiCancelBtn.style.display = "inline-block";
          els.emiPlannerForm.scrollIntoView({ behavior: 'smooth' });
        });
        
        tr.querySelector(".delete-plan-btn").addEventListener("click", async () => {
          if (confirm(`Are you sure you want to delete ${emi.name}?`)) {
            state.emis = state.emis.filter(e => e.id !== emi.id);
            if (state.selectedEmiId === emi.id) {
              state.selectedEmiId = state.emis.length > 0 ? state.emis[0].id : null;
            }
            try {
              await saveState();
              render();
            } catch (error) {
              reportError(error);
            }
          }
        });
        
        els.emiPlannerListBody.appendChild(tr);
      });
    }
  }
  
  const selectedEmi = state.emis.find(e => e.id === state.selectedEmiId);
  if (selectedEmi) {
    if (els.emiScheduleTitle) {
      els.emiScheduleTitle.textContent = `${selectedEmi.name} - Payment Schedule`;
    }
    if (els.emiProgressTitle) {
      els.emiProgressTitle.textContent = selectedEmi.name;
    }
    
    const paidCount = Object.keys(selectedEmi.paidMonths || {}).length;
    const remainingCount = selectedEmi.totalMonths - paidCount;
    const remainingAmt = remainingCount * selectedEmi.emiAmount;
    const percent = selectedEmi.totalMonths > 0 ? (paidCount / selectedEmi.totalMonths) * 100 : 0;
    
    if (els.emiProgressPaidCount) els.emiProgressPaidCount.textContent = `${paidCount} / ${selectedEmi.totalMonths}`;
    if (els.emiProgressRemainingCount) els.emiProgressRemainingCount.textContent = remainingCount;
    if (els.emiProgressRemainingAmount) els.emiProgressRemainingAmount.textContent = currency.format(remainingAmt);
    if (els.emiProgressBarFill) els.emiProgressBarFill.style.width = `${percent}%`;
    if (els.emiProgressPercentText) els.emiProgressPercentText.textContent = `${percent.toFixed(2)}%`;
    
    if (els.emiScheduleTableBody) {
      els.emiScheduleTableBody.innerHTML = "";
      for (let i = 0; i < selectedEmi.totalMonths; i++) {
        const dueDate = getDueDateForMonthIndex(selectedEmi.startDate, selectedEmi.dueDay, i);
        const monthStr = dueDate.slice(0, 7);
        const displayMonth = formatDateWithDash(dueDate).slice(3);
        const paymentDate = selectedEmi.paidMonths[monthStr];
        const isPaid = !!paymentDate;
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${formatDateWithSpace(dueDate)}</td>
          <td>${currency.format(selectedEmi.emiAmount)}</td>
          <td>
            <span class="emi-badge ${isPaid ? 'paid' : 'pending'}">${isPaid ? 'Paid' : 'Pending'}</span>
          </td>
          <td>${isPaid ? formatDateWithSpace(paymentDate) : '-'}</td>
          <td>
            ${isPaid 
              ? `<button class="edit-row view-payment-details" type="button" style="min-height: 30px; min-width: 60px;">View</button>`
              : `<button class="primary-button schedule-pay-btn" type="button" style="min-height: 30px; background: var(--green); padding: 0 10px;">Mark as Paid</button>`
            }
          </td>
        `;
        
        if (isPaid) {
          tr.querySelector(".view-payment-details").addEventListener("click", () => {
            const tx = state.transactions.find(t => 
              t.category === `EMI - ${selectedEmi.name}` && 
              t.date === paymentDate && 
              t.amount === selectedEmi.emiAmount
            );
            if (tx) {
              if (els.emiAutoTransactionPanel && els.emiAutoTransactionTableBody) {
                els.emiAutoTransactionTableBody.innerHTML = `
                  <tr>
                    <td>${formatDateWithSpace(tx.date)}</td>
                    <td><span class="emi-badge pending" style="background-color: #fce8e6; color: #c5221f;">Expense</span></td>
                    <td><strong>${escapeHtml(tx.category)}</strong></td>
                    <td>${escapeHtml(tx.note)}</td>
                    <td>${currency.format(tx.amount)}</td>
                    <td>Bank Transfer</td>
                  </tr>
                `;
                els.emiAutoTransactionPanel.style.display = "block";
                els.emiAutoTransactionPanel.scrollIntoView({ behavior: 'smooth' });
              }
            } else {
              alert(`Payment confirmed on ${formatDateWithSpace(paymentDate)}.`);
            }
          });
        } else {
          tr.querySelector(".schedule-pay-btn").addEventListener("click", () => {
            if (els.emiConfirmPaymentPanel) {
              els.emiConfirmName.textContent = selectedEmi.name;
              els.emiConfirmDate.textContent = formatDateWithSpace(dueDate);
              els.emiConfirmAmount.textContent = currency.format(selectedEmi.emiAmount);
              
              els.emiConfirmDateInput.value = dueDate;
              els.emiConfirmNotesInput.value = `Paid installment for ${displayMonth}`;
              
              els.emiConfirmForm.dataset.emiId = selectedEmi.id;
              els.emiConfirmForm.dataset.monthStr = monthStr;
              els.emiConfirmForm.dataset.dueDate = dueDate;
              els.emiConfirmForm.dataset.amount = selectedEmi.emiAmount;
              
              els.emiConfirmPaymentPanel.style.display = "block";
              els.emiConfirmPaymentPanel.scrollIntoView({ behavior: 'smooth' });
            }
          });
        }
        els.emiScheduleTableBody.appendChild(tr);
      }
    }
  } else {
    if (els.emiScheduleTitle) els.emiScheduleTitle.textContent = "-";
    if (els.emiScheduleTableBody) els.emiScheduleTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center;">Select an EMI plan to view details.</td></tr>`;
    if (els.emiProgressTitle) els.emiProgressTitle.textContent = "-";
    if (els.emiProgressPaidCount) els.emiProgressPaidCount.textContent = "0 / 0";
    if (els.emiProgressRemainingCount) els.emiProgressRemainingCount.textContent = "0";
    if (els.emiProgressRemainingAmount) els.emiProgressRemainingAmount.textContent = "₹0";
    if (els.emiProgressBarFill) els.emiProgressBarFill.style.width = "0%";
    if (els.emiProgressPercentText) els.emiProgressPercentText.textContent = "0%";
  }
  
  const total = totals();
  const plan = getPlan();
  const activeEmiNames = (state.emis || []).map(e => e.name.toLowerCase());
  const categoryBudgetTotal = plan.budgets
    .filter(b => {
      const name = b.name.toLowerCase();
      return !name.startsWith("emi") && !activeEmiNames.includes(name);
    })
    .reduce((sum, item) => sum + item.amount, 0);
  const scheduledEmis = state.emis.filter(e => e.status === "active" && isEmiScheduledForMonth(e, state.selectedMonth));
  const scheduledEmiTotal = scheduledEmis.reduce((sum, e) => sum + e.emiAmount, 0);
  const budgetImpactBalance = total.income - categoryBudgetTotal - scheduledEmiTotal;
  
  if (els.emiImpactIncome) els.emiImpactIncome.textContent = currency.format(total.income);
  if (els.emiImpactExpenses) els.emiImpactExpenses.textContent = currency.format(categoryBudgetTotal);
  if (els.emiImpactTotal) els.emiImpactTotal.textContent = currency.format(scheduledEmiTotal);
  if (els.emiImpactBalance) {
    els.emiImpactBalance.textContent = currency.format(budgetImpactBalance);
    els.emiImpactBalance.className = budgetImpactBalance >= 0 ? "green" : "red";
  }
  
  if (els.emiClosedListBody) {
    els.emiClosedListBody.innerHTML = "";
    const closedEmis = state.emis.filter(e => e.status === "closed");
    if (closedEmis.length === 0) {
      els.emiClosedListBody.innerHTML = `<tr><td colspan="5" style="text-align: center;">No closed EMI plans.</td></tr>`;
    } else {
      closedEmis.forEach(emi => {
        const paymentDates = Object.values(emi.paidMonths || {});
        paymentDates.sort();
        const lastPaymentDate = paymentDates[paymentDates.length - 1] || "-";
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>${escapeHtml(emi.name)}</strong></td>
          <td>${currency.format(emi.loanAmount)}</td>
          <td>${emi.totalMonths}</td>
          <td>${emi.totalMonths}</td>
          <td>${formatDateWithSpace(lastPaymentDate)}</td>
        `;
        els.emiClosedListBody.appendChild(tr);
      });
    }
  }
  
  checkEmiDueReminders();
}

els.tabs.forEach((button) => {
  button.addEventListener("click", () => {
    els.tabs.forEach((tab) => tab.classList.toggle("active", tab === button));
    document.querySelectorAll(".view").forEach((view) => {
      view.classList.toggle("active", view.id === `${button.dataset.view}View`);
    });
    if (button.dataset.view === "emiPlanner") {
      els.pageTitle.textContent = "EMI Planner";
    } else if (button.dataset.view === "investmentTracker") {
      els.pageTitle.textContent = "Investment Tracker";
    } else {
      els.pageTitle.textContent = titleCase(button.dataset.view);
    }
    requestAnimationFrame(render);
  });
});

els.monthSelect.addEventListener("change", async () => {
  state.selectedMonth = els.monthSelect.value || currentMonth();
  els.dateInput.value = defaultDateForSelectedMonth();
  try {
    await saveState(true);
    render();
  } catch (error) {
    reportError(error);
  }
});

els.balanceForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const plan = getPlan();
  const incomeAmount = Number(els.incomeInput.value) || 0;

  plan.incomes.push({
    id: crypto.randomUUID(),
    description: els.incomeDescriptionInput.value.trim(),
    amount: incomeAmount
  });
  rememberValue("savedIncomeDescriptions", els.incomeDescriptionInput.value);

  els.balanceForm.reset();
  try {
    await saveState();
    render();
  } catch (error) {
    reportError(error);
  }
});

els.incomeTable.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-income-id]");
  if (!button) return;
  if (!confirm("Are you sure you want to delete this income item?")) return;
  const plan = getPlan();
  const deletedIncome = plan.incomes.find((item) => item.id == button.getAttribute("data-income-id"));
  plan.incomes = plan.incomes.filter((item) => item.id != button.getAttribute("data-income-id"));
  if (deletedIncome) {
    const name = deletedIncome.description.trim();
    state.savedIncomeDescriptions = (state.savedIncomeDescriptions || []).filter(
      (val) => val.toLowerCase() !== name.toLowerCase()
    );
    state.transactions = state.transactions.filter(
      (tx) => tx.type !== "income" || tx.category.toLowerCase() !== name.toLowerCase()
    );
  }
  clearMoneyIfMonthIsEmpty();
  try {
    await saveState();
    render();
  } catch (error) {
    reportError(error);
  }
});

els.budgetForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const plan = getPlan();
  const name = els.budgetNameInput.value.trim();
  const amount = Number(els.budgetAmountInput.value) || 0;

  if (!name) {
    return;
  }

  if (editingBudgetId) {
    const existing = plan.budgets.find((item) => item.id == editingBudgetId);
    if (existing) {
      existing.name = name;
      existing.amount = amount;
    } else {
      plan.budgets.push({ id: editingBudgetId, name, amount });
    }
    resetBudgetEdit();
  } else {
    const existing = plan.budgets.find((item) => item.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      existing.name = name;
      existing.amount = amount;
    } else {
      plan.budgets.push({ id: crypto.randomUUID(), name, amount });
    }
  }

  rememberValue("savedBudgetNames", name);
  els.budgetForm.reset();
  try {
    await saveState();
    render();
  } catch (error) {
    reportError(error);
  }
});

els.budgetNameInput.addEventListener("input", () => {
  renderBudgetNameSuggestions();
});

els.budgetNameInput.addEventListener("focus", () => {
  renderBudgetNameSuggestions();
});

els.budgetSuggestionList.addEventListener("click", async (event) => {
  const selectButton = event.target.closest("button.budget-suggestion-select");
  if (selectButton) {
    els.budgetNameInput.value = selectButton.dataset.name || "";
    renderBudgetNameSuggestions();
    return;
  }

  const removeButton = event.target.closest("button.budget-suggestion-remove");
  if (!removeButton) return;
  const name = removeButton.dataset.name;
  state.savedBudgetNames = (state.savedBudgetNames || []).filter((value) => value !== name);
  try {
    await saveState();
    render();
    els.budgetNameInput.focus();
  } catch (error) {
    reportError(error);
  }
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".budget-name-row")) {
    hideBudgetSuggestions();
  }
});

document.addEventListener("click", (event) => {
  // Hide income suggestions if click is outside the income input row
  if (!event.target.closest("#incomeDescriptionInput") && 
      !event.target.closest("#incomeSuggestionList")) {
    hideIncomeSuggestions();
  }
});

document.addEventListener("click", (event) => {
  // Hide category suggestions if click is outside the category input
  if (!event.target.closest("#transactionCategory") && 
      !event.target.closest("#categorySuggestionList")) {
    hideCategorySuggestions();
  }
});

// income suggestion interactions
els.incomeDescriptionInput.addEventListener("input", () => {
  renderIncomeDescriptionSuggestions();
});
els.incomeDescriptionInput.addEventListener("focus", () => {
  renderIncomeDescriptionSuggestions();
});
els.incomeSuggestionList?.addEventListener("click", async (event) => {
  const selectButton = event.target.closest("button.budget-suggestion-select");
  if (selectButton) {
    els.incomeDescriptionInput.value = selectButton.dataset.name || "";
    renderIncomeDescriptionSuggestions();
    return;
  }

  const removeButton = event.target.closest("button.budget-suggestion-remove");
  if (!removeButton) return;
  const name = removeButton.dataset.name;
  state.savedIncomeDescriptions = (state.savedIncomeDescriptions || []).filter((value) => value !== name);
  try {
    await saveState();
    render();
    els.incomeDescriptionInput.focus();
  } catch (error) {
    reportError(error);
  }
});

// category suggestion interactions
els.categoryInput.addEventListener("input", () => {
  renderCategorySuggestions();
});
els.categoryInput.addEventListener("focus", () => {
  renderCategorySuggestions();
});
els.categorySuggestionList?.addEventListener("click", async (event) => {
  const selectButton = event.target.closest("button.budget-suggestion-select");
  if (selectButton) {
    els.categoryInput.value = selectButton.dataset.name || "";
    renderCategorySuggestions();
    return;
  }

  const removeButton = event.target.closest("button.budget-suggestion-remove");
  if (!removeButton) return;
  const name = removeButton.dataset.name;
  if (els.typeInput.value === "income") {
    state.savedIncomeDescriptions = (state.savedIncomeDescriptions || []).filter((value) => value !== name);
  } else {
    state.savedBudgetNames = (state.savedBudgetNames || []).filter((value) => value !== name);
  }
  try {
    await saveState();
    render();
    els.categoryInput.focus();
  } catch (error) {
    reportError(error);
  }
});

els.budgetTable.addEventListener("click", async (event) => {
  const editButton = event.target.closest("button[data-budget-edit-id]");
  if (editButton) {
    startBudgetEdit(editButton.getAttribute("data-budget-edit-id"));
    return;
  }

  const deleteButton = event.target.closest("button[data-budget-id]");
  if (!deleteButton) return;
  if (!confirm("Are you sure you want to delete this budget item?")) return;
  const plan = getPlan();
  const deletedBudget = plan.budgets.find((item) => item.id == deleteButton.getAttribute("data-budget-id"));
  plan.budgets = plan.budgets.filter((item) => item.id != deleteButton.getAttribute("data-budget-id"));
  if (deletedBudget) {
    const name = deletedBudget.name.trim();
    state.savedBudgetNames = (state.savedBudgetNames || []).filter(
      (val) => val.toLowerCase() !== name.toLowerCase()
    );
    state.transactions = state.transactions.filter(
      (tx) => tx.type !== "expense" || tx.category.toLowerCase() !== name.toLowerCase()
    );
  }
  clearMoneyIfMonthIsEmpty();
  try {
    await saveState();
    render();
  } catch (error) {
    reportError(error);
  }
});

els.budgetCancelBtn.addEventListener("click", () => {
  resetBudgetEdit();
});

els.showRegisterBtn.addEventListener("click", () => {
  resetAuthForms();
  showAuthScreen("register");
});

els.showLoginBtn.addEventListener("click", () => {
  resetAuthForms();
  showAuthScreen("login");
});

els.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = els.loginEmail.value.trim().toLowerCase();
  const password = els.loginPassword.value;
  await authenticateLogin(email, password);
});

els.registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = els.registerName.value.trim();
  const email = els.registerEmail.value.trim().toLowerCase();
  const password = els.registerPassword.value;
  await authenticateRegistration(name, email, password);
});

els.logoutBtn.addEventListener("click", () => {
  logoutUser();
});

async function saveComparisonSelection() {
  state.compareBaseMonth = els.compareBaseMonth.value;
  state.compareTargetMonth = els.compareTargetMonth.value;
  try {
    await saveState(true);
    render();
  } catch (error) {
    reportError(error);
  }
}

els.compareBaseMonth.addEventListener("change", saveComparisonSelection);
els.compareTargetMonth.addEventListener("change", saveComparisonSelection);
els.typeInput.addEventListener("change", renderCategoryDropdown);
els.transactionCategoryFilter?.addEventListener("input", renderTransactions);

els.transactionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const category = els.categoryInput.value.trim();

  if (!category) {
    alert("Category is required.");
    els.categoryInput.focus();
    return;
  }

  const date = els.dateInput.value || defaultDateForSelectedMonth();
  const txMonth = monthFromDate(date);
  const txType = els.typeInput.value;

  const transaction = {
    id: editingTransactionId || crypto.randomUUID(),
    type: txType,
    category,
    amount: Number(els.amountInput.value),
    date: date,
    note: els.noteInput.value.trim()
  };

  // Automatically add custom category to expected budget if not present
  const plan = getPlanForMonth(txMonth);
  if (txType === "expense") {
    const existing = plan.budgets.find(b => b.name.toLowerCase() === category.toLowerCase());
    if (!existing) {
      plan.budgets.push({
        id: crypto.randomUUID(),
        name: category,
        amount: transaction.amount
      });
    }
  } else if (txType === "income") {
    const existing = plan.incomes.find(i => i.description.toLowerCase() === category.toLowerCase());
    if (!existing) {
      plan.incomes.push({
        id: crypto.randomUUID(),
        description: category,
        amount: transaction.amount
      });
    }
  }

  if (editingTransactionId) {
    const existingIndex = state.transactions.findIndex((item) => item.id == editingTransactionId);
    const previousTransaction = existingIndex >= 0
      ? { ...state.transactions[existingIndex] }
      : null;
    if (existingIndex >= 0) {
      state.transactions[existingIndex] = transaction;
    } else {
      state.transactions.push(transaction);
    }
    try {
      await updateTransactionOnServer(previousTransaction, transaction);
    } catch (error) {
      if (existingIndex >= 0 && previousTransaction) {
        state.transactions[existingIndex] = previousTransaction;
      }
      reportError(error);
      return;
    }
  } else {
    state.transactions.push(transaction);
    try {
      await createTransactionOnServer(transaction);
    } catch (error) {
      state.transactions = state.transactions.filter((item) => item.id != transaction.id);
      reportError(error);
      return;
    }
  }

  rememberValue(
    transaction.type === "income" ? "savedIncomeDescriptions" : "savedBudgetNames",
    transaction.category
  );
  state.selectedMonth = monthFromDate(transaction.date);
  els.transactionForm.reset();
  els.monthSelect.value = state.selectedMonth;
  els.dateInput.value = defaultDateForSelectedMonth();
  try {
    await saveState(true);
    resetTransactionEdit();
    render();
  } catch (error) {
    reportError(error);
  }
});

els.transactionTable.addEventListener("click", async (event) => {
  const editButton = event.target.closest("button[data-transaction-id]");
  if (editButton) {
    startTransactionEdit(editButton.getAttribute("data-transaction-id"));
    return;
  }

  const deleteButton = event.target.closest("button[data-id]");
  if (!deleteButton) return;

  if (!(await confirmTransactionDelete())) {
    return;
  }

  const transactionId = deleteButton.getAttribute("data-id");
  const prevState = JSON.parse(JSON.stringify(state));
  const transaction = state.transactions.find((item) => item.id == transactionId);
  state.transactions = state.transactions.filter((item) => item.id != transactionId);
  clearMoneyIfMonthIsEmpty();

  try {
    if (transaction) {
      await deleteTransactionFromServer(transaction);
    }
    await saveState(true);
    render();
  } catch (error) {
    state = prevState;
    try {
      render();
    } catch (renderError) {
      console.error(renderError);
    }
    reportError(error);
  }
});

els.transactionCancelBtn.addEventListener("click", () => {
  resetTransactionEdit();
});

els.clearMonthBtn.addEventListener("click", async () => {
  if (!confirm("Clear all transactions for the selected month?")) return;
  state.transactions = state.transactions.filter((item) => monthFromDate(item.date) !== state.selectedMonth);
  clearMoneyIfMonthIsEmpty();
  try {
    await saveState();
    render();
  } catch (error) {
    reportError(error);
  }
});

els.goalForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  state.goals.push({
    id: crypto.randomUUID(),
    name: els.goalNameInput.value.trim(),
    target: Number(els.goalTargetInput.value),
    saved: Number(els.goalSavedInput.value)
  });
  els.goalForm.reset();
  try {
    await saveState(true);
    render();
  } catch (error) {
    reportError(error);
  }
});

els.goalsList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-id]");
  if (!button) return;
  state.goals = state.goals.filter((goal) => goal.id != button.getAttribute("data-id"));
  try {
    await saveState(true);
    render();
  } catch (error) {
    reportError(error);
  }
});

els.exportBtn.addEventListener("click", () => {
  const blob = new Blob([buildExcelWorkbook()], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `budget-monitor-${state.selectedMonth}.xls`;
  a.click();
  URL.revokeObjectURL(url);
});

els.importInput.addEventListener("change", async () => {
  const file = els.importInput.files[0];
  if (!file) return;
  try {
    state = parseImportedWorkbook(await file.text());
    normalizeState();
    await saveState();
    render();
  } catch (error) {
    alert("That Excel file could not be imported. Please choose a .xls file exported from this app.");
    console.error(error);
  } finally {
    els.importInput.value = "";
  }
});

els.resetSampleBtn.addEventListener("click", async () => {
  state = getSampleState();
  try {
    await saveState();
    render();
  } catch (error) {
    reportError(error);
  }
});
// === EMI PLANNER EVENT LISTENERS ===
if (els.addEmiScrollBtn) {
  els.addEmiScrollBtn.addEventListener("click", () => {
    if (els.emiPlannerForm) {
      els.emiPlannerForm.reset();
      els.emiEditingId.value = "";
      els.emiSaveBtn.textContent = "Save EMI Plan";
      els.emiCancelBtn.style.display = "none";
      els.emiNameInput.focus();
      els.emiPlannerForm.scrollIntoView({ behavior: 'smooth' });
    }
  });
}

if (els.emiPlannerForm) {
  els.emiPlannerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    
    const id = els.emiEditingId.value;
    const name = els.emiNameInput.value.trim();
    const loanAmount = Number(els.emiLoanAmountInput.value) || 0;
    const emiAmount = Number(els.emiAmountInput.value) || 0;
    const startDate = els.emiStartDateInput.value;
    const dueDayVal = els.emiDueDayInput.value.trim();
    const dueDay = Number(dueDayVal);
    if (!dueDayVal || isNaN(dueDay) || dueDay < 1 || dueDay > 31 || !Number.isInteger(dueDay)) {
      alert("Due day must be an integer between 1 and 31.");
      els.emiDueDayInput.focus();
      return;
    }
    const totalMonths = Number(els.emiTotalMonthsInput.value) || 0;
    const notes = els.emiNotesInput.value.trim();
    
    if (id) {
      const emi = state.emis.find(e => e.id === id);
      if (emi) {
        emi.name = name;
        emi.loanAmount = loanAmount;
        emi.emiAmount = emiAmount;
        emi.startDate = startDate;
        emi.dueDay = dueDay;
        emi.totalMonths = totalMonths;
        emi.notes = notes;
      }
    } else {
      const newId = crypto.randomUUID();
      state.emis.push({
        id: newId,
        name,
        loanAmount,
        emiAmount,
        startDate,
        dueDay,
        totalMonths,
        notes,
        status: "active",
        paidMonths: {}
      });
      state.selectedEmiId = newId;
    }
    
    els.emiPlannerForm.reset();
    els.emiEditingId.value = "";
    els.emiSaveBtn.textContent = "Save EMI Plan";
    els.emiCancelBtn.style.display = "none";
    
    try {
      await saveState();
      render();
    } catch (error) {
      reportError(error);
    }
  });
}

if (els.emiCancelBtn) {
  els.emiCancelBtn.addEventListener("click", () => {
    els.emiPlannerForm.reset();
    els.emiEditingId.value = "";
    els.emiSaveBtn.textContent = "Save EMI Plan";
    els.emiCancelBtn.style.display = "none";
  });
}

if (els.emiConfirmForm) {
  els.emiConfirmForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    
    const emiId = els.emiConfirmForm.dataset.emiId;
    const monthStr = els.emiConfirmForm.dataset.monthStr;
    const dueDate = els.emiConfirmForm.dataset.dueDate;
    const amount = Number(els.emiConfirmForm.dataset.amount) || 0;
    
    const paymentDate = els.emiConfirmDateInput.value;
    const paymentMode = els.emiConfirmModeSelect.value;
    const notes = els.emiConfirmNotesInput.value.trim();
    
    const emi = state.emis.find(e => e.id === emiId);
    if (!emi) return;
    
    emi.paidMonths[monthStr] = paymentDate;
    
    if (Object.keys(emi.paidMonths).length === emi.totalMonths) {
      emi.status = "closed";
    }
    
    const txId = crypto.randomUUID();
    state.transactions.push({
      id: txId,
      type: "expense",
      category: `EMI - ${emi.name}`,
      amount: amount,
      date: paymentDate,
      note: notes || `${emi.name} EMI Paid`
    });
    
    if (els.emiConfirmPaymentPanel) {
      els.emiConfirmPaymentPanel.style.display = "none";
    }
    
    if (els.emiAutoTransactionPanel && els.emiAutoTransactionTableBody) {
      els.emiAutoTransactionTableBody.innerHTML = `
        <tr>
          <td>${formatDateWithSpace(paymentDate)}</td>
          <td><span class="emi-badge pending" style="background-color: #fce8e6; color: #c5221f;">Expense</span></td>
          <td><strong>EMI - ${escapeHtml(emi.name)}</strong></td>
          <td>${escapeHtml(notes || `${emi.name} EMI Paid`)}</td>
          <td>${currency.format(amount)}</td>
          <td>${escapeHtml(paymentMode)}</td>
        </tr>
      `;
      els.emiAutoTransactionPanel.style.display = "block";
      els.emiAutoTransactionPanel.scrollIntoView({ behavior: 'smooth' });
    }
    
    try {
      await saveState();
      render();
    } catch (error) {
      reportError(error);
    }
  });
}

if (els.emiConfirmCancelBtn) {
  els.emiConfirmCancelBtn.addEventListener("click", () => {
    if (els.emiConfirmPaymentPanel) {
      els.emiConfirmPaymentPanel.style.display = "none";
    }
  });
}

window.addEventListener("resize", () => requestAnimationFrame(render));

// === INVESTMENT TRACKER FUNCTIONS & CALCULATIONS ===
function calculateEstimatedMaturity(inv) {
  const isRecurring = inv.investmentStyle === "monthly-recurring";
  
  if (isRecurring) {
    if (!inv.expectedReturnPercent || !inv.monthlyAmount) {
      const months = inv.expectedDurationUnit === "Years" ? (inv.expectedDuration || 0) * 12 : (inv.expectedDuration || 0);
      return (inv.monthlyAmount || 0) * months;
    }
    const P = inv.monthlyAmount;
    const r = inv.expectedReturnPercent / 100;
    const months = inv.expectedDurationUnit === "Years" ? (inv.expectedDuration || 0) * 12 : (inv.expectedDuration || 0);
    
    // Compounding monthly
    let total = 0;
    for (let i = 1; i <= months; i++) {
      total += P * Math.pow(1 + r / 12, i);
    }
    return total;
  } else {
    if (!inv.interestPercent) {
      return inv.currentValue;
    }
    
    const startDate = new Date(inv.investmentDate);
    const endDate = new Date(inv.maturityDate);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return inv.currentValue;
    }
    
    const diffYears = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (diffYears <= 0) return inv.currentValue;
    
    const r = inv.interestPercent / 100;
    let n = 1;
    if (inv.interestPeriod === "Monthly") n = 12;
    else if (inv.interestPeriod === "Quarterly") n = 4;
    else if (inv.interestPeriod === "Half-Yearly") n = 2;
    
    if (inv.sipAmount && inv.sipAmount > 0) {
      // RD compounding
      const months = Math.round(diffYears * 12);
      let total = 0;
      for (let i = 0; i < months; i++) {
        const t = (months - i) / 12;
        total += inv.sipAmount * Math.pow(1 + r/n, n * t);
      }
      return total;
    } else {
      // Lump sum compounding
      return inv.investedAmount * Math.pow(1 + r/n, n * diffYears);
    }
  }
}

function calculateMonthlyInvestmentValue(inv) {
  if (!inv.paidMonths || Object.keys(inv.paidMonths).length === 0) {
    return 0;
  }
  
  const today = new Date();
  const P = inv.monthlyAmount || 0;
  const r = (inv.expectedReturnPercent || 0) / 100;
  
  let totalVal = 0;
  
  Object.keys(inv.paidMonths).forEach(monthStr => {
    const payDateStr = inv.paidMonths[monthStr];
    const payDate = new Date(payDateStr);
    
    if (isNaN(payDate.getTime())) {
      totalVal += P;
      return;
    }
    
    const diffTime = today.getTime() - payDate.getTime();
    let years = diffTime / (1000 * 60 * 60 * 24 * 365.25);
    if (years < 0) years = 0;
    
    if (r > 0) {
      // Compounded monthly
      totalVal += P * Math.pow(1 + r / 12, 12 * years);
    } else {
      totalVal += P;
    }
  });
  
  return totalVal;
}

function getNextDueDateForRecurring(inv) {
  if (inv.status === "Closed") return "-";
  
  const startDateStr = inv.startDate || inv.investmentDate;
  const dueDay = parseInt(startDateStr.split("-")[2], 10) || 1;
  const months = inv.expectedDurationUnit === "Years" ? (inv.expectedDuration || 0) * 12 : (inv.expectedDuration || 0);
  
  for (let i = 0; i < months; i++) {
    const dueDate = getDueDateForMonthIndex(startDateStr, dueDay, i);
    const monthStr = dueDate.slice(0, 7);
    if (!inv.paidMonths || !inv.paidMonths[monthStr]) {
      return dueDate;
    }
  }
  return "-";
}

function renderInvestmentTracker() {
  if (!state || !state.investments) return;
  
  const today = new Date();
  let totalInvested = 0;
  let totalCurrent = 0;
  let weightedCagrSum = 0;
  let totalWeight = 0;
  
  const activeInvestments = state.investments.filter(inv => inv.status === 'Active');
  
  activeInvestments.forEach(inv => {
    const isRecurring = inv.investmentStyle === "monthly-recurring";
    
    let investedAmt = 0;
    let currentVal = 0;
    
    if (isRecurring) {
      const paidCount = Object.keys(inv.paidMonths || {}).length;
      investedAmt = paidCount * (inv.monthlyAmount || 0);
      currentVal = calculateMonthlyInvestmentValue(inv);
      
      // Update object values dynamically for charts/lists
      inv.investedAmount = investedAmt;
      inv.currentValue = currentVal;
    } else {
      investedAmt = inv.investedAmount || 0;
      currentVal = inv.currentValue || 0;
    }
    
    totalInvested += investedAmt;
    totalCurrent += currentVal;
    
    // Calculate holding period in years for CAGR
    const invDate = new Date(inv.investmentDate);
    let diffTime = today.getTime() - invDate.getTime();
    let years = diffTime / (1000 * 60 * 60 * 24 * 365.25);
    if (years < 0) years = 0;
    
    let cagr = 0;
    if (investedAmt > 0) {
      const ratio = currentVal / investedAmt;
      if (ratio > 0) {
        if (years >= 0.5) {
          cagr = Math.pow(ratio, 1 / years) - 1;
        } else if (years > 0) {
          cagr = (ratio - 1) / years;
        } else {
          cagr = ratio - 1;
        }
      }
    }
    weightedCagrSum += cagr * investedAmt;
    totalWeight += investedAmt;
  });
  
  const portfolioCagr = totalWeight > 0 ? (weightedCagrSum / totalWeight) * 100 : 0;
  
  const upcomingMaturityCount = activeInvestments.filter(inv => {
    let maturityDateStr = inv.maturityDate;
    if (inv.investmentStyle === "monthly-recurring") {
      const startDateStr = inv.startDate || inv.investmentDate;
      const dueDay = parseInt(startDateStr.split("-")[2], 10) || 1;
      const months = inv.expectedDurationUnit === "Years" ? (inv.expectedDuration || 0) * 12 : (inv.expectedDuration || 0);
      maturityDateStr = getDueDateForMonthIndex(startDateStr, dueDay, months - 1);
    }
    if (!maturityDateStr) return false;
    const matDate = new Date(maturityDateStr);
    return !isNaN(matDate.getTime()) && matDate >= today;
  }).length;
  
  const totalProfit = totalCurrent - totalInvested;
  const profitPct = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;
  
  const invTotalInvestmentEl = document.querySelector("#invTotalInvestment");
  if (invTotalInvestmentEl) invTotalInvestmentEl.textContent = currency.format(totalInvested);
  
  const invCurrentValueEl = document.querySelector("#invCurrentValue");
  if (invCurrentValueEl) invCurrentValueEl.textContent = currency.format(totalCurrent);
  
  const invTotalProfitEl = document.querySelector("#invTotalProfit");
  if (invTotalProfitEl) {
    const profitSign = totalProfit >= 0 ? "+" : "";
    const profitColor = totalProfit >= 0 ? "var(--green)" : "var(--red)";
    invTotalProfitEl.style.color = profitColor;
    invTotalProfitEl.innerHTML = `${currency.format(totalProfit)} <span class="profit-badge" style="background-color: ${totalProfit >= 0 ? '#e6f4ea' : '#fce8e6'}; color: ${profitColor}; padding: 2px 6px; border-radius: 4px; font-size: 12px; font-weight: 600; margin-left: 6px;">${profitSign}${profitPct.toFixed(1)}%</span>`;
  }
  
  const invAnnualReturnEl = document.querySelector("#invAnnualReturn");
  if (invAnnualReturnEl) invAnnualReturnEl.textContent = `${portfolioCagr.toFixed(1)}%`;
  
  const invUpcomingMaturityEl = document.querySelector("#invUpcomingMaturity");
  if (invUpcomingMaturityEl) invUpcomingMaturityEl.textContent = upcomingMaturityCount;
  
  // Donut Charts (Portfolio Allocation & Category Breakdown)
  const typeMap = {};
  activeInvestments.forEach(inv => {
    typeMap[inv.type] = (typeMap[inv.type] || 0) + inv.currentValue;
  });
  
  const sortedTypes = Object.keys(typeMap)
    .map(type => ({ type, value: typeMap[type] }))
    .sort((a, b) => b.value - a.value);
    
  const totalValue = sortedTypes.reduce((sum, item) => sum + item.value, 0);
  
  const typeColors = {
    "RD": "#4b6f9e",
    "Mutual Fund": "#2f7d57",
    "Stocks": "#247e83",
    "FD": "#b77b20",
    "Gold": "#a142f4",
    "Crypto": "#b55343",
    "PPF": "#e06666",
    "Insurance - LIC": "#8e7cc3",
    "SIP": "#f4cccc"
  };
  const getFallbackColor = (idx) => {
    const list = ["#2f7d57", "#247e83", "#b77b20", "#4b6f9e", "#a142f4", "#b55343", "#e06666", "#888888"];
    return list[idx % list.length];
  };

  let circlesHtml = `<circle cx="18" cy="18" r="15.915" fill="none" stroke="#e8eee9" stroke-width="4"></circle>`;
  let cumulativePercent = 0;
  
  const legendItems = [];
  const breakdownRows = [];
  
  sortedTypes.forEach((item, idx) => {
    const color = typeColors[item.type] || getFallbackColor(idx);
    const pct = totalValue > 0 ? (item.value / totalValue) * 100 : 0;
    
    if (pct > 0) {
      const offset = (100 - cumulativePercent + 25) % 100;
      circlesHtml += `<circle cx="18" cy="18" r="15.915" fill="none" stroke="${color}" stroke-width="4" stroke-dasharray="${pct.toFixed(2)} ${(100 - pct).toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"></circle>`;
      cumulativePercent += pct;
    }
    
    const formattedVal = currency.format(item.value);
    const formattedPct = `${pct.toFixed(0)}%`;
    
    legendItems.push(`
      <div class="legend-item">
        <span class="legend-color-dot" style="background: ${color};"></span>
        ${escapeHtml(item.type)} (${formattedPct})
      </div>
    `);
    
    breakdownRows.push(`
      <div class="breakdown-row">
        <div>
          <span class="legend-color-dot" style="background: ${color};"></span>
          <span class="cat-name">${escapeHtml(item.type)}</span>
        </div>
        <span class="cat-amount">${formattedVal}</span>
        <span class="cat-pct">(${formattedPct})</span>
      </div>
    `);
  });
  
  // Populate analytics donut (Portfolio Allocation & Category Breakdown panel)
  const dbDonutSvg = document.querySelector(".investment-category-panel .donut-svg");
  if (dbDonutSvg) dbDonutSvg.innerHTML = circlesHtml;
  
  const catTotalValueEl = document.querySelector("#catTotalValue");
  if (catTotalValueEl) catTotalValueEl.textContent = currency.format(totalValue);
  
  const catBreakdownList = document.querySelector(".category-breakdown-list");
  if (catBreakdownList) {
    catBreakdownList.innerHTML = breakdownRows.length > 0 
      ? breakdownRows.join("") 
      : `<div class="breakdown-row" style="justify-content: center;">No active investments.</div>`;
  }

  // Populate TOP dashboard allocation donut (#allocationDonutSvg)
  const topDonutSvg = document.querySelector("#allocationDonutSvg");
  if (topDonutSvg) topDonutSvg.innerHTML = circlesHtml;

  const topDonutVal = document.querySelector("#allocationDonutVal");
  if (topDonutVal) {
    const valInLakhs = totalValue >= 100000 ? (totalValue / 100000).toFixed(1) + "L" : currency.format(totalValue);
    topDonutVal.textContent = "\u20B9" + valInLakhs;
  }

  const topLegend = document.querySelector("#allocationLegend");
  if (topLegend) {
    topLegend.innerHTML = legendItems.length > 0
      ? legendItems.join("")
      : `<div class="legend-item" style="color: var(--muted);">No data</div>`;
  }

  // Populate mini metric cards below the growth chart
  const setMini = (id, val) => { const el = document.querySelector(`#${id}`); if (el) el.textContent = val; };
  setMini("gmmTotalInvestment", currency.format(totalInvested));
  setMini("gmmCurrentValue", currency.format(totalCurrent));
  const gmmProfit = document.querySelector("#gmmTotalProfit");
  if (gmmProfit) {
    gmmProfit.textContent = currency.format(totalProfit);
    gmmProfit.style.color = totalProfit >= 0 ? "var(--green)" : "var(--red)";
  }
  setMini("gmmAnnualReturn", `${portfolioCagr.toFixed(1)}%`);
  setMini("gmmUpcomingMaturity", upcomingMaturityCount);

  // Growth Line Chart
  const growthRangeSelect = document.querySelector("#invGrowthRange");
  const range = growthRangeSelect ? growthRangeSelect.value : "year";
  
  const monthsToPlot = [];
  const current = new Date();
  
  if (range === "year") {
    const year = current.getFullYear();
    for (let m = 0; m < 12; m++) {
      monthsToPlot.push(new Date(year, m + 1, 0));
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(current.getFullYear(), current.getMonth() - i + 1, 0);
      monthsToPlot.push(d);
    }
  }
  
  const monthlyValues = monthsToPlot.map(date => {
    let monthValue = 0;
    activeInvestments.forEach(inv => {
      const isRecurring = inv.investmentStyle === "monthly-recurring";
      const startDate = new Date(isRecurring ? (inv.startDate || inv.investmentDate) : inv.investmentDate);
      if (startDate > date) return;
      
      let maturityDateStr = inv.maturityDate;
      if (isRecurring) {
        const startStr = inv.startDate || inv.investmentDate;
        const dueDay = parseInt(startStr.split("-")[2], 10) || 1;
        const totalM = inv.expectedDurationUnit === "Years" ? (inv.expectedDuration || 0) * 12 : (inv.expectedDuration || 0);
        maturityDateStr = getDueDateForMonthIndex(startStr, dueDay, totalM - 1);
      }
      
      const maturityDate = maturityDateStr ? new Date(maturityDateStr) : null;
      if (maturityDate && maturityDate < date && inv.status === "Closed") return;
      
      const startMs = startDate.getTime();
      const endMs = today.getTime();
      const targetMs = date.getTime();
      
      if (isRecurring) {
        // Calculate based on recurring payments due before target date
        const P = inv.monthlyAmount || 0;
        const r = (inv.expectedReturnPercent || 0) / 100;
        const startStr = inv.startDate || inv.investmentDate;
        const dueDay = parseInt(startStr.split("-")[2], 10) || 1;
        const totalM = inv.expectedDurationUnit === "Years" ? (inv.expectedDuration || 0) * 12 : (inv.expectedDuration || 0);
        
        let invVal = 0;
        for (let i = 0; i < totalM; i++) {
          const installmentDueDateStr = getDueDateForMonthIndex(startStr, dueDay, i);
          const installmentDueDate = new Date(installmentDueDateStr);
          if (installmentDueDate > date) break;
          
          // Check if it was paid
          const monthStr = installmentDueDateStr.slice(0, 7);
          const wasPaid = inv.paidMonths && inv.paidMonths[monthStr];
          
          if (wasPaid) {
            const payDate = new Date(inv.paidMonths[monthStr]);
            const elapsed = date.getTime() - payDate.getTime();
            let years = elapsed / (1000 * 60 * 60 * 24 * 365.25);
            if (years < 0) years = 0;
            
            if (r > 0) {
              invVal += P * Math.pow(1 + r / 12, 12 * years);
            } else {
              invVal += P;
            }
          }
        }
        monthValue += invVal;
      } else {
        if (targetMs >= endMs) {
          monthValue += inv.currentValue;
        } else {
          const totalDuration = endMs - startMs;
          if (totalDuration <= 0) {
            monthValue += inv.currentValue;
          } else {
            const elapsed = targetMs - startMs;
            const fraction = elapsed / totalDuration;
            const val = inv.investedAmount + fraction * (inv.currentValue - inv.investedAmount);
            monthValue += val;
          }
        }
      }
    });
    return monthValue;
  });
  
  const minVal = Math.min(...monthlyValues);
  const maxVal = Math.max(...monthlyValues);
  
  const width = 300;
  const height = 120;
  const paddingX = 15;
  const paddingY = 15;
  
  const points = [];
  const M = monthsToPlot.length;
  
  monthlyValues.forEach((val, idx) => {
    const x = paddingX + (idx / (M - 1)) * (width - 2 * paddingX);
    let y = height / 2;
    if (maxVal > minVal) {
      y = (height - paddingY) - ((val - minVal) / (maxVal - minVal)) * (height - 2 * paddingY);
    } else if (minVal > 0) {
      y = height - paddingY - 30;
    }
    points.push({ x, y, val });
  });
  
  const svgWrapper = document.querySelector(".growth-chart-panel .line-chart-wrapper");
  if (svgWrapper) {
    let gridLines = `
      <line x1="${paddingX}" y1="15" x2="${width - paddingX}" y2="15" stroke="#f0f0f0" stroke-width="0.5" />
      <line x1="${paddingX}" y1="48.3" x2="${width - paddingX}" y2="48.3" stroke="#f0f0f0" stroke-width="0.5" />
      <line x1="${paddingX}" y1="81.6" x2="${width - paddingX}" y2="81.6" stroke="#f0f0f0" stroke-width="0.5" />
      <line x1="${paddingX}" y1="115" x2="${width - paddingX}" y2="115" stroke="#f0f0f0" stroke-width="0.5" />
    `;
    
    let pathD = "";
    let circles = "";
    points.forEach((pt, idx) => {
      if (idx === 0) {
        pathD += `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
      } else {
        pathD += ` L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
      }
      circles += `<circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="3" fill="var(--green)"><title>${currency.format(pt.val)}</title></circle>`;
    });
    
    const pathHtml = pathD ? `<path d="${pathD}" fill="none" stroke="var(--green)" stroke-width="2" />` : "";
    
    const labelItems = monthsToPlot.map((date, idx) => {
      const showLabel = M <= 6 || idx % 2 === 0 || idx === M - 1;
      const labelText = date.toLocaleDateString("en-US", { month: "short" });
      return `<span style="visibility: ${showLabel ? 'visible' : 'hidden'};">${labelText}</span>`;
    });
    
    svgWrapper.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" class="growth-line-svg">
        ${gridLines}
        ${pathHtml}
        ${circles}
      </svg>
      <div class="x-axis-labels" style="display: flex; justify-content: space-between; padding: 4px ${paddingX}px 0; font-size: 9px; color: #888;">
        ${labelItems.join("")}
      </div>
    `;
  }
  
  if (growthRangeSelect && !growthRangeSelect.dataset.listenerAdded) {
    growthRangeSelect.addEventListener("change", () => {
      renderInvestmentTracker();
    });
    growthRangeSelect.dataset.listenerAdded = "true";
  }

  // Investment List Table Filter handling
  const activeFilterTab = document.querySelector(".filter-tab.active");
  const filter = activeFilterTab ? activeFilterTab.dataset.filter : "all";
  
  const filteredInvestments = state.investments.filter(inv => {
    if (filter === "one-time") return inv.investmentStyle !== "monthly-recurring";
    if (filter === "recurring") return inv.investmentStyle === "monthly-recurring";
    if (filter === "sip") {
      return (inv.investmentStyle === "monthly-recurring" && (inv.type === "SIP" || inv.type === "Mutual Fund" || inv.name.toLowerCase().includes("sip"))) ||
             (inv.investmentStyle === "one-time" && inv.sipAmount && inv.sipAmount > 0);
    }
    return true; // "all"
  });

  // Investment List Table
  const listBody = document.querySelector("#investmentListBody");
  if (listBody) {
    listBody.innerHTML = "";
    if (filteredInvestments.length === 0) {
      listBody.innerHTML = `<tr><td colspan="9" style="text-align: center;">No investments found matching filter.</td></tr>`;
    } else {
      filteredInvestments.forEach(inv => {
        const isRecurring = inv.investmentStyle === "monthly-recurring";
        
        let profit = 0;
        let profitPct = 0;
        let totalInvestedVal = 0;
        let totalPaidVal = 0;
        let remainingVal = 0;
        let nextDueDateStr = "-";
        
        if (isRecurring) {
          const paidCount = Object.keys(inv.paidMonths || {}).length;
          totalPaidVal = paidCount * (inv.monthlyAmount || 0);
          totalInvestedVal = inv.totalInvestment || (inv.monthlyAmount * (inv.expectedDurationUnit === "Years" ? inv.expectedDuration * 12 : inv.expectedDuration)) || 0;
          remainingVal = Math.max(0, totalInvestedVal - totalPaidVal);
          
          profit = (inv.currentValue || 0) - totalPaidVal;
          profitPct = totalPaidVal > 0 ? (profit / totalPaidVal) * 100 : 0;
          nextDueDateStr = getNextDueDateForRecurring(inv);
        } else {
          totalInvestedVal = inv.investedAmount || 0;
          totalPaidVal = totalInvestedVal;
          remainingVal = 0;
          profit = (inv.currentValue || 0) - totalInvestedVal;
          profitPct = totalInvestedVal > 0 ? (profit / totalInvestedVal) * 100 : 0;
        }
        
        const sign = profit >= 0 ? "+" : "";
        const color = profit >= 0 ? "var(--green)" : "var(--red)";
        
        const tr = document.createElement("tr");
        tr.style.cursor = "pointer";
        if (state.selectedInvestmentId === inv.id) {
          tr.style.backgroundColor = "rgba(47, 125, 87, 0.08)";
        }
        
        tr.innerHTML = `
          <td><strong>${escapeHtml(inv.name)}</strong></td>
          <td>${escapeHtml(inv.type)}</td>
          <td>${isRecurring ? currency.format(inv.monthlyAmount) : "-"}</td>
          <td>${currency.format(totalInvestedVal)}</td>
          <td>${currency.format(totalPaidVal)}</td>
          <td>${isRecurring ? currency.format(remainingVal) : "-"}</td>
          <td>${isRecurring && nextDueDateStr !== "-" ? formatDateWithSpace(nextDueDateStr) : "-"}</td>
          <td><span class="emi-badge ${inv.status.toLowerCase()}">${escapeHtml(inv.status)}</span></td>
          <td>
            <button class="icon-action-btn view" data-id="${inv.id}" type="button" title="View details">👁️</button>
            <button class="icon-action-btn edit" data-id="${inv.id}" type="button" title="Edit">✏️</button>
            <button class="icon-action-btn delete" data-id="${inv.id}" type="button" title="Delete">🗑️</button>
            ${inv.status === "Active" ? `<button class="icon-action-btn close-btn" data-id="${inv.id}" type="button" title="Mark as Closed/Matured">🔒</button>` : ""}
          </td>
        `;
        
        // Clicking row selects it (useful for rendering summary and payment schedule)
        tr.addEventListener("click", (e) => {
          if (e.target.closest("button")) return; // ignore actions click
          state.selectedInvestmentId = inv.id;
          renderInvestmentTracker();
        });
        
        listBody.appendChild(tr);
      });
    }
  }

  // Handle selected investment views (Schedule Preview & Summary Widget)
  const selectedInv = state.investments.find(item => item.id === state.selectedInvestmentId);
  const paymentSummaryWidget = document.querySelector("#paymentSummaryWidget");
  const scheduleTableContainer = document.querySelector("#scheduleTableContainer");
  const scheduleIntroMsg = document.querySelector("#scheduleIntroMsg");
  const schedulePanelTitle = document.querySelector("#schedulePanelTitle");
  
  if (selectedInv && selectedInv.investmentStyle === "monthly-recurring") {
    // Show sections
    if (paymentSummaryWidget) paymentSummaryWidget.style.display = "block";
    if (scheduleTableContainer) scheduleTableContainer.style.display = "block";
    if (scheduleIntroMsg) scheduleIntroMsg.style.display = "none";
    
    // Titles
    if (schedulePanelTitle) schedulePanelTitle.textContent = `3. Schedule: ${selectedInv.name}`;
    const paymentSummaryTitle = document.querySelector("#paymentSummaryTitle");
    if (paymentSummaryTitle) paymentSummaryTitle.textContent = `5. Payment Summary (${selectedInv.name})`;
    
    // Render Schedule preview actual list
    const schedulePreviewBody = document.querySelector("#schedulePreviewBody");
    if (schedulePreviewBody) {
      schedulePreviewBody.innerHTML = "";
      
      const startDateStr = selectedInv.startDate || selectedInv.investmentDate;
      const dueDay = parseInt(startDateStr.split("-")[2], 10) || 1;
      const totalM = selectedInv.expectedDurationUnit === "Years" ? (selectedInv.expectedDuration || 0) * 12 : (selectedInv.expectedDuration || 0);
      
      for (let i = 0; i < totalM; i++) {
        const dueDate = getDueDateForMonthIndex(startDateStr, dueDay, i);
        const monthStr = dueDate.slice(0, 7);
        const paidDate = selectedInv.paidMonths ? selectedInv.paidMonths[monthStr] : null;
        const isPaid = !!paidDate;
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${i + 1}</td>
          <td>${formatDateWithSpace(dueDate)}</td>
          <td>${currency.format(selectedInv.monthlyAmount)}</td>
          <td><span class="emi-badge ${isPaid ? 'paid' : 'pending'}">${isPaid ? 'Paid' : 'Pending'}</span></td>
          <td>
            ${isPaid 
              ? `<button class="ghost-button btn-view-payment" data-date="${paidDate}" data-amount="${selectedInv.monthlyAmount}" type="button" style="margin: 0; min-height: 28px; font-size: 11px;">View</button>`
              : selectedInv.status === "Active"
                ? `<button class="primary-button btn-mark-paid" data-month="${monthStr}" data-duedate="${dueDate}" type="button" style="margin: 0; min-height: 28px; background: var(--green); font-size: 11px; padding: 0 8px;">Mark Paid</button>`
                : "-"
            }
          </td>
        `;
        schedulePreviewBody.appendChild(tr);
      }
      
      // Schedule Actions
      schedulePreviewBody.onclick = async (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        
        if (btn.classList.contains("btn-mark-paid")) {
          const monthStr = btn.dataset.month;
          const dueDate = btn.dataset.duedate;
          
          if (confirm(`Mark installment due on ${formatDateWithSpace(dueDate)} as paid?`)) {
            const payDate = today.toISOString().split("T")[0]; // YYYY-MM-DD
            
            selectedInv.paidMonths = selectedInv.paidMonths || {};
            selectedInv.paidMonths[monthStr] = payDate;
            
            // Re-calculate investment values
            const paidCount = Object.keys(selectedInv.paidMonths).length;
            selectedInv.investedAmount = paidCount * (selectedInv.monthlyAmount || 0);
            selectedInv.currentValue = calculateMonthlyInvestmentValue(selectedInv);
            
            // Auto close if complete
            const totalM = selectedInv.expectedDurationUnit === "Years" ? (selectedInv.expectedDuration || 0) * 12 : (selectedInv.expectedDuration || 0);
            if (paidCount >= totalM) {
              selectedInv.status = "Closed";
            }
            
            // Push general transaction
            state.transactions.push({
              id: crypto.randomUUID(),
              type: "expense",
              category: `Investment - ${selectedInv.type}`,
              amount: selectedInv.monthlyAmount,
              date: payDate,
              note: `Installment payment for ${selectedInv.name}`
            });
            
            try {
              await saveState(false);
              render();
            } catch (error) {
              reportError(error);
            }
          }
        } else if (btn.classList.contains("btn-view-payment")) {
          const payDate = btn.dataset.date;
          alert(`Installment paid on ${formatDateWithSpace(payDate)} for amount ${currency.format(btn.dataset.amount)}.`);
        }
      };
    }
    
    // Render Summary Widget metrics and donut
    const totalM = selectedInv.expectedDurationUnit === "Years" ? (selectedInv.expectedDuration || 0) * 12 : (selectedInv.expectedDuration || 0);
    const targetVal = selectedInv.totalInvestment || (selectedInv.monthlyAmount * totalM) || 0;
    const paidCount = Object.keys(selectedInv.paidMonths || {}).length;
    const totalPaidVal = paidCount * (selectedInv.monthlyAmount || 0);
    const remainingVal = Math.max(0, targetVal - totalPaidVal);
    
    const paidPct = targetVal > 0 ? (totalPaidVal / targetVal) * 100 : 0;
    const remPct = Math.max(0, 100 - paidPct);
    const nextDueStr = getNextDueDateForRecurring(selectedInv);
    
    const summaryPaidPercent = document.querySelector("#summaryPaidPercent");
    if (summaryPaidPercent) summaryPaidPercent.textContent = `${paidPct.toFixed(0)}%`;
    
    const summaryPaidAmt = document.querySelector("#summaryPaidAmt");
    if (summaryPaidAmt) summaryPaidAmt.textContent = `${currency.format(totalPaidVal)} (${paidPct.toFixed(0)}%)`;
    
    const summaryRemainingAmt = document.querySelector("#summaryRemainingAmt");
    if (summaryRemainingAmt) summaryRemainingAmt.textContent = `${currency.format(remainingVal)} (${remPct.toFixed(0)}%)`;
    
    const summaryTotalInvestment = document.querySelector("#summaryTotalInvestment");
    if (summaryTotalInvestment) summaryTotalInvestment.textContent = currency.format(targetVal);
    
    const summaryNextDueDate = document.querySelector("#summaryNextDueDate");
    if (summaryNextDueDate) summaryNextDueDate.textContent = nextDueStr !== "-" ? formatDateWithSpace(nextDueStr) : "-";
    
    const summaryInstallmentsCount = document.querySelector("#summaryInstallmentsCount");
    if (summaryInstallmentsCount) summaryInstallmentsCount.textContent = `${paidCount} of ${totalM}`;
    
    const summaryDonutSvg = document.querySelector("#summaryDonutSvg");
    if (summaryDonutSvg) {
      let donutCircles = `<circle cx="18" cy="18" r="15.915" fill="none" stroke="#e8eee9" stroke-width="4"></circle>`;
      if (paidPct > 0) {
        donutCircles += `<circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--green)" stroke-width="4" stroke-dasharray="${paidPct.toFixed(2)} ${(100 - paidPct).toFixed(2)}" stroke-dashoffset="25"></circle>`;
      }
      summaryDonutSvg.innerHTML = donutCircles;
    }
  } else {
    // Hide sections
    if (paymentSummaryWidget) paymentSummaryWidget.style.display = "none";
    if (scheduleTableContainer) scheduleTableContainer.style.display = "none";
    if (scheduleIntroMsg) scheduleIntroMsg.style.display = "flex";
  }

  // Maturity Table
  const maturityBody = document.querySelector("#maturityListBody");
  if (maturityBody) {
    maturityBody.innerHTML = "";
    
    const maturing = activeInvestments.filter(inv => {
      if (inv.investmentStyle === "monthly-recurring") {
        const startStr = inv.startDate || inv.investmentDate;
        const dueDay = parseInt(startStr.split("-")[2], 10) || 1;
        const totalM = inv.expectedDurationUnit === "Years" ? (inv.expectedDuration || 0) * 12 : (inv.expectedDuration || 0);
        inv.computedMaturityDate = getDueDateForMonthIndex(startStr, dueDay, totalM - 1);
        return true;
      }
      inv.computedMaturityDate = inv.maturityDate;
      return !!inv.maturityDate;
    });
    
    if (maturing.length === 0) {
      maturityBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">No upcoming maturities.</td></tr>`;
    } else {
      maturing.sort((a, b) => new Date(a.computedMaturityDate) - new Date(b.computedMaturityDate));
      
      maturing.forEach(inv => {
        const matDate = new Date(inv.computedMaturityDate);
        let daysLeft = Math.ceil((matDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysLeft < 0) daysLeft = 0;
        
        const maturityEst = calculateEstimatedMaturity(inv);
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>${escapeHtml(inv.name)}</strong></td>
          <td>${escapeHtml(inv.type)}</td>
          <td>${formatDateWithSpace(inv.computedMaturityDate)}</td>
          <td style="${daysLeft <= 90 ? 'color: var(--red); font-weight: 700;' : ''}">${daysLeft}</td>
          <td>${currency.format(maturityEst)}</td>
          <td><button class="edit-row edit" data-id="${inv.id}" style="margin: 0; min-height: 28px;" type="button">Edit</button></td>
        `;
        maturityBody.appendChild(tr);
      });
    }
  }

  // Monthly SIP Tracker Table
  const sipBody = document.querySelector("#sipTrackerListBody");
  if (sipBody) {
    sipBody.innerHTML = "";
    
    // Combine SIPs from one-time investments (sipAmount > 0) and monthly-recurring investments
    const sips = activeInvestments.filter(inv => 
      (inv.sipAmount && inv.sipAmount > 0) || inv.investmentStyle === "monthly-recurring"
    );
    
    if (sips.length === 0) {
      sipBody.innerHTML = `<tr><td colspan="5" style="text-align: center;">No active SIPs found.</td></tr>`;
    } else {
      sips.forEach(inv => {
        const isRec = inv.investmentStyle === "monthly-recurring";
        const amt = isRec ? inv.monthlyAmount : inv.sipAmount;
        let nextSipStr = "-";
        
        if (isRec) {
          nextSipStr = getNextDueDateForRecurring(inv);
        } else {
          const start = new Date(inv.investmentDate);
          const day = start.getDate();
          let nextSip = new Date(today.getFullYear(), today.getMonth(), day);
          if (nextSip < today) {
            nextSip = new Date(today.getFullYear(), today.getMonth() + 1, day);
          }
          nextSipStr = nextSip.toISOString().split("T")[0];
        }
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>${escapeHtml(inv.name)}</strong></td>
          <td>${currency.format(amt)}</td>
          <td>${nextSipStr !== "-" ? formatDateWithSpace(nextSipStr) : "-"}</td>
          <td>Monthly</td>
          <td><button class="edit-row edit" data-id="${inv.id}" style="margin: 0; min-height: 28px;" type="button">Edit</button></td>
        `;
        sipBody.appendChild(tr);
      });
    }
  }

  // Recent Transactions Table
  const recentTransactionsBody = document.querySelector("#recentInvTransactionsBody");
  if (recentTransactionsBody) {
    recentTransactionsBody.innerHTML = "";
    const invTransactions = state.transactions
      .filter(tx => tx.category && tx.category.toLowerCase().includes("investment"))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
      
    if (invTransactions.length === 0) {
      recentTransactionsBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">No investment transactions found.</td></tr>`;
    } else {
      const topTxs = invTransactions.slice(0, 5);
      topTxs.forEach(tx => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${formatDateWithSpace(tx.date)}</td>
          <td><strong>${escapeHtml(tx.category.replace("Investment - ", ""))}</strong></td>
          <td>Deposit</td>
          <td>${currency.format(tx.amount)}</td>
          <td>-</td>
          <td>${escapeHtml(tx.note || "")}</td>
        `;
        recentTransactionsBody.appendChild(tr);
      });
    }
  }

  // Budget Impact
  const total = totals();
  const totalSip = activeInvestments.reduce((sum, inv) => {
    if (inv.investmentStyle === "monthly-recurring") {
      return sum + (inv.monthlyAmount || 0);
    }
    return sum + (inv.sipAmount || 0);
  }, 0);
  
  const emiAmount = (state.emis || [])
    .filter(e => isEmiScheduledForMonth(e, state.selectedMonth))
    .reduce((sum, e) => sum + e.emiAmount, 0);
  const remainingBalance = total.income - total.expenses - emiAmount - totalSip;
  
  const impactContainer = document.querySelector("#invBudgetImpactList");
  if (impactContainer) {
    impactContainer.innerHTML = `
      <div class="emi-impact-row">
        <span>Monthly Income</span>
        <strong style="color: var(--green);">${currency.format(total.income)}</strong>
      </div>
      <div class="emi-impact-row">
        <span>Monthly Expenses</span>
        <strong style="color: var(--red);">${currency.format(total.expenses)}</strong>
      </div>
      <div class="emi-impact-row">
        <span>Monthly EMI</span>
        <strong style="color: var(--red);">${currency.format(emiAmount)}</strong>
      </div>
      <div class="emi-impact-row">
        <span>Monthly Investment Commitment</span>
        <strong style="color: var(--red);">${currency.format(totalSip)}</strong>
      </div>
      <div class="emi-impact-row" style="background: #f8faf7; padding: 10px 8px; border-radius: 4px; border-top: 2px solid var(--green);">
        <span>Remaining Balance</span>
        <strong style="color: ${remainingBalance >= 0 ? 'var(--green)' : 'var(--red)'}; font-size: 16px;">${currency.format(remainingBalance)}</strong>
      </div>
    `;
  }

  // Quick Summary Cards
  const quickSummaryGrid = document.querySelector("#invQuickSummaryGrid");
  if (quickSummaryGrid) {
    const activeCount = activeInvestments.length;
    const totalGain = totalCurrent - totalInvested;
    
    let bestPerformer = null;
    let bestReturn = -Infinity;
    activeInvestments.forEach(inv => {
      const invested = inv.investedAmount;
      if (invested > 0) {
        const ret = (inv.currentValue - invested) / invested;
        if (ret > bestReturn) {
          bestReturn = ret;
          bestPerformer = inv;
        }
      }
    });
    
    const bestPerformerText = bestPerformer ? bestPerformer.name : "-";
    const bestPerformerReturn = bestPerformer ? `${(bestReturn * 100).toFixed(1)}% Return` : "";
    
    quickSummaryGrid.innerHTML = `
      <div class="summary-card">
        <span class="card-icon">💼</span>
        <div class="card-details">
          <span>Active Investments</span>
          <strong>${activeCount}</strong>
          <small>All running investments</small>
        </div>
      </div>
      <div class="summary-card">
        <span class="card-icon">📈</span>
        <div class="card-details">
          <span>Total Monthly SIP</span>
          <strong>${currency.format(totalSip)}</strong>
          <small>Monthly Commitment</small>
        </div>
      </div>
      <div class="summary-card">
        <span class="card-icon">🏆</span>
        <div class="card-details">
          <span>Best Performer</span>
          <strong style="color: var(--green); font-size: 15px;">${escapeHtml(bestPerformerText)}</strong>
          <small style="color: var(--green);">${bestPerformerReturn}</small>
        </div>
      </div>
      <div class="summary-card">
        <span class="card-icon">💰</span>
        <div class="card-details">
          <span>Total Gain</span>
          <strong style="color: ${totalGain >= 0 ? 'var(--green)' : 'var(--red)'};">${currency.format(totalGain)}</strong>
          <small>Overall Profit</small>
        </div>
      </div>
    `;
  }
}

// === LIVE PAYMENT SCHEDULE PREVIEW GENERATOR ===
function updateSchedulePreview() {
  const editingId = document.querySelector("#invEditingId").value;
  const style = document.querySelector("#invStyleInput").value;
  
  if (style !== "monthly-recurring" || editingId !== "") {
    // Only show live preview when creating a NEW recurring investment
    return;
  }
  
  const monthlyAmount = parseFloat(document.querySelector("#invMonthlyAmountInput").value);
  const startDateStr = document.querySelector("#invStartDateInput").value;
  const duration = parseInt(document.querySelector("#invExpectedDurationInput").value);
  const durationUnit = document.querySelector("#invExpectedDurationUnitSelect").value;
  
  const scheduleIntroMsg = document.querySelector("#scheduleIntroMsg");
  const scheduleTableContainer = document.querySelector("#scheduleTableContainer");
  const schedulePreviewBody = document.querySelector("#schedulePreviewBody");
  
  if (!isNaN(monthlyAmount) && monthlyAmount > 0 && startDateStr && !isNaN(duration) && duration > 0) {
    if (scheduleIntroMsg) scheduleIntroMsg.style.display = "none";
    if (scheduleTableContainer) scheduleTableContainer.style.display = "block";
    
    if (schedulePreviewBody) {
      schedulePreviewBody.innerHTML = "";
      
      const dueDay = parseInt(startDateStr.split("-")[2], 10) || 1;
      const totalM = durationUnit === "Years" ? duration * 12 : duration;
      const targetVal = monthlyAmount * totalM;
      
      for (let i = 0; i < totalM; i++) {
        const dueDate = getDueDateForMonthIndex(startDateStr, dueDay, i);
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${i + 1}</td>
          <td>${formatDateWithSpace(dueDate)}</td>
          <td>${currency.format(monthlyAmount)}</td>
          <td><span class="emi-badge pending">Pending</span></td>
          <td><span style="font-size: 11px; color: var(--muted);">Preview Mode</span></td>
        `;
        schedulePreviewBody.appendChild(tr);
      }
      
      // Update Preview footer
      const scheduleTotalAmt = document.querySelector("#scheduleTotalAmt");
      if (scheduleTotalAmt) scheduleTotalAmt.textContent = currency.format(targetVal);
      
      const schedulePaidAmt = document.querySelector("#schedulePaidAmt");
      if (schedulePaidAmt) schedulePaidAmt.textContent = "₹0";
      
      const scheduleRemainingAmt = document.querySelector("#scheduleRemainingAmt");
      if (scheduleRemainingAmt) scheduleRemainingAmt.textContent = currency.format(targetVal);
      
      const scheduleNextDue = document.querySelector("#scheduleNextDue");
      if (scheduleNextDue) scheduleNextDue.textContent = formatDateWithSpace(startDateStr);
    }
  } else {
    if (scheduleIntroMsg) scheduleIntroMsg.style.display = "flex";
    if (scheduleTableContainer) scheduleTableContainer.style.display = "none";
  }
}

// === ATTACH EVENT LISTENERS FOR TAB & CARD SELECTION ===
function initInvestmentTrackerUI() {
  const radioOneTime = document.querySelector("#radioOneTime");
  const radioRecurring = document.querySelector("#radioRecurring");
  const typeCardOneTime = document.querySelector("#typeCardOneTime");
  const typeCardRecurring = document.querySelector("#typeCardRecurring");
  const invStyleInput = document.querySelector("#invStyleInput");
  const formPanelTitle = document.querySelector("#formPanelTitle");
  
  const oneTimeInputs = document.querySelector(".one-time-inputs");
  const recurringInputs = document.querySelector(".recurring-inputs");
  const oneTimeOpt = document.querySelector(".one-time-optional-inputs");
  const recurringOpt = document.querySelector(".recurring-optional-inputs");
  
  function setStyleSelection(style) {
    if (style === "one-time") {
      invStyleInput.value = "one-time";
      if (radioOneTime) radioOneTime.checked = true;
      if (radioRecurring) radioRecurring.checked = false;
      if (typeCardOneTime) typeCardOneTime.classList.add("active");
      if (typeCardRecurring) typeCardRecurring.classList.remove("active");
      
      if (oneTimeInputs) oneTimeInputs.style.display = "block";
      if (recurringInputs) recurringInputs.style.display = "none";
      if (oneTimeOpt) oneTimeOpt.style.display = "block";
      if (recurringOpt) recurringOpt.style.display = "none";
      
      if (formPanelTitle) formPanelTitle.textContent = "2. Add One Time Investment";
      
      // Hide schedule and summary widgets
      const widget = document.querySelector("#paymentSummaryWidget");
      if (widget) widget.style.display = "none";
      const scheduleTableContainer = document.querySelector("#scheduleTableContainer");
      if (scheduleTableContainer) scheduleTableContainer.style.display = "none";
      const scheduleIntroMsg = document.querySelector("#scheduleIntroMsg");
      if (scheduleIntroMsg) scheduleIntroMsg.style.display = "flex";
    } else {
      invStyleInput.value = "monthly-recurring";
      if (radioOneTime) radioOneTime.checked = false;
      if (radioRecurring) radioRecurring.checked = true;
      if (typeCardOneTime) typeCardOneTime.classList.remove("active");
      if (typeCardRecurring) typeCardRecurring.classList.add("active");
      
      if (oneTimeInputs) oneTimeInputs.style.display = "none";
      if (recurringInputs) recurringInputs.style.display = "block";
      if (oneTimeOpt) oneTimeOpt.style.display = "none";
      if (recurringOpt) recurringOpt.style.display = "block";
      
      if (formPanelTitle) formPanelTitle.textContent = "2. Add Monthly Investment (Recurring)";
      
      updateSchedulePreview();
    }
  }
  
  if (typeCardOneTime) {
    typeCardOneTime.addEventListener("click", () => setStyleSelection("one-time"));
  }
  if (typeCardRecurring) {
    typeCardRecurring.addEventListener("click", () => setStyleSelection("monthly-recurring"));
  }
  
  // Tab Switching logic
  const btnTabBasic = document.querySelector("#btnTabBasic");
  const btnTabMaturity = document.querySelector("#btnTabMaturity");
  const tabContentBasic = document.querySelector("#tabContentBasic");
  const tabContentMaturity = document.querySelector("#tabContentMaturity");
  
  if (btnTabBasic && btnTabMaturity) {
    btnTabBasic.addEventListener("click", () => {
      btnTabBasic.classList.add("active");
      btnTabMaturity.classList.remove("active");
      if (tabContentBasic) tabContentBasic.style.display = "block";
      if (tabContentMaturity) tabContentMaturity.style.display = "none";
    });
    
    btnTabMaturity.addEventListener("click", () => {
      btnTabMaturity.classList.add("active");
      btnTabBasic.classList.remove("active");
      if (tabContentMaturity) tabContentMaturity.style.display = "block";
      if (tabContentBasic) tabContentBasic.style.display = "none";
    });
  }
  
  // Attach live preview event listeners
  const liveInputs = [
    "#invMonthlyAmountInput",
    "#invStartDateInput",
    "#invExpectedDurationInput",
    "#invExpectedDurationUnitSelect"
  ];
  liveInputs.forEach(selector => {
    const el = document.querySelector(selector);
    if (el) el.addEventListener("input", updateSchedulePreview);
  });
  
  // List filter click handlers
  const filterTabs = document.querySelectorAll(".filter-tab");
  filterTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      filterTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      renderInvestmentTracker();
    });
  });
}

// === ATTACH SAVE/RESET HANDLERS ===
const addInvestmentForm = document.querySelector("#addInvestmentForm");
if (addInvestmentForm) {
  addInvestmentForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const editingId = document.querySelector("#invEditingId").value;
    const style = document.querySelector("#invStyleInput").value;
    
    const name = document.querySelector("#invNameInput").value.trim();
    const type = document.querySelector("#invTypeSelect").value;
    
    let newInv = {};
    
    if (style === "one-time") {
      const investedAmount = parseFloat(document.querySelector("#invInvestedAmountInput").value) || 0;
      const currentValue = parseFloat(document.querySelector("#invCurrentValueInput").value) || 0;
      const investmentDate = document.querySelector("#invDateInput").value;
      const maturityDate = document.querySelector("#invMaturityDateInput").value || "";
      
      const interestPercentVal = document.querySelector("#invInterestPercentInput").value;
      const interestPercent = interestPercentVal !== "" && interestPercentVal !== null ? parseFloat(interestPercentVal) : null;
      const interestPeriod = document.querySelector("#invInterestPeriodSelect").value;
      const sipAmountVal = document.querySelector("#invSipAmountInput").value;
      const sipAmount = sipAmountVal !== "" && sipAmountVal !== null ? parseFloat(sipAmountVal) : null;
      const notes = document.querySelector("#invNotesInputOneTime").value.trim();
      
      if (!name || isNaN(investedAmount) || isNaN(currentValue) || !investmentDate) {
        alert("Please fill all required fields correctly.");
        return;
      }
      
      newInv = {
        name,
        type,
        investedAmount,
        currentValue,
        investmentDate,
        maturityDate,
        interestPercent,
        interestPeriod,
        sipAmount,
        notes,
        investmentStyle: "one-time",
        status: "Active"
      };
    } else {
      const monthlyAmount = parseFloat(document.querySelector("#invMonthlyAmountInput").value);
      const startDate = document.querySelector("#invStartDateInput").value;
      const expectedDuration = parseInt(document.querySelector("#invExpectedDurationInput").value);
      const expectedDurationUnit = document.querySelector("#invExpectedDurationUnitSelect").value;
      
      const totalInvestmentVal = document.querySelector("#invTotalInvestmentInput").value;
      const totalInvestment = totalInvestmentVal !== "" && totalInvestmentVal !== null ? parseFloat(totalInvestmentVal) : null;
      const expectedReturnPercentVal = document.querySelector("#invExpectedReturnPercentInput").value;
      const expectedReturnPercent = expectedReturnPercentVal !== "" && expectedReturnPercentVal !== null ? parseFloat(expectedReturnPercentVal) : null;
      const interestCalculation = document.querySelector("#invInterestCalculationSelect").value;
      const notes = document.querySelector("#invNotesInput").value.trim();
      
      if (!name || isNaN(monthlyAmount) || !startDate || isNaN(expectedDuration)) {
        alert("Please fill all required fields correctly.");
        return;
      }
      
      // Calculate maturity date
      const dueDay = parseInt(startDate.split("-")[2], 10) || 1;
      const totalM = expectedDurationUnit === "Years" ? expectedDuration * 12 : expectedDuration;
      const calculatedMaturityDate = getDueDateForMonthIndex(startDate, dueDay, totalM - 1);
      
      newInv = {
        name,
        type,
        investmentDate: startDate,
        startDate,
        expectedDuration,
        expectedDurationUnit,
        monthlyAmount,
        totalInvestment: totalInvestment || (monthlyAmount * totalM),
        expectedReturnPercent,
        interestCalculation,
        maturityDate: calculatedMaturityDate,
        notes,
        investmentStyle: "monthly-recurring",
        status: "Active"
      };
    }
    
    if (editingId) {
      const idx = state.investments.findIndex(inv => inv.id === editingId);
      if (idx !== -1) {
        // Merge preservation of custom fields like paidMonths
        newInv.paidMonths = state.investments[idx].paidMonths || {};
        newInv.id = editingId;
        newInv.status = state.investments[idx].status || "Active";
        
        // Recalculate values if recurring
        if (newInv.investmentStyle === "monthly-recurring") {
          const paidCount = Object.keys(newInv.paidMonths).length;
          newInv.investedAmount = paidCount * (newInv.monthlyAmount || 0);
          newInv.currentValue = calculateMonthlyInvestmentValue(newInv);
        }
        
        state.investments[idx] = newInv;
      }
    } else {
      newInv.id = crypto.randomUUID();
      newInv.paidMonths = {};
      newInv.investedAmount = 0;
      newInv.currentValue = 0;
      state.investments.push(newInv);
      
      // Log initial transaction only for One Time lump sum
      if (style === "one-time") {
        state.transactions.push({
          id: crypto.randomUUID(),
          type: "expense",
          category: `Investment - ${type}`,
          amount: newInv.investedAmount,
          date: newInv.investmentDate,
          note: `Initial investment in ${name}`
        });
      }
    }
    
    try {
      await saveState(false);
      render();
      resetInvestmentFormUI();
    } catch (error) {
      reportError(error);
    }
  });
}

function resetInvestmentFormUI() {
  const form = document.querySelector("#addInvestmentForm");
  if (form) form.reset();
  
  document.querySelector("#invEditingId").value = "";
  document.querySelector("#invStyleInput").value = "one-time";
  
  // Set Selector Type Cards Active Style
  const typeCardOneTime = document.querySelector("#typeCardOneTime");
  const typeCardRecurring = document.querySelector("#typeCardRecurring");
  if (typeCardOneTime) typeCardOneTime.classList.add("active");
  if (typeCardRecurring) typeCardRecurring.classList.remove("active");
  
  // Set tab active Basic
  const btnTabBasic = document.querySelector("#btnTabBasic");
  const btnTabMaturity = document.querySelector("#btnTabMaturity");
  if (btnTabBasic) btnTabBasic.classList.add("active");
  if (btnTabMaturity) btnTabMaturity.classList.remove("active");
  
  const tabContentBasic = document.querySelector("#tabContentBasic");
  const tabContentMaturity = document.querySelector("#tabContentMaturity");
  if (tabContentBasic) tabContentBasic.style.display = "block";
  if (tabContentMaturity) tabContentMaturity.style.display = "none";
  
  // Hide recurring parts
  const oneTimeInputs = document.querySelector(".one-time-inputs");
  const recurringInputs = document.querySelector(".recurring-inputs");
  const oneTimeOpt = document.querySelector(".one-time-optional-inputs");
  const recurringOpt = document.querySelector(".recurring-optional-inputs");
  
  if (oneTimeInputs) oneTimeInputs.style.display = "block";
  if (recurringInputs) recurringInputs.style.display = "none";
  if (oneTimeOpt) oneTimeOpt.style.display = "block";
  if (recurringOpt) recurringOpt.style.display = "none";
  
  const formPanelTitle = document.querySelector("#formPanelTitle");
  if (formPanelTitle) formPanelTitle.textContent = "2. Add New Investment";
  
  const scheduleIntroMsg = document.querySelector("#scheduleIntroMsg");
  if (scheduleIntroMsg) scheduleIntroMsg.style.display = "flex";
  const scheduleTableContainer = document.querySelector("#scheduleTableContainer");
  if (scheduleTableContainer) scheduleTableContainer.style.display = "none";
}

const btnResetForm = document.querySelector("#btnResetForm");
if (btnResetForm) {
  btnResetForm.addEventListener("click", resetInvestmentFormUI);
}

// Scroll support button
const addNewInvestmentScrollBtn = document.querySelector("#addNewInvestmentScrollBtn");
if (addNewInvestmentScrollBtn) {
  addNewInvestmentScrollBtn.addEventListener("click", () => {
    const formPanel = document.querySelector(".add-investment-panel");
    if (formPanel) {
      formPanel.scrollIntoView({ behavior: 'smooth' });
    }
  });
}

// View Full History scroll support
const btnViewHistory = document.querySelector("#btnViewHistory");
if (btnViewHistory) {
  btnViewHistory.addEventListener("click", () => {
    const previewPanel = document.querySelector(".schedule-preview-panel");
    if (previewPanel) {
      previewPanel.scrollIntoView({ behavior: 'smooth' });
    }
  });
}

// Global hook: Hook list item action buttons
const listBodyContainer = document.querySelector("#investmentListBody");
if (listBodyContainer && !listBodyContainer.dataset.listenerAdded) {
  listBodyContainer.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    
    const id = btn.dataset.id;
    if (!id) return;
    
    e.stopPropagation(); // prevent row click selection triggering
    
    if (btn.classList.contains("edit")) {
      const inv = state.investments.find(item => item.id === id);
      if (inv) {
        document.querySelector("#invEditingId").value = inv.id;
        document.querySelector("#invNameInput").value = inv.name;
        document.querySelector("#invTypeSelect").value = inv.type;
        
        // Setup fields based on Style
        const isRec = inv.investmentStyle === "monthly-recurring";
        const typeCardOneTime = document.querySelector("#typeCardOneTime");
        const typeCardRecurring = document.querySelector("#typeCardRecurring");
        const invStyleInput = document.querySelector("#invStyleInput");
        const formPanelTitle = document.querySelector("#formPanelTitle");
        
        const oneTimeInputs = document.querySelector(".one-time-inputs");
        const recurringInputs = document.querySelector(".recurring-inputs");
        const oneTimeOpt = document.querySelector(".one-time-optional-inputs");
        const recurringOpt = document.querySelector(".recurring-optional-inputs");
        
        if (isRec) {
          invStyleInput.value = "monthly-recurring";
          if (typeCardOneTime) typeCardOneTime.classList.remove("active");
          if (typeCardRecurring) typeCardRecurring.classList.add("active");
          
          if (oneTimeInputs) oneTimeInputs.style.display = "none";
          if (recurringInputs) recurringInputs.style.display = "block";
          if (oneTimeOpt) oneTimeOpt.style.display = "none";
          if (recurringOpt) recurringOpt.style.display = "block";
          
          if (formPanelTitle) formPanelTitle.textContent = `2. Edit Monthly Investment: ${inv.name}`;
          
          document.querySelector("#invMonthlyAmountInput").value = inv.monthlyAmount || "";
          document.querySelector("#invStartDateInput").value = inv.startDate || inv.investmentDate || "";
          document.querySelector("#invExpectedDurationInput").value = inv.expectedDuration || "";
          document.querySelector("#invExpectedDurationUnitSelect").value = inv.expectedDurationUnit || "Months";
          document.querySelector("#invTotalInvestmentInput").value = inv.totalInvestment || "";
          document.querySelector("#invExpectedReturnPercentInput").value = inv.expectedReturnPercent || "";
          document.querySelector("#invInterestCalculationSelect").value = inv.interestCalculation || "Monthly Compounding";
          document.querySelector("#invNotesInput").value = inv.notes || "";
        } else {
          invStyleInput.value = "one-time";
          if (typeCardOneTime) typeCardOneTime.classList.add("active");
          if (typeCardRecurring) typeCardRecurring.classList.remove("active");
          
          if (oneTimeInputs) oneTimeInputs.style.display = "block";
          if (recurringInputs) recurringInputs.style.display = "none";
          if (oneTimeOpt) oneTimeOpt.style.display = "block";
          if (recurringOpt) recurringOpt.style.display = "none";
          
          if (formPanelTitle) formPanelTitle.textContent = `2. Edit One Time Investment: ${inv.name}`;
          
          document.querySelector("#invInvestedAmountInput").value = inv.investedAmount || "";
          document.querySelector("#invCurrentValueInput").value = inv.currentValue || "";
          document.querySelector("#invDateInput").value = inv.investmentDate || "";
          document.querySelector("#invMaturityDateInput").value = inv.maturityDate || "";
          document.querySelector("#invInterestPercentInput").value = inv.interestPercent !== null ? inv.interestPercent : "";
          document.querySelector("#invInterestPeriodSelect").value = inv.interestPeriod || "Yearly";
          document.querySelector("#invSipAmountInput").value = inv.sipAmount !== null ? inv.sipAmount : "";
          document.querySelector("#invNotesInputOneTime").value = inv.notes || "";
        }
        
        const formPanel = document.querySelector(".add-investment-panel");
        if (formPanel) {
          formPanel.scrollIntoView({ behavior: "smooth" });
        }
      }
    } else if (btn.classList.contains("delete")) {
      if (confirm("Are you sure you want to delete this investment?")) {
        state.investments = state.investments.filter(item => item.id !== id);
        if (state.selectedInvestmentId === id) {
          state.selectedInvestmentId = null;
        }
        try {
          await saveState(false);
          render();
        } catch (error) {
          reportError(error);
        }
      }
    } else if (btn.classList.contains("close-btn")) {
      if (confirm("Are you sure you want to close/mature this investment?")) {
        const inv = state.investments.find(item => item.id === id);
        if (inv) {
          inv.status = "Closed";
          try {
            await saveState(false);
            render();
          } catch (error) {
            reportError(error);
          }
        }
      }
    }
  });
  listBodyContainer.dataset.listenerAdded = "true";
}

// Hook list views in Maturity panel and SIP panel
const maturityBodyContainer = document.querySelector("#maturityListBody");
if (maturityBodyContainer) {
  maturityBodyContainer.addEventListener("click", (e) => {
    const btn = e.target.closest("button.edit");
    if (!btn) return;
    const id = btn.dataset.id;
    const listBtn = document.querySelector(`#investmentListBody button.edit[data-id="${id}"]`);
    if (listBtn) listBtn.click();
  });
}

const sipBodyContainer = document.querySelector("#sipTrackerListBody");
if (sipBodyContainer) {
  sipBodyContainer.addEventListener("click", (e) => {
    const btn = e.target.closest("button.edit");
    if (!btn) return;
    const id = btn.dataset.id;
    const listBtn = document.querySelector(`#investmentListBody button.edit[data-id="${id}"]`);
    if (listBtn) listBtn.click();
  });
}

// Initialize Investment UI Selection Cards and Tabs
initInvestmentTrackerUI();

(async function init() {
  try {
    if (await ensureAuthenticated()) {
      await loadAppState();
    }
  } catch (error) {
    reportError(error);
  }
})();
