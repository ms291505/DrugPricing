import { useId, useState } from "react";
import { Box, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import {
  ALL_DATES, fromDateInput, isFullWindow, isValidWindow, resolveChartDates, toDateInput,
  type ChartDates, type DateBounds, type DateWindow,
} from "../../library/dates";

type Preset = {
  key: string,
  label: string,
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
   * Adds a Custom preset: typed dates select it, and it keeps them while another preset is
   * picked, so they can be switched back on.
   */
  customPreset?: boolean,
  label?: string,
  /** Shown under the label, e.g. when the dates apply. */
  caption?: string,
}

const RECENT_PRESETS = [
  { months: 12, label: "Last year" },
  { months: 6, label: "6 months" },
  { months: 3, label: "3 months" },
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
  value, onChange, bounds, inputBounds = bounds, focusPreset, customPreset = false, label = "Chart dates", caption,
}: Props) {
  const labelId = useId();

  const presets: Preset[] = [
    ...(focusPreset ? [{ key: "focus", label: focusPreset.label, chartDates: { kind: "window", dateWindow: focusPreset.dateWindow } as const }] : []),
    { key: "all", label: "All", chartDates: ALL_DATES },
    // "Recent" needs data to count back from.
    ...(bounds
      ? RECENT_PRESETS.map(({ months, label }) => ({ key: `recent-${months}`, label, chartDates: { kind: "recent", months } as const }))
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
  // With Custom, any typed dates are Custom, even ones that match a preset's.
  const activePreset = customPreset && isCustom(value) ? "custom" : activePresetKey(value, presets, bounds);

  const shownKey = `${shown.start}|${shown.end}`;
  const [draft, setDraft] = useState(() => toDraft(shown));
  const [draftFor, setDraftFor] = useState(shownKey);
  if (draftFor !== shownKey) {
    setDraftFor(shownKey);
    setDraft(toDraft(shown));
  }

  const draftValid = isValidWindow({ start: fromDateInput(draft.start), end: fromDateInput(draft.end) });

  const handleDraftChange = (field: "start" | "end", text: string) => {
    const next = { ...draft, [field]: text };
    setDraft(next);
    const nextWindow = { start: fromDateInput(next.start), end: fromDateInput(next.end) };
    if (isValidWindow(nextWindow) && !sameWindow(nextWindow, shown)) {
      setCustomWindow(nextWindow);
      onChange({ kind: "window", dateWindow: nextWindow });
    }
  };

  const inputLimits = inputBounds ? { min: toDateInput(inputBounds.first), max: toDateInput(inputBounds.last) } : {};

  return (
    <Box role="group" aria-labelledby={labelId} sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Box>
        <Typography variant="subtitle2" id={labelId}>{label}</Typography>
        {caption ? <Typography variant="caption" color="text.secondary">{caption}</Typography> : null}
      </Box>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={activePreset}
        onChange={(_, key: string | null) => {
          const preset = presets.find(p => p.key === key);
          if (preset) onChange(preset.chartDates);
        }}
        sx={{ flexWrap: "wrap" }}
      >
        {presets.map(preset => (
          <ToggleButton key={preset.key} value={preset.key} sx={{ px: 1, py: 0.25 }}>
            {preset.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <Box sx={{ display: "flex", gap: 1 }}>
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
      </Box>
    </Box>
  );
}
