import { Grid } from "@mui/material";
import { SMALL_SPACING } from "../../library/constants";
import type { ReactNode } from "react";

type ExplorerGridProps = {
  visible?: boolean;
  children: ReactNode;
}

export default function ExplorerGrid({
  visible = false,
  children,
}: ExplorerGridProps) {

  return (
    <Grid
      container
      spacing={SMALL_SPACING}
      display={visible ? "flex" : "none"}
      minHeight={0}
    >
      {children}
    </Grid>
  )
}
