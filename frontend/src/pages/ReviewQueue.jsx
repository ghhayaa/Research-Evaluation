import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client.js";
import Topbar from "./Topbar.jsx";
import ComplianceRing from "../components/ComplianceRing.jsx";

const STATUS_META = {
  ai_draft:          { text: "Awaiting review", cls: "bg-amber-100 text-amber-800" },
  admin_edited:      { text: "Edited",           cls: "bg-blue-100 text-blue-800" },
  admin_approved:    { text: "Approved",         cls: "bg-emerald-100 text-emerald-800" },
  changes_requested: { text: "Changes requested",cls: "bg-amber-100 text-amber-800" },
  admin_declined:    { text: "Declined",         cls: "bg-rose-100 text-rose-800" },
};

export default function ReviewQueue() {
  const [all, setAll] = useState([]);
  const [filter, setFilter] = useState("ai_draft");
  useEffect(() => { client.get("/assessments/queue").then(r => setAll(r.data)); }, []);

  const latest = useMemo(() => {
    const seen = new Set(); return all.filter(a => { if (seen.has(a.proposal_id)) return false; seen.add(a.proposal_id); return true; });
  }, [all]);

  const filtered = filter === "all" ? latest : latest.filter(a => a.status === filter);
  const sel = "rounded-lg border border-[#E0E6EF] px-3 py-1.5 text-[11px] bg-white focus:outline-none text-[#1A2B42]";

  return (
    <div>
      <Topbar title="Review queue" subtitle="Latest assessment per proposal — Re-run AI replaces this for both you and the PI." />
      <div className="flex items-center gap-3 mb-4">
        <select value={filter} onChange={e => setFilter(e.target.value)} className={sel}>
          <option value="ai_draft">Awaiting review</option>
          <option value="changes_requested">Changes requested</option>
          <option value="admin_declined">Declined</option>
          <option value="admin_approved">Approved</option>
          <option value="all">All</option>
        </select>
        <span className="text-[10px] text-[#8A9AB5] ml-auto">{filtered.length} of {latest.length}</span>
      </div>
      <div className="bg-white rounded-lg border border-[#E0E6EF] divide-y divide-[#F4F6FA]">
        {filtered.map(a => {
          const meta = STATUS_META[a.status] || STATUS_META.ai_draft;
          const r = a.report;
          const counts = r?.criteria_results?.reduce((acc, c) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc; }, {}) || {};
          return (
            <Link to={`/proposals/${a.proposal_id}`} key={a.id} className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-[#F8FAFD] transition-colors">
              <ComplianceRing pass={counts["Pass"]||0} partial={counts["Partial"]||0} notMet={counts["Not Met"]||0} size="sm" bg="#fff" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-[#1A2B42] truncate">{a.proposal_title}</p>
                <p className="text-[10px] text-[#8A9AB5] mt-px">{a.grant_title} · {a.researcher_name} · v{a.proposal_version}</p>
              </div>
              <span className={`text-[9.5px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${meta.cls}`}>{meta.text}</span>
            </Link>
          );
        })}
        {filtered.length === 0 && <p className="text-[11px] text-[#8A9AB5] text-center py-10">No assessments match this filter.</p>}
      </div>
    </div>
  );
}
