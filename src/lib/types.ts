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
  company: string;
  email: string;
  phone: string;
  billingAddress: string;
  city: string;
  notes: string;
  createdAt: string;
};

export type InvoiceClientSnapshot = Pick<Client, "id" | "name" | "company" | "email" | "phone" | "billingAddress" | "city">;

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
  clientId: string | null;
  client: InvoiceClientSnapshot;
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

export type TransactionType = "income" | "expense";

export type Transaction = {
  id: string;
  type: TransactionType;
  label: string;
  detail: string;
  date: string;
  amount: number;
  status?: InvoiceStatus;
  category?: ExpenseCategory;
};

export type DateRangePreset = "7d" | "30d" | "month" | "3m" | "6m" | "year" | "custom";

export type DateRange = {
  preset: DateRangePreset;
  from: string;
  to: string;
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
  recentActivity: Transaction[];
};

export type ClientFinancials = {
  totalInvoiced: number;
  paidAmount: number;
  outstandingAmount: number;
  invoices: Invoice[];
};

export type MonthlyPoint = {
  month: string;
  income: number;
  expenses: number;
  net: number;
};

export type AnalyticsSummary = {
  income: number;
  expenses: number;
  netCashFlow: number;
  paid: number;
  outstanding: number;
  expenseBreakdown: Array<{ label: ExpenseCategory; value: number }>;
  invoiceStatusBreakdown: Array<{ label: InvoiceStatus; value: number; count: number }>;
  monthlyRevenue: MonthlyPoint[];
  topClients: Array<{ client: Client; revenue: number; invoiceCount: number }>;
};

export type FinanceState = {
  clients: Client[];
  invoices: Invoice[];
  expenses: Expense[];
};

export type PaginatedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};
