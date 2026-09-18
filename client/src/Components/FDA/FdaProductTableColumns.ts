import { type GridColDef, } from "@mui/x-data-grid";
import { isFdaProductOtc, type FdaProductDetail } from "../../library/types";

export const FDA_PRODUCT_TABLE_COLUMNS: GridColDef<FdaProductDetail>[] = [
  {
    field: "productNdc",
    headerName: "Product NDC",
    width: 125
  },
  {
    field: "proprietaryName",
    headerName: "Brand Name",
    width: 150
  },
  {
    field: "nonProprietaryName",
    headerName: "Generic Name",
    width: 150,
    valueGetter: (_, product: FdaProductDetail) => (product.nonProprietaryName.join(", "))
  },
  {
    field: "dosageFormName",
    headerName: "Form",
    valueGetter: (_, product) => (product.dosageFormName.replace(", ", ": "))
  },
  {
    field: "routeName",
    headerName: "Route",
    valueGetter: (_, product) => (product.routeName.join(", "))
  },
  {
    field: "strengthNumber",
    headerName: "Strength",
    valueGetter: (_, product) => (
      product.strengthNumber.map((s, i) => (s + " " + product.strengthUnit[i])).join(", ")
    )
  },
  {
    field: "labelerName",
    headerName: "Labeler",
    width: 150
  },
  {
    field: "productTypeName",
    headerName: "OTC Drug",
    valueGetter: (_, product) => (
      isFdaProductOtc(product.productTypeName) ? "Yes" : "No"
    )
  },
  {
    field: "packageCount",
    headerName: "Packages",
    valueGetter: (_, product) => (
      product.fdaPackageDetails.length
    )
  }
]
