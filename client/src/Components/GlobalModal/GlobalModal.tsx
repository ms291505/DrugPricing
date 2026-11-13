import { useLocation } from "react-router";
import HelpContent from "../Help/HelpContent";
import { useEffect, type ReactNode } from "react"
import { useGlobalModalContext, type GlobalModal } from "../../Context/globalModalContexts"
import About from "../About/About"
import OnBoarding from "../OnBoarding/OnBoarding"
import { Dialog, DialogContent, useMediaQuery, useTheme, } from "@mui/material"
import TitleBar from "./TitleBar"
import SettingsPanel from "../Settings/SettingsPanel"

export default function GlobalModal() {

  const { globalModal, setGlobalModal, helpTarget } = useGlobalModalContext();
  const location = useLocation();
  useEffect(() => { setGlobalModal(null); }, [location.key, setGlobalModal]);

  // The dialog's title names it, so the contents leave out their own page heading.
  const globalModalRegistry: Record<GlobalModal, { label: string, content: ReactNode }> = {
    about: { label: "About", content: <About showHeading={false} /> },
    onboarding: { label: "Welcome", content: <OnBoarding showHeading={false} /> },
    settings: { label: "Settings", content: <SettingsPanel /> },
    help: { label: "Help", content: <HelpContent initialTopic={helpTarget.topic} /> },
  }

  // Full screen on a phone, as settings sheets are there; a centered card from `sm` up.
  const fullScreen = useMediaQuery(useTheme().breakpoints.down("sm"));

  const handleClose = () => {
    setGlobalModal(null);
    if (globalModal === "help" && helpTarget.returnFocus) {
      const target = helpTarget.returnFocus;
      requestAnimationFrame(() => target.focus());
    }
  };

  if (!globalModal) return (null);
  return (
    <Dialog
      open
      disableRestoreFocus={globalModal === "help" && !!helpTarget.returnFocus}
      onClose={handleClose}
      fullScreen={fullScreen}
      // One width for every modal: 600px, comfortable for reading, and the full width below it.
      fullWidth
      maxWidth="sm"
    >
      {/* MUI names the dialog by its `DialogTitle` (aria-labelledby). */}
      <TitleBar title={globalModalRegistry[globalModal].label} onClose={handleClose} />
      {/* The modal owns the padding; its contents bring none of their own. */}
      <DialogContent dividers>
        {globalModalRegistry[globalModal].content}
      </DialogContent>
    </Dialog>
  )
}
