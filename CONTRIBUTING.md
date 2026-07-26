# Contributing

Thanks for wanting to improve Job Search Copilot. It's a Claude Skill — mostly plain-English
instructions plus one small Node script — so contributing is approachable even if you're not a
heavy developer.

## What's most welcome

- **New red flags** you've seen recruiters or ATS parsers actually catch (`skills/job-search-copilot/references/red_flags.md`).
- **ATS keyword patterns by industry** — the phrase-variants screening systems match on.
- **Job-board query templates** beyond Greenhouse / Lever / Ashby (`SKILL.md`, Phase 3).
- **Resume-quality heuristics** — better trimming, structure, or verification logic.
- **Bug fixes** in `scripts/resume_builder.js`.

## Repo layout

```
.claude-plugin/   marketplace.json, plugin.json   # Claude Code plugin manifests
skills/job-search-copilot/
├── SKILL.md                    # the workflow instructions (the "brain")
├── references/red_flags.md     # red-flag audit + XYZ formula + ATS reality
└── scripts/resume_builder.js   # generic 2-page docx generator
job-search-copilot-standalone.md # single paste-in copy of the skill (keep in sync with SKILL.md)
job-search-copilot-skill.zip     # generated upload artifact (regenerate when the skill changes)
```

**Important:** `SKILL.md` and `job-search-copilot-standalone.md` carry the same workflow. If you
change one, change the other so they don't drift.

## Editing the skill

The instructions are just Markdown. When editing `SKILL.md`, keep the YAML frontmatter valid:
- `name`: lowercase letters, numbers, hyphens only; ≤ 64 chars; no "claude"/"anthropic".
- `description`: ≤ 1024 characters.

## Working on the resume script

```bash
cd skills/job-search-copilot/scripts
npm install docx
# create a resume_data.json following the schema in the script header, then:
node resume_builder.js resume_data.json out/
# out/<Name>_Resume.docx should open cleanly in Word/Docs
```

Run `node --check resume_builder.js` before committing.

## Regenerate the upload artifact

If you changed anything under `skills/job-search-copilot/`, rebuild the zip so the one-click
download stays current:

```bash
( cd skills && zip -r ../job-search-copilot-skill.zip job-search-copilot -x '.*' )
```

## Validate the plugin

If you have the Claude Code CLI:

```bash
claude plugin validate .
```

## Pull requests

- Branch, make your change, and keep the diff focused.
- Note in the PR whether you updated **both** `SKILL.md` and the standalone file, and whether you
  regenerated the zip.
- Bump the `version` in `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` for
  user-facing changes, and add a `CHANGELOG.md` entry.

By contributing, you agree your contributions are licensed under the repository's MIT License.
