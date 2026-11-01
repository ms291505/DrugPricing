import { describe, expect, it } from "vitest";
import type { WorkspaceTab } from "./tabType.ts";
import { replacementTabId, workspaceReducer, type WorkspaceState } from "./workspace";

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
    const fallback: WorkspaceTab = { id: "new", type: "new", title: "New Tab" };
    const remove = (id: string) => ({ type: "remove" as const, id, fallback });

    it("shows the next tab in its pane", () => {
      const next = workspaceReducer(workspace(["b"]), remove("b"));
      expect(next.tabs.map(t => t.id)).toEqual(["a", "c"]);
      expect(next.paneAssignment).toEqual(["c"]);
    });

    it("shows the previous tab when it was last", () => {
      const next = workspaceReducer(workspace(["c"]), remove("c"));
      expect(next.paneAssignment).toEqual(["b"]);
    });

    it("leaves a new tab, shown in its pane, when it was the only tab", () => {
      const prev: WorkspaceState = { tabs: [tab("a")], layoutMode: "single", paneAssignment: ["a"] };
      const next = workspaceReducer(prev, remove("a"));
      expect(next.tabs).toEqual([fallback]);
      expect(next.paneAssignment).toEqual(["new"]);
    });

    it("never leaves the workspace without a tab", () => {
      let state = workspace(["a"]);
      for (const id of ["a", "b", "c"]) state = workspaceReducer(state, remove(id));
      expect(state.tabs).toEqual([fallback]);
      expect(state.paneAssignment).toEqual(["new"]);
    });

    it("leaves a minimized pane empty when the only tab closes", () => {
      const prev: WorkspaceState = { tabs: [tab("a")], layoutMode: "single", paneAssignment: [null] };
      const next = workspaceReducer(prev, remove("a"));
      expect(next.tabs).toEqual([fallback]);
      expect(next.paneAssignment).toEqual([null]);
    });

    it("doesn't touch a pane showing another tab", () => {
      const next = workspaceReducer(workspace(["a"]), remove("b"));
      expect(next.paneAssignment).toEqual(["a"]);
    });

    it("keeps the remaining tabs' identity", () => {
      const prev = workspace();
      const next = workspaceReducer(prev, remove("b"));
      expect(next.tabs[0]).toBe(prev.tabs[0]);
      expect(next.tabs[1]).toBe(prev.tabs[2]);
    });

    it("ignores a tab that doesn't exist", () => {
      const prev = workspace();
      expect(workspaceReducer(prev, remove("x"))).toBe(prev);
    });
  });

  describe("replacementTabId", () => {
    const tabs = workspace().tabs;
    it("picks the next tab, or the previous one for the last tab", () => {
      expect(replacementTabId(tabs, "a", "new")).toBe("b");
      expect(replacementTabId(tabs, "b", "new")).toBe("c");
      expect(replacementTabId(tabs, "c", "new")).toBe("b");
    });

    it("picks the fallback for the only tab, and null for a missing one", () => {
      expect(replacementTabId([tab("a")], "a", "new")).toBe("new");
      expect(replacementTabId(tabs, "x", "new")).toBeNull();
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
