import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import client from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { getFirstName } from "../utils/name.js";
import { ScanSearch, FolderOpen, ArrowRight, Calendar } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";
  const [grants, setGrants] = useState([]);
  const firstName = getFirstName(user?.name);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    client.get("/grant-calls").then(r => setGrants(r.data.filter(g => g.status !== "closed")));
  }, []);

  return (
    <div className="space-y-5">
      <div className="rounded-xl px-6 py-5 flex items-center justify-between" style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%)" }}>
        <div>
          <p className="text-[12px] font-semibold text-white/60 mb-0.5">{greeting},</p>
          <h1 className="text-[22px] font-extrabold text-white leading-tight">{firstName} 👋</h1>
          <p className="text-[11px] text-white/60 mt-1">
            {isAdmin
              ? "Research Admin Staff · Research Evaluation Platform"
              : `${user?.department || "Principal Investigator"} · Khalifa University`}
          </p>
        </div>
        {!isAdmin && (
          <Link to="/prescreen"
            className="flex items-center gap-1.5 text-[12px] font-bold px-4 py-2.5 rounded-lg flex-shrink-0"
            style={{ background: "#C89B2A", color: "#fff" }}>
            <ScanSearch size={14} /> Check my proposal
          </Link>
        )}
      </div>

      {!isAdmin && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8A9AB5]">Open grant calls</p>
            <span className="text-[10px] text-[#8A9AB5]">{grants.length} available</span>
          </div>
          {grants.length === 0 && (
            <div className="bg-white rounded-xl border border-[#E4E8EF] p-10 text-center">
              <FolderOpen size={28} className="text-[#C5CDD8] mx-auto mb-2" />
              <p className="text-[12px] text-[#8A9AB5]">No open grant calls at the moment.</p>
            </div>
          )}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {grants.map(g => (
              <div key={g.id} className="bg-white rounded-xl border border-[#E4E8EF] overflow-hidden hover:border-[#C89B2A] hover:shadow-sm transition-all flex flex-col">
                {g.image_url && (
                  <div className="h-28 overflow-hidden bg-slate-100">
                    <img src={g.image_url} alt={g.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-4 flex-1 flex flex-col">
                  <p className="text-[9px] font-bold uppercase tracking-[0.08em] mb-1" style={{ color: "#C89B2A" }}>{g.sponsor}</p>
                  <p className="text-[13px] font-semibold text-[#0E2D52] leading-snug mb-2 flex-1">{g.title}</p>
                  {g.deadline && (
                    <p className="text-[10px] text-[#8A9AB5] flex items-center gap-1 mb-3">
                      <Calendar size={10} /> Due {g.deadline}
                    </p>
                  )}
                  <p className="text-[11px] text-[#5A7093] leading-relaxed mb-3 line-clamp-2">{g.summary}</p>
                  <button
                    onClick={() => navigate(`/prescreen?grant=${g.id}`)}
                    className="w-full flex items-center justify-center gap-1.5 text-[12px] font-bold text-white py-2 rounded-lg"
                    style={{ background: "#1e3a5f" }}>
                    <ScanSearch size={13} /> Check my proposal
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isAdmin && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8A9AB5]">Grant calls</p>
            <Link to="/manage-grants" className="text-[11px] font-semibold text-[#2563EB] hover:underline flex items-center gap-1">
              Manage <ArrowRight size={11} />
            </Link>
          </div>
          <div className="bg-white rounded-xl border border-[#E4E8EF] divide-y divide-[#F5F6F8]">
            {grants.length === 0 && (
              <p className="text-[11px] text-[#8A9AB5] text-center py-10">No grant calls yet.</p>
            )}
            {grants.map(g => (
              <Link to="/manage-grants" key={g.id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-[#F8FAFD] transition-colors">
                {g.image_url && (
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                    <img src={g.image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-semibold text-[#1A2B42] truncate">{g.title}</p>
                  <p className="text-[10px] text-[#8A9AB5] mt-px">{g.sponsor}{g.deadline ? ` · Due ${g.deadline}` : ""} · {g.criteria?.length || 0} criteria</p>
                </div>
                <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex-shrink-0">{g.status}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}