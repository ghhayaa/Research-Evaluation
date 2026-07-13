// auth.js — REAL SSO via Google Identity Services.
//
// Flow:
//   1. Frontend renders Google's "Sign in with Google" button (Google Identity
//      Services script). The user authenticates directly with Google — your
//      app never sees their Google password.
//   2. Google returns a signed ID token (JWT) to the frontend.
//   3. Frontend POSTs that token to /api/auth/sso/google.
//   4. Backend verifies the token's signature and audience with Google's
//      public keys (via google-auth-library) — this is the part that makes
//      it "real" SSO rather than a mock.
//   5. Backend maps the verified email to a local user record (and can
//      auto-provision new users on first login from an allowed domain),
//      then issues the same app-level JWT the rest of the app already uses.
//
// Swap-in note for enterprise IdPs (Azure AD/Okta/SAML): same shape — verify
// the token/assertion from the IdP, map to a local user, issue the app JWT.

import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import db from "../db.js";
import { v4 as uuid } from "uuid";

const router = Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

// Optional: restrict auto-provisioning to your institution's email domain(s).
// Comma-separated, e.g. "ku.ac.ae,research.ku.ac.ae". Leave blank to allow any domain.
const ALLOWED_DOMAINS = (process.env.ALLOWED_EMAIL_DOMAINS || "")
  .split(",").map(d => d.trim().toLowerCase()).filter(Boolean);

function logAudit(actor, action, entity_id, details) {
  db.prepare(`INSERT INTO audit_log (id, actor_id, actor_role, action, entity_type, entity_id, details_json, created_at)
              VALUES (?,?,?,?,?,?,?,?)`)
    .run(uuid(), actor.id, actor.role, action, "user", entity_id, JSON.stringify(details || {}), new Date().toISOString());
}

// Email + password login (real local authentication, separate from SSO).
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.trim().toLowerCase());

  // Generic error message on both "no such user" and "wrong password" so we
  // don't leak which institutional emails are registered.
  const genericError = { error: "Invalid email or password" };

  if (!user || !user.password_hash) return res.status(401).json(genericError);

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json(genericError);

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );

  logAudit(user, "LOGIN_PASSWORD", user.id, { email: user.email });

  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department } });
});

router.post("/sso/google", async (req, res) => {
  try {
    if (!client) {
      return res.status(500).json({ error: "Google SSO is not configured on the server (missing GOOGLE_CLIENT_ID)" });
    }
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: "Missing Google credential" });

    // Verifies the token signature, expiry, and audience against Google's servers.
    const ticket = await client.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();

    if (!payload.email_verified) {
      return res.status(401).json({ error: "Google account email is not verified" });
    }

    const email = payload.email.toLowerCase();
    const domain = email.split("@")[1];

    if (ALLOWED_DOMAINS.length > 0 && !ALLOWED_DOMAINS.includes(domain)) {
      return res.status(403).json({ error: `Sign-in restricted to institutional accounts (${ALLOWED_DOMAINS.join(", ")})` });
    }

    let user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

    if (!user) {
      // Just-in-time provisioning: first-time Google sign-in creates a local
      // record. Default role is 'researcher' — promote to 'admin' manually
      // in the DB (or build an admin-only role-management screen) as needed.
      const id = uuid();
      db.prepare(`INSERT INTO users (id, name, email, role, department) VALUES (?,?,?,?,?)`)
        .run(id, payload.name || email, email, "researcher", "");
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    logAudit(user, "LOGIN_SSO_GOOGLE", user.id, { email });

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department } });
  } catch (err) {
    console.error("Google SSO verification failed:", err.message);
    res.status(401).json({ error: "Google sign-in could not be verified" });
  }
});

export default router;
