import { Card, CardActionArea, CardContent, Typography, type SxProps, Box } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import type { ReactNode } from "react";
import type { TabType } from "../../library/tabType.ts";
import SearchTypeChip from "../ui/SearchTypeChip";

export type DescriptionCardProps = {
  tabType: TabType,
  onClick: () => void,
  header: string | ReactNode,
  body: string | ReactNode,
  isMobile?: boolean,
}

export default function DescriptionCard({ onClick, header, body, isMobile = false, tabType }: DescriptionCardProps) {
  const cardSx: SxProps = isMobile
    ? { flex: "0 0 80%", scrollSnapAlign: "center" }
    : { height: "100%", width: 320 }

  // Outlined, with a primary border on hover, and an arrow: the whole card is the choice's button.
  return (
    <Card variant="outlined" sx={{ ...cardSx, "@media (hover: hover)": { "&:hover": { borderColor: "primary.main" } } }}>
      <CardActionArea
        onClick={onClick}
        sx={{
          display: "flex", flexDirection: "column", height: "100%", alignItems: "stretch", justifyContent: "flex-start",
          // MUI marks keyboard focus here only with a 12% tint, which is hard to see on the dark
          // card (WCAG 2.4.7). Inset, since the card clips its overflow.
          "&.Mui-focusVisible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: -2 },
        }}
      >
        <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1, height: "100%" }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              color: "primary.main",
            }}
          >
            <SearchTypeChip tabType={tabType} />
            {/* Smaller on a phone, where the cards are narrow, so the names stay on one line. */}
            <Typography variant={isMobile ? "subtitle1" : "h6"} component="div" sx={{ flexGrow: 1, color: "text.primary", fontWeight: 500 }}>
              {header}
            </Typography>
            <ArrowForwardIcon />
          </Box>
          <Typography variant="body2" color="text.secondary">
            {body}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}
