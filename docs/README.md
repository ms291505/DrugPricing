# Documentation

Start with the [project README](../README.md) for setup and architecture, and
[AGENTS.md](../AGENTS.md) for development conventions and known rough edges.

## Plans and backlog

- [Future work](future-work.md): backlog, established directions and links to detailed plans.
- [Browser usability](plans/browser-usability.md): active discussion draft for results,
  price activity, chart creation, navigation and the workspace transition.
- [Topic-based Help](plans/help.md): proposed modal-first help, shared topic pages and content
  migration; discussion draft, not an approved implementation plan.
- [Search filters](plans/search-filters.md): design and implementation record for the shared
  search criteria and filtering experience.
- [Autocomplete](plans/autocomplete.md): planned search suggestions and spelling corrections.
- [Observability](plans/observability.md): proposed self-hosted monitoring.

## Reviews and content

- [Browser review — November 13, 2026](reviews/2026-11-13-browser-review.md): annotation
  observations, confirmed decisions, recommendations and open questions.
- [Help content](content/help.md): draft in-app reference copy, source notes and pre-publication
  checks. Describes current behavior; reconcile affected pages with the usability plan as
  changes ship. It is not published help or an approved implementation plan.

## Documentation beside the code and data

- [Chart and card guidance](../client/CHARTS.md)
- [Pricing analysis findings](../reporting/FINDINGS.md)
- [Search examples and test drugs](../reporting/TEST_DRUGS.md)
- [Analysis SQL](../reporting/sql/)

## Organization

Use `plans/` for intended behavior, decisions and implementation steps; `reviews/` for dated
observations and discussion records; and `content/` for draft user-facing copy. Keep decisions
distinct from recommendations. Link between related documents instead of copying their detail
into the backlog. Paths in inline code are repository-relative unless stated otherwise;
Markdown links are relative to the document containing them.

Keep `README.md`, `AGENTS.md` and `CLAUDE.md` at the repository root. Keep specialized guidance
beside the code or analysis it governs.
