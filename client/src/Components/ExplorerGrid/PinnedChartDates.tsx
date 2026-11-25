import { useId } from "react";
import { Box, Button, Chip, Popover, Tooltip, useMediaQuery, useTheme } from "@mui/material";
import EditCalendarIcon from "@mui/icons-material/EditCalendar";
import { usePinActions } from "../../Context/pinnedItemsContexts";
import { chartDataBounds, type ChartItem } from "../../library/explorerItems";
import { formatWindow, resolveChartDates } from "../../library/dates";
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
  const { updateItem } = usePinActions();
  const dialogId = useId();
  const open = anchor !== null;
  // A popover floats over the page, so the window's width decides, as for the app's dialogs: on a
  // phone it spans the screen and its presets fill the row as touch-sized buttons.
  const fill = useMediaQuery(useTheme().breakpoints.down("sm"));

  const dataBounds = chartDataBounds(item);
  const label = formatWindow(item.dateWindow, dataBounds);


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
        slotProps={{ paper: { id: dialogId, role: "dialog", "aria-label": `Dates for ${title}`, sx: { p: 2, maxWidth: 360, ...(fill && { width: "calc(100vw - 32px)" }) } } }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <ChartDatesControl
            value={{ kind: "window", dateWindow: item.dateWindow }}
            onChange={(chartDates) => updateItem(item.id, prev => ({
              ...prev, dateWindow: resolveChartDates(chartDates, dataBounds),
            }))}
            bounds={dataBounds}
            fill={fill}
          />
          <Button size="small" sx={{ alignSelf: "flex-end", ...(fill && { minHeight: 44, px: 2 }) }} onClick={onClose}>Done</Button>
        </Box>
      </Popover>
    </>
  );
}
