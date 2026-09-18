
import { type GridColDef, } from "@mui/x-data-grid";
import { type FdaPackageResultInfo, type FdaProductDetail } from "../../library/types";

export function createFdaPackageTableColumns(products: FdaProductDetail[]): GridColDef<FdaPackageResultInfo>[] {

  return [
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
        products.find(product => product.fdaPackageDetails.find(p => p.id === fdaPackage.id))?.proprietaryName
      ),
      width: 150,
    },
    {
      field: "generic name",
      headerName: "Generic Name",
      width: 150,
      valueGetter: (_, fdaPackage) => (
        products.find(product => product.fdaPackageDetails.find(p => p.id === fdaPackage.id))?.nonProprietaryName.join(", ")
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
}
