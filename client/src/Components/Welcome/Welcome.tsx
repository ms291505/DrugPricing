import { Box, Button, Divider, Link, Paper, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router";
import { useGlobalModalActions } from "../../Context/globalModalContexts";
import { IDEAS } from "./ideas";

/** The page at `/welcome`, where the bare address and unknown addresses always go. */
export default function Welcome() {
  const { openHelp } = useGlobalModalActions();
  return (
    <Stack spacing={{ xs: 3, md: 4 }} sx={{ py: { xs: 2, md: 4 } }}>
      {/* Hero: what the app is, then the two ways in, right under the sentence that explains them. */}
      <Paper component="section" aria-labelledby="welcome-heading" sx={{ px: { xs: 2, sm: 4 }, py: { xs: 4, md: 6 } }}>
        <Stack spacing={2} sx={{ alignItems: "center", textAlign: "center" }}>
          <Typography id="welcome-heading" variant="h3" component="h1" sx={{ fontWeight: 500, fontSize: { xs: "2.5rem", sm: "3rem" } }}>DrugPricing</Typography>
          <Typography variant="h6" component="p" sx={{ color: "text.secondary", fontWeight: 400, maxWidth: "36em" }}>
            Look up a drug’s NADAC, compare products and packages, and see when the benchmark changed and by how much.
          </Typography>
          {/* A grid of equal columns, so side by side both buttons take the wider label's width. */}
          <Box sx={{ display: "grid", gridAutoFlow: { xs: "row", sm: "column" }, gridAutoColumns: "1fr", gap: 2, pt: 2, width: { xs: "100%", sm: "auto" } }}>
            <Button variant="contained" size="large" component={RouterLink} to="/search" sx={{ px: 4 }}>Find a drug</Button>
            <Button variant="outlined" size="large" component={RouterLink} to="/workspace" sx={{ px: 4 }}>Open workspace</Button>
          </Box>
          {/* Secondary, under the two ways in, for visitors who want to know who made this and how. */}
          <Button component={RouterLink} to="/about" sx={{ minHeight: 44 }}>About this project</Button>
        </Stack>
      </Paper>

      <Box component="section" aria-labelledby="welcome-ideas">
        <Typography id="welcome-ideas" variant="h5" component="h2" sx={{ mb: 2 }}>Learn the basics</Typography>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" } }}>
          {IDEAS.map(({ title, text, link, topic, Icon }) => (
            <Paper key={topic} sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 1 }}>
              <Box sx={{ display: "flex", flexDirection: "row", gap: 1, alignItems: "center" }}>
                <Icon sx={{ color: "primary.main" }} aria-hidden />
                <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }}>{title}</Typography>
              </Box>
              <Typography variant="body2" sx={{ color: "text.secondary", flexGrow: 1 }}>{text}</Typography>
              <Link component="button" onClick={() => openHelp(topic)} sx={{ alignSelf: "flex-start", textAlign: "left", mt: 1 }}>{link}</Link>
            </Paper>
          ))}
        </Box>
      </Box>

      <Box component="section">
        <Divider sx={{ mb: 2 }} />
        <Stack direction="row" spacing={3} useFlexGap flexWrap="wrap" sx={{ mt: 1.5, typography: "body2" }}>
          <Link component="button" onClick={() => openHelp("sources-and-disclaimer")} sx={{ typography: "body2" }}>Sources and disclaimer</Link>
          <Link component={RouterLink} to="/about">About this project</Link>
        </Stack>
      </Box>
    </Stack>
  );
}
