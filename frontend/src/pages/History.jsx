import React, { useEffect, useState } from "react";
import client from "../api/client.js";
import Topbar from "./Topbar.jsx";
import { RefreshCcw, Lightbulb, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

const COMPAT_CLS = {
  High:   "bg-emerald-100 text-emerald-800",
  Medium: "bg-amber-100 text-amber-800",
  Low:    "bg-rose-100 text-rose-800",
};

function ScoreBar({ score }) {
  const color = score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="w-full bg-[#EEF1F7] rounded-full h-1.5 mt-1">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${score}%` }} />
    </div>
  );
}

function ReportView({ h, onBack }) {
  return (
    <div className="bg-white rounded-xl border border-[#E4E8EF] p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#8A9AB5] mb-1">{h.grant_title}</p>
          <p className="text-[16px] font-bold text-[#1A2B42]">{h.filename}</p>
          <p className="text-[11px] text-[#8A9AB5] mt-0.5">{new Date(h.created_at).toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-[12px] font-bold px-3 py-1.5 rounded-full ${COMPAT_CLS[h.compatibility] || COMPAT_CLS.Low}`}>
            {h.compatibility} · {h.score}/100
          </span>
          <button onClick={onBack}
            className="text-[12px] font-semibold text-[#5A7093] border border-[#E4E8EF] px-3 py-1.5 rounded-lg hover:bg-[#F8FAFD]">
            ← Back
          </button>
        </div>
      </div>

      <ScoreBar score={h.score} />
      <p className="text-[10px] text-[#8A9AB5] italic">Indicative score based on published call criteria — not an official evaluation</p>

      <p className="text-[13px] text-[#5A7093] leading-relaxed">{h.summary}</p>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-emerald-50 rounded-xl p-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.07em] text-emerald-700 mb-2">Strengths</p>
          <p className="text-[12px] text-emerald-800 leading-relaxed">{h.strengths}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.07em] text-amber-700 mb-2">Gaps</p>
          <p className="text-[12px] text-amber-800 leading-relaxed">{h.gaps}</p>
        </div>
      </div>

      {h.suggestions && (
        <div className="bg-[#F0F4FB] border border-[#D0DAF0] rounded-xl p-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.07em] text-[#2563EB] mb-2 flex items-center gap-1.5">
            <Lightbulb size={11} /> Suggested improvements
          </p>
          <p className="text-[12px] text-[#1e3a5f] leading-relaxed">{h.suggestions}</p>
        </div>
      )}

      <p className="text-[12.5px] text-[#5A7093] italic border-t border-[#EEF1F7] pt-4">{h.verdict}</p>
    </div>
  );
}

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    client.get("/prescreen/history")
      .then(r => setHistory(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (viewing) return (
    <div>
      <Topbar title="Past Check Report" subtitle="Readiness report from a previous AI assessment session." />
      <ReportView h={viewing} onBack={() => setViewing(null)} />
    </div>
  );

  return (
    <div>
      <Topbar title="My Past Checks" subtitle="All your previous proposal readiness reports — click any entry to view the full report." />

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: "#1e3a5f" }} />
        </div>
      )}

      {!loading && history.length === 0 && (
        <div className="bg-white rounded-xl border border-[#E4E8EF] p-12 text-center">
          <RefreshCcw size={28} className="text-[#C5CDD8] mx-auto mb-3" />
          <p className="text-[13px] font-semibold text-[#1A2B42] mb-1">No past checks yet</p>
          <p className="text-[11.5px] text-[#8A9AB5]">Run a check on the AI Check page to save your first readiness report here.</p>
        </div>
      )}

      {!loading && history.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E4E8EF] divide-y divide-[#F5F6F8]">
          {history.map(h => (
            <button key={h.id} onClick={() => setViewing(h)}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-[#F8FAFD] transition-colors text-left">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#1A2B42] truncate">{h.filename}</p>
                <p className="text-[11px] text-[#8A9AB5] mt-0.5">{h.grant_title} · {new Date(h.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="w-24">
                  <ScoreBar score={h.score} />
                </div>
                <span className={`text-[10.5px] font-bold px-2.5 py-1 rounded-full ${COMPAT_CLS[h.compatibility] || COMPAT_CLS.Low}`}>
                  {h.compatibility}
                </span>
                <span className="text-[14px] font-extrabold text-[#1A2B42] w-8 text-right">{h.score}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}