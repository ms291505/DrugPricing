import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import { FdaPackageResultTable, FdaProductResultTable } from "../ResultTables";

export default function FdaSearchResults() {

  const { fdaResultDetailLevel } = useFdaSearchContext();

  return fdaResultDetailLevel === "product" ? <FdaProductResultTable /> : <FdaPackageResultTable />;
}
