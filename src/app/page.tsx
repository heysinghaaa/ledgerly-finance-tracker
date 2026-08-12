"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpDown,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Command,
  FilePlus2,
  FileText,
  Inbox,
  LayoutDashboard,
  Menu,
  Moon,
  MoreHorizontal,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sun,
  Trash2,
  TrendingUp,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";
import { CloudSyncControl } from "@/components/cloud-sync-control";
import { useCloudFinance } from "@/hooks/use-cloud-finance";
import {
  calculateInvoiceSubtotal,
  calculateInvoiceTax,
  calculateInvoiceTotal,
  createExpense,
  createInvoice,
  deleteExpense,
  deleteInvoice,
  formatCurrency,
  formatDate,
  getDashboardSummary,
  getExpenses,
  getInvoices,
  updateExpense,
  updateInvoice,
} from "@/lib/finance-service";
import type {
  Expense,
  ExpenseCategory,
  FinanceState,
  Invoice,
  InvoiceLineItem,
  InvoiceStatus,
  PaymentMethod,
} from "@/lib/types";

type View = "dashboard" | "invoices" | "expenses";
type ThemePreference = "light" | "dark" | "system";
type InvoiceSort = "due" | "amount" | "client";
type ExpenseSort = "date" | "amount" | "merchant";

const invoiceStatuses: Array<InvoiceStatus | "all"> = ["all", "draft", "sent", "paid", "overdue"];
const expenseCategories: Array<ExpenseCategory | "all"> = [
  "all",
  "Home",
  "Food",
  "Transport",
  "Software",
  "Health",
  "Travel",
  "Utilities",
];
const paymentMethods: PaymentMethod[] = ["UPI", "Card", "Cash", "Bank transfer"];

const navItems: Array<{ id: View; label: string; icon: LucideIcon }> = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard },
  { id: "invoices", label: "Invoices", icon: ReceiptText },
  { id: "expenses", label: "Expenses", icon: WalletCards },
];

const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;

const emptyInvoice = (): Invoice => ({
  id: createId("inv"),
  invoiceNumber: `LED-2026-${Math.floor(Math.random() * 800 + 200)}`,
  client: {
    id: createId("client"),
    name: "New Client",
    email: "client@example.com",
    city: "Jaipur",
  },
  issueDate: new Date().toISOString().slice(0, 10),
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  status: "draft",
  discount: 0,
  notes: "Add project scope, payment terms, or personal tracking notes.",
  items: [
    {
      id: createId("item"),
      description: "Design and development work",
      quantity: 1,
      rate: 15000,
      taxRate: 18,
    },
  ],
});

const emptyExpense = (): Expense => ({
  id: createId("exp"),
  merchant: "New expense",
  category: "Software",
  amount: 999,
  date: new Date().toISOString().slice(0, 10),
  paymentMethod: "UPI",
  note: "Short note",
});

