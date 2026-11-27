import { useId } from "react";
import { Checkbox, FormControl, InputLabel, ListItemText, MenuItem, Select } from "@mui/material";

type Props = {
  label: string,
  /** What the options are, plural, for the closed state: "3 of 5 drugs". */
  noun: string,
  /** From the loaded result (`*FilterOptions`), in the order shown; empty disables it, as before a search. */
  options: string[],
  /** The text an option shows, when its value is a key rather than the text (default: the value). */
  optionLabel?: (value: string) => string,
  /**
   * The criteria's exclusion list. It may name values not in `options` (a spelling gone after a
   * new pick, an OTC drug while OTC is hidden); those are kept and listed after the options,
   * unchecked, so every exclusion the More filters count counts can be seen and undone.
   */
  excluded: string[],
  onChange: (excluded: string[]) => void,
};

// Menu values no option can have: options are names, codes and units from the result.
const SELECT_ALL = "__select_all__";
const SELECT_NONE = "__select_none__";

/**
 * A from-results list: a multi-select that shows what's included and stores what's excluded, so
 * values new since it was set show. Its closed state is a count, which says when it's on.
 */
export default function ExclusionSelect({ label, noun, options, optionLabel = value => value, excluded, onChange }: Props) {
  const labelId = useId();
  const listed = [...options, ...excluded.filter(value => !options.includes(value))];
  const selected = listed.filter(value => !excluded.includes(value));

  const handleChange = (values: string[]) => {
    const included = values.includes(SELECT_ALL) ? listed : values.includes(SELECT_NONE) ? [] : values;
    onChange(listed.filter(value => !included.includes(value)));
  };

  return (
    <FormControl fullWidth size="small">
      <InputLabel id={labelId} shrink>{label}</InputLabel>
      <Select
        labelId={labelId}
        label={label}
        multiple
        // Excluding every value still shows "0 of N", which needs the label kept up.
        displayEmpty
        notched
        value={selected}
        disabled={listed.length === 0}
        renderValue={values => listed.length === 0 ? ""
          : values.length === listed.length ? `All ${noun}`
          : `${values.length} of ${listed.length} ${noun}`}
        onChange={(e) => handleChange(typeof e.target.value === "string" ? e.target.value.split(",") : e.target.value)}
        MenuProps={{ slotProps: { paper: { sx: { maxHeight: 400 } } } }}
      >
        <MenuItem value={SELECT_ALL}>Select all</MenuItem>
        <MenuItem value={SELECT_NONE} divider>Select none</MenuItem>
        {listed.map(value => (
          <MenuItem key={value} value={value}>
            <Checkbox size="small" checked={selected.includes(value)} sx={{ py: 0 }} />
            <ListItemText primary={optionLabel(value)} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
