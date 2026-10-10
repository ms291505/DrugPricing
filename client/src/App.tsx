import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import NadacSearch from "./Components/NadacSearch/NadacSearch";
import Container from "@mui/material/Container";
import { ThemeProvider } from "@mui/material/styles";
import { Box, CssBaseline } from "@mui/material";
import { theme } from "./theme";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router";
import About from "./Components/About/About";
import DrugPricingBar from "./Components/DrugPricingBar/DrugPricingBar";
import FdaSearch from "./Components/FDA/FdaSearch";
import { FdaTabProvider, NadacTabProvider } from "./Context/TabProviders";
import { STANDALONE_TAB_IDS } from "./library/persist";
import { WorkspaceContextProvider } from "./Context/WorkspaceContext";
import { GlobalModalContextProvider } from "./Context/GlobalModalContext";
import { Toaster } from "react-hot-toast"
import Workspace from "./Components/Workspace/Workspace";
import OnBoarding from "./Components/OnBoarding/OnBoarding";
import GlobalModal from "./Components/GlobalModal/GlobalModal";

const queryClient = new QueryClient();

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <QueryClientProvider client={queryClient}>
          <Toaster
            position="bottom-center"
          />
          <GlobalModalContextProvider>

            <WorkspaceContextProvider>
              <AppShell />
            </WorkspaceContextProvider>
          </GlobalModalContextProvider>
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
      <GlobalModal />

      {!isWorkspaceActive && (
        <Routes>
          <Route element={<DrugPricingBar />}>
            <Route path="/about" element={<About />} />
            <Route path="/nadac-search" element={
              <NadacTabProvider tabId={STANDALONE_TAB_IDS.nadac}><NadacSearch /></NadacTabProvider>
            } />
            <Route path="/fda-search" element=
              {<FdaTabProvider tabId={STANDALONE_TAB_IDS.fda}><FdaSearch /></FdaTabProvider>} />
            <Route path="/welcome" element={<OnBoarding />} />
            <Route path="*" element={<Navigate to="/workspace" replace />} />
          </Route>
        </Routes>
      )}
    </Container>
  );
}
