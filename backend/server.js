import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import db from "./db.js";

// ─── Auto-seed on first run ───────────────────────────────────────────────────
// If the database has no users yet (brand new), run seed automatically.
// On all subsequent starts, existing data is left completely untouched.
// This means you never need to run `node seed.js` manually — just `npm run dev`.
const userCount = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
if (userCount === 0) {
  console.log("==> Fresh database — running first-time setup...");
  await import("./seed.js");
  console.log("==> Setup complete.");
}

import authRoutes from "./routes/auth.js";
import grantCallRoutes from "./routes/grantcalls.js";
import grantCallDocRoutes from "./routes/grantcalldocs.js";
import proposalRoutes from "./routes/proposals.js";
import assessmentRoutes from "./routes/assessments.js";
import auditRoutes from "./routes/audit.js";
import dbViewerRoutes from "./routes/dbviewer.js";
import prescreenRoutes from "./routes/prescreen.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:4173",
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
}));
app.use(express.json({ limit: "5mb" }));

app.get("/api/health", (req, res) => res.json({ ok: true, service: "proposal-eval-backend" }));

app.use("/api/auth", authRoutes);
app.use("/api/grant-calls", grantCallRoutes);
app.use("/api/grant-calls/:grantCallId/documents", grantCallDocRoutes);
app.use("/api/proposals", proposalRoutes);
app.use("/api/assessments", assessmentRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/db", dbViewerRoutes);
app.use("/api/prescreen", prescreenRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Proposal Evaluation backend running on http://localhost:${PORT}`));
