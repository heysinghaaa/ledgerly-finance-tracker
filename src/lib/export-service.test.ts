import { describe, expect, it } from "vitest";
import { createCsv } from "./export-service";

describe("CSV exports", () => {
  it("escapes commas, quotes, and line breaks without corrupting records", () => {
    const csv = createCsv(["Client", "Note", "Amount"], [["Northstar, Studio", "Said \"paid\"\non time", 1200]]);
    expect(csv).toBe('Client,Note,Amount\n"Northstar, Studio","Said ""paid""\non time",1200');
  });
});
