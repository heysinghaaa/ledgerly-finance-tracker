import { describe, expect, it } from "vitest";
import { filterDataExplorerRows, parseDataExplorerUrlState } from "./data-explorer";

const records = [
  { id: "1", name: "Northstar Studio", type: "income" },
  { id: "2", name: "Figma Professional", type: "expense" },
];

describe("Elsecase data explorer helpers", () => {
  it("restores search, filters, sorting, and pagination from the URL", () => {
    const state = parseDataExplorerUrlState(new URLSearchParams("q=figma&filter.type=expense&sort=name.desc&page=2&size=25"), ["type"]);
    expect(state).toEqual({
      search: "figma",
      filters: { type: "expense" },
      sorting: [{ id: "name", desc: true }],
      pagination: { pageIndex: 1, pageSize: 25 },
    });
  });

  it("combines record search with named filters", () => {
    const filtered = filterDataExplorerRows(records, "figma", { getSearchText: (record) => record.name }, [{ id: "type", label: "Type", getValue: (record) => record.type, options: [] }], { type: "expense" });
    expect(filtered).toEqual([records[1]]);
  });
});
