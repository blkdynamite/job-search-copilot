# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] — 2026-07-29

### Added
- **Phase 5 — Proof of work**: for each Strong/Stretch job, the skill now offers a role-specific
  artifact that shows the candidate can do the job (BD/Sales → target-account teardown; Ops → a
  working tool/model/SOP; Marketing → campaign teardown; and function-matched artifacts for CS,
  Recruiting, and a generic 30-60-90 / problem-analysis fallback), built on the user's confirmation.
- `references/proof_of_work.md` — the function→artifact map plus honesty guardrails (real evidence
  only, hypotheticals labeled as such, focus on the listed role, respect no-AI postings).
- **Intake-driven cover letters** — the skill now asks the user to describe their relevant
  experience, impact, and what draws them to the company, and drafts only from that real input;
  no-AI postings get an outline + the user's own talking points to write themselves.
- **Two new honesty rules** — never fabricate proof of work, and focus every artifact on the
  listed job — plus a "quality beats volume" note steering toward exceptional complete
  applications over cold-email spray, and a new **Proof of work** column in the tracker.

### Changed
- Applied all of the above to both `SKILL.md` and the standalone paste-in file (map inlined there),
  and regenerated `job-search-copilot-skill.zip`.

## [1.1.0] — 2026-07-26

### Added
- **Reviewer pass** on every tailored resume — a fresh-eyes critique from the screening
  recruiter's perspective (generic phrasing, unmapped claims, missing must-have keywords),
  followed by one revision, before the resume is presented (Phase 4).
- **ATS verification check** after a resume is built — confirms contact line, single-column
  reading order, standard headings, and reports target-keyword coverage honestly instead of
  keyword-stuffing (Phase 2).
- **Relevance-weighted trimming** — when a resume runs long, lines are cut by lowest relevance /
  uniqueness / cover-letter overlap rather than mechanically by age (Phase 2).

### Changed
- Applied the three upgrades above to both `SKILL.md` and the standalone paste-in file, and
  regenerated `job-search-copilot-skill.zip`.

## [1.0.0] — 2026-07-25

### Added
- Initial release: the full recruiter workflow in `SKILL.md` — recruiter analysis, master
  resume (Google XYZ formula + 10-second red-flag audit), date-filtered job-search queries,
  honest Strong/Stretch/Skip triage, tailored resume per job, and a cumulative application
  tracker.
- `references/red_flags.md` — the red-flag audit, XYZ formula, and ATS-scoring reality.
- `scripts/resume_builder.js` — generic 2-page `.docx` resume generator.
- Packaged as a Claude Code **plugin** (`.claude-plugin/marketplace.json` + `plugin.json`) and a
  plain **skill folder** under `skills/`, plus a single self-contained
  `job-search-copilot-standalone.md` for pasting into the Claude app on any plan.
- Graceful fallback to copy-paste text/Markdown when the runtime can't generate files.
- `README.md`, `LICENSE` (MIT), and a committed `job-search-copilot-skill.zip` download.

[1.2.0]: https://github.com/blkdynamite/job-search-copilot/releases/tag/v1.2.0
[1.1.0]: https://github.com/blkdynamite/job-search-copilot/releases/tag/v1.1.0
[1.0.0]: https://github.com/blkdynamite/job-search-copilot/releases/tag/v1.0.0
