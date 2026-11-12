import Box from "@mui/material/Box"
import TextField from "@mui/material/TextField"
import Paper from "@mui/material/Paper"
import Button from "@mui/material/Button"
import CircularProgress from "@mui/material/CircularProgress"
import Checkbox from "@mui/material/Checkbox"
import FormControlLabel from "@mui/material/FormControlLabel"
import React, { useState } from "react";
import { useNadacSearchContext } from "../../Context/NadacSearchContext.tsx";
import NadacSearchViz from "./NadacSearchViz";
import { useNadacSearch } from "../../hooks/useNadacSearch.ts";
import useMobile from "../../hooks/useMobile.ts"
import { toStoredNadacNdc } from "../../library/ndc.ts";
import useAppInit, { useLastAsOfDate } from "../../hooks/useAppInit.ts";
import { fromDateInput, toDateInput, type ChartDates } from "../../library/dates.ts";
import { DEFAULT_SEARCH_DATES, resolveSearchDates } from "../../library/searchCriteria.ts";
import { useWorkspaceActions, useWorkspaceTab } from "../../Context/workspaceContexts.ts";
import { useTabInstanceContext } from "../../Context/TabInstanceContext.tsx";
import { defaultTitleFor } from "../../library/tabType.ts";
import { isValidNadacSearch, nadacTabTitle } from "../../library/nadacSearch.ts";
import QueryErrorToast from "../ui/QueryErrorToast.tsx";

export default function NadacSearch() {
  const { criteria, setCriteria, search, waiting } = useNadacSearchContext();

  // A restored tab shows the search it re-ran. Its NDC is the stored (converted) form.
  const [ndcDescription, setNdcDescription] = useState(criteria.ndcDescription);
  const [ndc, setNdc] = useState(criteria.ndc);
  const [dates, setDates] = useState<ChartDates>(criteria.dates);

  // The inputs show the dates the setting means: a preset counts back from the last loaded
  // as-of date (today until app-init answers; a search waits for it). The server snaps both dates
  // to loaded as-of dates.
  const { data: appInit } = useAppInit();
  const { forDisplay: lastAsOfDate } = useLastAsOfDate();
  const shownDates = resolveSearchDates(dates, lastAsOfDate);
  const minDate = toDateInput(shownDates.start);
  const maxDate = toDateInput(shownDates.end);
  const dateInputBounds = appInit
    ? { min: toDateInput(appInit.nadacDates.first), max: toDateInput(appInit.nadacDates.last) }
    : undefined;
  // Typing a date fixes both: the range shown is the one searched. A cleared date goes back to
  // the default's.
  const handleDateChange = (field: "start" | "end", value: string) => {
    const date = fromDateInput(value) ?? resolveSearchDates(DEFAULT_SEARCH_DATES, lastAsOfDate)[field];
    setDates({ kind: "window", dateWindow: { ...shownDates, [field]: date } });
  };

  // The server matches NDCs in NADAC's stored form, so convert what the user typed
  // ("00003089321", "0003-0893-21", "11788-037-60") before searching.
  const searchNdc = toStoredNadacNdc(ndc);

  const isValidSearch = isValidNadacSearch(ndcDescription, searchNdc);

  const nadacSearchQuery = useNadacSearch();

  const { renameTab } = useWorkspaceActions();
  const { id } = useTabInstanceContext();
  const tab = useWorkspaceTab(id);
  // Name the tab after its first search, unless the user has already named it.
  const canChangeName = tab ? tab.title === defaultTitleFor(tab.type) : false;

  const busy = nadacSearchQuery.isLoading || waiting;

  const handleSearch = () => {
    const title = nadacTabTitle(ndcDescription, searchNdc);
    if (canChangeName && title) renameTab(id, title);

    search({
      // Trimmed, as the validity check and the tab title are: " eliquis" would miss descriptions
      // that start with ELIQUIS.
      ndcDescription: ndcDescription.trim(),
      ndc: searchNdc,
      dates,
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
    <QueryErrorToast error={nadacSearchQuery.error} />
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
            onChange={(e) => handleDateChange("start", e.target.value)}
            slotProps={{ htmlInput: dateInputBounds }}
          />
          <TextField
            size={isMobile ? "small" : "medium"}
            type="date"
            id="maxDate"
            name="maxDate"
            label="End Date"
            value={maxDate}
            onChange={(e) => handleDateChange("end", e.target.value)}
            slotProps={{ htmlInput: dateInputBounds }}
          />
        </Box>
        {/* A refine field: it narrows what loaded, so it applies at once, without Search. */}
        <FormControlLabel
          control={
            <Checkbox
              checked={criteria.includeOtc}
              onChange={() => setCriteria(prev => ({ ...prev, includeOtc: !prev.includeOtc }))}
            />
          }
          label="Include OTC"
          sx={{ flexShrink: 0, mr: 0 }}
        />
        <Button
          type="submit"
          disabled={!isValidSearch || busy}
          variant="contained"
          sx={{
            width: { xs: "100%", md: 100 },
          }}
        >
          {busy
            ? <CircularProgress aria-label="Loading..." />
            : "Search"
          }
        </Button>
      </Paper>
      <NadacSearchViz />
    </Box>
  </>)
}
