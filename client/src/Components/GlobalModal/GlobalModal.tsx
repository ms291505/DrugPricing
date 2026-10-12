import { type ReactNode } from "react"
import { useGlobalModalContext, type GlobalModal } from "../../Context/GlobalModalContext"
import About from "../About/About"
import OnBoarding from "../OnBoarding/OnBoarding"
import { Modal, Box, } from "@mui/material"
import { MAX_GLOBAL_MODAL_HEIGHT, MAX_GLOBAL_MODAL_WIDTH } from "../../library/constants"
import TitleBar from "./TitleBar"
import SettingsPanel from "../Settings/SettingsPanel"


export default function GlobalModal() {

  const globalModalRegistry: Record<GlobalModal, { label: string, content: ReactNode }> = {
    about: { label: "About", content: <About /> },
    onboarding: { label: "Welcome", content: <OnBoarding /> },
    settings: { label: "Settings", content: <SettingsPanel /> },
    help: { label: "Help", content: <OnBoarding /> },
  }

  const { globalModal, setGlobalModal } = useGlobalModalContext();

  const handleClose = () => setGlobalModal(null);

  const open = globalModal ? true : false;

  if (!globalModal) return (null);
  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
        aria-label={globalModalRegistry[globalModal].label}
      >
        <Box
          sx={{
            // One width for every modal, whatever it shows, with 16px of screen at each edge
            // on a phone. Without a width, `left: 50%` let the content size it, up to half the screen.
            width: `min(${MAX_GLOBAL_MODAL_WIDTH}px, calc(100vw - 32px))`,
            maxHeight: `min(${MAX_GLOBAL_MODAL_HEIGHT}px, calc(100dvh - 32px))`,
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: 'background.paper',
            border: '2px solid #000',
            boxShadow: 24,
            display: "flex",
            flexDirection: "column"
          }}
        >
          <TitleBar />
          {/* The modal owns the padding; its contents bring none of their own. */}
          <Box sx={{ overflowY: "auto", overflowX: "hidden", p: { xs: 2, md: 3 }, minHeight: 0 }}>
            {globalModalRegistry[globalModal].content}
          </Box>
        </Box>
      </Modal>
    </>
  )
}
