import { useId, type ReactNode } from "react"
import { useGlobalModalContext, type GlobalModal } from "../../Context/GlobalModalContext"
import About from "../About/About"
import OnBoarding from "../OnBoarding/OnBoarding"
import { Dialog, DialogContent, useMediaQuery, useTheme, } from "@mui/material"
import TitleBar from "./TitleBar"
import SettingsPanel from "../Settings/SettingsPanel"

export default function GlobalModal() {

  // The dialog's title names it, so the contents leave out their own page heading.
  const globalModalRegistry: Record<GlobalModal, { label: string, content: ReactNode }> = {
    about: { label: "About", content: <About showHeading={false} /> },
    onboarding: { label: "Welcome", content: <OnBoarding showHeading={false} /> },
    settings: { label: "Settings", content: <SettingsPanel /> },
    help: { label: "Help", content: <OnBoarding showHeading={false} /> },
  }

  const { globalModal, setGlobalModal } = useGlobalModalContext();
  const titleId = useId();
  // Full screen on a phone, as settings sheets are there; a centered card from `sm` up.
  const fullScreen = useMediaQuery(useTheme().breakpoints.down("sm"));

  const handleClose = () => setGlobalModal(null);

  if (!globalModal) return (null);
  return (
    <Dialog
      open
      onClose={handleClose}
      fullScreen={fullScreen}
      // One width for every modal: 600px, comfortable for reading, and the full width below it.
      fullWidth
      maxWidth="sm"
      aria-labelledby={titleId}
    >
      <TitleBar id={titleId} title={globalModalRegistry[globalModal].label} onClose={handleClose} />
      {/* The modal owns the padding; its contents bring none of their own. */}
      <DialogContent dividers>
        {globalModalRegistry[globalModal].content}
      </DialogContent>
    </Dialog>
  )
}
