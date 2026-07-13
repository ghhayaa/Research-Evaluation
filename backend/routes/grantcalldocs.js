// grantcalldocs.js — stores and serves the actual grant call source documents
// (PDFs, DOCXs) that admins use as the authoritative reference for each grant
// call's criteria: Call for Proposals, Scoring Criteria, LOC Template, etc.

import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuid } from "uuid";
import db from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router({ mergeParams: true }); // gets :grantCallId from parent

const uploadDir = process.env.RENDER_DISK_PATH ? path.join(process.env.RENDER_DISK_PATH, "uploads") : path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `gcdoc-${uuid()}${path.extname(file.originalname)}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [".pdf", ".docx", ".doc", ".xlsx", ".txt"];
    if (!allowed.includes(path.extname(file.originalname).toLowerCase())) {
      return cb(new Error("Unsupported file type"));
    }
    cb(null, true);
  }
});

const DOC_TYPE_LABELS = {
  call_for_proposals: "Call for Proposals",
  scoring_criteria:   "Scoring Criteria",
  loc_template:       "LOC Template",
  decision_matrix:    "Decision Matrix",
  los_template:       "Letter of Support Template",
  other:              "Other",
};

// List all documents for a grant call
router.get("/", requireAuth, (req, res) => {
  const docs = db.prepare(
    "SELECT * FROM grant_call_documents WHERE grant_call_id = ? ORDER BY created_at ASC"
  ).all(req.params.grantCallId);
  res.json(docs.map(d => ({
    ...d,
    doc_type_label: DOC_TYPE_LABELS[d.doc_type] || d.doc_type,
  })));
});

// Upload a document and attach it to a grant call
router.post("/", requireAuth, requireRole("admin"), upload.single("file"), (req, res) => {
  try {
    const gc = db.prepare("SELECT id FROM grant_calls WHERE id = ?").get(req.params.grantCallId);
    if (!gc) return res.status(404).json({ error: "Grant call not found" });
    if (!req.file)  return res.status(400).json({ error: "No file uploaded" });

    const { doc_type = "other" } = req.body;
    const id = uuid();

    db.prepare(`INSERT INTO grant_call_documents (id, grant_call_id, original_name, filepath, doc_type, uploaded_by, created_at)
                VALUES (?,?,?,?,?,?,?)`)
      .run(id, req.params.grantCallId, req.file.originalname, req.file.path,
           doc_type, req.user.id, new Date().toISOString());

    db.prepare(`INSERT INTO audit_log (id, actor_id, actor_role, action, entity_type, entity_id, details_json, created_at)
                VALUES (?,?,?,?,?,?,?,?)`)
      .run(uuid(), req.user.id, req.user.role, "UPLOAD_GRANT_CALL_DOC", "grant_call_document", id,
           JSON.stringify({ grant_call_id: req.params.grantCallId, filename: req.file.originalname, doc_type }),
           new Date().toISOString());

    res.status(201).json({ id, original_name: req.file.originalname, doc_type });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Download / view a specific document
router.get("/:docId/download", requireAuth, (req, res) => {
  const doc = db.prepare(
    "SELECT * FROM grant_call_documents WHERE id = ? AND grant_call_id = ?"
  ).get(req.params.docId, req.params.grantCallId);

  if (!doc) return res.status(404).json({ error: "Document not found" });
  if (!fs.existsSync(doc.filepath)) return res.status(404).json({ error: "File missing from storage" });

  res.setHeader("Content-Disposition", `attachment; filename="${doc.original_name}"`);
  res.sendFile(path.resolve(doc.filepath));
});

// Delete a document (admin only)
router.delete("/:docId", requireAuth, requireRole("admin"), (req, res) => {
  const doc = db.prepare(
    "SELECT * FROM grant_call_documents WHERE id = ? AND grant_call_id = ?"
  ).get(req.params.docId, req.params.grantCallId);

  if (!doc) return res.status(404).json({ error: "Document not found" });

  try {
    if (fs.existsSync(doc.filepath)) fs.unlinkSync(doc.filepath);
  } catch (e) { /* file might already be gone */ }

  db.prepare("DELETE FROM grant_call_documents WHERE id = ?").run(doc.id);

  db.prepare(`INSERT INTO audit_log (id, actor_id, actor_role, action, entity_type, entity_id, details_json, created_at)
              VALUES (?,?,?,?,?,?,?,?)`)
    .run(uuid(), req.user.id, req.user.role, "DELETE_GRANT_CALL_DOC", "grant_call_document", doc.id,
         JSON.stringify({ filename: doc.original_name }), new Date().toISOString());

  res.json({ ok: true });
});

export { DOC_TYPE_LABELS };
export default router;
