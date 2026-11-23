import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { Link as RouterLink } from "react-router";

/**
 * The About page, shown at `/about` with its heading. `showHeading={false}` is for the `about`
 * global modal, whose title names it; nothing opens that modal now.
 */
export default function About({ showHeading = true }: { showHeading?: boolean }) {
  return (
    <Box>
      {showHeading && <Typography component="h1" variant="h5">About</Typography>}
      <p>
        DrugPricing shows how US drug acquisition prices change over time. I chose the National Average Drug Acquisition
        Cost (NADAC) because it’s public, covers tens of thousands of drug packages, and has several years of price history.
        The Centers for Medicare &amp; Medicaid Services (CMS) publishes the estimates weekly.
      </p>

      <Typography component="h2" variant="h5" sx={{ mt: 3 }}>Two ways to search</Typography>
      <ul>
        <li>
          <strong>FDA search</strong> finds products and packages by brand or generic name in the FDA’s National Drug Code
          (NDC) Directory. You can filter by dosage form, route or labeler and see NADAC prices for matching packages.
        </li>
        <li>
          <strong>NADAC search</strong> finds packages by description or NDC, including packages with price history that no
          longer appear in the FDA directory.
        </li>
      </ul>
      <p>
        To match the two sources, I pad each segment of the FDA’s dashed package code to the CMS format, then drop
        leading zeros from the resulting code for the join. Some packages appear in only one source, so I kept both ways
        to search. <Link component={RouterLink} to="/help/how-the-two-fit-together">How the two sources fit together</Link>
      </p>

      <Typography component="h2" variant="h5" sx={{ mt: 3 }}>How it’s hosted</Typography>
      <p>
        Everything runs on a Raspberry Pi in my basement, from the PostgreSQL database to the .NET API and React site.
        The Pi is also a self-hosted GitHub Actions runner. A push to the main branch builds and deploys the app, and a
        scheduled job loads the weekly NADAC files.
      </p>

      <Typography component="h2" variant="h5" sx={{ mt: 3 }}>Why I built it</Typography>
      <p>
        At work I write SQL for data extracts and reporting. Outside of work, I built tutorial projects to
        practice designing a database, loading data, writing an API, building a front end, and deploying a server.
        DrugPricing is the first project I’ve built to keep running in production and share with others.
      </p>
      <p>
        I used official documentation, tutorials and a handful of books to build a tool for looking up
        NADAC prices and spotting changes over time. I plan to keep building and maintaining it. I’d like
        to hear from people I know, both inside and outside my industry, about what would make it more useful to them.
      </p>

      <Divider />
      <Typography component="h2" variant="h6" sx={{ mt: 2 }}>Data sources and disclaimer</Typography>
      <ul>
        <li><Link href="https://www.medicaid.gov/medicaid/prescription-drugs/pharmacy-pricing" target="_blank" rel="noopener noreferrer">CMS National Average Drug Acquisition Cost (NADAC)</Link></li>
        <li><Link href="https://www.fda.gov/drugs/drug-approvals-and-databases/national-drug-code-directory" target="_blank" rel="noopener noreferrer">FDA National Drug Code Directory</Link></li>
      </ul>
      <p>
        DrugPricing is an independent learning project. It isn’t affiliated with or endorsed by CMS or the FDA. NADAC
        estimates what retail community pharmacies pay to acquire drugs. It doesn’t show what patients pay at the pharmacy,
        and it isn’t a retail price or a reimbursement rate. The data may be incomplete or out of date. DrugPricing does
        not provide medical, financial or pricing advice.
      </p>

      <Typography component="h2" variant="h6" sx={{ mt: 2 }}>Icon credits</Typography>
      <ul>
        <li><Link href="https://www.flaticon.com/free-icons/medicine" target="_blank" rel="noopener noreferrer">Medicine icons by Freepik on Flaticon</Link></li>
        <li><Link href="https://www.flaticon.com/free-icons/graph" target="_blank" rel="noopener noreferrer">Graph icons by Bamicon on Flaticon</Link></li>
      </ul>
    </Box>
  );
}
