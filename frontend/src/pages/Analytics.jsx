import React, { useEffect, useState } from "react";
import client from "../api/client.js";
import Topbar from "./Topbar.jsx";
import { BarChart2, CheckCircle2, AlertTriangle, XCircle, TrendingUp } from "lucide-react";

function ScoreBar({ score }) {
  const color = score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-[#EEF1F7] rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[11px] font-bold text-[#1A2B42] w-8 text-right">{score}</span>
    </div>
  );
}

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCall, setActiveCall] = useState(null);

  useEffect(() => {
    client.get("/prescreen/analytics")
      .then(r => {
        setData(r.data);
        if (r.data.per_call?.length > 0) setActiveCall(r.data.per_call[0].grant_call_id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const activeData = data?.per_call?.find(c => c.grant_call_id === activeCall);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: "#1e3a5f" }} />
    </div>
  );

  return (
    <div>
      <Topbar
        title="Proposal Readiness Analytics"
        subtitle="Aggregate view of PI pre-screening activity — adoption per grant call and common gaps."
      />

      {!data || data.total_checks === 0 ? (
        <div className="bg-white rounded-xl border border-[#E4E8EF] p-12 text-center">
          <BarChart2 size={32} className="text-[#C5CDD8] mx-auto mb-3" />
          <p className="text-[13px] font-semibold text-[#1A2B42] mb-1">No checks yet</p>
          <p className="text-[11.5px] text-[#8A9AB5]">Analytics will appear here once PIs start using the AI Check tool.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <div className="bg-white rounded-xl border border-[#E4E8EF] p-4">
              <p className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#8A9AB5] mb-2">Total checks</p>
              <p className="text-[28px] font-extrabold text-[#1e3a5f]">{data.total_checks}</p>
            </div>
            <div className="bg-white rounded-xl border border-[#E4E8EF] p-4">
              <p className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#8A9AB5] mb-2">Grant calls checked</p>
              <p className="text-[28px] font-extrabold text-[#1e3a5f]">{data.per_call.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-[#E4E8EF] p-4">
              <p className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#8A9AB5] mb-2">High readiness</p>
              <p className="text-[28px] font-extrabold text-emerald-600">
                {data.per_call.reduce((sum, c) => sum + c.high_count, 0)}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-[#E4E8EF] p-4">
              <p className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#8A9AB5] mb-2">Low readiness</p>
              <p className="text-[28px] font-extrabold text-rose-500">
                {data.per_call.reduce((sum, c) => sum + c.low_count, 0)}
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-5">
            <div className="bg-white rounded-xl border border-[#E4E8EF] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#EEF1F7]">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8A9AB5]">Adoption per grant call</p>
              </div>
              <div className="divide-y divide-[#F5F6F8]">
                {data.per_call.map(c => (
                  <button key={c.grant_call_id} onClick={() => setActiveCall(c.grant_call_id)}
                    className={`w-full px-5 py-3.5 text-left hover:bg-[#F8FAFD] transition-colors ${activeCall === c.grant_call_id ? "bg-[#F0F4FB] border-l-2 border-[#1e3a5f]" : ""}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-[12px] font-semibold text-[#1A2B42] leading-tight">{c.grant_title}</p>
                      <span className="text-[10px] font-bold bg-[#1e3a5f] text-white px-2 py-0.5 rounded-full flex-shrink-0">{c.total_checks}</span>
                    </div>
                    <ScoreBar score={c.avg_score} />
                    <div className="flex items-center gap-3 mt-2 text-[10px] font-semibold">
                      <span className="text-emerald-600 flex items-center gap-0.5"><CheckCircle2 size={10} /> {c.high_count}</span>
                      <span className="text-amber-600 flex items-center gap-0.5"><AlertTriangle size={10} /> {c.medium_count}</span>
                      <span className="text-rose-600 flex items-center gap-0.5"><XCircle size={10} /> {c.low_count}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 bg-white rounded-xl border border-[#E4E8EF] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#EEF1F7] flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8A9AB5]">
                  Common gaps — {activeData?.grant_title}
                </p>
                {activeData && (
                  <span className="text-[10px] text-[#8A9AB5]">{activeData.gaps.length} entries from {activeData.total_checks} checks</span>
                )}
              </div>

              {!activeData || activeData.gaps.length === 0 ? (
                <div className="p-10 text-center">
                  <TrendingUp size={24} className="text-[#C5CDD8] mx-auto mb-2" />
                  <p className="text-[11.5px] text-[#8A9AB5]">No gap data yet for this grant call.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#F5F6F8] max-h-[500px] overflow-y-auto scrollbar-thin">
                  {activeData.gaps.map((g, i) => (
                    <div key={i} className="flex items-start gap-3 px-5 py-3">
                      <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <AlertTriangle size={11} className="text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-[#1A2B42] leading-relaxed">{g.gap}</p>
                        <p className="text-[10px] text-[#8A9AB5] mt-0.5">
                          {g.filename} · Score {g.score} · {new Date(g.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}