# Job Search Copilot — a Claude Skill

Turn your resume into a running job-search operation. Upload your resume once and Claude acts
as a senior recruiter: it tells you the 20 job titles you're most qualified for (with the exact
ATS keywords each one screens for), rebuilds your resume as a master template using Google's XYZ
formula, generates date-filtered Google queries to find jobs posted in the last 7 days, then
honestly triages every job link you paste (**Strong / Stretch / Skip** — with reasons), and
produces a tailored 2-page resume for each viable job plus a cumulative application tracker.

Built from a real job-search campaign: 60+ roles triaged, 36 tailored resumes, and every lesson
learned baked in as rules.

## What makes it different

**It won't lie for you.** The skill's core ruleset: never invent experience, every resume line
must survive a live interview follow-up, gaps get flagged so *you* can supply real examples,
screening-answer drafts use [brackets] for details only you can fill, and postings that ask for
no AI-generated content get respected. Tailoring means reframing your true experience in the
job's vocabulary — nothing more. That's why it produces interviews instead of awkward
conversations.

**It knows what actually works.** Stale-posting detection (closed Greenhouse jobs redirect to
the company board), the fact that Google's `after:` date filter only works when *you* run the
query in Google, keyword-variant doubling for ATS string matching ("A/B testing
(experimentation)"), the 10-second red-flag audit hiring managers actually run, and a tracker
that prevents double-applying — including importing your existing applications spreadsheet as
the starting point.

**It helps you stand out, not just apply.** A tailored resume is table stakes. This skill offers a
role-specific **proof-of-work** artifact for your best-fit jobs — a target-account teardown for a
BD role, a working tool for an Ops role, a campaign teardown for Marketing — that shows upfront you
can do the job. Built from *your* real experience (nothing fabricated), and paired with a cover
letter grounded in what you actually did, because a standout application beats a cold email.

## Install

Pick the method that matches how you use Claude.

> **Easiest, any plan (incl. Free):** grab [`job-search-copilot-standalone.md`](job-search-copilot-standalone.md),
> attach it to a new Claude chat, and say *"follow these instructions and help me with my job
> search."* It's the whole skill in one paste-in file (red-flag checklist included), with a
> text fallback for plans that can't generate files. No install required. The methods below give
> a more polished, persistent experience on paid plans.

### Claude app (claude.ai / desktop) — most people

The app has no plugin system — you upload the skill as a zip:

1. **Get the skill zip.** Download [`job-search-copilot-skill.zip`](job-search-copilot-skill.zip)
   (open the link, then use GitHub's **Download** button), or make one yourself by zipping the
   `skills/job-search-copilot/` folder. (Don't use GitHub's green **Code → Download ZIP**
   button — it wraps everything in an extra repo folder that the uploader won't accept.)
2. In Claude, open **Settings → Features → Skills** (also reachable via **Customize → Skills**)
   and make sure **code execution / file creation** is enabled.
3. Choose **Upload skill** and select the zip. Toggle it on.

A few facts, straight from [Anthropic's docs](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview):
- **Plan**: custom skills work on **Pro, Max, Team, or Enterprise** with code execution enabled.
  The **Free** tier can't upload custom skills.
- **Per-user**: on claude.ai each person uploads the skill to their own account — there's no
  org-wide install, and admins can't push it to everyone.
- **Trust**: the app only lets you add skills you trust. Since you know the author, it's safe.

### Claude Code — install as a plugin

In a Claude Code session, Claude Code downloads and installs it for you:

```
/plugin marketplace add blkdynamite/job-search-copilot
/plugin install job-search-copilot@job-search-copilot
```

Then run `/reload-plugins` (or restart). Update later with
`/plugin marketplace update job-search-copilot`. Installed as a plugin, the skill is namespaced —
invoke it explicitly with `/job-search-copilot:job-search-copilot`, and Claude also triggers it
automatically when you mention job hunting.

### Claude Code — manual copy

```bash
git clone https://github.com/blkdynamite/job-search-copilot.git
mkdir -p ~/.claude/skills
cp -r job-search-copilot/skills/job-search-copilot ~/.claude/skills/job-search-copilot
```

You should end up with `~/.claude/skills/job-search-copilot/SKILL.md`, available next session.

## Use

Start a new chat and say:

> **"Help me with my job search"**

That's it. The skill asks for your resume (and any spreadsheet of jobs you've already applied
to — it imports that as your tracker baseline), then follows its own lead: it analyzes,
rebuilds, hands you search queries to run in Google, and turns the links you paste back into
ranked verdicts and tailored resumes.

## The workflow

| Phase | You do | Claude does |
|---|---|---|
| 1. Recruiter analysis | Upload resume (+ old tracker if you have one) | Profile, 20 qualified titles, ATS keywords present vs. missing |
| 2. Master resume | Answer its questions (real metrics!) | XYZ-formula rewrite, red-flag audit, 2-page docx + pdf |
| 3. Fresh jobs | Run its Google queries, paste links back | Fetches, verifies still-open, reports dead links |
| 4. Applications | Decide, submit, report back | Strong/Stretch/Skip triage, tailored resume per job, tracker update |
| 5. Proof of work | Say yes, supply real specifics | Offers a role-specific artifact that shows you can do the job (account teardown, working tool, campaign teardown…), built from your real experience |

## What's inside

```
.claude-plugin/
├── marketplace.json            # lets Claude Code install this repo as a plugin
└── plugin.json                 # plugin manifest (name, version, author)
skills/
└── job-search-copilot/
    ├── SKILL.md                # the skill's full instructions
    ├── references/red_flags.md # 10-second red-flag audit + XYZ formula + ATS reality
    ├── references/proof_of_work.md # function→artifact map for the stand-out proof-of-work deliverable
    └── scripts/resume_builder.js # generic 2-page docx resume generator
```

The repo is both a **plugin marketplace** (for the `/plugin install` flow) and a plain **skill
folder** under `skills/` (for manual copy or app upload) — one copy of the skill, three ways to
install.

## Sharing and updating

Send friends the link to this repo. To update the skill later, edit the files under
`skills/job-search-copilot/`, bump the `version` in both `.claude-plugin/plugin.json` and
`.claude-plugin/marketplace.json`, commit, and push. Plugin users update with
`/plugin marketplace update job-search-copilot`; app and manual users re-download the folder.

## License

MIT — share it, fork it, improve it. PRs welcome, especially: new red flags you've seen
recruiters catch, ATS keyword patterns by industry, and job-board query templates beyond
Greenhouse / Lever / Ashby.
