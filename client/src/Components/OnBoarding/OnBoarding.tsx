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
            Look up a drug’s NADAC, compare products and packages, and see when the benchmark changed and by how much. DrugPricing uses two public sources.
          </Typography>
          <Box component="ol" sx={{ typography: 'body1', pl: 3 }}>
            <li>The Centers for Medicare &amp; Medicaid Services (CMS) publishes the National Average Drug Acquisition Cost (NADAC) weekly. It estimates what retail community pharmacies pay per unit to buy drugs, from invoices pharmacies voluntarily submit to a monthly survey. CMS supplies the price history.</li>
            <li>The FDA’s National Drug Code Directory lists products and packages. It helps you identify what you’re looking at, and FDA search shows a package’s NADAC prices when its code appears in the weekly files.</li>
          </Box>
          <Typography variant="body1">
            The app’s price history goes back to 2022. For example, if your plan’s PBM report shows different ingredient costs for two drugs, chart both over the same dates to see whether NADAC shows a similar gap. NADAC doesn’t show what patients pay at the pharmacy.
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
            A package’s National Drug Code (NDC) identifies the labeler, the <strong>product</strong> (the drug, strength, and form) and the <strong>package</strong> (the container type and size).
          </Typography>
          <Typography
            variant="body1"
          >
            The four Eliquis packages below share a brand name and labeler (0003, E.R. Squibb &amp; Sons).
            The first two contain the same 2.5 mg tablet, product 0003-0893: package 21 is a bottle of 60 tablets, and
            package 31 is a carton of 10 blister packs of 10 tablets.
          </Typography>
          <EliquisTable />
          <Typography
            variant="body1">
            The last two rows have different strengths and different product NDCs. Read the first two parts
            of the NDC together to identify a product, because another labeler can use the same middle digits for a
            different drug.
          </Typography>
          <Typography
            variant="body1">
            These details answer two common questions. To check whether a tablet has the same NADAC per tablet in every
            package size, compare the packages of one product, such as 0003-0893-21 and 0003-0893-31. To check whether
            the price per tablet varies with strength, compare products such as 0003-0893 and 0003-0894. In NADAC, the
            Eliquis 2.5 mg tablet has the same price per tablet in both packages, and the 5 mg tablet costs nearly the same.
          </Typography>
        </Box>
      </Box>
    </>
  )
}
