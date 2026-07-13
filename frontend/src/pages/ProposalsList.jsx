import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import ComplianceRing from "../components/ComplianceRing.jsx";
import { statusMeta } from "../utils/status.js";
import { X, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

function AIPills({ s }) {
  if (!s) return <span className="text-[10px] text-[#8A9AB5]">—</span>;
  return (
    <div className="flex items-center gap-2 text-[10px] font-semibold">
      <span className="flex items-center gap-0.5 text-emerald-600"><CheckCircle2 size={11} />{s.Pass || 0}</span>
      <span className="flex items-center gap-0.5 text-amber-600"><AlertTriangle size={11} />{s.Partial || 0}</span>
      <span className="flex items-center gap-0.5 text-rose-600"><XCircle size={11} />{s["Not Met"] || 0}</span>
    </div>
  );
}

export default function ProposalsList() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [proposals, setProposals] = useState([]);
  const [grant, setGrant] = useState("all");
  const [researcher, setResearcher] = useState("all");
  const [status, setStatus] = useState("all");

  useEffect(() => { client.get("/proposals").then(r => setProposals(r.data)); }, []);

  const grantOptions = useMemo(() => {
    const m = new Map(); proposals.forEach(p => m.set(p.grant_call_id, p.grant_title)); return [...m];
  }, [proposals]);

  const researcherOptions = useMemo(() => {
    const m = new Map(); proposals.forEach(p => m.set(p.owner_id, p.owner_name)); return [...m];
  }, [proposals]);

  const STATUS_OPTS = ["submitted","ai_reviewed","changes_requested","declined","approved"];

  const filtered = proposals.filter(p =>
    (grant === "all" || p.grant_call_id === grant) &&
    (researcher === "all" || p.owner_id === researcher) &&
    (status === "all" || p.status === status)
  );

  const sel = "rounded-lg border border-[#E0E6EF] px-3 py-1.5 text-[11px] bg-white focus:outline-none focus:ring-2 focus:ring-ku-gold/40 text-[#1A2B42]";
  const hasFilters = grant !== "all" || researcher !== "all" || status !== "all";

  return (
    <div>
      <div className="mb-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8A9AB5] mb-3">{isAdmin ? "All proposals" : "My proposals"}</p>
        <div className="flex flex-wrap items-center gap-2">
          <select value={grant} onChange={e => setGrant(e.target.value)} className={sel}>
            <option value="all">All grant calls</option>
            {grantOptions.map(([id, t]) => <option key={id} value={id}>{t}</option>)}
          </select>
          {isAdmin && (
            <select value={researcher} onChange={e => setResearcher(e.target.value)} className={sel}>
              <option value="all">All PIs</option>
              {researcherOptions.map(([id, n]) => <option key={id} value={id}>{n}</option>)}
            </select>
          )}
          <select value={status} onChange={e => setStatus(e.target.value)} className={sel}>
            <option value="all">All statuses</option>
            {STATUS_OPTS.map(s => <option key={s} value={s}>{statusMeta(s).label}</option>)}
          </select>
          {hasFilters && (
            <button onClick={() => { setGrant("all"); setResearcher("all"); setStatus("all"); }}
              className="flex items-center gap-1 text-[10.5px] font-semibold text-[#8A9AB5] hover:text-[#5A7093]">
              <X size={12} /> Clear
            </button>
          )}
          <span className="text-[10px] text-[#8A9AB5] ml-auto">{filtered.length} of {proposals.length}</span>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-[#E0E6EF] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F8FAFD] text-[#8A9AB5] text-[9px] uppercase tracking-[0.08em]">
            <tr>
              <th className="text-left px-4 py-2.5 font-bold">Proposal</th>
              <th className="text-left px-4 py-2.5 font-bold">Grant call</th>
              {isAdmin && <th className="text-left px-4 py-2.5 font-bold">PI</th>}
              <th className="text-left px-4 py-2.5 font-bold">Ver.</th>
              <th className="text-left px-4 py-2.5 font-bold">AI result</th>
              <th className="text-left px-4 py-2.5 font-bold">Status</th>
              <th className="text-left px-4 py-2.5 font-bold">Submitted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F4F6FA]">
            {filtered.map(p => {
              const s = p.ai_summary;
              const pass = s?.Pass || 0, partial = s?.Partial || 0, notMet = s?.["Not Met"] || 0;
              const meta = statusMeta(p.status);
              return (
                <tr key={p.id} className="hover:bg-[#F8FAFD] cursor-pointer" onClick={() => window.location.assign(`/proposals/${p.id}`)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <ComplianceRing pass={pass} partial={partial} notMet={notMet} size="sm" bg="#fff" />
                      <Link to={`/proposals/${p.id}`} className="text-[12px] font-semibold text-[#1A2B42] hover:text-ku-gold">{p.title}</Link>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-[#5A7093]">{p.grant_title}</td>
                  {isAdmin && <td className="px-4 py-3 text-[11px] text-[#5A7093]">{p.owner_name}</td>}
                  <td className="px-4 py-3 text-[11px] text-[#8A9AB5]">v{p.version}</td>
                  <td className="px-4 py-3"><AIPills s={s} /></td>
                  <td className="px-4 py-3">
                    <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full ${meta.cls}`}>{meta.label}</span>
                  </td>
                  <td className="px-4 py-3 text-[10.5px] text-[#8A9AB5]">{new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-[11px] text-[#8A9AB5]">
                {proposals.length === 0 ? "No proposals yet." : "No proposals match the selected filters."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
