/*
 * resume_builder.js — generic 2-page resume generator (docx).
 * Usage:
 *   1. Write resume_data.json (schema below) with the user's REAL content.
 *   2. npm install docx  (if not present)
 *   3. node resume_builder.js resume_data.json output_dir/
 *   4. Convert to PDF and VERIFY <= 2 pages before presenting.
 *
 * resume_data.json schema:
 * {
 *   "name": "First Last",
 *   "contact": "City, ST | email | phone | linkedin.com/in/x",
 *   "summary": "3-4 sentence summary tailored to the target job.",
 *   "jobs": [ { "company": "", "location": "", "title": "", "dates": "",
 *               "stack": "Tool1, Tool2", "bullets": ["XYZ bullet", ...] } ],
 *   "projects": [ { "name": "", "label": "", "stack": "", "bullet": "" } ],
 *   "skills": [ ["Category Label", "comma, separated, keywords"], ... ],
 *   "education": [ { "degree": "", "detail": "" } ]
 * }
 */
const {
  Document, Packer, Paragraph, TextRun, AlignmentType, LevelFormat,
  TabStopType, BorderStyle, convertInchesToTwip
} = require("docx");
const fs = require("fs");
const path = require("path");

const [,, dataPath, outDir = "."] = process.argv;
if (!dataPath) { console.error("usage: node resume_builder.js resume_data.json [outdir]"); process.exit(1); }
const D = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const S = 20;

const sectionHeader = (t) => new Paragraph({
  spacing: { before: 160, after: 60 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "444444" } },
  children: [new TextRun({ text: t, bold: true, size: 21, allCaps: true })],
});
const bullet = (t) => new Paragraph({
  numbering: { reference: "bullets", level: 0 }, spacing: { after: 40 },
  children: [new TextRun({ text: t, size: S })],
});
const skillBullet = (l, x) => new Paragraph({
  numbering: { reference: "bullets", level: 0 }, spacing: { after: 40 },
  children: [new TextRun({ text: l + ": ", bold: true, size: S }), new TextRun({ text: x, size: S })],
});
const jobHeader = (c, l) => new Paragraph({
  spacing: { before: 100, after: 0 },
  children: [new TextRun({ text: c, bold: true, size: 21 }), new TextRun({ text: l ? ` — ${l}` : "", size: S })],
});
const jobTitle = (t, d) => new Paragraph({
  spacing: { after: 20 },
  tabStops: [{ type: TabStopType.RIGHT, position: convertInchesToTwip(7.0) }],
  children: [new TextRun({ text: t, italics: true, size: S }), new TextRun({ text: `\t${d}`, size: S })],
});
const stackLine = (t) => new Paragraph({
  spacing: { after: 40 },
  children: [new TextRun({ text: "Stack: ", bold: true, size: 19, color: "444444" }),
             new TextRun({ text: t, size: 19, color: "444444" })],
});

const kids = [
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 }, children: [new TextRun({ text: D.name, bold: true, size: 40 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: D.contact, size: 19 })] }),
  sectionHeader("Professional Summary"),
  new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ size: S, text: D.summary })] }),
  sectionHeader("Professional Experience"),
];
for (const j of D.jobs) {
  kids.push(jobHeader(j.company, j.location), jobTitle(j.title, j.dates));
  if (j.stack) kids.push(stackLine(j.stack));
  for (const b of j.bullets) kids.push(bullet(b));
}
if (D.projects && D.projects.length) {
  kids.push(sectionHeader("Selected Projects"));
  for (const p of D.projects) {
    kids.push(jobHeader(p.name, p.label));
    if (p.stack) kids.push(stackLine(p.stack));
    kids.push(bullet(p.bullet));
  }
}
kids.push(sectionHeader("Technical Skills"));
for (const [l, x] of D.skills) kids.push(skillBullet(l, x));
kids.push(sectionHeader("Education"));
for (const e of D.education) {
  kids.push(new Paragraph({ spacing: { before: 40 }, children: [
    new TextRun({ text: e.degree, bold: true, size: S }),
    new TextRun({ text: " — " + e.detail, size: S }),
  ]}));
}

const doc = new Document({
  numbering: { config: [{ reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 320, hanging: 160 } } } }] }] },
  styles: { default: { document: { run: { font: "Calibri", size: S }, paragraph: { spacing: { line: 240 } } } } },
  sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 720, bottom: 720, left: 720, right: 720 } } }, children: kids }],
});
const out = path.join(outDir, (D.output_name || D.name.replace(/\s+/g, "_") + "_Resume") + ".docx");
Packer.toBuffer(doc).then(buf => { fs.writeFileSync(out, buf); console.log("wrote", out); });
