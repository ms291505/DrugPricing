import { DataGrid, type GridColDef, type GridInitialState } from "@mui/x-data-grid";
import { summarizeNadacPrices, type DrugSummary, type NadacPrice } from "../types";
import { DATA_GRID_PAGE_SIZES, DEFAULT_DATA_GRID_PAGE_SIZE } from "../library/constants";
import { useSearchContext } from "../Context/SearchContext";

type Props = {
  nadacPrices: NadacPrice[],
  loading?: boolean
}
export default function TableViz({ nadacPrices, loading = false }: Props) {

  const { newChartRows, setNewChartRows } = useSearchContext();

  const drugSummaries: DrugSummary[] = summarizeNadacPrices(nadacPrices);

  const columns: GridColDef<(typeof drugSummaries)[number]>[] = [

    {
      field: "ndc",
      headerName: "NDC"
    },
    {
      field: "ndcDescription",
      headerName: "Description",
      width: 350
    },
    {
      field: "averagePrice",
      headerName: "Avg Price"
    },
    {
      field: "pricingUnit",
      headerName: "Unit"
    },
    {
      field: "minPrice",
      headerName: "Min Price"
    },
    {
      field: "maxPrice",
      headerName: "Max Price"
    },
  ]

  const initialState: GridInitialState = {
    pagination: {
      paginationModel: {
        pageSize: DEFAULT_DATA_GRID_PAGE_SIZE,
      },
    },
  }

  return (
    <DataGrid
      sx={{ border: 0 }}
      rows={drugSummaries}
      columns={columns}
      getRowId={(d) => d.ndc}
      initialState={initialState}
      pageSizeOptions={DATA_GRID_PAGE_SIZES}
      checkboxSelection
      rowSelectionModel={newChartRows}
      onRowSelectionModelChange={(model) => setNewChartRows(model)}
      disableRowSelectionExcludeModel
      loading={loading}
    />
  )
}

