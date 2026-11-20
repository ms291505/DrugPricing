import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { Link as RouterLink } from "react-router";

/** The dialog supplies its own heading. */
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
        To match the two sources, I pad each segment of the FDA’s dashed package code to the CMS format. The app drops
        leading zeros from the resulting code for the join. Some packages appear in only one source, so I kept both ways
        to search. <Link component={RouterLink} to="/help/how-the-two-fit-together">How the two sources fit together</Link>
      </p>

      <Typography component="h2" variant="h5" sx={{ mt: 3 }}>How it’s hosted</Typography>
      <p>
        Everything runs on a Raspberry Pi in my basement, from the PostgreSQL database to the .NET API and React site.
        The Pi is also a self-hosted GitHub Actions runner. A push to the main branch builds and deploys the app, and a
        scheduled job loads the weekly NADAC files.
      </p>
      <p>
        I check the job logs and rely on my home network to tell me if the Pi goes down. When CMS once posted a weekly
        file with an unexpected name, I contacted them and added a fallback for that format while they corrected it.
      </p>

      <Typography component="h2" variant="h5" sx={{ mt: 3 }}>Why I built it</Typography>
      <p>
        At work I write a lot of SQL for data extracts and reporting. Outside of work, I built tutorial projects to
        practice designing a database, loading data, writing an API, building a front end, and deploying a server.
        DrugPricing is the first project I’ve built to keep running in production and share with others.
      </p>
      <p>
        The hardest part was deciding when I had enough to ship. I learned from official documentation, tutorials and a
        handful of books. I try to build things that will still make sense to me two weeks later, and the app keeps growing
        as I learn.
      </p>

      <Divider />
      <Typography component="h2" variant="h6" sx={{ mt: 2 }}>Data sources and disclaimer</Typography>
      <ul>
        <li><Link href="https://www.medicaid.gov/medicaid/prescription-drugs/pharmacy-pricing" target="_blank" rel="noopener noreferrer">CMS National Average Drug Acquisition Cost (NADAC)</Link></li>
        <li><Link href="https://www.fda.gov/drugs/drug-approvals-and-databases/national-drug-code-directory" target="_blank" rel="noopener noreferrer">FDA National Drug Code Directory</Link></li>
      </ul>
      <p>
        DrugPricing is an independent learning project. CMS and the FDA do not endorse it. NADAC estimates what retail
        community pharmacies pay to acquire drugs. Patient prices, retail prices and reimbursement rates are separate
        figures. The data may be incomplete or out of date. DrugPricing does not provide medical, financial or pricing advice.
      </p>

      <Typography component="h2" variant="h6" sx={{ mt: 2 }}>Icon credits</Typography>
      <ul>
        <li><Link href="https://www.flaticon.com/free-icons/medicine" target="_blank" rel="noopener noreferrer">Medicine icons by Freepik on Flaticon</Link></li>
        <li><Link href="https://www.flaticon.com/free-icons/graph" target="_blank" rel="noopener noreferrer">Graph icons by Bamicon on Flaticon</Link></li>
      </ul>
    </Box>
  );
}
