import { Card, CardActionArea, CardContent, Typography, type SxProps, Box, Divider } from "@mui/material";
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

  return (

    <Card sx={cardSx}>
      <CardActionArea
        onClick={onClick}
        sx={{ display: "flex", flexDirection: "column", height: "100%", alignItems: "start" }}
      >
        <CardContent sx={{ height: "100%" }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1
            }}
          >
            <SearchTypeChip tabType={tabType} />
            <Typography variant="h5" component="div">{header}</Typography>
          </Box>
          <Divider />
          <Typography variant="body2">
            {body}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}
