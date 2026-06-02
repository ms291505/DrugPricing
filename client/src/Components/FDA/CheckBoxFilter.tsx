import { FormControlLabel, Checkbox } from "@mui/material";

type Props = {
  filter: boolean,
  onChange: () => void,
  disabled: boolean,
  label: string,
}
export default function CheckboxFilter({
  filter,
  onChange,
  disabled,
  label,
}: Props) {

  return (
    <FormControlLabel
      control={
        <Checkbox
          checked={filter}
          disabled={disabled}
          onChange={onChange}
        />
      }
      label={label}
    />
  )
}
