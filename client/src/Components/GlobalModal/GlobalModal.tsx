import { NavigationType, useLocation, useNavigationType } from "react-router";
import HelpContent from "../Help/HelpContent";
import { useEffect, type ReactNode } from "react"
import { useGlobalModal, useGlobalModalActions, type GlobalModal } from "../../Context/globalModalContexts"
import About from "../About/About"
import OnBoarding from "../OnBoarding/OnBoarding"
import { Dialog, DialogContent, useMediaQuery, useTheme, } from "@mui/material"
import TitleBar from "./TitleBar"
import SettingsPanel from "../Settings/SettingsPanel"

export default function GlobalModal() {

  const open = useGlobalModal();
  const { closeModal } = useGlobalModalActions();

  // Browser Back and Forward close a modal, so it can't linger over the page they lead to. Only
  // those: a modal that navigates (Help's About link) closes itself, and nothing else does.
  const { key } = useLocation();
  const navigationType = useNavigationType();
  useEffect(() => { if (navigationType === NavigationType.Pop) closeModal(); }, [key, navigationType, closeModal]);

  // The dialog's title names it, so the contents leave out their own page heading.
  const globalModalRegistry: Record<GlobalModal, { label: string, content: ReactNode }> = {
    about: { label: "About", content: <About showHeading={false} /> },
    onboarding: { label: "Welcome", content: <OnBoarding showHeading={false} /> },
    settings: { label: "Settings", content: <SettingsPanel /> },
    help: { label: "Help", content: <HelpContent initialTopic={open?.helpTopic} /> },
  }

  // Full screen on a phone, as settings sheets are there; a centered card from `sm` up.
  const fullScreen = useMediaQuery(useTheme().breakpoints.down("sm"));

  if (!open) return (null);
  const { modal, returnFocus } = open;

  const handleClose = () => {
    closeModal();
    // After the dialog's focus trap lets go.
    if (returnFocus) requestAnimationFrame(() => returnFocus.focus());
  };

  return (
    <Dialog
      open
      disableRestoreFocus={!!returnFocus}
      onClose={handleClose}
      fullScreen={fullScreen}
      // One width for every modal: 600px, comfortable for reading, and the full width below it.
      fullWidth
      maxWidth="sm"
    >
      {/* MUI names the dialog by its `DialogTitle` (aria-labelledby). */}
      <TitleBar title={globalModalRegistry[modal].label} onClose={handleClose} />
      {/* The modal owns the padding; its contents bring none of their own. */}
      <DialogContent dividers>
        {globalModalRegistry[modal].content}
      </DialogContent>
    </Dialog>
  )
}
