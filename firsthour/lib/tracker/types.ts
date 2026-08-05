// Client-safe tracker row shape (shared by the API, the page, and the table component).
export const APPLICATION_STATUSES = [
  "to_apply",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "ghosted",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export type TrackerRow = {
  jobId: string;
  company: string | null;
  title: string | null;
  location: string | null;
  url: string | null;
  verdict: "strong" | "stretch" | "skip" | null;
  status: ApplicationStatus;
  hasCoverLetter: boolean;
  coverLetterMode: "draft" | "outline_only" | null;
  resumeDocxUrl: string | null;
  resumePdfUrl: string | null;
  updatedAt: string;
};
