import useAppInit, { useLastAsOfDate } from "../../hooks/useAppInit";
import type { ChartDates } from "../../library/dates";
import ChartDatesControl from "../ExplorerGrid/ChartDatesControl";

type Props = {
  /** The form's dates, which Search applies. */
  value: ChartDates,
  onChange: (value: ChartDates) => void,
};

/**
 * A search panel's Dates: which prices load. Presets count back from the last loaded as-of date
 * (today until app-init answers, as `resolveSearchDates` does), and the inputs are limited to the
 * loaded dates.
 */
export default function DatesField({ value, onChange }: Props) {
  const { data: appInit } = useAppInit();
  const { forDisplay: lastAsOfDate } = useLastAsOfDate();
  const loadedDates = appInit ? { first: appInit.nadacDates.first, last: appInit.nadacDates.last } : null;
  return (
    <ChartDatesControl
      label="Dates"
      caption="Applies on Search"
      value={value}
      onChange={onChange}
      // Only `last` matters for the presets.
      bounds={loadedDates ?? { first: lastAsOfDate, last: lastAsOfDate }}
      inputBounds={loadedDates}
      customPreset
    />
  );
}
