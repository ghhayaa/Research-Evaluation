import React from "react";
import { useAuth } from "../context/AuthContext.jsx";
import Topbar from "./Topbar.jsx";
import { Mail, Building2, ShieldCheck, User } from "lucide-react";

export default function AccountPage() {
  const { user } = useAuth();

  const fields = [
    { icon: User,      label: "Full name",   value: user?.name },
    { icon: Mail,      label: "Email",        value: user?.email },
    { icon: Building2, label: "Department",   value: user?.department || "Khalifa University" },
    { icon: ShieldCheck,label: "Role",        value: user?.role === "admin" ? "Research Admin Staff" : "Principal Investigator (PI)" },
  ];

  const initials = user?.name?.split(/\s+/)
    .filter(p => !["Dr.","Prof.","Mr.","Mrs.","Ms."].includes(p))
    .slice(0, 2).map(n => n[0]).join("").toUpperCase();

  return (
    <div className="max-w-xl">
      <Topbar title="My account" subtitle="Your institutional profile on the Research Evaluation Platform." />

      <div className="bg-white rounded-xl border border-[#E4E8EF] overflow-hidden">
        {/* Avatar strip */}
        <div className="flex items-center gap-5 px-6 py-6 border-b border-[#EEF1F7]" style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%)" }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-[22px] font-black text-white flex-shrink-0" style={{ background: "#C89B2A" }}>
            {initials}
          </div>
          <div>
            <p className="text-[18px] font-extrabold text-white leading-tight">{user?.name}</p>
            <p className="text-[12px] text-white/60 mt-0.5">{user?.email}</p>
            <span className="inline-block mt-2 text-[10px] font-black uppercase tracking-wide px-2.5 py-0.5 rounded text-white" style={{ background: "rgba(200,155,42,0.8)" }}>
              {user?.role === "admin" ? "Research Admin Staff" : "Principal Investigator (PI)"}
            </span>
          </div>
        </div>

        {/* Fields */}
        <div className="divide-y divide-[#EEF1F7]">
          {fields.map(f => (
            <div key={f.label} className="flex items-center gap-4 px-6 py-4">
              <div className="w-8 h-8 rounded-lg bg-[#F0F2F7] flex items-center justify-center flex-shrink-0">
                <f.icon size={15} className="text-[#5A7093]" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A9AB5]">{f.label}</p>
                <p className="text-[13px] font-semibold text-[#1A2B42] mt-0.5">{f.value || "—"}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 bg-[#F8FAFD] border-t border-[#EEF1F7]">
          <p className="text-[11px] text-[#8A9AB5] leading-relaxed">
            Your account is managed by Khalifa University's identity provider. To update your name, department, or role, contact the Research Office at <span className="font-semibold text-[#5A7093]">internalfunding@ku.ac.ae</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
