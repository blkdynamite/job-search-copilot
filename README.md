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

The skill is the `skill/` folder in this repo. Installing it means putting that folder where
your Claude can find it.

### Claude Code (CLI)

```bash
# clone the repo
git clone https://github.com/blkdynamite/job-search-copilot.git

# copy the skill folder into your personal skills directory
mkdir -p ~/.claude/skills
cp -r job-search-copilot/skill ~/.claude/skills/job-search-copilot
```

That's it — the next time you start Claude Code, it's available. You should end up with
`~/.claude/skills/job-search-copilot/SKILL.md`.

To share it with a whole project/team instead of just yourself, copy it into that repo's
`.claude/skills/` folder and commit it.

### Claude app (claude.ai / desktop)

1. Download this repo as a ZIP (green **Code** button → **Download ZIP**), or zip the `skill/`
   folder yourself.
2. In the Claude app, go to **Settings → Capabilities → Skills**.
3. Upload the zipped skill folder.

## Using it

Just start a conversation and say something like:

> "Help me find a job" — then upload your resume when it asks.

The skill takes over from there — it'll ask for your resume (and any spreadsheet of jobs
you've already applied to) and walk through each phase with you.

## What's inside

```
skill/
├── SKILL.md                  # the workflow instructions Claude follows
├── references/red_flags.md   # the 10-second resume red-flag checklist
└── scripts/resume_builder.js # generates the 2-page .docx resume
```

## Sharing it

Send friends the link to this repo. To update the skill later, edit the files in `skill/`,
commit, and push — anyone who cloned it just re-pulls and re-copies the folder.
