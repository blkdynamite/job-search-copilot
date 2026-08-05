import { PDFDocument } from "pdf-lib";

// Verify the resume fits the 2-page rule (skill honesty: length over 2 pages is an instant flag).
export async function pageCount(pdf: Buffer | Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(pdf);
  return doc.getPageCount();
}
