# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[1.1.0]: https://github.com/blkdynamite/job-search-copilot/releases/tag/v1.1.0
[1.0.0]: https://github.com/blkdynamite/job-search-copilot/releases/tag/v1.0.0
