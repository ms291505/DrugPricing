import { useId, useRef, type ReactNode } from "react";
import { Box, Grid, Paper, Typography } from "@mui/material";
import { ResultsHeadingContext } from "./resultsHeading";

type Props = {
  /** What was searched, for the heading "Results: <search>" (`fdaResultsLabel`, `nadacResultsLabel`). */
  searchLabel: string,
  /** At the heading's right: the detail level on FDA, and Chart selected. */
  toolbar: ReactNode,
  /** Above the table: what the filters hid, when they hid everything. */
  notice?: ReactNode,
  /** The results table. */
  table: ReactNode,
  /** Half-width event cards (Notable price changes and any open package event charts). */
  priceChanges?: ReactNode,
  /** Compare controls and live charts directly under the table. */
  children?: ReactNode,
};

/**
 * The frame of both search pages' results: a heading, table, and shared responsive grid of live
 * comparisons and event cards. Pinned items sit below it, outside.
 */
export default function ResultsSection({ searchLabel, toolbar, notice, table, priceChanges, children }: Props) {
  const headingId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  return (
    <Box component="section" aria-labelledby={headingId} sx={{ display: "flex", flexDirection: "column", gap: 1, width: "100%", minWidth: 0 }}>
      <Box sx={{
        display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 2, rowGap: 1, px: { xs: 1, md: 0 },
      }}>
        <Typography component="h2" variant="h6" id={headingId} ref={headingRef} tabIndex={-1} sx={{
          mr: "auto", minWidth: 0, overflowWrap: "anywhere", "&:focus-visible": { outline: "2px solid", outlineOffset: 2 },
        }}>
          Results: {searchLabel}
        </Typography>
        {toolbar}
      </Box>
      {notice}
      <Paper sx={{
        display: "flex", flexDirection: "column", p: { xs: 0, sm: 1 }, width: "100%", minWidth: 0, boxSizing: "border-box",
      }}>{table}</Paper>
      <ResultsHeadingContext value={headingRef}>
        <Grid container spacing={2} alignItems="flex-start" sx={{ minWidth: 0 }}>
          {children}
          {priceChanges}
        </Grid>
      </ResultsHeadingContext>
    </Box>
  );
}
