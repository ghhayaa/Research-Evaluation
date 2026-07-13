import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.RENDER_DISK_PATH
  ? path.join(process.env.RENDER_DISK_PATH, "data")
  : path.join(__dirname, "data");

// Create the data directory if it doesn't exist
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "app.db"));

db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('researcher','admin')),
  department TEXT,
  password_hash TEXT
);

CREATE TABLE IF NOT EXISTS grant_calls (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  sponsor TEXT,
  reference TEXT,
  summary TEXT,
  image_url TEXT,
  deadline TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  criteria_json TEXT NOT NULL,
  source TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS proposals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  grant_call_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  filename TEXT NOT NULL,
  filepath TEXT NOT NULL,
  extracted_text TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  created_at TEXT NOT NULL,
  FOREIGN KEY(owner_id) REFERENCES users(id),
  FOREIGN KEY(grant_call_id) REFERENCES grant_calls(id)
);

CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL,
  proposal_version INTEGER NOT NULL,
  grant_call_id TEXT NOT NULL,
  report_json TEXT NOT NULL,
  overall_summary TEXT,
  generated_by TEXT NOT NULL DEFAULT 'ai',
  status TEXT NOT NULL DEFAULT 'ai_draft',
  reviewed_by TEXT,
  reviewer_notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(proposal_id) REFERENCES proposals(id)
);

CREATE TABLE IF NOT EXISTS grant_call_documents (
  id TEXT PRIMARY KEY,
  grant_call_id TEXT NOT NULL,
  original_name TEXT NOT NULL,
  filepath TEXT NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'other',
  uploaded_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(grant_call_id) REFERENCES grant_calls(id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details_json TEXT,
  created_at TEXT NOT NULL
);
`);

// Lightweight migrations for existing databases
const migrations = [
  "ALTER TABLE users ADD COLUMN password_hash TEXT",
  "ALTER TABLE grant_calls ADD COLUMN summary TEXT",
  "ALTER TABLE grant_calls ADD COLUMN image_url TEXT",
  "ALTER TABLE grant_calls ADD COLUMN deadline TEXT",
  "ALTER TABLE grant_calls ADD COLUMN status TEXT NOT NULL DEFAULT 'open'",
  `CREATE TABLE IF NOT EXISTS grant_call_documents (
    id TEXT PRIMARY KEY,
    grant_call_id TEXT NOT NULL,
    original_name TEXT NOT NULL,
    filepath TEXT NOT NULL,
    doc_type TEXT NOT NULL DEFAULT 'other',
    uploaded_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(grant_call_id) REFERENCES grant_calls(id)
  )`,
];

for (const stmt of migrations) {
  try { db.exec(stmt); } catch (e) { /* already exists — ignore */ }
}

export default db;
