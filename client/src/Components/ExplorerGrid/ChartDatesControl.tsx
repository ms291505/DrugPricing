import { useEffect, useId, useRef, useState } from "react";
import { Box, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import {
  ALL_DATES, formatWindow, fromDateInput, isFullWindow, isValidWindow, resolveChartDates, toDateInput,
  type ChartDates, type DateBounds, type DateWindow,
} from "../../library/dates";

type Preset = {
  key: string,
  label: string,
  /** Shown instead of `label` on phones, so the presets fit on one row. */
  shortLabel?: string,
  chartDates: ChartDates,
};

type Props = {
  value: ChartDates,
  onChange: (value: ChartDates) => void,
  /** The dates there is data for: the inputs' limits, and where "recent" presets count back from. */
  bounds: DateBounds | null,
  /** The date inputs' limits, when they aren't `bounds` (null: none). */
  inputBounds?: DateBounds | null,
  /** An extra preset, e.g. the dates around a price change. */
  focusPreset?: { label: string, dateWindow: DateWindow },
  /**
   * Adds a Custom preset, the only one that shows the date inputs: the others say their dates in
   * a line of text. Custom keeps the typed dates while another preset is picked, so they can be
   * switched back on.
   */
  customPreset?: boolean,
  /**
   * Typed dates apply once typing has paused this long, for when applying them is costly (a
   * search): a date input reports a date at every keystroke ("0002", "0020", ... for a year).
   */
  typedDelayMs?: number,
  label?: string,
}

const RECENT_PRESETS = [
  { months: 12, label: "Last year", shortLabel: "1 yr" },
  { months: 6, label: "6 months", shortLabel: "6 mo" },
  { months: 3, label: "3 months", shortLabel: "3 mo" },
];

const sameWindow = (a: DateWindow, b: DateWindow) => a.start === b.start && a.end === b.end;

/** Which preset the value is, if any. A fixed window that matches a preset's dates counts too. */
function activePresetKey(value: ChartDates, presets: Preset[], bounds: DateBounds | null): string | null {
  if (value.kind === "recent") return `recent-${value.months}`;
  return presets.find(preset => preset.chartDates.kind === "window"
    ? sameWindow(preset.chartDates.dateWindow, value.dateWindow)
    : !isFullWindow(value.dateWindow) && sameWindow(resolveChartDates(preset.chartDates, bounds), value.dateWindow)
  )?.key ?? null;
}

const toDraft = (dateWindow: DateWindow) => ({ start: toDateInput(dateWindow.start), end: toDateInput(dateWindow.end) });

const isCustom = (value: ChartDates) => value.kind === "window" && !isFullWindow(value.dateWindow);

/**
 * Picks dates: presets for the common cases, or a start and end date. A blank date is open, so it
 * runs to the first or last price. "Recent" presets stay presets (they follow the data); typed
 * dates are fixed. Used by each pinned chart, and by the search panels' Dates (`DatesField`).
 */
export default function ChartDatesControl({
  value, onChange, bounds, inputBounds = bounds, focusPreset, customPreset = false, typedDelayMs = 0, label = "Chart dates",
}: Props) {
  const labelId = useId();

  const presets: Preset[] = [
    ...(focusPreset ? [{ key: "focus", label: focusPreset.label, chartDates: { kind: "window", dateWindow: focusPreset.dateWindow } as const }] : []),
    { key: "all", label: "All", chartDates: ALL_DATES },
    // "Recent" needs data to count back from.
    ...(bounds
      ? RECENT_PRESETS.map(({ months, label, shortLabel }) => ({ key: `recent-${months}`, label, shortLabel, chartDates: { kind: "recent", months } as const }))
      : []),
  ];
  // The inputs show the dates the value means for this data, and hold what was typed until it
  // is a valid range. They reset when those dates change from outside (a preset, new data).
  const shown = resolveChartDates(value, bounds);

  // The dates Custom stands for: the last ones typed, or else the ones shown when it's picked.
  const [customWindow, setCustomWindow] = useState(() => isCustom(value) && value.kind === "window" ? value.dateWindow : null);
  if (customPreset) {
    presets.push({ key: "custom", label: "Custom", chartDates: { kind: "window", dateWindow: customWindow ?? shown } });
  }
  // Custom was picked, which the value can't always say: picked from All, or with both dates
  // cleared, its window is All's. Not saved, so such a tab comes back as All.
  const [customPicked, setCustomPicked] = useState(false);
  // With Custom, any typed dates are Custom, even ones that match a preset's.
  const activePreset = customPreset && (customPicked || isCustom(value)) ? "custom" : activePresetKey(value, presets, bounds);

  const shownKey = `${shown.start}|${shown.end}`;
  const [draft, setDraft] = useState(() => toDraft(shown));
  const [draftFor, setDraftFor] = useState(shownKey);
  if (draftFor !== shownKey) {
    setDraftFor(shownKey);
    setDraft(toDraft(shown));
  }

  const draftValid = isValidWindow({ start: fromDateInput(draft.start), end: fromDateInput(draft.end) });

  // Typed dates waiting for a pause (`typedDelayMs`). A later keystroke or a preset replaces them.
  const pending = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(pending.current), []);

  const handleDraftChange = (field: "start" | "end", text: string) => {
    const next = { ...draft, [field]: text };
    setDraft(next);
    clearTimeout(pending.current);
    const nextWindow = { start: fromDateInput(next.start), end: fromDateInput(next.end) };
    if (!isValidWindow(nextWindow) || sameWindow(nextWindow, shown)) return;
    const apply = () => {
      setCustomWindow(nextWindow);
      onChange({ kind: "window", dateWindow: nextWindow });
    };
    if (typedDelayMs > 0) pending.current = setTimeout(apply, typedDelayMs);
    else apply();
  };

  const showInputs = !customPreset || activePreset === "custom";
  const shownText = showInputs ? null : formatWindow(shown, inputBounds ?? bounds);

  const inputLimits = inputBounds ? { min: toDateInput(inputBounds.first), max: toDateInput(inputBounds.last) } : {};

  return (
    <Box role="group" aria-labelledby={labelId} sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      {/* The dates a preset means sit with the label, so they read as what the group is set to. */}
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 1 }}>
        <Typography variant="subtitle2" id={labelId}>{label}</Typography>
        {shownText ? <Typography variant="body2" color="text.secondary">{shownText}</Typography> : null}
      </Box>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={activePreset}
        onChange={(_, key: string | null) => {
          const preset = presets.find(p => p.key === key);
          if (!preset) return;
          clearTimeout(pending.current);
          setCustomPicked(preset.key === "custom");
          onChange(preset.chartDates);
        }}
        sx={{ flexWrap: "wrap" }}
      >
        {presets.map(preset => (
          <ToggleButton key={preset.key} value={preset.key} aria-label={preset.label} sx={{ px: 1, py: 0.25 }}>
            {preset.shortLabel
              ? <>
                <Box component="span" aria-hidden sx={{ display: { xs: "inline", sm: "none" } }}>{preset.shortLabel}</Box>
                <Box component="span" aria-hidden sx={{ display: { xs: "none", sm: "inline" } }}>{preset.label}</Box>
              </>
              : preset.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      {showInputs ? <Box sx={{ display: "flex", gap: 1 }}>
        <TextField
          size="small"
          type="date"
          label="From"
          value={draft.start}
          onChange={(e) => handleDraftChange("start", e.target.value)}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: inputLimits }}
          sx={{ flex: 1, minWidth: 0 }}
        />
        <TextField
          size="small"
          type="date"
          label="To"
          value={draft.end}
          onChange={(e) => handleDraftChange("end", e.target.value)}
          error={!draftValid}
          helperText={draftValid ? undefined : "Before the start date"}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: inputLimits }}
          sx={{ flex: 1, minWidth: 0 }}
        />
      </Box> : null}
    </Box>
  );
}
