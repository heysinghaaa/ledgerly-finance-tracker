"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ButtonBase from "@mui/material/ButtonBase";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpDown,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Command,
  FilePlus2,
  FileText,
  Download,
  PieChart,
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
  UserPlus,
  Users,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";
import { CloudSyncControl } from "@/components/cloud-sync-control";
import { AppSelect } from "@/components/app-select";
import { AppInput, AppTextarea } from "@/components/app-input";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DateRangeControl } from "@/components/date-range-control";
import { useNotifications } from "@/components/notifications";
import { Pagination } from "@/components/pagination";
import { useCloudFinance } from "@/hooks/use-cloud-finance";
import {
  calculateInvoiceSubtotal,
  calculateInvoiceTax,
  calculateInvoiceTotal,
  createExpense,
  createInvoice,
  createClient,
  deleteClient,
  deleteExpense,
  deleteInvoice,
  formatCurrency,
  formatDate,
  getAnalyticsSummary,
  getClientFinancials,
  getClients,
  getDateRange,
  getDashboardSummary,
  getExpenses,
  getInvoices,
  getTransactions,
  isInDateRange,
  linkInvoiceToClient,
  paginate,
  updateClient,
  updateExpense,
  updateInvoice,
} from "@/lib/finance-service";
import {
  downloadInvoicePdf,
  exportClientsCsv,
  exportExpensesCsv,
  exportInvoicesCsv,
  exportTransactionsCsv,
} from "@/lib/export-service";
import type {
  Client,
  DateRange,
  Expense,
  ExpenseCategory,
  FinanceState,
  Invoice,
  InvoiceLineItem,
  InvoiceStatus,
  PaymentMethod,
  PaginatedResult,
  Transaction,
  AnalyticsSummary,
  TransactionType,
} from "@/lib/types";

type View = "dashboard" | "invoices" | "expenses" | "clients" | "analytics" | "transactions";
type ThemePreference = "light" | "dark" | "system";
type InvoiceSort = "due" | "amount" | "client" | "status";
type ExpenseSort = "date" | "amount" | "merchant";
type ClientSort = "created" | "name" | "company" | "revenue";
type TransactionSort = "date" | "amount" | "name";

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
  { id: "clients", label: "Clients", icon: Users },
  { id: "transactions", label: "Transactions", icon: ArrowUpDown },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;

