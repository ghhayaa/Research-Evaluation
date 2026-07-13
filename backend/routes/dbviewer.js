// dbviewer.js — admin-only database viewer
// Returns the contents of every table so the admin can inspect the live
// database directly from the platform UI without needing a terminal.
import { Router } from "express";
import db from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

const TABLES = [
  { name: "users",                 label: "Users",                 sensitive: ["password_hash"] },
  { name: "grant_calls",           label: "Grant Calls",           sensitive: ["criteria_json"] },
  { name: "grant_call_documents",  label: "Grant Call Documents",  sensitive: [] },
  { name: "proposals",             label: "Proposals",             sensitive: ["extracted_text", "filepath"] },
  { name: "assessments",           label: "Assessments",           sensitive: ["report_json"] },
  { name: "audit_log",             label: "Audit Log",             sensitive: ["details_json"] },
];

router.get("/tables", requireAuth, requireRole("admin"), (req, res) => {
  const result = {};
  for (const t of TABLES) {
    try {
      const rows = db.prepare(`SELECT * FROM ${t.name} ORDER BY rowid DESC LIMIT 200`).all();
      // redact large/sensitive columns but keep structure visible
      const cleaned = rows.map(row => {
        const r = { ...row };
        for (const col of t.sensitive) {
          if (r[col] !== undefined) r[col] = `[${typeof r[col] === "string" ? r[col].length : "?"} chars — hidden]`;
        }
        return r;
      });
      const cols = rows.length > 0 ? Object.keys(rows[0]) : [];
      result[t.name] = { label: t.label, columns: cols, rows: cleaned, count: cleaned.length };
    } catch (e) {
      result[t.name] = { label: t.label, columns: [], rows: [], count: 0, error: e.message };
    }
  }
  res.json(result);
});

export default router;
