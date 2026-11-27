import { describe, expect, it } from "vitest";
import type { WorkspaceTab } from "./tabType.ts";
import { isFreshWorkspace, replacementTabId, workspaceReducer, type WorkspaceState } from "./workspace";

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

  it("opens an imported search in the first pane without changing other tabs or layout", () => {
    const prev = { ...workspace(["a", "b"]), layoutMode: "split-2" as const };
    const next = workspaceReducer(prev, { type: "add", tab: tab("copy"), show: true });
    expect(next.paneAssignment).toEqual(["copy", "b"]);
    expect(next.layoutMode).toBe("split-2");
    prev.tabs.forEach((t, i) => expect(next.tabs[i]).toBe(t));
  });

  it("replaces the startup blank when opening an imported search", () => {
    const blank: WorkspaceTab = { id: "blank", type: "new", title: "New Tab" };
    const prev: WorkspaceState = { tabs: [blank], layoutMode: "single", paneAssignment: [blank.id] };
    const copy = tab("copy");
    const next = workspaceReducer(prev, { type: "add", tab: copy, show: true });
    expect(next.tabs).toEqual([copy]);
    expect(next.paneAssignment).toEqual([copy.id]);
  });

  it("reuses only the displaced blank and preserves other tabs and panes", () => {
    const blank: WorkspaceTab = { id: "blank", type: "new", title: "New Tab" };
    const otherBlank = { ...blank, id: "other-blank" };
    const saved = tab("saved");
    const prev: WorkspaceState = { tabs: [saved, blank, otherBlank], layoutMode: "split-2", paneAssignment: [blank.id, saved.id] };
    const copy = tab("copy");
    const next = workspaceReducer(prev, { type: "add", tab: copy, show: true });
    expect(next.tabs).toEqual([saved, copy, otherBlank]);
    expect(next.tabs[0]).toBe(saved);
    expect(next.tabs[2]).toBe(otherBlank);
    expect(next.paneAssignment).toEqual([copy.id, saved.id]);
    expect(next.layoutMode).toBe("split-2");
  });

  it.each([
    { title: "Named blank", panes: ["blank"] },
    { title: "New Tab", panes: [null] },
    { title: "New Tab", panes: ["blank", "blank"] },
  ])("keeps a blank that isn't untouched and exclusive to the destination: %j", ({ title, panes }) => {
    const blank: WorkspaceTab = { id: "blank", type: "new", title };
    const prev: WorkspaceState = { tabs: [blank], layoutMode: "single", paneAssignment: panes };
    const next = workspaceReducer(prev, { type: "add", tab: tab("copy"), show: true });
    expect(next.tabs[0]).toBe(blank);
    expect(next.tabs).toHaveLength(2);
  });

  it("keeps the blank when adding without opening a tab", () => {
    const blank: WorkspaceTab = { id: "blank", type: "new", title: "New Tab" };
    const prev: WorkspaceState = { tabs: [blank], layoutMode: "single", paneAssignment: [blank.id] };
    const next = workspaceReducer(prev, { type: "add", tab: tab("copy") });
    expect(next.tabs).toHaveLength(2);
    expect(next.tabs[0]).toBe(blank);
    expect(next.paneAssignment).toBe(prev.paneAssignment);
  });

  it("starts over with one tab, alone in a single pane", () => {
    const fresh: WorkspaceTab = { id: "new", type: "new", title: "New Tab" };
    const next = workspaceReducer({ ...workspace(["a", "b"]), layoutMode: "split-2" }, { type: "reset", tab: fresh });
    expect(next).toEqual({ tabs: [fresh], layoutMode: "single", paneAssignment: ["new"] });
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

describe("isFreshWorkspace", () => {
  const blank: WorkspaceTab = { id: "n", type: "new", title: "New tab" };

  it("is fresh only while the workspace is a single blank tab", () => {
    expect(isFreshWorkspace([blank])).toBe(true);
    expect(isFreshWorkspace([tab("a")])).toBe(false);
    expect(isFreshWorkspace([blank, { ...blank, id: "m" }])).toBe(false);
    expect(isFreshWorkspace([blank, tab("a")])).toBe(false);
  });
});
