import { memo, useMemo } from "react";
import { FdaPackageResultTable, FdaProductResultTable } from "../ResultTables";
import useFdaSearch, { type FdaResultView } from "../../hooks/useFdaSearch";
import useFdaChartSource from "../../hooks/useFdaChartSource";
import useNewSearchResult from "../../hooks/useNewSearchResult";
import usePriceChangeScans from "../../hooks/usePriceChangeScans";
import useLiveCharts from "../../hooks/useLiveCharts";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import { fdaResultsLabel, fdaRowCount, hiddenResultsHint, revealFda } from "../../library/searchCriteria";
import { foundMessage, type Noun } from "../../library/searchToasts";
import { countSeries, selectedChartPrices } from "../../library/chartSeries";
import type { FdaResultDetailLevel } from "../../library/types";
import PriceChangesSection from "../ResultsSection/PriceChangesSection";
import SearchResultToast from "../ui/SearchResultToast";
import ResultsSection, { HiddenResultsNotice, ResultsToolbar, ScanReport, SelectionCharts } from "../ResultsSection";
import DetailLevelSelect from "./DetailLevelSelect";
import NadacHandoffNotice from "./NadacHandoffNotice";

const ROW_NOUNS: Record<FdaResultDetailLevel, Noun> = {
  product: ["product", "products"],
  package: ["package", "packages"],
};

type Props = {
  /** The result as the page shows it (`useRefinedFdaSearch`). */
  view: FdaResultView,
};

/**
 * The FDA search's results at the tab's detail level: the toolbar, table, live charts and price
 * events, all reading the refined result. Hidden until the tab has a search. Memoized (its one
 * prop is memoized) so the search panel's keystrokes don't re-render it.
 */
export default memo(function FdaResults({ view }: Props) {
  const { isLoading, isSuccess, data } = useFdaSearch();
  const { criteria, loaded, lastSearch, fdaResultDetailLevel, selectedRows, setCriteria } = useFdaSearchContext();
  const resultKey = useNewSearchResult(lastSearch, isSuccess);
  const { products, dateWindow, hidden } = view;
  // The table, Line / Bar and live charts draw at the detail level; price change lists and their
  // scans list packages at every level.
  const levelSource = useFdaChartSource(view, fdaResultDetailLevel);
  const packageSource = useFdaChartSource(view, "package");
  const scans = usePriceChangeScans(packageSource.prices);
  const chartPrices = useMemo(() => selectedChartPrices(levelSource.prices, selectedRows.ids), [levelSource.prices, selectedRows]);
  const charts = useLiveCharts(selectedRows.ids.size, countSeries(chartPrices));
  // A toggle re-renders the page, but not the table.
  const table = useMemo(() => fdaResultDetailLevel === "product"
    ? <FdaProductResultTable products={products} loading={isLoading} dateWindow={dateWindow} />
    : <FdaPackageResultTable products={products} loading={isLoading} dateWindow={dateWindow} />,
  [fdaResultDetailLevel, products, isLoading, dateWindow]);

  if (loaded === null) return null;

  const noun = ROW_NOUNS[fdaResultDetailLevel];
  const rowCount = fdaRowCount({ products }, fdaResultDetailLevel);
  const hint = isSuccess && rowCount === 0 ? hiddenResultsHint(hidden) : null;

  return (
    <>
      <SearchResultToast resultKey={resultKey} message={isSuccess ? foundMessage(rowCount, hidden.total, noun) : null} />
      <ResultsSection
        searchLabel={fdaResultsLabel(criteria)}
        toolbar={compact => (
          <ResultsToolbar source={levelSource} chartPrices={chartPrices} selectedCount={selectedRows.ids.size} charts={charts} scans={scans} end={<DetailLevelSelect />}
            compact={compact} />
        )}
        status={compact => <ScanReport scans={scans} compact={compact} />}
        notice={
          <>
            <NadacHandoffNotice result={isSuccess ? data : undefined} dateWindow={dateWindow} loaded={loaded} />
            {hint && <HiddenResultsNotice hint={hint} noun={noun} onShow={() => setCriteria(prev => revealFda(prev, hint))} />}
          </>
        }
        priceChanges={<PriceChangesSection source={packageSource} scans={scans} />}
        table={table}
      >
        <SelectionCharts source={levelSource} chartPrices={chartPrices} on={charts.on} />
      </ResultsSection>
    </>
  );
});