const emptyInvoice = (client?: Client): Invoice => ({
  id: createId("inv"),
  invoiceNumber: `LED-2026-${Math.floor(Math.random() * 800 + 200)}`,
  clientId: client?.id ?? null,
  client: client ? { ...client } : { id: "", name: "Select a client", company: "", email: "", phone: "", billingAddress: "", city: "" },
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

const emptyClient = (): Client => ({
  id: createId("client"),
  name: "",
  company: "",
  email: "",
  phone: "",
  billingAddress: "",
  city: "",
  notes: "",
  createdAt: new Date().toISOString(),
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
  const { notify } = useNotifications();
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
  const [clientSort, setClientSort] = useState<ClientSort>("created");
  const [transactionSort, setTransactionSort] = useState<TransactionSort>("date");
  const [transactionType, setTransactionType] = useState<TransactionType | "all">("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>(() => getDateRange("year"));
  const [invoicePage, setInvoicePage] = useState(1);
  const [expensePage, setExpensePage] = useState(1);
  const [clientPage, setClientPage] = useState(1);
  const [transactionPage, setTransactionPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [selectedExpenseId, setSelectedExpenseId] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [paletteIndex, setPaletteIndex] = useState(0);
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
  const clients = getClients(state);
  const summary = useMemo(() => getDashboardSummary(state, dateRange), [dateRange, state]);
  const selectedInvoice = invoices.find((invoice) => invoice.id === selectedInvoiceId);
  const selectedExpense = expenses.find((expense) => expense.id === selectedExpenseId);
  const selectedClient = clients.find((client) => client.id === selectedClientId);

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
        const matchesClient = clientFilter === "all" || invoice.clientId === clientFilter;
        const amount = calculateInvoiceTotal(invoice);
        const matchesAmount = (!amountMin || amount >= Number(amountMin)) && (!amountMax || amount <= Number(amountMax));
        return matchesStatus && matchesSearch && matchesClient && matchesAmount && isInDateRange(invoice.issueDate, dateRange);
      })
      .sort((a, b) => {
        if (invoiceSort === "amount") return calculateInvoiceTotal(b) - calculateInvoiceTotal(a);
        if (invoiceSort === "client") return a.client.name.localeCompare(b.client.name);
        if (invoiceSort === "status") return a.status.localeCompare(b.status);
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
  }, [amountMax, amountMin, clientFilter, dateRange, invoiceFilter, invoiceSort, invoices, search]);

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
        const matchesAmount = (!amountMin || expense.amount >= Number(amountMin)) && (!amountMax || expense.amount <= Number(amountMax));
        return matchesCategory && matchesSearch && matchesAmount && isInDateRange(expense.date, dateRange);
      })
      .sort((a, b) => {
        if (expenseSort === "amount") return b.amount - a.amount;
        if (expenseSort === "merchant") return a.merchant.localeCompare(b.merchant);
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
  }, [amountMax, amountMin, dateRange, expenseFilter, expenseSort, expenses, search]);

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();
    return clients.filter((client) => !query || [client.name, client.company, client.email, client.phone].some((value) => value.toLowerCase().includes(query))).sort((a, b) => {
      if (clientSort === "name") return a.name.localeCompare(b.name);
      if (clientSort === "company") return a.company.localeCompare(b.company);
      if (clientSort === "revenue") return getClientFinancials(state, b.id).totalInvoiced - getClientFinancials(state, a.id).totalInvoiced;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [clientSort, clients, search, state]);

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return getTransactions(state, dateRange).filter((transaction) => (transactionType === "all" || transaction.type === transactionType) && (!query || `${transaction.label} ${transaction.detail}`.toLowerCase().includes(query)) && (!amountMin || Math.abs(transaction.amount) >= Number(amountMin)) && (!amountMax || Math.abs(transaction.amount) <= Number(amountMax))).sort((a, b) => {
      if (transactionSort === "amount") return Math.abs(b.amount) - Math.abs(a.amount);
      if (transactionSort === "name") return a.label.localeCompare(b.label);
      return b.date.localeCompare(a.date);
    });
  }, [amountMax, amountMin, dateRange, search, state, transactionSort, transactionType]);

  const paginatedInvoices = useMemo(() => paginate(filteredInvoices, invoicePage, 8), [filteredInvoices, invoicePage]);
  const paginatedExpenses = useMemo(() => paginate(filteredExpenses, expensePage, 8), [expensePage, filteredExpenses]);
  const paginatedClients = useMemo(() => paginate(filteredClients, clientPage, 8), [clientPage, filteredClients]);
  const paginatedTransactions = useMemo(() => paginate(filteredTransactions, transactionPage, 10), [filteredTransactions, transactionPage]);

  const navigate = useCallback((view: View) => {
    setActiveView(view);
    setMobileNavOpen(false);
    setPaletteOpen(false);
  }, []);

  const saveState = useCallback((nextState: FinanceState) => setState(nextState), [setState]);

  const createNewInvoice = useCallback(() => {
    const invoice = emptyInvoice(clients[0]);
    saveState(createInvoice(state, invoice));
    setSelectedInvoiceId(invoice.id);
    navigate("invoices");
    notify({ tone: "success", title: "Invoice created", message: "It is ready to edit." });
  }, [clients, navigate, notify, saveState, state]);

  const createNewExpense = useCallback(() => {
    const expense = emptyExpense();
    saveState(createExpense(state, expense));
    setSelectedExpenseId(expense.id);
    navigate("expenses");
    notify({ tone: "success", title: "Expense added", message: "It is now included in your ledger." });
  }, [navigate, notify, saveState, state]);

  const createNewClient = useCallback(() => {
    const client = emptyClient();
    saveState(createClient(state, client));
    setSelectedClientId(client.id);
    navigate("clients");
    notify({ tone: "info", title: "New client", message: "Add their details to finish the profile." });
  }, [navigate, notify, saveState, state]);

  const toggleTheme = useCallback(() => {
    const next = resolvedTheme === "dark" ? "light" : "dark";
    window.localStorage.setItem("ledgerly-theme", next);
    setThemePreference(next);
    notify({ tone: "info", title: `${next === "dark" ? "Dark" : "Light"} theme enabled` });
  }, [notify, resolvedTheme]);

  const focusRecordSearch = useCallback(() => {
    setPaletteOpen(false);
    window.setTimeout(() => document.getElementById("global-record-search")?.focus(), 50);
  }, []);

  const handleInvoiceChange = (invoice: Invoice) => saveState(updateInvoice(state, invoice));
  const handleExpenseChange = (expense: Expense) => saveState(updateExpense(state, expense));
  const handleClientChange = (client: Client) => saveState(updateClient(state, client));

  const viewCopy: Record<View, { title: string; description: string }> = {
    dashboard: { title: "Good morning, Alex.", description: "Here’s how your business is performing for the selected period." },
    invoices: { title: "Invoices", description: "Create, track, and manage client payments." },
    expenses: { title: "Expenses", description: "Review and organize every business expense." },
    clients: { title: "Clients", description: "Manage relationships, billing details, and revenue history." },
    transactions: { title: "Transactions", description: "A unified view of income and expenses." },
    analytics: { title: "Analytics", description: "Understand revenue, spending, cash flow, and client performance." },
  };
  const { title: activeTitle, description: activeDescription } = viewCopy[activeView];

  const paletteActions = [
    { label: "Create new invoice", hint: "Action", icon: FilePlus2, run: createNewInvoice },
    { label: "Add an expense", hint: "Action", icon: Plus, run: createNewExpense },
    { label: "Add a client", hint: "Action", icon: UserPlus, run: createNewClient },
    { label: "Open analytics", hint: "Navigate", icon: BarChart3, run: () => navigate("analytics") },
    { label: "View invoices", hint: "Navigate", icon: ReceiptText, run: () => navigate("invoices") },
    { label: "View expenses", hint: "Navigate", icon: WalletCards, run: () => navigate("expenses") },
    { label: "View clients", hint: "Navigate", icon: Users, run: () => navigate("clients") },
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
          <ButtonBase className="brand-block" onClick={() => navigate("dashboard")} aria-label="Ledgerly home">
            <span className="brand-mark"><TrendingUp size={18} strokeWidth={2.4} /></span>
            <span className="brand-copy"><strong>Ledgerly</strong><small>Finance workspace</small></span>
          </ButtonBase>
          <IconButton className="icon-button mobile-only" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation">
            <X size={19} />
          </IconButton>
        </div>

        <nav className="nav-stack" aria-label="Ledgerly navigation">
          <p className="nav-label">Workspace</p>
          {navItems.map(({ id, label, icon: Icon }) => (
            <ButtonBase className={activeView === id ? "active" : ""} key={id} onClick={() => navigate(id)}>
              <Icon size={18} />
              <span>{label}</span>
              {id === "invoices" && <em>{invoices.length}</em>}
              {id === "expenses" && <em>{expenses.length}</em>}
              {id === "clients" && <em>{clients.length}</em>}
            </ButtonBase>
          ))}
        </nav>

        <ButtonBase className="command-trigger" onClick={() => setPaletteOpen(true)}>
          <span><Command size={16} /> Quick actions</span>
          <kbd>⌘ K</kbd>
        </ButtonBase>

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

      {mobileNavOpen && <ButtonBase className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}

      <section className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <IconButton className="icon-button menu-button" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation">
              <Menu size={20} />
            </IconButton>
            <div>
              <h1>{activeTitle}</h1>
              <p>{activeDescription}</p>
            </div>
          </div>
          <div className="topbar-actions">
            <div className="search-field">
              <Search size={17} />
              <InputBase id="global-record-search" aria-label="Search records" placeholder="Search records..." value={search} onChange={(event) => setSearch(event.target.value)} />
              <kbd>⌘K</kbd>
            </div>
            <Tooltip title="Quick actions and search (⌘K)" arrow>
              <IconButton className="icon-button header-command-button" onClick={() => setPaletteOpen(true)} aria-label="Open quick actions and search">
                <Command size={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`} arrow>
              <IconButton className="icon-button" onClick={toggleTheme} aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`}>
              {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </IconButton>
            </Tooltip>
            <ButtonBase className="primary-button topbar-cta" onClick={createNewInvoice}>
              <Plus size={17} /> New invoice
            </ButtonBase>
          </div>
        </header>

        {syncError && (
          <div className="feedback-banner error" role="alert">
            <AlertCircle size={18} />
            <div><strong>Cloud sync needs attention</strong><span>{syncError}</span></div>
            <ButtonBase type="button" onClick={() => window.location.reload()}><RefreshCw size={15} /> Retry</ButtonBase>
          </div>
        )}

        <div className="page-stage" key={activeView}>
          {activeView === "dashboard" && <Dashboard summary={summary} analytics={getAnalyticsSummary(state, dateRange)} invoices={invoices} range={dateRange} onRangeChange={setDateRange} onNavigate={navigate} onCreateInvoice={createNewInvoice} />}

          {activeView === "invoices" && (
            <InvoicesView
              invoices={paginatedInvoices.items}
              allInvoicesCount={invoices.length}
              filteredCount={filteredInvoices.length}
              pagination={paginatedInvoices}
              clients={clients}
              range={dateRange}
              clientFilter={clientFilter}
              amountMin={amountMin}
              amountMax={amountMax}
              selectedInvoice={selectedInvoice}
              filter={invoiceFilter}
              sort={invoiceSort}
              hasSearch={Boolean(search)}
              onFilter={setInvoiceFilter}
              onSort={setInvoiceSort}
              onRangeChange={setDateRange}
              onClientFilter={setClientFilter}
              onAmountMin={setAmountMin}
              onAmountMax={setAmountMax}
              onPageChange={setInvoicePage}
              onSelect={setSelectedInvoiceId}
              onCreate={createNewInvoice}
              onExport={() => { exportInvoicesCsv(filteredInvoices); notify({ tone: "success", title: "Invoices exported", message: `${filteredInvoices.length} filtered records downloaded.` }); }}
              onCreateClient={(client) => {
                if (!selectedInvoice) return;
                saveState(updateInvoice(createClient(state, client), linkInvoiceToClient(selectedInvoice, client)));
                notify({ tone: "success", title: "Client created", message: "The invoice is now linked to this client." });
              }}
              onChange={handleInvoiceChange}
              onDelete={() => {
                if (!selectedInvoice) return;
                const nextState = deleteInvoice(state, selectedInvoice.id);
                saveState(nextState);
                setSelectedInvoiceId("");
                notify({ tone: "warning", title: "Invoice deleted" });
              }}
            />
          )}

          {activeView === "expenses" && (
            <ExpensesView
              expenses={paginatedExpenses.items}
              allExpensesCount={expenses.length}
              filteredCount={filteredExpenses.length}
              pagination={paginatedExpenses}
              range={dateRange}
              amountMin={amountMin}
              amountMax={amountMax}
              selectedExpense={selectedExpense}
              filter={expenseFilter}
              sort={expenseSort}
              hasSearch={Boolean(search)}
              onFilter={setExpenseFilter}
              onSort={setExpenseSort}
              onRangeChange={setDateRange}
              onAmountMin={setAmountMin}
              onAmountMax={setAmountMax}
              onPageChange={setExpensePage}
              onSelect={setSelectedExpenseId}
              onCreate={createNewExpense}
              onExport={() => { exportExpensesCsv(filteredExpenses); notify({ tone: "success", title: "Expenses exported", message: `${filteredExpenses.length} filtered records downloaded.` }); }}
              onChange={handleExpenseChange}
              onDelete={() => {
                if (!selectedExpense) return;
                const nextState = deleteExpense(state, selectedExpense.id);
                saveState(nextState);
                setSelectedExpenseId("");
                notify({ tone: "warning", title: "Expense deleted" });
              }}
            />
          )}

          {activeView === "clients" && (
            <ClientsView
              clients={paginatedClients.items}
              allClientsCount={clients.length}
              filteredCount={filteredClients.length}
              pagination={paginatedClients}
              selectedClient={selectedClient}
              state={state}
              sort={clientSort}
              onSort={setClientSort}
              onPageChange={setClientPage}
              onSelect={setSelectedClientId}
              onCreate={createNewClient}
              onExport={() => { exportClientsCsv(filteredClients); notify({ tone: "success", title: "Clients exported", message: `${filteredClients.length} records downloaded.` }); }}
              onChange={handleClientChange}
              onOpenInvoice={(id) => { setSelectedInvoiceId(id); navigate("invoices"); }}
              onDelete={(client) => {
                saveState(deleteClient(state, client.id));
                setSelectedClientId("");
                notify({ tone: "warning", title: "Client deleted", message: "Their invoices were preserved and unlinked." });
              }}
            />
          )}

          {activeView === "transactions" && (
            <TransactionsView
              transactions={paginatedTransactions.items}
              total={filteredTransactions.length}
              pagination={paginatedTransactions}
              range={dateRange}
              type={transactionType}
              sort={transactionSort}
              amountMin={amountMin}
              amountMax={amountMax}
              onRangeChange={setDateRange}
              onType={setTransactionType}
              onSort={setTransactionSort}
              onAmountMin={setAmountMin}
              onAmountMax={setAmountMax}
              onPageChange={setTransactionPage}
              onExport={() => { exportTransactionsCsv(filteredTransactions); notify({ tone: "success", title: "Transactions exported", message: `${filteredTransactions.length} records downloaded.` }); }}
            />
          )}

          {activeView === "analytics" && <AnalyticsView analytics={getAnalyticsSummary(state, dateRange)} range={dateRange} onRangeChange={setDateRange} />}
        </div>
      </section>

      <Dialog open={paletteOpen} onClose={() => setPaletteOpen(false)} fullWidth maxWidth="sm" aria-label="Command palette" slotProps={{ paper: { className: "command-palette" } }}>
            <div className="palette-search"><Search size={19} /><InputBase autoFocus aria-label="Search commands" placeholder="Type a command or search..." value={paletteQuery} onChange={(event) => { setPaletteQuery(event.target.value); setPaletteIndex(0); }} onKeyDown={(event) => { if (event.key === "ArrowDown") { event.preventDefault(); setPaletteIndex((index) => Math.min(index + 1, paletteActions.length - 1)); } else if (event.key === "ArrowUp") { event.preventDefault(); setPaletteIndex((index) => Math.max(index - 1, 0)); } else if (event.key === "Enter" && paletteActions[paletteIndex]) { event.preventDefault(); paletteActions[paletteIndex].run(); } }} /><kbd>ESC</kbd></div>
            <div className="palette-results">
              <p>Quick actions</p>
              {paletteActions.map(({ label, hint, icon: Icon, run }, index) => (
                <ButtonBase className={index === paletteIndex ? "selected" : ""} key={label} onMouseEnter={() => setPaletteIndex(index)} onClick={run}><span><Icon size={18} /><strong>{label}</strong></span><small>{hint}</small></ButtonBase>
              ))}
              {paletteActions.length === 0 && <div className="palette-empty"><Search size={22} /><span>No commands found</span></div>}
            </div>
            <footer><span><kbd>↑</kbd><kbd>↓</kbd> to navigate</span><span><kbd>↵</kbd> to select</span></footer>
      </Dialog>

    </main>
  );
}

function Dashboard({
  summary,
  analytics,
  invoices,
  range,
  onRangeChange,
  onNavigate,
  onCreateInvoice,
}: {
  summary: ReturnType<typeof getDashboardSummary>;
  analytics: ReturnType<typeof getAnalyticsSummary>;
  invoices: Invoice[];
  range: DateRange;
  onRangeChange: (range: DateRange) => void;
  onNavigate: (view: View) => void;
  onCreateInvoice: () => void;
}) {
  const metricIcons: LucideIcon[] = [CircleDollarSign, WalletCards, CalendarDays, TrendingUp];
  const paidShare = Math.max(0, Math.min(100, Math.round((summary.metrics[0].value / Math.max(summary.metrics[3].value, 1)) * 100)));
  const expenseShare = Math.max(0, Math.min(100, Math.round((summary.metrics[1].value / Math.max(summary.metrics[0].value, 1)) * 100)));
  const healthScore = Math.max(8, Math.min(92, 100 - expenseShare));
  const chartValues = [35, 48, 42, 64, 58, 78, 68, 84, 74, 91, 76, 88];
  const chartLabels = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
  const cashPoints = analytics.monthlyRevenue.length ? analytics.monthlyRevenue.slice(-12) : chartLabels.map((month, index) => ({ month, income: chartValues[index], expenses: Math.max(18, chartValues[index] - 26), net: 0 }));
  const maxChartValue = Math.max(1, ...cashPoints.flatMap((point) => [point.income, point.expenses]));

  return (
    <section className="dashboard-grid">
      <div className="page-controls"><DateRangeControl value={range} onChange={onRangeChange} /></div>
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
            <span className="range-caption">{formatDate(range.from)} – {formatDate(range.to)}</span>
          </div>
          <div className="chart-legend"><span><i className="legend-dot purple" />Income</span><span><i className="legend-dot gray" />Expenses</span></div>
          <div className="bar-chart" aria-label="Cash flow bar chart">
            {cashPoints.map((point) => (
              <div className="bar-column" key={point.month} title={`${point.month}: ${formatCurrency(point.income)} income, ${formatCurrency(point.expenses)} expenses`}>
                <div className="bars"><span className="bar expense-bar" style={{ height: `${Math.max(4, (point.expenses / maxChartValue) * 100)}%` }} /><span className="bar income-bar" style={{ height: `${Math.max(4, (point.income / maxChartValue) * 100)}%` }} /></div>
                <small>{point.month.slice(5) || point.month}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="panel financial-health">
          <div className="panel-heading"><div><h2>Financial health</h2><p>Selected period score</p></div><span className="icon-soft"><BarChart3 size={17} /></span></div>
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
          <div className="panel-heading"><div><h2>Recent activity</h2><p>Your latest invoice and expense updates</p></div><ButtonBase className="text-button" type="button" onClick={() => onNavigate("invoices")}>View all <ArrowUpRight size={15} /></ButtonBase></div>
          {summary.recentActivity.length ? (
            <div className="activity-list">
              {summary.recentActivity.map((activity) => (
                <ButtonBase className="activity-row" key={`${activity.type}-${activity.id}`} type="button" onClick={() => onNavigate(activity.type === "income" ? "invoices" : "expenses")}>
                  <span className={`activity-icon ${activity.type}`}>{activity.type === "income" ? <FileText size={17} /> : <WalletCards size={17} />}</span>
                  <span className="activity-copy"><strong>{activity.label}</strong><small>{activity.detail}</small></span>
                  <span className={activity.amount >= 0 ? "activity-amount positive" : "activity-amount"}>{activity.amount >= 0 ? "+" : "−"}{formatCurrency(Math.abs(activity.amount))}</span>
                </ButtonBase>
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
          <ButtonBase className="secondary-button full-width" type="button" onClick={() => onNavigate("expenses")}>Review expenses</ButtonBase>
        </article>
      </div>
    </section>
  );
}

function InvoicesView({
  invoices,
  allInvoicesCount,
  filteredCount,
  pagination,
  clients,
  range,
  clientFilter,
  amountMin,
  amountMax,
  selectedInvoice,
  filter,
  sort,
  hasSearch,
  onFilter,
  onSort,
  onRangeChange,
  onClientFilter,
  onAmountMin,
  onAmountMax,
  onPageChange,
  onSelect,
  onCreate,
  onCreateClient,
  onExport,
  onChange,
  onDelete,
}: {
  invoices: Invoice[];
  allInvoicesCount: number;
  filteredCount: number;
  pagination: PaginatedResult<Invoice>;
  clients: Client[];
  range: DateRange;
  clientFilter: string;
  amountMin: string;
  amountMax: string;
  selectedInvoice?: Invoice;
  filter: InvoiceStatus | "all";
  sort: InvoiceSort;
  hasSearch: boolean;
  onFilter: (status: InvoiceStatus | "all") => void;
  onSort: (sort: InvoiceSort) => void;
  onRangeChange: (range: DateRange) => void;
  onClientFilter: (id: string) => void;
  onAmountMin: (value: string) => void;
  onAmountMax: (value: string) => void;
  onPageChange: (page: number) => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onCreateClient: (client: Client) => void;
  onExport: () => void;
  onChange: (invoice: Invoice) => void;
  onDelete: () => void;
}) {
  return (
    <section className={selectedInvoice ? "records-page detail-open" : "records-page"}>
      <div className="records-main">
        <div className="records-toolbar">
          <div className="filter-tabs" aria-label="Invoice status filters">
            {invoiceStatuses.map((status) => (
              <ButtonBase className={filter === status ? "selected" : ""} key={status} type="button" onClick={() => onFilter(status)}>{status}<span>{status === "all" ? allInvoicesCount : ""}</span></ButtonBase>
            ))}
          </div>
          <div className="toolbar-actions">
            <ButtonBase className="secondary-button" type="button" onClick={onExport}><Download size={15} /> Export</ButtonBase>
            <AppSelect ariaLabel="Sort invoices" value={sort} onChange={onSort} icon={<ArrowUpDown size={15} />} options={[{ value: "due", label: "Due date" }, { value: "amount", label: "Amount" }, { value: "client", label: "Client" }, { value: "status", label: "Status" }]} />
            <ButtonBase className="primary-button" type="button" onClick={onCreate}><Plus size={16} /> New invoice</ButtonBase>
          </div>
        </div>

        <FilterBar>
          <DateRangeControl value={range} onChange={onRangeChange} />
          <AppSelect ariaLabel="Filter by client" value={clientFilter} onChange={onClientFilter} compact icon={<Users size={14} />} options={[{ value: "all", label: "All clients" }, ...clients.map((client) => ({ value: client.id, label: client.company || client.name }))]} />
          <AmountRange min={amountMin} max={amountMax} onMin={onAmountMin} onMax={onAmountMax} />
        </FilterBar>

        <article className="table-card">
          {invoices.length ? (
            <div className="table-scroll">
              <Table className="data-table">
                <TableHead><TableRow><TableCell component="th">Invoice</TableCell><TableCell component="th">Client</TableCell><TableCell component="th">Due date</TableCell><TableCell component="th">Status</TableCell><TableCell component="th" className="numeric">Amount</TableCell><TableCell component="th"><span className="sr-only">Actions</span></TableCell></TableRow></TableHead>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow className={selectedInvoice?.id === invoice.id ? "selected-row" : ""} key={invoice.id} onClick={() => onSelect(invoice.id)}>
                      <TableCell data-label="Invoice"><ButtonBase className="table-primary" type="button" onClick={() => onSelect(invoice.id)}>{invoice.invoiceNumber}</ButtonBase></TableCell>
                      <TableCell data-label="Client"><strong>{invoice.client.company || invoice.client.name}</strong><small>{invoice.client.email}</small></TableCell>
                      <TableCell data-label="Due date">{formatDate(invoice.dueDate)}</TableCell>
                      <TableCell data-label="Status"><StatusBadge status={invoice.status} /></TableCell>
                      <TableCell data-label="Amount" className="numeric amount-cell">{formatCurrency(calculateInvoiceTotal(invoice))}</TableCell>
                      <TableCell><ButtonBase className="row-action" type="button" onClick={(event) => { event.stopPropagation(); onSelect(invoice.id); }} aria-label={`Edit ${invoice.invoiceNumber}`}><MoreHorizontal size={18} /></ButtonBase></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState icon={FileText} title={hasSearch || filter !== "all" ? "No matching invoices" : "No invoices yet"} description={hasSearch || filter !== "all" ? "Try changing your search or status filter." : "Create a polished invoice and start tracking what you're owed."} action="Create invoice" onAction={onCreate} />
          )}
          {invoices.length > 0 && <Pagination page={pagination.page} pageCount={pagination.pageCount} total={filteredCount} pageSize={pagination.pageSize} onPageChange={onPageChange} />}
        </article>
      </div>

      {selectedInvoice && <InvoiceEditor invoice={selectedInvoice} clients={clients} onCreateClient={onCreateClient} onChange={onChange} onDelete={onDelete} onClose={() => onSelect("")} />}
    </section>
  );
}

function ExpensesView({
  expenses,
  allExpensesCount,
  filteredCount,
  pagination,
  range,
  amountMin,
  amountMax,
  selectedExpense,
  filter,
  sort,
  hasSearch,
  onFilter,
  onSort,
  onRangeChange,
  onAmountMin,
  onAmountMax,
  onPageChange,
  onSelect,
  onCreate,
  onExport,
  onChange,
  onDelete,
}: {
  expenses: Expense[];
  allExpensesCount: number;
  filteredCount: number;
  pagination: PaginatedResult<Expense>;
  range: DateRange;
  amountMin: string;
  amountMax: string;
  selectedExpense?: Expense;
  filter: ExpenseCategory | "all";
  sort: ExpenseSort;
  hasSearch: boolean;
  onFilter: (category: ExpenseCategory | "all") => void;
  onSort: (sort: ExpenseSort) => void;
  onRangeChange: (range: DateRange) => void;
  onAmountMin: (value: string) => void;
  onAmountMax: (value: string) => void;
  onPageChange: (page: number) => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onExport: () => void;
  onChange: (expense: Expense) => void;
  onDelete: () => void;
}) {
  return (
    <section className={selectedExpense ? "records-page detail-open" : "records-page"}>
      <div className="records-main">
        <div className="records-toolbar">
          <div className="filter-tabs category-tabs" aria-label="Expense category filters">
            {expenseCategories.map((category) => <ButtonBase className={filter === category ? "selected" : ""} key={category} type="button" onClick={() => onFilter(category)}>{category}<span>{category === "all" ? allExpensesCount : ""}</span></ButtonBase>)}
          </div>
          <div className="toolbar-actions">
            <ButtonBase className="secondary-button" type="button" onClick={onExport}><Download size={15} /> Export</ButtonBase>
            <AppSelect ariaLabel="Sort expenses" value={sort} onChange={onSort} icon={<SlidersHorizontal size={15} />} options={[{ value: "date", label: "Recent first" }, { value: "amount", label: "Amount" }, { value: "merchant", label: "Merchant" }]} />
            <ButtonBase className="primary-button" type="button" onClick={onCreate}><Plus size={16} /> Add expense</ButtonBase>
          </div>
        </div>

        <FilterBar><DateRangeControl value={range} onChange={onRangeChange} /><AmountRange min={amountMin} max={amountMax} onMin={onAmountMin} onMax={onAmountMax} /></FilterBar>

        <article className="table-card">
          {expenses.length ? (
            <div className="table-scroll">
              <Table className="data-table">
                <TableHead><TableRow><TableCell component="th">Merchant</TableCell><TableCell component="th">Category</TableCell><TableCell component="th">Date</TableCell><TableCell component="th">Payment method</TableCell><TableCell component="th" className="numeric">Amount</TableCell><TableCell component="th"><span className="sr-only">Actions</span></TableCell></TableRow></TableHead>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow className={selectedExpense?.id === expense.id ? "selected-row" : ""} key={expense.id} onClick={() => onSelect(expense.id)}>
                      <TableCell data-label="Merchant"><ButtonBase className="table-primary" type="button" onClick={() => onSelect(expense.id)}>{expense.merchant}</ButtonBase><small>{expense.note}</small></TableCell>
                      <TableCell data-label="Category"><span className="category-badge">{expense.category}</span></TableCell>
                      <TableCell data-label="Date">{formatDate(expense.date)}</TableCell>
                      <TableCell data-label="Payment">{expense.paymentMethod}</TableCell>
                      <TableCell data-label="Amount" className="numeric amount-cell">{formatCurrency(expense.amount)}</TableCell>
                      <TableCell><ButtonBase className="row-action" type="button" onClick={(event) => { event.stopPropagation(); onSelect(expense.id); }} aria-label={`Edit ${expense.merchant}`}><MoreHorizontal size={18} /></ButtonBase></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState icon={WalletCards} title={hasSearch || filter !== "all" ? "No matching expenses" : "No expenses yet"} description={hasSearch || filter !== "all" ? "Try changing your search or category filter." : "Add your first expense to understand where your money goes."} action="Add expense" onAction={onCreate} />
          )}
          {expenses.length > 0 && <Pagination page={pagination.page} pageCount={pagination.pageCount} total={filteredCount} pageSize={pagination.pageSize} onPageChange={onPageChange} />}
        </article>
      </div>

      {selectedExpense && <ExpenseEditor expense={selectedExpense} onChange={onChange} onDelete={onDelete} onClose={() => onSelect("")} />}
    </section>
  );
}

function ClientsView({
  clients,
  allClientsCount,
  filteredCount,
  pagination,
  selectedClient,
  state,
  sort,
  onSort,
  onPageChange,
  onSelect,
  onCreate,
  onExport,
  onChange,
  onOpenInvoice,
  onDelete,
}: {
  clients: Client[];
  allClientsCount: number;
  filteredCount: number;
  pagination: PaginatedResult<Client>;
  selectedClient?: Client;
  state: FinanceState;
  sort: ClientSort;
  onSort: (sort: ClientSort) => void;
  onPageChange: (page: number) => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onExport: () => void;
  onChange: (client: Client) => void;
  onOpenInvoice: (id: string) => void;
  onDelete: (client: Client) => void;
}) {
  return (
    <section className={selectedClient ? "records-page detail-open" : "records-page"}>
      <div className="records-main">
        <div className="records-toolbar">
          <div className="filter-tabs"><ButtonBase className="selected" type="button">All clients <span>{allClientsCount}</span></ButtonBase></div>
          <div className="toolbar-actions">
            <ButtonBase className="secondary-button" type="button" onClick={onExport}><Download size={15} /> Export</ButtonBase>
            <AppSelect ariaLabel="Sort clients" value={sort} onChange={onSort} icon={<ArrowUpDown size={15} />} options={[{ value: "created", label: "Recently added" }, { value: "name", label: "Contact name" }, { value: "company", label: "Company" }, { value: "revenue", label: "Total invoiced" }]} />
            <ButtonBase className="primary-button" type="button" onClick={onCreate}><UserPlus size={16} /> Add client</ButtonBase>
          </div>
        </div>
        <article className="table-card">
          {clients.length ? <div className="table-scroll"><Table className="data-table clients-table"><TableHead><TableRow><TableCell component="th">Client</TableCell><TableCell component="th">Contact</TableCell><TableCell component="th">Invoices</TableCell><TableCell component="th" className="numeric">Total invoiced</TableCell><TableCell component="th" className="numeric">Outstanding</TableCell><TableCell component="th"><span className="sr-only">Actions</span></TableCell></TableRow></TableHead><TableBody>{clients.map((client) => {
            const financials = getClientFinancials(state, client.id);
            return <TableRow className={selectedClient?.id === client.id ? "selected-row" : ""} key={client.id} onClick={() => onSelect(client.id)}><TableCell data-label="Client"><ButtonBase className="table-primary" type="button" onClick={() => onSelect(client.id)}>{client.company || client.name}</ButtonBase><small>{client.company ? client.name : client.city}</small></TableCell><TableCell data-label="Contact"><strong>{client.email}</strong><small>{client.phone || "No phone"}</small></TableCell><TableCell data-label="Invoices">{financials.invoices.length}</TableCell><TableCell data-label="Total invoiced" className="numeric amount-cell">{formatCurrency(financials.totalInvoiced)}</TableCell><TableCell data-label="Outstanding" className="numeric amount-cell outstanding-cell">{formatCurrency(financials.outstandingAmount)}</TableCell><TableCell><ButtonBase className="row-action" type="button" onClick={(event) => { event.stopPropagation(); onSelect(client.id); }} aria-label={`Edit ${client.company || client.name}`}><MoreHorizontal size={18} /></ButtonBase></TableCell></TableRow>;
          })}</TableBody></Table></div> : <EmptyState icon={Users} title="No clients yet" description="Create your first client profile to link invoices and track revenue history." action="Add client" onAction={onCreate} />}
          {clients.length > 0 && <Pagination page={pagination.page} pageCount={pagination.pageCount} total={filteredCount} pageSize={pagination.pageSize} onPageChange={onPageChange} />}
        </article>
      </div>
      {selectedClient && <ClientDetail client={selectedClient} state={state} onChange={onChange} onClose={() => onSelect("")} onOpenInvoice={onOpenInvoice} onDelete={() => onDelete(selectedClient)} />}
    </section>
  );
}

function ClientDetail({ client, state, onChange, onClose, onOpenInvoice, onDelete }: { client: Client; state: FinanceState; onChange: (client: Client) => void; onClose: () => void; onOpenInvoice: (id: string) => void; onDelete: () => void }) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const financials = getClientFinancials(state, client.id);
  return (
    <aside className="detail-panel client-detail" aria-label="Client details">
      <div className="detail-header"><div><span className="eyebrow">Client details</span><h2>{client.company || client.name || "New client"}</h2></div><ButtonBase className="icon-button" type="button" onClick={onClose} aria-label="Close client"><X size={18} /></ButtonBase></div>
      <div className="detail-scroll">
        <div className="client-summary-grid"><div><span>Total invoiced</span><strong>{formatCurrency(financials.totalInvoiced)}</strong></div><div><span>Paid</span><strong className="positive">{formatCurrency(financials.paidAmount)}</strong></div><div><span>Outstanding</span><strong className="warning-text">{formatCurrency(financials.outstandingAmount)}</strong></div></div>
        <div className="form-section"><h3>Contact information</h3><div className="form-grid">
          <Field label="Contact name"><AppInput value={client.name} placeholder="Full name" onChange={(event) => onChange({ ...client, name: event.target.value })} /></Field>
          <Field label="Company"><AppInput value={client.company} placeholder="Company name" onChange={(event) => onChange({ ...client, company: event.target.value })} /></Field>
          <Field label="Email"><AppInput type="email" value={client.email} placeholder="name@company.com" onChange={(event) => onChange({ ...client, email: event.target.value })} /></Field>
          <Field label="Phone"><AppInput type="tel" value={client.phone} placeholder="+91 98765 43210" onChange={(event) => onChange({ ...client, phone: event.target.value })} /></Field>
          <Field label="City"><AppInput value={client.city} onChange={(event) => onChange({ ...client, city: event.target.value })} /></Field>
          <Field label="Created date"><AppInput type="date" value={client.createdAt.slice(0, 10)} onChange={(event) => onChange({ ...client, createdAt: new Date(`${event.target.value}T00:00:00.000Z`).toISOString() })} /></Field>
        </div></div>
        <div className="form-section"><div className="form-grid single"><Field label="Billing address"><AppTextarea value={client.billingAddress} onChange={(event) => onChange({ ...client, billingAddress: event.target.value })} /></Field><Field label="Notes"><AppTextarea value={client.notes} onChange={(event) => onChange({ ...client, notes: event.target.value })} /></Field></div></div>
        <div className="form-section"><div className="section-title"><h3>Invoice history</h3><span className="record-count">{financials.invoices.length} records</span></div>{financials.invoices.length ? <div className="client-invoice-list">{financials.invoices.sort((a, b) => b.issueDate.localeCompare(a.issueDate)).map((invoice) => <ButtonBase type="button" key={invoice.id} onClick={() => onOpenInvoice(invoice.id)}><span><strong>{invoice.invoiceNumber}</strong><small>{formatDate(invoice.issueDate)}</small></span><StatusBadge status={invoice.status} /><em>{formatCurrency(calculateInvoiceTotal(invoice))}</em></ButtonBase>)}</div> : <div className="inline-empty"><FileText size={18} /><span>No invoices linked to this client yet.</span></div>}</div>
      </div>
      <div className="detail-footer"><ButtonBase className="danger-button" type="button" onClick={() => setDeleteOpen(true)}><Trash2 size={15} /> Delete</ButtonBase><span><CheckCircle2 size={14} /> Changes save automatically</span></div>
      <ConfirmDialog open={deleteOpen} title="Delete this client?" description={`Invoices for ${client.company || client.name || "this client"} will be preserved but no longer linked. This action cannot be undone.`} onClose={() => setDeleteOpen(false)} onConfirm={() => { setDeleteOpen(false); onDelete(); }} />
    </aside>
  );
}

function TransactionsView({ transactions, total, pagination, range, type, sort, amountMin, amountMax, onRangeChange, onType, onSort, onAmountMin, onAmountMax, onPageChange, onExport }: { transactions: Transaction[]; total: number; pagination: PaginatedResult<Transaction>; range: DateRange; type: TransactionType | "all"; sort: TransactionSort; amountMin: string; amountMax: string; onRangeChange: (range: DateRange) => void; onType: (type: TransactionType | "all") => void; onSort: (sort: TransactionSort) => void; onAmountMin: (value: string) => void; onAmountMax: (value: string) => void; onPageChange: (page: number) => void; onExport: () => void }) {
  return <section className="records-page"><div className="records-main"><div className="records-toolbar"><div className="filter-tabs" aria-label="Transaction type filters">{(["all", "income", "expense"] as const).map((item) => <ButtonBase className={type === item ? "selected" : ""} key={item} type="button" onClick={() => onType(item)}>{item}</ButtonBase>)}</div><div className="toolbar-actions"><ButtonBase className="secondary-button" type="button" onClick={onExport}><Download size={15} /> Export</ButtonBase><AppSelect ariaLabel="Sort transactions" value={sort} onChange={onSort} icon={<ArrowUpDown size={15} />} options={[{ value: "date", label: "Recent first" }, { value: "amount", label: "Amount" }, { value: "name", label: "Name" }]} /></div></div><FilterBar><DateRangeControl value={range} onChange={onRangeChange} /><AmountRange min={amountMin} max={amountMax} onMin={onAmountMin} onMax={onAmountMax} /></FilterBar><article className="table-card">{transactions.length ? <div className="table-scroll"><Table className="data-table"><TableHead><TableRow><TableCell component="th">Transaction</TableCell><TableCell component="th">Type</TableCell><TableCell component="th">Date</TableCell><TableCell component="th">Detail</TableCell><TableCell component="th" className="numeric">Amount</TableCell></TableRow></TableHead><TableBody>{transactions.map((transaction) => <TableRow key={`${transaction.type}-${transaction.id}`}><TableCell data-label="Transaction"><strong>{transaction.label}</strong></TableCell><TableCell data-label="Type"><span className={`transaction-badge ${transaction.type}`}>{transaction.type}</span></TableCell><TableCell data-label="Date">{formatDate(transaction.date)}</TableCell><TableCell data-label="Detail">{transaction.detail}</TableCell><TableCell data-label="Amount" className={`numeric amount-cell ${transaction.amount >= 0 ? "positive" : ""}`}>{transaction.amount >= 0 ? "+" : "−"}{formatCurrency(Math.abs(transaction.amount))}</TableCell></TableRow>)}</TableBody></Table></div> : <div className="empty-state no-action"><Inbox size={25} /><h3>No matching transactions</h3><p>Adjust the date, type, amount, or search filters.</p></div>}<Pagination page={pagination.page} pageCount={pagination.pageCount} total={total} pageSize={pagination.pageSize} onPageChange={onPageChange} /></article></div></section>;
}

function AnalyticsView({ analytics, range, onRangeChange }: { analytics: AnalyticsSummary; range: DateRange; onRangeChange: (range: DateRange) => void }) {
  const maxMonthly = Math.max(1, ...analytics.monthlyRevenue.flatMap((point) => [point.income, point.expenses]));
  const expenseTotal = Math.max(1, analytics.expenses);
  const invoiceTotal = Math.max(1, analytics.invoiceStatusBreakdown.reduce((sum, item) => sum + item.value, 0));
  const metrics: Array<{ label: string; value: number; icon: LucideIcon; tone: string }> = [
    ["Paid income", analytics.income, CircleDollarSign, "income"],
    ["Expenses", analytics.expenses, WalletCards, "expense"],
    ["Net cash flow", analytics.netCashFlow, TrendingUp, "neutral"],
    ["Outstanding", analytics.outstanding, CalendarDays, "warning"],
  ].map(([label, value, icon, tone]) => ({ label: String(label), value: Number(value), icon: icon as LucideIcon, tone: String(tone) }));
  return <section className="analytics-page"><div className="page-controls"><DateRangeControl value={range} onChange={onRangeChange} /></div><div className="metric-grid analytics-metrics">{metrics.map(({ label, value, icon: Icon, tone }) => <article className={`metric-card ${tone}`} key={label}><div className="metric-top"><span>{label}</span><span className="metric-icon"><Icon size={17} /></span></div><strong>{formatCurrency(value)}</strong><p className="metric-helper">Selected date range</p></article>)}</div><div className="analytics-content-grid"><article className="panel wide-chart"><div className="panel-heading"><div><h2>Monthly revenue</h2><p>Paid income compared with expenses</p></div><span className="icon-soft"><BarChart3 size={17} /></span></div>{analytics.monthlyRevenue.length ? <div className="bar-chart analytics-bars">{analytics.monthlyRevenue.map((point) => <div className="bar-column" key={point.month} title={`${point.month}: ${formatCurrency(point.income)} income`}><div className="bars"><span className="bar expense-bar" style={{ height: `${Math.max(4, point.expenses / maxMonthly * 100)}%` }} /><span className="bar income-bar" style={{ height: `${Math.max(4, point.income / maxMonthly * 100)}%` }} /></div><small>{point.month.slice(5)}</small></div>)}</div> : <ChartEmpty />}</article><article className="panel"><div className="panel-heading"><div><h2>Paid vs outstanding</h2><p>Invoice collection balance</p></div><span className="icon-soft"><PieChart size={17} /></span></div><DonutChart primary={analytics.paid} secondary={analytics.outstanding} primaryLabel="Paid" secondaryLabel="Outstanding" /></article><article className="panel"><div className="panel-heading"><div><h2>Expense breakdown</h2><p>Spend by category</p></div></div>{analytics.expenseBreakdown.length ? <div className="breakdown-list">{analytics.expenseBreakdown.map((item) => <div key={item.label}><span><strong>{item.label}</strong><small>{formatCurrency(item.value)}</small></span><i><b style={{ width: `${item.value / expenseTotal * 100}%` }} /></i></div>)}</div> : <ChartEmpty />}</article><article className="panel"><div className="panel-heading"><div><h2>Invoice status</h2><p>Value and count by status</p></div></div>{analytics.invoiceStatusBreakdown.length ? <div className="breakdown-list">{analytics.invoiceStatusBreakdown.map((item) => <div key={item.label}><span><StatusBadge status={item.label} /><small>{item.count} · {formatCurrency(item.value)}</small></span><i><b className={item.label} style={{ width: `${item.value / invoiceTotal * 100}%` }} /></i></div>)}</div> : <ChartEmpty />}</article><article className="panel top-clients-panel"><div className="panel-heading"><div><h2>Top clients by revenue</h2><p>Paid invoice performance</p></div></div>{analytics.topClients.length ? <div className="top-client-list">{analytics.topClients.map((item, index) => <div key={item.client.id}><span className="rank">{index + 1}</span><span><strong>{item.client.company || item.client.name}</strong><small>{item.invoiceCount} paid invoice{item.invoiceCount === 1 ? "" : "s"}</small></span><em>{formatCurrency(item.revenue)}</em></div>)}</div> : <ChartEmpty />}</article></div></section>;
}

function DonutChart({ primary, secondary, primaryLabel, secondaryLabel }: { primary: number; secondary: number; primaryLabel: string; secondaryLabel: string }) {
  const total = Math.max(1, primary + secondary);
  const percentage = Math.round(primary / total * 100);
  return <div className="donut-layout"><div className="donut" style={{ background: `conic-gradient(var(--brand) 0 ${percentage}%, var(--warning) ${percentage}% 100%)` }}><span><strong>{percentage}%</strong><small>collected</small></span></div><div className="donut-legend"><span><i className="legend-dot purple" />{primaryLabel}<strong>{formatCurrency(primary)}</strong></span><span><i className="legend-dot warning-dot" />{secondaryLabel}<strong>{formatCurrency(secondary)}</strong></span></div></div>;
}

function ChartEmpty() {
  return <div className="chart-empty"><BarChart3 size={22} /><span>No data in this range</span><small>Try a wider date range.</small></div>;
}

function FilterBar({ children }: { children: React.ReactNode }) {
  return <div className="filter-bar"><SlidersHorizontal size={15} />{children}</div>;
}

function AmountRange({ min, max, onMin, onMax }: { min: string; max: string; onMin: (value: string) => void; onMax: (value: string) => void }) {
  return <div className="amount-range"><span>Amount</span><AppInput ariaLabel="Minimum amount" min="0" type="number" placeholder="Min" value={min} onChange={(event) => onMin(event.target.value)} /><i>–</i><AppInput ariaLabel="Maximum amount" min="0" type="number" placeholder="Max" value={max} onChange={(event) => onMax(event.target.value)} /></div>;
}

function QuickClientDialog({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (client: Client) => void }) {
  const [client, setClient] = useState<Client>(() => emptyClient());
  const valid = client.name.trim() && client.email.trim();
  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="new-client-title" slotProps={{ paper: { className: "form-dialog" } }}><div className="dialog-heading"><div><span className="eyebrow">Quick create</span><h2 id="new-client-title">Add a client</h2></div><IconButton className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={17} /></IconButton></div><p>Create the client without leaving this invoice. Their billing details will be linked automatically.</p><div className="form-grid"><Field label="Contact name"><AppInput autoFocus value={client.name} onChange={(event) => setClient({ ...client, name: event.target.value })} /></Field><Field label="Company"><AppInput value={client.company} onChange={(event) => setClient({ ...client, company: event.target.value })} /></Field><Field label="Email"><AppInput type="email" value={client.email} onChange={(event) => setClient({ ...client, email: event.target.value })} /></Field><Field label="Phone"><AppInput type="tel" value={client.phone} onChange={(event) => setClient({ ...client, phone: event.target.value })} /></Field></div><Field label="Billing address"><AppTextarea value={client.billingAddress} onChange={(event) => setClient({ ...client, billingAddress: event.target.value })} /></Field><div className="dialog-actions"><ButtonBase className="secondary-button" onClick={onClose}>Cancel</ButtonBase><ButtonBase className="primary-button" disabled={!valid} onClick={() => { onCreate(client); setClient(emptyClient()); }}>Create and select</ButtonBase></div></Dialog>;
}

function InvoiceEditor({ invoice, clients, onCreateClient, onChange, onDelete, onClose }: { invoice: Invoice; clients: Client[]; onCreateClient: (client: Client) => void; onChange: (invoice: Invoice) => void; onDelete: () => void; onClose: () => void }) {
  const { notify } = useNotifications();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const subtotal = calculateInvoiceSubtotal(invoice.items);
  const tax = calculateInvoiceTax(invoice.items);
  const total = calculateInvoiceTotal(invoice);
  const updateItem = (itemId: string, nextItem: Partial<InvoiceLineItem>) => onChange({ ...invoice, items: invoice.items.map((item) => item.id === itemId ? { ...item, ...nextItem } : item) });

  return (
    <aside className="detail-panel invoice-detail" aria-label="Invoice editor">
      <div className="detail-header"><div><span className="eyebrow">Invoice detail</span><h2>{invoice.invoiceNumber}</h2></div><ButtonBase className="icon-button" type="button" onClick={onClose} aria-label="Close invoice"><X size={18} /></ButtonBase></div>
      <div className="detail-scroll">
        <div className="detail-summary"><div><span>Total amount</span><strong>{formatCurrency(total)}</strong></div><StatusBadge status={invoice.status} /></div>
        <div className="form-section"><div className="section-title"><h3>Client & invoice</h3><ButtonBase className="text-button" type="button" onClick={() => setClientDialogOpen(true)}><UserPlus size={14} /> New client</ButtonBase></div><div className="form-grid">
          <Field label="Invoice number"><AppInput value={invoice.invoiceNumber} onChange={(event) => onChange({ ...invoice, invoiceNumber: event.target.value })} /></Field>
          <Field label="Status"><AppSelect ariaLabel="Invoice status" value={invoice.status} onChange={(status) => onChange({ ...invoice, status })} fullWidth options={[{ value: "draft", label: "Draft" }, { value: "sent", label: "Sent" }, { value: "paid", label: "Paid" }, { value: "overdue", label: "Overdue" }]} /></Field>
          <Field label="Client"><AppSelect ariaLabel="Invoice client" value={invoice.clientId ?? ""} onChange={(clientId) => { const client = clients.find((item) => item.id === clientId); if (client) onChange(linkInvoiceToClient(invoice, client)); }} fullWidth options={[{ value: "", label: "Select client", disabled: true }, ...clients.map((client) => ({ value: client.id, label: client.company ? `${client.company} — ${client.name}` : client.name }))]} /></Field>
          <Field label="Client email"><AppInput type="email" value={invoice.client.email} readOnly /></Field>
          <Field label="Issue date"><AppInput type="date" value={invoice.issueDate} onChange={(event) => onChange({ ...invoice, issueDate: event.target.value })} /></Field>
          <Field label="Due date"><AppInput type="date" value={invoice.dueDate} onChange={(event) => onChange({ ...invoice, dueDate: event.target.value })} /></Field>
        </div></div>
        <div className="form-section"><div className="section-title"><h3>Line items</h3><ButtonBase className="text-button" type="button" onClick={() => onChange({ ...invoice, items: [...invoice.items, { id: createId("item"), description: "New line item", quantity: 1, rate: 1000, taxRate: 18 }] })}><Plus size={14} /> Add line</ButtonBase></div>
          <div className="line-items">{invoice.items.map((item) => <div className="line-item" key={item.id}><AppInput ariaLabel="Item description" value={item.description} onChange={(event) => updateItem(item.id, { description: event.target.value })} /><div><AppInput ariaLabel="Quantity" min="1" type="number" value={item.quantity} onChange={(event) => updateItem(item.id, { quantity: Number(event.target.value) })} /><AppInput ariaLabel="Rate" min="0" type="number" value={item.rate} onChange={(event) => updateItem(item.id, { rate: Number(event.target.value) })} /><AppInput ariaLabel="Tax rate" min="0" type="number" value={item.taxRate} onChange={(event) => updateItem(item.id, { taxRate: Number(event.target.value) })} /><ButtonBase className="icon-button danger-icon" type="button" onClick={() => onChange({ ...invoice, items: invoice.items.filter((line) => line.id !== item.id) })} aria-label="Remove line item"><Trash2 size={15} /></ButtonBase></div></div>)}</div>
        </div>
        <div className="form-section"><div className="form-grid"><Field label="Discount"><AppInput min="0" type="number" value={invoice.discount} onChange={(event) => onChange({ ...invoice, discount: Number(event.target.value) })} /></Field><Field label="Notes"><AppTextarea value={invoice.notes} onChange={(event) => onChange({ ...invoice, notes: event.target.value })} /></Field></div></div>
        <div className="invoice-preview">
          <div className="preview-header"><span className="brand-mark small"><TrendingUp size={13} /></span><div><strong>Ledgerly</strong><small>{invoice.invoiceNumber}</small></div><ButtonBase className="icon-button" type="button" onClick={() => void downloadInvoicePdf(invoice).then(() => notify({ tone: "success", title: "Invoice PDF downloaded" })).catch(() => notify({ tone: "error", title: "PDF download failed", message: "Please try again." }))} aria-label="Download invoice PDF"><Download size={16} /></ButtonBase><ButtonBase className="icon-button" type="button" onClick={() => window.print()} aria-label="Print invoice"><Printer size={16} /></ButtonBase></div>
          <div className="preview-bill"><span>Bill to</span><strong>{invoice.client.company || invoice.client.name}</strong><small>{invoice.client.name} · {invoice.client.email}</small></div>
          <div className="preview-lines">{invoice.items.map((item) => <div key={item.id}><span>{item.description}<small>{item.quantity} × {formatCurrency(item.rate)}</small></span><strong>{formatCurrency(item.quantity * item.rate)}</strong></div>)}</div>
          <div className="totals-box"><span>Subtotal <strong>{formatCurrency(subtotal)}</strong></span><span>Tax <strong>{formatCurrency(tax)}</strong></span><span>Discount <strong>−{formatCurrency(invoice.discount)}</strong></span><span className="grand-total">Total <strong>{formatCurrency(total)}</strong></span></div>
        </div>
      </div>
      <div className="detail-footer"><ButtonBase className="danger-button" type="button" onClick={() => setDeleteOpen(true)}><Trash2 size={15} /> Delete</ButtonBase><span><CheckCircle2 size={14} /> Changes save automatically</span></div>
      <ConfirmDialog open={deleteOpen} title="Delete this invoice?" description="This permanently removes the invoice and its line items. This action cannot be undone." onClose={() => setDeleteOpen(false)} onConfirm={() => { setDeleteOpen(false); onDelete(); }} />
      <QuickClientDialog open={clientDialogOpen} onClose={() => setClientDialogOpen(false)} onCreate={(client) => { onCreateClient(client); setClientDialogOpen(false); }} />
    </aside>
  );
}

function ExpenseEditor({ expense, onChange, onDelete, onClose }: { expense: Expense; onChange: (expense: Expense) => void; onDelete: () => void; onClose: () => void }) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  return (
    <aside className="detail-panel" aria-label="Expense editor">
      <div className="detail-header"><div><span className="eyebrow">Expense detail</span><h2>{expense.merchant}</h2></div><ButtonBase className="icon-button" type="button" onClick={onClose} aria-label="Close expense"><X size={18} /></ButtonBase></div>
      <div className="detail-scroll">
        <div className="expense-amount"><span>Tracked spend</span><strong>{formatCurrency(expense.amount)}</strong><small>{expense.category} · {expense.paymentMethod}</small></div>
        <div className="form-section"><h3>Expense information</h3><div className="form-grid single">
          <Field label="Merchant"><AppInput value={expense.merchant} onChange={(event) => onChange({ ...expense, merchant: event.target.value })} /></Field>
          <Field label="Amount"><AppInput min="0" type="number" value={expense.amount} onChange={(event) => onChange({ ...expense, amount: Number(event.target.value) })} /></Field>
          <Field label="Category"><AppSelect ariaLabel="Expense category" value={expense.category} onChange={(category) => onChange({ ...expense, category })} fullWidth options={expenseCategories.filter((category): category is ExpenseCategory => category !== "all").map((category) => ({ value: category, label: category }))} /></Field>
          <Field label="Payment method"><AppSelect ariaLabel="Payment method" value={expense.paymentMethod} onChange={(paymentMethod) => onChange({ ...expense, paymentMethod })} fullWidth options={paymentMethods.map((method) => ({ value: method, label: method }))} /></Field>
          <Field label="Date"><AppInput type="date" value={expense.date} onChange={(event) => onChange({ ...expense, date: event.target.value })} /></Field>
          <Field label="Note"><AppTextarea value={expense.note} onChange={(event) => onChange({ ...expense, note: event.target.value })} /></Field>
        </div></div>
      </div>
      <div className="detail-footer"><ButtonBase className="danger-button" type="button" onClick={() => setDeleteOpen(true)}><Trash2 size={15} /> Delete</ButtonBase><span><CheckCircle2 size={14} /> Changes save automatically</span></div>
      <ConfirmDialog open={deleteOpen} title="Delete this expense?" description="This permanently removes the expense from your ledger and reports." onClose={() => setDeleteOpen(false)} onConfirm={() => { setDeleteOpen(false); onDelete(); }} />
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
  return <div className="empty-state"><span className="empty-icon"><Icon size={24} /></span><h3>{title}</h3><p>{description}</p><ButtonBase className="primary-button" type="button" onClick={onAction}><Plus size={16} />{action}</ButtonBase></div>;
}

function AppSkeleton() {
  return <main className="app-shell skeleton-shell"><aside className="sidebar"><div className="skeleton brand-skeleton" /><div className="skeleton nav-skeleton" /><div className="skeleton nav-skeleton" /><div className="skeleton nav-skeleton" /></aside><section className="workspace"><div className="skeleton title-skeleton" /><div className="metric-grid">{[0, 1, 2, 3].map((item) => <div className="skeleton metric-skeleton" key={item} />)}</div><div className="skeleton chart-skeleton" /></section></main>;
}
