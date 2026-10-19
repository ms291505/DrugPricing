import Paper from "@mui/material/Paper"
import { Typography, Box, type SxProps, type Theme, Divider, Grid } from "@mui/material";
import { useMemo, } from "react";
import useFdaSearch from "../../hooks/useFdaSearch";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import SelectFilter from "./SelectFilter";
import SelectDetailLevel from "./DetailLevelSelect";
import fdaSearchResultToNadacPrices from "../../library/fdaDataToNadacPrices";
import { useExplorerItems } from "../../Context/ExplorerItemsContext";
import { createChartItem, type ChartType } from "../../library/explorerItems";
import { chartTitle, seriesLabels } from "../../library/chartTitles";
import useSeriesColors from "../../hooks/useSeriesColors";
import AddChartControl from "../ExplorerGrid/AddChartControl";
import useFdaChartOrigin from "../../hooks/useFdaChartOrigin";
import useChartWindow from "../../hooks/useChartWindow";
import ChartDatesControl from "../ExplorerGrid/ChartDatesControl";

type Props = {
  displayHeader?: boolean
}

export default function FdaPageTools({ displayHeader }: Props) {

  const { fdaResultFilter, selectedRows, fdaResultDetailLevel } = useFdaSearchContext();

  const { addItem } = useExplorerItems();

  const origin = useFdaChartOrigin();
  const { chartDates, setChartDates, chartWindow, bounds } = useChartWindow(origin.resultPrices);

  const { data } = useFdaSearch();

  // What the page shows at this level after filters: Add Chart's source, and the colors' visible set.
  const visiblePrices = useMemo(
    () => fdaSearchResultToNadacPrices(data, fdaResultFilter, fdaResultDetailLevel),
    [data, fdaResultFilter, fdaResultDetailLevel]);
  const colors = useSeriesColors(origin.resultPrices, visiblePrices);

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
    const chartData = visiblePrices.filter(price => ndcs.has(price.ndc));

    if (chartData.length === 0) return;

    addItem(createChartItem({
      chartType,
      prices: chartData,
      defaultTitle: chartTitle(chartType, origin.searchLabel, origin.seriesKind, seriesLabels(chartData)),
      origin,
      dateWindow: chartWindow,
      colors,
    }), { focus: true });
  }

  const pageToolsSectionSxProps: SxProps<Theme> = {
    display: "flex",
    flexDirection: "column",
    gap: 2
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
      }}
      component="section"
      id="page-tools"
    >
      {displayHeader
        ? <Paper sx={{ p: 1, display: "flex", flexDirection: "column", alignItems: "center" }} elevation={3} component="div">
          <Typography variant="h6">Page Tools</Typography>
        </Paper>
        : null
      }
      <Grid
        container
        spacing={2}
      >
        <Grid size={{ xs: 12, md: 6 }}>
          <Box
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <Box
              component="section"
              id="page-options"
              sx={pageToolsSectionSxProps}
            >
              <Typography variant="subtitle2">Options</Typography>
              <SelectDetailLevel />
              <AddChartControl selectedCount={selectedRows.ids.size} onAdd={handleAddChart} />
            </Box>
            <Divider />
            <Box component="section" id="page-charts" sx={pageToolsSectionSxProps}>
              <ChartDatesControl value={chartDates} onChange={setChartDates} bounds={bounds} />
            </Box>
          </Box>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
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
          </Box>
        </Grid>
      </Grid>
    </Box>
  )
}
