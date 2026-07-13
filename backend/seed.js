// seed.js — demo users + real KU grant calls including the actual RIG-2024.
// Run once: `node seed.js`
import db from "./db.js";
import { v4 as uuid } from "uuid";
import bcrypt from "bcryptjs";

const DEMO_PASSWORD = "Passw0rd!";

const users = [
  { id: uuid(), name: "Dr. Amina Al Suwaidi",  email: "amina.researcher@ku.ac.ae", role: "researcher", department: "Biomedical Engineering" },
  { id: uuid(), name: "Omar Al Mansoori",       email: "omar.researcher@ku.ac.ae",  role: "researcher", department: "Computer Science" },
  { id: uuid(), name: "Fatima Al Hashimi",      email: "fatima.admin@ku.ac.ae",     role: "admin",       department: "Research Office" },
];

const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);
const insertUser = db.prepare(`INSERT OR IGNORE INTO users (id,name,email,role,department,password_hash) VALUES (?,?,?,?,?,?)`);
users.forEach(u => insertUser.run(u.id, u.name, u.email, u.role, u.department, passwordHash));

const insertGC = db.prepare(`
  INSERT OR IGNORE INTO grant_calls (id,title,sponsor,reference,summary,image_url,deadline,status,criteria_json,source,created_at)
  VALUES (?,?,?,?,?,?,?,?,?,?,?)
`);

// =============================================================================
// REAL KU GRANT CALL — Research & Innovation Grant (RIG) 2024
// Criteria extracted directly from:
//   • RIG_2024_Call_for_Proposals_28Mar2024 (eligibility, team, budget, ethics)
//   • RIG-2024_Scoring_Criteria (RG2401–RG2405 — the official reviewer rubric)
//   • Decision_Matrix_RIG-2024 (validation/compliance checks)
//   • RIG-2024_LOC_Template (external collaborator requirements)
// =============================================================================
const rig2024Criteria = [
  {
    id: "RG2401_situation_innovation",
    label: "Situation & Innovation (RG2401)",
    description: "Reviewer sub-questions: (1) Does the proposal demonstrate depth of awareness around current theory and applicable state of the art? (2) Is there clear evidence of the need for further research in this area, and is there a logical connection between the evidenced need and the proposed project? (3) To what extent does the proposal represent a novel/innovative investigative approach to address the identified problem?"
  },
  {
    id: "RG2402_inputs_resources",
    label: "Inputs & Resources incl. Team (RG2402)",
    description: "Reviewer sub-questions: (1) Have any follow-on projects (past awards, pilot data, background IP, etc.) been identified and does this proposal represent a logical progression thereof? (2) Does the team have access to the necessary facilities (including external entity resources, as applicable) to deliver the project scope? (3) Does the composition of the research team convey clear added-value in terms of being able to effectively address the research challenge and deliver the project scope? (4) If included, do the engaged external entities broaden the expertise, scope of activity, resources or facilities available for project delivery — is their involvement well-described and justified? Note: funded external collaborators must be from a Top 200 QS-ranked institution or hold H-index ≥50 per Scopus."
  },
  {
    id: "RG2403_activities_timeline",
    label: "Activities & Timeline (RG2403)",
    description: "Reviewer sub-questions: (1) Have a range of reasonable goals and objectives been identified to deliver tangible outputs? (2) Is the methodology/technical design adequately justified and the originality and transformative potential clearly identified? (3) Is the project schedule (Gantt chart) included and reasonable for the proposed scope of work's scale and the 36-month project duration?"
  },
  {
    id: "RG2404_risk_mitigation",
    label: "Assumptions & Risk Mitigation (RG2404)",
    description: "Reviewer sub-questions: (1) Does the proposal identify and address its critical assumptions and potential problem areas related to the delivery of the project? (2) Is the risk analysis sound, with a suitable mitigation strategy developed for each identified risk?"
  },
  {
    id: "RG2405_outputs_impact",
    label: "Outputs, Outcomes & Impact (RG2405)",
    description: "Reviewer sub-questions: (1) How realistic is the targeted TRL progression (assessed starting point and anticipated ending level) for the scope of work proposed? (2) Is the range of immediate, direct outputs sufficiently described and feasible — including probability of patents/IP/licensing, publications, student training and theses? (3) To what extent has a compelling case been made to realise benefits from project outcomes (scientific/technological advancements within the academic community) and the potential to contribute to long-term downstream impact on the local/international economy, industry, environment, or society?"
  },
  {
    id: "faculty_eligibility",
    label: "Faculty Eligibility",
    description: "PI holds Assistant Professor rank or above; PI is not currently PI on CIRA-2021, RIG-2023, or FSU-2024; total effort across all active grants does not exceed 40%; one (1) PI and at least one (1) KU Co-I (max 3 Co-Is) with effort 8.5%–15% each."
  },
  {
    id: "budget_compliance",
    label: "Budget Compliance",
    description: "OPEX only — no CAPEX permitted; total requested budget does not exceed AED 2,945,000 over 36 months; Period 1 (Oct–Dec 2024) restricted to personnel costs only; funded external collaborators receive no more than 30% of award per fiscal period; no carryover of funds between fiscal periods."
  },
  {
    id: "required_attachments",
    label: "Required Attachments & Format",
    description: "Completed RIG-2024 Full Proposal Template (correct cycle — not prior RIG/CIRA templates); Letter of Commitment (LOC) from each funded external collaborator signed by authorized institutional representative; LOC confirms min. 25% in-kind contribution; FIBI budget complete per CfP parameters; file named RIG-2024_PILastName_FP.doc."
  },
  {
    id: "ethics_safety",
    label: "Ethics, Safety & Conflicts of Interest",
    description: "IRB/ethics approval obtained prior to commencing activities involving human subjects, animal subjects, personal data collection, or hazardous/carcinogenic/radioactive materials; any financial conflicts of interest disclosed and managed per institutional policy before award commencement."
  },
];

