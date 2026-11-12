import { useId } from "react";
import { Box, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";

type Props<V extends string> = {
  label: string,
  value: V,
  options: { value: V, label: string }[],
  onChange: (value: V) => void,
  disabled?: boolean,
};

/** A few exclusive choices with a label, e.g. Brand / generic. */
export default function ChoiceField<V extends string>({ label, value, options, onChange, disabled = false }: Props<V>) {
  const labelId = useId();
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
      <Typography variant="body2" id={labelId}>{label}</Typography>
      <ToggleButtonGroup
        size="small"
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
