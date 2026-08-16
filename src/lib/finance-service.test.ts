import { beforeEach, describe, expect, it } from "vitest";
import {
  calculateInvoiceSubtotal,
  calculateInvoiceTax,
  calculateInvoiceTotal,
  getStoredFinanceState,
  normalizeFinanceState,
  persistFinanceState,
  updateInvoice,
} from "./finance-service";
import { initialFinanceState } from "./mock-data";

describe("finance calculations", () => {
  it("calculates invoice subtotal, tax, discount, and total", () => {
    const invoice = initialFinanceState.invoices[0];
    expect(calculateInvoiceSubtotal(invoice.items)).toBe(56_400);
    expect(calculateInvoiceTax(invoice.items)).toBe(10_152);
    expect(calculateInvoiceTotal(invoice)).toBe(65_352);
  });

  it("adds a lifecycle event when an invoice status changes", () => {
    const state = structuredClone(initialFinanceState);
    const invoice = state.invoices[0];
    const next = updateInvoice(state, { ...invoice, status: "paid" });
    expect(next.invoices[0].activity.at(-1)?.type).toBe("paid");
    expect(next.invoices[0].status).toBe("paid");
  });
});

describe("finance persistence", () => {
  beforeEach(() => window.localStorage.clear());

  it("round-trips a scoped workspace through local storage", () => {
    persistFinanceState(initialFinanceState, "portfolio-user");
    expect(getStoredFinanceState("portfolio-user")).toEqual(initialFinanceState);
  });

  it("migrates the exact legacy placeholder without touching arbitrary clients", () => {
    const legacy = structuredClone(initialFinanceState);
    legacy.clients[2] = {
      ...legacy.clients[2],
      name: "Alex Smith",
      company: "Personal Project Fund",
      email: "self@ledgerly.local",
    };
    legacy.invoices[2].client = { ...legacy.invoices[2].client, ...legacy.clients[2] };
    const normalized = normalizeFinanceState(legacy);
    expect(normalized.clients[2].name).toBe("Kabir Sethi");
    expect(normalized.invoices[2].client.company).toBe("Fieldnote Labs");
  });
});
