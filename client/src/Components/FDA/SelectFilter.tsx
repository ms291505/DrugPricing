import { Select, MenuItem, FormControl, InputLabel, } from "@mui/material";
import { CONSTANT, FILTER_SELECT_DELIMITER } from "../../library/constants";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";

type Props = {
  filterKey: "routes" | "labelers" | "dosageForms" | "productNdcs",
  possibleValues: string[],
  label: string,
}

export default function SelectFilter({ filterKey, possibleValues, label }: Props) {
  const { setFdaResultFilter, fdaResultFilter } = useFdaSearchContext();
  const normalizedLabel = label.toLowerCase().replace(" ", "-");
  const ariaLabel = `drug-filter-${normalizedLabel}-select-label`;

  return (
    <FormControl fullWidth>
      <InputLabel id={ariaLabel}>{label}</InputLabel>
      <Select
        label={label}
        id={`drug-filter-${normalizedLabel}`}
        name={`drug-filter-${normalizedLabel}`}
        multiple
        renderValue={(selected) => (selected).join(FILTER_SELECT_DELIMITER)}
        disabled={possibleValues.length === 0}
        value={fdaResultFilter[filterKey]}
        onChange={(e) => {
          let newValue = typeof e.target.value === "string"
            ? e.target.value.split(FILTER_SELECT_DELIMITER)
            : e.target.value;

          if (newValue.includes(CONSTANT.selectAllUuid)) {
            newValue = possibleValues;
          }
          if (newValue.includes(CONSTANT.selectNoneUuid)) {
            newValue = [];
          }

          setFdaResultFilter(prev => ({ ...prev, [filterKey]: newValue }))
        }}
      >
        <MenuItem value={CONSTANT.selectAllUuid}>Select all</MenuItem>
        <MenuItem value={CONSTANT.selectNoneUuid}>Select none</MenuItem>
        {
          possibleValues.map(value => {
            return (
              <MenuItem id={value} key={value} value={value}>{value}</MenuItem>
            )
          })
        }
      </Select>
    </FormControl>
  )
}
