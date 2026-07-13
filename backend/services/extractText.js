// extractText.js — pulls plain text out of uploaded PDF/DOCX so it can be
// sent to the AI engine and stored for full-text audit/search.
//
// Uses pdf-parse v2's PDFParse class (bundles a modern, tolerant PDF.js
// build) rather than the legacy v1 functional API, which would throw hard
// errors ("bad XRef entry" etc.) on PDFs with minor structural quirks that
// some PDF generators (including common library-generated PDFs) produce —
// even though the file opens and reads fine in any normal PDF viewer.
import fs from "fs";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import path from "path";

export async function extractText(filepath) {
  const ext = path.extname(filepath).toLowerCase();
  const buffer = fs.readFileSync(filepath);

  if (ext === ".pdf") {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }
  if (ext === ".docx") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  if (ext === ".txt") {
    return buffer.toString("utf-8");
  }
  throw new Error(`Unsupported file type: ${ext}`);
}
