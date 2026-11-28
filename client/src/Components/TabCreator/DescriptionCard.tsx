import { Box, Card, CardActionArea, CardContent, Typography } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

type Props = {
  onClick: () => void,
  header: string,
  body: string,
};

export default function DescriptionCard({ onClick, header, body }: Props) {
  return (
    <Card variant="outlined">
      <CardActionArea onClick={onClick} sx={{
        display: "flex", height: "100%", alignItems: "stretch", justifyContent: "flex-start",
        "&.Mui-focusVisible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: -3 },
      }}>
        <CardContent sx={{ width: "100%" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 1 }}>
            <Typography variant="h6" component="span">{header}</Typography>
            <ArrowForwardIcon sx={{ color: "primary.main" }} />
          </Box>
          <Typography variant="body2" color="text.secondary">{body}</Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
