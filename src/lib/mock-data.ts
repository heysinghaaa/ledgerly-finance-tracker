import type { Client, Expense, FinanceState, Invoice } from "./types";

export const initialClients: Client[] = [
  {
    id: "client-001",
    name: "Maya Rao",
    company: "Northstar Studio",
    email: "accounts@northstar.example",
    phone: "+91 98765 43210",
    billingAddress: "12 Residency Road, Bengaluru, Karnataka 560025",
    city: "Bengaluru",
    notes: "Design partner. Net 14 payment terms.",
    createdAt: "2026-01-12T09:30:00.000Z",
  },
  {
    id: "client-002",
    name: "Arjun Mehta",
    company: "Prism Commerce",
    email: "finance@prism.example",
    phone: "+91 98200 11882",
    billingAddress: "84 Linking Road, Mumbai, Maharashtra 400052",
    city: "Mumbai",
    notes: "Commerce product team. Send invoices to finance alias.",
    createdAt: "2026-02-03T11:15:00.000Z",
  },
  {
    id: "client-003",
    name: "Kabir Sethi",
    company: "Fieldnote Labs",
    email: "billing@fieldnote.example",
    phone: "+91 98111 70426",
    billingAddress: "C-Scheme, Jaipur, Rajasthan 302001",
    city: "Jaipur",
    notes: "Independent product studio. Monthly design and strategy support.",
    createdAt: "2026-03-18T08:00:00.000Z",
  },
];

export const initialInvoices: Invoice[] = [
  {
    id: "inv-001",
    invoiceNumber: "LED-2026-001",
    clientId: "client-001",
    client: { ...initialClients[0] },
    issueDate: "2026-07-01",
    dueDate: "2026-07-15",
    status: "sent",
    discount: 1200,
    notes: "Frontend dashboard sprint with component cleanup and reporting cards.",
    items: [
      { id: "item-001", description: "Dashboard UI implementation", quantity: 1, rate: 42000, taxRate: 18 },
      { id: "item-002", description: "Responsive QA and polish", quantity: 8, rate: 1800, taxRate: 18 },
    ],
    activity: [
      { id: "activity-001-created", type: "created", occurredAt: "2026-07-01T09:10:00.000Z" },
      { id: "activity-001-sent", type: "sent", occurredAt: "2026-07-01T09:18:00.000Z" },
      { id: "activity-001-viewed", type: "viewed", occurredAt: "2026-07-01T13:42:00.000Z" },
    ],
  },
  {
    id: "inv-002",
    invoiceNumber: "LED-2026-002",
    clientId: "client-002",
    client: { ...initialClients[1] },
    issueDate: "2026-06-18",
    dueDate: "2026-07-05",
    status: "overdue",
    discount: 0,
    notes: "Product landing page refresh and analytics-ready sections.",
    items: [{ id: "item-003", description: "Landing page system", quantity: 1, rate: 36000, taxRate: 18 }],
    activity: [
      { id: "activity-002-created", type: "created", occurredAt: "2026-06-18T10:00:00.000Z" },
      { id: "activity-002-sent", type: "sent", occurredAt: "2026-06-18T10:16:00.000Z" },
      { id: "activity-002-viewed", type: "viewed", occurredAt: "2026-06-19T04:28:00.000Z" },
      { id: "activity-002-overdue", type: "overdue", occurredAt: "2026-07-06T00:00:00.000Z" },
    ],
  },
  {
    id: "inv-003",
    invoiceNumber: "LED-2026-003",
    clientId: "client-003",
    client: { ...initialClients[2] },
    issueDate: "2026-07-08",
    dueDate: "2026-07-08",
    status: "paid",
    discount: 500,
    notes: "Monthly product design retainer for Fieldnote Labs.",
    items: [{ id: "item-004", description: "Product design retainer", quantity: 1, rate: 18000, taxRate: 0 }],
    activity: [
      { id: "activity-003-created", type: "created", occurredAt: "2026-07-08T08:00:00.000Z" },
      { id: "activity-003-sent", type: "sent", occurredAt: "2026-07-08T08:12:00.000Z" },
      { id: "activity-003-viewed", type: "viewed", occurredAt: "2026-07-08T09:05:00.000Z" },
      { id: "activity-003-paid", type: "paid", occurredAt: "2026-07-08T15:32:00.000Z" },
    ],
  },
];

export const initialExpenses: Expense[] = [
  { id: "exp-001", merchant: "Figma Professional", category: "Software", amount: 1450, date: "2026-07-02", paymentMethod: "Card", note: "Design subscription" },
  { id: "exp-002", merchant: "Home internet", category: "Utilities", amount: 1299, date: "2026-07-04", paymentMethod: "UPI", note: "Monthly broadband" },
  { id: "exp-003", merchant: "Workspace cafe", category: "Food", amount: 860, date: "2026-07-06", paymentMethod: "UPI", note: "Client planning session" },
  { id: "exp-004", merchant: "Metro card recharge", category: "Transport", amount: 700, date: "2026-07-08", paymentMethod: "Card", note: "Local travel" },
  { id: "exp-005", merchant: "Cloud sandbox", category: "Software", amount: 2100, date: "2026-06-26", paymentMethod: "Bank transfer", note: "Testing environment" },
];

export const initialFinanceState: FinanceState = {
  clients: initialClients,
  invoices: initialInvoices,
  expenses: initialExpenses,
};
