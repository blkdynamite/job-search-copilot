# Job Search Copilot — a Claude Skill

Turn your resume into a running job-search operation. Upload your resume once and Claude acts as a senior recruiter: it tells you the 20 job titles you're most qualified for (with the exact ATS keywords each one screens for), rebuilds your resume as a master template using Google's XYZ formula, generates date-filtered Google queries to find jobs posted in the last 7 days, then honestly triages every job link you paste (Strong / Stretch / Skip — with reasons), and produces a tailored 2-page resume for each viable job plus a cumulative application tracker.

Built from a real job-search campaign: 60+ roles triaged, 36 tailored resumes, and every lesson learned baked in as rules.

## What makes it different

**It won't lie for you.** The skill's core ruleset: never invent experience, every resume line must survive a live interview follow-up, gaps get flagged so *you* can supply real examples, screening-answer drafts use [brackets] for details only you can fill, and postings that ask for no AI-generated content get respected. Tailoring means reframing your true experience in the job's vocabulary — nothing more. That's why it produces interviews instead of awkward conversations.

**It knows what actually works.** Stale-posting detection (closed Greenhouse jobs redirect to the company board), the fact that Google's `after:` date filter only works when *you* run the query in Google, keyword-variant doubling for ATS string matching ("A/B testing (experimentation)"), the 10-second red-flag audit hiring managers actually run, and a tracker that prevents double-applying — including importing your existing applications spreadsheet as the starting point.

## Install (2 minutes)

1. Download **`job-search-copilot.skill`** from the [Releases page](../../releases) — do **not** use GitHub's green "Code → Download ZIP" button (it wraps the folder incorrectly for Claude's upload).
2. If your computer complains about the file type, rename it to `job-search-copilot.zip` — same file.
3. In Claude (claude.ai or desktop): **Customize → Skills** (or Settings → Features → Skills). Make sure **Code execution & file creation** is enabled.
4. Click **+** → **Create skill** → upload the file. Toggle it on.

Works on Free, Pro, and Max plans. Each person installs to their own account.

## Use

Start a new chat and say:

> **"Help me with my job search"**

That's it. The skill will ask for your resume, and for any spreadsheet of jobs you've already applied to (it imports it as your tracker baseline). Then follow its lead: it analyzes, rebuilds, hands you search queries to run in Google, and turns the links you paste back into ranked verdicts and tailored resumes.

## The workflow

| Phase | You do | Claude does |
|---|---|---|
| 1. Recruiter analysis | Upload resume (+ old tracker if you have one) | Profile, 20 qualified titles, ATS keywords present vs. missing |
| 2. Master resume | Answer its questions (real metrics!) | XYZ-formula rewrite, red-flag audit, 2-page docx + pdf |
| 3. Fresh jobs | Run its Google queries, paste links back | Fetches, verifies still-open, reports dead links |
| 4. Applications | Decide, submit, report back | Strong/Stretch/Skip triage, tailored resume per job, tracker update |

## Repo contents

```
job-search-copilot/
├── SKILL.md                    # the skill's full instructions
├── references/red_flags.md    # 10-second red-flag audit + XYZ formula + ATS reality
└── scripts/resume_builder.js  # generic 2-page docx resume generator
```

## License

MIT — share it, fork it, improve it. PRs welcome, especially: new red flags you've seen recruiters catch, ATS keyword patterns by industry, and job-board query templates beyond Greenhouse/Lever/Ashby.
