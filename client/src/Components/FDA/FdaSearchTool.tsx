import Paper from "@mui/material/Paper"
import Box from "@mui/material/Box"
import TextField from "@mui/material/TextField"
import useMobile from "../../hooks/useMobile"
import { Button, CircularProgress } from "@mui/material";
import { useEffect, useState } from "react";
import { MIN_NDC_DESCRIPTION_LENGTH } from "../../library/constants";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import useFdaSearch from "../../hooks/useFdaSearch";

export default function FdaSearchTool() {

  const [proprietaryName, setProprietaryName] = useState<string>("");

  const { setFdaSearchParams, setFdaData } = useFdaSearchContext();

  const isMobile = useMobile();
  const isValidSearch = proprietaryName.length >= MIN_NDC_DESCRIPTION_LENGTH;

  const fdaSearchQuery = useFdaSearch();

  useEffect(() => {
    if (fdaSearchQuery.data?.products) {
      setFdaData(fdaSearchQuery.data.products);
    }
  }, [fdaSearchQuery.data, setFdaData]);

  const handleSearch = () => {
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
          disabled={!isValidSearch || fdaSearchQuery.isLoading}
          sx={{
            width: { xs: "100%", md: 100 },
          }}
        >
          {fdaSearchQuery.isLoading
            ? <CircularProgress aria-label="Loading..." />
            : "Search"
          }
        </Button>

      </Paper>
    </Box>
  )
}
