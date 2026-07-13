import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, UploadCloud, FileSearch, ShieldCheck, ClipboardList, LogOut, GraduationCap, FolderCog } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

const linkBase = "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors";
const active = "bg-brand-600 text-white shadow-sm shadow-brand-900/20";
const inactive = "text-slate-300 hover:bg-white/5 hover:text-white";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 bg-[#0c1230] flex flex-col">
      <div className="px-5 py-6 flex items-center gap-2.5 border-b border-white/10">
        <div className="h-9 w-9 rounded-lg bg-brand-500 flex items-center justify-center">
          <GraduationCap size={20} className="text-white" />
        </div>
        <div>
          <p className="text-white font-bold leading-tight text-sm">ResearchGate</p>
          <p className="text-slate-400 text-[11px] leading-tight">Compliance Engine</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1">
        <NavLink to="/" end className={({ isActive }) => `${linkBase} ${isActive ? active : inactive}`}>
          <LayoutDashboard size={18} /> Dashboard
        </NavLink>
        {!isAdmin && (
          <NavLink to="/submit" className={({ isActive }) => `${linkBase} ${isActive ? active : inactive}`}>
            <UploadCloud size={18} /> Submit Proposal
          </NavLink>
        )}
        <NavLink to="/proposals" className={({ isActive }) => `${linkBase} ${isActive ? active : inactive}`}>
          <FileSearch size={18} /> {isAdmin ? "All Proposals" : "My Proposals"}
        </NavLink>
        {isAdmin && (
          <NavLink to="/manage-grants" className={({ isActive }) => `${linkBase} ${isActive ? active : inactive}`}>
            <FolderCog size={18} /> Manage Grant Calls
          </NavLink>
        )}
        {isAdmin && (
          <NavLink to="/review-queue" className={({ isActive }) => `${linkBase} ${isActive ? active : inactive}`}>
            <ShieldCheck size={18} /> Review Queue
          </NavLink>
        )}
        {isAdmin && (
          <NavLink to="/audit-log" className={({ isActive }) => `${linkBase} ${isActive ? active : inactive}`}>
            <ClipboardList size={18} /> Audit Log
          </NavLink>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <div className="px-3 py-2.5 rounded-lg bg-white/5 mb-2">
          <p className="text-white text-sm font-semibold truncate">{user?.name}</p>
          <p className="text-slate-400 text-xs truncate">{user?.email}</p>
          <span className="inline-block mt-1.5 text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded bg-brand-500/20 text-brand-300">
            {user?.role}
          </span>
        </div>
        <button onClick={logout} className={`${linkBase} ${inactive} w-full`}>
          <LogOut size={18} /> Sign out
        </button>
      </div>
    </aside>
  );
}
