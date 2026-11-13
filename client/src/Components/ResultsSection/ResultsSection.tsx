import HelpButton from "../Help/HelpButton";
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
  /** Grid items under the table: the auto charts, then the price-change cards. */
  children?: ReactNode,
};

/**
 * The frame of both search pages' results: a heading and toolbar, the table, then the auto
 * charts and price-change cards (half width each). Pinned items sit below it, outside.
 */
export default function ResultsSection({ searchLabel, toolbar, notice, table, children }: Props) {
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
      {notice && <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>{notice}<HelpButton topic="filters-and-hidden-results" /></Box>}
      <Paper sx={{ p: 1 }}>{table}</Paper>
      <Grid container spacing={1}>{children}</Grid>
    </Box>
  );
}
