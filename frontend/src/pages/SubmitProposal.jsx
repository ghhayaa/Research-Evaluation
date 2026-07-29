import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import client from "../api/client.js";
import { useNotifications } from "../context/NotificationContext.jsx";
import Topbar from "./Topbar.jsx";
import { UploadCloud, FileCheck2, Loader2, CheckCircle2, ChevronRight, Check } from "lucide-react";

const STEPS = ["Grant call", "Review criteria", "Upload & submit"];

function StepIndicator({ current }) {
  return (
    <div className="flex items-center gap-0 mb-7">
      {STEPS.map((label, i) => {
        const done   = i < current;
        const active = i === current;
        return (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold border-2 transition-all ${
                done   ? "border-emerald-500 bg-emerald-500 text-white" :
                active ? "border-[#1e3a5f] bg-[#1e3a5f] text-white" :
                         "border-[#E4E8EF] bg-white text-[#B0BBC8]"
              }`}>
                {done ? <Check size={14} /> : i + 1}
              </div>
              <span className={`text-[10px] font-semibold whitespace-nowrap ${
                active ? "text-[#1e3a5f]" : done ? "text-emerald-600" : "text-[#B0BBC8]"
              }`}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-3 mb-4 rounded transition-all ${
                i < current ? "bg-emerald-400" : "bg-[#E4E8EF]"
              }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function SubmitProposal() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedGrant = searchParams.get("grant");
  const { trackPending } = useNotifications();

  const [step, setStep] = useState(0);
  const [grantCalls, setGrantCalls] = useState([]);
  const [grantCallId, setGrantCallId] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    client.get("/grant-calls").then(r => {
      setGrantCalls(r.data);
      if (preselectedGrant && r.data.some(g => g.id === preselectedGrant)) {
        setGrantCallId(preselectedGrant);
        setStep(1); // skip to criteria review if coming from grant detail
      }
    });
  }, [preselectedGrant]);

  const selectedGrant = grantCalls.find(g => g.id === grantCallId);

  function goNext() { setError(""); setStep(s => s + 1); }
  function goBack() { setError(""); setStep(s => s - 1); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!title) { setError("Please enter a proposal title."); return; }
    if (!file)  { setError("Please attach a PDF or DOCX file."); return; }
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("title", title);
      form.append("grant_call_id", grantCallId);
      form.append("file", file);
      const { data } = await client.post("/proposals", form, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setSubmitted(true);
      trackPending(data.id, title);
      client.post(`/proposals/${data.id}/assess`).catch(err => console.error("AI assess error:", err));
    } catch (err) {
      setError(err?.response?.data?.error || "Submission failed");
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: "#E8F9F1" }}>
          <CheckCircle2 size={32} style={{ color: "#047857" }} />
        </div>
        <h2 className="text-[20px] font-bold text-[#1A2B42] mb-2">Proposal submitted</h2>
        <p className="text-[13px] text-[#8A9AB5] mb-8 leading-relaxed">
          <span className="font-semibold text-[#5A7093]">{title}</span> has been received and is being reviewed by the AI compliance engine.
          You'll get a notification when the report is ready.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => navigate("/proposals")}
            className="text-[12.5px] font-bold text-white px-5 py-2.5 rounded-lg" style={{ background: "#1e3a5f" }}>
            View my proposals
          </button>
          <button onClick={() => navigate("/")}
            className="text-[12.5px] font-semibold text-[#5A7093] px-5 py-2.5 rounded-lg border border-[#E4E8EF] hover:bg-[#F8FAFD]">
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  const inputCls = "w-full rounded-lg border border-[#E4E8EF] px-3.5 py-2.5 text-[13px] text-[#1A2B42] focus:outline-none focus:border-[#C89B2A] focus:ring-1 focus:ring-[#C89B2A]/30 bg-white transition-colors";

  return (
    <div className="max-w-4xl">
      <Topbar title="Submit Proposal for Review"
        subtitle="Submit your proposal for an AI readiness assessment based on the grant call's published criteria." />

      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-5">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 flex-shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <p className="text-[11.5px] text-blue-800 leading-relaxed">
          <span className="font-bold">Advisory assessment — not an official evaluation.</span> The AI readiness report is based on the Research Office's published call criteria and is indicative only. It does not predict official reviewer scores or guarantee any outcome. Formal submission to the Research Office remains via the institution's production research system (FIBI). Final decisions remain under Research Office control.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-[#E4E8EF] p-8">
        <StepIndicator current={step} />

        {/* ── Step 0: Select grant call ── */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <label className="block text-[11.5px] font-bold text-[#5A7093] mb-1.5">Which grant call are you applying to? *</label>
              <select value={grantCallId} onChange={e => setGrantCallId(e.target.value)} className={inputCls}>
                <option value="">— Select a grant call —</option>
                {grantCalls.map(g => (
                  <option key={g.id} value={g.id}>{g.title} ({g.reference})</option>
                ))}
              </select>
            </div>

            {selectedGrant && (
              <div className="bg-[#F8FAFD] rounded-xl border border-[#E4E8EF] p-4">
                {selectedGrant.image_url && (
                  <div className="h-24 -mx-4 -mt-4 mb-4 rounded-t-xl overflow-hidden">
                    <img src={selectedGrant.image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] mb-1" style={{ color: "#C89B2A" }}>{selectedGrant.sponsor}</p>
                <p className="text-[13px] font-semibold text-[#1A2B42] mb-1">{selectedGrant.title}</p>
                {selectedGrant.deadline && <p className="text-[11px] text-[#8A9AB5]">Deadline: {selectedGrant.deadline}</p>}
                {selectedGrant.summary && <p className="text-[11.5px] text-[#5A7093] mt-2 leading-relaxed">{selectedGrant.summary}</p>}
              </div>
            )}

            {error && <p className="text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3.5 py-2.5">{error}</p>}

            <button
              onClick={() => {
                if (!grantCallId) { setError("Please select a grant call first."); return; }
                goNext();
              }}
              className="w-full flex items-center justify-center gap-2 text-[13px] font-bold text-white py-3 rounded-lg"
              style={{ background: "#1e3a5f" }}>
              Continue <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ── Step 1: Review criteria ── */}
        {step === 1 && selectedGrant && (
          <div className="space-y-4">
            <div>
              <p className="text-[13px] font-semibold text-[#1A2B42] mb-0.5">Review what the AI will check</p>
              <p className="text-[11.5px] text-[#8A9AB5]">
                These are the exact criteria your proposal will be evaluated against — These are the published call criteria from the Research Office's official grant call documents. The AI readiness report will assess your proposal against each of these criteria.
              </p>
            </div>

            <div className="space-y-2">
              {selectedGrant.criteria?.map((c, i) => (
                <div key={c.id || i} className="flex gap-3 bg-[#F8FAFD] border border-[#E4E8EF] rounded-xl px-4 py-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0 mt-0.5" style={{ background: "#1e3a5f" }}>
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-[#1A2B42]">{c.label}</p>
                    <p className="text-[11px] text-[#8A9AB5] mt-0.5 leading-relaxed">{c.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={goBack}
                className="flex-1 text-[12.5px] font-semibold text-[#5A7093] py-2.5 rounded-lg border border-[#E4E8EF] hover:bg-[#F8FAFD]">
                Back
              </button>
              <button onClick={goNext}
                className="flex-[2] flex items-center justify-center gap-2 text-[13px] font-bold text-white py-2.5 rounded-lg"
                style={{ background: "#1e3a5f" }}>
                I've reviewed the criteria <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Upload & submit ── */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11.5px] font-bold text-[#5A7093] mb-1.5">Proposal title *</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Advancing Freeze Crystallization for Desalination"
                className={inputCls}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[11.5px] font-bold text-[#5A7093] mb-1.5">Proposal document (PDF or DOCX) *</label>
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#E4E8EF] rounded-xl py-10 cursor-pointer hover:border-[#C89B2A] hover:bg-amber-50/20 transition-colors">
                {file ? (
                  <><FileCheck2 size={28} style={{ color: "#047857" }} />
                  <span className="text-[13px] font-semibold text-[#1A2B42]">{file.name}</span>
                  <span className="text-[11px] text-[#8A9AB5]">Click to replace</span></>
                ) : (
                  <><UploadCloud size={28} className="text-[#C5CDD8]" />
                  <span className="text-[13px] text-[#8A9AB5]">Click to browse, or drag a file here</span>
                  <span className="text-[11px] text-[#B0BBC8]">PDF or DOCX · max 25 MB</span></>
                )}
                <input type="file" accept=".pdf,.docx" className="hidden" onChange={e => setFile(e.target.files[0])} />
              </label>
            </div>

            {/* Summary of what's being submitted */}
            <div className="bg-[#F8FAFD] border border-[#E4E8EF] rounded-xl px-4 py-3 text-[11.5px] text-[#5A7093] space-y-1">
              <div className="flex justify-between"><span className="font-semibold">Grant call</span><span className="text-right max-w-[60%] truncate">{selectedGrant?.title}</span></div>
              <div className="flex justify-between"><span className="font-semibold">Criteria to check</span><span>{selectedGrant?.criteria?.length || 0} criteria</span></div>
            </div>

            {error && <p className="text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3.5 py-2.5">{error}</p>}

            <div className="flex gap-3">
              <button type="button" onClick={goBack}
                className="flex-1 text-[12.5px] font-semibold text-[#5A7093] py-2.5 rounded-lg border border-[#E4E8EF] hover:bg-[#F8FAFD]">
                Back
              </button>
              <button type="submit" disabled={submitting}
                className="flex-[2] flex items-center justify-center gap-2 text-[13px] font-bold text-white py-2.5 rounded-lg disabled:opacity-60"
                style={{ background: "#1e3a5f" }}>
                {submitting ? <><Loader2 size={16} className="animate-spin" /> Submitting…</> : "Submit for AI Review"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
