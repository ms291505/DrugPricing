import type { MouseEvent } from "react";
import { Box, Typography, type SxProps, } from "@mui/material";
import { useWorkspaceActions } from "../../Context/workspaceContexts";
import { useTabInstanceContext } from "../../Context/TabInstanceContext";
import useMobile from "../../hooks/useMobile";
import type { DescriptionCardProps } from "../TabCreator/DescriptionCard";
import DescriptionCard from "../TabCreator/DescriptionCard";
import { fromKeyboard } from "../ui/focus";
import type { TabType } from "../../library/tabType";

export default function TabCreator() {

  const question = "Choose a search for this tab";

  const { changeTabType } = useWorkspaceActions();

  const { id } = useTabInstanceContext();

  const isMobile = useMobile();

  // The chosen search replaces this page, card and all, so keyboard focus would fall to <body>
  // and the next Tab would start over at the app bar (WCAG 2.4.3). From the keyboard, focus goes
  // to the new search's first field, where its next step starts. Not after a tap, where focusing
  // a text field opens the phone keyboard.
  const choose = (tabType: TabType, event: MouseEvent<HTMLElement>) => {
    // The tab's pane outlives this page; its new search renders into it.
    const pane = fromKeyboard(event) ? event.currentTarget.closest("[data-tab-creator]")?.parentElement : null;
    changeTabType(id, tabType);
    if (pane) requestAnimationFrame(() => pane.querySelector<HTMLElement>("[data-first-term]")?.focus());
  };

  const searchCards: Array<DescriptionCardProps> = [
    {
      tabType: "fda",
      onClick: event => choose("fda", event),
      // Named as the tab, Help and About name it, and described without the acronyms.
      header: "FDA search",
      body: "Find drugs on the market by brand or generic name, and compare their products, packages, and prices.",
      isMobile: isMobile,
    },
    {
      tabType: "nadac",
      onClick: event => choose("nadac", event),
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
      data-tab-creator
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
