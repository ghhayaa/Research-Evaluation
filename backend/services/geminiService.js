// geminiService.js — Calls Google Gemini to evaluate a proposal against
// published grant call criteria from the Research Office's official documents.
//
// ADVISORY NOTICE: All AI outputs from this service are indicative only.
// They do not predict official reviewer scores, guarantee any outcome, or
// substitute for the Research Office's formal evaluation process.
// Final decisions remain under Research Office control.
// Formal submission is via the institution's production research system (FIBI).
//
// KU INSTITUTIONAL CONTEXT: This platform is used by Khalifa University's
// Research Office to pre-screen proposals before formal submission in FIBI.
// Criteria are sourced from the Research Office's official grant call documents.
//
// IMPORTANT (FR-01.7): if your institution's confidentiality policy forbids
// sending proposal text to external AI services, point GEMINI_API_BASE at an
// approved private/VPC endpoint (e.g. Vertex AI within your tenant).

const GEMINI_API_KEY  = process.env.GEMINI_API_KEY;
const GEMINI_MODEL    = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_API_BASE = process.env.GEMINI_API_BASE ||
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

async function callGemini(prompt) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured (.env)");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(
      `${GEMINI_API_BASE}?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const candidate = data?.candidates?.[0];
    const finishReason = candidate?.finishReason;
    const raw = candidate?.content?.parts?.map((p) => p.text || "").join("") || "";

    if (!raw.trim()) throw new Error(`Gemini returned empty response. Finish: ${finishReason || "unknown"}`);
    if (finishReason === "MAX_TOKENS") throw new Error("Gemini response was cut off (max tokens reached).");

    const cleaned = raw
      .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

    try { return JSON.parse(cleaned); } catch {}
    try { return JSON.parse(cleaned.replace(/,\s*([}\]])/g, "$1")); } catch {}
    try { const m = cleaned.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); } catch {}

    throw new Error(`Failed to parse Gemini response as JSON. Ended with:\n${cleaned.slice(-300)}`);
  } catch (error) {
    if (error.name === "AbortError") throw new Error("Gemini request timed out after 60 seconds.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function buildEvalPrompt(proposalText, criteria) {
  const compactCriteria = criteria.map((c) => ({
    id: c.id, label: c.label, description: c.description,
  }));

  return `You are a research grant readiness advisor for Khalifa University's Research Office.

Evaluate the proposal against the published call criteria below and produce an advisory readiness report.
This assessment is based on the published call criteria — it does not predict official reviewer scores
or guarantee any outcome. Results are indicative and advisory only.

READINESS SCALE (based on published call criteria):
- 9-10 = Pass
- 7-8 = Pass
- 5-6 = Partial
- 3-4 = Partial
- 0-2 = Not Met

RULES:
- Evaluate every criterion against evidence found in the proposal only.
- Do not invent missing information.
- Keep each explanation under 35 words.
- Return exactly 2 strengths and 2 weaknesses.
- Keep the overall summary under 60 words.
- Return valid JSON only — no markdown, no commentary.

Return exactly this structure:

{
  "criteria_results": [
    {
      "id": "criterion id",
      "label": "criterion label",
      "status": "Pass",
      "score": 0,
      "explanation": "Short explanation based on the proposal"
    }
  ],
  "strengths": [ { "point": "Specific strength" }, { "point": "Specific strength" } ],
  "weaknesses": [ { "point": "Specific weakness" }, { "point": "Specific weakness" } ],
  "overall_summary": "Short advisory readiness summary",
  "readiness_recommendation": "Ready to submit"
}

readiness_recommendation must be exactly one of:
- "Ready to submit"
- "Minor revisions needed"
- "Major revisions needed"
- "Not ready for submission"

PUBLISHED CALL CRITERIA (sourced from Research Office official documents):
${JSON.stringify(compactCriteria)}

PROPOSAL:
${proposalText.slice(0, 10000)}
`;
}

export async function evaluateProposal(proposalText, criteria) {
  return callGemini(buildEvalPrompt(proposalText, criteria));
}

export async function extractCriteria(grantCallText) {
  const prompt = `You are a research grants analyst for Khalifa University's Research Office.

Read the GRANT CALL / RFP TEXT below (an official Research Office document) and extract:

1. "summary": 3-4 sentence plain-language summary of what this call funds, award amount/duration if stated, and who should apply.

2. "criteria": distinct compliance and quality criteria from the published document. Include:
   - Formal scoring criteria (scientific merit, team composition, impact, etc.)
   - Eligibility and compliance requirements (budget rules, attachments, ethics, etc.)
   Extract between 5 and 12 criteria. Use official criterion codes (e.g. RG2401) if present.

