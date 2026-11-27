import { Alert, Box } from "@mui/material";
import HelpButton from "../Help/HelpButton";

type Props = {
  /** The server's refusal, which names the limit and how to narrow the search. */
  message: string,
};

/**
 * Says the search matched too many prices to show, in place of results. Not a toast: one would go
 * away and leave an empty table with nothing to explain it. Stays until the next search.
 */
export default function TooManyRowsNotice({ message }: Props) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Alert severity="warning" sx={{ flex: 1 }}>{message}</Alert>
      <HelpButton topic="searching" />
    </Box>
  );
}
