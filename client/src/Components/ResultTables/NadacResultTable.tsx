import type { DateWindow } from "../../library/dates";
import type { GridColDef } from "@mui/x-data-grid";
import { useMemo } from "react";
import { useAsOfReference } from "../../hooks/useAppInit";
import { useNadacSearchContext } from "../../Context/NadacSearchContext";
import type { NadacPrice } from "../../library/types";
import { nadacRows, type NadacRow } from "../../library/resultRows";
import { activityColumn } from "./activityColumn";
import ResultTable from "./ResultTable";
import { createPriceColumns } from "./priceColumns";

const PRICE_COLUMNS = createPriceColumns<NadacRow>();

const COLUMNS: GridColDef<NadacRow>[] = [
  {
    field: "ndc",
    headerName: "NDC",
    cellClassName: "ndc-cell"
  },
  PRICE_COLUMNS.latest,
  {
    field: "ndcDescription",
    headerName: "Description",
  },
  activityColumn<NadacRow>(),
  ...PRICE_COLUMNS.history,
];

const getRowId = (row: NadacRow) => row.ndc;

type Props = {
  nadacPrices: NadacPrice[],
  loading: boolean,
  dateWindow?: DateWindow,
}

/** The NADAC search's results: one row per NDC. */
export default function NadacResultTable({ nadacPrices, loading, dateWindow }: Props) {
  const { selectedRows, setSelectedRows } = useNadacSearchContext();

  const reference = useAsOfReference(dateWindow);
  const rows = useMemo(() => nadacRows(nadacPrices, reference), [nadacPrices, reference]);

  return (
    <ResultTable
      dateWindow={dateWindow}
      tableType="nadac"
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
