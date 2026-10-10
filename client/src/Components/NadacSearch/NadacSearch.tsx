import Box from "@mui/material/Box"
import TextField from "@mui/material/TextField"
import Paper from "@mui/material/Paper"
import Button from "@mui/material/Button"
import CircularProgress from "@mui/material/CircularProgress"
import React, { useState, useEffect } from "react";
import { MAX_DATE, MIN_DATE, MIN_NDC_DESCRIPTION_LENGTH, MIN_NDC_LENGTH } from "../../library/constants.ts";
import { useSearchContext } from "../../Context/SearchContext.tsx";
import NadacSearchViz from "./NadacSearchViz";
import { useNadacSearch } from "../../hooks/useNadacSearch.ts";
import useMobile from "../../hooks/useMobile.ts"
import { toStoredNadacNdc } from "../../library/ndc.ts";

export default function NadacSearch() {
  const formatDateValue = (date: Date) => date.toISOString().split("T")[0];

  const [ndcDescription, setNdcDescription] = useState("");
  const [ndc, setNdc] = useState("");
  const [minDate, setMinDate] = useState(formatDateValue(MIN_DATE));
  const [maxDate, setMaxDate] = useState(formatDateValue(MAX_DATE));
  const { setData, setVizData, setSearchParams } = useSearchContext();

  // The server matches NDCs in NADAC's stored form, so convert what the user typed
  // ("00003089321", "0003-0893-21", "11788-037-60") before searching.
  const searchNdc = toStoredNadacNdc(ndc);

  const isValidSearch = ndcDescription.length >= MIN_NDC_DESCRIPTION_LENGTH || searchNdc.length >= MIN_NDC_LENGTH;

  const nadacSearchQuery = useNadacSearch();

  useEffect(() => {
    if (nadacSearchQuery.data?.prices) {
      setData(nadacSearchQuery.data.prices);
      setVizData(nadacSearchQuery.data.prices);
    }
  }, [nadacSearchQuery.data, setData, setVizData]);

  const handleSearch = () => {
    setSearchParams({
      ndcDescription: ndcDescription,
      ndc: searchNdc,
      minDate: minDate,
      maxDate: maxDate
    });
  }

  const handleNdcDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNdcDescription(value);
  }

  const handleNdcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Keep dashes: they say which segment of a 4-4-2, 5-3-2, or 5-4-1 code is short.
    const value = e.target.value.replace(/[^\d-]/g, "");
    setNdc(value);
  }

  const isMobile = useMobile();

  return (<>
    <Box sx={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 1,
      minWidth: 0,
    }}>
      <Paper
        component="form"
        aria-label="Nadac search form"
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
          id="ndcDescription"
          name="ndcDescription"
          label="Description"
          value={ndcDescription}
          onChange={handleNdcDescriptionChange}
        />
        <TextField
          size={isMobile ? "small" : "medium"}
          type="text"
          id="ndc"
          name="ndc"
          label="NDC"
          value={ndc}
          onChange={handleNdcChange}
        />
        <Box
          sx={{
            display: "flex",
            gap: 1
          }}>
          <TextField
            size={isMobile ? "small" : "medium"}
            type="date"
            id="minDate"
            name="minDate"
            label="Start Date"
            value={minDate}
            onChange={(e) => setMinDate(e.target.value)}
          />
          <TextField
            size={isMobile ? "small" : "medium"}
            type="date"
            id="maxDate"
            name="maxDate"
            label="End Date"
            value={maxDate}
            onChange={(e) => setMaxDate(e.target.value)}
          />
        </Box>
        <Button
          type="submit"
          disabled={!isValidSearch || nadacSearchQuery.isLoading}
          variant="contained"
          sx={{
            width: { xs: "100%", md: 100 },
          }}
        >
          {nadacSearchQuery.isLoading
            ? <CircularProgress aria-label="Loading..." />
            : "Search"
          }
        </Button>
      </Paper>
      <NadacSearchViz />
    </Box>
  </>)
}
