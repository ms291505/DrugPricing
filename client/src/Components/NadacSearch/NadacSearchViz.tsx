import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper"
import Grid from "@mui/material/Grid";
import TableViz from "./TableViz";
import BarViz from "./BarViz";
import LineViz from "./LineViz";
import { useNadacSearch } from "../../hooks/useNadacSearch";
import VizTools from "./VizTools";
import { shouldAutoChart } from "../../library/chartSeries";
import ExplorerGridItem from "../ExplorerGrid/ExplorerGridItem";
import PinButton from "../ExplorerGrid/PinButton";
import PinnedSection from "../ExplorerGrid/PinnedSection";
import useNadacItemSource from "../../hooks/useNadacItemSource";

const BAR_TITLE = "Average Price by NDC";
const LINE_TITLE = "NDC Price Over Time";

export default function NadacSearchViz() {

  const { data, isLoading } = useNadacSearch();
  const itemSource = useNadacItemSource();

  // System charts are derived from the current result on every render, like the FDA page's.
  // User charts live in the tab's pinned items and are not touched by a new search.
  const prices = data?.prices ?? [];
  const showAutoCharts = shouldAutoChart(prices);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        width: "100%"
      }}
    >
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 3 }}>
          <VizTools />
        </Grid>
        <Grid size={{ xs: 12, sm: 9 }}>
          <Paper sx={{ p: 1 }}>
            <TableViz nadacPrices={prices} loading={isLoading} />
          </Paper>
        </Grid>
      </Grid>
      {showAutoCharts
        ?
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <ExplorerGridItem
              title={BAR_TITLE}
              actions={<PinButton title={BAR_TITLE} chartType="bar" prices={prices} source={itemSource} />}
            >
              <BarViz nadacPrices={prices} />
            </ExplorerGridItem>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <ExplorerGridItem
              title={LINE_TITLE}
              actions={<PinButton title={LINE_TITLE} chartType="line" prices={prices} source={itemSource} />}
            >
              <LineViz nadacPrices={prices} />
            </ExplorerGridItem>
          </Grid>
        </Grid>
        : null
      }
      <PinnedSection />
    </Box>
  )
}
