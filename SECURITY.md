# Security

## What this skill does with code

Job Search Copilot is mostly instructions. The only executable code it ships is
`skills/job-search-copilot/scripts/resume_builder.js`, a Node script that:

- reads a local `resume_data.json` you (or Claude) create,
- generates a `.docx` resume using the open-source [`docx`](https://www.npmjs.com/package/docx) library,
- writes the file to a local output directory.

It makes **no network calls**, sends **no data anywhere**, and reads nothing beyond the input
JSON you give it. The only network activity in normal use is the one-time `npm install docx` you
run yourself. Your resume content stays on whatever machine or sandbox Claude is running in.

## Installing skills safely

Agent Skills give Claude new instructions and code, so only install skills from sources you
trust — as you would with any software. Before installing this one, you're encouraged to read
the whole thing: `SKILL.md`, `references/red_flags.md`, and `resume_builder.js` are short and
plain. Nothing here fetches remote code or reaches out to external services.

## Reporting a vulnerability

If you find a security issue — for example, a way the script could be made to write outside its
output directory, or anything in the instructions that could cause unintended data exposure —
please report it privately rather than opening a public issue:

- Use GitHub's **[Private vulnerability reporting](https://github.com/blkdynamite/job-search-copilot/security/advisories/new)**
  (Security tab → Report a vulnerability), or
- open a minimal public issue asking a maintainer to reach out, without disclosing details.

Please include what you found, how to reproduce it, and the impact. We'll acknowledge and work
on a fix, and credit you if you'd like.

## Scope

In scope: the script, the skill instructions, and the packaging in this repository. Out of
scope: vulnerabilities in Claude, the `docx` library, or your own environment's configuration.
