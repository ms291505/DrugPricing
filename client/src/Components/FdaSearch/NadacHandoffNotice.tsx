import { useContext } from "react";
import { Alert, Button } from "@mui/material";
import { TryNadacContext } from "../../Context/searchNavigation";
import { fdaHasPricesInWindow, nadacHandoffTerm } from "../../library/fdaNadacHandoff";
import type { DateWindow } from "../../library/dates";
import type { FdaLoad } from "../../library/searchCriteria";
import type { FdaProductSearchResult } from "../../library/types";

type Props = {
  /** The loaded result once the search succeeded, before exclusions; undefined while loading or failed. */
  result: FdaProductSearchResult | undefined,
  /** The dates the page shows. */
  dateWindow: DateWindow,
  /** The search on screen: its terms become the NADAC search. */
  loaded: FdaLoad,
};

/**
 * Offers standalone NADAC search when no FDA result has prices in the shown dates. Only standalone
 * Search provides `TryNadacContext`, so workspace tabs never show it.
 */
export default function NadacHandoffNotice({ result, dateWindow, loaded }: Props) {
  const onTryNadac = useContext(TryNadacContext);
  if (!onTryNadac || !result || fdaHasPricesInWindow(result, dateWindow)) return null;
  return (
    <Alert severity="info"
      action={<Button color="inherit" onClick={() => onTryNadac(nadacHandoffTerm(loaded))}>Search NADAC</Button>}>
      {result.products.length === 0 ? "No FDA matches found." : "No FDA results have prices in these dates."} NADAC has prices for packages FDA search can’t match. Try searching the full NADAC data.
    </Alert>
  );
}
