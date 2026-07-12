import { Box, Grid, Paper, Typography } from "@mui/material";
import FdaSearchTool from "./FdaSearchTool";
import FdaSearchResults from "./FdaSearchResults";
import FdaPageTools from "./FdaPageTools";
import BarViz from "../../NadacSearch/BarViz";
import { applyFdaResultFilter, resultDetailLevelToLabel, type NadacPrice } from "../../types";
import useFdaSearch from "../../hooks/useFdaSearch";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";

export default function FdaSearch() {
  const { data } = useFdaSearch();
  const { fdaResultFilter, fdaResultDetailLevel } = useFdaSearchContext();

  const nadacPrices: NadacPrice[] =
    data
      ? applyFdaResultFilter(data, fdaResultFilter)
        .products.flatMap(fdaProduct => fdaProduct
          .fdaPackageDetails.flatMap(fdaPackage => (
            fdaPackage.nadacPrices.flatMap(price => {
              if (fdaResultDetailLevel === "product")
                return {
                  ...price,
                  ndc: fdaProduct.productNdc,
                  ndcDescription: fdaProduct.proprietaryName
                }
              else if (fdaResultDetailLevel === "package")
                return {
                  ...price,
                  ndc: fdaPackage.ndcPackageCode,
                  ndcDescription: fdaPackage.packageDescription
                }
              else return price;
            })
          )))
      : [];

  return (
    <Box sx={{
      display: "flex",
      flexDirection: "column",
      gap: 1
    }}>
      <FdaSearchTool />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 3 }}>
          <FdaPageTools />
        </Grid>
        <Grid
          component="div"
          size={{ xs: 12, sm: 9 }}
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <Paper
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              p: 2,
            }}
            component="section"
          >
            <FdaSearchResults />
          </Paper>
          {nadacPrices.length > 0
            ?
            <Paper
              sx={{
                p: 1,
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}>
              <Paper sx={{ p: 1, display: "flex", flexDirection: "column", alignItems: "center" }} elevation={3} component="div">
                <Box sx={{ display: "flex", alignItems: "center", width: "100%", position: "relative" }}>
                  <Typography variant="h6" sx={{ position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
                    {"Average Price by " + resultDetailLevelToLabel(fdaResultDetailLevel)}
                  </Typography>
                  {/*
                  <Button sx={{ marginLeft: "auto" }}>Press</Button>
                  */}
                </Box>
              </Paper>
              <BarViz
                nadacPrices={nadacPrices}
              />
            </Paper>
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
    </Box>
  )
}
