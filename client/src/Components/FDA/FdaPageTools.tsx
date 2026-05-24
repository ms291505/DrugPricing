import Paper from "@mui/material/Paper"
import { Typography, Box, Select, MenuItem, FormControl, InputLabel } from "@mui/material";
import { useEffect, useMemo } from "react";
import useFdaSearch from "../../hooks/useFdaSearch";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";

export default function FdaPageTools() {

  // const { setSelect } = useFdaSearchContext();

  const { data } = useFdaSearch();

  const { fdaResultFilter, setFdaResultFilter } = useFdaSearchContext();

  const dosageForms = useMemo(
    () => [...new Set(data?.products.map(p => p.dosageFormName) ?? [])],
    [data]);
  useEffect(() => {
    if (dosageForms.length > 0) {
      setFdaResultFilter({ dosageForms });
    }
  }, [dosageForms, setFdaResultFilter])

  return (
    <Paper
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1,
        p: 1
      }}
      component="section"
      id="page-tools"
    >
      <Paper sx={{ p: 1, display: "flex", flexDirection: "column", alignItems: "center" }} elevation={3} component="div">
        <Typography variant="h6">Page Tools</Typography>
      </Paper>
      <Box component="section" id="page-filters" sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Typography variant="subtitle2">Page Filters</Typography>
        <FormControl fullWidth>
          <InputLabel id="drug-filter-select-label">Dosage Forms</InputLabel>
          <Select
            label={"Dosage Forms"}
            id="drug-filter"
            name="drug-filter"
            multiple
            disabled={dosageForms.length === 0}
            value={fdaResultFilter.dosageForms}
            onChange={(e) => {
              const newDosageForms = typeof e.target.value === "string"
                ? e.target.value.split(",")
                : e.target.value;

              setFdaResultFilter({ dosageForms: newDosageForms })
            }}
          >
            {
              dosageForms.map(dosageForm => {
                return (
                  <MenuItem id={dosageForm} key={dosageForm} value={dosageForm}>{dosageForm.replace(",", ":")}</MenuItem>
                )
              })
            }
          </Select>
        </FormControl>
      </Box>
    </Paper>
  )
}
