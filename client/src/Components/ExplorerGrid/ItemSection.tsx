import { useId, useMemo } from "react";
import { Box, Button, Chip, Grid, Typography } from "@mui/material";
import { useExplorerItems, type ItemList } from "../../Context/ExplorerItemsContext";
import { matchedPriceRange } from "../../library/explorerItems";
import ItemCard from "./ItemCard";

const HEADINGS: Record<ItemList, string> = { pinned: "Pinned", unpinned: "Added charts" };
const NOUNS: Record<ItemList, string> = { pinned: "pinned items", unpinned: "added charts" };

/** One of a tab's two lists of user charts (`ItemList`). Hidden until it has something in it. */
export default function ItemSection({ list }: { list: ItemList }) {
  const { items: allItems, setAllCollapsed } = useExplorerItems();
  const items = allItems[list];
  const headingId = useId();

  // Shared axes for the charts the user matched in this section; each card uses them only if it
  // is matched.
  const priceRanges = useMemo(() => matchedPriceRange(items), [items]);

  if (items.length === 0) return null;

  const anyExpanded = items.some(item => !item.collapsed);

  return (
    <Box component="section" aria-labelledby={headingId} sx={{ display: "flex", flexDirection: "column", gap: 1, }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: { xs: 1, md: 0 } }}>
        <Typography component="h2" variant="h6" id={headingId}>{HEADINGS[list]}</Typography>
        <Chip size="small" label={items.length} aria-label={`${items.length} ${NOUNS[list]}`} />
        <Button size="small" sx={{ ml: "auto" }} onClick={() => setAllCollapsed(list, anyExpanded)}>
          {anyExpanded ? "Collapse all" : "Expand all"}
        </Button>
      </Box>
      {list === "unpinned"
        ? <Typography variant="body2" color="text.secondary" sx={{ px: { xs: 1, md: 0 } }}>
          Not saved, and a new search clears them. Pin a chart to keep it.
        </Typography>
        : null
      }
      <Grid container spacing={2}>
        {items.map((item, index) => (
          <ItemCard key={item.id} item={item} list={list} index={index} count={items.length} priceRanges={priceRanges} />
        ))}
      </Grid>
    </Box>
  );
}
