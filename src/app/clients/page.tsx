import { LedgerlyWorkspace } from "@/components/ledgerly-workspace";

export default async function ClientsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const parameters = await searchParams;
  const clientId = typeof parameters.client === "string" ? parameters.client : "";
  return <LedgerlyWorkspace activeView="clients" initialSelectedClientId={clientId} />;
}
