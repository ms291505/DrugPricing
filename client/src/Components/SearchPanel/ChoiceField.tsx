import { useId } from "react";
import { Box, ToggleButton, ToggleButtonGroup, Typography, type ToggleButtonGroupProps } from "@mui/material";

type Props<V extends string> = {
  label: string,
  value: V,
  options: { value: V, label: string }[],
  onChange: (value: V) => void,
  disabled?: boolean,
  color?: ToggleButtonGroupProps["color"],
  /** The label above the choices, as the search panel's groups have it (default: beside them). */
  stacked?: boolean,
};

/** A few exclusive choices with a label, e.g. Brand / generic. */
export default function ChoiceField<V extends string>({ label, value, options, onChange, disabled = false, stacked = false, color = "standard" }: Props<V>) {
  const labelId = useId();
  return (
    <Box sx={stacked
      ? { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1.5 }
      : { display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
      <Typography variant={stacked ? "subtitle2" : "body2"} id={labelId}>{label}</Typography>
      <ToggleButtonGroup
        size="small"
        color={color}
        exclusive
        disabled={disabled}
        aria-labelledby={labelId}
        value={value}
        // A click on the chosen one gives null: the choice stays.
        onChange={(_, next: V | null) => { if (next !== null) onChange(next); }}
      >
        {options.map(option => (
          <ToggleButton key={option.value} value={option.value} sx={{ px: 1.5, py: 0.25 }}>{option.label}</ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
}
