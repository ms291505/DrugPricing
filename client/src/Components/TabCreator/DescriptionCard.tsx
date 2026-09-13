import { Card, CardActionArea, CardContent, Typography, type SxProps, } from "@mui/material";

export type DescriptionCardProps = {
  onClick: () => void,
  header: string,
  body: string,
  isMobile?: boolean,
}

export default function DescriptionCard({ onClick, header, body, isMobile = false }: DescriptionCardProps) {
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
          <Typography variant="h5" component="div">{header}</Typography>
          <Typography variant="body2">
            {body}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}
