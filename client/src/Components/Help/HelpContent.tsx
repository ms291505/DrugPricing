import { lazy, Suspense } from "react";
import { Typography } from "@mui/material";
import type { HelpTopicId } from "../../library/help";

const HelpBrowser = lazy(() => import("./HelpBrowser"));
export default function HelpContent(props: { initialTopic?: HelpTopicId, standalone?: boolean }) {
  return <Suspense fallback={<Typography role="status">Loading help…</Typography>}>
    <HelpBrowser {...props} />
  </Suspense>;
}
