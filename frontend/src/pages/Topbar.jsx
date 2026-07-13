import React from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { ArrowLeft, Home } from "lucide-react";

export default function Topbar({ title, subtitle, action }) {
  const navigate = useNavigate();
  const isHome = useLocation().pathname === "/";
  return (
    <div className="mb-5">
      {!isHome && (
        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-[10.5px] font-semibold text-[#8A9AB5] hover:text-[#5A7093] bg-white border border-[#E0E6EF] px-2.5 py-1 rounded-md">
            <ArrowLeft size={12} /> Back
          </button>
          <Link to="/" className="flex items-center gap-1 text-[10.5px] font-semibold text-[#8A9AB5] hover:text-[#5A7093] bg-white border border-[#E0E6EF] px-2.5 py-1 rounded-md">
            <Home size={12} /> Home
          </Link>
        </div>
      )}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-[#0E2D52]">{title}</h1>
          {subtitle && <p className="text-[11px] text-[#8A9AB5] mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}
