import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import client from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import ComplianceRing from "../components/ComplianceRing.jsx";
import { statusMeta } from "../utils/status.js";
import {
  CheckCircle2, AlertTriangle, XCircle, ShieldCheck,
  MessageSquareWarning, RefreshCcw, Loader2, UploadCloud,
  MessageSquare, ThumbsUp, ThumbsDown,
} from "lucide-react";

const PANEL_BG = "#F8FAFD";

function StatusBanner({ status }) {
  const m = statusMeta(status);
  const icons = {
    approved: <ShieldCheck size={14} />,
    declined: <XCircle size={14} />,
    changes_requested: <MessageSquareWarning size={14} />,
    ai_reviewed: <RefreshCcw size={14} />,
  };
  return (
    <div className={`flex items-center gap-2 text-xs font-semibold rounded-md px-3.5 py-2 mb-4 ${m.cls}`}>
      {icons[status]} {
        status === "approved" ? "Approved by Research Admin Staff — this assessment has been formally signed off." :
        status === "declined" ? "Proposal declined by Research Admin Staff." :
        status === "changes_requested" ? "Changes requested — review admin feedback below before resubmitting." :
        status === "ai_reviewed" ? "AI draft — awaiting Research Admin Staff review." :
        "Submitted — awaiting AI compliance review."
      }
    </div>
  );
}

function CritCard({ c }) {
  const map = {
    Pass:      { bg: "#D1FAE5", icon: <CheckCircle2 size={12} style={{ color: "#059669" }} />, badge: "bg-emerald-100 text-emerald-800" },
    Partial:   { bg: "#FEF3C7", icon: <AlertTriangle size={12} style={{ color: "#D97706" }} />, badge: "bg-amber-100 text-amber-800" },
    "Not Met": { bg: "#FEE2E2", icon: <XCircle size={12} style={{ color: "#DC2626" }} />,       badge: "bg-rose-100 text-rose-800" },
  };
  const cfg = map[c.status] || map.Partial;
  return (
    <div className="bg-white border border-[#E0E6EF] rounded-lg p-3 flex items-start gap-2.5">
      <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: cfg.bg }}>
        {cfg.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11.5px] font-semibold text-[#1A2B42]">{c.label}</p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {c.score !== undefined && c.score !== null && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#EEF1F7] text-[#5A7093]">{c.score}/10</span>
            )}
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>{c.status}</span>
          </div>
        </div>
        <p className="text-[10px] text-[#8A9AB5] mt-1 leading-[1.45]">{c.explanation}</p>
        {c.guidance && c.status !== "Pass" && (
          <p className="text-[10px] mt-1.5 leading-[1.45]" style={{ color: "#5A7093" }}>
            <span className="font-semibold">Guidance: </span>{c.guidance}
          </p>
        )}
      </div>
    </div>
  );
}

