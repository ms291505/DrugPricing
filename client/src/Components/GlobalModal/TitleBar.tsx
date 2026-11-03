import CloseIcon from '@mui/icons-material/Close';
import { DialogTitle, IconButton } from "@mui/material"

type Props = {
  title: string,
  onClose: () => void,
}

/**
 * The dialog's header: its title, and the close button at the end of the same row. The button
 * sits beside the title rather than in it, so the dialog's name (its title) doesn't end in
 * "Close".
 */
export default function TitleBar({ title, onClose }: Props) {
  return (
    <>
      <DialogTitle sx={{ pr: 7 }}>{title}</DialogTitle>
      <IconButton aria-label="Close" onClick={onClose} sx={{ position: "absolute", top: 12, right: 12 }}>
        <CloseIcon />
      </IconButton>
    </>
  )
}
