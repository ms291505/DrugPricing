import { Tab, Tabs } from "@mui/material";
import { Link } from "react-router";
import type { SearchSource } from "../../library/persist";

/** Route navigation styled as the search panel's source tabs, never a form field. */
export default function SearchSourceTabs({ source }: { source: SearchSource }) {
  return <Tabs value={source} aria-label="Search source" sx={{ flexShrink: 0, minHeight: 40 }}>
    <Tab value="fda" label="FDA search" component={Link} to="/search/fda" sx={{ minHeight: 40, py: 1 }} />
    <Tab value="nadac" label="NADAC search" component={Link} to="/search/nadac" sx={{ minHeight: 40, py: 1 }} />
  </Tabs>;
}
