import { Select, MenuItem, FormControl, InputLabel, } from "@mui/material";
import { CONSTANT, FILTER_SELECT_DELIMITER } from "../../library/constants";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import type { FdaResultFilterListKey } from "../../library/types";

type Props = {
  filterKey: FdaResultFilterListKey,
  possibleValues: string[],
  label: string,
}

/** Multi-select over one filter list. Shows what's included; stores what's excluded. */
export default function SelectFilter({ filterKey, possibleValues, label }: Props) {
  const { setFdaResultFilter, fdaResultFilter } = useFdaSearchContext();
  const normalizedLabel = label.toLowerCase().replace(" ", "-");
  const ariaLabel = `drug-filter-${normalizedLabel}-select-label`;

  const excluded = fdaResultFilter[filterKey];
  const selected = possibleValues.filter(value => !excluded.includes(value));

  return (
    <FormControl fullWidth>
      <InputLabel id={ariaLabel}>{label}</InputLabel>
      <Select
        label={label}
        id={`drug-filter-${normalizedLabel}`}
        name={`drug-filter-${normalizedLabel}`}
        multiple
        renderValue={(values) => (values).join(FILTER_SELECT_DELIMITER)}
        disabled={possibleValues.length === 0}
        value={selected}
        onChange={(e) => {
          let newSelected = typeof e.target.value === "string"
            ? e.target.value.split(FILTER_SELECT_DELIMITER)
            : e.target.value;

          if (newSelected.includes(CONSTANT.selectAllUuid)) {
            newSelected = possibleValues;
          }
          if (newSelected.includes(CONSTANT.selectNoneUuid)) {
            newSelected = [];
          }

          const newExcluded = possibleValues.filter(value => !newSelected.includes(value));
          setFdaResultFilter(prev => ({ ...prev, [filterKey]: newExcluded }))
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
