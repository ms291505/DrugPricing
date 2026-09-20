import Paper from "@mui/material/Paper"
import { Typography, Box, Checkbox, FormGroup, FormControlLabel, type SxProps, type Theme, Divider, Tooltip, Button, } from "@mui/material";
import { useEffect, useMemo, useState, } from "react";
import useFdaSearch from "../../hooks/useFdaSearch";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import { createChart, isFdaProductOtc, } from "../../library/types";
import SelectFilter from "./SelectFilter";
import SelectDetailLevel from "./DetailLevelSelect";
import { CONSTANT, } from "../../library/constants";
import { fdaProductsToNadacPrices } from "../../library/fdaDataToNadacPrices";
import BarChartIcon from '@mui/icons-material/BarChart';
import SsidChartIcon from '@mui/icons-material/SsidChart';

export default function FdaPageTools() {

  const [addChartToggle, setAddChartToggle] = useState(false);

  const { fdaResultFilter, setFdaResultFilter, selectedRows, setCharts, fdaResultDetailLevel } = useFdaSearchContext();

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

  const addChartButtonText = [...selectedRows.ids].length > 0
    ? "Add Chart"
    : "Select Drugs to Add Chart"

  const handleAddChart = (chartType: "line" | "bar") => {
    const ndcs = [...selectedRows.ids]

    if (fdaResultDetailLevel === "product") {
      const products = data?.products.filter(product => ndcs.includes(product.productNdc)) ?? [];
      const chartData = fdaProductsToNadacPrices(products);
      const id = crypto.randomUUID();

      const newChart = createChart(chartType, chartData, id)

      setCharts((prev) => [...prev, newChart]);
    }

    setAddChartToggle(false);
  }

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
        {addChartToggle
          ?
          <Box sx={{
            display: "flex",
            gap: 1
          }}>
            <Button sx={{ width: "100%" }} variant="contained" onClick={() => handleAddChart("bar")}><BarChartIcon /></Button>
            <Button sx={{ width: "100%" }} variant="contained" onClick={() => handleAddChart("line")}><SsidChartIcon /></Button>
          </Box>
          :
          <Button disabled={[...selectedRows.ids].length === 0} variant="outlined" onClick={() => setAddChartToggle(true)}>{addChartButtonText}</Button>
        }
      </Box>
    </Paper>
  )
}

