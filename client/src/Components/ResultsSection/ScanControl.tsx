import { useId, useState, type FormEvent } from "react";
import { Box, Button, Popover, Stack, TextField, Typography } from "@mui/material";
import TroubleshootIcon from "@mui/icons-material/Troubleshoot";
import { PRICE_CHANGE_SCAN_DEFAULT_PERCENT, PRICE_CHANGE_SCAN_MIN_PERCENT } from "../../library/constants";
import { parseScanThreshold } from "../../library/priceActivity";

type Props = {
  /** Scans the page's package prices at a percent (`usePriceChangeScans`). */
  onScan: (thresholdPercent: number) => void,
  /** The results' narrow tier: a "Price changes" caption above a short "Scan", 44px tall. */
  compact: boolean,
};

const SCAN_PRESETS = [PRICE_CHANGE_SCAN_MIN_PERCENT, PRICE_CHANGE_SCAN_DEFAULT_PERCENT, 20];

/**
 * Scan price changes and its popover. A scan's card neither scrolls into view nor takes focus:
 * MUI gives focus back to Scan price changes, and the status line under the heading row
 * (`ScanReport`) says what the scan found, with Show to go to the card.
 */
export default function ScanControl({ onScan, compact }: Props) {
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const [lastPercent, setLastPercent] = useState(PRICE_CHANGE_SCAN_DEFAULT_PERCENT);
  const [text, setText] = useState(String(lastPercent));
  const [error, setError] = useState<string | null>(null);
  const dialogId = useId();

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
      {/* Narrow: "Price changes" is a caption above a short "Scan", like Line and Bar's label, so
          they fit one line on a phone. The button stretches to the caption's width, so the two
          read as one block. The button's name stays the whole phrase. */}
      <Box sx={compact ? { display: "flex", flexDirection: "column", alignItems: "stretch", gap: 0.25 } : { display: "contents" }}>
        {compact && <Typography variant="caption" color="text.secondary" aria-hidden>Price changes</Typography>}
        <Button size="small" variant="outlined" startIcon={<TroubleshootIcon />}
          aria-label={compact ? "Scan price changes" : undefined}
          aria-haspopup="dialog" aria-expanded={Boolean(anchor)} aria-controls={anchor ? dialogId : undefined}
          onClick={event => { updateText(String(lastPercent)); setAnchor(event.currentTarget); }}
          sx={compact ? { minHeight: 44 } : undefined}>
          {compact ? "Scan" : "Scan price changes"}
        </Button>
      </Box>
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
    </>
  );
}