For each criterion:
- id: snake_case identifier (use official code if present)
- label: short human-readable name (2-5 words)
- description: one precise sentence describing what is required

Respond ONLY with valid JSON, no markdown:
{ "summary": "...", "criteria": [ { "id": "...", "label": "...", "description": "..." } ] }

GRANT CALL TEXT:
${grantCallText.slice(0, 15000)}
`;

  const result = await callGemini(prompt);
  if (!result.criteria || !Array.isArray(result.criteria)) throw new Error("AI did not return a valid criteria list");
  return result;
}

export async function prescreenProposal(proposalText, targetGrant, otherGrants) {
  const prompt = `You are a research grant readiness advisor for Khalifa University's Research Office.

A PI wants an advisory pre-screening assessment of their proposal against a specific grant call's
published criteria. This is an indicative readiness check only — results are advisory, do not
predict official reviewer scores, and do not constitute a formal evaluation or decision.

READINESS SCALE (based on published call criteria):
- High readiness (score 70-100): Proposal addresses the published criteria well
- Medium readiness (score 40-69): Proposal partially addresses the criteria — revisions recommended
- Low readiness (score 0-39): Proposal has significant gaps against the published criteria

Evaluate the proposal and return:
- compatibility: "High", "Medium", or "Low"
- score: integer 0-100
- summary: 2-3 sentences with specific evidence from the proposal
- strengths: 2-3 specific alignments with the published criteria
- gaps: 2-3 specific areas where the proposal falls short of the published criteria
- suggestions: 2-3 concrete, actionable improvements the PI can make before re-checking
- verdict: one advisory sentence
- ready_to_apply: true if score >= 65 (advisory indicator only)
- best_alternative_id: id of a better-fitting grant if score < 65, otherwise null
- best_alternative_reason: brief reason, or null

Respond ONLY with valid JSON, no markdown:
{
  "compatibility": "High|Medium|Low",
  "score": 0,
  "summary": "...",
  "strengths": "...",
  "gaps": "...",
  "suggestions": "...",
  "verdict": "...",
  "ready_to_apply": true,
  "best_alternative_id": null,
  "best_alternative_reason": null
}

TARGET GRANT CALL (published criteria from Research Office official documents):
${JSON.stringify({
  title: targetGrant.title,
  sponsor: targetGrant.sponsor,
  reference: targetGrant.reference,
  summary: targetGrant.summary,
  criteria: targetGrant.criteria?.map(c => c.label + ": " + c.description).join("\n")
}, null, 2)}

OTHER GRANT CALLS (only needed if score < 65):
${JSON.stringify(otherGrants.map(g => ({
  id: g.id, title: g.title, sponsor: g.sponsor, summary: g.summary
})), null, 2)}

PROPOSAL TEXT:
${proposalText.slice(0, 12000)}
`;

  return callGemini(prompt);
}

export async function prescreenProposalAll(proposalText, grantCalls) {
  const prompt = `You are a research grant readiness advisor for Khalifa University's Research Office.

A PI has uploaded a draft proposal for an advisory scan against all open grant calls.
This is an indicative readiness check only — results are advisory and do not predict
official reviewer scores or guarantee any outcome.

For EACH grant call return:
- grant_call_id: the id provided
- compatibility: "High", "Medium", or "Low"
- score: 0-100
- summary: 2-3 sentences on alignment
- strengths: 1-2 specific alignments with the published criteria
- gaps: 1-2 specific gaps against the published criteria
- verdict: one advisory sentence

Also return:
- best_match_id: the grant_call_id that best fits this proposal
- overall_advice: 3-4 sentences of advisory guidance for the PI

Respond ONLY with valid JSON, no markdown:
{
  "best_match_id": "...",
  "overall_advice": "...",
  "results": [
    { "grant_call_id": "...", "compatibility": "High|Medium|Low", "score": 0, "summary": "...", "strengths": "...", "gaps": "...", "verdict": "..." }
  ]
}

GRANT CALLS (published criteria from Research Office official documents):
${JSON.stringify(grantCalls.map(g => ({
  id: g.id, title: g.title, sponsor: g.sponsor, summary: g.summary,
  criteria: g.criteria?.map(c => c.label + ": " + c.description).join("; ")
})), null, 2)}

PROPOSAL TEXT:
${proposalText.slice(0, 12000)}`;

  const result = await callGemini(prompt);
  if (!result.results || !Array.isArray(result.results)) throw new Error("AI did not return a valid result");
  return result;
}