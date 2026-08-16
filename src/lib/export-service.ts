import { calculateInvoiceSubtotal, calculateInvoiceTax, calculateInvoiceTotal, formatCurrency, formatDate } from "./finance-service";
import type { Client, Expense, Invoice, Transaction } from "./types";

function escapeCsv(value: unknown) {
  const stringValue = String(value ?? "");
  return /[",\n]/.test(stringValue) ? `"${stringValue.replaceAll('"', '""')}"` : stringValue;
}

export function createCsv(headers: string[], rows: unknown[][]) {
  return [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
}

export function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const csv = createCsv(headers, rows);
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export const exportInvoicesCsv = (invoices: Invoice[]) => downloadCsv("ledgerly-invoices.csv", ["Invoice", "Client", "Email", "Issue date", "Due date", "Status", "Amount"], invoices.map((invoice) => [invoice.invoiceNumber, invoice.client.company || invoice.client.name, invoice.client.email, invoice.issueDate, invoice.dueDate, invoice.status, calculateInvoiceTotal(invoice)]));
export const exportExpensesCsv = (expenses: Expense[]) => downloadCsv("ledgerly-expenses.csv", ["Merchant", "Category", "Date", "Payment method", "Note", "Amount"], expenses.map((expense) => [expense.merchant, expense.category, expense.date, expense.paymentMethod, expense.note, expense.amount]));
export const exportClientsCsv = (clients: Client[]) => downloadCsv("ledgerly-clients.csv", ["Name", "Company", "Email", "Phone", "Billing address", "Notes", "Created date"], clients.map((client) => [client.name, client.company, client.email, client.phone, client.billingAddress, client.notes, client.createdAt]));
export const exportTransactionsCsv = (transactions: Transaction[]) => downloadCsv("ledgerly-transactions.csv", ["Type", "Date", "Name", "Detail", "Amount"], transactions.map((transaction) => [transaction.type, transaction.date, transaction.label, transaction.detail, transaction.amount]));

export async function downloadInvoicePdf(invoice: Invoice) {
  const { jsPDF } = await import("jspdf");
  const document = new jsPDF({ unit: "pt", format: "a4" });
  const left = 48;
  const right = 547;
  document.setFillColor(99, 91, 255);
  document.roundedRect(left, 30, 10, 25, 3, 3, "F");
  document.setFillColor(124, 58, 237);
  document.roundedRect(left + 7, 43, 10, 12, 3, 3, "F");
  document.setFillColor(167, 139, 250);
  document.roundedRect(left + 13, 46, 12, 9, 3, 3, "F");
  document.setTextColor(99, 91, 255);
  document.setFontSize(18);
  document.setFont("helvetica", "bold");
  document.text("LEDGERLY", left + 34, 53);
  document.setTextColor(17, 24, 39);
  document.setFontSize(28);
  document.text("Invoice", left, 102);
  document.setFontSize(10);
  document.setFont("helvetica", "normal");
  document.setTextColor(107, 114, 128);
  document.text(invoice.invoiceNumber, right, 72, { align: "right" });
  document.text(`Issued ${formatDate(invoice.issueDate)}`, right, 88, { align: "right" });
  document.text(`Due ${formatDate(invoice.dueDate)}`, right, 104, { align: "right" });
  document.setDrawColor(229, 231, 235);
  document.line(left, 122, right, 122);
  document.setFontSize(9);
  document.text("BILL TO", left, 152);
  document.setTextColor(17, 24, 39);
  document.setFontSize(12);
  document.setFont("helvetica", "bold");
  document.text(invoice.client.company || invoice.client.name, left, 172);
  document.setFont("helvetica", "normal");
  document.setFontSize(10);
  document.text(invoice.client.name, left, 188);
  document.setTextColor(107, 114, 128);
  document.text(invoice.client.email, left, 204);
  document.text(invoice.client.billingAddress || invoice.client.city, left, 220, { maxWidth: 250 });
  let y = 270;
  document.setFillColor(247, 249, 252);
  document.rect(left, y - 18, right - left, 28, "F");
  document.setFont("helvetica", "bold");
  document.setTextColor(107, 114, 128);
  document.text("DESCRIPTION", left + 8, y);
  document.text("QTY", 360, y);
  document.text("RATE", 420, y);
  document.text("AMOUNT", right - 8, y, { align: "right" });
  y += 28;
  document.setTextColor(17, 24, 39);
  document.setFont("helvetica", "normal");
  for (const item of invoice.items) {
    document.text(item.description, left + 8, y, { maxWidth: 285 });
    document.text(String(item.quantity), 360, y);
    document.text(formatCurrency(item.rate), 420, y);
    document.text(formatCurrency(item.quantity * item.rate), right - 8, y, { align: "right" });
    document.setDrawColor(229, 231, 235);
    document.line(left, y + 10, right, y + 10);
    y += 30;
  }
  y += 12;
  const totals = [["Subtotal", calculateInvoiceSubtotal(invoice.items)], ["Tax", calculateInvoiceTax(invoice.items)], ["Discount", -invoice.discount], ["Total", calculateInvoiceTotal(invoice)]] as const;
  for (const [label, amount] of totals) {
    if (label === "Total") document.setFont("helvetica", "bold");
    document.text(label, 390, y);
    document.text(formatCurrency(amount), right, y, { align: "right" });
    y += 20;
  }
  document.setFont("helvetica", "normal");
  document.setFontSize(9);
  document.setTextColor(107, 114, 128);
  document.text(invoice.notes || "Thank you for your business.", left, Math.min(y + 30, 760), { maxWidth: 420 });
  document.save(`${invoice.invoiceNumber}.pdf`);
}