const grantCalls = [
  // --- REAL KU GRANT CALL ---
  {
    id: uuid(),
    title: "Research & Innovation Grant (RIG) 2024 — Full Proposal Stage",
    sponsor: "Khalifa University — Office of Research",
    reference: "RIG-2024",
    summary: "KU's flagship competitive internal grant supporting collaborative research aligned with KU's nine strategic research areas (Managed Energy Transition, Sustainable Secure Society, Healthy Longevity, Advanced Materials & Manufacturing, Pervasive Digitalization). Funds up to AED 2.945M OPEX over 36 months. By invitation only at Full Proposal stage — shortlisted from EOI review. Strongly encourages interdisciplinary proposals and high-quality external collaborations with Top 200 QS institutions.",
    image_url: "https://images.unsplash.com/photo-1562774053-701939374585?w=800&q=80",
    deadline: "2024-07-15",
    criteria: rig2024Criteria,
  },
  // --- DEMO GRANT CALLS ---
  {
    id: uuid(),
    title: "National Research Excellence Grant 2026",
    sponsor: "Ministry of Research & Innovation",
    reference: "NREG-2026-04",
    summary: "Funds ambitious, high-impact research projects across all disciplines with awards up to AED 1.5M over 3 years. Open to all eligible PIs at accredited UAE institutions.",
    image_url: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&q=80",
    deadline: "2026-09-30",
    criteria: [
      { id: "budget_format",        label: "Budget Format",        description: "Budget must follow sponsor template with itemized direct/indirect costs." },
      { id: "eligibility",          label: "Eligibility",          description: "PI must hold eligible academic rank and institutional affiliation." },
      { id: "scope_alignment",      label: "Scope Alignment",      description: "Proposal objectives must align with the call's thematic priorities." },
      { id: "required_attachments", label: "Required Attachments", description: "CVs, letters of support, and institutional endorsement must be attached." },
      { id: "ethics_statement",     label: "Ethics Statement",     description: "An ethics/IRB statement is required if human or animal subjects are involved." },
      { id: "data_management",      label: "Data Management Plan", description: "A data management and sharing plan must be included per sponsor policy." },
    ],
  },
  {
    id: uuid(),
    title: "Sustainable Energy & Climate Innovation Fund",
    sponsor: "UAE Climate Investment Authority",
    reference: "SECIF-2026-02",
    summary: "Supports applied research in renewable energy, carbon capture, and climate resilience technologies, with priority given to projects with clear industry partnership and commercialization pathways.",
    image_url: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=800&q=80",
    deadline: "2026-08-15",
    criteria: [
      { id: "industry_partner",        label: "Industry Partnership",        description: "Proposal must name at least one committed industry or government partner." },
      { id: "tech_readiness",          label: "Technology Readiness Level",  description: "Project must specify current and target TRL." },
      { id: "budget_format",           label: "Budget Format",               description: "Budget must itemize co-funding contributions separately from requested funds." },
      { id: "environmental_impact",    label: "Environmental Impact Statement", description: "A quantified estimate of expected emissions/resource impact must be included." },
      { id: "commercialization_plan",  label: "Commercialization Plan",      description: "A 1-2 page path-to-market or deployment plan is required." },
      { id: "ip_disclosure",           label: "IP Disclosure",               description: "Any pre-existing intellectual property relevant to the project must be disclosed." },
    ],
  },
  {
    id: uuid(),
    title: "Early Career Researcher Seed Grant",
    sponsor: "KU Research Office",
    reference: "ECR-2026-11",
    summary: "Small seed grants (up to AED 75,000) designed to help early-career faculty generate pilot data for larger external funding applications. Streamlined, lighter-weight application process.",
    image_url: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80",
    deadline: "2026-07-31",
    criteria: [
      { id: "eligibility",       label: "Eligibility",        description: "PI must be within 5 years of their first academic appointment at KU." },
      { id: "pilot_focus",       label: "Pilot/Seed Focus",   description: "Proposal must clearly position the work as preliminary/pilot data generation, not a full study." },
      { id: "budget_format",     label: "Budget Format",      description: "Budget capped at AED 75,000 with no indirect cost allowance." },
      { id: "mentor_endorsement",label: "Mentor Endorsement", description: "A signed endorsement letter from a senior faculty mentor is required." },
      { id: "ethics_statement",  label: "Ethics Statement",   description: "An ethics/IRB statement is required if human or animal subjects are involved." },
    ],
  },
];

