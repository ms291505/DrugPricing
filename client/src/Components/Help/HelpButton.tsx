import { IconButton, Tooltip } from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { useGlobalModalContext } from "../../Context/globalModalContexts";
import { findHelpTopic, type HelpTopicId } from "../../library/help";
export default function HelpButton({ topic, tabIndex }: { topic: HelpTopicId, tabIndex?: number }) {
  const { openHelp } = useGlobalModalContext();
  const label = `Help: ${findHelpTopic(topic)?.title ?? topic}`;
  return <Tooltip title={label}><IconButton size="small" aria-label={label} tabIndex={tabIndex} onClick={event => { event.stopPropagation(); openHelp(topic); }} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") event.stopPropagation(); }}><HelpOutlineIcon fontSize="inherit" /></IconButton></Tooltip>;
}