export default function Home() {
  const {
    state,
    setState,
    session,
    authReady,
    configured,
    syncStatus,
    syncError,
    lastSyncedAt,
    migratedLocalData,
  } = useCloudFinance();
  const [activeView, setActiveView] = useState<View>("dashboard");
  const [invoiceFilter, setInvoiceFilter] = useState<InvoiceStatus | "all">("all");
  const [expenseFilter, setExpenseFilter] = useState<ExpenseCategory | "all">("all");
  const [invoiceSort, setInvoiceSort] = useState<InvoiceSort>("due");
  const [expenseSort, setExpenseSort] = useState<ExpenseSort>("date");
  const [search, setSearch] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [selectedExpenseId, setSelectedExpenseId] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [toast, setToast] = useState("");
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => {
    if (typeof window === "undefined") return "system";
    const stored = window.localStorage.getItem("ledgerly-theme");
    return stored === "light" || stored === "dark" ? stored : "system";
  });
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    const stored = window.localStorage.getItem("ledgerly-theme");
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  const invoices = getInvoices(state);
  const expenses = getExpenses(state);
  const summary = useMemo(() => getDashboardSummary(state), [state]);
  const selectedInvoice = invoices.find((invoice) => invoice.id === selectedInvoiceId);
  const selectedExpense = expenses.find((expense) => expense.id === selectedExpenseId);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const resolved = themePreference === "system" ? (media.matches ? "dark" : "light") : themePreference;
      setResolvedTheme(resolved);
      document.documentElement.dataset.theme = resolved;
      document.documentElement.style.colorScheme = resolved;
    };
    applyTheme();
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [themePreference]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
      if (event.key === "Escape") {
        setPaletteOpen(false);
        setMobileNavOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase();
    return invoices
      .filter((invoice) => {
        const matchesStatus = invoiceFilter === "all" || invoice.status === invoiceFilter;
        const matchesSearch =
          !query ||
          invoice.client.name.toLowerCase().includes(query) ||
          invoice.invoiceNumber.toLowerCase().includes(query) ||
          invoice.client.email.toLowerCase().includes(query);
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        if (invoiceSort === "amount") return calculateInvoiceTotal(b) - calculateInvoiceTotal(a);
        if (invoiceSort === "client") return a.client.name.localeCompare(b.client.name);
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
  }, [invoiceFilter, invoiceSort, invoices, search]);

  const filteredExpenses = useMemo(() => {
    const query = search.trim().toLowerCase();
    return expenses
      .filter((expense) => {
        const matchesCategory = expenseFilter === "all" || expense.category === expenseFilter;
        const matchesSearch =
          !query ||
          expense.merchant.toLowerCase().includes(query) ||
          expense.note.toLowerCase().includes(query) ||
          expense.category.toLowerCase().includes(query);
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        if (expenseSort === "amount") return b.amount - a.amount;
        if (expenseSort === "merchant") return a.merchant.localeCompare(b.merchant);
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
  }, [expenseFilter, expenseSort, expenses, search]);

  const navigate = useCallback((view: View) => {
    setActiveView(view);
    setMobileNavOpen(false);
    setPaletteOpen(false);
  }, []);

  const saveState = useCallback((nextState: FinanceState) => setState(nextState), [setState]);

  const createNewInvoice = useCallback(() => {
    const invoice = emptyInvoice();
    saveState(createInvoice(state, invoice));
    setSelectedInvoiceId(invoice.id);
    navigate("invoices");
    setToast("Invoice created and ready to edit");
  }, [navigate, saveState, state]);

  const createNewExpense = useCallback(() => {
    const expense = emptyExpense();
    saveState(createExpense(state, expense));
    setSelectedExpenseId(expense.id);
    navigate("expenses");
    setToast("Expense added to your ledger");
  }, [navigate, saveState, state]);

  const toggleTheme = useCallback(() => {
    const next = resolvedTheme === "dark" ? "light" : "dark";
    window.localStorage.setItem("ledgerly-theme", next);
    setThemePreference(next);
    setToast(`${next === "dark" ? "Dark" : "Light"} theme enabled`);
  }, [resolvedTheme]);

  const focusRecordSearch = useCallback(() => {
    setPaletteOpen(false);
    window.setTimeout(() => document.getElementById("global-record-search")?.focus(), 50);
  }, []);

  const handleInvoiceChange = (invoice: Invoice) => saveState(updateInvoice(state, invoice));
  const handleExpenseChange = (expense: Expense) => saveState(updateExpense(state, expense));

  const activeTitle =
    activeView === "dashboard" ? "Good morning, Alex." : activeView === "invoices" ? "Invoices" : "Expenses";
  const activeDescription =
    activeView === "dashboard"
      ? "Here’s how your business is performing this month."
      : activeView === "invoices"
        ? "Create, track, and manage client payments."
        : "Review and organize every business expense.";

  const paletteActions = [
    { label: "Create new invoice", hint: "Action", icon: FilePlus2, run: createNewInvoice },
    { label: "Add an expense", hint: "Action", icon: Plus, run: createNewExpense },
    { label: "Open analytics", hint: "Navigate", icon: BarChart3, run: () => navigate("dashboard") },
    { label: "View invoices", hint: "Navigate", icon: ReceiptText, run: () => navigate("invoices") },
    { label: "View expenses", hint: "Navigate", icon: WalletCards, run: () => navigate("expenses") },
    {
      label: `Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`,
      hint: "Preference",
      icon: resolvedTheme === "dark" ? Sun : Moon,
      run: () => {
        toggleTheme();
        setPaletteOpen(false);
      },
    },
    {
      label: "Search records",
      hint: "Shortcut",
      icon: Search,
      run: focusRecordSearch,
    },
  ].filter((action) => action.label.toLowerCase().includes(paletteQuery.toLowerCase()));

  if (configured && !authReady) {
    return <AppSkeleton />;
  }

  return (
    <main className="app-shell">
      <aside className={mobileNavOpen ? "sidebar mobile-open" : "sidebar"}>
        <div className="sidebar-header">
          <button className="brand-block" type="button" onClick={() => navigate("dashboard")} aria-label="Ledgerly home">
            <span className="brand-mark"><TrendingUp size={18} strokeWidth={2.4} /></span>
            <span className="brand-copy"><strong>Ledgerly</strong><small>Finance workspace</small></span>
          </button>
          <button className="icon-button mobile-only" type="button" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation">
            <X size={19} />
          </button>
        </div>

        <nav className="nav-stack" aria-label="Ledgerly navigation">
          <p className="nav-label">Workspace</p>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button className={activeView === id ? "active" : ""} key={id} type="button" onClick={() => navigate(id)}>
              <Icon size={18} />
              <span>{label}</span>
              {id === "invoices" && <em>{invoices.length}</em>}
              {id === "expenses" && <em>{expenses.length}</em>}
            </button>
          ))}
        </nav>

        <button className="command-trigger" type="button" onClick={() => setPaletteOpen(true)}>
          <span><Command size={16} /> Quick actions</span>
          <kbd>⌘ K</kbd>
        </button>

        <div className="sidebar-spacer" />
        <CloudSyncControl
          authReady={authReady}
          configured={configured}
          lastSyncedAt={lastSyncedAt}
          migratedLocalData={migratedLocalData}
          session={session}
          syncError={syncError}
          syncStatus={syncStatus}
        />
        <div className="profile-card">
          <span className="avatar">AS</span>
          <span><strong>{session?.user.email?.split("@")[0] ?? "Alex Smith"}</strong><small>{session ? "Cloud workspace" : "Local workspace"}</small></span>
          <MoreHorizontal size={18} />
        </div>
      </aside>

      {mobileNavOpen && <button className="sidebar-scrim" type="button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}

      <section className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button menu-button" type="button" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation">
              <Menu size={20} />
            </button>
            <div>
              <h1>{activeTitle}</h1>
              <p>{activeDescription}</p>
            </div>
          </div>
          <div className="topbar-actions">
            <label className="search-field">
              <Search size={17} />
              <input id="global-record-search" aria-label="Search records" placeholder="Search records..." value={search} onChange={(event) => setSearch(event.target.value)} />
              <kbd>⌘ K</kbd>
            </label>
            <button className="icon-button" type="button" onClick={toggleTheme} aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`}>
              {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="primary-button topbar-cta" type="button" onClick={createNewInvoice}>
              <Plus size={17} /> New invoice
            </button>
          </div>
        </header>

        {syncError && (
          <div className="feedback-banner error" role="alert">
            <AlertCircle size={18} />
            <div><strong>Cloud sync needs attention</strong><span>{syncError}</span></div>
            <button type="button" onClick={() => window.location.reload()}><RefreshCw size={15} /> Retry</button>
          </div>
        )}

        <div className="page-stage" key={activeView}>
          {activeView === "dashboard" && <Dashboard summary={summary} invoices={invoices} onNavigate={navigate} onCreateInvoice={createNewInvoice} />}

          {activeView === "invoices" && (
            <InvoicesView
              invoices={filteredInvoices}
              allInvoicesCount={invoices.length}
              selectedInvoice={selectedInvoice}
              filter={invoiceFilter}
              sort={invoiceSort}
              hasSearch={Boolean(search)}
              onFilter={setInvoiceFilter}
              onSort={setInvoiceSort}
              onSelect={setSelectedInvoiceId}
              onCreate={createNewInvoice}
              onChange={handleInvoiceChange}
              onDelete={() => {
                if (!selectedInvoice) return;
                const nextState = deleteInvoice(state, selectedInvoice.id);
                saveState(nextState);
                setSelectedInvoiceId("");
                setToast("Invoice deleted");
              }}
            />
          )}

          {activeView === "expenses" && (
            <ExpensesView
              expenses={filteredExpenses}
              allExpensesCount={expenses.length}
              selectedExpense={selectedExpense}
              filter={expenseFilter}
              sort={expenseSort}
              hasSearch={Boolean(search)}
              onFilter={setExpenseFilter}
              onSort={setExpenseSort}
              onSelect={setSelectedExpenseId}
              onCreate={createNewExpense}
              onChange={handleExpenseChange}
              onDelete={() => {
                if (!selectedExpense) return;
                const nextState = deleteExpense(state, selectedExpense.id);
                saveState(nextState);
                setSelectedExpenseId("");
                setToast("Expense deleted");
              }}
            />
          )}
        </div>
      </section>

      {paletteOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setPaletteOpen(false)}>
          <section className="command-palette" role="dialog" aria-modal="true" aria-label="Command palette" onMouseDown={(event) => event.stopPropagation()}>
            <div className="palette-search"><Search size={19} /><input autoFocus aria-label="Search commands" placeholder="Type a command or search..." value={paletteQuery} onChange={(event) => setPaletteQuery(event.target.value)} /><kbd>ESC</kbd></div>
            <div className="palette-results">
              <p>Quick actions</p>
              {paletteActions.map(({ label, hint, icon: Icon, run }) => (
                <button key={label} type="button" onClick={run}><span><Icon size={18} /><strong>{label}</strong></span><small>{hint}</small></button>
              ))}
              {paletteActions.length === 0 && <div className="palette-empty"><Search size={22} /><span>No commands found</span></div>}
            </div>
            <footer><span><kbd>↑</kbd><kbd>↓</kbd> to navigate</span><span><kbd>↵</kbd> to select</span></footer>
          </section>
        </div>
      )}

      {toast && <div className="toast" role="status"><CheckCircle2 size={18} /><span>{toast}</span></div>}
    </main>
  );
}

function Dashboard({
  summary,
  invoices,
  onNavigate,
  onCreateInvoice,
}: {
  summary: ReturnType<typeof getDashboardSummary>;
  invoices: Invoice[];
  onNavigate: (view: View) => void;
  onCreateInvoice: () => void;
}) {
  const metricIcons: LucideIcon[] = [CircleDollarSign, WalletCards, CalendarDays, TrendingUp];
  const paidShare = Math.max(0, Math.min(100, Math.round((summary.metrics[0].value / Math.max(summary.metrics[3].value, 1)) * 100)));
  const expenseShare = Math.max(0, Math.min(100, Math.round((summary.metrics[1].value / Math.max(summary.metrics[0].value, 1)) * 100)));
  const healthScore = Math.max(8, Math.min(92, 100 - expenseShare));
  const chartValues = [35, 48, 42, 64, 58, 78, 68, 84, 74, 91, 76, 88];
  const chartLabels = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];

  return (
    <section className="dashboard-grid">
      <div className="metric-grid">
        {summary.metrics.map((metric, index) => {
          const Icon = metricIcons[index];
          const trendPositive = metric.tone === "income" || metric.tone === "neutral";
          return (
            <article className={`metric-card ${metric.tone}`} key={metric.label}>
              <div className="metric-top"><span>{metric.label}</span><span className="metric-icon"><Icon size={17} /></span></div>
              <strong>{formatCurrency(metric.value)}</strong>
              <p className={trendPositive ? "trend up" : metric.tone === "expense" ? "trend down" : "trend neutral"}>
                {trendPositive ? <ArrowUpRight size={14} /> : metric.tone === "expense" ? <ArrowDownRight size={14} /> : <CalendarDays size={14} />}
                {index === 0 ? "+12.5%" : index === 1 ? "+4.2%" : index === 2 ? `${invoices.filter((item) => item.status === "overdue").length} overdue` : "+8.1%"}
                <span>{index < 2 ? "vs last month" : index === 3 ? "forecast" : ""}</span>
              </p>
            </article>
          );
        })}
      </div>

      <div className="analytics-grid">
        <article className="panel cashflow-panel">
          <div className="panel-heading">
            <div><h2>Cash flow</h2><p>Income and expenses over the last 12 months</p></div>
            <button className="select-button" type="button">Last 12 months <ChevronDown size={15} /></button>
          </div>
          <div className="chart-legend"><span><i className="legend-dot purple" />Income</span><span><i className="legend-dot gray" />Expenses</span></div>
          <div className="bar-chart" aria-label="Cash flow bar chart">
            {chartValues.map((value, index) => (
              <div className="bar-column" key={chartLabels[index]}>
                <div className="bars"><span className="bar expense-bar" style={{ height: `${Math.max(18, value - 26)}%` }} /><span className="bar income-bar" style={{ height: `${value}%` }} /></div>
                <small>{chartLabels[index]}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="panel financial-health">
          <div className="panel-heading"><div><h2>Financial health</h2><p>Current month score</p></div><span className="icon-soft"><BarChart3 size={17} /></span></div>
          <div className="health-score"><strong>{healthScore}</strong><span>/ 100</span></div>
          <div className="score-track"><span style={{ width: `${healthScore}%` }} /></div>
          <div className="health-status"><span><Check size={15} /> Healthy</span><small>Strong cash position</small></div>
          <div className="health-stats">
            <div><span>Collection rate</span><strong>{paidShare}%</strong></div>
            <div><span>Expense ratio</span><strong>{expenseShare}%</strong></div>
          </div>
        </article>
      </div>

      <div className="bottom-grid">
        <article className="panel activity-panel">
          <div className="panel-heading"><div><h2>Recent activity</h2><p>Your latest invoice and expense updates</p></div><button className="text-button" type="button" onClick={() => onNavigate("invoices")}>View all <ArrowUpRight size={15} /></button></div>
          {summary.recentActivity.length ? (
            <div className="activity-list">
              {summary.recentActivity.map((activity) => (
                <button className="activity-row" key={`${activity.type}-${activity.id}`} type="button" onClick={() => onNavigate(activity.type === "invoice" ? "invoices" : "expenses")}>
                  <span className={`activity-icon ${activity.type}`}>{activity.type === "invoice" ? <FileText size={17} /> : <WalletCards size={17} />}</span>
                  <span className="activity-copy"><strong>{activity.label}</strong><small>{activity.detail}</small></span>
                  <span className={activity.amount >= 0 ? "activity-amount positive" : "activity-amount"}>{activity.amount >= 0 ? "+" : "−"}{formatCurrency(Math.abs(activity.amount))}</span>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState icon={Inbox} title="No activity yet" description="Create your first invoice to start tracking cash flow." action="Create invoice" onAction={onCreateInvoice} />
          )}
        </article>

        <article className="panel balance-panel">
          <div className="panel-heading"><div><h2>Net balance</h2><p>Paid income minus expenses</p></div><span className="icon-soft"><CircleDollarSign size={17} /></span></div>
          <strong className="editorial-number">{formatCurrency(summary.monthlyBalance)}</strong>
          <p className="balance-helper"><ArrowUpRight size={15} /> Your balance is trending positively.</p>
          <div className="balance-breakdown"><span><i className="legend-dot purple" />Collected <strong>{formatCurrency(summary.metrics[0].value)}</strong></span><span><i className="legend-dot gray" />Spent <strong>{formatCurrency(summary.metrics[1].value)}</strong></span></div>
          <button className="secondary-button full-width" type="button" onClick={() => onNavigate("expenses")}>Review expenses</button>
        </article>
      </div>
    </section>
  );
}

function InvoicesView({
  invoices,
  allInvoicesCount,
  selectedInvoice,
  filter,
  sort,
  hasSearch,
  onFilter,
  onSort,
  onSelect,
  onCreate,
  onChange,
  onDelete,
}: {
  invoices: Invoice[];
  allInvoicesCount: number;
  selectedInvoice?: Invoice;
  filter: InvoiceStatus | "all";
  sort: InvoiceSort;
  hasSearch: boolean;
  onFilter: (status: InvoiceStatus | "all") => void;
  onSort: (sort: InvoiceSort) => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onChange: (invoice: Invoice) => void;
  onDelete: () => void;
}) {
  return (
    <section className={selectedInvoice ? "records-page detail-open" : "records-page"}>
      <div className="records-main">
        <div className="records-toolbar">
          <div className="filter-tabs" aria-label="Invoice status filters">
            {invoiceStatuses.map((status) => (
              <button className={filter === status ? "selected" : ""} key={status} type="button" onClick={() => onFilter(status)}>{status}<span>{status === "all" ? allInvoicesCount : ""}</span></button>
            ))}
          </div>
          <div className="toolbar-actions">
            <label className="select-control"><ArrowUpDown size={15} /><select aria-label="Sort invoices" value={sort} onChange={(event) => onSort(event.target.value as InvoiceSort)}><option value="due">Due date</option><option value="amount">Amount</option><option value="client">Client</option></select><ChevronDown size={14} /></label>
            <button className="primary-button" type="button" onClick={onCreate}><Plus size={16} /> New invoice</button>
          </div>
        </div>

        <article className="table-card">
          {invoices.length ? (
            <div className="table-scroll">
              <table className="data-table">
                <thead><tr><th>Invoice</th><th>Client</th><th>Due date</th><th>Status</th><th className="numeric">Amount</th><th><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr className={selectedInvoice?.id === invoice.id ? "selected-row" : ""} key={invoice.id} onClick={() => onSelect(invoice.id)}>
                      <td data-label="Invoice"><button className="table-primary" type="button" onClick={() => onSelect(invoice.id)}>{invoice.invoiceNumber}</button></td>
                      <td data-label="Client"><strong>{invoice.client.name}</strong><small>{invoice.client.email}</small></td>
                      <td data-label="Due date">{formatDate(invoice.dueDate)}</td>
                      <td data-label="Status"><StatusBadge status={invoice.status} /></td>
                      <td data-label="Amount" className="numeric amount-cell">{formatCurrency(calculateInvoiceTotal(invoice))}</td>
                      <td><button className="row-action" type="button" onClick={(event) => { event.stopPropagation(); onSelect(invoice.id); }} aria-label={`Edit ${invoice.invoiceNumber}`}><MoreHorizontal size={18} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={FileText} title={hasSearch || filter !== "all" ? "No matching invoices" : "No invoices yet"} description={hasSearch || filter !== "all" ? "Try changing your search or status filter." : "Create a polished invoice and start tracking what you're owed."} action="Create invoice" onAction={onCreate} />
          )}
          {invoices.length > 0 && <div className="table-footer"><span>Showing {invoices.length} of {allInvoicesCount} invoices</span><span>Amounts shown in INR</span></div>}
        </article>
      </div>

      {selectedInvoice && <InvoiceEditor invoice={selectedInvoice} onChange={onChange} onDelete={onDelete} onClose={() => onSelect("")} />}
    </section>
  );
}

function ExpensesView({
  expenses,
  allExpensesCount,
  selectedExpense,
  filter,
  sort,
  hasSearch,
  onFilter,
  onSort,
  onSelect,
  onCreate,
  onChange,
  onDelete,
}: {
  expenses: Expense[];
  allExpensesCount: number;
  selectedExpense?: Expense;
  filter: ExpenseCategory | "all";
  sort: ExpenseSort;
  hasSearch: boolean;
  onFilter: (category: ExpenseCategory | "all") => void;
  onSort: (sort: ExpenseSort) => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onChange: (expense: Expense) => void;
  onDelete: () => void;
}) {
  return (
    <section className={selectedExpense ? "records-page detail-open" : "records-page"}>
      <div className="records-main">
        <div className="records-toolbar">
          <div className="filter-tabs category-tabs" aria-label="Expense category filters">
            {expenseCategories.map((category) => <button className={filter === category ? "selected" : ""} key={category} type="button" onClick={() => onFilter(category)}>{category}</button>)}
          </div>
          <div className="toolbar-actions">
            <label className="select-control"><SlidersHorizontal size={15} /><select aria-label="Sort expenses" value={sort} onChange={(event) => onSort(event.target.value as ExpenseSort)}><option value="date">Recent first</option><option value="amount">Amount</option><option value="merchant">Merchant</option></select><ChevronDown size={14} /></label>
            <button className="primary-button" type="button" onClick={onCreate}><Plus size={16} /> Add expense</button>
          </div>
        </div>

        <article className="table-card">
          {expenses.length ? (
            <div className="table-scroll">
              <table className="data-table">
                <thead><tr><th>Merchant</th><th>Category</th><th>Date</th><th>Payment method</th><th className="numeric">Amount</th><th><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr className={selectedExpense?.id === expense.id ? "selected-row" : ""} key={expense.id} onClick={() => onSelect(expense.id)}>
                      <td data-label="Merchant"><button className="table-primary" type="button" onClick={() => onSelect(expense.id)}>{expense.merchant}</button><small>{expense.note}</small></td>
                      <td data-label="Category"><span className="category-badge">{expense.category}</span></td>
                      <td data-label="Date">{formatDate(expense.date)}</td>
                      <td data-label="Payment">{expense.paymentMethod}</td>
                      <td data-label="Amount" className="numeric amount-cell">{formatCurrency(expense.amount)}</td>
                      <td><button className="row-action" type="button" onClick={(event) => { event.stopPropagation(); onSelect(expense.id); }} aria-label={`Edit ${expense.merchant}`}><MoreHorizontal size={18} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={WalletCards} title={hasSearch || filter !== "all" ? "No matching expenses" : "No expenses yet"} description={hasSearch || filter !== "all" ? "Try changing your search or category filter." : "Add your first expense to understand where your money goes."} action="Add expense" onAction={onCreate} />
          )}
          {expenses.length > 0 && <div className="table-footer"><span>Showing {expenses.length} of {allExpensesCount} expenses</span><span>Amounts shown in INR</span></div>}
        </article>
      </div>

      {selectedExpense && <ExpenseEditor expense={selectedExpense} onChange={onChange} onDelete={onDelete} onClose={() => onSelect("")} />}
    </section>
  );
}

function InvoiceEditor({ invoice, onChange, onDelete, onClose }: { invoice: Invoice; onChange: (invoice: Invoice) => void; onDelete: () => void; onClose: () => void }) {
  const subtotal = calculateInvoiceSubtotal(invoice.items);
  const tax = calculateInvoiceTax(invoice.items);
  const total = calculateInvoiceTotal(invoice);
  const updateItem = (itemId: string, nextItem: Partial<InvoiceLineItem>) => onChange({ ...invoice, items: invoice.items.map((item) => item.id === itemId ? { ...item, ...nextItem } : item) });

  return (
    <aside className="detail-panel invoice-detail" aria-label="Invoice editor">
      <div className="detail-header"><div><span className="eyebrow">Invoice detail</span><h2>{invoice.invoiceNumber}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close invoice"><X size={18} /></button></div>
      <div className="detail-scroll">
        <div className="detail-summary"><div><span>Total amount</span><strong>{formatCurrency(total)}</strong></div><StatusBadge status={invoice.status} /></div>
        <div className="form-section"><h3>Client & invoice</h3><div className="form-grid">
          <Field label="Invoice number"><input value={invoice.invoiceNumber} onChange={(event) => onChange({ ...invoice, invoiceNumber: event.target.value })} /></Field>
          <Field label="Status"><select value={invoice.status} onChange={(event) => onChange({ ...invoice, status: event.target.value as InvoiceStatus })}><option value="draft">Draft</option><option value="sent">Sent</option><option value="paid">Paid</option><option value="overdue">Overdue</option></select></Field>
          <Field label="Client name"><input value={invoice.client.name} onChange={(event) => onChange({ ...invoice, client: { ...invoice.client, name: event.target.value } })} /></Field>
          <Field label="Client email"><input type="email" value={invoice.client.email} onChange={(event) => onChange({ ...invoice, client: { ...invoice.client, email: event.target.value } })} /></Field>
          <Field label="Issue date"><input type="date" value={invoice.issueDate} onChange={(event) => onChange({ ...invoice, issueDate: event.target.value })} /></Field>
          <Field label="Due date"><input type="date" value={invoice.dueDate} onChange={(event) => onChange({ ...invoice, dueDate: event.target.value })} /></Field>
        </div></div>
        <div className="form-section"><div className="section-title"><h3>Line items</h3><button className="text-button" type="button" onClick={() => onChange({ ...invoice, items: [...invoice.items, { id: createId("item"), description: "New line item", quantity: 1, rate: 1000, taxRate: 18 }] })}><Plus size={14} /> Add line</button></div>
          <div className="line-items">{invoice.items.map((item) => <div className="line-item" key={item.id}><input aria-label="Item description" value={item.description} onChange={(event) => updateItem(item.id, { description: event.target.value })} /><div><input aria-label="Quantity" min="1" type="number" value={item.quantity} onChange={(event) => updateItem(item.id, { quantity: Number(event.target.value) })} /><input aria-label="Rate" min="0" type="number" value={item.rate} onChange={(event) => updateItem(item.id, { rate: Number(event.target.value) })} /><input aria-label="Tax rate" min="0" type="number" value={item.taxRate} onChange={(event) => updateItem(item.id, { taxRate: Number(event.target.value) })} /><button className="icon-button danger-icon" type="button" onClick={() => onChange({ ...invoice, items: invoice.items.filter((line) => line.id !== item.id) })} aria-label="Remove line item"><Trash2 size={15} /></button></div></div>)}</div>
        </div>
        <div className="form-section"><div className="form-grid"><Field label="Discount"><input min="0" type="number" value={invoice.discount} onChange={(event) => onChange({ ...invoice, discount: Number(event.target.value) })} /></Field><Field label="Notes"><textarea value={invoice.notes} onChange={(event) => onChange({ ...invoice, notes: event.target.value })} /></Field></div></div>
        <div className="invoice-preview">
          <div className="preview-header"><span className="brand-mark small"><TrendingUp size={13} /></span><div><strong>Ledgerly</strong><small>{invoice.invoiceNumber}</small></div><button className="icon-button" type="button" onClick={() => window.print()} aria-label="Print invoice"><Printer size={16} /></button></div>
          <div className="preview-bill"><span>Bill to</span><strong>{invoice.client.name}</strong><small>{invoice.client.email}</small></div>
          <div className="preview-lines">{invoice.items.map((item) => <div key={item.id}><span>{item.description}<small>{item.quantity} × {formatCurrency(item.rate)}</small></span><strong>{formatCurrency(item.quantity * item.rate)}</strong></div>)}</div>
          <div className="totals-box"><span>Subtotal <strong>{formatCurrency(subtotal)}</strong></span><span>Tax <strong>{formatCurrency(tax)}</strong></span><span>Discount <strong>−{formatCurrency(invoice.discount)}</strong></span><span className="grand-total">Total <strong>{formatCurrency(total)}</strong></span></div>
        </div>
      </div>
      <div className="detail-footer"><button className="danger-button" type="button" onClick={onDelete}><Trash2 size={15} /> Delete</button><span><CheckCircle2 size={14} /> Changes save automatically</span></div>
    </aside>
  );
}

function ExpenseEditor({ expense, onChange, onDelete, onClose }: { expense: Expense; onChange: (expense: Expense) => void; onDelete: () => void; onClose: () => void }) {
  return (
    <aside className="detail-panel" aria-label="Expense editor">
      <div className="detail-header"><div><span className="eyebrow">Expense detail</span><h2>{expense.merchant}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close expense"><X size={18} /></button></div>
      <div className="detail-scroll">
        <div className="expense-amount"><span>Tracked spend</span><strong>{formatCurrency(expense.amount)}</strong><small>{expense.category} · {expense.paymentMethod}</small></div>
        <div className="form-section"><h3>Expense information</h3><div className="form-grid single">
          <Field label="Merchant"><input value={expense.merchant} onChange={(event) => onChange({ ...expense, merchant: event.target.value })} /></Field>
          <Field label="Amount"><input min="0" type="number" value={expense.amount} onChange={(event) => onChange({ ...expense, amount: Number(event.target.value) })} /></Field>
          <Field label="Category"><select value={expense.category} onChange={(event) => onChange({ ...expense, category: event.target.value as ExpenseCategory })}>{expenseCategories.filter((category) => category !== "all").map((category) => <option key={category}>{category}</option>)}</select></Field>
          <Field label="Payment method"><select value={expense.paymentMethod} onChange={(event) => onChange({ ...expense, paymentMethod: event.target.value as PaymentMethod })}>{paymentMethods.map((method) => <option key={method}>{method}</option>)}</select></Field>
          <Field label="Date"><input type="date" value={expense.date} onChange={(event) => onChange({ ...expense, date: event.target.value })} /></Field>
          <Field label="Note"><textarea value={expense.note} onChange={(event) => onChange({ ...expense, note: event.target.value })} /></Field>
        </div></div>
      </div>
      <div className="detail-footer"><button className="danger-button" type="button" onClick={onDelete}><Trash2 size={15} /> Delete</button><span><CheckCircle2 size={14} /> Changes save automatically</span></div>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  return <span className={`status-badge ${status}`}><i />{status}</span>;
}

function EmptyState({ icon: Icon, title, description, action, onAction }: { icon: LucideIcon; title: string; description: string; action: string; onAction: () => void }) {
  return <div className="empty-state"><span className="empty-icon"><Icon size={24} /></span><h3>{title}</h3><p>{description}</p><button className="primary-button" type="button" onClick={onAction}><Plus size={16} />{action}</button></div>;
}

function AppSkeleton() {
  return <main className="app-shell skeleton-shell"><aside className="sidebar"><div className="skeleton brand-skeleton" /><div className="skeleton nav-skeleton" /><div className="skeleton nav-skeleton" /><div className="skeleton nav-skeleton" /></aside><section className="workspace"><div className="skeleton title-skeleton" /><div className="metric-grid">{[0, 1, 2, 3].map((item) => <div className="skeleton metric-skeleton" key={item} />)}</div><div className="skeleton chart-skeleton" /></section></main>;
}
