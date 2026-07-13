import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import client from "../api/client.js";
import { ChevronDown, Files, Sparkles, Clock, CheckCircle, User, LogOut, Settings } from "lucide-react";
import { getFirstName } from "../utils/name.js";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, aiReady: 0, pending: 0, approved: 0 });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    client.get("/proposals").then(r => {
      const d = r.data;
      setStats({
        total: d.length,
        aiReady: d.filter(p => p.status === "ai_reviewed").length,
        pending: d.filter(p => p.status === "submitted").length,
        approved: d.filter(p => p.status === "approved").length,
      });
    }).catch(() => {});
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleLogout() {
    setMenuOpen(false);
    logout();
    navigate("/login");
  }

  const firstName = getFirstName(user?.name);
  const roleLabel = user?.role === "admin" ? "Admin" : "PI";

  return (
    <header className="flex items-center h-[58px] bg-white border-b border-[#E4E8EF] px-5 gap-0 flex-shrink-0 z-20">
      {/* KU Brand */}
      <div className="flex items-center gap-3 pr-5 border-r border-[#E4E8EF]">
        <img src="/ku-logo.jpg" alt="Khalifa University" className="h-9 flex-shrink-0" />
        <div className="leading-tight">
          <p className="text-[13px] font-extrabold text-[#1A2B42] leading-tight">Research Evaluation</p>
          <p className="text-[13px] font-extrabold text-[#1A2B42] leading-tight">Platform</p>
        </div>
      </div>

      {/* Live metric pills */}
      <div className="flex items-center gap-2 flex-1 px-5">
        {stats.total > 0 && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full bg-[#F0F2F5] text-[#4A5568]">
            <Files size={12} /> <span className="font-bold">{stats.total}</span> Total
          </span>
        )}
        {stats.aiReady > 0 && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full" style={{ background: "#EDE9FE", color: "#5B21B6" }}>
            <Sparkles size={12} /> <span className="font-bold">{stats.aiReady} AI</span> Ready
          </span>
        )}
        {stats.pending > 0 && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full" style={{ background: "#FEF9EC", color: "#B45309" }}>
            <Clock size={12} /> <span className="font-bold">{stats.pending}</span> In Queue
          </span>
        )}
        {stats.approved > 0 && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full" style={{ background: "#E8F9F1", color: "#047857" }}>
            <CheckCircle size={12} /> <span className="font-bold">{stats.approved}</span> Approved
          </span>
        )}
      </div>

      {/* User menu */}
      <div className="relative pl-4 border-l border-[#E4E8EF]" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(p => !p)}
          className="flex items-center gap-2.5 hover:bg-[#F0F2F7] rounded-lg px-3 py-1.5 transition-colors"
        >
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0" style={{ background: "#1e3a5f" }}>
            {firstName?.[0]}{user?.name?.split(" ").filter(p => !["Dr.","Prof.","Mr.","Mrs.","Ms."].includes(p)).slice(-1)[0]?.[0]}
          </div>
          <div className="text-left leading-tight">
            <p className="text-[12px] font-bold text-[#1A2B42]">{firstName} {user?.name?.split(" ").slice(-1)[0]}</p>
            <p className="text-[10px] text-[#8A9AB5]">{roleLabel}</p>
          </div>
          <ChevronDown size={13} className={`text-[#8A9AB5] transition-transform ${menuOpen ? "rotate-180" : ""}`} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl border border-[#E4E8EF] shadow-lg z-50 overflow-hidden">
            {/* User info */}
            <div className="px-4 py-3.5 border-b border-[#EEF1F7] bg-[#F8FAFD]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-black text-white flex-shrink-0" style={{ background: "#1e3a5f" }}>
                  {firstName?.[0]}{user?.name?.split(" ").filter(p => !["Dr.","Prof.","Mr.","Mrs.","Ms."].includes(p)).slice(-1)[0]?.[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-[12.5px] font-bold text-[#1A2B42] truncate">{user?.name}</p>
                  <p className="text-[10.5px] text-[#8A9AB5] truncate">{user?.email}</p>
                  <span className="inline-block mt-1 text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded text-white" style={{ background: "#C89B2A" }}>
                    {roleLabel}
                  </span>
                </div>
              </div>
              {user?.department && (
                <p className="text-[10px] text-[#8A9AB5] mt-2 pl-0">{user.department}</p>
              )}
            </div>

            {/* Menu items */}
            <div className="py-1">
              <button
                onClick={() => { setMenuOpen(false); navigate("/account"); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F8FAFD] text-left transition-colors"
              >
                <User size={15} className="text-[#8A9AB5]" />
                <span className="text-[12px] font-medium text-[#1A2B42]">My account</span>
              </button>
              <div className="h-px bg-[#EEF1F7] my-1" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-rose-50 text-left transition-colors"
              >
                <LogOut size={15} className="text-rose-500" />
                <span className="text-[12px] font-medium text-rose-600">Sign out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
