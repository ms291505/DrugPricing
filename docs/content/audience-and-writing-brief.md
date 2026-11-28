# DrugPricing writer handoff

Use this brief to revise the app copy, README, and user documentation. It records the author's intended audience and the questions that led him to build the app. The sample wording below is draft copy.

## Who opens the app, and why

Lead with someone who contracts with a pharmacy benefit manager (PBM) and looks closely at ingredient costs. They have their PBM report open, a drug in mind, and a practical question: two drugs cost their plan different amounts, so does the same gap appear in National Average Drug Acquisition Cost (NADAC), the public benchmark for pharmacy acquisition costs, and was the gap there a year ago?

Payers and benefits administrators come first in the examples because that is the author's world. The wider audience is anyone whose work connects them to prescription drug purchasing, including people at manufacturers and retail pharmacists who manage purchasing or know what their pharmacy pays. Interest in the details matters more than job title: someone who selects a fully insured vendor and delegates the details has less reason to visit, and a PBM analyst may already have an internal tool for these questions.

Many readers recognize NADAC by name, and while some know the benchmark well, others would appreciate a short account of where it comes from and how it is published. Let either reader start with a familiar drug. Portfolio reviewers are an implicit audience, especially for the README, so give them a concrete problem they can understand by seeing the tool in use. A curious patient might also visit after a conversation about a Humira copay, to get a sense of the scale of pharmacy acquisition costs. Treat that as an occasional use, because patient shopping, copay estimation, and cost of treatment are outside the app's purpose.

## The author's reason for building it

The author thinks about drug prices a lot at work and wanted to compare NADACs for several GLP-1 weight-loss drugs. His alternative would have been to look up each drug individually on the CMS website and write the figures in an Excel workbook. Comparing individual observations was feasible, but reconstructing the trend was much harder. Describe the kind of work he does, never his job title.

First-person passage used in the README: “I think about drug prices a lot at work, and I wanted to know whether the differences I saw in ingredient cost across GLP-1 drugs also showed up in NADAC. I could look up each drug on the CMS site and track the figures in Excel, but seeing how those differences had changed since last year was much harder, so I built DrugPricing to make that history easier to compare.”

About uses a revised version (2026-11-27) that states the goal as a comparison instead of a question, because the passage doesn't answer it: “I wanted to compare the differences I saw in ingredient cost across GLP-1 drugs with the differences in their NADACs.” It then names Zepbound before turning to strength. Its audience line reads: “DrugPricing is for payers, benefits administrators, data analysts, researchers, and anyone curious about drug prices. Questions like these come up often in drug pricing and purchasing:”

## Questions to build examples around

| Reader's question | What to show or explain |
| --- | --- |
| My PBM report shows different ingredient costs for two GLP-1 drugs. Does NADAC show a similar difference? Do the year-over-year changes in my report show up there too? | Compare the published histories over the same dates and on a comparable unit basis. The reader brings the plan figures. Someone with rebate information can also see how close their ingredient cost net of rebates comes to NADAC. Avoid implying the app imports PBM reports, calculates rebates, or determines what a plan pays. |
| Does this tablet have the same NADAC per tablet in different package sizes? Does the per-tablet benchmark vary with strength? | For the first question, compare packages within the same product and strength. For the second, compare products of the relevant strengths, holding dosage form and pricing unit consistent. Read the package detail when a product summary might conceal a difference. Keep the unit visible alongside the number. |
| After the Medicaid rebate cap ended, did insulin NADACs move in the direction the industry expected? When, and by how much? | Start with the regulatory action and what the industry expected it to do to list prices and acquisition costs, then examine the published history around the event. People make contracting decisions based on expectations about the market, so checking those expectations against observed changes has value even when the line chart alone cannot establish their cause. |
| Where did the benchmark start for a new drug? | Find the earliest NADAC observation available for the relevant product or package and follow it forward. Distinguish that first available observation from a launch price. |
| How does my acquisition cost compare? | A retail pharmacist can start with the package they purchased and compare the invoice figure with NADAC for the relevant date and pricing unit. |

The author's Medicare GLP-1 Bridge example explains **why strength is worth checking**. He noticed one manufacturer net price across strengths under the Bridge and wanted to know whether pharmacies paid the same for every strength. Bridge pricing and NADAC are separate measures, so use the observation to frame a question about the benchmark. If publishing a statement about Bridge terms or the insulin policy, verify its scope, dates, and wording against the relevant primary source. Verify any claimed NADAC result against the actual packages and dates shown.

## How to apply this across the project

- **Welcome and Learn the basics** — Open with an action someone came to take: “Look up a drug’s NADAC, compare products and packages, and see when the benchmark changed and by how much.” The Learn the basics cards then start with “Where NADAC comes from”, which a reader who knows the benchmark can skip, followed by one payer example and the cards that show what else the app does and how to read its prices. A first-time visitor should be able to try the example without understanding both data sources in advance.
- **README** — Open with the practical problem and the CMS-to-Excel workflow. Follow it with a short route through a comparison someone can try in the live app. Keep the learning-project background and engineering details available for portfolio readers.
- **About** — Explain the author's perspective and the roles of the sources. CMS supplies the NADAC history. The FDA directory helps readers identify products and packages. Describe the people who would reach for the tool through the questions they ask.
- **Help and onboarding** — Explain the benchmark's origin, publication, dates, and units where readers need them. Use a package-size or strength comparison to teach product and package detail. In comparison examples, name whose figure it is: the published NADAC per unit, the pharmacy's acquisition cost from its invoice, or the plan's ingredient cost from its PBM report. Keep treatment-cost calculations out of the examples.

Start with the [documentation index and writing guide](../README.md), which links to the current Welcome, About, and Help copy. Review the [project README](../../README.md) and [onboarding](../../client/src/Components/OnBoarding/OnBoarding.tsx) as well. Match existing control names and try any proposed walkthrough in the app before publishing it. A reader should be able to reproduce the comparison and tell which figures came from DrugPricing and which they would need to supply themselves.
