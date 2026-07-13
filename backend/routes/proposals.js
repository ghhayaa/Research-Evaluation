import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuid } from "uuid";
import db from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { extractText } from "../services/extractText.js";
import { evaluateProposal } from "../services/geminiService.js";

const router = Router();

const uploadDir = process.env.RENDER_DISK_PATH ? path.join(process.env.RENDER_DISK_PATH, "uploads") : path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${uuid()}${path.extname(file.originalname)}`)
});

const ALLOWED = [".pdf", ".docx"];
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB — confirm with IT (FR-01.1)
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED.includes(ext)) return cb(new Error("Only PDF and DOCX files are accepted"));
    cb(null, true);
  }
});

function logAudit({ actor_id, actor_role, action, entity_type, entity_id, details }) {
  db.prepare(`INSERT INTO audit_log (id, actor_id, actor_role, action, entity_type, entity_id, details_json, created_at)
              VALUES (?,?,?,?,?,?,?,?)`)
    .run(uuid(), actor_id, actor_role, action, entity_type, entity_id, JSON.stringify(details || {}), new Date().toISOString());
}

function attachSummary(rows) {
  if (rows.length === 0) return rows;
  const ids = rows.map(r => r.id);
  const placeholders = ids.map(() => "?").join(",");
  const allAssessments = db.prepare(
    `SELECT * FROM assessments WHERE proposal_id IN (${placeholders}) ORDER BY created_at DESC`
  ).all(...ids);

  const latestByProposal = new Map();
  for (const a of allAssessments) {
    if (!latestByProposal.has(a.proposal_id)) latestByProposal.set(a.proposal_id, a);
  }

  return rows.map(r => {
    const latest = latestByProposal.get(r.id);
    if (!latest) return { ...r, ai_summary: null, reviewer_notes: null, assessment_status: null };
    let counts = { Pass: 0, Partial: 0, "Not Met": 0 };
    try {
      const report = JSON.parse(latest.report_json);
      for (const c of report.criteria_results || []) {
        if (counts[c.status] !== undefined) counts[c.status]++;
      }
    } catch { /* ignore malformed report */ }
    return {
      ...r,
      ai_summary: counts,
      reviewer_notes: latest.reviewer_notes || null,
      assessment_status: latest.status,
    };
  });
}

// List proposals (researchers see their own; admins see all)
router.get("/", requireAuth, (req, res) => {
  const rows = req.user.role === "admin"
    ? db.prepare(`SELECT p.*, u.name as owner_name, g.title as grant_title FROM proposals p
                  JOIN users u ON u.id = p.owner_id
                  JOIN grant_calls g ON g.id = p.grant_call_id
                  ORDER BY p.created_at DESC`).all()
    : db.prepare(`SELECT p.*, u.name as owner_name, g.title as grant_title FROM proposals p
                  JOIN users u ON u.id = p.owner_id
                  JOIN grant_calls g ON g.id = p.grant_call_id
                  WHERE p.owner_id = ? ORDER BY p.created_at DESC`).all(req.user.id);
  res.json(attachSummary(rows));
});

router.get("/:id", requireAuth, (req, res) => {
  const p = db.prepare("SELECT * FROM proposals WHERE id = ?").get(req.params.id);
  if (!p) return res.status(404).json({ error: "Not found" });
  if (req.user.role !== "admin" && p.owner_id !== req.user.id) return res.status(403).json({ error: "Forbidden" });
  const assessments = db.prepare("SELECT * FROM assessments WHERE proposal_id = ? ORDER BY created_at DESC").all(p.id)
    .map(a => ({ ...a, report: JSON.parse(a.report_json) }));
  res.json({ ...p, assessments });
});

// Upload + submit a proposal for AI review
router.post("/", requireAuth, upload.single("file"), async (req, res) => {
  try {
    const { title, grant_call_id } = req.body;
    if (!title || !grant_call_id || !req.file) {
      return res.status(400).json({ error: "title, grant_call_id and file are required" });
    }
    const grantCall = db.prepare("SELECT * FROM grant_calls WHERE id = ?").get(grant_call_id);
    if (!grantCall) return res.status(404).json({ error: "Grant call not found" });

    // version = how many proposals this owner already submitted against this grant call + 1
    const priorCount = db.prepare(
      "SELECT COUNT(*) as c FROM proposals WHERE owner_id = ? AND grant_call_id = ?"
    ).get(req.user.id, grant_call_id).c;

    const proposalId = uuid();
    const extractedText = await extractText(req.file.path);

    db.prepare(`INSERT INTO proposals (id,title,owner_id,grant_call_id,version,filename,filepath,extracted_text,status,created_at)
                VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .run(proposalId, title, req.user.id, grant_call_id, priorCount + 1, req.file.originalname, req.file.path,
           extractedText, "submitted", new Date().toISOString());

    logAudit({ actor_id: req.user.id, actor_role: req.user.role, action: "SUBMIT_PROPOSAL", entity_type: "proposal", entity_id: proposalId, details: { title, grant_call_id, version: priorCount + 1 } });

    res.status(201).json({ id: proposalId, version: priorCount + 1 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Trigger AI compliance assessment for a proposal
router.post("/:id/assess", requireAuth, async (req, res) => {
  try {
    const proposal = db.prepare("SELECT * FROM proposals WHERE id = ?").get(req.params.id);
    if (!proposal) return res.status(404).json({ error: "Proposal not found" });
    if (req.user.role !== "admin" && proposal.owner_id !== req.user.id) return res.status(403).json({ error: "Forbidden" });

    const grantCall = db.prepare("SELECT * FROM grant_calls WHERE id = ?").get(proposal.grant_call_id);
    const criteria = JSON.parse(grantCall.criteria_json);

    const report = await evaluateProposal(proposal.extracted_text || "", criteria);

    const assessmentId = uuid();
    db.prepare(`INSERT INTO assessments (id, proposal_id, proposal_version, grant_call_id, report_json, overall_summary, generated_by, status, created_at)
                VALUES (?,?,?,?,?,?,?,?,?)`)
      .run(assessmentId, proposal.id, proposal.version, proposal.grant_call_id, JSON.stringify(report),
           report.overall_summary || "", "ai", "ai_draft", new Date().toISOString());

    db.prepare("UPDATE proposals SET status = 'ai_reviewed' WHERE id = ?").run(proposal.id);

    logAudit({ actor_id: req.user.id, actor_role: req.user.role, action: "AI_ASSESS_PROPOSAL", entity_type: "assessment", entity_id: assessmentId, details: { proposal_id: proposal.id, version: proposal.version } });

    res.status(201).json({ id: assessmentId, report });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
