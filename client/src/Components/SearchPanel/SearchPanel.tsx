import { useId, useRef, useState, type ReactNode } from "react";
import { Box, Button, CircularProgress, Collapse, FormControl, FormGroup, FormLabel, Paper, TextField, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import useWidthTier from "../../hooks/useWidthTier";
import type { ChartDates } from "../../library/dates";
import { fromKeyboard } from "../ui/focus";
import DatesField from "./DatesField";
import LabelerField from "./LabelerField";
import type { LabelerChoice } from "../../library/labelers";
import IncludeCheckbox from "./IncludeCheckbox";

/**
 * How the panel is arranged. `desktop` has the heading and description and full-height fields;
 * `compact` has no heading, small fields and smaller Include boxes. In both, the filters share a
 * row as far as the panel's width allows.
 */
export type SearchPanelLayout = "desktop" | "compact";

/** A term: a draft that waits for Search. A text field, or the Labeler combo box. */
export type TermField = {
  /** The input's id and name. */
  id: string,
  label: string,
  placeholder?: string,
  /** Its share of the row beside the other terms (default 1). */
  flex?: number,
} & (
  | { kind?: "text", value: string, onChange: (value: string) => void }
  | {
    kind: "labelers",
    value: LabelerChoice[],
    onChange: (value: LabelerChoice[]) => void,
    /** The page's Include boxes, which decide the labelers offered. */
    includeOtc: boolean,
    includeWithoutPrices: boolean,
  }
);

/** An Include box. */
export type IncludeField = {
  key: string,
  label: string,
  checked: boolean,
  onChange: (checked: boolean) => void,
  /** Rows of the table that ticking the box would add. */
  hiddenCount: number,
};

/** A filter group's left padding, in theme spacing units. */
const GROUP_PADDING = 2;
/** A filter group: a rule on its left, which the row hides for the first group of each line. */
const groupSx = { minWidth: 0, pl: GROUP_PADDING, borderLeft: 1, borderColor: "divider" } as const;

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
  /** Source navigation above the fields, replacing the heading in both layouts. */
  navigation?: ReactNode,
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
  /** Clear search, beside Search: empties the terms and resets every field, so nothing loads. */
  onClearSearch: () => void,
  /** A search has been applied or a term holds text, so Clear search has something to do. */
  canClearSearch: boolean,
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
  /** Standalone-only action beside the filter controls. Workspace tabs omit it. */
  standaloneAction?: ReactNode,
};

/**
 * Both search pages' panel, which is both the search and the filters. The text terms wait for
 * Search, which sits beside them; every other field applies at once, whether or not it fetches.
 * Each page lists its own fields; the layouts, spacing and breakpoints live here, so the two
 * pages can't drift apart. Everything is sized by the panel's own width, not the window's.
 */
