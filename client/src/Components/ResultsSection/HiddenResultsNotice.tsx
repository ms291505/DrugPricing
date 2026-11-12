import { Alert, Button } from "@mui/material";
import type { HiddenResultsHint } from "../../library/searchCriteria";
import { hiddenResultsMessage, type Noun } from "../../library/searchToasts";

type Props = {
  hint: HiddenResultsHint,
  /** What a row is, e.g. `["package", "packages"]`. */
  noun: Noun,
  /** Ticks the hint's Include box, or shows everything. */
  onShow: () => void,
};

/** Says what hid every result, with the fix one click away, so it doesn't read as a failed search. */
export default function HiddenResultsNotice({ hint, noun, onShow }: Props) {
  const { message, action } = hiddenResultsMessage(hint, noun);
  return (
    <Alert
      severity="info"
      action={<Button color="inherit" size="small" onClick={onShow}>{action}</Button>}
    >
      {message}
    </Alert>
  );
}
