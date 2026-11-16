import { memo, useCallback, useContext, useMemo, useState } from "react";
import { Alert, Button, Box } from "@mui/material";
import { FdaPackageResultTable, FdaProductResultTable } from "../ResultTables";
import useFdaSearch, { type FdaResultView } from "../../hooks/useFdaSearch";
import useFdaChartOrigin from "../../hooks/useFdaChartOrigin";
import useSeriesColors from "../../hooks/useSeriesColors";
import useNewSearchResult from "../../hooks/useNewSearchResult";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import { fdaProductsToNadacPrices } from "../../library/fdaDataToNadacPrices";
import { clearFdaRefine, fdaResultsLabel, fdaRowCount, hiddenResultsHint, showAllFda } from "../../library/searchCriteria";
import { foundMessage, type Noun } from "../../library/searchToasts";
import type { FdaResultDetailLevel } from "../../library/types";
import PriceChangesSection from "../ResultsSection/PriceChangesSection";
import type { PriceEventGroup } from "../../library/priceActivity";
import toast from "react-hot-toast";
import SearchResultToast from "../ui/SearchResultToast";
import ResultsSection, { AutoCharts, ChartSelectedControl, HiddenResultsNotice } from "../ResultsSection";
import { TryNadacContext } from "../../Context/searchNavigation";
import { fdaHasPricesInWindow, nadacHandoffTerm } from "../../library/fdaNadacHandoff";
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
 * The FDA search's results at the tab's detail level: the table, live comparisons and price events, all reading the refined result. Hidden until the tab has a search. Memoized (its one
 * prop is memoized) so the search panel's keystrokes don't re-render it.
 */
export default memo(function FdaResults({ view }: Props) {
  const onTryNadac = useContext(TryNadacContext);
  const { isLoading, isSuccess, data } = useFdaSearch();
  const { criteria, loaded, lastSearch, fdaResultDetailLevel, selectedRows, setSelectedRows, setFdaResultDetailLevel, setCriteria } = useFdaSearchContext();
  const resultKey = useNewSearchResult(lastSearch, isSuccess);
  const { products, dateWindow, hidden, history } = view;
  const origin = useFdaChartOrigin();
  const packageOrigin = useFdaChartOrigin("package");
  // Derived once per result, filter, and level change, not on every render (e.g. each selection).
  const nadacPrices = useMemo(
    () => fdaProductsToNadacPrices(products, fdaResultDetailLevel),
    [products, fdaResultDetailLevel]);
  const packageNadacPrices = useMemo(() => fdaProductsToNadacPrices(products, "package"), [products]);
  const colors = useSeriesColors(origin.resultPrices, nadacPrices);
  const packageColors = useSeriesColors(packageOrigin.resultPrices, packageNadacPrices);
  const levelHistory = useCallback(() => history(fdaResultDetailLevel), [history, fdaResultDetailLevel]);
  const packageHistory = useCallback(() => history("package"), [history]);

  const [activitySelection, setActivitySelection] = useState<{ ids: string[] }>();
  const selectAffected = (group: PriceEventGroup) => {
    const ids = [...new Set(group.events.map(e => e.packageNdc))];
    const switching = fdaResultDetailLevel === "product";
    if (switching) setFdaResultDetailLevel("package");
    const combined = new Set(switching ? [] : selectedRows.ids);
    ids.forEach(id => combined.add(id));
    setSelectedRows({ type: "include", ids: combined });
    setActivitySelection({ ids });
    toast.success(`${ids.length} affected ${ids.length === 1 ? "row" : "rows"} selected · ${combined.size} selected in total`);
  };

  if (loaded === null) return null;

  const noun = ROW_NOUNS[fdaResultDetailLevel];
  const rowCount = fdaRowCount({ products }, fdaResultDetailLevel);
  const hint = isSuccess && rowCount === 0 ? hiddenResultsHint(hidden) : null;

  return (<>
    <SearchResultToast resultKey={resultKey} message={isSuccess ? foundMessage(rowCount, hidden.total, noun) : null} />
    <ResultsSection
      searchLabel={fdaResultsLabel(criteria)}
      toolbar={<Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2 }}>
        <DetailLevelSelect />
        <ChartSelectedControl
          prices={nadacPrices} history={levelHistory} selection={selectedRows} origin={origin} dateWindow={dateWindow} colors={colors}
        />
      </Box>}
      notice={<>
        {isSuccess && onTryNadac && data && !fdaHasPricesInWindow(data, dateWindow) && <Alert severity="info"
          action={<Button color="inherit" onClick={() => onTryNadac(nadacHandoffTerm(loaded))}>Search NADAC</Button>}>
          {data.products.length === 0 ? "No FDA matches found." : "No FDA results have prices in these dates."} NADAC has prices for packages FDA search can’t match. Try searching the full NADAC data.
        </Alert>}
        {hint
        ? <HiddenResultsNotice
          hint={hint}
          noun={noun}
          onShow={() => setCriteria(prev => hint.kind === "include" ? { ...prev, [hint.key]: true }
            : hint.kind === "clear" ? clearFdaRefine(prev) : showAllFda(prev))}
        />
        : null}</>}
      priceChanges={<PriceChangesSection prices={packageNadacPrices} history={packageHistory}
        origin={packageOrigin} colors={packageColors} productLevel={fdaResultDetailLevel === "product"} onSelect={selectAffected} />}
      table={fdaResultDetailLevel === "product"
        ? <FdaProductResultTable products={products} loading={isLoading} activitySelection={activitySelection} dateWindow={dateWindow} />
        : <FdaPackageResultTable products={products} loading={isLoading} activitySelection={activitySelection} dateWindow={dateWindow} />}
    >
      <AutoCharts prices={nadacPrices} history={levelHistory} origin={origin} colors={colors} dateWindow={dateWindow} />
    </ResultsSection>
  </>);
});
