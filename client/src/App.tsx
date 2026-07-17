import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import NadacSearch from "./Components/NadacSearch/NadacSearch";
import { SearchContextProvider } from "./Context/SearchContext";
import Container from "@mui/material/Container";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { theme } from "./theme";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import About from "./Components/About/About";
import DrugPricingBar from "./Components/DrugPricingBar/DrugPricingBar";
import FdaSearch from "./Components/FDA/FdaSearch";
import { FdaSearchContextProvider } from "./Context/FdaSearchContext";
import { WorkspaceContextProvider } from "./Context/WorkspaceContext";
import Workspace from "./Components/Workspace/Workspace";

const queryClient = new QueryClient();

export default function App() {

  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <QueryClientProvider client={queryClient}>
          <FdaSearchContextProvider>
            <WorkspaceContextProvider>
              <Container maxWidth="xl" sx={{ pb: 2 }}>
                <Routes>
                  <Route element={<DrugPricingBar />}>
                    <Route path="/" element={
                      <About />
                    } />
                    <Route path="/nadac-search" element={
                      <SearchContextProvider>
                        <NadacSearch />
                      </SearchContextProvider>
                    } />
                    <Route path="/fda-search" element={
                      <FdaSearch />
                    } />
                    <Route path="/workspace" element={
                      <Workspace />
                    } />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Route>
                </Routes>
              </Container>
            </WorkspaceContextProvider>
          </FdaSearchContextProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

