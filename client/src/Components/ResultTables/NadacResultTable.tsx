import type { GridColDef } from "@mui/x-data-grid";
import { useMemo } from "react";
import { useNadacSearchContext } from "../../Context/NadacSearchContext";
import type { NadacPrice } from "../../library/types";
import { nadacRows, type NadacRow } from "../../library/resultRows";
import ResultTable from "./ResultTable";
import { createPriceColumns } from "./priceColumns";

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
  const { selectedRows, setSelectedRows } = useNadacSearchContext();

  const rows = useMemo(() => nadacRows(nadacPrices), [nadacPrices]);

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
