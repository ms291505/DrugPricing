import { Alert, Box, Button } from "@mui/material";
import HelpButton from "../Help/HelpButton";
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
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Alert
        severity="info"
        sx={{ flex: 1 }}
        action={<Button color="inherit" size="small" onClick={onShow}>{action}</Button>}
      >
        {message}
      </Alert>
      <HelpButton topic="filters-and-hidden-results" />
    </Box>
  );
}
