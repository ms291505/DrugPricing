import { useId, useState, type ReactNode } from "react";
import { Box, Button, CircularProgress, Collapse, FormControl, FormGroup, FormLabel, Paper, TextField, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import useWidthTier from "../../hooks/useWidthTier";
import type { ChartDates } from "../../library/dates";
import DatesField from "./DatesField";
import IncludeCheckbox from "./IncludeCheckbox";

/**
 * How the panel is arranged. `desktop` has the heading and description and full-height fields;
 * `compact` has no heading, small fields and smaller Include boxes. In both, the filters share a
 * row as far as the panel's width allows.
 */
export type SearchPanelLayout = "desktop" | "compact";

/** A text term: a draft that waits for Search. */
export type TermField = {
  /** The input's id and name. */
  id: string,
  label: string,
  placeholder?: string,
  value: string,
  onChange: (value: string) => void,
  /** Its share of the row beside the other terms (default 1). */
  flex?: number,
};

/** An Include box. */
export type IncludeField = {
  key: string,
  label: string,
  checked: boolean,
  onChange: (checked: boolean) => void,
  /** Rows of the table that ticking the box would add. */
  hiddenCount: number,
};

/** A filter group: a rule on its left, which the row hides for the first group of each line. */
const groupSx = { minWidth: 0, pl: 2, borderLeft: 1, borderColor: "divider" } as const;
/** Pulls the row left by a group's padding and rule. */
const GROUP_INSET = "calc(-16px - 1px)";

type Props = {
  /** The form's accessible name, e.g. "NADAC search". */
  label: string,
  /**
   * Forces a layout. Left out, the panel picks by its own width: `desktop` from the `md`
   * breakpoint up, `compact` below. Workspace tabs force `compact`.
   */
  layout?: SearchPanelLayout,
  /** Shown by the `desktop` layout only. */
  heading?: string,
  description?: string,
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
  terms: TermField[],
  /** The search's dates, which apply at once. */
  dates: ChartDates,
  onDatesChange: (dates: ChartDates) => void,
  /** The Include boxes. */
  includes: IncludeField[],
  /** The default view's other refine fields, each a labelled group (brand/generic). */
  refine?: ReactNode,
  /** The fields under "More filters": the from-results lists. */
  moreFilters: ReactNode,
  /** How many of the "More filters" fields exclude something, shown on the toggle when closed. */
  moreFilterCount: number,
  /** Some refine field is away from its default, so "Clear filters" has something to do. */
  canClear: boolean,
  onClear: () => void,
};

/**
 * Both search pages' panel, which is both the search and the filters (plan:
 * plans/search-filters.md). The text terms wait for Search, which sits beside them; every other
 * field applies at once, whether or not it fetches.
 * Each page lists its own fields; the layouts, spacing and breakpoints live here, so the two
 * pages can't drift apart. Everything is sized by the panel's own width, not the window's.
 */
export default function SearchPanel({
  label, layout: forcedLayout, heading, description, onSearch, canSearch, busy, terms, dates, onDatesChange, includes, refine,
  moreFilters, moreFilterCount, canClear, onClear,
}: Props) {
  // Not saved: a restored tab starts with it closed, and the count says what it holds.
  const [moreOpen, setMoreOpen] = useState(false);
  const moreId = useId();
  const includeId = useId();

  const [ref, tier] = useWidthTier<HTMLFormElement>();
  const desktop = (forcedLayout ?? (tier === "wide" ? "desktop" : "compact")) === "desktop";
  // Too narrow for Search beside the terms.
  const stacked = tier === "narrow";

  return (
    <Paper
      ref={ref}
      component="form"
      aria-label={label}
      onSubmit={(e) => {
        e.preventDefault();
        if (canSearch && !busy) onSearch();
      }}
      sx={{ display: "flex", flexDirection: "column", gap: desktop ? 2 : 1.5, p: desktop ? 2 : 1.5, width: "100%" }}
    >
      {desktop && heading && <Box>
        <Typography variant="h6" component="h1">{heading}</Typography>
        {description && <Typography variant="body2" color="text.secondary">{description}</Typography>}
      </Box>}
      <Box sx={{ display: "flex", flexDirection: stacked ? "column" : "row", gap: 1, alignItems: stacked ? "stretch" : "center" }}>
        {terms.map(term => (
          <TextField
            key={term.id}
            size={desktop ? "medium" : "small"}
            id={term.id}
            name={term.id}
            label={term.label}
            placeholder={term.placeholder}
            value={term.value}
            onChange={(e) => term.onChange(e.target.value)}
            sx={{ flex: stacked ? "none" : term.flex ?? 1, minWidth: 0 }}
          />
        ))}
        <Button
          type="submit"
          variant="contained"
          disabled={!canSearch || busy}
          // As tall as the fields beside it.
          sx={{ width: stacked ? "100%" : 100, height: desktop ? 56 : 40, flexShrink: 0 }}
        >
          {busy ? <CircularProgress aria-label="Loading..." size={20} /> : "Search"}
        </Button>
      </Box>
      {/* One row while it fits; a group that doesn't fit wraps under the others, so a phone stacks
          them. A rule divides the groups of a row: the first group's falls outside and is clipped. */}
      <Box sx={{ overflowX: "clip" }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", columnGap: 2, rowGap: 1.5, ml: GROUP_INSET }}>
        <Box sx={groupSx}><DatesField value={dates} onChange={onDatesChange} /></Box>
        <FormControl component="fieldset" sx={groupSx}>
          <FormLabel component="legend" id={includeId} sx={{ typography: "subtitle2", color: "text.primary" }}>Include</FormLabel>
          {/* The top margin puts the boxes level with the Dates presets beside them. */}
          <FormGroup aria-labelledby={includeId} sx={{ flexDirection: "row", flexWrap: "wrap", columnGap: 2, mt: desktop ? 0.75 : 0.5 }}>
            {includes.map(({ key, ...include }) => <IncludeCheckbox key={key} dense={!desktop} {...include} />)}
          </FormGroup>
        </FormControl>
        {refine ? <Box sx={groupSx}>{refine}</Box> : null}
      </Box>
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
            gridTemplateColumns: tier === "wide" ? "1fr 1fr" : "1fr",
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
