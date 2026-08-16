import { LedgerlyWorkspace } from "@/components/ledgerly-workspace";

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const parameters = await searchParams;
  const expenseId = typeof parameters.expense === "string" ? parameters.expense : "";
  return <LedgerlyWorkspace activeView="expenses" initialSelectedExpenseId={expenseId} />;
}
