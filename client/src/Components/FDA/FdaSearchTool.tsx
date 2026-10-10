import Paper from "@mui/material/Paper"
import Box from "@mui/material/Box"
import TextField from "@mui/material/TextField"
import useMobile from "../../hooks/useMobile"
import { Button, Checkbox, CircularProgress, FormControlLabel } from "@mui/material";
import { useState } from "react";
import { MIN_NDC_DESCRIPTION_LENGTH } from "../../library/constants";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import useFdaSearch from "../../hooks/useFdaSearch";
import { useWorkspaceContext } from "../../Context/WorkspaceContext";
import { useTabInstanceContext } from "../../Context/TabInstanceContext";
import { defaultTitleFor } from "../../library/tabTypeRegistry";
import { defaultAdvFdaSearchParams } from "../../library/types.ts";

export default function FdaSearchTool() {

  const { fdaSearchParams, setFdaSearchParams } = useFdaSearchContext();

  const { renameTab, findTab } = useWorkspaceContext();

  const { id } = useTabInstanceContext();

  // A restored tab shows the search it re-ran.
  const [draftSearchParams, setDraftSearchParams] = useState(fdaSearchParams ?? defaultAdvFdaSearchParams);

  const isMobile = useMobile();

  const fdaSearch = useFdaSearch();

  const isValidSearch = draftSearchParams.proprietaryName.length >= MIN_NDC_DESCRIPTION_LENGTH;

  const tab = findTab(id);

  const canChangeName = tab
    ? tab.title === defaultTitleFor(tab?.type)
    : false;

  const handleSearch = () => {

    if (canChangeName) renameTab(id, draftSearchParams.proprietaryName.toUpperCase());

    setFdaSearchParams(draftSearchParams);
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
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1
          }}
        >
          <Box
            sx={{
              display: "flex",
              gap: 1
            }}
          >
            <TextField
              size={isMobile ? "small" : "medium"}
              type="text"
              id="proprietaryName"
              name="proprietaryName"
              label="Brand Name"
              value={draftSearchParams.proprietaryName}
              onChange={(e) =>
                setDraftSearchParams(
                  prev => ({ ...prev, proprietaryName: e.target.value }))
              }
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
          </Box>
          <Box
            id="checkbox-container"
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              width: "100%",
              justifyContent: "center",
              gap: { xs: 1, md: 2 }
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={draftSearchParams.includeResultsWNoPrices}
                  onChange={() => setDraftSearchParams(prev => ({ ...prev, includeResultsWNoPrices: !prev.includeResultsWNoPrices }))}
                />
              }
              label="Include Results Without Prices"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={draftSearchParams.includeSamplePackages}
                  onChange={() => setDraftSearchParams(prev => ({ ...prev, includeSamplePackages: !prev.includeSamplePackages }))}
                />
              }
              label="Inculde Sample Packages"
            />
          </Box>
        </Box>

      </Paper>
    </Box>
  )
}
