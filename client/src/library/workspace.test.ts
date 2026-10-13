import { describe, expect, it } from "vitest";
import type { WorkspaceTab } from "./types";
import { workspaceReducer, type WorkspaceState } from "./workspace";

const tab = (id: string, title = id): WorkspaceTab => ({ id, type: "fda", title });

const workspace = (paneAssignment: Array<string | null> = ["a"]): WorkspaceState => ({
  tabs: [tab("a"), tab("b"), tab("c")],
  layoutMode: "single",
  paneAssignment,
});

describe("workspaceReducer", () => {
  it("adds a tab and keeps the others", () => {
    const prev = workspace();
    const next = workspaceReducer(prev, { type: "add", tab: tab("d") });
    expect(next.tabs.map(t => t.id)).toEqual(["a", "b", "c", "d"]);
    prev.tabs.forEach((t, i) => expect(next.tabs[i]).toBe(t));
  });

  describe("closing a tab", () => {
    it("shows the next tab in its pane", () => {
      const next = workspaceReducer(workspace(["b"]), { type: "remove", id: "b" });
      expect(next.tabs.map(t => t.id)).toEqual(["a", "c"]);
      expect(next.paneAssignment).toEqual(["c"]);
    });

    it("shows the previous tab when it was last", () => {
      const next = workspaceReducer(workspace(["c"]), { type: "remove", id: "c" });
      expect(next.paneAssignment).toEqual(["b"]);
    });

    it("leaves the pane empty when it was the only tab", () => {
      const prev: WorkspaceState = { tabs: [tab("a")], layoutMode: "single", paneAssignment: ["a"] };
      expect(workspaceReducer(prev, { type: "remove", id: "a" }).paneAssignment).toEqual([null]);
    });

    it("doesn't touch a pane showing another tab", () => {
      const next = workspaceReducer(workspace(["a"]), { type: "remove", id: "b" });
      expect(next.paneAssignment).toEqual(["a"]);
    });

    it("keeps the remaining tabs' identity", () => {
      const prev = workspace();
      const next = workspaceReducer(prev, { type: "remove", id: "b" });
      expect(next.tabs[0]).toBe(prev.tabs[0]);
      expect(next.tabs[1]).toBe(prev.tabs[2]);
    });

    it("ignores a tab that doesn't exist", () => {
      const prev = workspace();
      expect(workspaceReducer(prev, { type: "remove", id: "x" })).toBe(prev);
    });
  });

  describe("renaming a tab", () => {
    it("trims the title and keeps the other tabs' identity", () => {
      const prev = workspace();
      const next = workspaceReducer(prev, { type: "rename", id: "b", title: "  Humira " });
      expect(next.tabs[1]).toEqual(tab("b", "Humira"));
      expect(next.tabs[0]).toBe(prev.tabs[0]);
      expect(next.tabs[2]).toBe(prev.tabs[2]);
    });

    it("ignores an invalid title or a tab that doesn't exist", () => {
      const prev = workspace();
      expect(workspaceReducer(prev, { type: "rename", id: "b", title: "   " })).toBe(prev);
      expect(workspaceReducer(prev, { type: "rename", id: "b", title: "b" })).toBe(prev);
      expect(workspaceReducer(prev, { type: "rename", id: "x", title: "Humira" })).toBe(prev);
    });
  });

  it("changes a tab's type and title and keeps the other tabs' identity", () => {
    const prev = workspace();
    const next = workspaceReducer(prev, { type: "changeType", id: "a", tabType: "nadac", title: "New NADAC Search" });
    expect(next.tabs[0]).toEqual({ id: "a", type: "nadac", title: "New NADAC Search" });
    expect(next.tabs[1]).toBe(prev.tabs[1]);
    expect(next.tabs[2]).toBe(prev.tabs[2]);
  });

  it("switches panes without touching the tabs", () => {
    const prev = workspace(["a"]);
    const next = workspaceReducer(prev, { type: "setPanes", value: ["b"] });
    expect(next.paneAssignment).toEqual(["b"]);
    // A switch must not re-render any tab's page.
    expect(next.tabs).toBe(prev.tabs);
  });

  it("applies functional pane updates to the current panes", () => {
    const next = workspaceReducer(workspace(["a"]), {
      type: "setPanes",
      value: prev => prev.map(p => (p === "a" ? null : p)),
    });
    expect(next.paneAssignment).toEqual([null]);
  });
});
