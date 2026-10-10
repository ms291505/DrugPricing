import Paper from "@mui/material/Paper"
import { Typography, Box, Checkbox, FormGroup, FormControlLabel, type SxProps, type Theme, Divider, Tooltip, } from "@mui/material";
import { useMemo, } from "react";
import useFdaSearch from "../../hooks/useFdaSearch";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import { isFdaProductOtc, } from "../../library/types";
import SelectFilter from "./SelectFilter";
import SelectDetailLevel from "./DetailLevelSelect";
import { CONSTANT, } from "../../library/constants";
import fdaSearchResultToNadacPrices from "../../library/fdaDataToNadacPrices";
import { useExplorerItems } from "../../Context/ExplorerItemsContext";
import { addedChartTitle, createChartItem, type ChartType } from "../../library/explorerItems";
import { countSeries } from "../../library/chartSeries";
import AddChartControl from "../ExplorerGrid/AddChartControl";
import useFdaChartOrigin from "../../hooks/useFdaChartOrigin";

export default function FdaPageTools() {

  const { fdaResultFilter, setFdaResultFilter, selectedRows, fdaResultDetailLevel } = useFdaSearchContext();

  const { addItem } = useExplorerItems();

  const origin = useFdaChartOrigin();

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

  const handleAddChart = (chartType: ChartType) => {
    const ndcs = new Set([...selectedRows.ids].map(String));

    // At product level `ndc` is the product NDC, at package level the package NDC,
    // matching the row ids of the table for that level.
    const chartData = fdaSearchResultToNadacPrices(data, fdaResultFilter, fdaResultDetailLevel)
      .filter(price => ndcs.has(price.ndc));

    if (chartData.length === 0) return;

    addItem(createChartItem({
      chartType,
      prices: chartData,
      defaultTitle: addedChartTitle(chartType, countSeries(chartData), origin.seriesKind),
      origin,
    }), { focus: true });
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
          filterKey="excludedProductNdcs"
          possibleValues={productNdcs}
          label="Product NDCs"
        />
        <SelectFilter
          filterKey="excludedDosageForms"
          possibleValues={dosageForms}
          label="Dosage Forms"
        />
        <SelectFilter
          filterKey="excludedRoutes"
          possibleValues={routes}
          label="Routes"
        />
        <SelectFilter
          filterKey="excludedLabelers"
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
                <Checkbox checked={!fdaResultFilter.excludeOtc && !disabledOrEmptyOtc} disabled={disabledOrEmptyOtc}
                  onChange={() => {
                    setFdaResultFilter(prev => ({ ...prev, excludeOtc: !prev.excludeOtc }))
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
                <Checkbox checked={!fdaResultFilter.excludeSamplePackages && !disabledOrEmptySample} disabled={disabledOrEmptySample}
                  onChange={() => {
                    setFdaResultFilter(prev => ({ ...prev, excludeSamplePackages: !prev.excludeSamplePackages }))
                  }}
                />
              }
              label="Include Sample Packages"
            />
          </Tooltip>
        </FormGroup>
        <AddChartControl selectedCount={selectedRows.ids.size} onAdd={handleAddChart} />
      </Box>
    </Paper>
  )
}

