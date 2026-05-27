import Paper from "@mui/material/Paper"
import { Typography, Box, Checkbox, FormGroup, FormControlLabel, type SxProps, type Theme, Divider } from "@mui/material";
import { useEffect, useMemo, } from "react";
import useFdaSearch from "../../hooks/useFdaSearch";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import { isFdaProductOtc } from "../../types";
import SelectFilter from "./SelectFilter";
import SelectDetailLevel from "./DetailLevelSelect";

export default function FdaPageTools() {

  const { fdaResultFilter, setFdaResultFilter, } = useFdaSearchContext();

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

  const lablers = useMemo(
    () => [...new Set(data?.products.map(p => p.labelerName) ?? [])],
    [data]
  )

  useEffect(() => {
    if (dosageForms.length + routes.length > 0) {
      setFdaResultFilter(prev => ({
        ...prev,
        dosageForms: dosageForms,
        routes: routes,
        includeOtc: resultsHaveOtcProducts,
        labelers: lablers,
      }));
    }

  }, [dosageForms, routes, resultsHaveOtcProducts, lablers, setFdaResultFilter])

  const pageToolsSectionSxProps: SxProps<Theme> = {
    display: "flex",
    flexDirection: "column",
    gap: 2
  }

  return (
    <Paper
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        p: 2
      }}
      component="section"
      id="page-tools"
    >
      <Paper sx={{ p: 1, display: "flex", flexDirection: "column", alignItems: "center" }} elevation={3} component="div">
        <Typography variant="h6">Page Tools</Typography>
      </Paper>
      <Box component="section" id="page-filters" sx={pageToolsSectionSxProps}>
        <Typography variant="subtitle2">Filters</Typography>
        <SelectFilter
          filterKey="dosageForms"
          possibleValues={dosageForms}
          label="Dosage Forms"
        />
        <SelectFilter
          filterKey="routes"
          possibleValues={routes}
          label="Routes"
        />
        <SelectFilter
          filterKey="labelers"
          possibleValues={lablers}
          label="Lablers"
        />
        <Box
          sx={{
            px: 1
          }}
        >
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
        <Divider />
        <Box
          component="section"
          id="page-options"
          sx={pageToolsSectionSxProps}
        >
          <Typography variant="subtitle2">Options</Typography>
          <SelectDetailLevel />
        </Box>
      </Box>
    </Paper>
  )
}
