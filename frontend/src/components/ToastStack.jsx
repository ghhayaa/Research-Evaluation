import React from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext.jsx";
import { Sparkles, X } from "lucide-react";

export default function ToastStack() {
  const { toasts, dismissToast } = useNotifications();
  const navigate = useNavigate();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 w-80">
      {toasts.map((t) => (
        <div key={t.id} className="bg-white border border-slate-200 shadow-lg rounded-xl p-4 flex items-start gap-3 animate-fadeIn">
          <div className="h-9 w-9 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
            <Sparkles size={17} className="text-brand-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 leading-tight">{t.message}</p>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{t.title}</p>
            <button
              onClick={() => { navigate(`/proposals/${t.proposalId}`); dismissToast(t.id); }}
              className="text-xs font-semibold text-brand-600 hover:underline mt-1.5"
            >
              View report →
            </button>
          </div>
          <button onClick={() => dismissToast(t.id)} className="text-slate-300 hover:text-slate-500 shrink-0">
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
