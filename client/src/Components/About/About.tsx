import Typography from "@mui/material/Typography"
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";

export default function About() {

  return (
    <>
      <Box>
        <Typography component="h2" variant="h5">About</Typography>
        <p>
          DrugPricing is a tool for looking up what US pharmacies pay for drugs and how those prices change over time. It is built on
          NADAC (National Average Drug Acquisition Cost), a weekly price survey published by CMS. I chose NADAC because it is publicly available,
          covers tens of thousands of drug packages, and has several years of history, so users can track a drug's price over time.
        </p>

        <Typography component="h2" variant="h5" sx={{ mt: 3 }}>Two Tools, Two Data Sources</Typography>
        <p>
          The app has two search tools, and both answer the same question: what's the NADAC for this drug? The difference is how you
          find the drug.
        </p>
        <ol>
          <li>
            <strong>NADAC Search</strong> is a simple search tool. Type part of a drug description or an NDC, pick a date range, and you get every
            matching package with its price history. It searches all of the NADAC data and nothing else.
          </li>
          <li>
            <strong>FDA Search</strong> provides more advanced features. It searches the FDA's NDC Directory, which describes each product and
            package in much more detail than NADAC does (brand and generic names, dosage form, route, labeler, and so on), and then pulls in the
            NADAC prices for whatever matches. The trade-off is that it can only show prices for packages that appear in both the FDA data
            and NADAC.
          </li>
        </ol>

        <Typography component="h2" variant="h5" sx={{ mt: 3 }}>Joining the Data</Typography>
        <p>
          Having two sources means the data has to be joined. The only thing NADAC and the FDA have in common is the NDC (National Drug
          Code), and they don't write it the same way. The FDA publishes dashed, 10-digit codes in three different layouts, while NADAC
          uses 11-digit codes without dashes. I standardize both to the same 11-digit form so that a package can be matched between them.
        </p>
        <p>
          Even after that, the two sources don't line up completely. Roughly a quarter of the NDCs in NADAC don't match a package in the
          current FDA directory. Products that have been discontinued drop out of the FDA's file but still have years of NADAC prices, and
          some packages just never show up on both sides. Rather than force a constraint between the two, I kept them independent, which
          is why NADAC Search is still there: it never loses a price because the FDA doesn't know about the package.
        </p>

        <Typography component="h2" variant="h5" sx={{ mt: 3 }}>How It's Hosted</Typography>
        <p>
          Everything runs on a Raspberry Pi in my basement: the PostgreSQL database, the .NET API, and the React site. The Pi is also
          a self-hosted GitHub Actions runner, so merging to the main branch builds and deploys the new version automatically. A
          scheduled job on the Pi downloads each week's NADAC file and loads it, so the prices stay current without me having to
          do anything.
        </p>
        <p>
          For now, monitoring is pretty basic. I check the logs every few days to make sure everything is running right, and my home
          network alerts me if the Pi goes down. I don't have anything more advanced yet to confirm that the site is up or that the
          jobs ran without errors, but I intend to add that eventually. So far the jobs have failed only once: CMS posted a weekly
          NADAC file with a different date format in the file name. I emailed their contact address, and they replied that it was a
          mistake and corrected it. In the meantime, I added handling for the new format that can be turned on with an environment
          variable. In theory, I could use that to respond to a failure like this automatically if it happens again.
        </p>

        <Typography component="h2" variant="h5" sx={{ mt: 3 }}>Why I Built It</Typography>
        <p>
          The overarching goal of this project is to learn how to do these things. At work I write a lot of SQL for data extracts and
          reporting, and outside of work I've built other tutorial projects to practice designing a database, building an ETL process,
          writing an API, building a front end, and deploying a server. This is the first one I actually intend to keep in production
          and show people.
        </p>
        <p>
          That made the hardest part of the project deciding how much was enough to ship: figuring out the point where I had something
          I could start showing people, rather than continuing to add one more feature. Everything here is self-taught through official
          documentation, tutorials, and a handful of books, and I by no means claim to be an expert. I try to build things that will
          still make sense to me two weeks later, and the app keeps growing as I learn.
        </p>

        <Divider />
        <Typography component="h2" variant="h6" sx={{ mt: 2 }}>Attributions</Typography>
        <p>The price and drug data come from two public sources:</p>
        <ol>
          <li>
            <a href="https://www.medicaid.gov/medicaid/prescription-drugs/pharmacy-pricing/index.html" style={{ color: "grey" }} target="_blank" title="NADAC">National Average Drug Acquisition Cost (NADAC) - Centers for Medicare & Medicaid Services</a>
          </li>
          <li>
            <a href="https://www.fda.gov/drugs/drug-approvals-and-databases/national-drug-code-directory" style={{ color: "grey" }} target="_blank" title="FDA NDC Directory">National Drug Code Directory - U.S. Food and Drug Administration</a>
          </li>
        </ol>
        <p>
          DrugPricing is a personal learning project and is not affiliated with or endorsed by CMS or the FDA. NADAC is a survey-based
          estimate of what retail community pharmacies pay to acquire a drug. It is not what a patient pays, a retail price, or a
          reimbursement rate. The data may be incomplete or out of date, and nothing here is medical, financial, or pricing advice.
        </p>
        <p>The medicine and bar graph icons are a free resource from Flaticon, and are available here: </p>
        <ol>
          <li>
            <a href="https://www.flaticon.com/free-icons/medicine" style={{ color: "grey" }} target="_blank" title="medicine icons">Medicine icons created by Freepik - Flaticon</a>
          </li>
          <li>
            <a href="https://www.flaticon.com/free-icons/graph" style={{ color: "grey" }} target="_blank" title="graph icons">Graph icons created by Bamicon - Flaticon</a>
          </li>
        </ol>
      </Box>
    </>
  );
}
