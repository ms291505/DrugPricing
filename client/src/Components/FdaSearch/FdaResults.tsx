import { memo, useCallback, useMemo } from "react";
import { Box } from "@mui/material";
import { FdaPackageResultTable, FdaProductResultTable } from "../ResultTables";
import useFdaSearch, { type FdaResultView } from "../../hooks/useFdaSearch";
import useFdaChartOrigin from "../../hooks/useFdaChartOrigin";
import useSeriesColors from "../../hooks/useSeriesColors";
import useNewSearchResult from "../../hooks/useNewSearchResult";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import { fdaProductsToNadacPrices } from "../../library/fdaDataToNadacPrices";
import { fdaPackagePrices, flagPriceChanges } from "../../library/flagNadacPriceChange";
import { fdaRowCount, hiddenResultsHint, showAllFda } from "../../library/searchCriteria";
import { countMessage, foundMessage, type Noun } from "../../library/searchToasts";
import type { FdaResultDetailLevel } from "../../library/types";
import PriceChangeCards from "../ExplorerGrid/PriceChangeCards";
import SearchResultToast from "../ui/SearchResultToast";
import ResultsSection, { AutoCharts, ChartSelectedControl, HiddenResultsNotice } from "../ResultsSection";
import DetailLevelSelect from "./DetailLevelSelect";

const ROW_NOUNS: Record<FdaResultDetailLevel, Noun> = {
  product: ["product", "products"],
  package: ["package", "packages"],
};

type Props = {
  /** The result as the page shows it (`useRefinedFdaSearch`). */
  view: FdaResultView,
};

/**
 * The FDA search's results at the tab's detail level: the table, auto charts and price-change
 * cards, all reading the refined result. Hidden until the tab has a search. Memoized (its one
 * prop is memoized) so the search panel's keystrokes don't re-render it.
 */
export default memo(function FdaResults({ view }: Props) {
  const { isLoading, isSuccess, dataUpdatedAt } = useFdaSearch();
  const { loaded, lastSearch, fdaResultDetailLevel, selectedRows, setCriteria } = useFdaSearchContext();
  const resultKey = useNewSearchResult(lastSearch, isSuccess, dataUpdatedAt);
  const { products, dateWindow, hidden, history } = view;
  const origin = useFdaChartOrigin();
  const packageOrigin = useFdaChartOrigin("package");
  // Derived once per result, filter, and level change, not on every render (e.g. each selection).
  const nadacPrices = useMemo(
    () => fdaProductsToNadacPrices(products, fdaResultDetailLevel),
    [products, fdaResultDetailLevel]);
  const packageNadacPrices = useMemo(() => fdaProductsToNadacPrices(products, "package"), [products]);
  const priceChanges = useMemo(() => flagPriceChanges(fdaPackagePrices(products)), [products]);
  const colors = useSeriesColors(origin.resultPrices, nadacPrices);
  const packageColors = useSeriesColors(packageOrigin.resultPrices, packageNadacPrices);
  const levelHistory = useCallback(() => history(fdaResultDetailLevel), [history, fdaResultDetailLevel]);
  const packageHistory = useCallback(() => history("package"), [history]);

  if (loaded === null) return null;

  const noun = ROW_NOUNS[fdaResultDetailLevel];
  const rowCount = fdaRowCount({ products }, fdaResultDetailLevel);
  const hint = isSuccess && rowCount === 0 ? hiddenResultsHint(hidden) : null;

  return (<>
    <SearchResultToast resultKey={resultKey} message={isSuccess ? foundMessage(rowCount, hidden.total, noun) : null} />
    {/* Counts every change flagged, charted or not: the cards' note says why some aren't. */}
    <SearchResultToast
      resultKey={resultKey}
      message={priceChanges.length > 0 ? countMessage(priceChanges.length, ["price change", "price changes"], "flagged") : null}
      kind="flag"
    />
    <ResultsSection
      searchLabel={origin.searchLabel}
      toolbar={<Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2 }}>
        <DetailLevelSelect />
        <ChartSelectedControl
          prices={nadacPrices} history={levelHistory} selection={selectedRows} origin={origin} dateWindow={dateWindow} colors={colors}
        />
      </Box>}
      notice={hint
        ? <HiddenResultsNotice
          hint={hint}
          noun={noun}
          onShow={() => setCriteria(prev => hint.kind === "include" ? { ...prev, [hint.key]: true } : showAllFda(prev))}
        />
        : null}
      table={fdaResultDetailLevel === "product"
        ? <FdaProductResultTable products={products} loading={isLoading} />
        : <FdaPackageResultTable products={products} loading={isLoading} />}
    >
      <AutoCharts prices={nadacPrices} history={levelHistory} origin={origin} colors={colors} dateWindow={dateWindow} />
      <PriceChangeCards
        changes={priceChanges} prices={packageNadacPrices} history={packageHistory} dateWindow={dateWindow}
        origin={packageOrigin} colors={packageColors}
      />
    </ResultsSection>
  </>);
});
