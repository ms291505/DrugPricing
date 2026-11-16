import { describe, expect, it } from "vitest";
import { orderColumns } from "./columnOrder";

const columns = ["a", "b", "c", "d", "e"].map(field => ({ field }));

describe("orderColumns", () => {
  it("puts the listed columns first, in the listed order, and keeps the rest's order", () => {
    expect(orderColumns(columns, ["c", "a"]).map(column => column.field)).toEqual(["c", "a", "b", "d", "e"]);
  });

  it("ignores unknown names and never repeats or copies a column", () => {
    const ordered = orderColumns(columns, ["x", "b", "b"]);
    expect(ordered.map(column => column.field)).toEqual(["b", "a", "c", "d", "e"]);
    expect(ordered[0]).toBe(columns[1]);
  });
});
