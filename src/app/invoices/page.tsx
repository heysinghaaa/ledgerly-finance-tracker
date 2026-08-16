import { LedgerlyWorkspace } from "@/components/ledgerly-workspace";

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const parameters = await searchParams;
  const invoiceId = typeof parameters.invoice === "string" ? parameters.invoice : "";
  return <LedgerlyWorkspace activeView="invoices" initialSelectedInvoiceId={invoiceId} />;
}
