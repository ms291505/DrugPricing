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
        DrugPricing lets you look up the National Average Drug Acquisition Cost (NADAC), compare products and packages,
        and see when the benchmark changed and by how much. The Centers for Medicare &amp; Medicaid Services (CMS)
        publishes NADAC weekly. It estimates what retail community pharmacies pay to buy drugs.
      </p>

      <Typography component="h2" variant="h5" sx={{ mt: 3 }}>Why I built it</Typography>
      <p>
        I manage a retiree healthcare plan. I wanted to know whether the differences I saw in ingredient cost across
        GLP-1 drugs also showed up in NADAC. I could look up each drug on the CMS site and keep track of the figures in
        Excel. The harder question was how those differences had changed since last year. I built DrugPricing to make
        that history easier to compare.
      </p>
      <p>
        Strength turned out to be worth checking too. When I saw that GLP-1 strengths would be priced the same under the
        Medicare GLP-1 Bridge, I wondered whether they were priced differently further up the supply chain. NADAC let me
        check that benchmark across strengths.
      </p>

      <Typography component="h2" variant="h5" sx={{ mt: 3 }}>Who it’s for</Typography>
      <p>
        DrugPricing is for people whose work connects them to prescription drug purchasing and who look closely at the
        details: payers and benefits administrators, people at manufacturers, and pharmacists who manage purchasing.
        They usually arrive with a question.
      </p>
      <ul>
        <li>My PBM report shows different ingredient costs for two drugs. Does NADAC show a similar gap, and was it there a year ago?</li>
        <li>Does this tablet have the same NADAC per tablet in every package size, or at every strength?</li>
        <li>After insulin list prices were cut, did NADAC move when and as much as people expected?</li>
        <li>Where did the benchmark start for a new drug?</li>
        <li>How does what my pharmacy paid compare with the benchmark?</li>
      </ul>
      <p>
        <Link component={RouterLink} to="/help/things-to-try">Things to try</Link> walks through each one.
      </p>

      <Typography component="h2" variant="h5" sx={{ mt: 3 }}>The two sources</Typography>
      <p>
        CMS supplies the price history. The FDA’s National Drug Code (NDC) Directory helps you identify products and
        packages by brand or generic name, strength, dosage form, route and labeler. Each search starts from one of them.
      </p>
      <ul>
        <li>
          <strong>FDA search</strong> finds products and packages in the FDA directory and shows NADAC prices for the
          matching packages.
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

      <Typography component="h2" variant="h5" sx={{ mt: 3 }}>How I built it</Typography>
      <p>
        At work I write SQL for data extracts and reporting. Outside of work, I built tutorial projects to
        practice designing a database, loading data, writing an API, building a front end, and deploying a server.
        DrugPricing is the first project I’ve built to keep running in production and share with others. I used
        official documentation, tutorials and a handful of books to build it.
      </p>
      <p>
        Everything runs on a Raspberry Pi in my basement, from the PostgreSQL database to the .NET API and React site.
        The Pi is also a self-hosted GitHub Actions runner. A push to the main branch builds and deploys the app, and a
        scheduled job loads the weekly NADAC files.
      </p>
      <p>
        I plan to keep building and maintaining it. I’d like to hear from people I know, both inside and outside my
        industry, about what would make it more useful to them.
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
