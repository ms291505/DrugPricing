import Typography from "@mui/material/Typography"
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";

export default function Welcome() {

  return (
    <>

      <Typography variant="h1">Welcome.</Typography>
      <Divider sx={{ mb: 2 }} />
      <Container maxWidth="lg">
        <Typography variant="body1">
          <Typography variant="h3">About</Typography>
          <p>
            This demo website showcases some skills that I've developed over the last few years specific to full stack webapp development and deployment.
            The website is a tool for users to search and chart drug pricing data over time. I chose NADAC because it is easily available,
            extensive, and covers about 5 years, allowing for some interesting visualizations.
            <ol>
              <li>Python, JavaScript (TypeScript), and C#</li>
              <li>React, including some popular related libraries:</li>
              <ul>
                <li>Material UI</li>
                <li>Tanstack Query</li>
                <li>React Router</li>
              </ul>
              <li>.NET, including:</li>
              <ul>
                <li>Entity Framework Core</li>
              </ul>
              <li>Administering a PostgreSQL Database
                <ul>
                  <li>
                    At work, I frequently write queries for data extracts and reporting, but have never written to or administered a DB professionally.
                  </li>
                </ul>
              </li>
              <li>Data Transformation and Loading
                <ul>
                  <li>
                    Creating a process that's easy to manage using to download data from publicly available APIs, filter and validate records, and insert fresh data into a database.
                  </li>
                </ul>
              </li>
            </ol>
          </p>
          <p>
            These skills are all "self-taught" through a combination of official tutorials found in documentation, other tutorials on YouTube, and a handful of books (especially "Eloquent JavaScript").
            I've attempted to follow SOLID principles, but I by no means claim to be an expert. I try to create things that make sense to me two weeks later, and the SOLID principles have added structure to these attempts.
            I use AI tools to generate some code for this project (e.g., "create python classes based on these C# classes") and when I am stuck on an issue I can't figure out with the docs.
          </p>

          <Typography variant="h3">Ideas & Challenges</Typography>
          <p>There were some key points in this project that I'd like to use to explain my thought process in designing this tool.</p>
          <ol>
            <Typography variant="h5"><li>Optimizing the NDC Description Search</li></Typography>
            <p>My original intention was to keep the models for the server and database as close to the source data as possible. I generally achieved this
              but found that I was initially slowing down my database calls for searches on the NdcDescription field, given that there are weekly entries covering multiple years for
              each package in the NADAC data. Therefore, the database was scanning millions of rows for every search, which meant operations were slower than I wanted them to be. I struggled to
              find a way to optimize this because I was focused on finding some sort of built in way with PostgreSQL to speed it up. It eventually occured to me that my problem wasn't that my text search was slow
              it was that I was searching too much repetative text. At that point I added a new DrugPackage model to represent each unqiue combination of NDC and NdcDescription in the NADAC data,
              which could be joined to the NadacPrice table using NDC as a foreign key. Now searches were much faster, quickly scanning through the DrugPackage table to find the NDCs needed to generate
              results on the NadacPrice table. Swapping to this strategy was simple and reduced searches on my localhost from over 300ms to around 3ms.
            </p>
            <Typography variant="h5"><li>Integrating FDA Data</li></Typography>
            <p>
              The FDA publishes some data about drug products and packages that I think allow for some neat ways to search and filter the NADAC data.
              Unfortuntately, there are some significant gaps between the NDCs in the NADAC data and the package NDCs in the FDA data. I believe that most of these
              gaps are found in OTC drugs, but I did not want to force a foreign key contraint between NADAC and FDA data. In short, I want users to be able to search
              all of the NADAC data, not just packages that match the FDA database. As a result I currently have two separate sets of tools: one for searching the relatively barebones
              NADAC data, and a another for more detailed searching and filtering of the FDA data with all relevant pricing. In the future, I'd like to dig into these gaps more
              and try to come up with a better integreation of the data sources, if possible. For now on the backend, it's a simple join from FdaPackage to NadacPrice.
            </p>
          </ol>
          <Divider />
          <Typography variant="h6">Attributions</Typography>
          <p>The medicine icon is a free resouce from Flaticon, and is available here:
            <a href="https://www.flaticon.com/free-icons/medicine" title="medicine icons">Medicine icons created by Freepik - Flaticon</a>
          </p>
        </Typography>
      </Container>
    </>
  );
}
