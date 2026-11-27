# Documentation

Start with the [project README](../README.md) for setup, architecture, and deployment. See
[AGENTS.md](../AGENTS.md) for development conventions and [Charts and explorer cards](../client/CHARTS.md)
for chart and card design rules.

## User-facing copy

- [Welcome](../client/src/Components/Welcome/Welcome.tsx) and its [Learn the basics cards](../client/src/Components/Welcome/ideas.ts)
- [About](../client/src/Components/About/About.tsx)
- [Help articles](../client/src/content/help/) and [topic catalog](../client/src/library/help.ts)
- [Audience and writing brief](content/audience-and-writing-brief.md): who opens the app, the
  questions examples are built around, and how each page should use them

## Writing style

- Use plain language throughout headings, labels, and body copy. Explain things the
  straightforward way: no slogans, wordplay, cute framing, roundabout setups, or “X is not Y”
  constructions. State the fact or tell the reader what to check. For example, “Check the
  pricing unit, strength, and package size before comparing prices.” Plain doesn’t mean short:
  when one thought depends on another, join them with a conjunction or a comma instead of
  splitting them into a run of short sentences.
- Disclaimers and cautions are the exception to “X is not Y”: when the likely misreading is
  the point, say plainly what a figure isn’t. For example, “NADAC doesn’t show what patients
  pay at the pharmacy.” Keep that caution wherever the prices are introduced.
- Use the serial comma in every list of three or more. For example, “It doesn’t import PBM
  reports, calculate rebates, or show what a plan pays.”
- Don’t state the author’s job; describe the kind of work. For example, “I think about drug
  prices a lot at work.” App copy and the README use the first person and never say “the
  author”. The README’s license section is exempt.
- Name the source document. Write “your PBM report”, not “your report”.
- Call a dated NADAC release an update: “the January 14, 2026 NADAC update”, not “the January
  14, 2026 file”. The Help article that explains publication (`nadac.md`) can still say weekly
  files.
- Use the reader’s professional terms. Write “acquisition cost”, not “what my pharmacy paid”.
  Frame market events as regulatory action and what the industry expected, not as “what you
  remember from the news”.
- Describe what the reader does in the app (“you can see how close…”), not what they might
  wonder (“you can ask…”).
- Name the specific control (“the line chart shows”), not a generic one (“the chart”).
- Address the reader directly for actions they can take in the app. For example, “Pin a chart
  to keep its data and dates when you search again.” When explaining the data, name the people
  or organizations involved. Say who submits invoices, who buys the drug, and who pays for a
  prescription.
- Use sentence case for headings and labels. When referring to an existing control, match
  its spelling and capitalization in the app.
- Keep Help topic IDs stable so existing links continue to work.

## Future work

- [Backlog](future-work.md) for decisions, cleanups, and ideas.
- [Search autocomplete](plans/autocomplete.md) for name suggestions and spelling corrections.
- [Observability](plans/observability.md) for proposed self-hosted monitoring.

## Reviews and analysis

- [November 13 browser review](reviews/2026-11-13-browser-review.md) records the discussion that
  led to the Search and Workspace changes.
- [NADAC pricing findings](../reporting/FINDINGS.md) document price events and comparisons.
- [NADAC price variation](../reporting/NADAC_PRICE_VARIATION.md) records the analysis behind
  the Price Activity cutoff and checks for gaps in the development data.
- [Test drugs](../reporting/TEST_DRUGS.md) lists searches for browser testing.
- [Analysis SQL](../reporting/sql/) contains the reporting queries.

## Where to put new documentation

Use `plans/` for active implementation plans, `reviews/` for dated review records, and
`content/` for draft user-facing copy. Keep decisions distinct from recommendations. When
work ships, remove the completed plan and update any links. Git history preserves earlier
plans and drafts. Keep specialized documentation beside the code or analysis it covers.
