import { useId, type ReactNode } from "react";
import { Box, Grid, Paper, Typography } from "@mui/material";
import useWidthTier from "../../hooks/useWidthTier";

type Props = {
  /** What was searched, for the heading "Results: <search>" (`fdaResultsLabel`, `nadacResultsLabel`). */
  searchLabel: string,
  /**
   * After the heading, in its row: the results toolbar (`ResultsToolbar`), given the section's
   * narrow tier. It moves under the heading, as one piece, when the two don't fit one line.
   */
  toolbar: (compact: boolean) => ReactNode,
  /** Under the heading row: the last action's report (`ResultsReport`), given the narrow tier. */
  status?: (compact: boolean) => ReactNode,
  /** Above the table: what the filters hid, when they hid everything. */
  notice?: ReactNode,
  /** The results table. */
  table: ReactNode,
  /** The grid under the table: the page's cards (`ResultCards`). */
  children?: ReactNode,
};

/**
 * The frame of both search pages' results: a heading row with the toolbar, the table, and a shared
 * responsive grid of price change lists and added charts. Pinned items sit below it, outside.
 */
export default function ResultsSection({ searchLabel, toolbar, status, notice, table, children }: Props) {
  const headingId = useId();
  // The section's width is the table's, so its tier is the table's.
  const [ref, widthTier] = useWidthTier<HTMLElement>();
  const compact = widthTier === "narrow";
  return (
    <Box component="section" ref={ref} aria-labelledby={headingId} sx={{ display: "flex", flexDirection: "column", gap: 1, width: "100%", minWidth: 0 }}>
      <Box>
        {/* Flex wraps by each item's full width, so the toolbar, one item, drops under the
            heading before either wraps inside. */}
        <Box sx={{
          display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 2, rowGap: 1, px: { xs: 1, md: 0 },
        }}>
          <Typography component="h2" variant="h6" id={headingId} data-results-heading tabIndex={-1} sx={{
            mr: "auto", minWidth: 0, overflowWrap: "anywhere", "&:focus-visible": { outline: "2px solid", outlineOffset: 2 },
          }}>
            Results: {searchLabel}
          </Typography>
          {toolbar(compact)}
        </Box>
        {status?.(compact)}
      </Box>
      {notice}
      <Paper sx={{
        display: "flex", flexDirection: "column", p: { xs: 0, sm: 1 }, width: "100%", minWidth: 0, boxSizing: "border-box",
      }}>
        {table}
      </Paper>
      <Grid container spacing={2} alignItems="flex-start" sx={{ minWidth: 0 }}>
        {children}
      </Grid>
    </Box>
  );
}
