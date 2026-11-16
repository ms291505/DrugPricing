import { useId, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { formatPrice } from "../../library/chartScale";
import { pricingUnitLabel } from "../../library/prices";
import { eventLabel, priceEventGroupLabel, PRICE_CHANGE_GROUP_LIMIT, type PriceEventGroup } from "../../library/priceActivity";

type Props = {
  groups: PriceEventGroup[],
  onFocus: (group: PriceEventGroup, trigger: HTMLButtonElement) => void,
  onSelect?: (group: PriceEventGroup) => void,
  productLevel?: boolean,
};

/** Events retain exact per-package values, even when the summary combines a date/unit/direction. */
export default function PriceEventsList({ groups, onFocus, onSelect, productLevel }: Props) {
  const [showAll, setShowAll] = useState(false);
  const listId = useId();
  return <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
    <Box id={listId} sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {(showAll ? groups : groups.slice(0, PRICE_CHANGE_GROUP_LIMIT)).map(group => {
        return <Box key={group.key} sx={{ borderTop: 1, borderColor: "divider", pt: 1 }}>
          <Typography variant="body2">
            {priceEventGroupLabel(group)}
          </Typography>
          <Box component="details" sx={{ fontSize: "0.875rem", color: "text.secondary" }}>
            <summary>Package details</summary>
            {group.events.map(event => <Typography key={`${event.seriesNdc}:${event.packageNdc}`} variant="body2" sx={{ overflowWrap: "anywhere" }}>
              {event.packageNdc}: {formatPrice(event.change.oldPrice)} → {formatPrice(event.change.newPrice)}/{pricingUnitLabel(event.pricingUnit)} · {eventLabel(event.change)}
            </Typography>)}
          </Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {onSelect && <Button size="small" onClick={() => onSelect(group)}>{productLevel ? "Show affected packages" : "Select affected rows"}</Button>}
            <Button size="small" onClick={event => onFocus(group, event.currentTarget)}>Around this change</Button>
          </Box>
        </Box>;
      })}
    </Box>
    {groups.length > PRICE_CHANGE_GROUP_LIMIT && <Button size="small" sx={{ alignSelf: "flex-start" }}
      aria-expanded={showAll} aria-controls={listId} onClick={() => setShowAll(value => !value)}>
      {showAll ? "Show fewer" : `Show all ${groups.length} events`}
    </Button>}
  </Box>;
}
