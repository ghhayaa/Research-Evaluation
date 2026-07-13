import React from "react";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

const MAP = {
  "Pass": { cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", Icon: CheckCircle2 },
  "Partial": { cls: "bg-amber-50 text-amber-700 ring-amber-200", Icon: AlertTriangle },
  "Not Met": { cls: "bg-rose-50 text-rose-700 ring-rose-200", Icon: XCircle },
};

export default function StatusBadge({ status }) {
  const cfg = MAP[status] || MAP["Partial"];
  const { cls, Icon } = cfg;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${cls}`}>
      <Icon size={13} /> {status}
    </span>
  );
}
