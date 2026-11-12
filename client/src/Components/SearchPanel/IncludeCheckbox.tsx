import { Box, Checkbox, FormControlLabel } from "@mui/material";

type Props = {
  label: string,
  checked: boolean,
  onChange: (checked: boolean) => void,
  /** Rows of the table that ticking the box would add; shown when above 0. */
  hiddenCount: number,
};

/** An "Include ..." refine field, which says how many results it hides. */
export default function IncludeCheckbox({ label, checked, onChange, hiddenCount }: Props) {
  return (
    <FormControlLabel
      control={<Checkbox checked={checked} onChange={(e) => onChange(e.target.checked)} />}
      label={<>
        {label}
        {/* Feedback where the box is: on a phone the table is a long scroll below. */}
        {hiddenCount > 0
          ? <Box component="span" sx={{ color: "text.secondary", ml: 0.5 }}>({hiddenCount} hidden)</Box>
          : null}
      </>}
      sx={{ mr: 0 }}
    />
  );
}
