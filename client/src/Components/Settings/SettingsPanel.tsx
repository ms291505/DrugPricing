import { useId } from "react";
import { Box, FormControl, FormControlLabel, FormLabel, Radio, RadioGroup, Typography } from "@mui/material";
import { useSettings } from "../../Context/SettingsContext";
import type { BarStyle } from "../../library/settings";

const BAR_STYLES: Array<{ value: BarStyle, label: string, description: string }> = [
  {
    value: "dot",
    label: "Dot and range",
    description: "A dot at the price, on a line from the lowest to the highest price over the chart's dates.",
  },
  {
    value: "bar",
    label: "Bar and range",
    description: "A bar from $0 to the price, with a gray line under it from the lowest to the highest price.",
  },
];

/** App-wide settings: choices most people never change, kept out of Page Tools. */
export default function SettingsPanel() {
  const { settings, updateSettings } = useSettings();
  const headingId = useId();
  const barStyleId = useId();

  return (
    <Box component="section" aria-labelledby={headingId} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography component="h2" variant="h5" id={headingId}>Settings</Typography>
      <Typography variant="body2" color="text.secondary">Apply to every tab and are saved in this browser.</Typography>
      <FormControl>
        <FormLabel id={barStyleId}>Bar charts</FormLabel>
        <RadioGroup
          aria-labelledby={barStyleId}
          value={settings.barStyle}
          onChange={(e) => updateSettings({ barStyle: e.target.value as BarStyle })}
        >
          {BAR_STYLES.map(style => (
            <FormControlLabel
              key={style.value}
              value={style.value}
              control={<Radio size="small" />}
              sx={{ alignItems: "flex-start", mt: 1 }}
              label={
                <Box sx={{ pt: 0.75 }}>
                  <Typography variant="body2">{style.label}</Typography>
                  <Typography variant="caption" color="text.secondary">{style.description}</Typography>
                </Box>
              }
            />
          ))}
        </RadioGroup>
      </FormControl>
    </Box>
  );
}
