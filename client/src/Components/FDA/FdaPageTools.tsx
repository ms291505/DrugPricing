import Paper from "@mui/material/Paper"
import { Typography, Box, Checkbox, FormGroup, FormControlLabel, type SxProps, type Theme, Divider, Tooltip } from "@mui/material";
import { useEffect, useMemo, } from "react";
import useFdaSearch from "../../hooks/useFdaSearch";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import { isFdaProductOtc } from "../../types";
import SelectFilter from "./SelectFilter";
import SelectDetailLevel from "./DetailLevelSelect";
import { CONSTANT, } from "../../library/constants";

export default function FdaPageTools() {

  const { fdaResultFilter, setFdaResultFilter, } = useFdaSearchContext();

  const { data } = useFdaSearch();

  const resultsHaveOtcProducts = useMemo(() =>
    (data?.products.some(p => isFdaProductOtc(p.productTypeName)) ?? false),
    [data]
  )

  const disabledOrEmptyOtc = !resultsHaveOtcProducts;

  const resultsHaveSamplePackages = useMemo(() =>
    (data?.products.some(p => p.fdaPackageDetails.some(pack => pack.samplePackage === true)) ?? false),
    [data]
  )

  const disabledOrEmptySample = !resultsHaveSamplePackages;

  const productNdcs = useMemo(
    () => [...new Set(data?.products.map(p => p.productNdc).sort() ?? [])],
    [data]
  )

  const dosageForms = useMemo(
    () => [...new Set(data?.products.map(p => p.dosageFormName).sort() ?? [])],
    [data]
  );

  const routes = useMemo(
    () => [...new Set(data?.products.flatMap(p => p.routeName).sort() ?? [])],
    [data]
  );

  const lablers = useMemo(
    () => [...new Set(data?.products.map(p => p.labelerName).sort() ?? [])],
    [data]
  )

  useEffect(() => {
    if (dosageForms.length + routes.length > 0) {
      setFdaResultFilter(prev => ({
        ...prev,
        productNdcs: productNdcs,
        dosageForms: dosageForms,
        routes: routes,
        includeOtc: resultsHaveOtcProducts,
        labelers: lablers,
        includeSamplePackages: resultsHaveSamplePackages,
      }));
    }

  }, [productNdcs, dosageForms, routes, resultsHaveOtcProducts, lablers, resultsHaveSamplePackages, setFdaResultFilter])

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
      <Box
        component="section"
        id="page-options"
        sx={pageToolsSectionSxProps}
      >
        <Typography variant="subtitle2">Options</Typography>
        <SelectDetailLevel />
      </Box>
      <Divider />
      <Box component="section" id="page-filters" sx={pageToolsSectionSxProps}>
        <Typography variant="subtitle2">Filters</Typography>
        <SelectFilter
          filterKey="productNdcs"
          possibleValues={productNdcs}
          label="Product NDCs"
        />
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
        <FormGroup
          sx={{
            px: 1
          }}
        >
          <Tooltip describeChild title={disabledOrEmptyOtc ? "No OTC products in results." : null} placement="right" arrow
            slotProps={{
              popper: {
                modifiers: [
                  {
                    name: 'offset',
                    options: {
                      offset: [0, -50],
                    },
                  },
                ],
              },
            }}
          >
            <FormControlLabel
              control={
                <Checkbox checked={fdaResultFilter.includeOtc === true && !disabledOrEmptyOtc} disabled={disabledOrEmptyOtc}
                  onChange={() => {
                    setFdaResultFilter(prev => ({ ...prev, includeOtc: !prev.includeOtc }))
                  }}
                />
              }
              label={CONSTANT.label.includeOtcFilter}
            />
          </Tooltip>
          <Tooltip describeChild title={disabledOrEmptySample ? "No sample packages in results." : null} placement="right" arrow
            slotProps={{
              popper: {
                modifiers: [
                  {
                    name: 'offset',
                    options: {
                      offset: [0, -50],
                    },
                  },
                ],
              },
            }}
          >
            <FormControlLabel
              control={
                <Checkbox checked={fdaResultFilter.includeSamplePackages === true && !disabledOrEmptySample} disabled={disabledOrEmptySample}
                  onChange={() => {
                    setFdaResultFilter(prev => ({ ...prev, includeSamplePackages: !prev.includeSamplePackages }))
                  }}
                />
              }
              label="Include Sample Packages"
            />
          </Tooltip>
        </FormGroup>
      </Box>
    </Paper>
  )
}
