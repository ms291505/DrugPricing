import { Box, Tooltip, Typography } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { activitySparklinePath, comparePriceActivity, type PriceActivity } from "../../library/priceActivity";
import type { PricedRow } from "../../library/resultRows";

/** Each sparkline has a bounded price scale and proportional dates; its label is the accessible equivalent. */
function ActivityCell({ activity }: { activity: PriceActivity }) {
  const { points, label } = activity;
  const path = activitySparklinePath(points);
  return <Tooltip title={label}><Box sx={{ display: "flex", alignItems: "center", gap: 1, height: "100%", minWidth: 0 }}>
    {path && <Box component="svg" viewBox="0 0 56 24" width={56} height={24} aria-hidden="true" sx={{ color: "text.secondary", flexShrink: 0 }}>
      <path d={path} fill="none" stroke="currentColor" strokeWidth={1.5} />
    </Box>}
    <Typography variant="body2" noWrap>{label}</Typography>
  </Box></Tooltip>;
}

export function activityColumn<R extends PricedRow>(): GridColDef<R, PriceActivity, string> {
  return {
    field: "priceActivity", headerName: "Price Activity", width: 360, minWidth: 200,
    filterable: false,
    description: "Sorts significant changes first, then other changed, stable and insufficient history.",
    sortComparator: comparePriceActivity,
    valueFormatter: (activity: PriceActivity) => activity.label,
    renderCell: ({ value }) => value ? <ActivityCell activity={value} /> : null,
  };
}
