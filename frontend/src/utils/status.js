// Central place for proposal/assessment status -> label/color mapping so
// every screen (dashboard, lists, report) stays visually consistent.
export const STATUS_META = {
  submitted:          { label: "Submitted",        cls: "bg-slate-100 text-slate-600" },
  ai_reviewed:        { label: "AI Reviewed",       cls: "bg-violet-100 text-violet-700" },
  changes_requested:  { label: "Changes Requested", cls: "bg-amber-100 text-amber-700" },
  declined:           { label: "Declined",          cls: "bg-rose-100 text-rose-700" },
  approved:           { label: "Approved",          cls: "bg-emerald-100 text-emerald-700" },
};

export function statusMeta(status) {
  return STATUS_META[status] || { label: status?.replace(/_/g, " ") || "Unknown", cls: "bg-slate-100 text-slate-600" };
}
