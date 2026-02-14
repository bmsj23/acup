import { PDFDocument, degrees, rgb } from "pdf-lib";

export async function applyPdfWatermark(
  sourcePdfBytes: Uint8Array,
  options: {
    userEmail: string;
    documentId: string;
    timestampIso: string;
  },
) {
  const pdfDoc = await PDFDocument.load(sourcePdfBytes);
  const watermarkText = `${options.userEmail} • ${options.timestampIso} • ${options.documentId}`;
  const watermarkMarker = `acup-watermark|${options.userEmail}|${options.documentId}|${options.timestampIso}`;

  pdfDoc.setSubject(watermarkMarker);
  pdfDoc.setKeywords(["acup-watermark", options.userEmail, options.documentId]);

  for (const page of pdfDoc.getPages()) {
    const { width, height } = page.getSize();
    page.drawText(watermarkText, {
      x: width * 0.12,
      y: height * 0.45,
      size: 20,
      color: rgb(0.145, 0.388, 0.922),
      rotate: degrees(35),
      opacity: 0.3,
    });
  }

  return await pdfDoc.save();
}