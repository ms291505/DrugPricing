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
          covers tens of thousands of drug packages, and has several years of history, which makes for some interesting charts.
        </p>

        <Typography component="h2" variant="h5" sx={{ mt: 3 }}>Two Tools, Two Data Sources</Typography>
        <p>
          The app is split into two search tools that answer different questions:
        </p>
        <ol>
          <li>
            <strong>NADAC Search</strong> is the simple one. Type part of a drug description or an NDC, pick a date range, and you get every
            matching package with its price history. It searches all of the NADAC data and nothing else.
          </li>
          <li>
            <strong>FDA Search</strong> is for more advanced filtering. It searches the FDA's NDC Directory, which describes each product and
            package in much more detail than NADAC does (brand and generic names, dosage form, route, labeler, and so on), and then pulls in the
            NADAC prices for whatever matches. This is the tool to use when you want to narrow a broad search down, or compare products with
            each other rather than look up a single package.
          </li>
        </ol>

        <Typography component="h2" variant="h5" sx={{ mt: 3 }}>Joining the Data</Typography>
        <p>
          Having two sources means the data has to be joined, and that turned out to be the hardest part of the project. The only thing
          NADAC and the FDA have in common is the NDC (National Drug Code), and they don't write it the same way. The FDA publishes dashed,
          10-digit codes in three different layouts, while NADAC uses 11-digit codes without dashes. I standardize both to the same 11-digit
          form so that a package can be matched between them.
        </p>
        <p>
          Even after that, the two sources don't line up completely. Roughly a quarter of the NDCs in NADAC don't match a package in the
          current FDA directory. Products that have been discontinued drop out of the FDA's file but still have years of NADAC prices, and
          some packages just never show up on both sides. Rather than force a constraint between the two, I kept them independent. That
          is why there are two tools: NADAC Search never loses a price because the FDA doesn't know about the package, and FDA Search
          trades that completeness for much better filtering.
        </p>
        <p>
          The FDA data has its own quirks too. A product's ID changes every time its record is updated, so I key products on the
          product NDC instead, and a single file can list the same product more than once with different packages, which the
          load has to merge. A product usually has several packages with their own prices, so charts at the product level show the
          average across packages along with their range.
        </p>

        <Typography component="h2" variant="h5" sx={{ mt: 3 }}>How It's Hosted</Typography>
        <p>
          Everything runs on a Raspberry Pi at my house: the PostgreSQL database, the .NET API, and the React site. The Pi is also
          a self-hosted GitHub Actions runner, so merging to the main branch builds and deploys the new version automatically. A
          scheduled job on the Pi downloads each week's NADAC file and loads it, so the prices stay current without me having to
          do anything.
        </p>

        <Typography component="h2" variant="h5" sx={{ mt: 3 }}>Why I Built It</Typography>
        <p>
          The overarching goal of this project is to learn how to do these things. At work I write a lot of SQL for data extracts and
          reporting, but I had never designed a database, built an ETL process, written an API, built a front end, or deployed and
          maintained a server on my own. This project is how I'm teaching myself each of those pieces, end to end, using official
          documentation, tutorials, and a handful of books (especially "Eloquent JavaScript"). I by no means claim to be an expert. I try
          to build things that will still make sense to me two weeks later, and the app keeps growing as I learn.
        </p>

        <Divider />
        <Typography component="h2" variant="h6" sx={{ mt: 2 }}>Attributions</Typography>
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
