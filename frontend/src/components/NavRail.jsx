import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { LayoutDashboard, FolderOpen, ClipboardList, ScanSearch, BarChart2 } from "lucide-react";

export default function NavRail() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  function cls({ isActive }) {
    return [
      "flex flex-col items-center justify-center w-[62px] h-[58px] gap-1 rounded-xl transition-colors cursor-pointer mx-auto",
      "text-[9px] font-bold tracking-wide uppercase",
      isActive ? "bg-white/[0.14] text-white" : "text-white/[0.38] hover:bg-white/[0.07] hover:text-white/70",
    ].join(" ");
  }

  return (
    <nav className="w-[80px] flex flex-col items-center py-3 gap-1 flex-shrink-0" style={{ background: "#1e3a5f" }}>
      <NavLink to="/" end className={cls} title="Dashboard">
        {({ isActive }) => <><LayoutDashboard size={20} style={isActive ? { color: "#fff" } : {}} /><span>Home</span></>}
      </NavLink>

      {!isAdmin && (
        <NavLink to="/prescreen" className={cls} title="Check My Proposal">
          {({ isActive }) => <><ScanSearch size={20} style={isActive ? { color: "#fff" } : {}} /><span>AI Check</span></>}
        </NavLink>
      )}

      {isAdmin && (
        <NavLink to="/manage-grants" className={cls} title="Manage Grant Calls">
          {({ isActive }) => <><FolderOpen size={20} style={isActive ? { color: "#fff" } : {}} /><span>Grants</span></>}
        </NavLink>
      )}

      {isAdmin && (
        <NavLink to="/analytics" className={cls} title="Analytics">
          {({ isActive }) => <><BarChart2 size={20} style={isActive ? { color: "#fff" } : {}} /><span>Analytics</span></>}
        </NavLink>
      )}

      <div className="w-10 h-px my-1" style={{ background: "rgba(255,255,255,0.1)" }} />

      {isAdmin && (
        <NavLink to="/audit-log" className={cls} title="Audit Log">
          {({ isActive }) => <><ClipboardList size={20} style={isActive ? { color: "#fff" } : {}} /><span>Audit</span></>}
        </NavLink>
      )}
    </nav>
  );
}