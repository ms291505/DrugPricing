import type { GridColDef } from "@mui/x-data-grid";
import { useMemo } from "react";
import { useSearchContext } from "../../Context/NadacSearchContext";
import type { NadacPrice } from "../../library/types";
import { summarizeByUnit } from "../../library/prices";
import ResultTable from "./ResultTable";
import { createPriceColumns, type PricedRow } from "./priceColumns";

type NadacRow = PricedRow & {
  ndc: string,
  ndcDescription: string,
};

const PRICE_COLUMNS = createPriceColumns<NadacRow>();

const COLUMNS: GridColDef<NadacRow>[] = [
  {
    field: "ndc",
    headerName: "NDC",
    width: 110
  },
  PRICE_COLUMNS.latest,
  {
    field: "ndcDescription",
    headerName: "Description",
    width: 350
  },
  ...PRICE_COLUMNS.history,
];

const getRowId = (row: NadacRow) => row.ndc;

type Props = {
  nadacPrices: NadacPrice[],
  loading: boolean,
}

/** The NADAC search's results: one row per NDC. */
export default function NadacResultTable({ nadacPrices, loading }: Props) {
  const { selectedRows, setSelectedRows } = useSearchContext();

  const rows = useMemo(() => [...summarizeByUnit(nadacPrices)].map(([ndc, priceSummaries]): NadacRow => ({
    ndc,
    ndcDescription: priceSummaries[0].label,
    priceSummaries,
  })), [nadacPrices]);

  return (
    <ResultTable
      rows={rows}
      columns={COLUMNS}
      getRowId={getRowId}
      rowNoun="NDC"
      loading={loading}
      selection={selectedRows}
      onSelectionChange={setSelectedRows}
    />
  );
}
