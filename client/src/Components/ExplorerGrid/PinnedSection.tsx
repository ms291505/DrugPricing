import { useId, useMemo } from "react";
import { Box, Button, Chip, FormControlLabel, Grid, Switch, Tooltip, Typography } from "@mui/material";
import { useExplorerItems } from "../../Context/ExplorerItemsContext";
import { matchedPriceDomains } from "../../library/explorerItems";
import PinnedItemCard from "./PinnedItemCard";

/**
 * A tab's pinned items: charts made with Add Chart or pinned from auto charts. They stay as they
 * are across new searches and filter changes. Hidden until something is pinned.
 */
export default function PinnedSection() {
  const { pinnedItems, setAllCollapsed, matchScale, setMatchScale } = useExplorerItems();
  const headingId = useId();

  const lineChartCount = pinnedItems.filter(item => item.kind === "chart" && item.chartType === "line").length;
  // Matching takes at least two line charts; the stored setting waits until there are two again.
  const canMatchScale = lineChartCount >= 2;
  const priceDomains = useMemo(
    () => matchScale && canMatchScale ? matchedPriceDomains(pinnedItems) : undefined,
    [matchScale, canMatchScale, pinnedItems]);

  if (pinnedItems.length === 0) return null;

  const anyExpanded = pinnedItems.some(item => !item.collapsed);

  return (
    <Box component="section" aria-labelledby={headingId} sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: { xs: 1, md: 0 } }}>
        <Typography component="h2" variant="h6" id={headingId}>Pinned</Typography>
        <Chip size="small" label={pinnedItems.length} aria-label={`${pinnedItems.length} pinned items`} />
        {canMatchScale
          ? <Tooltip title="Give pinned line charts in the same unit one price axis">
            <FormControlLabel
              sx={{ ml: "auto", mr: 0 }}
              control={<Switch size="small" checked={matchScale} onChange={(e) => setMatchScale(e.target.checked)} />}
              label="Match scale"
            />
          </Tooltip>
          : null
        }
        <Button size="small" sx={{ ml: canMatchScale ? 0 : "auto" }} onClick={() => setAllCollapsed(anyExpanded)}>
          {anyExpanded ? "Collapse all" : "Expand all"}
        </Button>
      </Box>
      <Grid container spacing={2}>
        {pinnedItems.map((item, index) => (
          <PinnedItemCard key={item.id} item={item} index={index} count={pinnedItems.length} priceDomains={priceDomains} />
        ))}
      </Grid>
    </Box>
  );
}
