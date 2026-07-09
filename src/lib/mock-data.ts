import type { Expense, FinanceState, Invoice } from "./types";

export const initialInvoices: Invoice[] = [
  {
    id: "inv-001",
    invoiceNumber: "LED-2026-001",
    client: {
      id: "client-001",
      name: "Northstar Studio",
      email: "accounts@northstar.example",
      city: "Bengaluru",
    },
    issueDate: "2026-07-01",
    dueDate: "2026-07-15",
    status: "sent",
    discount: 1200,
    notes: "Frontend dashboard sprint with component cleanup and reporting cards.",
    items: [
      {
        id: "item-001",
        description: "Dashboard UI implementation",
        quantity: 1,
        rate: 42000,
        taxRate: 18,
      },
      {
        id: "item-002",
        description: "Responsive QA and polish",
        quantity: 8,
        rate: 1800,
        taxRate: 18,
      },
    ],
  },
  {
    id: "inv-002",
    invoiceNumber: "LED-2026-002",
    client: {
      id: "client-002",
      name: "Prism Commerce",
      email: "finance@prism.example",
      city: "Mumbai",
    },
    issueDate: "2026-06-18",
    dueDate: "2026-07-05",
    status: "overdue",
    discount: 0,
    notes: "Product landing page refresh and analytics-ready sections.",
    items: [
      {
        id: "item-003",
        description: "Landing page system",
        quantity: 1,
        rate: 36000,
        taxRate: 18,
      },
    ],
  },
  {
    id: "inv-003",
    invoiceNumber: "LED-2026-003",
    client: {
      id: "client-003",
      name: "Personal Project Fund",
      email: "self@ledgerly.local",
      city: "Jaipur",
    },
    issueDate: "2026-07-08",
    dueDate: "2026-07-08",
    status: "paid",
    discount: 500,
    notes: "Monthly side-project allocation and internal tracking.",
    items: [
      {
        id: "item-004",
        description: "Project savings transfer",
        quantity: 1,
        rate: 18000,
        taxRate: 0,
      },
    ],
  },
];

export const initialExpenses: Expense[] = [
  {
    id: "exp-001",
    merchant: "Figma Professional",
    category: "Software",
    amount: 1450,
    date: "2026-07-02",
    paymentMethod: "Card",
    note: "Design subscription",
  },
  {
    id: "exp-002",
    merchant: "Home internet",
    category: "Utilities",
    amount: 1299,
    date: "2026-07-04",
    paymentMethod: "UPI",
    note: "Monthly broadband",
  },
  {
    id: "exp-003",
    merchant: "Workspace cafe",
    category: "Food",
    amount: 860,
    date: "2026-07-06",
    paymentMethod: "UPI",
    note: "Client planning session",
  },
  {
    id: "exp-004",
    merchant: "Metro card recharge",
    category: "Transport",
    amount: 700,
    date: "2026-07-08",
    paymentMethod: "Card",
    note: "Local travel",
  },
  {
    id: "exp-005",
    merchant: "Cloud sandbox",
    category: "Software",
    amount: 2100,
    date: "2026-06-26",
    paymentMethod: "Bank transfer",
    note: "Testing environment",
  },
];

export const initialFinanceState: FinanceState = {
  invoices: initialInvoices,
  expenses: initialExpenses,
};
