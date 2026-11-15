import { Box, Button, Link, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router";
import { useGlobalModalActions } from "../Context/globalModalContexts";
import type { HelpTopicId } from "../library/help";

const IDEAS: { title: string, text: string, link: string, topic: HelpTopicId }[] = [
  { title: "Products and packages.", text: "A product is one drug at one strength and form. Its packages are the bottle and box sizes it comes in. FDA search can show either; NADAC search lists individual package NDCs.", link: "More about products and packages", topic: "ndcs-products-and-packages" },
  { title: "Prices are per unit.", text: "Per tablet, millilitre or gram, never per package, and they are what a pharmacy pays its supplier, not what a patient pays.", link: "What the prices mean", topic: "what-the-prices-mean" },
  { title: "Pin a chart to keep it.", text: "Charts on a search page follow the search. Pin one and it keeps its data and dates, available in both FDA and NADAC search. Each Workspace tab keeps its own pins.", link: "Pinning and comparing", topic: "pinning-and-comparing" },
];

export default function Welcome() {
  const { openHelp } = useGlobalModalActions();
  return <Stack spacing={3} sx={{ py: 3 }}>
    <Typography variant="h3" component="h1">DrugPricing</Typography>
    <Typography>Explore US drug acquisition prices, week by week since January 2022. Search for a drug, chart its price history, and pin charts side by side to compare.</Typography>
    <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
      <Button variant="contained" component={RouterLink} to="/search">Find a drug</Button>
      <Button variant="outlined" component={RouterLink} to="/workspace">Open workspace</Button>
    </Stack>
    <Typography>
      Prices come from NADAC (National Average Drug Acquisition Cost), a CMS benchmark based on invoices voluntarily submitted by retail community pharmacies. It estimates acquisition costs; it does not capture every pharmacy’s actual cost or every drug package.
    </Typography>
    {IDEAS.map(idea => <Box key={idea.topic}>
      <Typography><strong>{idea.title}</strong> {idea.text}</Typography>
      <Link component="button" onClick={() => openHelp(idea.topic)}>{idea.link}</Link>
    </Box>)}
    <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
      <Link component="button" onClick={() => openHelp("nadac")}>What is NADAC?</Link>
      <Link component={RouterLink} to="/about">About this project</Link>
    </Stack>
  </Stack>;
}
