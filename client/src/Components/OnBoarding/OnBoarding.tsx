import { Box, Typography } from "@mui/material";
import EliquisTable from "./EliquisTable";

/** @param showHeading - false in a dialog, whose title names it */
export default function OnBoarding({ showHeading = true }: { showHeading?: boolean }) {

  return (
    <>
      <Box>
        {showHeading
          ? <Typography component="h2" variant="h5" sx={{ pb: 1 }}>
            Welcome
          </Typography>
          : null}
        <Box
          sx={{ pb: 3 }}
        >
          <Typography variant="body1">
            Search for prescription and over-the-counter drugs and chart their price histories. DrugPricing uses two public sources.
          </Typography>
          <Box component="ol" sx={{ typography: 'body1', pl: 3 }}>
            <li>The Centers for Medicare &amp; Medicaid Services (CMS) publishes the National Average Drug Acquisition Cost (NADAC) weekly. It estimates what retail community pharmacies pay to buy drugs.</li>
            <li>The FDA’s National Drug Code Directory lists products and packages. FDA search shows a package’s NADAC prices when its code appears in the weekly files.</li>
          </Box>
          <Typography variant="body1">
            The app’s price history goes back to 2022. NADAC doesn’t show what patients pay at the pharmacy.
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1
          }}
        >
          <Typography component="h3" variant="h6">
            What are drug products and drug packages?
          </Typography>
          <Typography
            variant="body1"
          >
            A package’s National Drug Code (NDC) identifies the labeler, the <strong>product</strong> (the drug, strength and form) and the <strong>package</strong> (the container type and size).
          </Typography>
          <Typography
            variant="body1"
          >
            The four Eliquis packages below share a brand name and labeler (0003, E.R. Squibb &amp; Sons).
            The first two contain the same 2.5 mg tablet, product 0003-0893. Package 21 is a bottle of 60 tablets.
            Package 91 is a blister pack of 14.
          </Typography>
          <EliquisTable />
          <Typography
            variant="body1">
            The last two rows have different strengths and different product NDCs. Read the first two parts
            of the NDC together to identify a product. Another labeler can use the same middle digits for a different drug.
          </Typography>
        </Box>
      </Box>
    </>
  )
}
