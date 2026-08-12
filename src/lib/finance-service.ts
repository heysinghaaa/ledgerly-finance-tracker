import { initialFinanceState } from "./mock-data";
import type {
  AnalyticsSummary,
  Client,
  ClientFinancials,
  DashboardSummary,
  DateRange,
  DateRangePreset,
  Expense,
  FinanceState,
  Invoice,
  InvoiceLineItem,
  PaginatedResult,
  Transaction,
} from "./types";

const STORAGE_KEY = "ledgerly-finance-state";

const getStorageKey = (userId?: string) =>
  userId ? `${STORAGE_KEY}:user:${userId}` : `${STORAGE_KEY}:anonymous`;

const moneyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number) {
  return moneyFormatter.format(value);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function calculateInvoiceSubtotal(items: InvoiceLineItem[]) {
  return items.reduce((total, item) => total + item.quantity * item.rate, 0);
}

export function calculateInvoiceTax(items: InvoiceLineItem[]) {
  return items.reduce((total, item) => {
    const lineTotal = item.quantity * item.rate;
    return total + (lineTotal * item.taxRate) / 100;
  }, 0);
}

export function calculateInvoiceTotal(invoice: Invoice) {
  return Math.max(calculateInvoiceSubtotal(invoice.items) + calculateInvoiceTax(invoice.items) - invoice.discount, 0);
}

const legacyClientToClient = (value: Partial<Client> & { id: string; name: string; email: string; city?: string }): Client => ({
  id: value.id,
  name: value.name,
  company: value.company ?? value.name,
  email: value.email,
  phone: value.phone ?? "",
  billingAddress: value.billingAddress ?? value.city ?? "",
  city: value.city ?? "",
  notes: value.notes ?? "",
  createdAt: value.createdAt ?? new Date().toISOString(),
});

export function normalizeFinanceState(value: unknown): FinanceState {
  if (!value || typeof value !== "object") return initialFinanceState;
  const candidate = value as Partial<FinanceState>;
  const rawInvoices = Array.isArray(candidate.invoices) ? candidate.invoices : [];
  const rawExpenses = Array.isArray(candidate.expenses) ? candidate.expenses : [];
  const storedClients = Array.isArray(candidate.clients) ? candidate.clients : [];
  const clientsById = new Map<string, Client>();

  for (const client of storedClients) {
    if (client?.id && client.name && client.email) clientsById.set(client.id, legacyClientToClient(client));
  }

  for (const invoice of rawInvoices) {
    if (invoice?.client?.id && invoice.client.name && invoice.client.email && !clientsById.has(invoice.client.id)) {
      clientsById.set(invoice.client.id, legacyClientToClient({ ...invoice.client, createdAt: `${invoice.issueDate}T00:00:00.000Z` }));
    }
  }

  const invoices = rawInvoices.map((invoice) => {
    const linkedClient = clientsById.get(invoice.clientId ?? invoice.client?.id);
    return {
      ...invoice,
      clientId: linkedClient?.id ?? invoice.clientId ?? null,
      client: linkedClient ? { ...linkedClient } : invoice.client,
    } as Invoice;
  });

  return { clients: [...clientsById.values()], invoices, expenses: rawExpenses };
}

export function getStoredFinanceState(userId?: string): FinanceState | null {
  if (typeof window === "undefined") return null;
  const scopedKey = getStorageKey(userId);
  const stored = window.localStorage.getItem(scopedKey);
  if (!stored) {
    const legacyState = !userId ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (!legacyState) return null;
    try {
      const normalized = normalizeFinanceState(JSON.parse(legacyState));
      window.localStorage.setItem(scopedKey, JSON.stringify(normalized));
      window.localStorage.removeItem(STORAGE_KEY);
      return normalized;
    } catch {
      return null;
    }
  }
  try {
    return normalizeFinanceState(JSON.parse(stored));
  } catch {
    return null;
  }
}

export function getInitialFinanceState(userId?: string): FinanceState {
  return getStoredFinanceState(userId) ?? initialFinanceState;
}

export function persistFinanceState(state: FinanceState, userId?: string) {
  if (typeof window !== "undefined") window.localStorage.setItem(getStorageKey(userId), JSON.stringify(state));
}

export const getInvoices = (state: FinanceState) => state.invoices;
export const getExpenses = (state: FinanceState) => state.expenses;
export const getClients = (state: FinanceState) => state.clients;

export function createInvoice(state: FinanceState, invoice: Invoice): FinanceState {
  return { ...state, invoices: [invoice, ...state.invoices] };
}

export function updateInvoice(state: FinanceState, invoice: Invoice): FinanceState {
  return { ...state, invoices: state.invoices.map((item) => item.id === invoice.id ? invoice : item) };
}

export function deleteInvoice(state: FinanceState, invoiceId: string): FinanceState {
  return { ...state, invoices: state.invoices.filter((invoice) => invoice.id !== invoiceId) };
}

export function createExpense(state: FinanceState, expense: Expense): FinanceState {
  return { ...state, expenses: [expense, ...state.expenses] };
}

export function updateExpense(state: FinanceState, expense: Expense): FinanceState {
  return { ...state, expenses: state.expenses.map((item) => item.id === expense.id ? expense : item) };
}

export function deleteExpense(state: FinanceState, expenseId: string): FinanceState {
  return { ...state, expenses: state.expenses.filter((expense) => expense.id !== expenseId) };
}

export function createClient(state: FinanceState, client: Client): FinanceState {
  return { ...state, clients: [client, ...state.clients] };
}

export function updateClient(state: FinanceState, client: Client): FinanceState {
  return {
    ...state,
    clients: state.clients.map((item) => item.id === client.id ? client : item),
    invoices: state.invoices.map((invoice) => invoice.clientId === client.id ? { ...invoice, client: { ...client } } : invoice),
  };
}

export function deleteClient(state: FinanceState, clientId: string): FinanceState {
  return {
    ...state,
    clients: state.clients.filter((client) => client.id !== clientId),
    invoices: state.invoices.map((invoice) => invoice.clientId === clientId ? { ...invoice, clientId: null } : invoice),
  };
}

export function linkInvoiceToClient(invoice: Invoice, client: Client): Invoice {
  return { ...invoice, clientId: client.id, client: { ...client } };
}

export function getClientFinancials(state: FinanceState, clientId: string): ClientFinancials {
  const invoices = state.invoices.filter((invoice) => invoice.clientId === clientId);
  const totalInvoiced = invoices.reduce((sum, invoice) => sum + calculateInvoiceTotal(invoice), 0);
  const paidAmount = invoices.filter((invoice) => invoice.status === "paid").reduce((sum, invoice) => sum + calculateInvoiceTotal(invoice), 0);
  const outstandingAmount = invoices.filter((invoice) => invoice.status === "sent" || invoice.status === "overdue").reduce((sum, invoice) => sum + calculateInvoiceTotal(invoice), 0);
  return { totalInvoiced, paidAmount, outstandingAmount, invoices };
}

export function getDateRange(preset: DateRangePreset, now = new Date()): DateRange {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (preset === "7d") start.setDate(start.getDate() - 6);
  if (preset === "30d") start.setDate(start.getDate() - 29);
  if (preset === "month") start.setDate(1);
  if (preset === "3m") start.setMonth(start.getMonth() - 2, 1);
  if (preset === "6m") start.setMonth(start.getMonth() - 5, 1);
  if (preset === "year") start.setMonth(0, 1);
  const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return { preset, from: localDate(start), to: localDate(end) };
}

export function isInDateRange(date: string, range?: DateRange) {
  if (!range) return true;
  return date >= range.from && date <= range.to;
}

export function getTransactions(state: FinanceState, range?: DateRange): Transaction[] {
  const income: Transaction[] = state.invoices
    .filter(
      (invoice) =>
        invoice.status === "paid" && isInDateRange(invoice.issueDate, range),
    )
    .map((invoice) => ({ id: invoice.id, type: "income", label: invoice.client.company || invoice.client.name, detail: invoice.invoiceNumber, date: invoice.issueDate, amount: calculateInvoiceTotal(invoice), status: invoice.status }));
  const expenses: Transaction[] = state.expenses
    .filter((expense) => isInDateRange(expense.date, range))
    .map((expense) => ({ id: expense.id, type: "expense", label: expense.merchant, detail: `${expense.category} · ${expense.paymentMethod}`, date: expense.date, amount: -expense.amount, category: expense.category }));
  return [...income, ...expenses].sort((a, b) => b.date.localeCompare(a.date));
}

export function getDashboardSummary(state: FinanceState, range?: DateRange): DashboardSummary {
  const invoices = state.invoices.filter((invoice) => isInDateRange(invoice.issueDate, range));
  const expenses = state.expenses.filter((expense) => isInDateRange(expense.date, range));
  const invoiceIncome = invoices.filter((invoice) => invoice.status === "paid").reduce((total, invoice) => total + calculateInvoiceTotal(invoice), 0);
  const projectedIncome = invoices.reduce((total, invoice) => total + calculateInvoiceTotal(invoice), 0);
  const expenseTotal = expenses.reduce((total, expense) => total + expense.amount, 0);
  const unpaidTotal = invoices.filter((invoice) => invoice.status === "sent" || invoice.status === "overdue").reduce((total, invoice) => total + calculateInvoiceTotal(invoice), 0);
  return {
    monthlyBalance: invoiceIncome - expenseTotal,
    unpaidTotal,
    metrics: [
      { label: "Paid income", value: invoiceIncome, helper: "Settled invoices in range", tone: "income" },
      { label: "Expenses", value: expenseTotal, helper: "Tracked outflow in range", tone: "expense" },
      { label: "Unpaid invoices", value: unpaidTotal, helper: "Sent and overdue receivables", tone: "warning" },
      { label: "Projected revenue", value: projectedIncome, helper: "All invoices in range", tone: "neutral" },
    ],
    recentActivity: getTransactions(state, range).slice(0, 6),
  };
}

export function getAnalyticsSummary(state: FinanceState, range: DateRange): AnalyticsSummary {
  const invoices = state.invoices.filter((invoice) => isInDateRange(invoice.issueDate, range));
  const expenses = state.expenses.filter((expense) => isInDateRange(expense.date, range));
  const income = invoices.filter((invoice) => invoice.status === "paid").reduce((sum, invoice) => sum + calculateInvoiceTotal(invoice), 0);
  const expenseTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const outstanding = invoices.filter((invoice) => invoice.status !== "paid" && invoice.status !== "draft").reduce((sum, invoice) => sum + calculateInvoiceTotal(invoice), 0);
  const expenseMap = new Map<Expense["category"], number>();
  for (const expense of expenses) expenseMap.set(expense.category, (expenseMap.get(expense.category) ?? 0) + expense.amount);
  const statusMap = new Map<Invoice["status"], { value: number; count: number }>();
  for (const invoice of invoices) {
    const current = statusMap.get(invoice.status) ?? { value: 0, count: 0 };
    statusMap.set(invoice.status, { value: current.value + calculateInvoiceTotal(invoice), count: current.count + 1 });
  }
  const monthMap = new Map<string, { income: number; expenses: number }>();
  for (const invoice of invoices) {
    const month = invoice.issueDate.slice(0, 7);
    const current = monthMap.get(month) ?? { income: 0, expenses: 0 };
    if (invoice.status === "paid") current.income += calculateInvoiceTotal(invoice);
    monthMap.set(month, current);
  }
  for (const expense of expenses) {
    const month = expense.date.slice(0, 7);
    const current = monthMap.get(month) ?? { income: 0, expenses: 0 };
    current.expenses += expense.amount;
    monthMap.set(month, current);
  }
  const clientMap = new Map<string, { client: Client; revenue: number; invoiceCount: number }>();
  for (const invoice of invoices.filter((item) => item.status === "paid" && item.clientId)) {
    const client = state.clients.find((item) => item.id === invoice.clientId);
    if (!client) continue;
    const current = clientMap.get(client.id) ?? { client, revenue: 0, invoiceCount: 0 };
    current.revenue += calculateInvoiceTotal(invoice);
    current.invoiceCount += 1;
    clientMap.set(client.id, current);
  }
  return {
    income,
    expenses: expenseTotal,
    netCashFlow: income - expenseTotal,
    paid: income,
    outstanding,
    expenseBreakdown: [...expenseMap].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
    invoiceStatusBreakdown: [...statusMap].map(([label, item]) => ({ label, ...item })).sort((a, b) => b.value - a.value),
    monthlyRevenue: [...monthMap].sort(([a], [b]) => a.localeCompare(b)).map(([month, values]) => ({ month, ...values, net: values.income - values.expenses })),
    topClients: [...clientMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
  };
}

export function paginate<T>(items: T[], page: number, pageSize: number): PaginatedResult<T> {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), pageCount);
  return { items: items.slice((safePage - 1) * pageSize, safePage * pageSize), page: safePage, pageSize, total: items.length, pageCount };
}
