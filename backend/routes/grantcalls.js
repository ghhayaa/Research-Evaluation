import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuid } from "uuid";
import db from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { extractText } from "../services/extractText.js";
import { extractCriteria } from "../services/geminiService.js";

const router = Router();

const uploadDir = process.env.RENDER_DISK_PATH ? path.join(process.env.RENDER_DISK_PATH, "uploads") : path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${uuid()}${path.extname(file.originalname)}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (![".pdf", ".docx"].includes(ext)) return cb(new Error("Only PDF and DOCX files are accepted"));
    cb(null, true);
  }
});

function logAudit(user, action, entity_id, details) {
  db.prepare(`INSERT INTO audit_log (id, actor_id, actor_role, action, entity_type, entity_id, details_json, created_at)
              VALUES (?,?,?,?,?,?,?,?)`)
    .run(uuid(), user.id, user.role, action, "grant_call", entity_id, JSON.stringify(details || {}), new Date().toISOString());
}

router.get("/", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM grant_calls ORDER BY created_at DESC").all();
  res.json(rows.map(r => ({ ...r, criteria: JSON.parse(r.criteria_json) })));
});

router.get("/:id", requireAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM grant_calls WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json({ ...row, criteria: JSON.parse(row.criteria_json) });
});

// Manual creation (FR-01.2 fallback path: manual criteria entry)
router.post("/", requireAuth, requireRole("admin"), (req, res) => {
  const { title, sponsor, reference, summary, image_url, deadline, criteria } = req.body;
  if (!title || !Array.isArray(criteria) || criteria.length === 0) {
    return res.status(400).json({ error: "title and at least one criterion are required" });
  }
  const id = uuid();
  db.prepare(`INSERT INTO grant_calls (id,title,sponsor,reference,summary,image_url,deadline,status,criteria_json,source,created_at)
              VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, title, sponsor || "", reference || "", summary || "", image_url || "", deadline || "",
         "open", JSON.stringify(criteria), "manual", new Date().toISOString());

  logAudit(req.user, "CREATE_GRANT_CALL", id, { title, source: "manual" });
  res.status(201).json({ id });
});

// Upload a grant call document and let AI extract structured criteria + a
// researcher-facing summary (FR-01.2: primary path, parses structured
// compliance criteria from an uploaded document).
router.post("/extract", requireAuth, requireRole("admin"), upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "file is required" });
    const text = await extractText(req.file.path);
    const result = await extractCriteria(text);
    res.json({ summary: result.summary, criteria: result.criteria });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id", requireAuth, requireRole("admin"), (req, res) => {
  const row = db.prepare("SELECT * FROM grant_calls WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Not found" });

  const { title, sponsor, reference, summary, image_url, deadline, status, criteria } = req.body;
  db.prepare(`UPDATE grant_calls SET title=?, sponsor=?, reference=?, summary=?, image_url=?, deadline=?, status=?, criteria_json=? WHERE id=?`)
    .run(
      title ?? row.title, sponsor ?? row.sponsor, reference ?? row.reference,
      summary ?? row.summary, image_url ?? row.image_url, deadline ?? row.deadline,
      status ?? row.status, criteria ? JSON.stringify(criteria) : row.criteria_json,
      row.id
    );

  logAudit(req.user, "UPDATE_GRANT_CALL", row.id, { title: title ?? row.title });
  res.json({ ok: true });
});

export default router;

// Delete a grant call (admin only) — also removes associated documents from DB
// Note: does not delete uploaded proposal files (those belong to proposals, not the grant call)
router.delete("/:id", requireAuth, requireRole("admin"), (req, res) => {
  const gc = db.prepare("SELECT * FROM grant_calls WHERE id = ?").get(req.params.id);
  if (!gc) return res.status(404).json({ error: "Not found" });

  // Remove associated documents from DB (files stay on disk — they may be
  // bundled KU files that shouldn't be deleted from the uploads folder)
  db.prepare("DELETE FROM grant_call_documents WHERE grant_call_id = ?").run(gc.id);
  db.prepare("DELETE FROM grant_calls WHERE id = ?").run(gc.id);

  db.prepare(`INSERT INTO audit_log (id, actor_id, actor_role, action, entity_type, entity_id, details_json, created_at)
              VALUES (?,?,?,?,?,?,?,?)`)
    .run(uuid(), req.user.id, req.user.role, "DELETE_GRANT_CALL", "grant_call", gc.id,
         JSON.stringify({ title: gc.title }), new Date().toISOString());

  res.json({ ok: true });
});
