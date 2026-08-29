import { Grid, } from "@mui/material";
import FdaSearchResults from "./FdaSearchResults";
import FdaPageTools from "./FdaPageTools";
import BarViz from "../NadacSearch/BarViz";
import useFdaSearch from "../../hooks/useFdaSearch";
import { resultDetailLevelToLabel, type FdaResultDetailLevel, } from "../../library/types";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import fdaSearchResultToNadacPrices from "../../library/fdaDataToNadacPrices";
import ExplorerGridItem from "../ExplorerGrid/ExplorerGridItem";
import LineViz from "../NadacSearch/LineViz";
import { flagNadacPriceChangeForFdaProducts, getAllPricesForFlaggedPackages } from "../../library/flagNadacPriceChange";

type Props = {
  visible?: boolean
}

export default function FdaExplorer({ visible = true }: Props) {
  const { data } = useFdaSearch();
  const { fdaResultFilter, fdaResultDetailLevel } = useFdaSearchContext();
  const nadacPrices = fdaSearchResultToNadacPrices(data, fdaResultFilter, fdaResultDetailLevel);
  const packageNadacPrices = fdaSearchResultToNadacPrices(data, fdaResultFilter, "package");
  const productPriceChanges = flagNadacPriceChangeForFdaProducts(data?.products ?? []);


  const resultTableTitleMap: Record<FdaResultDetailLevel, string> = {
    product: "Products",
    package: "Packages"
  }

  const graphTitle = "Average Price by " + resultDetailLevelToLabel(fdaResultDetailLevel);

  return (
    <Grid container spacing={2} display={visible ? "flex" : "none"} minHeight={0}>
      <Grid
        size={{ xs: 12, md: 3 }}
      >
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
          : null
        }
      </Grid>
      {
        fdaResultDetailLevel === "package"
          ?
          <Grid size={12}>
            <ExplorerGridItem title="Package Price Over Time">
              <LineViz nadacPrices={nadacPrices} />
            </ExplorerGridItem>
          </Grid>
          : null
      }
      {
        productPriceChanges.map(change => {
          const prices = getAllPricesForFlaggedPackages(change, packageNadacPrices);
          return (
            <Grid size={{ xs: 12, md: 6 }} key={change.packageNdc + change.priceChange.startDate.toDateString()}>
              <ExplorerGridItem title={"Significant Prices Change for " + change.packageNdc}>
                <LineViz nadacPrices={prices} />
              </ExplorerGridItem>
            </Grid>
          )
        })
      }
    </Grid>
  )
}
