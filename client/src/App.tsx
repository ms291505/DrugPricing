import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import NadacSearch from "./Components/NadacSearch/NadacSearch";
import { SearchContextProvider } from "./Context/SearchContext";
import Container from "@mui/material/Container";
import { ThemeProvider } from "@mui/material/styles";
import { Box, CssBaseline } from "@mui/material";
import { theme } from "./theme";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router";
import About from "./Components/About/About";
import DrugPricingBar from "./Components/DrugPricingBar/DrugPricingBar";
import FdaSearch from "./Components/FDA/FdaSearch";
import { FdaSearchContextProvider } from "./Context/FdaSearchContext";
import { WorkspaceContextProvider } from "./Context/WorkspaceContext";
import Workspace from "./Components/Workspace/Workspace";
import OnBoarding from "./Components/OnBoarding/OnBoarding";

const queryClient = new QueryClient();

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <QueryClientProvider client={queryClient}>
          <FdaSearchContextProvider>
            <WorkspaceContextProvider>
              <AppShell />
            </WorkspaceContextProvider>
          </FdaSearchContextProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

function AppShell() {
  const location = useLocation();
  const isWorkspaceActive = location.pathname.startsWith('/workspace');

  return (
    <Container maxWidth="xl" sx={{ pb: 2 }}>
      <Box style={{ display: isWorkspaceActive ? 'block' : 'none' }}>
        <Workspace />
      </Box>

      {!isWorkspaceActive && (
        <Routes>
          <Route element={<DrugPricingBar />}>
            <Route path="/about" element={<About />} />
            <Route path="/nadac-search" element={
              <SearchContextProvider><NadacSearch /></SearchContextProvider>
            } />
            <Route path="/fda-search" element={<FdaSearch />} />
            <Route path="/welcome" element={<OnBoarding />} />
            <Route path="*" element={<Navigate to="/workspace" replace />} />
          </Route>
        </Routes>
      )}
    </Container>
  );
}
