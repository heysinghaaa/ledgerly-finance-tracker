"use client";

import { useEffect, useMemo, useState } from "react";
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
  getInitialFinanceState,
  getInvoices,
  persistFinanceState,
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
  const [state, setState] = useState<FinanceState>(() => getInitialFinanceState());
  const [activeView, setActiveView] = useState<View>("dashboard");
  const [invoiceFilter, setInvoiceFilter] = useState<InvoiceStatus | "all">("all");
  const [expenseFilter, setExpenseFilter] = useState<ExpenseCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [selectedExpenseId, setSelectedExpenseId] = useState<string>("");

  useEffect(() => {
    persistFinanceState(state);
  }, [state]);

  const invoices = getInvoices(state);
  const expenses = getExpenses(state);
  const summary = useMemo(() => getDashboardSummary(state), [state]);
  const selectedInvoice = invoices.find((invoice) => invoice.id === selectedInvoiceId) ?? invoices[0];
  const selectedExpense = expenses.find((expense) => expense.id === selectedExpenseId) ?? expenses[0];

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesStatus = invoiceFilter === "all" || invoice.status === invoiceFilter;
    const query = search.toLowerCase();
    const matchesSearch =
      invoice.client.name.toLowerCase().includes(query) ||
      invoice.invoiceNumber.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  const filteredExpenses = expenses.filter((expense) => {
    const matchesCategory = expenseFilter === "all" || expense.category === expenseFilter;
    const query = search.toLowerCase();
    const matchesSearch =
      expense.merchant.toLowerCase().includes(query) || expense.note.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  const saveState = (nextState: FinanceState) => {
    setState(nextState);
  };

  const handleInvoiceChange = (invoice: Invoice) => {
    if (!state) {
      return;
    }
    saveState(updateInvoice(state, invoice));
  };

  const handleExpenseChange = (expense: Expense) => {
    if (!state) {
      return;
    }
    saveState(updateExpense(state, expense));
  };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">L</div>
          <div>
            <p>Ledgerly</p>
            <span>Personal finance cockpit</span>
          </div>
        </div>
        <nav className="nav-stack" aria-label="Ledgerly navigation">
          {(["dashboard", "invoices", "expenses"] as View[]).map((view) => (
            <button
              className={activeView === view ? "active" : ""}
              key={view}
              type="button"
              onClick={() => setActiveView(view)}
            >
              <span>{view === "dashboard" ? "⌁" : view === "invoices" ? "▤" : "◌"}</span>
              {view}
            </button>
          ))}
        </nav>
        <div className="side-card">
          <span>Monthly balance</span>
          <strong>{formatCurrency(summary.monthlyBalance)}</strong>
          <p>{formatCurrency(summary.unpaidTotal)} still waiting to be collected.</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">INR · Local storage · Supabase-ready</p>
            <h1>{activeView === "dashboard" ? "Money, invoices, and expense flow." : activeView}</h1>
          </div>
          <div className="topbar-actions">
            <input
              aria-label="Search records"
              placeholder="Search records"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <button
              type="button"
              onClick={() => {
                const invoice = emptyInvoice();
                const nextState = createInvoice(state, invoice);
                saveState(nextState);
                setSelectedInvoiceId(invoice.id);
                setActiveView("invoices");
              }}
            >
              New invoice
            </button>
          </div>
        </header>

        {activeView === "dashboard" && (
          <section className="dashboard-grid">
            <div className="metric-grid">
              {summary.metrics.map((metric) => (
                <article className={`metric-card ${metric.tone}`} key={metric.label}>
                  <span>{metric.label}</span>
                  <strong>{formatCurrency(metric.value)}</strong>
                  <p>{metric.helper}</p>
                </article>
              ))}
            </div>

            <article className="hero-panel">
              <div>
                <p className="eyebrow">Personal runway</p>
                <h2>{summary.monthlyBalance >= 0 ? "Healthy positive flow" : "Watch the monthly burn"}</h2>
                <p>
                  Ledgerly keeps personal expenses and small invoices in one tidy cockpit. The mock repository
                  can be swapped for Supabase when the project grows.
                </p>
              </div>
              <div className="balance-ring">
                <span>Balance</span>
                <strong>{formatCurrency(summary.monthlyBalance)}</strong>
              </div>
            </article>

            <article className="activity-panel">
              <div className="section-heading">
                <h2>Recent activity</h2>
                <span>{summary.recentActivity.length} records</span>
              </div>
              <div className="activity-list">
                {summary.recentActivity.map((activity) => (
                  <div className="activity-row" key={`${activity.type}-${activity.id}`}>
                    <div>
                      <strong>{activity.label}</strong>
                      <span>{activity.detail}</span>
                    </div>
                    <em className={activity.amount >= 0 ? "positive" : "negative"}>
                      {formatCurrency(activity.amount)}
                    </em>
                  </div>
                ))}
              </div>
            </article>
          </section>
        )}

        {activeView === "invoices" && (
          <section className="records-layout">
            <div className="records-panel">
              <div className="section-heading">
                <h2>Invoices</h2>
                <button
                  type="button"
                  onClick={() => {
                    const invoice = emptyInvoice();
                    saveState(createInvoice(state, invoice));
                    setSelectedInvoiceId(invoice.id);
                  }}
                >
                  Add
                </button>
              </div>
              <div className="filter-row">
                {invoiceStatuses.map((status) => (
                  <button
                    className={invoiceFilter === status ? "selected" : ""}
                    key={status}
                    type="button"
                    onClick={() => setInvoiceFilter(status)}
                  >
                    {status}
                  </button>
                ))}
              </div>
              <div className="record-list">
                {filteredInvoices.map((invoice) => (
                  <button
                    className={selectedInvoice?.id === invoice.id ? "record-card selected" : "record-card"}
                    key={invoice.id}
                    type="button"
                    onClick={() => setSelectedInvoiceId(invoice.id)}
                  >
                    <span className={`status-pill ${invoice.status}`}>{invoice.status}</span>
                    <strong>{invoice.client.name}</strong>
                    <small>
                      {invoice.invoiceNumber} · due {formatDate(invoice.dueDate)}
                    </small>
                    <em>{formatCurrency(calculateInvoiceTotal(invoice))}</em>
                  </button>
                ))}
                {filteredInvoices.length === 0 && <p className="empty-state">No invoices match this filter.</p>}
              </div>
            </div>

            {selectedInvoice && (
              <InvoiceEditor
                invoice={selectedInvoice}
                onChange={handleInvoiceChange}
                onDelete={() => {
                  const nextState = deleteInvoice(state, selectedInvoice.id);
                  saveState(nextState);
                  setSelectedInvoiceId(nextState.invoices[0]?.id ?? "");
                }}
              />
            )}
          </section>
        )}

        {activeView === "expenses" && (
          <section className="records-layout">
            <div className="records-panel">
              <div className="section-heading">
                <h2>Expenses</h2>
                <button
                  type="button"
                  onClick={() => {
                    const expense = emptyExpense();
                    saveState(createExpense(state, expense));
                    setSelectedExpenseId(expense.id);
                  }}
                >
                  Add
                </button>
              </div>
              <div className="filter-row">
                {expenseCategories.map((category) => (
                  <button
                    className={expenseFilter === category ? "selected" : ""}
                    key={category}
                    type="button"
                    onClick={() => setExpenseFilter(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
              <div className="record-list">
                {filteredExpenses.map((expense) => (
                  <button
                    className={selectedExpense?.id === expense.id ? "record-card selected" : "record-card"}
                    key={expense.id}
                    type="button"
                    onClick={() => setSelectedExpenseId(expense.id)}
                  >
                    <span className="status-pill expense">{expense.category}</span>
                    <strong>{expense.merchant}</strong>
                    <small>
                      {expense.paymentMethod} · {formatDate(expense.date)}
                    </small>
                    <em>{formatCurrency(expense.amount)}</em>
                  </button>
                ))}
                {filteredExpenses.length === 0 && <p className="empty-state">No expenses match this filter.</p>}
              </div>
            </div>

            {selectedExpense && (
              <ExpenseEditor
                expense={selectedExpense}
                onChange={handleExpenseChange}
                onDelete={() => {
                  const nextState = deleteExpense(state, selectedExpense.id);
                  saveState(nextState);
                  setSelectedExpenseId(nextState.expenses[0]?.id ?? "");
                }}
              />
            )}
          </section>
        )}
      </section>
    </main>
  );
}

function InvoiceEditor({
  invoice,
  onChange,
  onDelete,
}: {
  invoice: Invoice;
  onChange: (invoice: Invoice) => void;
  onDelete: () => void;
}) {
  const subtotal = calculateInvoiceSubtotal(invoice.items);
  const tax = calculateInvoiceTax(invoice.items);
  const total = calculateInvoiceTotal(invoice);

  const updateItem = (itemId: string, nextItem: Partial<InvoiceLineItem>) => {
    onChange({
      ...invoice,
      items: invoice.items.map((item) => (item.id === itemId ? { ...item, ...nextItem } : item)),
    });
  };

  return (
    <div className="editor-grid">
      <article className="editor-panel">
        <div className="section-heading">
          <h2>Invoice editor</h2>
          <button className="danger" type="button" onClick={onDelete}>
            Delete
          </button>
        </div>
        <div className="form-grid">
          <label>
            Invoice number
            <input
              value={invoice.invoiceNumber}
              onChange={(event) => onChange({ ...invoice, invoiceNumber: event.target.value })}
            />
          </label>
          <label>
            Status
            <select
              value={invoice.status}
              onChange={(event) => onChange({ ...invoice, status: event.target.value as InvoiceStatus })}
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </label>
          <label>
            Client name
            <input
              value={invoice.client.name}
              onChange={(event) =>
                onChange({ ...invoice, client: { ...invoice.client, name: event.target.value } })
              }
            />
          </label>
          <label>
            Client email
            <input
              value={invoice.client.email}
              onChange={(event) =>
                onChange({ ...invoice, client: { ...invoice.client, email: event.target.value } })
              }
            />
          </label>
          <label>
            Issue date
            <input
              type="date"
              value={invoice.issueDate}
              onChange={(event) => onChange({ ...invoice, issueDate: event.target.value })}
            />
          </label>
          <label>
            Due date
            <input
              type="date"
              value={invoice.dueDate}
              onChange={(event) => onChange({ ...invoice, dueDate: event.target.value })}
            />
          </label>
        </div>

        <div className="line-items">
          <div className="line-item-header">
            <h3>Line items</h3>
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...invoice,
                  items: [
                    ...invoice.items,
                    {
                      id: createId("item"),
                      description: "New line item",
                      quantity: 1,
                      rate: 1000,
                      taxRate: 18,
                    },
                  ],
                })
              }
            >
              Add item
            </button>
          </div>
          {invoice.items.map((item) => (
            <div className="line-item" key={item.id}>
              <input
                aria-label="Item description"
                value={item.description}
                onChange={(event) => updateItem(item.id, { description: event.target.value })}
              />
              <input
                aria-label="Quantity"
                min="1"
                type="number"
                value={item.quantity}
                onChange={(event) => updateItem(item.id, { quantity: Number(event.target.value) })}
              />
              <input
                aria-label="Rate"
                min="0"
                type="number"
                value={item.rate}
                onChange={(event) => updateItem(item.id, { rate: Number(event.target.value) })}
              />
              <input
                aria-label="Tax rate"
                min="0"
                type="number"
                value={item.taxRate}
                onChange={(event) => updateItem(item.id, { taxRate: Number(event.target.value) })}
              />
              <button
                type="button"
                onClick={() =>
                  onChange({ ...invoice, items: invoice.items.filter((lineItem) => lineItem.id !== item.id) })
                }
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="form-grid">
          <label>
            Discount
            <input
              min="0"
              type="number"
              value={invoice.discount}
              onChange={(event) => onChange({ ...invoice, discount: Number(event.target.value) })}
            />
          </label>
          <label>
            Notes
            <textarea
              value={invoice.notes}
              onChange={(event) => onChange({ ...invoice, notes: event.target.value })}
            />
          </label>
        </div>
      </article>

      <article className="invoice-preview">
        <div className="preview-header">
          <div>
            <span>Ledgerly</span>
            <h2>Invoice</h2>
          </div>
          <button type="button" onClick={() => window.print()}>
            Print
          </button>
        </div>
        <div className="preview-meta">
          <div>
            <span>Bill to</span>
            <strong>{invoice.client.name}</strong>
            <p>{invoice.client.email}</p>
            <p>{invoice.client.city}</p>
          </div>
          <div>
            <span>{invoice.invoiceNumber}</span>
            <p>Issued {formatDate(invoice.issueDate)}</p>
            <p>Due {formatDate(invoice.dueDate)}</p>
            <em className={`status-pill ${invoice.status}`}>{invoice.status}</em>
          </div>
        </div>
        <div className="preview-lines">
          {invoice.items.map((item) => (
            <div key={item.id}>
              <span>{item.description}</span>
              <span>
                {item.quantity} × {formatCurrency(item.rate)}
              </span>
              <strong>{formatCurrency(item.quantity * item.rate)}</strong>
            </div>
          ))}
        </div>
        <div className="totals-box">
          <span>Subtotal <strong>{formatCurrency(subtotal)}</strong></span>
          <span>Tax <strong>{formatCurrency(tax)}</strong></span>
          <span>Discount <strong>-{formatCurrency(invoice.discount)}</strong></span>
          <span className="grand-total">Total <strong>{formatCurrency(total)}</strong></span>
        </div>
        <p className="preview-notes">{invoice.notes}</p>
      </article>
    </div>
  );
}

function ExpenseEditor({
  expense,
  onChange,
  onDelete,
}: {
  expense: Expense;
  onChange: (expense: Expense) => void;
  onDelete: () => void;
}) {
  return (
    <article className="editor-panel expense-editor">
      <div className="section-heading">
        <h2>Expense detail</h2>
        <button className="danger" type="button" onClick={onDelete}>
          Delete
        </button>
      </div>
      <div className="form-grid">
        <label>
          Merchant
          <input
            value={expense.merchant}
            onChange={(event) => onChange({ ...expense, merchant: event.target.value })}
          />
        </label>
        <label>
          Amount
          <input
            min="0"
            type="number"
            value={expense.amount}
            onChange={(event) => onChange({ ...expense, amount: Number(event.target.value) })}
          />
        </label>
        <label>
          Category
          <select
            value={expense.category}
            onChange={(event) => onChange({ ...expense, category: event.target.value as ExpenseCategory })}
          >
            {expenseCategories
              .filter((category) => category !== "all")
              .map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
          </select>
        </label>
        <label>
          Payment method
          <select
            value={expense.paymentMethod}
            onChange={(event) => onChange({ ...expense, paymentMethod: event.target.value as PaymentMethod })}
          >
            {paymentMethods.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </label>
        <label>
          Date
          <input
            type="date"
            value={expense.date}
            onChange={(event) => onChange({ ...expense, date: event.target.value })}
          />
        </label>
        <label>
          Note
          <textarea value={expense.note} onChange={(event) => onChange({ ...expense, note: event.target.value })} />
        </label>
      </div>
      <div className="expense-total-card">
        <span>Tracked spend</span>
        <strong>{formatCurrency(expense.amount)}</strong>
        <p>
          {expense.category} · {expense.paymentMethod} · {formatDate(expense.date)}
        </p>
      </div>
    </article>
  );
}
