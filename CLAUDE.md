## Agent skills

### Issue tracker

Issues live in GitHub Issues on `WebRunnerDev/portfolio` (via the `gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Frontend structure

Feature-Sliced Design: where new frontend code goes, how routes, shadcn and `contracts/` fit. See `docs/agents/fsd.md`.

### Performance budget

Design and UI changes keep every public page within Lighthouse mobile ≥ 90, LCP ≤ 2.5 s and JS ≤ 150 KB. The `lighthouse` check blocks the merge. Check a new library, font or effect against the budget first, including what design skills suggest. See "Performance budget" in `DESIGN.md`.
