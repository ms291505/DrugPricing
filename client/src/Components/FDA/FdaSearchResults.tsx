import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import FdaPackageTable from "./FdaPackageTable";
import FdaProductTable from "./FdaProductTable";

export default function FdaSearchResults() {

  const { fdaResultDetailLevel } = useFdaSearchContext();

  return (
    <>
      {
        fdaResultDetailLevel === "product" ?
          <FdaProductTable />
          : fdaResultDetailLevel === "package"
            ? <FdaPackageTable />
            : null
      }
    </>)
}
