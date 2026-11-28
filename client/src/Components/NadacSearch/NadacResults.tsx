import { memo, useMemo } from "react";
import { NadacResultTable } from "../ResultTables";
import { useNadacSearch, type NadacResultView } from "../../hooks/useNadacSearch";
import useNadacChartSource from "../../hooks/useNadacChartSource";
import useNewSearchResult from "../../hooks/useNewSearchResult";
import usePriceChangeScans from "../../hooks/usePriceChangeScans";
import useAddedCharts from "../../hooks/useAddedCharts";
import { useNadacSearchContext } from "../../Context/NadacSearchContext";
import { hiddenResultsHint, nadacResultsLabel, revealNadac } from "../../library/searchCriteria";
import { foundMessage, type Noun } from "../../library/searchToasts";
import { selectedChartPrices } from "../../library/chartSeries";
import SearchResultToast from "../ui/SearchResultToast";
import ResultsSection, { HiddenResultsNotice, ResultCards, ResultsReport, ResultsToolbar, TooManyRowsNotice } from "../ResultsSection";
import { isTooManyRows } from "../../library/apiErrors";

const PACKAGES: Noun = ["package", "packages"];

type Props = {
  /** The result as the page shows it (`useRefinedNadacSearch`). */
  view: NadacResultView,
};

/**
 * The NADAC search's results: the toolbar, table, added charts and price events, all reading the
 * refined result. Hidden until the tab has a search. Memoized (its one prop is memoized) so the
 * search panel's keystrokes and changes to the workspace's tab list, such as a rename after a
 * search, don't re-render every NADAC tab's results.
 */
export default memo(function NadacResults({ view }: Props) {
  const { isLoading, isSuccess, error } = useNadacSearch();
  const { criteria, loaded, lastSearch, selectedRows, setCriteria } = useNadacSearchContext();
  const resultKey = useNewSearchResult(lastSearch, isSuccess);
  const { prices, dateWindow, hidden } = view;
  // Every chart and price change list draws packages, so the page has one source.
  const source = useNadacChartSource(view);
  const packageCount = useMemo(() => new Set(prices.map(price => price.ndc)).size, [prices]);
  const scans = usePriceChangeScans(prices);
  const chartPrices = useMemo(() => selectedChartPrices(source.prices, selectedRows.ids), [source.prices, selectedRows]);
  // A new search or Clear search makes the rows another result's.
  const charts = useAddedCharts(lastSearch);
  // Adding a chart re-renders the page, but not the table.
  const table = useMemo(
    () => <NadacResultTable nadacPrices={prices} loading={isLoading} dateWindow={dateWindow} />,
    [prices, isLoading, dateWindow],
  );

  if (loaded === null) return null;

  const hint = isSuccess && packageCount === 0 ? hiddenResultsHint(hidden) : null;

  return (
    <>
      <SearchResultToast resultKey={resultKey} message={foundMessage(packageCount, hidden.total, PACKAGES)} />
      <ResultsSection
        searchLabel={nadacResultsLabel(criteria)}
        toolbar={compact => (
          <ResultsToolbar source={source} chartPrices={chartPrices} selectedCount={selectedRows.ids.size} charts={charts} scans={scans}
            compact={compact} />
        )}
        status={compact => <ResultsReport scans={scans} charts={charts} compact={compact} />}
        notice={isTooManyRows(error)
          ? <TooManyRowsNotice message={error.message} />
          : hint && <HiddenResultsNotice hint={hint} noun={PACKAGES} onShow={() => setCriteria(prev => revealNadac(prev, hint))} />}
        table={table}
      >
        <ResultCards chartSource={source} charts={charts} packageSource={source} scans={scans} />
      </ResultsSection>
    </>
  );
});
