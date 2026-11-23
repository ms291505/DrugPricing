import { useId, type ReactNode } from "react";
import { Box, Grid, Paper, Typography } from "@mui/material";

type Props = {
  /** What was searched, for the heading "Results: <search>" (`fdaResultsLabel`, `nadacResultsLabel`). */
  searchLabel: string,
  /** At the heading's right: the detail level on FDA. */
  toolbar?: ReactNode,
  /** Above the table: what the filters hid, when they hid everything. */
  notice?: ReactNode,
  /** Directly above the table, below the notices: the results toolbar (`ResultsToolbar`). */
  actions?: ReactNode,
  /** The results table. */
  table: ReactNode,
  /** Half-width price change cards (Notable price changes, scans). */
  priceChanges?: ReactNode,
  /** The live charts of the selected rows (`SelectionCharts`), first in the grid under the table. */
  children?: ReactNode,
};

/**
 * The frame of both search pages' results: a heading, the toolbar, the table, and a shared
 * responsive grid of live charts and price change cards. Pinned items sit below it, outside.
 */
export default function ResultsSection({ searchLabel, toolbar, notice, actions, table, priceChanges, children }: Props) {
  const headingId = useId();
  return (
    <Box component="section" aria-labelledby={headingId} sx={{ display: "flex", flexDirection: "column", gap: 1, width: "100%", minWidth: 0 }}>
      <Box sx={{
        display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 2, rowGap: 1, px: { xs: 1, md: 0 },
      }}>
        <Typography component="h2" variant="h6" id={headingId} data-results-heading tabIndex={-1} sx={{
          mr: "auto", minWidth: 0, overflowWrap: "anywhere", "&:focus-visible": { outline: "2px solid", outlineOffset: 2 },
        }}>
          Results: {searchLabel}
        </Typography>
        {toolbar}
      </Box>
      {notice}
      {actions}
      <Paper sx={{
        display: "flex", flexDirection: "column", p: { xs: 0, sm: 1 }, width: "100%", minWidth: 0, boxSizing: "border-box",
      }}>
        {table}
      </Paper>
      <Grid container spacing={2} alignItems="flex-start" sx={{ minWidth: 0 }}>
        {children}
        {priceChanges}
      </Grid>
    </Box>
  );
}