export default function SearchPanel({
  label, layout: forcedLayout, heading, navigation, description, onSearch, canSearch, busy, onClearSearch, canClearSearch, terms, dates, onDatesChange, includes, refine,
  moreFilters, moreFilterCount, canClear, onClear, standaloneAction,
}: Props) {
  // Not saved: a restored tab starts with it closed, and the count says what it holds.
  const [moreOpen, setMoreOpen] = useState(false);
  const moreId = useId();
  const includeId = useId();
  const firstTermRef = useRef<HTMLInputElement>(null);
  const moreFiltersRef = useRef<HTMLButtonElement>(null);
  // Clear search remounts Dates: its own state (Custom picked, typed dates waiting to apply)
  // would otherwise outlive the reset, since nothing else changes the dates from outside.
  const [clearCount, setClearCount] = useState(0);

  const [ref, tier] = useWidthTier<HTMLFormElement>();
  const desktop = (forcedLayout ?? (tier === "wide" ? "desktop" : "compact")) === "desktop";
  // Too narrow for Search beside the terms.
  const stacked = tier === "narrow";

  // Compact, not stacked, with a Labeler: the names' row, then Labeler beside the buttons.
  const labelerTerms = terms.filter(term => term.kind === "labelers");
  const textTerms = terms.filter(term => term.kind !== "labelers");
  const splitTerms = !desktop && !stacked && labelerTerms.length > 0;
  const termRowSx = { display: "flex", flexDirection: stacked ? "column" : "row", gap: 1, alignItems: stacked ? "stretch" : "center" } as const;

  const renderTerm = (term: TermField) => term.kind === "labelers" ? (
    <Box key={term.id} sx={{ flex: stacked ? "none" : term.flex ?? 1, minWidth: 0, alignSelf: stacked ? "stretch" : "flex-start" }}>
      <LabelerField
        id={term.id}
        label={term.label}
        placeholder={term.placeholder}
        value={term.value}
        onChange={term.onChange}
        includeOtc={term.includeOtc}
        includeWithoutPrices={term.includeWithoutPrices}
        size={desktop ? "medium" : "small"}
        limitTags={desktop ? undefined : 2}
        minTarget={stacked ? 44 : 24}
      />
    </Box>
  ) : (
    <TextField
      key={term.id}
      inputRef={term === terms[0] ? firstTermRef : undefined}
      slotProps={term === terms[0] ? { htmlInput: { "data-first-term": true } } : undefined}
      size={desktop ? "medium" : "small"}
      id={term.id}
      name={term.id}
      label={term.label}
      placeholder={term.placeholder}
      value={term.value}
      onChange={(e) => term.onChange(e.target.value)}
      sx={{ flex: stacked ? "none" : term.flex ?? 1, minWidth: 0 }}
    />
  );

  const actions = (
    <>
      <Button
        type="submit"
        variant="contained"
        disabled={!canSearch || busy}
        // As tall as the fields beside it.
        sx={{ width: stacked ? "100%" : 100, height: desktop ? 56 : 40, flexShrink: 0 }}
      >
        {busy ? <CircularProgress aria-label="Loading..." size={20} /> : "Search"}
      </Button>
      <Button
        type="button"
        disabled={!canClearSearch}
        onClick={event => {
          onClearSearch();
          setClearCount(count => count + 1);
          // The button disables itself: from the keyboard, focus goes where the next search
          // starts. Not after a tap, where focusing a text field opens the phone keyboard.
          if (fromKeyboard(event)) firstTermRef.current?.focus();
        }}
        sx={{ height: desktop ? 56 : 40, flexShrink: 0, whiteSpace: "nowrap" }}
      >
        Clear search
      </Button>
    </>
  );

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
      {navigation ? <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", columnGap: 3, borderBottom: 1, borderColor: "divider" }}>
        {navigation}
        {desktop && description && <Typography variant="body2" color="text.secondary" sx={{ flex: "1 1 300px", py: 0.5 }}>{description}</Typography>}
      </Box> : desktop && heading && <Box>
        <Typography variant="h6" component="h1">{heading}</Typography>
        {description && <Typography variant="body2" color="text.secondary">{description}</Typography>}
      </Box>}
      {/* The terms and their buttons, in reading order, so focus moves the way it looks. A compact
          panel with a Labeler gives the names a row, then Labeler and the buttons the next. */}
      {splitTerms ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Box sx={{ display: "flex", gap: 1 }}>{textTerms.map(renderTerm)}</Box>
          <Box sx={{ ...termRowSx, alignItems: "flex-start" }}>{labelerTerms.map(renderTerm)}{actions}</Box>
        </Box>
      ) : (
        <Box sx={termRowSx}>{terms.map(renderTerm)}{actions}</Box>
      )}
      {/* One row while it fits; a group that doesn't fit wraps under the others, so a phone stacks
          them. A rule divides the groups of a row: the first group's falls outside and is clipped.
          The clip is a little wider than the row, for a first checkbox's focus and hover circle. */}
      <Box sx={{ overflowX: "clip", px: 1.25, mx: -1.25 }}>
        {/* Pulled left by a group's padding and rule. */}
        <Box sx={{
          display: "flex", flexWrap: "wrap", columnGap: 2, rowGap: 1.5,
          ml: theme => `calc(-${theme.spacing(GROUP_PADDING)} - 1px)`,
        }}>
          {/* A narrow panel gives Dates the whole row, so its presets can be touch-sized. */}
          <Box sx={{ ...groupSx, flexBasis: stacked ? "100%" : "auto" }}>
            <DatesField key={clearCount} value={dates} onChange={onDatesChange} fill={stacked} />
          </Box>
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
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
          <Button
            ref={moreFiltersRef}
            size="small"
            aria-expanded={moreOpen}
            aria-controls={moreId}
            onClick={() => setMoreOpen(open => !open)}
            endIcon={<ExpandMoreIcon sx={{ transform: moreOpen ? "rotate(180deg)" : "none", transition: "transform 150ms" }} />}
          >
            More filters{!moreOpen && moreFilterCount > 0 ? ` (${moreFilterCount})` : ""}
          </Button>
          <Button
            size="small"
            disabled={!canClear}
            onClick={event => {
              onClear();
              // The button disables itself: from the keyboard, focus goes to its neighbor.
              if (fromKeyboard(event)) moreFiltersRef.current?.focus();
            }}
          >
            Clear filters
          </Button>
          {standaloneAction && <Box sx={{ display: "flex", flex: stacked ? "1 0 100%" : "0 1 auto", ml: "auto", minWidth: 0 }}>
            {standaloneAction}
          </Box>}
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
