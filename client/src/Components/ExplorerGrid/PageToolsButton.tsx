import { IconButton, Tooltip } from "@mui/material";
import TuneIcon from "@mui/icons-material/Tune";

type Props = {
  onClick: () => void,
}

export default function PageToolsButton({ onClick }: Props) {

  return (<>
    <Tooltip title="Page Tools">
      <IconButton size="small" onClick={onClick} aria-label="Page Tools">
        <TuneIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  </>)
}
