import { Box, Typography, type SxProps, } from "@mui/material";
import { useWorkspaceActions } from "../../Context/workspaceContexts";
import { useTabInstanceContext } from "../../Context/TabInstanceContext";
import useMobile from "../../hooks/useMobile";
import type { DescriptionCardProps } from "../TabCreator/DescriptionCard";
import DescriptionCard from "../TabCreator/DescriptionCard";

export default function TabCreator() {

  const question = "Choose a search for this tab";

  const { changeTabType } = useWorkspaceActions();

  const { id } = useTabInstanceContext();

  const isMobile = useMobile();

  const searchCards: Array<DescriptionCardProps> = [
    {
      tabType: "fda",
      onClick: () => changeTabType(id, "fda"),
      // Named as the tab, Help and About name it, and described without the acronyms.
      header: "FDA search",
      body: "Find drugs on the market by brand or generic name, and compare their products, packages, and prices.",
      isMobile: isMobile,
    },
    {
      tabType: "nadac",
      onClick: () => changeTabType(id, "nadac"),
      header: "NADAC search",
      body: "Look up price histories back to 2022 by drug description or NDC, including packages the FDA no longer lists.",
      isMobile: isMobile,
    }
  ]

  const boxSx: SxProps =
    isMobile
      ? {

        display: "flex",
        gap: 2,
        width: "100%",
        overflowX: "auto",
        scrollSnapType: "x mandatory",
        WebkitOverflowScrolling: "touch",
        px: "10%", // creates the "peek" of adjacent cards at rest
        py: 1,
        // hide scrollbar (still scrollable)
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": { display: "none" },
      }
      : {
        display: "flex",
        gap: 2
      }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        alignItems: "center",
        minWidth: 0,
        width: "100%",
        mt: "10%",
      }}
    >
      <Typography
        variant="h5"
        component="h2"
      >
        {question}
      </Typography>
      <Box
        sx={boxSx}
      >
        {searchCards.map(card => (
          <DescriptionCard
            key={card.tabType}
            {...card}
          />
        ))}
      </Box>
    </Box>
  )
}
