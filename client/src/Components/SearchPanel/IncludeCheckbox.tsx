import { Box, Checkbox, FormControlLabel } from "@mui/material";

type Props = {
  label: string,
  checked: boolean,
  onChange: (checked: boolean) => void,
  /** Rows of the table that ticking the box would add; shown when above 0. */
  hiddenCount: number,
  /** A smaller box with less space around it, for the compact layout. */
  dense?: boolean,
};

/** A box of the panel's Include group, which says how many results it hides. */
export default function IncludeCheckbox({ label, checked, onChange, hiddenCount, dense = false }: Props) {
  return (
    <FormControlLabel
      control={<Checkbox size={dense ? "small" : "medium"} checked={checked} onChange={(e) => onChange(e.target.checked)} sx={dense ? { p: 0.75 } : undefined} />}
      label={<>
        {label}
        {/* Feedback where the box is: on a phone the table is a long scroll below. */}
        {hiddenCount > 0
          ? <Box component="span" sx={{ color: "text.secondary", ml: 0.5 }}>({hiddenCount} hidden)</Box>
          : null}
      </>}
      // The left margin undoes the box's padding (MUI's default overshoots it), so the box lines
      // up with the group's label and stays inside the panel's clipped filter row.
      sx={{ mr: 0, ml: dense ? -0.75 : -1.125 }}
    />
  );
}
