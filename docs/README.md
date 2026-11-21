# Documentation

Start with the [project README](../README.md) for setup, architecture and deployment. See
[AGENTS.md](../AGENTS.md) for development conventions and [Charts and explorer cards](../client/CHARTS.md)
for chart and card design rules.

## User-facing copy

- [Welcome](../client/src/Components/Welcome.tsx)
- [About](../client/src/Components/About/About.tsx)
- [Help articles](../client/src/content/help/) and [topic catalog](../client/src/library/help.ts)

## Writing style

- Use direct, plain language throughout headings, labels and body copy. Avoid slogans,
  wordplay and “X is not Y” constructions. State the fact or tell the reader what to check.
  For example, “Check the pricing unit, strength and package size before comparing prices.”
- Disclaimers and cautions are the exception: when the likely misreading is the point, say
  plainly what a figure isn’t. For example, “NADAC doesn’t show what you’ll pay at the
  pharmacy.” Keep that caution wherever the prices are introduced.
- Use sentence case for headings and labels. When referring to an existing control, match
  its spelling and capitalization in the app.
- Keep Help topic IDs stable so existing links continue to work.

## Future work

- [Backlog](future-work.md) for decisions, cleanups and ideas.
- [Search autocomplete](plans/autocomplete.md) for name suggestions and spelling corrections.
- [Focus and touch cleanup](plans/focus-and-touch-cleanup.md) for moving focus from code only
  when needed, and opening price change charts in a dialog.
- [Browser usability cleanup](plans/browser-usability-cleanup.md) for the remaining
  refactoring and bug fixes from the November 19 review.
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
