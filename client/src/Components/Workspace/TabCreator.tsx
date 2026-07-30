import { Box, Button, Typography } from "@mui/material";
import { useWorkspaceContext } from "../../Context/WorkspaceContext";
import { useTabInstanceContext } from "../../Context/TabInstanceContext";

export default function TabCreator() {

  const question = "What type of search would you like to perform?";

  const { changeTabType } = useWorkspaceContext();
  const { id } = useTabInstanceContext();

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1,
        alignItems: "center",
        minWidth: 0,
        width: "100%",
        pt: "10%",
      }}
    >
      <Typography
        variant="h6"
      >
        {question}
      </Typography>
      <Box
        sx={{
          display: "flex",
          gap: 1,
        }}>
        <Button variant="contained" onClick={() => changeTabType(id, "fda")}>FDA</Button>
        <Button variant="contained" onClick={() => changeTabType(id, "nadac")}>NADAC</Button>
      </Box>
    </Box>
  )
}