grantCalls.forEach(g => {
  insertGC.run(
    g.id, g.title, g.sponsor, g.reference, g.summary, g.image_url, g.deadline,
    "open", JSON.stringify(g.criteria), "repository", new Date().toISOString()
  );
});

console.log("Seeded users (email / password):");
users.forEach(u => console.log(`  ${u.role.padEnd(10)} ${u.email}  /  ${DEMO_PASSWORD}`));
console.log(`\nSeeded ${grantCalls.length} grant calls:`);
grantCalls.forEach(g => console.log(`  [${g.reference}] ${g.title} — ${g.criteria.length} criteria`));

// ─── Seed KU source documents for the RIG-2024 grant call ────────────────────
// Copy the actual uploaded files into the uploads folder and register them in
// the database so admins have the authoritative source documents available
// directly from the Manage Grant Calls screen.
import { createReadStream, createWriteStream, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const uploadsDir = join(__dirname, "uploads");
if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });

// Map of source files → document type labels
// Files are bundled in backend/uploads/ — no copying needed, just register them
const kuDocuments = [
  {
    src: join(__dirname, "uploads", "RIG_2024_Call_for_Proposals.pdf"),
    destName: "RIG_2024_Call_for_Proposals.pdf",
    originalName: "RIG-2024 Call for Proposals.pdf",
    docType: "call_for_proposals",
  },
  {
    src: join(__dirname, "uploads", "RIG_2024_Scoring_Criteria.docx"),
    destName: "RIG_2024_Scoring_Criteria.docx",
    originalName: "RIG-2024 Scoring Criteria.docx",
    docType: "scoring_criteria",
  },
  {
    src: join(__dirname, "uploads", "RIG_2024_LOC_Template.docx"),
    destName: "RIG_2024_LOC_Template.docx",
    originalName: "RIG-2024 LOC Template.docx",
    docType: "loc_template",
  },
  {
    src: join(__dirname, "uploads", "RIG_2024_Decision_Matrix.pdf"),
    destName: "RIG_2024_Decision_Matrix.pdf",
    originalName: "RIG-2024 Decision Matrix - EOI.pdf",
    docType: "decision_matrix",
  },
];

// Find the RIG-2024 grant call we just seeded
const rig2024 = db.prepare("SELECT id FROM grant_calls WHERE reference = 'RIG-2024'").get();
const adminUser = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();

if (rig2024 && adminUser) {
  const insertDoc = db.prepare(`
    INSERT OR IGNORE INTO grant_call_documents (id, grant_call_id, original_name, filepath, doc_type, uploaded_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  let seeded = 0;
  for (const doc of kuDocuments) {
    if (!existsSync(doc.src)) {
      console.log(`  ⚠ Skipped (not found): ${doc.originalName}`);
      continue;
    }
    // File is already in uploads/ — just register it in the database
    insertDoc.run(uuid(), rig2024.id, doc.originalName, doc.src, doc.docType, adminUser.id, new Date().toISOString());
    console.log(`  ✓ Seeded: ${doc.originalName}`);
    seeded++;
  }
  console.log(`\nSeeded ${seeded} KU grant call documents for RIG-2024.`);
} else {
  console.log("\nSkipped document seeding (RIG-2024 grant call or admin user not found).");
}
