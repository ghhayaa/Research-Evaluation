// geminiService.js — Calls Google Gemini to evaluate a proposal against
// structured compliance criteria.
//
// KU INSTITUTIONAL CONTEXT: This platform is used by Khalifa University's
// Research Office to pre-screen proposals before formal submission in FIBI.
// The RIG-2024 grant call uses five official reviewer criteria (RG2401–RG2405)
// plus eligibility/budget/attachment compliance checks drawn from the
// RIG-2024 Call for Proposals and Decision Matrix documents.
//
// IMPORTANT (FR-01.7): if your institution's confidentiality policy forbids
// sending proposal text to external AI services, point GEMINI_API_BASE at an
// approved private/VPC endpoint (e.g. Vertex AI within your tenant).

const GEMINI_API_KEY  = process.env.GEMINI_API_KEY;
const GEMINI_MODEL    = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const GEMINI_API_BASE = process.env.GEMINI_API_BASE ||
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

async function callGemini(prompt) {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured (.env)");

  const response = await fetch(`${GEMINI_API_BASE}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  const raw  = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join("") || "";

  // Strip markdown fences if present
  let cleaned = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

  // Attempt 1: parse as-is
  try { return JSON.parse(cleaned); } catch {}

  // Attempt 2: fix common Gemini issues — trailing commas, unescaped newlines in strings
  try {
    const fixed = cleaned
      .replace(/,\s*([}\]])/g, "$1")           // trailing commas
      .replace(/\n/g, "\\n")                    // unescaped newlines inside strings
      .replace(/\r/g, "\\r")                    // unescaped carriage returns
      .replace(/[\x00-\x1F\x7F]/g, " ");        // other control characters
    return JSON.parse(fixed);
  } catch {}

  // Attempt 3: extract just the JSON object from surrounding text
  try {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch {}

  throw new Error("Failed to parse AI response as JSON: " + cleaned.slice(0, 200));
}

// ─── Proposal Evaluation ─────────────────────────────────────────────────────
// Evaluates a proposal against each compliance criterion with the same scoring
// scale used by RIG-2024 external reviewers (Poor 0-2 / Fair 3-4 / Good 5-6 /
// Very Good 7-8 / Excellent 9-10), mapped to Pass/Partial/Not Met for the
// readiness report.
function buildEvalPrompt(proposalText, criteria) {
  return `You are an expert research grants compliance reviewer working for Khalifa University's Research Office. You have been assigned to pre-screen this proposal using the same criteria and scoring scale as KU's official external reviewer panels.

KU OFFICIAL SCORING SCALE (RIG-2024):
- 9–10 Excellent: Proposal successfully addresses ALL aspects of the criterion → status: "Pass"
- 7–8 Very Good: Full criterion addressed very well, only a small number of shortcomings → status: "Pass"
- 5–6 Good: Criterion addressed well but a number of shortcomings present → status: "Partial"
- 3–4 Fair: Proposal broadly addresses elements but significant weaknesses present → status: "Partial"
- 0–2 Poor: Numerous components inadequately addressed or serious inherent weaknesses → status: "Not Met"

IMPORTANT: For criteria that list reviewer sub-questions (e.g. RG2401–RG2405), you MUST evaluate the proposal against EACH sub-question individually. Your score and explanation must reflect how well ALL sub-questions are answered — not just some. If even one sub-question is poorly addressed, the score cannot be 9–10. Be specific and quote or paraphrase short phrases from the proposal as evidence.

For EVERY criterion, return:
- status: exactly "Pass", "Partial", or "Not Met"
- score: numeric 0–10 per the KU scale above
- explanation: 2–4 sentences covering each sub-question with specific evidence from the proposal text
- evidence: a specific phrase or fact from the proposal supporting your verdict (or "Not found in proposal")
- guidance: concrete actionable steps referencing the specific sub-question or clause that is weak (e.g. "Sub-question 3 of RG2403 requires a Gantt chart which is absent from the proposal")

Also return:
- strengths: 2–5 specific strengths with evidence from the proposal text
- weaknesses: 2–5 specific gaps with guidance referencing the exact sub-question or call requirement
- overall_summary: 3–4 sentence plain-language summary of overall readiness
- readiness_recommendation: exactly one of: "Ready to submit", "Minor revisions needed", "Major revisions needed", "Not ready for submission"

Respond ONLY with valid JSON, no markdown fences, matching exactly:
{
  "criteria_results": [
    { "id": "...", "label": "...", "status": "Pass|Partial|Not Met", "score": 0, "explanation": "...", "evidence": "...", "guidance": "..." }
  ],
  "strengths":  [ { "point": "...", "evidence": "..." } ],
  "weaknesses": [ { "point": "...", "guidance": "..." } ],
  "overall_summary": "...",
  "readiness_recommendation": "..."
}

COMPLIANCE CRITERIA (including exact reviewer sub-questions where shown):
${JSON.stringify(criteria, null, 2)}

PROPOSAL TEXT (truncated to 30,000 characters):
${proposalText.slice(0, 12000)}
`;
}

export async function evaluateProposal(proposalText, criteria) {
  return callGemini(buildEvalPrompt(proposalText, criteria));
}

// ─── Criteria Extraction ─────────────────────────────────────────────────────
// Parses a grant call / RFP document and extracts structured compliance criteria
// (FR-01.2) plus a researcher-facing summary.
export async function extractCriteria(grantCallText) {
  const prompt = `You are a research grants compliance analyst working for Khalifa University's Research Office.

Read the GRANT CALL / RFP TEXT below and extract:

1. "summary": a 3-4 sentence plain-language summary of what this grant call funds, the award amount/duration if stated, and who should apply (for a researcher browsing available grants on the KU Proposal Compliance Platform).

2. "criteria": the distinct compliance and quality criteria a submitted proposal will be evaluated against. Include both:
   - Formal scoring criteria (e.g. scientific merit, team composition, impact)
   - Eligibility and compliance requirements (budget rules, required attachments, ethics requirements, eligibility conditions)
   Extract between 5 and 12 criteria. Use the actual criterion codes (e.g. RG2401) if present in the document.

For each criterion return:
- id: a short snake_case identifier (use the official code if given, e.g. "RG2401_situation_innovation")
- label: a short human-readable name matching the official criterion label where possible (2-5 words)
- description: one precise sentence describing exactly what is required, referencing the specific section/clause where applicable

Respond ONLY with valid JSON, no markdown fences:
{ "summary": "...", "criteria": [ { "id": "...", "label": "...", "description": "..." } ] }

GRANT CALL TEXT:
${grantCallText.slice(0, 15000)}
`;

  const result = await callGemini(prompt);
  if (!result.criteria || !Array.isArray(result.criteria)) {
    throw new Error("AI did not return a valid criteria list");
  }
  return result;
}

// ─── Grant Compatibility Pre-Screen ──────────────────────────────────────────
// Checks a proposal against ONE target grant call chosen by the PI.
// If compatibility is Low, also suggests the best alternative from other open grants.
export async function prescreenProposal(proposalText, targetGrant, otherGrants) {
  const prompt = `You are a senior research grants advisor at Khalifa University.

A PI wants to apply to a specific grant call. Evaluate their proposal using the EXACT SAME scoring scale as KU's official reviewer panels — do not inflate scores.

SCORING SCALE (must match official KU reviewer standards):
- 9-10 Excellent → score 90-100 → "High" compatibility
- 7-8 Very Good → score 70-89 → "High" compatibility
- 5-6 Good → score 50-69 → "Medium" compatibility
- 3-4 Fair → score 30-49 → "Medium" compatibility
- 0-2 Poor → score 0-29 → "Low" compatibility

Evaluate ALL criteria listed, including every sub-question. Be as rigorous as an official reviewer — a proposal missing even one major requirement should score no higher than Medium.

Return:
- compatibility: "High" (score >= 70), "Medium" (score 40-69), "Low" (score < 40)
- score: integer 0-100
- summary: 2-3 sentences referencing specific evidence from the proposal
- strengths: 2-3 specific alignments with evidence from proposal text
- gaps: 2-3 specific weaknesses referencing the exact criteria sub-questions not met
- verdict: one direct sentence
- ready_to_apply: true only if score >= 65
- best_alternative_id: id of better alternative grant if score < 65, otherwise null
- best_alternative_reason: why the alternative fits better, or null

Respond ONLY with valid JSON, no markdown fences:
{
  "compatibility": "High|Medium|Low",
  "score": 0,
  "summary": "...",
  "strengths": "...",
  "gaps": "...",
  "verdict": "...",
  "ready_to_apply": true,
  "best_alternative_id": null,
  "best_alternative_reason": null
}

TARGET GRANT CALL — evaluate against ALL criteria listed including sub-questions:
${JSON.stringify({
  title: targetGrant.title,
  sponsor: targetGrant.sponsor,
  reference: targetGrant.reference,
  summary: targetGrant.summary,
  criteria: targetGrant.criteria?.map(c => c.label + ": " + c.description).join("\n")
}, null, 2)}

OTHER GRANT CALLS (only needed if score < 65):
${JSON.stringify(otherGrants.map(g => ({
  id: g.id,
  title: g.title,
  sponsor: g.sponsor,
  summary: g.summary
})), null, 2)}

PROPOSAL TEXT:
${proposalText.slice(0, 12000)}
`;

  const result = await callGemini(prompt);
  return result;
}

// Scan against all grant calls simultaneously
export async function prescreenProposalAll(proposalText, grantCalls) {
  const prompt = `You are a senior research grants advisor at Khalifa University. A PI has uploaded a draft proposal. Evaluate how compatible it is with EACH of the following grant calls and rank them.

For EACH grant call return:
- grant_call_id: the id provided
- compatibility: "High", "Medium", or "Low"
- score: 0-100
- summary: 2-3 sentences on fit
- strengths: 1-2 specific alignments
- gaps: 1-2 specific gaps
- verdict: one sentence recommendation

Also return:
- best_match_id: the single best grant_call_id
- overall_advice: 3-4 sentences of overall guidance

Respond ONLY with valid JSON, no markdown fences:
{
  "best_match_id": "...",
  "overall_advice": "...",
  "results": [
    { "grant_call_id": "...", "compatibility": "High|Medium|Low", "score": 0, "summary": "...", "strengths": "...", "gaps": "...", "verdict": "..." }
  ]
}

GRANT CALLS:
${JSON.stringify(grantCalls.map(g => ({ id: g.id, title: g.title, sponsor: g.sponsor, summary: g.summary, criteria: g.criteria?.map(c => c.label + ": " + c.description).join("; ") })), null, 2)}

PROPOSAL TEXT:
${proposalText.slice(0, 12000)}`;

  const result = await callGemini(prompt);
  if (!result.results || !Array.isArray(result.results)) throw new Error("AI did not return a valid result");
  return result;
}
