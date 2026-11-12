import { useCallback, useEffect, useRef, useState, type FocusEvent } from "react";
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
 * A screen-reader readout of a chart's active point, spoken only when the keys moved it, not the
 * pointer. Render `reporter` inside the recharts chart, spread `focusProps` on a box around it, and
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
  const [keyboardDriven, setKeyboardDriven] = useState(false);
  const text = keyboardDriven && activeKey !== undefined ? describe(activeKey) ?? "" : "";

  // The pointer moves the active point on every date it crosses. Only the keys' moves are spoken,
  // so the point is kept in refs and copied to state only while the keys drive it: hovering never
  // re-renders the chart.
  const latestKey = useRef<Key>(undefined);
  const keysDrive = useRef(false);
  const keyOfRef = useRef(keyOf);
  useEffect(() => { keyOfRef.current = keyOf; });
  const drive = useCallback((byKeys: boolean) => {
    if (keysDrive.current === byKeys) return;
    keysDrive.current = byKeys;
    setKeyboardDriven(byKeys);
    if (byKeys) setActiveKey(latestKey.current);
  }, []);
  const onChange = useCallback((point: unknown) => {
    latestKey.current = point === undefined ? undefined : keyOfRef.current(point as Row);
    if (keysDrive.current) setActiveKey(latestKey.current);
  }, []);

  const [announcement, setAnnouncement] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setAnnouncement(text), text ? READOUT_DELAY_MS : 0);
    return () => clearTimeout(timer);
  }, [text]);

  return {
    reporter: <ActivePointReporter onChange={onChange} />,
    focusProps: {
      // The last input decides: a click then arrow keys speaks, and hover never does.
      onFocus: (event: FocusEvent) =>
        drive(event.target instanceof SVGSVGElement && event.target.matches(":focus-visible")),
      onKeyDown: () => drive(true),
      onPointerMove: () => drive(false),
      onBlur: () => drive(false),
    },
    // In the DOM, empty, from the first render: regions added along with their text often go unread.
    liveRegion: (
      <Box role="status" aria-live="polite" aria-atomic="true" sx={visuallyHidden}>
        {text ? announcement : ""}
      </Box>
    ),
  };
}
