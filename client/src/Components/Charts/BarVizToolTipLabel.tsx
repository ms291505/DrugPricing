import type { DrugSummary } from "../../library/types.ts";

type Props = {
  drugSummary: DrugSummary
}
export default function BarVizToolTipLabel({ drugSummary }: Props) {

  return (
    <>
      <span style={{ display: "block" }}>
        {drugSummary.ndc}
      </span>
      <span style={{ display: "block" }}>
        {drugSummary.ndcDescription}
      </span>
    </>
  )
}
