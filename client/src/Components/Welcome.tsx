import { Box, Button, Divider, Link, Paper, Stack, Typography } from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import PushPinOutlined from "@mui/icons-material/PushPinOutlined";
import ScaleOutlined from "@mui/icons-material/ScaleOutlined";
import { Link as RouterLink } from "react-router";
import { useGlobalModalActions } from "../Context/globalModalContexts";
import type { HelpTopicId } from "../library/help";

const IDEAS: { title: string, text: string, link: string, topic: HelpTopicId, Icon: SvgIconComponent }[] = [
  { title: "Products and packages", text: "A product identifies a drug at one strength and in one form from one labeler. Packages identify the sizes and containers it comes in. FDA search shows either level. NADAC search lists package codes.", link: "More about products and packages", topic: "ndcs-products-and-packages", Icon: Inventory2Outlined },
  { title: "Prices are per unit", text: "A price estimates the pharmacy’s acquisition cost per unit, such as a tablet, milliliter or gram. Your prescription bill depends on other factors.", link: "What the prices mean", topic: "what-the-prices-mean", Icon: ScaleOutlined },
  { title: "Pin a chart to keep it", text: "Pin a chart to keep its data and dates when you search again. The FDA and NADAC pages under Search share pins. Each Workspace tab keeps its own.", link: "Pinning and comparing", topic: "pinning-and-comparing", Icon: PushPinOutlined },
];

/** The page at `/welcome`, where the bare address goes until a search source is visited. */
export default function Welcome() {
  const { openHelp } = useGlobalModalActions();
  return <Stack spacing={{ xs: 3, md: 4 }} sx={{ py: { xs: 2, md: 4 } }}>
    {/* Hero: what the app is, then the two ways in, right under the sentence that explains them. */}
    <Paper component="section" aria-labelledby="welcome-heading" sx={{ px: { xs: 2, sm: 4 }, py: { xs: 4, md: 6 } }}>
      <Stack spacing={2} sx={{ alignItems: "center", textAlign: "center" }}>
        <Typography id="welcome-heading" variant="h3" component="h1" sx={{ fontWeight: 500, fontSize: { xs: "2.5rem", sm: "3rem" } }}>DrugPricing</Typography>
        <Typography variant="h6" component="p" sx={{ color: "text.secondary", fontWeight: 400, maxWidth: "36em" }}>
          Explore weekly US drug acquisition prices. Search for a drug, chart its price history, and pin charts to compare them.
        </Typography>
        {/* A grid of equal columns, so side by side both buttons take the wider label's width. */}
        <Box sx={{ display: "grid", gridAutoFlow: { xs: "row", sm: "column" }, gridAutoColumns: "1fr", gap: 2, pt: 2, width: { xs: "100%", sm: "auto" } }}>
          <Button variant="contained" size="large" component={RouterLink} to="/search" sx={{ px: 4 }}>Find a drug</Button>
          <Button variant="outlined" size="large" component={RouterLink} to="/workspace" sx={{ px: 4 }}>Open workspace</Button>
        </Box>
      </Stack>
    </Paper>

    <Box component="section" aria-labelledby="welcome-ideas">
      <Typography id="welcome-ideas" variant="h5" component="h2" sx={{ mb: 2 }}>Learn the basics</Typography>
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(3, minmax(0, 1fr))" } }}>
        {IDEAS.map(({ title, text, link, topic, Icon }) => <Paper key={topic} sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 1 }}>
          <Icon sx={{ color: "primary.main" }} aria-hidden />
          <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }}>{title}</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", flexGrow: 1 }}>{text}</Typography>
          <Link component="button" onClick={() => openHelp(topic)} sx={{ alignSelf: "flex-start", textAlign: "left", mt: 1 }}>{link}</Link>
        </Paper>)}
      </Box>
    </Box>

    <Box component="section">
      <Divider sx={{ mb: 2 }} />
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        The Centers for Medicare &amp; Medicaid Services publishes the National Average Drug Acquisition Cost (NADAC) weekly. The benchmark is based on purchase invoices that retail community pharmacies submit voluntarily.
      </Typography>
      <Stack direction="row" spacing={3} useFlexGap flexWrap="wrap" sx={{ mt: 1.5, typography: "body2" }}>
        <Link component="button" onClick={() => openHelp("nadac")} sx={{ typography: "body2" }}>What is NADAC?</Link>
        <Link component={RouterLink} to="/about">About this project</Link>
      </Stack>
    </Box>
  </Stack>;
}
