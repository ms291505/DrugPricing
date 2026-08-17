import Paper from "@mui/material/Paper"
import Box from "@mui/material/Box"
import TextField from "@mui/material/TextField"
import useMobile from "../../hooks/useMobile"
import { Button, CircularProgress } from "@mui/material";
import { useState } from "react";
import { MIN_NDC_DESCRIPTION_LENGTH } from "../../library/constants";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import useFdaSearch from "../../hooks/useFdaSearch";
import { useWorkspaceContext } from "../../Context/WorkspaceContext";
import { useTabInstanceContext } from "../../Context/TabInstanceContext";
import { defaultTitleFor } from "../../library/types";

export default function FdaSearchTool() {

  const { setFdaSearchParams, fdaSearchParams } = useFdaSearchContext();

  const { renameTab, findTab } = useWorkspaceContext();

  const { id } = useTabInstanceContext();

  const [proprietaryName, setProprietaryName] = useState<string>(fdaSearchParams?.propreitaryName ?? "");

  const isMobile = useMobile();

  const fdaSearch = useFdaSearch();

  const isValidSearch = proprietaryName.length >= MIN_NDC_DESCRIPTION_LENGTH;

  const tab = findTab(id);

  const canChangeName = tab
    ? tab.title === defaultTitleFor(tab?.type)
    : false;

  const handleSearch = () => {

    if (canChangeName) renameTab(id, proprietaryName.toUpperCase());

    setFdaSearchParams({
      propreitaryName: proprietaryName,
    });
  }

  return (
    <Box sx={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 1,
      flexGrow: 1,
      width: "100%"
    }}>
      <Paper
        component="form"
        aria-label="FDA search form"
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: { xs: 1, md: 2 },
          padding: 2,
          width: "100%",
          justifyContent: "center"
        }}
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch();
        }}
      >
        <TextField
          size={isMobile ? "small" : "medium"}
          type="text"
          id="proprietaryName"
          name="proprietaryName"
          label="Brand Name"
          value={proprietaryName}
          onChange={(e) => setProprietaryName(e.target.value)}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={!isValidSearch || fdaSearch.isLoading}
          sx={{
            width: { xs: "100%", md: 100 },
          }}
        >
          {fdaSearch.isLoading
            ? <CircularProgress aria-label="Loading..." />
            : "Search"
          }
        </Button>

      </Paper>
    </Box>
  )
}
