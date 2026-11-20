import { memo, useLayoutEffect, useRef, type ReactNode } from "react";
import { Box } from "@mui/material";
import { PageVisibleContext } from "../Context/pageVisibility";
import { hiddenPaneSx } from "../library/paneVisibility";

/** Retains the document scroll separately for each mounted route. Children keep their identity. */
export default memo(function KeptPage({ visible, children }: { visible: boolean, children: ReactNode }) {
  const scroll = useRef(0);
  useLayoutEffect(() => {
    if (!visible) return;
    window.scrollTo(0, scroll.current);
    const remember = () => { scroll.current = window.scrollY; };
    window.addEventListener("scroll", remember);
    return () => window.removeEventListener("scroll", remember);
  }, [visible]);
  return (
    <Box sx={{ gridArea: "1 / 1", minWidth: 0, alignSelf: "start", ...(visible ? {} : { ...hiddenPaneSx, height: 0, overflow: "clip" }) }}>
      <PageVisibleContext value={visible}>{children}</PageVisibleContext>
    </Box>
  );
});
