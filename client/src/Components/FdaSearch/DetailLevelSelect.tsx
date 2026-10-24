import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import useFdaSearch from "../../hooks/useFdaSearch";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";

export default function SelectDetailLevel() {
  const { isLoading, data } = useFdaSearch();
  const { fdaResultDetailLevel, setFdaResultDetailLevel } = useFdaSearchContext();
  const detailLevels = ["Product", "Package"];
  const noData =
    data
      ? data.products.length === 0
        ? true
        : false
      : true

  return (
    <FormControl fullWidth>
      <InputLabel id={"detail-level-select-label"}>Detail Level</InputLabel>
      <Select
        disabled={noData || isLoading}
        label={"Detail Level"}
        value={fdaResultDetailLevel}
        onChange={(e) => {
          const newValue = e.target.value;
          setFdaResultDetailLevel(newValue);
        }}>
        {
          detailLevels.map(value => {
            return (
              <MenuItem id={value} key={value} value={value.toLowerCase()}>{value}</MenuItem>
            )
          })
        }
      </Select>
    </FormControl>
  )
}
