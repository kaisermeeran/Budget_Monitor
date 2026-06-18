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
    goals: document.querySelector("#goalsView")
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
  resetSampleBtn: document.querySelector("#resetSampleBtn")
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
  const categorySelect = document.getElementById("transactionCategory");
  const typeSelect = document.getElementById("transactionType");

  if (!categorySelect || !typeSelect) return;

  const selectedValue = categorySelect.value;
  const plan = getPlan();
  const values = typeSelect.value === "income"
    ? uniqueSorted(plan.incomes.map((item) => item.description))
    : uniqueSorted(plan.budgets.map((item) => item.name));

  categorySelect.innerHTML = "";

  if (!values.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = typeSelect.value === "income"
      ? "Add income first"
      : "Add expected budget first";
    option.disabled = true;
    option.selected = true;
    categorySelect.appendChild(option);
    return;
  }

  for (const value of values) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    option.selected = value === selectedValue;
    categorySelect.appendChild(option);
  }
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
  els.monthSelect.value = state.selectedMonth;
  els.dateInput.value = defaultDateForSelectedMonth();
  render();
  renderCategoryDropdown();
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
    goals: []
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

async function saveState() {
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
    try {
      await syncStateToDatabase();
    } catch (syncError) {
      console.warn("PostgreSQL table sync failed; app state was saved", syncError);
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
  state.compareBaseMonth ||= "";
  state.compareTargetMonth ||= "";
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

function getPlan() {

  if (!state) {
    state = getInitialState();
  }

  if (!state.plans) {
    state.plans = {};
  }

  if (!state.selectedMonth) {
    state.selectedMonth = currentMonth();
  }

  if (!state.plans[state.selectedMonth]) {
    state.plans[state.selectedMonth] = {
      income: 0,
      incomes: [],
      budgets: []
    };
  }

  if (!Array.isArray(state.plans[state.selectedMonth].incomes)) {
    state.plans[state.selectedMonth].incomes = [];
  }

  if (!Array.isArray(state.plans[state.selectedMonth].budgets)) {
    state.plans[state.selectedMonth].budgets = [];
  }

  return state.plans[state.selectedMonth];
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
  const expenses = rows.filter((row) => row.type === "expense").reduce((sum, row) => sum + row.amount, 0);
  const expectedRemaining = income - budgetTotal;
  const actualRemaining = income - expenses;
  const remainingBudget = budgetTotal - expenses;
  return {
    income,
    available,
    expenses,
    expenseLimit: budgetTotal,
    saved: actualRemaining,
    leftToSave: actualRemaining,
    expectedRemaining,
    actualRemaining,
    remainingBudget,
    overspent: Math.max(expenses - budgetTotal, 0),
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
  const values = (state.savedBudgetNames || []).filter((name) => {
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
  const budget = plan.budgets.find((item) => item.id === budgetId);
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
  const transaction = state.transactions.find((item) => item.id === transactionId);
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

els.tabs.forEach((button) => {
  button.addEventListener("click", () => {
    els.tabs.forEach((tab) => tab.classList.toggle("active", tab === button));
    document.querySelectorAll(".view").forEach((view) => {
      view.classList.toggle("active", view.id === `${button.dataset.view}View`);
    });
    els.pageTitle.textContent = titleCase(button.dataset.view);
    requestAnimationFrame(render);
  });
});

els.monthSelect.addEventListener("change", async () => {
  state.selectedMonth = els.monthSelect.value || currentMonth();
  els.dateInput.value = defaultDateForSelectedMonth();
  try {
    await saveState();
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
  const plan = getPlan();
  plan.incomes = plan.incomes.filter((item) => item.id !== button.dataset.incomeId);
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
    const existing = plan.budgets.find((item) => item.id === editingBudgetId);
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
  state.savedBudgetNames = (state.savedBudgetNames || []).filter((value) => value !== name);
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
    startBudgetEdit(editButton.dataset.budgetEditId);
    return;
  }

  const deleteButton = event.target.closest("button[data-budget-id]");
  if (!deleteButton) return;
  const plan = getPlan();
  plan.budgets = plan.budgets.filter((item) => item.id !== deleteButton.dataset.budgetId);
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
    await saveState();
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
    alert(els.typeInput.value === "income"
      ? "Add income first, then select it for the transaction."
      : "Add expected budget first, then select it for the transaction.");
    els.categoryInput.focus();
    return;
  }

  const transaction = {
    id: editingTransactionId || crypto.randomUUID(),
    type: els.typeInput.value,
    category,
    amount: Number(els.amountInput.value),
    date: els.dateInput.value || defaultDateForSelectedMonth(),
    note: els.noteInput.value.trim()
  };

  if (editingTransactionId) {
    const existingIndex = state.transactions.findIndex((item) => item.id === editingTransactionId);
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
      state.transactions = state.transactions.filter((item) => item.id !== transaction.id);
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
    await saveState();
    resetTransactionEdit();
    render();
  } catch (error) {
    reportError(error);
  }
});

els.transactionTable.addEventListener("click", async (event) => {
  const editButton = event.target.closest("button[data-transaction-id]");
  if (editButton) {
    startTransactionEdit(editButton.dataset.transactionId);
    return;
  }

  const deleteButton = event.target.closest("button[data-id]");
  if (!deleteButton) return;

  if (!(await confirmTransactionDelete())) {
    return;
  }

  const transactionId = deleteButton.dataset.id;
  const prevState = JSON.parse(JSON.stringify(state));
  const transaction = state.transactions.find((item) => item.id === transactionId);
  state.transactions = state.transactions.filter((item) => item.id !== transactionId);
  clearMoneyIfMonthIsEmpty();

  try {
    if (transaction) {
      await deleteTransactionFromServer(transaction);
    }
    await saveState();
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
    await saveState();
    render();
  } catch (error) {
    reportError(error);
  }
});

els.goalsList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-id]");
  if (!button) return;
  state.goals = state.goals.filter((goal) => goal.id !== button.dataset.id);
  try {
    await saveState();
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

window.addEventListener("resize", () => requestAnimationFrame(render));

(async function init() {
  try {
    if (await ensureAuthenticated()) {
      await loadAppState();
    }
  } catch (error) {
    reportError(error);
  }
})();
