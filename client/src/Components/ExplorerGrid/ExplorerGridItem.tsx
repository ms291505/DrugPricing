import { useState, type ReactNode } from "react";
import { Box, Paper, Typography, Collapse, IconButton } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

type Props = {
  title: string,
  children: ReactNode,
}

export default function ExplorerGridItem({ children, title }: Props) {
  const [collapse, setCollapse] = useState(false);
  const handleCollapse = () => setCollapse(prev => !prev);
  return (
    <>
      <Paper
        sx={{
          p: 2,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}>
        <Paper sx={{ p: 1, display: "flex", flexDirection: "column", alignItems: "center" }} elevation={3} component="div">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
            <Typography variant="h6" sx={{
              position: "relative",
              left: "50%",
              transform: "translate(-50%)",
            }}>
              {title}
            </Typography>
            <IconButton
              sx={{ marginLeft: "auto" }}
              onClick={handleCollapse}
              size="small"
            >
              <KeyboardArrowDownIcon
                fontSize="small"
                sx={{
                  transform: !collapse ? "rotate(180deg)" : "rotate(0deg)",
                  transition: (theme) =>
                    theme.transitions.create("transform", {
                      duration: theme.transitions.duration.shortest,
                    }),
                }}
              />
            </IconButton>
          </Box>
        </Paper>
        <Collapse
          in={!collapse}
          timeout="auto"
          unmountOnExit
        >
          {children}
        </Collapse>
      </Paper>
    </>
  )
}
