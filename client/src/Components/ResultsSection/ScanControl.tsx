import { useId, useState, type FormEvent, type MouseEvent } from "react";
import { Button, Popover, Stack, TextField, Tooltip, Typography } from "@mui/material";
import TroubleshootIcon from "@mui/icons-material/Troubleshoot";
import { PRICE_CHANGE_SCAN_DEFAULT_PERCENT, PRICE_CHANGE_SCAN_MIN_PERCENT } from "../../library/constants";
import { parseScanThreshold } from "../../library/priceActivity";
import { priceChangeListTitle } from "../../library/chartTitles";
import type { PriceChangeScan, ScanReport } from "../../hooks/usePriceChangeScans";
import { fromKeyboard, nearestVisible } from "../ui/focus";

type Props = {
  /** Scans the page's package prices at a percent (`usePriceChangeScans`). */
  onScan: (thresholdPercent: number) => void,
  /** What the last scan found, shown in the status line beside Scan; null before any scan. */
  report: ScanReport | null,
  /** The scan cards still open, to offer Show for the last one. */
  scans: PriceChangeScan[],
  /** The toolbar's narrow tier: Scan shows only its icon, and targets are 44px. */
  compact: boolean,
};

const SCAN_PRESETS = [PRICE_CHANGE_SCAN_MIN_PERCENT, PRICE_CHANGE_SCAN_DEFAULT_PERCENT, 20];

/**
 * Scan price changes and its popover. A scan's card neither scrolls into view nor takes focus:
 * MUI gives focus back to Scan price changes, and the status line beside it says what the scan
 * found, with Show to go to the card.
 */
export default function ScanControl({ onScan, report, scans, compact }: Props) {
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const [lastPercent, setLastPercent] = useState(PRICE_CHANGE_SCAN_DEFAULT_PERCENT);
  const [text, setText] = useState(String(lastPercent));
  const [error, setError] = useState<string | null>(null);
  const dialogId = useId();
  const shownScan = report?.scanId ? scans.find(scan => scan.id === report.scanId) : undefined;
  const shownTitle = shownScan ? priceChangeListTitle(shownScan.thresholdPercent) : "";

  // Show goes somewhere: it scrolls to the card for everyone and focuses its heading only from
  // the keyboard, so a tap leaves no ring.
  const show = (event: MouseEvent<HTMLElement>) => {
    const card = nearestVisible(event.currentTarget, `[data-price-change-list="${report?.scanId}"]`);
    if (!card) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // The card's top, not its center: a long list is taller than the window, and centering it
    // would leave its heading above the top. `scroll-padding-top` keeps it clear of the app bar.
    card.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
    if (fromKeyboard(event)) card.querySelector<HTMLElement>("[data-card-heading]")?.focus({ preventScroll: true });
  };

  const updateText = (value: string) => {
    setText(value);
    setError(null);
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = parseScanThreshold(text);
    if ("error" in parsed) return setError(parsed.error);
    setLastPercent(parsed.percent);
    setAnchor(null);
    onScan(parsed.percent);
  };

  return (
    <>
      {/* Narrow: the icon alone, so the label, Line / Bar and Scan fit one row on a phone. */}
      <Tooltip title={compact ? "Scan price changes" : ""}>
        <Button size="small" variant="outlined" startIcon={compact ? undefined : <TroubleshootIcon />}
          aria-label={compact ? "Scan price changes" : undefined}
          aria-haspopup="dialog" aria-expanded={Boolean(anchor)} aria-controls={anchor ? dialogId : undefined}
          onClick={event => { updateText(String(lastPercent)); setAnchor(event.currentTarget); }}
          sx={compact ? { minWidth: 44, minHeight: 44, px: 0 } : undefined}>
          {compact ? <TroubleshootIcon fontSize="small" /> : "Scan price changes"}
        </Button>
      </Tooltip>
      {anchor && <Popover open anchorEl={anchor} onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{
          paper: { id: dialogId, role: "dialog", "aria-modal": true, "aria-label": "Scan price changes", sx: { p: 2, width: 280 } },
        }}>
        <Stack component="form" noValidate onSubmit={submit} spacing={1.5}>
          <TextField size="small" label="Minimum change (%)" type="number" value={text}
            error={error !== null} helperText={error}
            onChange={event => updateText(event.target.value)}
            slotProps={{ htmlInput: { min: PRICE_CHANGE_SCAN_MIN_PERCENT, step: 0.1, inputMode: "decimal" } }} />
          <Stack direction="row" spacing={1} role="group" aria-label="Recommended thresholds">
            {SCAN_PRESETS.map(percent => {
              const selected = text !== "" && Number(text) === percent;
              return (
                <Button key={percent} type="button" size="small" variant={selected ? "contained" : "outlined"}
                  aria-pressed={selected} onClick={() => updateText(String(percent))}>
                  {percent}%
                </Button>
              );
            })}
          </Stack>
          <Button type="submit" size="small" variant="contained" sx={{ alignSelf: "flex-end" }}>Scan</Button>
        </Stack>
      </Popover>}
      <Typography role="status" variant="body2" color="text.secondary">{report?.message}</Typography>
      {shownScan && <Button size="small" aria-label={`Show ${shownTitle}`} onClick={show}
        sx={compact ? { minHeight: 44 } : undefined}>Show</Button>}
    </>
  );
}
