import { Router } from "express";
import db from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// Full audit log — admin only (FR-01.8: 7-year retention requirement;
// this demo stores indefinitely in SQLite — wire a retention/archival job
// in production, e.g. nightly export to cold storage after 7 years).
router.get("/", requireAuth, requireRole("admin"), (req, res) => {
  const rows = db.prepare("SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 500").all();
  res.json(rows.map(r => ({ ...r, details: r.details_json ? JSON.parse(r.details_json) : {} })));
});

export default router;
