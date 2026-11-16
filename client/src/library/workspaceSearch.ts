import type { DateWindow } from "./dates";
import type { PersistedSearchTab } from "./persist";

/** Freeze the applied period and deep-copy snapshots; draft fields and selection aren't inputs. */
export function copySearchToWorkspace(state: PersistedSearchTab, dates: DateWindow): PersistedSearchTab {
  const copy = structuredClone(state);
  copy.criteria.dates = { kind: "window", dateWindow: { ...dates } };
  return copy;
}
