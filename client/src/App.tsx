import HelpContent from "./Components/Help/HelpContent";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Container from "@mui/material/Container";
import { ThemeProvider } from "@mui/material/styles";
import { Box, CssBaseline } from "@mui/material";
import { THEMES } from "./theme";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useMatch, useNavigate } from "react-router";
import About from "./Components/About";
import DrugPricingBar from "./Components/DrugPricingBar/DrugPricingBar";
import { loadLastSearchSource, saveLastSearchSource, type SearchSource } from "./library/persist";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { PageVisibleContext } from "./Context/pageVisibility";
import { hiddenPaneSx } from "./library/paneVisibility";
import PinnedSection from "./Components/ExplorerGrid/PinnedSection";
import KeptPage from "./Components/KeptPage";
import { TryNadacContext, type NadacOffer } from "./Context/searchNavigation";
import StandaloneSearch from "./Components/Search/StandaloneSearch";
import { StandalonePinsProvider } from "./Context/StandaloneSearchProviders";
import { WorkspaceContextProvider } from "./Context/WorkspaceContext";
import { GlobalModalContextProvider } from "./Context/GlobalModalContext";
import { SettingsProvider, useSettings } from "./Context/SettingsContext";
import { Toaster } from "react-hot-toast"
import useMobile from "./hooks/useMobile";
import Workspace from "./Components/Workspace";
import Welcome from "./Components/Welcome";
import GlobalModal from "./Components/GlobalModal";

// No refetch when the window regains focus or the network comes back: every mounted tab, hidden
// ones included, would refetch at once, and the data only changes weekly.
const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, refetchOnReconnect: false } },
});

export default function App() {
  return (
    <BrowserRouter>
      <SettingsProvider>
        <AppTheme>
          <CssBaseline />
          <QueryClientProvider client={queryClient}>
            <AppToaster />
            <GlobalModalContextProvider>
              <AppContent />
            </GlobalModalContextProvider>
          </QueryClientProvider>
        </AppTheme>
      </SettingsProvider>
    </BrowserRouter>
  );
}

const isHelpPath = (pathname: string) => pathname === "/help" || pathname.startsWith("/help/");

/** A direct Help visit is read-only. Once entered, the app stays mounted even on Help routes. */
function AppContent() {
  const { pathname } = useLocation();
  const isHelp = isHelpPath(pathname);
  const [enteredApp, setEnteredApp] = useState(!isHelp);
  if (!isHelp && !enteredApp) setEnteredApp(true);
  if (!enteredApp) return (
    <>
      <DrugPricingBar />
      <GlobalModal />
      <HelpRoutes />
    </>
  );
  return (
    <WorkspaceContextProvider>
      <AppShell />
    </WorkspaceContextProvider>
  );
}

function HelpRoutes() {
  return (
    <Routes>
      <Route path="/help/:topic?" element={<Container maxWidth="sm" sx={{ py: 3 }}><HelpContent standalone /></Container>} />
      <Route path="/help/*" element={<Navigate to="/help" replace />} />
    </Routes>
  );
}

/** The theme for the Settings color mode. */
function AppTheme({ children }: { children: React.ReactNode }) {
  const { colorMode } = useSettings().settings;
  return <ThemeProvider theme={THEMES[colorMode]}>{children}</ThemeProvider>;
}

// Phones keep the tab button at the bottom (`TabContextFab`), so toasts come from the top there.
function AppToaster() {
  const isMobile = useMobile();
  return <Toaster position={isMobile ? "top-center" : "bottom-center"} />;
}

function AppShell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  useLayoutEffect(() => {
    if (pathname === "/welcome" || pathname === "/about" || isHelpPath(pathname)) window.scrollTo(0, 0);
  }, [pathname]);
  const matchedSource = useMatch("/search/:source")?.params.source;
  const source: SearchSource | null = matchedSource === "fda" || matchedSource === "nadac" ? matchedSource : null;
  const [{ lastSource, visited }, setSearchNavigation] = useState(() => ({
    lastSource: source ?? loadLastSearchSource(),
    visited: new Set<SearchSource>(source ? [source] : []),
  }));
  if (source && source !== lastSource) {
    setSearchNavigation({ lastSource: source, visited: new Set([...visited, source]) });
  }
  useEffect(() => { if (source) saveLastSearchSource(source); }, [source]);

  // Declarative router navigation changes identity by route; keep the handoff action stable.
  const navigateRef = useRef(navigate);
  useLayoutEffect(() => { navigateRef.current = navigate; }, [navigate]);
  const [offer, setOffer] = useState<NadacOffer | null>(null);
  const tryNadac = useCallback((description: string) => {
    setOffer({ description });
    void navigateRef.current("/search/nadac");
  }, []);
  // Element identity is stable across route switches, as in TabInstance.
  const fda = useMemo(() => <StandaloneSearch source="fda" />, []);
  const nadac = useMemo(() => <StandaloneSearch source="nadac" offer={offer} />, [offer]);
  const pins = useMemo(() => <PinnedSection />, []);
  const isWorkspace = useMatch("/workspace") !== null;
  const workspace = useMemo(() => <Workspace onScreen={isWorkspace} />, [isWorkspace]);

  return (
    <Container maxWidth="xl" sx={{ pb: 2 }}>
      <DrugPricingBar />
      <GlobalModal />
      <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)" }}>
        <KeptPage visible={isWorkspace}>{workspace}</KeptPage>
        {visited.size > 0 && <TryNadacContext value={tryNadac}><StandalonePinsProvider>
          {visited.has("fda") && <KeptPage visible={source === "fda"}>{fda}</KeptPage>}
          {visited.has("nadac") && <KeptPage visible={source === "nadac"}>{nadac}</KeptPage>}
          <Box sx={{ gridArea: "2 / 1", minWidth: 0, ...(source ? { mt: 2 } : { ...hiddenPaneSx, height: 0, overflow: "clip" }) }}>
            <PageVisibleContext value={source !== null}>{pins}</PageVisibleContext>
          </Box>
        </StandalonePinsProvider></TryNadacContext>}
        {!source && !isWorkspace && <Box sx={{ gridArea: "1 / 1", minWidth: 0 }}>
          {isHelpPath(pathname) ? <HelpRoutes /> : <Routes>
            <Route path="/about" element={<Container maxWidth="lg"><About /></Container>} />
            <Route path="/welcome" element={<Container maxWidth="md"><Welcome /></Container>} />
            <Route path="/search" element={<Navigate to={`/search/${lastSource ?? "fda"}`} replace />} />
            <Route path="/fda-search" element={<Navigate to="/search/fda" replace />} />
            <Route path="/nadac-search" element={<Navigate to="/search/nadac" replace />} />
            <Route path="*" element={<Navigate to="/welcome" replace />} />
          </Routes>}
        </Box>}
      </Box>
    </Container>
  );
}
