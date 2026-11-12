import Paper from "@mui/material/Paper"
import Box from "@mui/material/Box"
import TextField from "@mui/material/TextField"
import useMobile from "../../hooks/useMobile"
import { Button, Checkbox, CircularProgress, FormControlLabel, Grid } from "@mui/material";
import { useState } from "react";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import useFdaSearch from "../../hooks/useFdaSearch";
import { useWorkspaceActions, useWorkspaceTab } from "../../Context/workspaceContexts";
import { useTabInstanceContext } from "../../Context/TabInstanceContext";
import { defaultTitleFor } from "../../library/tabType.ts";
import { isValidFdaSearch } from "../../library/searchCriteria.ts";

export default function FdaSearchTool() {

  const { criteria, setCriteria, search } = useFdaSearchContext();

  const { renameTab } = useWorkspaceActions();

  const { id } = useTabInstanceContext();

  const tab = useWorkspaceTab(id);

  // A restored tab shows the search it re-ran.
  const [proprietaryName, setProprietaryName] = useState(criteria.proprietaryName);

  const isMobile = useMobile();

  const fdaSearch = useFdaSearch();

  const isValidSearch = isValidFdaSearch(proprietaryName);

  const canChangeName = tab
    ? tab.title === defaultTitleFor(tab?.type)
    : false;

  const handleSearch = () => {

    const name = proprietaryName.trim();
    if (canChangeName) renameTab(id, name.toUpperCase());

    // Dates aren't on this form yet; a search keeps the tab's.
    search({ proprietaryName: name, dates: criteria.dates });
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
              gap: 1,
            }}
          >
            <Grid container display="flex">
              <Grid size={9}>
                <TextField
                  size={isMobile ? "small" : "medium"}
                  type="text"
                  id="proprietaryName"
                  name="proprietaryName"
                  label="Brand Name"
                  value={proprietaryName}
                  onChange={(e) => setProprietaryName(e.target.value)}
                />
              </Grid>
              <Grid size={3}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={!isValidSearch || fdaSearch.isLoading}
                  sx={{
                    width: { xs: "100%", md: 100 },
                    height: "100%",
                  }}
                >
                  {fdaSearch.isLoading
                    ? <CircularProgress aria-label="Loading..." size={16} />
                    : "Search"
                  }
                </Button>
              </Grid>
            </Grid>
          </Box>
          {/* Refine fields: they narrow what loaded, so they apply at once, without Search. */}
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
                  checked={criteria.includeResultsWithoutPrices}
                  onChange={() => setCriteria(prev => ({ ...prev, includeResultsWithoutPrices: !prev.includeResultsWithoutPrices }))}
                />
              }
              label="Include Results Without Prices"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={criteria.includeSamplePackages}
                  onChange={() => setCriteria(prev => ({ ...prev, includeSamplePackages: !prev.includeSamplePackages }))}
                />
              }
              label="Include Sample Packages"
            />
          </Box>
        </Box>

      </Paper>
    </Box>
  )
}
