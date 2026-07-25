# Job Search Copilot — a Claude Skill

Turn a resume into a running job-search operation. This is a [Claude Skill](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview):
a folder of instructions that teaches Claude to act as a senior recruiter and run the
whole pipeline for you — from analyzing your resume to producing tailored, interview-ready
resumes for real openings.

## What it does

Once installed, it triggers automatically whenever you mention job hunting or upload a
resume. It runs a five-part workflow:

1. **Recruiter analysis** — reads your resume and gives you a candidate profile, the 20 job
   titles you're most qualified for (grouped Core / Adjacent / Stretch), and the exact ATS
   keywords each title needs — flagging which you already have vs. which are missing.
2. **Master resume** — rewrites every bullet with Google's XYZ formula, runs a 10-second
   red-flag audit, and builds a clean 2-page master resume (`.docx` + `.pdf`).
3. **Fresh-job search queries** — hands you ready-to-paste, date-filtered Google queries so
   you find postings from the last 7 days instead of stale, closed listings.
4. **Honest triage** — you paste job links back; it ranks each **Strong / Stretch / Skip**
   with blunt reasons, so you don't waste hours on applications that can't land.
5. **Tailored resumes + tracker** — generates a tailored 2-page resume per viable job and
   maintains a running application tracker so you never double-apply.

**The honesty rules are the point:** it never invents experience, tools, titles, or metrics.
Tailoring means re-framing true material in the job's vocabulary — every line has to survive a
live interview follow-up.

## Install

Pick the method that matches how your friend uses Claude.

### Claude Code — install as a plugin (recommended)

This is the smoothest path: Claude Code downloads and installs it for you. In a Claude Code
session, run:

```
/plugin marketplace add blkdynamite/job-search-copilot
/plugin install job-search-copilot@job-search-copilot
```

Then run `/reload-plugins` (or restart). To update later, run
`/plugin marketplace update job-search-copilot`. Because it's installed as a plugin, the skill
is namespaced — you can invoke it explicitly with `/job-search-copilot:job-search-copilot`, and
Claude also triggers it automatically when you mention job hunting.

### Claude Code — manual copy (no plugin system)

```bash
git clone https://github.com/blkdynamite/job-search-copilot.git
mkdir -p ~/.claude/skills
cp -r job-search-copilot/skills/job-search-copilot ~/.claude/skills/job-search-copilot
```

You should end up with `~/.claude/skills/job-search-copilot/SKILL.md`. It's available next
session. To share it with a whole project/team instead, copy it into that repo's
`.claude/skills/` folder and commit it.

### Claude app (claude.ai / desktop)

The app doesn't use plugins — upload the skill folder instead:

1. Download this repo as a ZIP (green **Code** button → **Download ZIP**), or zip the
   `skills/job-search-copilot/` folder yourself.
2. In the Claude app, go to **Settings → Capabilities → Skills**.
3. Upload the zipped skill folder.

## Using it

Just start a conversation and say something like:

> "Help me find a job" — then upload your resume when it asks.

The skill takes over from there — it'll ask for your resume (and any spreadsheet of jobs
you've already applied to) and walk through each phase with you.

## What's inside

```
.claude-plugin/
├── marketplace.json          # lets Claude Code install this repo as a plugin
└── plugin.json               # plugin manifest (name, version, author)
skills/
└── job-search-copilot/
    ├── SKILL.md              # the workflow instructions Claude follows
    ├── references/red_flags.md   # the 10-second resume red-flag checklist
    └── scripts/resume_builder.js # generates the 2-page .docx resume
```

The repo is both a **plugin marketplace** (for the `/plugin install` flow) and a plain
**skill folder** under `skills/` (for manual copy or app upload) — one copy of the skill, two
ways to install.

## Sharing it

Send friends the link to this repo. To update the skill later, edit the files under
`skills/job-search-copilot/`, bump the `version` in both `.claude-plugin/plugin.json` and
`.claude-plugin/marketplace.json`, commit, and push. Plugin users get the update with
`/plugin marketplace update job-search-copilot`; manual users re-pull and re-copy.
