import Box from "@mui/material/Box"
import TextField from "@mui/material/TextField"
import Paper from "@mui/material/Paper"
import Button from "@mui/material/Button"
import CircularProgress from "@mui/material/CircularProgress"
import React, { useState, useEffect } from "react";
import { DEFAULT_NADAC_SEARCH_MONTHS, MIN_NDC_DESCRIPTION_LENGTH, MIN_NDC_LENGTH } from "../../library/constants.ts";
import { useSearchContext } from "../../Context/SearchContext.tsx";
import NadacSearchViz from "./NadacSearchViz";
import { useNadacSearch } from "../../hooks/useNadacSearch.ts";
import useMobile from "../../hooks/useMobile.ts"
import { toStoredNadacNdc } from "../../library/ndc.ts";
import useAppInit from "../../hooks/useAppInit.ts";
import { toDateInput, windowEndingAt } from "../../library/dates.ts";

export default function NadacSearch() {
  const { searchParams, setData, setSearchParams, clearNdcDescriptionFilter } = useSearchContext();

  // A restored tab shows the search it re-ran. Its NDC is the stored (converted) form.
  const [ndcDescription, setNdcDescription] = useState(searchParams?.ndcDescription ?? "");
  const [ndc, setNdc] = useState(searchParams?.ndc ?? "");
  // Null until the user picks a date: the default follows the loaded data, which arrives later.
  const [pickedMinDate, setMinDate] = useState<string | null>(searchParams?.minDate ?? null);
  const [pickedMaxDate, setMaxDate] = useState<string | null>(searchParams?.maxDate ?? null);

  // Default to the last year of loaded data. Without app-init, end today; the server snaps
  // both dates to loaded as-of dates.
  const { data: appInit } = useAppInit();
  const [today] = useState(() => Date.parse(toDateInput(Date.now())));
  const defaultDates = windowEndingAt(appInit?.nadacDates.last ?? today, DEFAULT_NADAC_SEARCH_MONTHS);
  const minDate = pickedMinDate ?? toDateInput(defaultDates.start);
  const maxDate = pickedMaxDate ?? toDateInput(defaultDates.end);
  const dateInputBounds = appInit
    ? { min: toDateInput(appInit.nadacDates.first), max: toDateInput(appInit.nadacDates.last) }
    : undefined;

  // The server matches NDCs in NADAC's stored form, so convert what the user typed
  // ("00003089321", "0003-0893-21", "11788-037-60") before searching.
  const searchNdc = toStoredNadacNdc(ndc);

  const isValidSearch = ndcDescription.length >= MIN_NDC_DESCRIPTION_LENGTH || searchNdc.length >= MIN_NDC_LENGTH;

  const nadacSearchQuery = useNadacSearch();

  useEffect(() => {
    if (nadacSearchQuery.data?.prices) {
      setData(nadacSearchQuery.data.prices);
    }
  }, [nadacSearchQuery.data, setData]);

  const handleSearch = () => {
    setSearchParams({
      ndcDescription: ndcDescription,
      ndc: searchNdc,
      minDate: minDate,
      maxDate: maxDate
    });
    clearNdcDescriptionFilter();
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
          gap: 1,
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
            onChange={(e) => setMinDate(e.target.value || null)}
            slotProps={{ htmlInput: dateInputBounds }}
          />
          <TextField
            size={isMobile ? "small" : "medium"}
            type="date"
            id="maxDate"
            name="maxDate"
            label="End Date"
            value={maxDate}
            onChange={(e) => setMaxDate(e.target.value || null)}
            slotProps={{ htmlInput: dateInputBounds }}
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
