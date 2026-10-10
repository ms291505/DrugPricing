import { useId } from "react";
import { Box, Button, Chip, Grid, Typography } from "@mui/material";
import { useExplorerItems } from "../../Context/ExplorerItemsContext";
import PinnedItemCard from "./PinnedItemCard";

/**
 * A tab's pinned items: charts made with Add Chart or pinned from auto charts. They stay as they
 * are across new searches and filter changes. Hidden until something is pinned.
 */
export default function PinnedSection() {
  const { pinnedItems, setAllCollapsed } = useExplorerItems();
  const headingId = useId();

  if (pinnedItems.length === 0) return null;

  const anyExpanded = pinnedItems.some(item => !item.collapsed);

  return (
    <Box component="section" aria-labelledby={headingId} sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: { xs: 1, md: 0 } }}>
        <Typography component="h2" variant="h6" id={headingId}>Pinned</Typography>
        <Chip size="small" label={pinnedItems.length} aria-label={`${pinnedItems.length} pinned items`} />
        <Button size="small" sx={{ ml: "auto" }} onClick={() => setAllCollapsed(anyExpanded)}>
          {anyExpanded ? "Collapse all" : "Expand all"}
        </Button>
      </Box>
      <Grid container spacing={2}>
        {pinnedItems.map((item, index) => (
          <PinnedItemCard key={item.id} item={item} index={index} count={pinnedItems.length} />
        ))}
      </Grid>
    </Box>
  );
}
