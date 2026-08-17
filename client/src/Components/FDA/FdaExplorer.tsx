import { Box, Grid, Paper, } from "@mui/material";
import FdaSearchResults from "./FdaSearchResults";
import FdaPageTools from "./FdaPageTools";
import BarViz from "../NadacSearch/BarViz";
import useFdaSearch from "../../hooks/useFdaSearch";
import { resultDetailLevelToLabel, type FdaResultDetailLevel } from "../../library/types";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import fdaSearchResultToNadacPrices from "../../library/fdaDataToNadacPrices";
import ExplorerGridItem from "../ExplorerGrid/ExplorerGridItem";

type Props = {
  visible?: boolean
}

export default function FdaExplorer({ visible = true }: Props) {
  const { data } = useFdaSearch();
  const { fdaResultFilter, fdaResultDetailLevel } = useFdaSearchContext();
  const nadacPrices = fdaSearchResultToNadacPrices(data, fdaResultFilter, fdaResultDetailLevel);

  const resultTableTitleMap: Record<FdaResultDetailLevel, string> = {
    product: "Products",
    package: "Packages"
  }

  const graphTitle = "Average Price by " + resultDetailLevelToLabel(fdaResultDetailLevel);

  return (
    <Grid container spacing={2} display={visible ? "flex" : "none"} minHeight={0}>
      <Grid size={{ xs: 12, md: 3 }}>
        <FdaPageTools />
      </Grid>
      <Grid
        component="div"
        size={{ xs: 12, md: 9 }}
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <ExplorerGridItem title={resultTableTitleMap[fdaResultDetailLevel]}>
          <FdaSearchResults />
        </ExplorerGridItem>
        {nadacPrices.length > 0
          ?
          <ExplorerGridItem
            title={graphTitle}
          >
            <BarViz
              nadacPrices={nadacPrices}
            />
          </ExplorerGridItem>
          : <Paper component="div"
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              p: 2
            }}>
            <Box
              sx={{
                backgroundColor: "lightgray",
                width: "fit-content",
                height: "300px",
                borderRadius: "12px"
              }}
            >
              <img src="/graph.png" alt="Bar graph icon"
                style={{ height: "100%", objectFit: "contain" }}
              />
            </Box>
          </Paper>
        }
      </Grid>

    </Grid>
  )
}
