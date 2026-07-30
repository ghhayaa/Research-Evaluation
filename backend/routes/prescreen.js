import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuid } from "uuid";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { extractText } from "../services/extractText.js";
import { evaluateProposal, prescreenProposalAll } from "../services/geminiService.js";

const router = Router();
const uploadDir = process.env.RENDER_DISK_PATH
  ? path.join(process.env.RENDER_DISK_PATH, "uploads")
  : path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `prescreen-${uuid()}${path.extname(file.originalname)}`)
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (![ ".pdf", ".docx" ].includes(path.extname(file.originalname).toLowerCase()))
      return cb(new Error("Only PDF and DOCX files are accepted"));
    cb(null, true);
  }
});

// Get history for current user
router.get("/history", requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT h.*, g.title as grant_title, g.sponsor, g.reference, g.image_url
    FROM prescreen_history h
    JOIN grant_calls g ON g.id = h.grant_call_id
    WHERE h.user_id = ?
    ORDER BY h.created_at DESC
    LIMIT 50
  `).all(req.user.id);
  res.json(rows.map(r => ({ ...r, report: JSON.parse(r.report_json) })));
});

// Get a single history entry
router.get("/history/:id", requireAuth, (req, res) => {
  const row = db.prepare(`
    SELECT h.*, g.title as grant_title, g.sponsor, g.reference, g.image_url, g.deadline
    FROM prescreen_history h
    JOIN grant_calls g ON g.id = h.grant_call_id
    WHERE h.id = ? AND h.user_id = ?
  `).get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json({ ...row, report: JSON.parse(row.report_json) });
});

// Admin analytics
router.get("/analytics", requireAuth, (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });

  const perCall = db.prepare(`
    SELECT
      h.grant_call_id,
      g.title as grant_title,
      g.reference,
      COUNT(*) as total_checks,
      ROUND(AVG(h.score), 1) as avg_score,
      SUM(CASE WHEN h.compatibility = 'High' THEN 1 ELSE 0 END) as high_count,
      SUM(CASE WHEN h.compatibility = 'Medium' THEN 1 ELSE 0 END) as medium_count,
      SUM(CASE WHEN h.compatibility = 'Low' THEN 1 ELSE 0 END) as low_count
    FROM prescreen_history h
    JOIN grant_calls g ON g.id = h.grant_call_id
    GROUP BY h.grant_call_id
    ORDER BY total_checks DESC
  `).all();

  const allHistory = db.prepare(`
    SELECT h.grant_call_id, h.gaps, h.filename, h.score, h.created_at
    FROM prescreen_history h
    ORDER BY h.created_at DESC
  `).all();

  const gapsByCall = {};
  for (const h of allHistory) {
    if (!gapsByCall[h.grant_call_id]) gapsByCall[h.grant_call_id] = [];
    if (h.gaps) {
      const gaps = h.gaps.split(" • ").map(g => g.trim()).filter(Boolean);
      gapsByCall[h.grant_call_id].push(...gaps.map(g => ({
        gap: g, filename: h.filename, score: h.score, date: h.created_at
      })));
    }
  }

  res.json({
    per_call: perCall.map(c => ({ ...c, gaps: gapsByCall[c.grant_call_id] || [] })),
    total_checks: allHistory.length,
  });
});

// Run check against a specific grant
router.post("/", requireAuth, upload.single("file"), async (req, res) => {
  const tempPath = req.file?.path;
  try {
    if (!req.file) return res.status(400).json({ error: "A PDF or DOCX file is required" });
    const { grant_call_id } = req.body;
    if (!grant_call_id) return res.status(400).json({ error: "Please select a grant call" });

    const targetGrant = db.prepare("SELECT * FROM grant_calls WHERE id = ?").get(grant_call_id);
    if (!targetGrant) return res.status(404).json({ error: "Grant call not found" });
    targetGrant.criteria = JSON.parse(targetGrant.criteria_json);

    const otherGrants = db.prepare("SELECT * FROM grant_calls WHERE status = 'open' AND id != ?").all(grant_call_id)
      .map(g => ({ ...g, criteria: JSON.parse(g.criteria_json) }));

    const proposalText = await extractText(tempPath);
    if (!proposalText || proposalText.trim().length < 100)
      return res.status(400).json({ error: "The document appears to be empty or could not be read." });

    const report = await evaluateProposal(proposalText, targetGrant.criteria);

    const counts = report.criteria_results.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1; return acc;
    }, {});
    const total = report.criteria_results.length || 1;
    const score = Math.round(((counts["Pass"] || 0) + (counts["Partial"] || 0) * 0.5) / total * 100);
    const compatibility = score >= 70 ? "High" : score >= 40 ? "Medium" : "Low";
    const ready_to_apply = score >= 65;

    let best_alternative_id = null;
    let best_alternative_reason = null;
    if (!ready_to_apply && otherGrants.length > 0) {
      const { prescreenProposal: getSuggestion } = await import("../services/geminiService.js");
      try {
        const suggestion = await getSuggestion(proposalText, targetGrant, otherGrants);
        best_alternative_id = suggestion.best_alternative_id || null;
        best_alternative_reason = suggestion.best_alternative_reason || null;
      } catch {}
    }

    const result = {
      compatibility,
      score,
      summary: report.overall_summary,
      strengths: report.strengths?.map(s => s.point).join(" • ") || "",
      gaps: report.weaknesses?.map(w => w.point).join(" • ") || "",
      suggestions: report.weaknesses?.map(w => w.guidance || w.point).filter(Boolean).join(" • ") || "",
      verdict: report.readiness_recommendation || (ready_to_apply ? "Ready to submit." : "Not ready — address the gaps above."),
      ready_to_apply,
      best_alternative_id,
      best_alternative_reason,
      criteria_results: report.criteria_results,
      target_grant: { id: targetGrant.id, title: targetGrant.title, sponsor: targetGrant.sponsor, reference: targetGrant.reference, image_url: targetGrant.image_url, deadline: targetGrant.deadline },
      alternative_grant: best_alternative_id ? otherGrants.find(g => g.id === best_alternative_id) : null,
      filename: req.file.originalname,
    };

    const historyId = uuid();
    db.prepare(`
      INSERT INTO prescreen_history (id, user_id, grant_call_id, filename, score, compatibility, report_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(historyId, req.user.id, grant_call_id, req.file.originalname, score, compatibility, JSON.stringify(result), new Date().toISOString());

    res.json({ ...result, history_id: historyId });
  } catch (err) {
    console.error("Pre-screen error:", err);
    res.status(500).json({ error: err.message });
  } finally {
    if (tempPath && fs.existsSync(tempPath)) try { fs.unlinkSync(tempPath); } catch {}
  }
});

