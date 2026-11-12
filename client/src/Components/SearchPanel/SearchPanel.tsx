import { useId, useState, type ReactNode } from "react";
import { Box, Button, CircularProgress, Collapse, Paper } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

type Props = {
  /** The form's accessible name, e.g. "NADAC search". */
  label: string,
  /** The Search button: applies the load fields (the text terms and Dates). */
  onSearch: () => void,
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
 * plans/search-filters.md). Text and Dates wait for Search; every other field applies at once.
 * Each page lists its own fields; the layout, spacing and breakpoints live here.
 */
export default function SearchPanel({
  label, onSearch, canSearch, busy, terms, dates, refine, moreFilters, moreFilterCount, canClear, onClear,
}: Props) {
  // Not saved: a restored tab starts with it closed, and the count says what it holds.
  const [moreOpen, setMoreOpen] = useState(false);
  const moreId = useId();

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
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1, alignItems: { sm: "center" } }}>
        {terms}
        <Button
          type="submit"
          variant="contained"
          disabled={!canSearch || busy}
          sx={{ width: { xs: "100%", sm: 100 }, height: { sm: 40 }, flexShrink: 0 }}
        >
          {busy ? <CircularProgress aria-label="Loading..." size={20} /> : "Search"}
        </Button>
      </Box>
      <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: { xs: 1, sm: 2 } }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>{dates}</Box>
        <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: { xs: 0.5, sm: 1 } }}>{refine}</Box>
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
          <Button size="small" sx={{ ml: "auto" }} disabled={!canClear} onClick={onClear}>Clear filters</Button>
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
