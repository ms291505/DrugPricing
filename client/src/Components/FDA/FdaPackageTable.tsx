import { DataGrid, type GridColDef, type GridInitialState } from "@mui/x-data-grid";
import useFdaSearch from "../../hooks/useFdaSearch";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import { applyFdaResultFilter, type FdaPackageDetail } from "../../types";
import { DATA_GRID_PAGE_SIZES, DEFAULT_DATA_GRID_PAGE_SIZE } from "../../library/constants";
import { Typography, Paper } from "@mui/material";

type FdaPackageResultInfo = FdaPackageDetail &
{
  productNdc: string,
  dosageFormName: string,
  routeName: string[],
  labelerName: string,
}

export default function FdaPackageTable() {

  const { fdaResultFilter } = useFdaSearchContext();

  const fdaSearch = useFdaSearch();

  const data = fdaSearch.data ?? { products: [] };

  const rows: FdaPackageResultInfo[] = applyFdaResultFilter(data, fdaResultFilter)
    .products.flatMap(product =>
      product.fdaPackageDetails.map(fdaPackage =>
      ({
        ...fdaPackage,
        productNdc: product.productNdc,
        dosageFormName: product.dosageFormName,
        routeName: [...product.routeName],
        labelerName: product.labelerName,
      }))
    );

  const columns: GridColDef<FdaPackageResultInfo>[] = [
    {
      field: "productNdc",
      headerName: "Product NDC"
    },
    {
      field: "ndcPackageCode",
      headerName: "Package NDC",
      valueGetter: (_, fdaPackage) => (fdaPackage.ndcPackageCode.split("-")[2]),
    },
    {
      field: "brand name",
      headerName: "Brand Name",
      valueGetter: (_, fdaPackage) => (
        data.products.find(product => product.fdaPackageDetails.find(p => p.id === fdaPackage.id))?.proprietaryName
      ),
      width: 150,
    },
    {
      field: "generic name",
      headerName: "Generic Name",
      width: 150,
      valueGetter: (_, fdaPackage) => (
        data.products.find(product => product.fdaPackageDetails.find(p => p.id === fdaPackage.id))?.nonProprietaryName.join(", ")
      )
    },
    {
      field: "samplePackage",
      headerName: "Sample",
      valueGetter: (_, fdaPackage) => (
        fdaPackage.samplePackage ? "Yes" : "No"
      ),
      width: 75
    },
    {
      field: "packageDescription",
      headerName: "Package Description",
      width: 250,
    },
    {
      field: "dosageFormName",
      headerName: "Form",
      valueGetter: (_, p) => (p.dosageFormName.replace(", ", ": "))
    },
    {
      field: "routeName",
      headerName: "Route",
      valueGetter: (_, p) => (p.routeName.join(", "))
    },
    {
      field: "labelerName",
      headerName: "Labeler",
      width: 150
    },
  ];

  const initialState: GridInitialState = {
    pagination: {
      paginationModel: {
        pageSize: DEFAULT_DATA_GRID_PAGE_SIZE,
      },
    },
  }


  return (
    <>
      <Paper sx={{ p: 1, display: "flex", flexDirection: "column", alignItems: "center" }} elevation={3} component="div">
        <Typography variant="h6">Packages</Typography>
      </Paper>
      <DataGrid
        sx={{ border: 0 }}
        rows={rows}
        columns={columns}
        loading={fdaSearch.isLoading}
        initialState={initialState}
        pageSizeOptions={DATA_GRID_PAGE_SIZES}
        getRowId={r => r.id}
      />
    </>
  )
}
