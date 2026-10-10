import { useId, useState } from "react";
import { Box, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import {
  FULL_WINDOW, fromDateInput, toDateInput, windowEndingAt, type DateWindow,
} from "../../library/dates";

type Preset = {
  key: string,
  label: string,
  dateWindow: DateWindow,
};

type Props = {
  value: DateWindow,
  onChange: (value: DateWindow) => void,
  /** The dates there is data for: the inputs' limits, and where presets count back from. */
  bounds: { first: number, last: number } | null,
  /** An extra preset, e.g. the dates around a price change. */
  focusPreset?: { label: string, dateWindow: DateWindow },
  label?: string,
}

const RECENT_PRESETS = [
  { key: "12", label: "Last year", months: 12 },
  { key: "6", label: "6 months", months: 6 },
  { key: "3", label: "3 months", months: 3 },
];

const sameWindow = (a: DateWindow, b: DateWindow) => a.start === b.start && a.end === b.end;

/**
 * Picks the dates a chart shows: presets for the common cases, or a start and end date. A blank
 * date is open, so the chart runs to its first or last price. Used by Page Tools on both search
 * pages (the dates new charts start with) and by each pinned chart.
 */
export default function ChartDatesControl({ value, onChange, bounds, focusPreset, label = "Chart dates" }: Props) {
  const labelId = useId();

  const presets: Preset[] = [
    ...(focusPreset ? [{ key: "focus", ...focusPreset }] : []),
    { key: "all", label: "All", dateWindow: FULL_WINDOW },
    ...(bounds
      ? RECENT_PRESETS.map(({ months, ...preset }) => ({ ...preset, dateWindow: windowEndingAt(bounds.last, months) }))
      : []),
  ];
  const activePreset = presets.find(preset => sameWindow(preset.dateWindow, value))?.key ?? null;

  // The inputs hold what was typed; only a valid range is passed on. Picking a preset (or any
  // other change from outside) resets them.
  const [draft, setDraft] = useState({ start: toDateInput(value.start), end: toDateInput(value.end) });
  const [draftFor, setDraftFor] = useState(value);
  if (draftFor !== value) {
    setDraftFor(value);
    setDraft({ start: toDateInput(value.start), end: toDateInput(value.end) });
  }

  const start = fromDateInput(draft.start);
  const end = fromDateInput(draft.end);
  const endBeforeStart = start !== null && end !== null && end < start;

  const handleDraftChange = (field: "start" | "end", text: string) => {
    const next = { ...draft, [field]: text };
    setDraft(next);
    const nextWindow = { start: fromDateInput(next.start), end: fromDateInput(next.end) };
    const valid = nextWindow.start === null || nextWindow.end === null || nextWindow.start <= nextWindow.end;
    if (valid && !sameWindow(nextWindow, value)) onChange(nextWindow);
  };

  const inputBounds = bounds ? { min: toDateInput(bounds.first), max: toDateInput(bounds.last) } : {};

  return (
    <Box role="group" aria-labelledby={labelId} sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Typography variant="subtitle2" id={labelId}>{label}</Typography>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={activePreset}
        onChange={(_, key: string | null) => {
          const preset = presets.find(p => p.key === key);
          if (preset) onChange(preset.dateWindow);
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
          slotProps={{ inputLabel: { shrink: true }, htmlInput: inputBounds }}
          sx={{ flex: 1, minWidth: 0 }}
        />
        <TextField
          size="small"
          type="date"
          label="To"
          value={draft.end}
          onChange={(e) => handleDraftChange("end", e.target.value)}
          error={endBeforeStart}
          helperText={endBeforeStart ? "Before the start date" : undefined}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: inputBounds }}
          sx={{ flex: 1, minWidth: 0 }}
        />
      </Box>
    </Box>
  );
}
