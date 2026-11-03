import CloseIcon from '@mui/icons-material/Close';
import { Box, DialogTitle, IconButton } from "@mui/material"

type Props = {
  /** Names the dialog (`aria-labelledby`). */
  id: string,
  title: string,
  onClose: () => void,
}

/** The dialog's header: its title, and the close button at the end of the same row. */
export default function TitleBar({ id, title, onClose }: Props) {
  return (
    <DialogTitle id={id} sx={{ display: "flex", alignItems: "center", gap: 1, pr: 1.5 }}>
      <Box component="span" sx={{ flex: 1 }}>{title}</Box>
      <IconButton aria-label="Close" onClick={onClose}>
        <CloseIcon />
      </IconButton>
    </DialogTitle>
  )
}
