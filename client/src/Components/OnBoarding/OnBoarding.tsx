import { Box, Container, Typography } from "@mui/material";
import EliquisTable from "./ElquisTable";

export default function OnBoarding() {

  return (<>
    <Container maxWidth="md">
      <Typography variant="h4" sx={{ pb: 1 }}>
        Welcome
      </Typography>
      <Box
        sx={{ pb: 3 }}
      >
        <Typography variant="body1">
          DrugPricing is a tool you can use to search for drug products currently on the market and see historical prices for many prescription drugs and over the counter products. It offers two data sources:
        </Typography>
        <Box component="ol" sx={{ typography: 'body1', pl: 3 }}>
          <li>National Average Drug Acquisition Cost (NADAC) provided by CMS.</li>
          <li>The FDA's directory of products and packages currently on the market. When available, NADAC prices for drug packages in the FDA data are provided.</li>
        </Box>
        <Typography variant="body1">
          NADAC data is updated weekly and the tool contains data going back to 2023. Not all products in the FDA data have prices tracked by CMS.
        </Typography>
      </Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 1
        }}
      >
        <Typography variant="h5">
          What are drug products and drug packages?
        </Typography>
        <Typography
          variant="body1"
        >
          All drugs in both datasets are identified by their National Drug Code (NDC). The NDC specifies a drug's manufacturer, the <strong>Product</strong>, which specifies formulation (i.e., active ingredient, strength, and dosage form), and the <strong>Package</strong>, which specifies the container size and type.
        </Typography>
        <Typography
          variant="body1"
        >
          For example, something you might think of as a single product, like Eliquis,
          actually includes many products with one or more packages.
          Note below four examples of NDCs for Eliquis, each of them unique. All examples here are from
          the same labeler, "0003" or Pfizer. The first two entries are different packages (21 and 91) for
          the same product (0003-0893).
        </Typography>
        <EliquisTable />
        <Typography
          variant="body1">
          It's important to understand that the entire product NDC includes
          the labeler, when generic versions of Eliquis enter the market, those labelers do not need to use
          "0893" to identify their product. Instead, the product will be a unique combination of their
          labeler ID and a four digit code. The code itself has no meaning, it is only useful in that
          it is unique. The last two examples are different products with the same proprietary name, "Eliquis".
          Note that they have different strengths and/or formulations from 0003-0893.
        </Typography>
      </Box>
    </Container>
  </>)
}
