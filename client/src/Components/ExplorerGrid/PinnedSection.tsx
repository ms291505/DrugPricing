import { memo, useId, useMemo } from "react";
import { Box, Button, Chip, Grid, Typography } from "@mui/material";
import { usePinActions, usePinHighlight, usePinnedItems } from "../../Context/pinnedItemsContexts";
import { matchedPriceRange, samePriceRanges } from "../../library/explorerItems";
import useStableValue from "../../hooks/useStableValue";
import PinnedItemCard from "./PinnedItemCard";

/**
 * A tab's pinned items: charts made with Chart selected or pinned from auto charts. They stay as
 * they are across new searches and filter changes. Hidden until something is pinned. Memoized
 * (no props), so a search page's refine changes don't redraw every pinned chart, and so are the
 * cards: a change to one item, or the add highlight, redraws only that item's card.
 */
export default memo(function PinnedSection() {
  const pinnedItems = usePinnedItems();
  const highlight = usePinHighlight();
  const { setAllCollapsed } = usePinActions();
  const headingId = useId();

  // Shared axes for the charts the user matched; each card gets them only if it is matched. Kept
  // while the ranges are the same, so a change to an unmatched card doesn't redraw matched ones.
  const priceRanges = useStableValue(useMemo(() => matchedPriceRange(pinnedItems), [pinnedItems]), samePriceRanges);

  if (pinnedItems.length === 0) return null;

  const anyExpanded = pinnedItems.some(item => !item.collapsed);

  return (
    <Box component="section" aria-labelledby={headingId} sx={{ display: "flex", flexDirection: "column", gap: 1, }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: { xs: 1, md: 0 } }}>
        <Typography component="h2" variant="h6" id={headingId}>Pinned</Typography>
        <Chip size="small" label={pinnedItems.length} aria-label={`${pinnedItems.length} pinned items`} />
        <Button size="small" sx={{ ml: "auto" }} onClick={() => setAllCollapsed(anyExpanded)}>
          {anyExpanded ? "Collapse all" : "Expand all"}
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ px: { xs: 1, md: 0 } }}>
        Pinned charts keep their own data and dates: searches and filters don't change them.
      </Typography>
      <Grid container spacing={2}>
        {pinnedItems.map((item, index) => (
          <PinnedItemCard
            key={item.id}
            item={item}
            isFirst={index === 0}
            isLast={index === pinnedItems.length - 1}
            highlight={highlight?.id === item.id ? highlight : null}
            priceRanges={item.kind === "chart" && item.chartType === "line" && item.matchScale ? priceRanges : undefined}
          />
        ))}
      </Grid>
    </Box>
  );
})
