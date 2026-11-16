import { useId, type ReactNode } from "react";
import { Box, Grid, Paper, Typography } from "@mui/material";

type Props = {
  /** What was searched, for the heading "Results: <search>" (`fdaResultsLabel`, `nadacResultsLabel`). */
  searchLabel: string,
  /** At the heading's right: the detail level on FDA, and Chart selected. */
  toolbar: ReactNode,
  /** Above the table: what the filters hid, when they hid everything. */
  notice?: ReactNode,
  /** The results table. */
  table: ReactNode,
  priceChanges?: ReactNode,
  /** Live Compare chart cards under the table and event list. */
  children?: ReactNode,
};

/**
 * The frame of both search pages' results: a heading and toolbar, the table, then the auto
 * comparisons and event list. Pinned items sit below it, outside.
 */
export default function ResultsSection({ searchLabel, toolbar, notice, table, priceChanges, children }: Props) {
  const headingId = useId();
  return (
    <Box component="section" aria-labelledby={headingId} sx={{ display: "flex", flexDirection: "column", gap: 1, width: "100%", minWidth: 0 }}>
      <Box sx={{
        display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 2, rowGap: 1, px: { xs: 1, md: 0 },
      }}>
        <Typography component="h2" variant="h6" id={headingId} sx={{ mr: "auto", minWidth: 0, overflowWrap: "anywhere" }}>
          Results: {searchLabel}
        </Typography>
        {toolbar}
      </Box>
      {notice}
      <Paper sx={{
        display: "flex", flexDirection: "column", p: { xs: 0, sm: 1 }, width: "100%", minWidth: 0, boxSizing: "border-box",
      }}>{table}</Paper>
      {priceChanges}
      <Grid container spacing={1}>{children}</Grid>
    </Box>
  );
}