// Scan against ALL open grant calls
router.post("/all", requireAuth, upload.single("file"), async (req, res) => {
  const tempPath = req.file?.path;
  try {
    if (!req.file) return res.status(400).json({ error: "A PDF or DOCX file is required" });

    const allGrants = db.prepare("SELECT * FROM grant_calls WHERE status = 'open'").all()
      .map(g => ({ ...g, criteria: JSON.parse(g.criteria_json) }));

    if (allGrants.length === 0) return res.status(400).json({ error: "No open grant calls available." });

    const proposalText = await extractText(tempPath);
    if (!proposalText || proposalText.trim().length < 100)
      return res.status(400).json({ error: "The document appears to be empty or could not be read." });

    const result = await prescreenProposalAll(proposalText, allGrants);

    const enriched = result.results.map(r => ({
      ...r,
      grant_call: allGrants.find(g => g.id === r.grant_call_id) || null,
    })).sort((a, b) => b.score - a.score);

    res.json({ ...result, results: enriched, filename: req.file.originalname });
  } catch (err) {
    console.error("Pre-screen all error:", err);
    res.status(500).json({ error: err.message });
  } finally {
    if (tempPath && fs.existsSync(tempPath)) try { fs.unlinkSync(tempPath); } catch {}
  }
});

export default router;