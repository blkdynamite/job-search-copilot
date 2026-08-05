import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  LevelFormat,
  TabStopType,
  BorderStyle,
  convertInchesToTwip,
} from "docx";
import type { ResumeContent } from "./schema";

// Port of skills/job-search-copilot/scripts/resume_builder.js — same layout, returns a Buffer.
// Calibri, single column, standard section headings, Letter size, 0.5" margins (2-page oriented).
const S = 20; // body font half-points (10pt)

const sectionHeader = (t: string) =>
  new Paragraph({
    spacing: { before: 160, after: 60 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "444444" } },
    children: [new TextRun({ text: t, bold: true, size: 21, allCaps: true })],
  });

const bullet = (t: string) =>
  new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 40 },
    children: [new TextRun({ text: t, size: S })],
  });

const skillBullet = (l: string, x: string) =>
  new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 40 },
    children: [
      new TextRun({ text: l + ": ", bold: true, size: S }),
      new TextRun({ text: x, size: S }),
    ],
  });

const jobHeader = (c: string, l?: string) =>
  new Paragraph({
    spacing: { before: 100, after: 0 },
    children: [
      new TextRun({ text: c, bold: true, size: 21 }),
      new TextRun({ text: l ? ` — ${l}` : "", size: S }),
    ],
  });

const jobTitle = (t: string, d: string) =>
  new Paragraph({
    spacing: { after: 20 },
    tabStops: [{ type: TabStopType.RIGHT, position: convertInchesToTwip(7.0) }],
    children: [
      new TextRun({ text: t, italics: true, size: S }),
      new TextRun({ text: `\t${d}`, size: S }),
    ],
  });

const stackLine = (t: string) =>
  new Paragraph({
    spacing: { after: 40 },
    children: [
      new TextRun({ text: "Stack: ", bold: true, size: 19, color: "444444" }),
      new TextRun({ text: t, size: 19, color: "444444" }),
    ],
  });

export async function buildDocx(D: ResumeContent): Promise<Buffer> {
  const kids: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 20 },
      children: [new TextRun({ text: D.name, bold: true, size: 40 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [new TextRun({ text: D.contact, size: 19 })],
    }),
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
    kids.push(
      new Paragraph({
        spacing: { before: 40 },
        children: [
          new TextRun({ text: e.degree, bold: true, size: S }),
          new TextRun({ text: " — " + e.detail, size: S }),
        ],
      })
    );
  }

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 320, hanging: 160 } } },
            },
          ],
        },
      ],
    },
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: S },
          paragraph: { spacing: { line: 240 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        children: kids,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