export default function ProposalReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [allProposals, setAllProposals] = useState([]);
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rerunning, setRerunning] = useState(false);
  const [notes, setNotes] = useState("");
  const [working, setWorking] = useState(false);
  const [confirmDecline, setConfirmDecline] = useState(false);

  async function loadAll() {
    const { data } = await client.get("/proposals");
    setAllProposals(data);
  }

  async function loadProposal(pid) {
    setLoading(true);
    try {
      const { data } = await client.get(`/proposals/${pid}`);
      setProposal(data);
      setNotes(data.assessments?.[0]?.reviewer_notes || "");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { loadProposal(id); }, [id]);

  async function runAssessment() {
    setRerunning(true);
    try {
      await client.post(`/proposals/${proposal.id}/assess`);
      await loadProposal(proposal.id);
      await loadAll();
    } finally { setRerunning(false); }
  }

  async function takeAction(action) {
    const a = proposal.assessments[0];
    setWorking(true);
    try {
      await client.patch(`/assessments/${a.id}`, { reviewer_notes: notes, action });
      await loadProposal(proposal.id);
      await loadAll();
      setConfirmDecline(false);
    } finally { setWorking(false); }
  }

  const assessment = proposal?.assessments?.[0];
  const report = assessment?.report;
  const counts = report
    ? report.criteria_results.reduce((acc, c) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc; }, {})
    : {};
  const finalStates = ["approved", "declined", "changes_requested"];
  const isFinalized = finalStates.includes(proposal?.status);

  return (
    <div className="flex h-full overflow-hidden">
      {/* LEFT: Proposal list panel */}
      <div className="w-[230px] bg-white border-r border-[#E0E6EF] flex flex-col flex-shrink-0">
        <div className="px-3.5 py-3 border-b border-[#EEF1F7]">
          <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#8A9AB5]">{isAdmin ? "All proposals" : "My proposals"}</p>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {allProposals.map(p => {
            const s = p.ai_summary;
            const pass = s?.Pass || 0, partial = s?.Partial || 0, notMet = s?.["Not Met"] || 0;
            const meta = statusMeta(p.status);
            const isSelected = p.id === id;
            return (
              <div
                key={p.id}
                onClick={() => navigate(`/proposals/${p.id}`)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer border-b border-[#F4F6FA] transition-colors ${isSelected ? "bg-[#F0F4FB]" : "hover:bg-[#F8FAFD]"}`}
                style={isSelected ? { borderLeft: "3px solid #C89B2A" } : { paddingLeft: 14 }}
              >
                <ComplianceRing pass={pass} partial={partial} notMet={notMet} size="sm" bg={isSelected ? "#F0F4FB" : "#fff"} />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-[#1A2B42] truncate">{p.title}</p>
                  <p className="text-[9.5px] text-[#8A9AB5] mt-px truncate">
                    {isAdmin ? `${p.owner_name} · ` : ""}v{p.version}
                  </p>
                  <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded-full mt-1 inline-block ${meta.cls}`}>{meta.label}</span>
                </div>
              </div>
            );
          })}
          {allProposals.length === 0 && (
            <p className="text-xs text-[#8A9AB5] text-center py-8">No proposals yet.</p>
          )}
        </div>
      </div>

      {/* RIGHT: Detail panel */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={28} className="animate-spin text-[#8A9AB5]" />
        </div>
      ) : !proposal ? (
        <div className="flex-1 flex items-center justify-center text-rose-500 text-sm">Proposal not found.</div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Detail header */}
          <div className="bg-white border-b border-[#E0E6EF] px-5 py-3.5 flex-shrink-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[9px] font-bold bg-[#EEF1F7] text-[#5A7093] px-2 py-0.5 rounded uppercase tracking-wide">
                v{proposal.version} · {isAdmin ? proposal.owner_name || "Researcher" : "My proposal"}
              </span>
              <span className="text-[10px] text-[#8A9AB5]">
                {proposal.grant_call_id && allProposals.find(p => p.id === proposal.id)?.grant_title || ""}
              </span>
            </div>
            <h1 className="text-[15px] font-bold text-[#0E2D52] leading-snug">{proposal.title}</h1>
            <p className="text-[10px] text-[#8A9AB5] mt-1">Submitted {new Date(proposal.created_at).toLocaleString()}</p>
          </div>

          {!report ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
              <div className="text-center">
                {isAdmin ? (
                  <>
                    <p className="text-sm font-semibold text-[#1A2B42] mb-1">No assessment yet</p>
                    <p className="text-xs text-[#8A9AB5]">Run the AI assessment to generate a compliance report.</p>
                  </>
                ) : (
                  <>
                    <Loader2 size={28} className="animate-spin text-[#8A9AB5] mx-auto mb-3" />
                    <p className="text-sm font-semibold text-[#1A2B42] mb-1">AI review in progress</p>
                    <p className="text-xs text-[#8A9AB5]">Your proposal has been submitted. You'll get a notification here as soon as the compliance report is ready — no need to stay on this page.</p>
                  </>
                )}
              </div>
              {isAdmin && (
                <button onClick={runAssessment} disabled={rerunning}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-white px-4 py-2.5 rounded-lg disabled:opacity-60"
                  style={{ background: "#0E2D52" }}>
                  {rerunning ? <Loader2 size={15} className="animate-spin" /> : <RefreshCcw size={15} />}
                  Run AI Assessment
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-1 overflow-hidden">
              {/* Ring + actions column */}
              <div className="w-[210px] flex-shrink-0 border-r border-[#E0E6EF] flex flex-col items-center py-5 px-3 gap-4 overflow-y-auto" style={{ background: PANEL_BG }}>
                <StatusBanner status={proposal.status} />

                <ComplianceRing
                  pass={counts["Pass"] || 0}
                  partial={counts["Partial"] || 0}
                  notMet={counts["Not Met"] || 0}
                  size="lg"
                  bg={PANEL_BG}
                />

                {/* Legend */}
                <div className="w-full space-y-2">
                  {[
                    { color: "#22c55e", label: "Pass", val: counts["Pass"] || 0, cls: "text-emerald-600" },
                    { color: "#f59e0b", label: "Partial", val: counts["Partial"] || 0, cls: "text-amber-600" },
                    { color: "#ef4444", label: "Not met", val: counts["Not Met"] || 0, cls: "text-rose-600" },
                  ].map(l => (
                    <div key={l.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                        <span className="text-[11px] text-[#5A7093]">{l.label}</span>
                      </div>
                      <span className={`text-[13px] font-bold ${l.cls}`}>{l.val}</span>
                    </div>
                  ))}
                </div>

                <div className="w-full h-px bg-[#E0E6EF]" />

                {/* Researcher: resubmit CTA */}
                {!isAdmin && proposal.status === "changes_requested" && (
                  <Link to={`/submit?grant=${proposal.grant_call_id}`}
                    className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold py-2 rounded-lg text-white"
                    style={{ background: "#C89B2A" }}>
                    <UploadCloud size={13} /> Submit Revised
                  </Link>
                )}

                {/* Admin: action buttons */}
                {isAdmin && (
                  <div className="w-full space-y-2">
                    {isFinalized && (
                      <p className="text-[9px] text-[#8A9AB5] text-center leading-tight">
                        Decision: <strong>{statusMeta(proposal.status).label}</strong>. You can change it below.
                      </p>
                    )}
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Admin notes / feedback for PI…"
                      className="w-full text-[10px] rounded-lg border border-[#E0E6EF] px-2.5 py-2 focus:outline-none focus:ring-2 resize-none"
                      style={{ background: "#fff" }}
                    />
                    <button onClick={() => takeAction("approve")} disabled={working}
                      className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold py-2 rounded-lg text-white disabled:opacity-60"
                      style={{ background: "#059669" }}>
                      <ShieldCheck size={13} /> Approve &amp; Share
                    </button>
                    <button onClick={() => takeAction("request_changes")} disabled={working}
                      className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold py-2 rounded-lg disabled:opacity-60"
                      style={{ background: "#FEF3C7", color: "#92400E", border: "1px solid #FCD34D" }}>
                      <MessageSquareWarning size={13} /> Request Changes
                    </button>
                    {!confirmDecline ? (
                      <button onClick={() => setConfirmDecline(true)} disabled={working}
                        className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold py-2 rounded-lg disabled:opacity-60"
                        style={{ background: "#fff", color: "#DC2626", border: "1px solid #FECACA" }}>
                        <XCircle size={13} /> Decline
                      </button>
                    ) : (
                      <div className="bg-rose-50 border border-rose-200 rounded-lg p-2 text-center">
                        <p className="text-[10px] font-semibold text-rose-700 mb-1.5">Confirm decline?</p>
                        <div className="flex gap-2">
                          <button onClick={() => takeAction("decline")} className="flex-1 text-[10px] font-bold bg-rose-600 text-white py-1.5 rounded-md">Yes</button>
                          <button onClick={() => setConfirmDecline(false)} className="flex-1 text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 py-1.5 rounded-md">Cancel</button>
                        </div>
                      </div>
                    )}
                    <button onClick={runAssessment} disabled={rerunning}
                      className="w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold py-2 rounded-lg disabled:opacity-60"
                      style={{ background: "#fff", color: "#5A7093", border: "1px solid #E0E6EF" }}>
                      {rerunning ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
                      Re-run AI
                    </button>
                  </div>
                )}
              </div>

              {/* Criteria + feedback */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                {/* Overall summary */}
                <div className="bg-white border border-[#E0E6EF] rounded-lg p-3.5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#8A9AB5] mb-1.5">Overall summary</p>
                  <p className="text-[11px] text-[#5A7093] leading-relaxed">{report.overall_summary}</p>
                </div>

                {/* Readiness recommendation */}
                {report.readiness_recommendation && (() => {
                  const rec = report.readiness_recommendation;
                  const styles = {
                    "Ready to submit":           { bg: "#D1FAE5", text: "#065F46", border: "#6EE7B7" },
                    "Minor revisions needed":    { bg: "#FEF3C7", text: "#92400E", border: "#FCD34D" },
                    "Major revisions needed":    { bg: "#FEE2E2", text: "#991B1B", border: "#FCA5A5" },
                    "Not ready for submission":  { bg: "#FEE2E2", text: "#991B1B", border: "#FCA5A5" },
                  };
                  const s = styles[rec] || styles["Minor revisions needed"];
                  return (
                    <div className="rounded-lg px-3.5 py-2.5 border text-[11px] font-semibold flex items-center gap-2"
                      style={{ background: s.bg, color: s.text, borderColor: s.border }}>
                      <span className="text-[9px] font-black uppercase tracking-[0.1em] opacity-60">KU Readiness:</span>
                      {rec}
                    </div>
                  );
                })()}

                {/* Admin feedback */}
                {assessment?.reviewer_notes?.trim() && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5">
                    <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-amber-800 mb-1.5 flex items-center gap-1.5">
                      <MessageSquare size={11} /> Admin Feedback
                    </p>
                    <p className="text-[11px] text-amber-900 leading-relaxed whitespace-pre-wrap">{assessment.reviewer_notes}</p>
                  </div>
                )}

                {/* Criteria */}
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#8A9AB5] pt-1">Compliance criteria</p>
                {report.criteria_results.map(c => <CritCard key={c.id} c={c} />)}

                {/* Strengths / weaknesses */}
                {(report.strengths?.length > 0 || report.weaknesses?.length > 0) && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="bg-white border border-[#E0E6EF] rounded-lg p-3">
                      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#8A9AB5] mb-2 flex items-center gap-1"><ThumbsUp size={10} />Strengths</p>
                      <ul className="space-y-2">
                        {report.strengths?.map((s,i) => (
                          <li key={i}>
                            <p className="text-[10.5px] font-semibold text-[#1A2B42]">{s.point}</p>
                            <p className="text-[9.5px] text-[#8A9AB5] mt-0.5">{s.evidence}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-white border border-[#E0E6EF] rounded-lg p-3">
                      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#8A9AB5] mb-2 flex items-center gap-1"><ThumbsDown size={10} />Gaps</p>
                      <ul className="space-y-2">
                        {report.weaknesses?.map((w,i) => (
                          <li key={i}>
                            <p className="text-[10.5px] font-semibold text-[#1A2B42]">{w.point}</p>
                            <p className="text-[9.5px] text-[#8A9AB5] mt-0.5">{w.guidance}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
