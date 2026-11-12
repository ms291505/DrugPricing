import { useId, useState, type ReactNode } from "react";
import { Box, Button, CircularProgress, Collapse, Divider, FormControl, FormGroup, FormLabel, Paper, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

type Props = {
  /** The form's accessible name, e.g. "NADAC search". */
  label: string,
  /** Compact FDA layout with a heading, search hint, and a horizontal Include group. */
  compact?: boolean,
  heading?: string,
  description?: string,
  termsHint?: string,
  refineLabel?: string,
  /** The Search button: applies the text terms. */
  onSearch: () => void,
  /**
   * The terms are enough to search on and aren't the search already on screen (or that search
   * failed). Disabled otherwise, so the button lighting up is the hint to press it.
   */
  canSearch: boolean,
  /** A search is loading or waiting: the button shows a spinner. */
  busy: boolean,
  /** The text terms, on the first row with the Search button. */
  terms: ReactNode,
  /** The Dates field (`DatesField`). */
  dates: ReactNode,
  /** The default view's refine fields: the Include boxes, brand/generic. */
  refine: ReactNode,
  /** The fields under "More filters": the from-results lists. */
  moreFilters: ReactNode,
  /** How many of the "More filters" fields exclude something, shown on the toggle when closed. */
  moreFilterCount: number,
  /** Some refine field is away from its default, so "Clear filters" has something to do. */
  canClear: boolean,
  onClear: () => void,
};

/**
 * The frame of both search pages' panel, which is both the search and the filters (plan:
 * plans/search-filters.md). The text terms wait for Search, which sits beside them; every other
 * field applies at once, whether or not it fetches.
 * Each page lists its own fields; the layout, spacing and breakpoints live here.
 */
export default function SearchPanel({
  label, compact = false, heading, description, termsHint, refineLabel = "Filters", onSearch, canSearch, busy, terms, dates, refine, moreFilters, moreFilterCount, canClear, onClear,
}: Props) {
  // Not saved: a restored tab starts with it closed, and the count says what it holds.
  const [moreOpen, setMoreOpen] = useState(false);
  const moreId = useId();
  const filtersId = useId();

  return (
    <Paper
      component="form"
      aria-label={label}
      onSubmit={(e) => {
        e.preventDefault();
        if (canSearch && !busy) onSearch();
      }}
      sx={{ display: "flex", flexDirection: "column", gap: { xs: 1.5, sm: 2 }, p: { xs: 1.5, sm: 2 }, width: "100%" }}
    >
      {heading && <Box>
        <Typography variant="h6" component="h1">{heading}</Typography>
        {description && <Typography variant="body2" color="text.secondary">{description}</Typography>}
      </Box>}
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1, alignItems: { sm: "center" } }}>
        {terms}
        <Button
          type="submit"
          variant="contained"
          disabled={!canSearch || busy}
          sx={{ width: { xs: "100%", sm: 100 }, height: { sm: 40, md: 56 }, flexShrink: 0 }}
        >
          {busy ? <CircularProgress aria-label="Loading..." size={20} /> : "Search"}
        </Button>
      </Box>
      {termsHint && <Typography variant="body2" color="text.secondary">{termsHint}</Typography>}
      {compact && <Divider />}
      <Box sx={{ display: "flex", flexDirection: compact ? "column" : { xs: "column", md: "row" }, gap: { xs: 1, sm: 2 } }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>{dates}</Box>
        <FormControl component="fieldset" sx={{ flex: 1, minWidth: 0 }}>
          <FormLabel component="legend" id={filtersId} sx={{ typography: "subtitle2", color: "text.primary" }}>
            {refineLabel}
          </FormLabel>
          <FormGroup aria-labelledby={filtersId} sx={{
            flexDirection: compact ? { xs: "column", sm: "row" } : "column",
            columnGap: 3, rowGap: { xs: 0.5, sm: compact ? 0 : 1 },
          }}>
            {refine}
          </FormGroup>
        </FormControl>
      </Box>
      <Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Button
            size="small"
            aria-expanded={moreOpen}
            aria-controls={moreId}
            onClick={() => setMoreOpen(open => !open)}
            endIcon={<ExpandMoreIcon sx={{ transform: moreOpen ? "rotate(180deg)" : "none", transition: "transform 150ms" }} />}
          >
            More filters{!moreOpen && moreFilterCount > 0 ? ` (${moreFilterCount})` : ""}
          </Button>
          <Button size="small" variant={compact ? "outlined" : "text"} sx={{ ml: "auto" }} disabled={!canClear} onClick={onClear}>Clear filters</Button>
        </Box>
        <Collapse in={moreOpen} id={moreId}>
          <Box sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 2,
            pt: 2,
          }}>
            {moreFilters}
          </Box>
        </Collapse>
      </Box>
    </Paper>
  );
}
