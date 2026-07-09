import { initialFinanceState } from "./mock-data";
import type {
  DashboardSummary,
  Expense,
  FinanceState,
  Invoice,
  InvoiceLineItem,
} from "./types";

const STORAGE_KEY = "ledgerly-finance-state";

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
  const subtotal = calculateInvoiceSubtotal(invoice.items);
  const tax = calculateInvoiceTax(invoice.items);
  return Math.max(subtotal + tax - invoice.discount, 0);
}

export function getInitialFinanceState(): FinanceState {
  if (typeof window === "undefined") {
    return initialFinanceState;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return initialFinanceState;
  }

  try {
    return JSON.parse(stored) as FinanceState;
  } catch {
    return initialFinanceState;
  }
}

export function persistFinanceState(state: FinanceState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getInvoices(state: FinanceState) {
  return state.invoices;
}

export function createInvoice(state: FinanceState, invoice: Invoice): FinanceState {
  return {
    ...state,
    invoices: [invoice, ...state.invoices],
  };
}

export function updateInvoice(state: FinanceState, invoice: Invoice): FinanceState {
  return {
    ...state,
    invoices: state.invoices.map((item) => (item.id === invoice.id ? invoice : item)),
  };
}

export function deleteInvoice(state: FinanceState, invoiceId: string): FinanceState {
  return {
    ...state,
    invoices: state.invoices.filter((invoice) => invoice.id !== invoiceId),
  };
}

export function getExpenses(state: FinanceState) {
  return state.expenses;
}

export function createExpense(state: FinanceState, expense: Expense): FinanceState {
  return {
    ...state,
    expenses: [expense, ...state.expenses],
  };
}

export function updateExpense(state: FinanceState, expense: Expense): FinanceState {
  return {
    ...state,
    expenses: state.expenses.map((item) => (item.id === expense.id ? expense : item)),
  };
}

export function deleteExpense(state: FinanceState, expenseId: string): FinanceState {
  return {
    ...state,
    expenses: state.expenses.filter((expense) => expense.id !== expenseId),
  };
}

export function getDashboardSummary(state: FinanceState): DashboardSummary {
  const invoiceIncome = state.invoices
    .filter((invoice) => invoice.status === "paid")
    .reduce((total, invoice) => total + calculateInvoiceTotal(invoice), 0);
  const projectedIncome = state.invoices.reduce(
    (total, invoice) => total + calculateInvoiceTotal(invoice),
    0,
  );
  const expenses = state.expenses.reduce((total, expense) => total + expense.amount, 0);
  const unpaidTotal = state.invoices
    .filter((invoice) => invoice.status === "sent" || invoice.status === "overdue")
    .reduce((total, invoice) => total + calculateInvoiceTotal(invoice), 0);

  const recentInvoices = state.invoices.map((invoice) => ({
    id: invoice.id,
    label: invoice.client.name,
    detail: `${invoice.invoiceNumber} · ${invoice.status}`,
    amount: calculateInvoiceTotal(invoice),
    type: "invoice" as const,
  }));

  const recentExpenses = state.expenses.map((expense) => ({
    id: expense.id,
    label: expense.merchant,
    detail: `${expense.category} · ${expense.paymentMethod}`,
    amount: -expense.amount,
    type: "expense" as const,
  }));

  return {
    monthlyBalance: invoiceIncome - expenses,
    unpaidTotal,
    metrics: [
      {
        label: "Paid income",
        value: invoiceIncome,
        helper: "Settled invoices this cycle",
        tone: "income",
      },
      {
        label: "Expenses",
        value: expenses,
        helper: "Tracked personal outflow",
        tone: "expense",
      },
      {
        label: "Unpaid invoices",
        value: unpaidTotal,
        helper: "Sent and overdue receivables",
        tone: "warning",
      },
      {
        label: "Projected revenue",
        value: projectedIncome,
        helper: "All invoices including drafts",
        tone: "neutral",
      },
    ],
    recentActivity: [...recentInvoices, ...recentExpenses].slice(0, 6),
  };
}
