import Paper from "@mui/material/Paper"
import { Typography, Box, Select, MenuItem, FormControl, InputLabel, Checkbox, FormGroup, FormControlLabel } from "@mui/material";
import { useEffect, useMemo, } from "react";
import useFdaSearch from "../../hooks/useFdaSearch";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import { isFdaProductOtc } from "../../types";

export default function FdaPageTools() {

  const { fdaResultFilter, setFdaResultFilter } = useFdaSearchContext();

  const { data } = useFdaSearch();

  const resultsHaveOtcProducts = useMemo(() =>
    (data?.products.some(p => isFdaProductOtc(p.productTypeName)) ?? false),
    [data]
  )

  const disabledOrEmpty = !resultsHaveOtcProducts;

  const dosageForms = useMemo(
    () => [...new Set(data?.products.map(p => p.dosageFormName) ?? [])],
    [data]
  );

  const routes = useMemo(
    () => [...new Set(data?.products.flatMap(p => p.routeName) ?? [])],
    [data]
  );

  useEffect(() => {
    if (dosageForms.length + routes.length > 0) {
      setFdaResultFilter(prev => ({ ...prev, dosageForms: dosageForms, routes: routes, includeOtc: resultsHaveOtcProducts }));
    }

  }, [dosageForms, routes, resultsHaveOtcProducts, setFdaResultFilter])

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
          <InputLabel id="drug-filter-dosage-form-select-label">Dosage Forms</InputLabel>
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

              setFdaResultFilter(prev => ({ ...prev, dosageForms: newDosageForms }))
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
        <FormControl fullWidth>
          <InputLabel id="drug-filter-routes-select-label">Routes</InputLabel>
          <Select
            label={"Routes"}
            id="drug-filter-routes"
            name="drug-filter-routes"
            multiple
            disabled={routes.length === 0}
            value={fdaResultFilter.routes}
            onChange={(e) => {
              const newRoutes = typeof e.target.value === "string"
                ? e.target.value.split(",")
                : e.target.value;

              setFdaResultFilter(prev => ({ ...prev, routes: newRoutes }))
            }}
          >
            {
              routes.map(route => {
                return (
                  <MenuItem id={route} key={route} value={route}>{route.replace(",", ":")}</MenuItem>
                )
              })
            }
          </Select>
        </FormControl>
        <Box>
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox aria-label="Include OTC Products" checked={fdaResultFilter.includeOtc === true && !disabledOrEmpty} disabled={disabledOrEmpty}
                  onClick={() => {
                    setFdaResultFilter(prev => ({ ...prev, includeOtc: !prev.includeOtc }))
                  }}
                />
              }
              label="Include OTC Products"
            />
          </FormGroup>
        </Box>
      </Box>
    </Paper>
  )
}
