import { Box, Typography } from "@mui/material";
import { useWorkspaceActions } from "../../Context/workspaceContexts";
import { useTabInstanceContext } from "../../Context/TabInstanceContext";
import DescriptionCard from "./DescriptionCard";

export default function TabCreator() {
  const { changeTabType } = useWorkspaceActions();
  const { id } = useTabInstanceContext();

  return (
    <Box sx={{ mx: "auto", maxWidth: 720, px: 2, py: { xs: 3, sm: 6 } }}>
      <Typography variant="h5" component="h2" sx={{ mb: 2 }}>Choose a search</Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 250px), 1fr))", gap: 2 }}>
        <DescriptionCard
          onClick={() => changeTabType(id, "fda")}
          header="Search drug products"
          body="Find products by brand or generic name. Explore package details and price histories when available."
        />
        <DescriptionCard
          onClick={() => changeTabType(id, "nadac")}
          header="Search drug prices"
          body="Look up pharmacy acquisition costs by drug description or package code (NDC)."
        />
      </Box>
    </Box>
  );
}
