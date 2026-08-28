import CancelIcon from '@mui/icons-material/Cancel';
import { Box, IconButton, Paper, } from "@mui/material"
import { useGlobalModalContext, } from "../../Context/GlobalModalContext"

export default function TitleBar() {

  const { setGlobalModal } = useGlobalModalContext();

  return (
    <Paper>
      <Box
        sx={{
          display: "flex",
          justifyContent: "end"
        }}
      >
        <IconButton size="small" onClick={() => setGlobalModal(null)}>
          <CancelIcon fontSize="small" />
        </IconButton>
      </Box>
    </Paper>
  )
}
