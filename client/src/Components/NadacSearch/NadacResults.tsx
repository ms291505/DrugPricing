import { memo, useMemo } from "react";
import { NadacResultTable } from "../ResultTables";
import { useNadacSearch, type NadacResultView } from "../../hooks/useNadacSearch";
import useNadacChartSource from "../../hooks/useNadacChartSource";
import useNewSearchResult from "../../hooks/useNewSearchResult";
import usePriceChangeScans from "../../hooks/usePriceChangeScans";
import { useNadacSearchContext } from "../../Context/NadacSearchContext";
import { hiddenResultsHint, nadacResultsLabel, revealNadac } from "../../library/searchCriteria";
import { foundMessage, type Noun } from "../../library/searchToasts";
import PriceChangesSection from "../ResultsSection/PriceChangesSection";
import SearchResultToast from "../ui/SearchResultToast";
import ResultsSection, { AutoCharts, ChartSelectedControl, HiddenResultsNotice } from "../ResultsSection";

const PACKAGES: Noun = ["package", "packages"];

type Props = {
  /** The result as the page shows it (`useRefinedNadacSearch`). */
  view: NadacResultView,
};

/**
 * The NADAC search's results: the table, live comparisons and price events, all reading the
 * refined result. Hidden until the tab has a search. Memoized (its one prop is memoized) so the
 * search panel's keystrokes and changes to the workspace's tab list, such as a rename after a
 * search, don't re-render every NADAC tab's results.
 */
export default memo(function NadacResults({ view }: Props) {
  const { isLoading, isSuccess } = useNadacSearch();
  const { criteria, loaded, lastSearch, selectedRows, setCriteria } = useNadacSearchContext();
  const resultKey = useNewSearchResult(lastSearch, isSuccess);
  const { prices, dateWindow, hidden } = view;
  // Every chart and price change list draws packages, so the page has one source.
  const source = useNadacChartSource(view);
  const packageCount = useMemo(() => new Set(prices.map(price => price.ndc)).size, [prices]);
  const scans = usePriceChangeScans(prices);

  if (loaded === null) return null;

  const hint = isSuccess && packageCount === 0 ? hiddenResultsHint(hidden) : null;

  return (
    <>
      <SearchResultToast resultKey={resultKey} message={foundMessage(packageCount, hidden.total, PACKAGES)} />
      <ResultsSection
        searchLabel={nadacResultsLabel(criteria)}
        toolbar={<ChartSelectedControl source={source} selection={selectedRows} />}
        notice={hint && <HiddenResultsNotice hint={hint} noun={PACKAGES} onShow={() => setCriteria(prev => revealNadac(prev, hint))} />}
        priceChanges={<PriceChangesSection source={source} scans={scans} />}
        table={<NadacResultTable nadacPrices={prices} loading={isLoading} dateWindow={dateWindow} />}
      >
        <AutoCharts source={source} scans={scans} />
      </ResultsSection>
    </>
  );
});
