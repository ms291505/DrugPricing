import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import NadacSearch from "./NadacSearch/NadacSearch";
import { SearchContextProvider } from "./Context/SearchContext";
import Container from "@mui/material/Container";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { theme } from "./theme";
import { BrowserRouter, Routes, Route } from "react-router";
import Welcome from "./Welcome/Welcome";
import DrugPricingBar from "./Components/DrugPricingBar/DrugPricingBar";
import FdaSearch from "./Components/FDA/FdaSearch";

const queryClient = new QueryClient();

export default function App() {


  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <QueryClientProvider client={queryClient}>
          <Container maxWidth="xl" >
            <Routes>
              <Route element={<DrugPricingBar />}>
                <Route path="/" element={
                  <Welcome />
                } />
                <Route path="/nadac-search" element={
                  <SearchContextProvider>
                    <NadacSearch />
                  </SearchContextProvider>
                } />
                <Route path="/fda-search" element={
                  <FdaSearch />
                } />
              </Route>
            </Routes>
          </Container>
        </QueryClientProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

