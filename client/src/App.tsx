import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import NadacSearch from "./NadacSearch/NadacSearch";
import { SearchContextProvider } from "./Context/SearchContext";
import Container from "@mui/material/Container";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { theme } from "./theme";

const queryClient = new QueryClient();

export default function App() {


  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <SearchContextProvider>
          <Container maxWidth="xl" >
            <NadacSearch />
          </Container>
        </SearchContextProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

