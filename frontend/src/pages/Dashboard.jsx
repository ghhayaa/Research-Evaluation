import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import ComplianceRing from "../components/ComplianceRing.jsx";
import { statusMeta } from "../utils/status.js";
import { getFirstName } from "../utils/name.js";
import { CheckCircle2, AlertTriangle, XCircle, ArrowRight, UploadCloud, ScanSearch } from "lucide-react";

/* Stat card — matching the big-number uppercase-label style in screenshot */
function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-white rounded-xl border border-[#E4E8EF] p-5">
      <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-[#8A9AB5] mb-2">{label}</p>
      <p className="text-[28px] font-extrabold leading-none mb-1" style={{ color: accent }}>{value}</p>
      <p className="text-[11px] text-[#8A9AB5]">{sub}</p>
    </div>
  );
}

/* Initials avatar */
function Avatar({ name, color }) {
  const clean = name?.split(/\s+/).filter(p => !["Dr.","Prof.","Mr.","Mrs.","Ms."].includes(p));
  const init = clean?.slice(0, 2).map(n => n?.[0] || "").join("") || "?";
  return (
    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0" style={{ background: color }}>
      {init}
    </div>
  );
}

const AVATAR_COLORS = ["#4F46E5","#7C3AED","#B45309","#047857","#1D4ED8","#0F766E"];
function avatarColor(name = "") {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

/* AI result pills */
function AIPills({ s }) {
  if (!s) return null;
  return (
    <div className="flex items-center gap-2 text-[11px] font-semibold">
      <span className="flex items-center gap-0.5 text-emerald-600"><CheckCircle2 size={12} />{s.Pass||0}</span>
      <span className="flex items-center gap-0.5 text-amber-600"><AlertTriangle size={12} />{s.Partial||0}</span>
      <span className="flex items-center gap-0.5 text-rose-600"><XCircle size={12} />{s["Not Met"]||0}</span>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [proposals, setProposals] = useState([]);
  const [grants, setGrants] = useState([]);
  const [queue, setQueue] = useState([]);
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    Promise.all([
      client.get("/proposals"),
      client.get("/grant-calls"),
      isAdmin ? client.get("/assessments/queue") : Promise.resolve({ data: [] }),
    ]).then(([p, g, q]) => {
      setProposals(p.data);
      setGrants(g.data.filter(gc => gc.status !== "closed"));
      // deduplicate queue by proposal
      const seen = new Set();
      setQueue(q.data.filter(a => { if (seen.has(a.proposal_id)) return false; seen.add(a.proposal_id); return a.status === "ai_draft"; }));
    });
  }, []);

  const stats = {
    total: proposals.length,
    ai: proposals.filter(p => p.status === "ai_reviewed").length,
    changes: proposals.filter(p => p.status === "changes_requested").length,
    approved: proposals.filter(p => p.status === "approved").length,
  };

  const DOT_COLORS = { open: "#2563EB", due: "#D97706" };
  function dotColor(g) { return g.deadline && new Date(g.deadline) < new Date(Date.now() + 14*86400000) ? DOT_COLORS.due : DOT_COLORS.open; }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-5">
      {/* Welcome banner */}
      <div className="rounded-xl px-6 py-5 flex items-center justify-between" style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%)" }}>
        <div>
          <p className="text-[12px] font-semibold text-white/60 mb-0.5">{greeting},</p>
          <h1 className="text-[22px] font-extrabold text-white leading-tight">{getFirstName(user?.name)} 👋</h1>
          <p className="text-[11px] text-white/60 mt-1">{user?.name} · {user?.role === "admin" ? "Research Admin Staff" : "PI"} · {user?.department || "Khalifa University"}</p>
        </div>
        {!isAdmin && (
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link to="/prescreen" className="flex items-center gap-1.5 text-[12px] font-bold px-4 py-2.5 rounded-lg border border-white/30 text-white hover:bg-white/10 transition-colors">
              <ScanSearch size={14} /> Check compatibility
            </Link>
            <Link to="/submit" className="flex items-center gap-1.5 text-[12px] font-bold px-4 py-2.5 rounded-lg flex-shrink-0" style={{ background: "#C89B2A", color: "#fff" }}>
              <UploadCloud size={14} /> Submit Proposal
            </Link>
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Proposals" value={stats.total} sub={`Across ${new Set(proposals.map(p=>p.grant_call_id)).size} grant calls`} accent="#1A2B42" />
        <StatCard label="AI Reviewed" value={stats.ai} sub="Pending admin sign-off" accent="#5B21B6" />
        <StatCard label="Changes Requested" value={stats.changes} sub="Awaiting resubmission" accent="#B45309" />
        <StatCard label="Approved" value={stats.approved} sub="Shared with PIs" accent="#047857" />
      </div>

      {/* Two-column: proposals + grants/queue */}
      <div className={`grid gap-4 ${isAdmin ? "lg:grid-cols-2" : "grid-cols-1"}`}>
        {/* Left: recent proposals */}
        <div className="bg-white rounded-xl border border-[#E4E8EF] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F0F2F7]">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#1A2B42]">
              {isAdmin ? "Recent proposals" : "My proposals"}
            </p>
            <Link to="/proposals" className="text-[11px] font-semibold text-[#2563EB] hover:underline flex items-center gap-1">
              View all <ArrowRight size={11} />
            </Link>
          </div>

          {/* Proposals list */}
          <div className="divide-y divide-[#F5F6F8]">
            {proposals.length === 0 && (
              <p className="text-[11px] text-[#8A9AB5] text-center py-10">No proposals yet.</p>
            )}
            {proposals.slice(0, 5).map(p => {
              const meta = statusMeta(p.status);
              const color = avatarColor(p.owner_name || user?.name || "");
              const name = isAdmin ? p.owner_name : user?.name;
              return (
                <Link to={`/proposals/${p.id}`} key={p.id} className="flex items-start gap-3.5 px-5 py-3.5 hover:bg-[#F8FAFD] transition-colors">
                  <Avatar name={name} color={color} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-semibold text-[#1A2B42] leading-tight">{p.title}</p>
                    <p className="text-[10px] text-[#8A9AB5] mt-0.5">
                      {isAdmin ? `${p.owner_name} · ` : ""}{p.grant_title} · v{p.version}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    {p.ai_summary && <AIPills s={p.ai_summary} />}
                    <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full ${meta.cls}`}>{meta.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right column: grant calls + review queue (admin) OR just grant calls (researcher) */}
        <div className="space-y-4">
          {/* Grant calls — dot list only for admin overview; researcher gets image cards below */}
          {isAdmin && (
            <div className="bg-white rounded-xl border border-[#E4E8EF] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F0F2F7]">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#1A2B42]">Open grant calls</p>
                <Link to="/manage-grants" className="text-[11px] font-semibold text-[#2563EB] hover:underline">Manage →</Link>
              </div>
              <div className="divide-y divide-[#F5F6F8]">
                {grants.slice(0, 4).map(g => (
                  <Link to="/manage-grants" key={g.id}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#F8FAFD] transition-colors">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5" style={{ background: dotColor(g) }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-[#1A2B42] truncate">{g.title}</p>
                      <p className="text-[10px] text-[#8A9AB5] mt-px">{g.sponsor} {g.deadline ? `· Due ${g.deadline}` : ""}</p>
                    </div>
                    <span className="text-[10px] font-semibold bg-[#F0F2F7] text-[#5A7093] px-2 py-0.5 rounded flex-shrink-0">
                      {g.criteria?.length || 0} criteria
                    </span>
                  </Link>
                ))}
                {grants.length === 0 && <p className="text-[11px] text-[#8A9AB5] text-center py-6">No open calls.</p>}
              </div>
            </div>
          )}

          {/* Review queue — admin only */}
          {isAdmin && (
            <div className="bg-white rounded-xl border border-[#E4E8EF] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F0F2F7]">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#1A2B42]">Review queue</p>
                <Link to="/review-queue" className="text-[11px] font-semibold text-[#2563EB] hover:underline">Open queue →</Link>
              </div>
              <div className="divide-y divide-[#F5F6F8]">
                {queue.slice(0, 3).map(a => (
                  <Link to={`/proposals/${a.proposal_id}`} key={a.id}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-[#F8FAFD] transition-colors">
                    <Avatar name={a.researcher_name} color={avatarColor(a.researcher_name)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11.5px] font-semibold text-[#1A2B42] truncate">{a.proposal_title}</p>
                      <p className="text-[10px] text-[#8A9AB5] mt-px">{a.researcher_name} · AI draft</p>
                    </div>
                    <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 bg-violet-100 text-violet-700">
                      Awaiting
                    </span>
                  </Link>
                ))}
                {queue.length === 0 && <p className="text-[11px] text-[#8A9AB5] text-center py-6">Queue is empty.</p>}
              </div>
            </div>
          )}

          {/* Researcher: grant cards */}
          {!isAdmin && grants.length > 0 && (
            <div className="bg-white rounded-xl border border-[#E4E8EF] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F0F2F7]">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#1A2B42]">Open grant calls</p>
                <span className="text-[10px] text-[#8A9AB5]">{grants.length} available</span>
              </div>
              <div className="divide-y divide-[#F5F6F8]">
                {grants.map(g => (
                  <Link to={`/grants/${g.id}`} key={g.id}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#F8FAFD] transition-colors group">
                    {g.image_url && (
                      <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
                        <img src={g.image_url} alt={g.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-[0.08em] mb-0.5" style={{ color: "#C89B2A" }}>{g.sponsor}</p>
                      <p className="text-[12.5px] font-semibold text-[#1A2B42] leading-snug">{g.title}</p>
                      <div className="flex items-center gap-3 mt-1">
                        {g.deadline && <span className="text-[10px] text-[#8A9AB5]">Due {g.deadline}</span>}
                        <span className="text-[10px] text-[#8A9AB5]">{g.criteria?.length || 0} compliance criteria</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-[#2563EB] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      View →
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
