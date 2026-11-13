import useAppInit, { useLastAsOfDate } from "../../hooks/useAppInit";
import type { ChartDates } from "../../library/dates";
import ChartDatesControl from "../ExplorerGrid/ChartDatesControl";

/** Long enough to type a year's four digits; short enough to feel like it applied by itself. */
const TYPED_DELAY_MS = 600;

type Props = {
  /** The search's dates, which apply at once. */
  value: ChartDates,
  onChange: (value: ChartDates) => void,
};

/**
 * A search panel's dates: the window of everything on the page, named for the prices because the
 * FDA page's products have dates of their own. Presets count back from the last loaded as-of date
 * (today until app-init answers, as `resolveSearchDates` does), and the inputs are limited to the
 * loaded dates.
 */
export default function DatesField({ value, onChange }: Props) {
  const { data: appInit } = useAppInit();
  const { forDisplay: lastAsOfDate } = useLastAsOfDate();
  const loadedDates = appInit ? { first: appInit.nadacDates.first, last: appInit.nadacDates.last } : null;
  return (
    <ChartDatesControl
      label="NADAC price dates"
      value={value}
      onChange={onChange}
      // Only `last` matters for the presets.
      bounds={loadedDates ?? { first: lastAsOfDate, last: lastAsOfDate }}
      inputBounds={loadedDates}
      customPreset
      // Each change may fetch.
      typedDelayMs={TYPED_DELAY_MS}
    />
  );
}
