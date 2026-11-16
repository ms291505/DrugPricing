import { useState } from "react";
import type { GridRowSelectionModel } from "@mui/x-data-grid";
import toast from "react-hot-toast";
import type { PriceEventGroup } from "../library/priceActivity";

export type ActivitySelectionRequest = { ids: string[], onHandled: () => void };

/** A one-shot table jump, shared by both sources. Consuming it prevents replay after remount. */
export default function useActivitySelection(selection: GridRowSelectionModel, setSelection: (selection: GridRowSelectionModel) => void) {
  const [activitySelection, setActivitySelection] = useState<ActivitySelectionRequest>();
  const selectAffected = (group: PriceEventGroup, replace = false) => {
    const ids = [...new Set(group.events.map(event => event.packageNdc))];
    const combined = new Set(replace ? [] : selection.ids);
    ids.forEach(id => combined.add(id));
    setSelection({ type: "include", ids: combined });
    const request: ActivitySelectionRequest = {
      ids,
      onHandled: () => setActivitySelection(current => current === request ? undefined : current),
    };
    setActivitySelection(request);
    toast.success(`${ids.length} affected ${ids.length === 1 ? "row" : "rows"} selected · ${combined.size} selected in total`);
  };
  return { activitySelection, selectAffected };
}
