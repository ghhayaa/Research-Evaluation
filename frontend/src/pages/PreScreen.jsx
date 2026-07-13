import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client.js";
import Topbar from "./Topbar.jsx";
import {
  UploadCloud, FileCheck2, Loader2, Sparkles,
  CheckCircle2, AlertTriangle, XCircle,
  ArrowRight, RefreshCcw, ArrowUpRight, Target, LayoutGrid
} from "lucide-react";

const COMPAT = {
  High:   { cls: "bg-emerald-100 text-emerald-800", bar: "bg-emerald-500", icon: <CheckCircle2 size={13} /> },
  Medium: { cls: "bg-amber-100 text-amber-800",     bar: "bg-amber-400",   icon: <AlertTriangle size={13} /> },
  Low:    { cls: "bg-rose-100 text-rose-800",       bar: "bg-rose-400",    icon: <XCircle size={13} /> },
};

function ScoreBar({ score }) {
  const color = score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="w-full bg-[#EEF1F7] rounded-full h-1.5 mt-1.5">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${score}%` }} />
    </div>
  );
}

function DropZone({ file, setFile }) {
  return (
    <label className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-[#E4E8EF] rounded-xl py-6 cursor-pointer hover:border-[#C89B2A] hover:bg-amber-50/20 transition-colors">
      {file
        ? <><FileCheck2 size={22} style={{ color: "#047857" }} /><span className="text-[11.5px] font-semibold text-[#1A2B42] text-center px-2 truncate w-full text-center">{file.name}</span><span className="text-[10px] text-[#8A9AB5]">Click to replace</span></>
        : <><UploadCloud size={24} className="text-[#C5CDD8]" /><span className="text-[11.5px] text-[#5A7093]">Click to browse or drag here</span><span className="text-[10px] text-[#B0BBC8]">PDF or DOCX · max 25 MB</span></>}
      <input type="file" accept=".pdf,.docx" className="hidden" onChange={e => setFile(e.target.files[0])} />
    </label>
  );
}

// ─── LEFT PANEL: specific grant ───────────────────────────────────────────────
function SpecificPanel({ grantCalls }) {
  const navigate = useNavigate();
  const [grantCallId, setGrantCallId] = useState("");
  const [file, setFile] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function handleScan(e) {
    e.preventDefault();
    if (!grantCallId) { setError("Please select a grant call."); return; }
    if (!file) { setError("Please attach your proposal."); return; }
    setScanning(true); setError(""); setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("grant_call_id", grantCallId);
      const { data } = await client.post("/prescreen", form, { headers: { "Content-Type": "multipart/form-data" } });
      setResult(data);
    } catch (err) {
      setError(err?.response?.data?.error || "Scan failed.");
    } finally { setScanning(false); }
  }

  const compat = result ? COMPAT[result.compatibility] || COMPAT.Low : null;

  return (
    <div className="bg-white rounded-xl border border-[#E4E8EF] flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#EEF1F7]">
        <div className="flex items-center gap-2 mb-0.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#1e3a5f" }}>
            <Target size={14} className="text-white" />
          </div>
          <p className="text-[13px] font-bold text-[#1A2B42]">AI Assessment System</p>
        </div>
        <p className="text-[11px] text-[#8A9AB5] pl-9">Upload your proposal and the AI will evaluate it against the selected grant call criteria.</p>
        <div className="mx-5 mt-3 mb-0 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <p className="text-[10.5px] text-amber-800"><span className="font-bold">Note:</span> This pre-screen uses the same scoring scale as the full AI assessment after submission, so scores should be consistent. Minor differences (±5-10%) are normal since the full assessment uses the complete proposal text extraction.</p>
        </div>
      </div>

      <div className="p-5 flex flex-col gap-4 flex-1">
        {!result ? (
          <form onSubmit={handleScan} className="flex flex-col gap-4 flex-1">
            <div>
              <label className="block text-[11px] font-bold text-[#5A7093] uppercase tracking-[0.07em] mb-1.5">Target grant call *</label>
              <select value={grantCallId} onChange={e => setGrantCallId(e.target.value)}
                className="w-full rounded-lg border border-[#E4E8EF] px-3 py-2.5 text-[12px] text-[#1A2B42] focus:outline-none focus:border-[#C89B2A] bg-white">
                <option value="">— Select a grant call —</option>
                {grantCalls.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#5A7093] uppercase tracking-[0.07em] mb-1.5">Proposal document *</label>
              <DropZone file={file} setFile={setFile} />
            </div>
            {error && <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={scanning || !file || !grantCallId}
              className="w-full flex items-center justify-center gap-2 text-[12.5px] font-bold text-white py-2.5 rounded-lg disabled:opacity-60 mt-auto"
              style={{ background: "#1e3a5f" }}>
              {scanning ? <><Loader2 size={14} className="animate-spin" /> Checking…</> : <><Target size={14} /> Check compatibility</>}
            </button>
            {scanning && <p className="text-[10.5px] text-[#8A9AB5] text-center -mt-2">This takes about 15–30 seconds…</p>}
          </form>
        ) : (
          <div className="flex flex-col gap-3 flex-1">
            {/* Score */}
            <div className={`rounded-xl p-4 border ${result.compatibility === "High" ? "bg-emerald-50 border-emerald-200" : result.compatibility === "Medium" ? "bg-amber-50 border-amber-200" : "bg-rose-50 border-rose-200"}`}>
              <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#8A9AB5] mb-1 truncate">{result.target_grant.title}</p>
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${compat.cls}`}>
                  {compat.icon} {result.compatibility}
                </span>
                <span className="text-[20px] font-extrabold text-[#1A2B42]">{result.score}<span className="text-[11px] text-[#8A9AB5]">/100</span></span>
              </div>
              <ScoreBar score={result.score} />
            </div>

            <p className="text-[11.5px] text-[#5A7093] leading-relaxed">{result.summary}</p>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-emerald-50 rounded-lg p-2.5">
                <p className="text-[9px] font-bold uppercase tracking-[0.07em] text-emerald-700 mb-1">Strengths</p>
                <p className="text-[10.5px] text-emerald-800 leading-relaxed">{result.strengths}</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-2.5">
                <p className="text-[9px] font-bold uppercase tracking-[0.07em] text-amber-700 mb-1">Gaps</p>
                <p className="text-[10.5px] text-amber-800 leading-relaxed">{result.gaps}</p>
              </div>
            </div>

            <p className="text-[11px] text-[#5A7093] italic">{result.verdict}</p>

            {result.ready_to_apply ? (
              <button onClick={() => navigate(`/submit?grant=${result.target_grant.id}`)}
                className="w-full flex items-center justify-center gap-2 text-[12.5px] font-bold text-white py-2.5 rounded-lg mt-auto"
                style={{ background: "#059669" }}>
                Apply now <ArrowRight size={14} />
              </button>
            ) : result.alternative_grant && (
              <div className="bg-[#F8FAFD] border border-[#E4E8EF] rounded-xl p-3 mt-auto">
                <p className="text-[9.5px] font-bold uppercase tracking-[0.07em] text-[#8A9AB5] mb-1">Suggested alternative</p>
                <p className="text-[11.5px] font-semibold text-[#1A2B42] mb-1">{result.alternative_grant.title}</p>
                {result.best_alternative_reason && <p className="text-[10.5px] text-[#5A7093] mb-2">{result.best_alternative_reason}</p>}
                <button onClick={() => navigate(`/submit?grant=${result.alternative_grant.id}`)}
                  className="w-full flex items-center justify-center gap-1.5 text-[11.5px] font-bold text-white py-2 rounded-lg"
                  style={{ background: "#1e3a5f" }}>
                  Apply to this instead <ArrowUpRight size={13} />
                </button>
              </div>
            )}

            <button onClick={() => { setResult(null); setFile(null); setGrantCallId(""); }}
              className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[#8A9AB5] hover:text-[#5A7093] py-1.5">
              <RefreshCcw size={12} /> Check again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── RIGHT PANEL: scan all grants ────────────────────────────────────────────
function AllPanel() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function handleScan(e) {
    e.preventDefault();
    if (!file) { setError("Please attach your proposal."); return; }
    setScanning(true); setError(""); setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await client.post("/prescreen/all", form, { headers: { "Content-Type": "multipart/form-data" } });
      setResult(data);
    } catch (err) {
      setError(err?.response?.data?.error || "Scan failed.");
    } finally { setScanning(false); }
  }

  return (
    <div className="bg-white rounded-xl border border-[#E4E8EF] flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#EEF1F7]">
        <div className="flex items-center gap-2 mb-0.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#6D28D9" }}>
            <LayoutGrid size={14} className="text-white" />
          </div>
          <p className="text-[13px] font-bold text-[#1A2B42]">AI Grant Recommender</p>
        </div>
        <p className="text-[11px] text-[#8A9AB5] pl-9">Upload your proposal and the AI will recommend the best matching grant call for you.</p>
      </div>

      <div className="p-5 flex flex-col gap-4 flex-1">
        {!result ? (
          <form onSubmit={handleScan} className="flex flex-col gap-4 flex-1">
            <div>
              <label className="block text-[11px] font-bold text-[#5A7093] uppercase tracking-[0.07em] mb-1.5">Proposal document *</label>
              <DropZone file={file} setFile={setFile} />
            </div>
            {error && <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={scanning || !file}
              className="w-full flex items-center justify-center gap-2 text-[12.5px] font-bold text-white py-2.5 rounded-lg disabled:opacity-60 mt-auto"
              style={{ background: "#6D28D9" }}>
              {scanning ? <><Loader2 size={14} className="animate-spin" /> Scanning all grants…</> : <><LayoutGrid size={14} /> AI Grant Recommender</>}
            </button>
            {scanning && <p className="text-[10.5px] text-[#8A9AB5] text-center -mt-2">Checking against all open grant calls — this takes about 30–45 seconds…</p>}
          </form>
        ) : (
          <div className="flex flex-col gap-3 flex-1 overflow-y-auto scrollbar-thin">
            <p className="text-[12px] text-[#5A7093] leading-relaxed bg-[#F8FAFD] rounded-lg p-3 border border-[#E4E8EF]">{result.overall_advice}</p>

            {result.results.map(r => {
              const compat = COMPAT[r.compatibility] || COMPAT.Low;
              const isBest = r.grant_call_id === result.best_match_id;
              return (
                <div key={r.grant_call_id}
                  className={`rounded-xl border overflow-hidden ${isBest ? "border-emerald-300" : "border-[#E4E8EF]"}`}>
                  {isBest && (
                    <div className="bg-emerald-50 px-3 py-1.5 flex items-center gap-1.5 border-b border-emerald-200">
                      <CheckCircle2 size={11} className="text-emerald-600" />
                      <span className="text-[10px] font-bold text-emerald-700">Best match</span>
                    </div>
                  )}
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-[12px] font-semibold text-[#1A2B42] leading-tight flex-1">{r.grant_call?.title}</p>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`inline-flex items-center gap-1 text-[9.5px] font-bold px-2 py-0.5 rounded-full ${compat.cls}`}>
                          {compat.icon} {r.compatibility}
                        </span>
                        <span className="text-[13px] font-extrabold text-[#1A2B42]">{r.score}</span>
                      </div>
                    </div>
                    <ScoreBar score={r.score} />
                    <p className="text-[10.5px] text-[#5A7093] mt-2 leading-relaxed line-clamp-2">{r.summary}</p>
                    {r.compatibility !== "Low" && (
                      <button onClick={() => navigate(`/submit?grant=${r.grant_call_id}`)}
                        className="mt-2 flex items-center gap-1 text-[10.5px] font-bold text-white px-3 py-1.5 rounded-lg"
                        style={{ background: isBest ? "#059669" : "#1e3a5f" }}>
                        Apply <ArrowRight size={11} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            <button onClick={() => { setResult(null); setFile(null); }}
              className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[#8A9AB5] hover:text-[#5A7093] py-1.5 mt-auto">
              <RefreshCcw size={12} /> Scan again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PreScreen() {
  const [grantCalls, setGrantCalls] = useState([]);
  useEffect(() => {
    client.get("/grant-calls").then(r => setGrantCalls(r.data.filter(g => g.status !== "closed")));
  }, []);

  return (
    <div>
      <Topbar title="AI Grant Compatibility" subtitle="Use the AI Assessment System to evaluate your proposal against a specific grant, or let the AI Recommender find the best grant call for you." />
      <div className="grid lg:grid-cols-2 gap-5" style={{ minHeight: "calc(100vh - 220px)" }}>
        <SpecificPanel grantCalls={grantCalls} />
        <AllPanel />
      </div>
    </div>
  );
}
