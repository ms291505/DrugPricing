import { useEffect, useState, type FocusEvent } from "react";
import { Box } from "@mui/material";
import { visuallyHidden } from "@mui/utils";
import { useActiveTooltipDataPoints, useIsTooltipActive } from "recharts";

/** Holding an arrow key announces only where it stops. */
const READOUT_DELAY_MS = 300;

/** Reports the active data row from inside the chart, where recharts' hooks work. */
function ActivePointReporter({ onChange }: { onChange: (point: unknown) => void }) {
  const point = useActiveTooltipDataPoints()?.[0];
  const active = useIsTooltipActive();
  useEffect(() => onChange(active ? point : undefined), [active, point, onChange]);
  return null;
}

/**
 * A screen-reader readout of a chart's active point, spoken only while the chart has keyboard
 * focus. Render `reporter` inside the recharts chart, spread `focusProps` on a box around it, and
 * render `liveRegion` next to it.
 *
 * @param keyOf - identifies a row of the chart's data (a line chart's date, a bar chart's NDC).
 *   Only the key is kept: the rows are rebuilt on every render, so keeping a row would loop.
 * @param describe - the announcement for the row with that key
 */
export default function useChartReadout<Row, Key extends string | number>(
  keyOf: (row: Row) => Key,
  describe: (key: Key) => string | null,
) {
  const [activeKey, setActiveKey] = useState<Key>();
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const text = keyboardFocus && activeKey !== undefined ? describe(activeKey) ?? "" : "";

  const [announcement, setAnnouncement] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setAnnouncement(text), text ? READOUT_DELAY_MS : 0);
    return () => clearTimeout(timer);
  }, [text]);

  return {
    reporter: <ActivePointReporter onChange={point => setActiveKey(point === undefined ? undefined : keyOf(point as Row))} />,
    focusProps: {
      // Mouse users focus the chart by clicking it; hover must not speak.
      onFocus: (event: FocusEvent) =>
        setKeyboardFocus(event.target instanceof SVGSVGElement && event.target.matches(":focus-visible")),
      onBlur: () => setKeyboardFocus(false),
    },
    // In the DOM, empty, from the first render: regions added along with their text often go unread.
    liveRegion: (
      <Box role="status" aria-live="polite" aria-atomic="true" sx={visuallyHidden}>
        {text ? announcement : ""}
      </Box>
    ),
  };
}
