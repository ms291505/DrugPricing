import { useId } from "react";
import { Box, Button, Chip, Popover, Tooltip } from "@mui/material";
import EditCalendarIcon from "@mui/icons-material/EditCalendar";
import { useExplorerItems } from "../../Context/ExplorerItemsContext";
import { chartDataBounds, type ChartItem } from "../../library/explorerItems";
import { formatWindow, resolveChartDates, windowAround } from "../../library/dates";
import { PRICE_CHANGE_WINDOW_MONTHS } from "../../library/constants";
import ChartDatesControl from "./ChartDatesControl";

type Props = {
  item: ChartItem,
  title: string,
  /** Where the date picker is open, or null when closed. The card's menu can open it too. */
  anchor: HTMLElement | null,
  onOpen: (anchor: HTMLElement) => void,
  onClose: () => void,
}

/**
 * A pinned chart's dates: a chip showing them that opens a date picker. A pinned chart's data
 * never changes, so presets are stored as the fixed dates they mean for it.
 */
export default function PinnedChartDates({ item, title, anchor, onOpen, onClose }: Props) {
  const { updateItem } = useExplorerItems();
  const dialogId = useId();
  const open = anchor !== null;

  const dataBounds = chartDataBounds(item);
  const label = formatWindow(item.dateWindow, dataBounds);
  const focusPreset = item.changeSpan
    ? { label: "Around change", dateWindow: windowAround(item.changeSpan.start, item.changeSpan.end, PRICE_CHANGE_WINDOW_MONTHS) }
    : undefined;

  return (
    <>
      {label
        ? <Tooltip title="Change dates">
          <Chip
            size="small"
            variant="outlined"
            icon={<EditCalendarIcon />}
            label={label}
            onClick={(e) => onOpen(e.currentTarget)}
            aria-haspopup="dialog"
            aria-controls={open ? dialogId : undefined}
            aria-expanded={open}
          />
        </Tooltip>
        : null
      }
      <Popover
        open={open}
        anchorEl={anchor}
        onClose={onClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{ paper: { id: dialogId, role: "dialog", "aria-label": `Dates for ${title}`, sx: { p: 2, maxWidth: 360 } } }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <ChartDatesControl
            value={{ kind: "window", dateWindow: item.dateWindow }}
            onChange={(chartDates) => updateItem(item.id, prev => ({
              ...prev, dateWindow: resolveChartDates(chartDates, dataBounds),
            }))}
            bounds={dataBounds}
            focusPreset={focusPreset}
          />
          <Button size="small" sx={{ alignSelf: "flex-end" }} onClick={onClose}>Done</Button>
        </Box>
      </Popover>
    </>
  );
}
