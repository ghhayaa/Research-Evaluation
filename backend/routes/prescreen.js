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
const uploadDir = process.env.RENDER_DISK_PATH ? path.join(process.env.RENDER_DISK_PATH, "uploads") : path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `prescreen-${uuid()}${path.extname(file.originalname)}`)
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (![".pdf", ".docx"].includes(path.extname(file.originalname).toLowerCase()))
      return cb(new Error("Only PDF and DOCX files are accepted"));
    cb(null, true);
  }
});

router.post("/", requireAuth, upload.single("file"), async (req, res) => {
  const tempPath = req.file?.path;
  try {
    if (!req.file) return res.status(400).json({ error: "A PDF or DOCX file is required" });
    const { grant_call_id } = req.body;
    if (!grant_call_id) return res.status(400).json({ error: "Please select a grant call to check against" });

    const targetGrant = db.prepare("SELECT * FROM grant_calls WHERE id = ?").get(grant_call_id);
    if (!targetGrant) return res.status(404).json({ error: "Grant call not found" });
    targetGrant.criteria = JSON.parse(targetGrant.criteria_json);

    const otherGrants = db.prepare("SELECT * FROM grant_calls WHERE status = 'open' AND id != ?").all(grant_call_id)
      .map(g => ({ ...g, criteria: JSON.parse(g.criteria_json) }));

    const proposalText = await extractText(tempPath);
    if (!proposalText || proposalText.trim().length < 100)
      return res.status(400).json({ error: "The document appears to be empty or could not be read." });

    // Use the EXACT same evaluateProposal function as the post-submission assessment
    // so pre-screen scores are identical to what they'll see after formally applying.
    const report = await evaluateProposal(proposalText, targetGrant.criteria);

    // Calculate overall score the same way the compliance ring does: 
    // Pass=1, Partial=0.5, NotMet=0 weighted across all criteria
    const counts = report.criteria_results.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1; return acc;
    }, {});
    const total = report.criteria_results.length || 1;
    const score = Math.round(((counts["Pass"] || 0) + (counts["Partial"] || 0) * 0.5) / total * 100);
    const compatibility = score >= 70 ? "High" : score >= 40 ? "Medium" : "Low";
    const ready_to_apply = score >= 65;

    // If not ready, find a better alternative
    let best_alternative_id = null;
    let best_alternative_reason = null;
    if (!ready_to_apply && otherGrants.length > 0) {
      // Quick check: find the grant whose criteria the proposal best matches based on keywords
      // We use a lightweight Gemini call just for the suggestion
      const { prescreenProposal: getSuggestion } = await import("../services/geminiService.js");
      try {
        const suggestion = await getSuggestion(proposalText, targetGrant, otherGrants);
        best_alternative_id = suggestion.best_alternative_id || null;
        best_alternative_reason = suggestion.best_alternative_reason || null;
      } catch { /* ignore suggestion errors */ }
    }

    res.json({
      compatibility,
      score,
      summary: report.overall_summary,
      strengths: report.strengths?.map(s => s.point).join(" • ") || "",
      gaps: report.weaknesses?.map(w => w.point).join(" • ") || "",
      verdict: report.readiness_recommendation || (ready_to_apply ? "Ready to apply." : "Not ready — address the gaps above before submitting."),
      ready_to_apply,
      best_alternative_id,
      best_alternative_reason,
      criteria_results: report.criteria_results, // full breakdown available if needed
      target_grant: { id: targetGrant.id, title: targetGrant.title, sponsor: targetGrant.sponsor, reference: targetGrant.reference, image_url: targetGrant.image_url, deadline: targetGrant.deadline },
      alternative_grant: best_alternative_id ? otherGrants.find(g => g.id === best_alternative_id) : null,
      filename: req.file.originalname,
    });
  } catch (err) {
    console.error("Pre-screen error:", err);
    res.status(500).json({ error: err.message });
  } finally {
    if (tempPath && fs.existsSync(tempPath)) try { fs.unlinkSync(tempPath); } catch {}
  }
});

export default router;

// Scan against ALL open grant calls simultaneously
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

    const { prescreenProposalAll } = await import("../services/geminiService.js");
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
