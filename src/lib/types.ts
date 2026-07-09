export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

export type ExpenseCategory =
  | "Home"
  | "Food"
  | "Transport"
  | "Software"
  | "Health"
  | "Travel"
  | "Utilities";

export type PaymentMethod = "UPI" | "Card" | "Cash" | "Bank transfer";

export type Client = {
  id: string;
  name: string;
  email: string;
  city: string;
};

export type InvoiceLineItem = {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  taxRate: number;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  client: Client;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  discount: number;
  notes: string;
  items: InvoiceLineItem[];
};

export type Expense = {
  id: string;
  merchant: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
  note: string;
};

export type DashboardMetric = {
  label: string;
  value: number;
  helper: string;
  tone: "income" | "expense" | "neutral" | "warning";
};

export type DashboardSummary = {
  metrics: DashboardMetric[];
  monthlyBalance: number;
  unpaidTotal: number;
  recentActivity: Array<{
    id: string;
    label: string;
    detail: string;
    amount: number;
    type: "invoice" | "expense";
  }>;
};

export type FinanceState = {
  invoices: Invoice[];
  expenses: Expense[];
};
