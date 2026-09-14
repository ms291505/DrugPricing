import { Box, Typography, type SxProps, } from "@mui/material";
import { useWorkspaceContext } from "../../Context/WorkspaceContext";
import { useTabInstanceContext } from "../../Context/TabInstanceContext";
import useMobile from "../../hooks/useMobile";
import type { DescriptionCardProps } from "../TabCreator/DescriptionCard";
import DescriptionCard from "../TabCreator/DescriptionCard";

export default function TabCreator() {

  const question = "What type of search would you like to perform?";

  const { changeTabType } = useWorkspaceContext();

  const { id } = useTabInstanceContext();

  const isMobile = useMobile();

  const cards: Array<DescriptionCardProps> = [
    {
      searchType: "fda",
      onClick: () => changeTabType(id, "fda"),
      header: "FDA + NADAC",
      body: "The FDA's database of drug products currently on the market, including National Average Drug Aquisition Cost data when available.",
      isMobile: isMobile,
    },
    {
      searchType: "nadac",
      onClick: () => changeTabType(id, "nadac"),
      header: "NADAC Only",
      body: "National Average Drug Aquisition Cost data going back to 2022.",
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
        gap: 1
      }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1,
        alignItems: "center",
        minWidth: 0,
        width: "100%",
        mt: "10%",
      }}
    >
      <Typography
        variant="h6"
      >
        {question}
      </Typography>
      <Box
        sx={boxSx}
      >
        {cards.map(card => (
          <DescriptionCard
            key={card.searchType}
            {...card}
          />
        ))}
      </Box>
    </Box>
  )
}
