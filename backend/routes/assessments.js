import { Router } from "express";
import db from "../db.js";
import { v4 as uuid } from "uuid";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

function logAudit(user, action, entity_id, details) {
  db.prepare(`INSERT INTO audit_log (id, actor_id, actor_role, action, entity_type, entity_id, details_json, created_at)
              VALUES (?,?,?,?,?,?,?,?)`)
    .run(uuid(), user.id, user.role, action, "assessment", entity_id, JSON.stringify(details || {}), new Date().toISOString());
}

// Admin queue: all AI assessments awaiting initial review (still in ai_draft)
router.get("/queue", requireAuth, requireRole("admin"), (req, res) => {
  const rows = db.prepare(`
    SELECT a.*, p.title as proposal_title, p.filename, p.owner_id, u.name as researcher_name, g.title as grant_title
    FROM assessments a
    JOIN proposals p ON p.id = a.proposal_id
    JOIN users u ON u.id = p.owner_id
    JOIN grant_calls g ON g.id = a.grant_call_id
    ORDER BY a.created_at DESC
  `).all();
  res.json(rows.map(r => ({ ...r, report: JSON.parse(r.report_json) })));
});

router.get("/:id", requireAuth, (req, res) => {
  const a = db.prepare("SELECT * FROM assessments WHERE id = ?").get(req.params.id);
  if (!a) return res.status(404).json({ error: "Not found" });
  res.json({ ...a, report: JSON.parse(a.report_json) });
});

// Admin reviews an assessment. `action` determines the outcome:
//   "approve"          -> shared with the researcher as the final, approved outcome
//   "request_changes"  -> sent back to the researcher with feedback; only THIS specific
//                          proposal becomes eligible for a "Submit Revised Proposal" CTA
//   "decline"          -> formally rejected, with reviewer_notes shown as the reason
//   "save"             -> just persist edits/annotations to the report without changing status
router.patch("/:id", requireAuth, requireRole("admin"), (req, res) => {
  const a = db.prepare("SELECT * FROM assessments WHERE id = ?").get(req.params.id);
  if (!a) return res.status(404).json({ error: "Not found" });

  const { report, reviewer_notes, action } = req.body;
  const updatedReport = report || JSON.parse(a.report_json);

  const STATUS_MAP = {
    approve: "admin_approved",
    request_changes: "changes_requested",
    decline: "admin_declined",
    save: "admin_edited",
  };
  const PROPOSAL_STATUS_MAP = {
    approve: "approved",
    request_changes: "changes_requested",
    decline: "declined",
    save: undefined, // don't change proposal.status on a plain save
  };

  const newAssessmentStatus = STATUS_MAP[action];
  if (!newAssessmentStatus) {
    return res.status(400).json({ error: "Invalid action. Expected one of: approve, request_changes, decline, save" });
  }

  db.prepare(`UPDATE assessments SET report_json = ?, reviewer_notes = ?, reviewed_by = ?, status = ? WHERE id = ?`)
    .run(JSON.stringify(updatedReport), reviewer_notes || "", req.user.id, newAssessmentStatus, a.id);

  const proposalStatus = PROPOSAL_STATUS_MAP[action];
  if (proposalStatus) {
    db.prepare("UPDATE proposals SET status = ? WHERE id = ?").run(proposalStatus, a.proposal_id);
  }

  logAudit(req.user, `ASSESSMENT_${action.toUpperCase()}`, a.id, { reviewer_notes, proposal_id: a.proposal_id });

  res.json({ ok: true, status: newAssessmentStatus });
});

export default router;
