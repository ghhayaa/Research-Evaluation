# ResearchGate — AI Research Proposal Compliance Platform

Implements **UC-01: Research Proposal Evaluation** end to end:
- Researcher & admin proposal/grant-call upload (PDF, DOCX)
- AI compliance engine (Google Gemini) scoring each criterion Pass / Partial / Not Met with plain-language explanations and guidance
- Strengths / weaknesses summary with actionable guidance
- Researcher self-service readiness report (pre-submission)
- Admin review: annotate, override, approve before sharing (human-in-the-loop)
- Full audit log (proposal version, grant call reference, reviewer, timestamp)
- Mock institutional SSO (swap-in point clearly marked for real SAML/OIDC)

## Stack
- **Backend:** Node.js + Express, SQLite (better-sqlite3), JWT sessions, Multer uploads, pdf-parse/mammoth text extraction, Gemini API
- **Frontend:** React 18 + Vite + Tailwind CSS, React Router, lucide-react icons

## Project layout
```
proposal-eval/
  backend/      Express API, SQLite DB, Gemini integration
  frontend/     React dashboard (Vite + Tailwind)
```

## What's new: grant call management
Previously there was one fixed seeded grant call, so every researcher saw the same criteria. Now:
- **Admins** go to **Manage Grant Calls** in the sidebar → **New Grant Call** → either upload a grant call/RFP document (PDF/DOCX) to have AI auto-extract a summary + criteria list, or type criteria in manually. Each grant call has its own distinct criteria set, image, summary, and deadline.
- **Researchers** see a "Open grant calls" grid on their dashboard with cover images and short summaries. Clicking one opens a detail page showing the full description and its specific compliance criteria, with a "Submit a Proposal" button that pre-selects that grant call on the submission form.

## Setup

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env
# edit .env: set JWT_SECRET and GEMINI_API_KEY (get one at https://aistudio.google.com/apikey)
node seed.js        # creates demo users (with passwords) + a sample grant call
npm run dev          # starts API on http://localhost:4000
```

### 2. Frontend
```bash
cd frontend
npm install
cp .env.example .env   # then set VITE_GOOGLE_CLIENT_ID (see "Real SSO setup" below)
npm run dev          # starts dashboard on http://localhost:5173 (proxies /api to :4000)
```

### Real SSO setup (Google)
1. Go to https://console.cloud.google.com/apis/credentials, create/select a project, and click **Create Credentials → OAuth client ID**.
2. Application type: **Web application**.
3. Under **Authorized JavaScript origins**, add `http://localhost:5173`.
4. Click Create — copy the generated **Client ID** (looks like `123...apps.googleusercontent.com`).
5. Put that same Client ID in **both**:
   - `backend/.env` → `GOOGLE_CLIENT_ID=...`
   - `frontend/.env` → `VITE_GOOGLE_CLIENT_ID=...`
6. Restart both `npm run dev` processes.
7. On the login screen, switch to the **Single Sign-On** tab and click the official Google button.

First-time Google sign-in auto-creates a `researcher` account for that email (see `routes/auth.js`). Set `ALLOWED_EMAIL_DOMAINS` in `backend/.env` to restrict this to your institution's domain. To make someone an admin, update their `role` to `'admin'` in the `users` table.

Open http://localhost:5173. You'll see two sign-in options:
- **Email & Password** — use a seeded demo account, all with password `Passw0rd!`:
  - `amina.researcher@ku.ac.ae` — Researcher
  - `omar.researcher@ku.ac.ae` — Researcher
  - `fatima.admin@ku.ac.ae` — Research Admin Staff
- **Single Sign-On** — real "Sign in with Google" (once configured per above)

## Requirements traceability

| FR | Where implemented |
|---|---|
| FR-01.1 | `backend/routes/proposals.js` (multer, PDF/DOCX filter, size limit) + `SubmitProposal.jsx` |
| FR-01.2 | `backend/routes/grantcalls.js`, `seed.js` (repository), upload fallback supported the same way as proposals |
| FR-01.3 | `backend/services/geminiService.js` — per-criterion Pass/Partial/Not Met + explanation |
| FR-01.4 | Gemini prompt requires `strengths`/`weaknesses` with evidence + guidance; rendered in `ProposalReport.jsx` |
| FR-01.5 | Researcher role sees `/submit` + `/proposals/:id` report without any admin step required |
| FR-01.6 | `backend/routes/assessments.js` PATCH endpoint (annotate/override/approve); `ProposalReport.jsx` admin panel; assessments default to `ai_draft` and are never marked "shared" until `admin_approved` |
| FR-01.7 | All files stored under `backend/uploads`, DB is local SQLite on your infrastructure; `geminiService.js` has an explicit comment + `GEMINI_API_BASE` override point for routing through a private/VPC LLM endpoint instead of the public API |
| FR-01.8 | `audit_log` table records every login, submission, AI assessment, edit, and approval, with proposal version + grant call reference + timestamp; `AuditLog.jsx` admin view. Proposal `version` column auto-increments per researcher/grant-call. Wire a scheduled archival job for the 7-year retention policy in production |

## Important production notes
1. **SSO**: Google SSO is real (token verified server-side via `google-auth-library`), not mocked. For an enterprise IdP instead of Google (Azure AD, Okta, ADFS via SAML/OIDC), swap `routes/auth.js`'s `/sso/google` handler for an equivalent token/assertion verification step — the rest of the app already expects a signed app-level JWT, so only that one handler needs to change.
2. **Confidentiality (FR-01.7)**: if public Gemini API usage isn't acceptable for sensitive proposals, point `GEMINI_API_BASE` in `.env` at an approved private/VPC Gemini (Vertex AI) endpoint, or swap `geminiService.js` for an on-prem LLM client — no other code changes required.
3. **Retention**: add a scheduled job/export to satisfy the 7-year audit retention requirement (FR-01.8); SQLite is fine for a pilot, but plan a migration to Postgres/SQL Server for production scale and backups.
4. **File size limits**: confirm with IT and adjust `limits.fileSize` in `backend/routes/proposals.js` (currently 25MB).
