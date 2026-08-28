import { type ReactNode } from "react"
import { useGlobalModalContext, type GlobalModal } from "../../Context/GlobalModalContext"
import About from "../About/About"
import OnBoarding from "../OnBoarding/OnBoarding"
import { Modal, Box, } from "@mui/material"
import { MAX_GLOBAL_MODAL_HEIGHT, MAX_GLOBAL_MODAL_WIDTH } from "../../library/constants"
import TitleBar from "./TitleBar"


export default function GlobalModal() {

  const globalModalRegistry: Record<GlobalModal, ReactNode> = {
    about: <About />,
    onboarding: <OnBoarding />,
    settings: <>Settings</>,
    help: <OnBoarding />,
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
      >
        <Box
          sx={{
            maxWidth: MAX_GLOBAL_MODAL_WIDTH,
            maxHeight: MAX_GLOBAL_MODAL_HEIGHT,
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
          <Box
            sx={{
              overflow: "scroll"
            }}
          >
            {globalModalRegistry[globalModal]}
          </Box>
        </Box>
      </Modal>
    </>
  )
}
