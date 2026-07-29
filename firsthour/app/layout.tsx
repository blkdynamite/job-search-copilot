import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FirstHour — get to fresh jobs before the swarm",
  description:
    "A recruiter-grade job-search agent. It analyzes your resume, hunts fresh postings, triages them honestly, and tailors a resume per role — nothing invented, every line interview-ready.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
