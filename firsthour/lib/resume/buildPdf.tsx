import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { ResumeContent } from "./schema";

// PDF twin of buildDocx — same content, same order, single column. Uses react-pdf's built-in
// Helvetica (docx uses Calibri); acceptable cosmetic divergence for v1. Letter size, 0.5" margins.
const styles = StyleSheet.create({
  page: { paddingVertical: 36, paddingHorizontal: 36, fontSize: 10, fontFamily: "Helvetica", color: "#111111", lineHeight: 1.25 },
  name: { fontSize: 20, fontFamily: "Helvetica-Bold", textAlign: "center", marginBottom: 2 },
  contact: { fontSize: 9, textAlign: "center", marginBottom: 8, color: "#333333" },
  sectionHeader: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    marginTop: 8,
    marginBottom: 3,
    paddingBottom: 2,
    borderBottomWidth: 0.75,
    borderBottomColor: "#444444",
  },
  summary: { marginBottom: 2 },
  jobHeaderRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 5 },
  company: { fontFamily: "Helvetica-Bold", fontSize: 10.5 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 1 },
  jobTitle: { fontFamily: "Helvetica-Oblique" },
  stack: { fontSize: 9, color: "#444444", marginBottom: 2 },
  bulletRow: { flexDirection: "row", marginBottom: 2, paddingLeft: 4 },
  bulletDot: { width: 8 },
  bulletText: { flex: 1 },
  skillRow: { flexDirection: "row", marginBottom: 2, paddingLeft: 4 },
  eduRow: { marginTop: 2 },
  bold: { fontFamily: "Helvetica-Bold" },
});

const Bullet = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.bulletRow}>
    <Text style={styles.bulletDot}>•</Text>
    <Text style={styles.bulletText}>{children}</Text>
  </View>
);

function ResumeDoc({ D }: { D: ResumeContent }) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.name}>{D.name}</Text>
        <Text style={styles.contact}>{D.contact}</Text>

        <Text style={styles.sectionHeader}>Professional Summary</Text>
        <Text style={styles.summary}>{D.summary}</Text>

        <Text style={styles.sectionHeader}>Professional Experience</Text>
        {D.jobs.map((j, i) => (
          <View key={i} wrap={false}>
            <View style={styles.jobHeaderRow}>
              <Text>
                <Text style={styles.company}>{j.company}</Text>
                {j.location ? <Text> — {j.location}</Text> : null}
              </Text>
            </View>
            <View style={styles.titleRow}>
              <Text style={styles.jobTitle}>{j.title}</Text>
              <Text>{j.dates}</Text>
            </View>
            {j.stack ? (
              <Text style={styles.stack}>
                <Text style={styles.bold}>Stack: </Text>
                {j.stack}
              </Text>
            ) : null}
            {j.bullets.map((b, k) => (
              <Bullet key={k}>{b}</Bullet>
            ))}
          </View>
        ))}

        {D.projects && D.projects.length ? (
          <>
            <Text style={styles.sectionHeader}>Selected Projects</Text>
            {D.projects.map((p, i) => (
              <View key={i} wrap={false}>
                <View style={styles.jobHeaderRow}>
                  <Text>
                    <Text style={styles.company}>{p.name}</Text>
                    {p.label ? <Text> — {p.label}</Text> : null}
                  </Text>
                </View>
                {p.stack ? (
                  <Text style={styles.stack}>
                    <Text style={styles.bold}>Stack: </Text>
                    {p.stack}
                  </Text>
                ) : null}
                <Bullet>{p.bullet}</Bullet>
              </View>
            ))}
          </>
        ) : null}

        <Text style={styles.sectionHeader}>Technical Skills</Text>
        {D.skills.map(([label, kw], i) => (
          <View key={i} style={styles.skillRow}>
            <Text>
              <Text style={styles.bold}>{label}: </Text>
              {kw}
            </Text>
          </View>
        ))}

        <Text style={styles.sectionHeader}>Education</Text>
        {D.education.map((e, i) => (
          <View key={i} style={styles.eduRow}>
            <Text>
              <Text style={styles.bold}>{e.degree}</Text> — {e.detail}
            </Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}

export async function buildPdf(D: ResumeContent): Promise<Buffer> {
  return renderToBuffer(<ResumeDoc D={D} />);
}
