import { IconButton, Tooltip } from "@mui/material";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import toast from "react-hot-toast";

type Props = {
  /** The chart's title: names the button and the confirmation toast. */
  title: string,
  tooltip: string,
  onPin: () => void,
}

/** The pin button on auto charts (`PinButton`) and on added charts (`ItemCard`). */
export default function PinIconButton({ title, tooltip, onPin }: Props) {
  const handlePin = () => {
    onPin();
    toast.success(`Pinned "${title}"`);
  };

  return (
    <Tooltip title={tooltip}>
      <IconButton size="small" onClick={handlePin} aria-label={`Pin ${title}`}>
        <PushPinOutlinedIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}
