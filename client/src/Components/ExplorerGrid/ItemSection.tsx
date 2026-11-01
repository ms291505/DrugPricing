import { useId, useMemo } from "react";
import { Box, Button, Chip, Grid, Typography } from "@mui/material";
import { useExplorerItems } from "../../Context/ExplorerItemsContext";
import { matchedPriceRange } from "../../library/explorerItems";
import ItemCard from "./ItemCard";

type Props = {
  /**
   * Pinned: charts pinned from auto charts or from Added charts. They stay as they are across new
   * searches and filter changes, and are saved with the tab.
   * Unpinned ("Added charts"): charts made with Add Chart. Not saved, and a new search clears them.
   */
  pinned: boolean,
}

/** One of a tab's two lists of user charts. Hidden until it has something in it. */
export default function ItemSection({ pinned }: Props) {
  const { pinnedItems, unpinnedItems, setAllCollapsed } = useExplorerItems();
  const items = pinned ? pinnedItems : unpinnedItems;
  const headingId = useId();

  // Shared axes for the charts the user matched in this section; each card uses them only if it
  // is matched.
  const priceRanges = useMemo(() => matchedPriceRange(items), [items]);

  if (items.length === 0) return null;

  const anyExpanded = items.some(item => !item.collapsed);
  const noun = pinned ? "pinned items" : "added charts";

  return (
    <Box component="section" aria-labelledby={headingId} sx={{ display: "flex", flexDirection: "column", gap: 1, }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: { xs: 1, md: 0 } }}>
        <Typography component="h2" variant="h6" id={headingId}>{pinned ? "Pinned" : "Added charts"}</Typography>
        <Chip size="small" label={items.length} aria-label={`${items.length} ${noun}`} />
        <Button size="small" sx={{ ml: "auto" }} onClick={() => setAllCollapsed(pinned, anyExpanded)}>
          {anyExpanded ? "Collapse all" : "Expand all"}
        </Button>
      </Box>
      {pinned
        ? null
        : <Typography variant="body2" color="text.secondary" sx={{ px: { xs: 1, md: 0 } }}>
          A new search clears these. Pin a chart to keep it.
        </Typography>
      }
      <Grid container spacing={2}>
        {items.map((item, index) => (
          <ItemCard key={item.id} item={item} pinned={pinned} index={index} count={items.length} priceRanges={priceRanges} />
        ))}
      </Grid>
    </Box>
  );
}
