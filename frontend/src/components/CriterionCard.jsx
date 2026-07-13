import React from "react";
import StatusBadge from "./StatusBadge.jsx";
import { Quote, Wrench } from "lucide-react";

export default function CriterionCard({ criterion }) {
  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-white hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4 className="font-semibold text-slate-800 text-sm">{criterion.label}</h4>
        <StatusBadge status={criterion.status} />
      </div>
      <p className="text-sm text-slate-600 leading-relaxed mb-3">{criterion.explanation}</p>

      <div className="space-y-2">
        <div className="flex gap-2 text-xs bg-slate-50 rounded-lg p-2.5">
          <Quote size={14} className="text-slate-400 shrink-0 mt-0.5" />
          <p className="text-slate-600"><span className="font-medium text-slate-700">Evidence: </span>{criterion.evidence}</p>
        </div>
        <div className="flex gap-2 text-xs bg-brand-50 rounded-lg p-2.5">
          <Wrench size={14} className="text-brand-500 shrink-0 mt-0.5" />
          <p className="text-brand-800"><span className="font-medium">Guidance: </span>{criterion.guidance}</p>
        </div>
      </div>
    </div>
  );
}
