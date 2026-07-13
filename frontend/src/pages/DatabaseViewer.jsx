import React, { useEffect, useState } from "react";
import client from "../api/client.js";
import Topbar from "./Topbar.jsx";
import { Database, RefreshCcw, Loader2 } from "lucide-react";

const TABLE_COLORS = {
  users:                "bg-blue-100 text-blue-800",
  grant_calls:          "bg-amber-100 text-amber-800",
  grant_call_documents: "bg-violet-100 text-violet-800",
  proposals:            "bg-indigo-100 text-indigo-800",
  assessments:          "bg-emerald-100 text-emerald-800",
  audit_log:            "bg-slate-100 text-slate-600",
};

export default function DatabaseViewer() {
  const [tables, setTables] = useState(null);
  const [activeTable, setActiveTable] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const { data } = await client.get("/db/tables");
      setTables(data);
      if (!activeTable) setActiveTable(Object.keys(data)[0]);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const current = tables?.[activeTable];

  return (
    <div>
      <Topbar
        title="Database Viewer"
        subtitle="Live read-only view of the platform database. Large and sensitive fields are hidden — use the terminal for full access."
        action={
          <button onClick={load} disabled={loading}
            className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[#5A7093] border border-[#E4E8EF] bg-white px-3 py-1.5 rounded-lg hover:bg-[#F8FAFD] disabled:opacity-50">
            {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCcw size={13} />} Refresh
          </button>
        }
      />

      {loading && !tables && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-[#8A9AB5]" />
        </div>
      )}

      {tables && (
        <div className="flex gap-5">
          {/* Table selector */}
          <div className="w-52 flex-shrink-0 space-y-1.5">
            {Object.entries(tables).map(([key, t]) => (
              <button key={key} onClick={() => setActiveTable(key)}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition-all ${
                  activeTable === key
                    ? "bg-white border-[#C89B2A] shadow-sm"
                    : "bg-white border-[#E4E8EF] hover:border-[#C5CDD8]"
                }`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-semibold text-[#1A2B42] truncate">{t.label}</span>
                  <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${TABLE_COLORS[key] || "bg-slate-100 text-slate-600"}`}>
                    {t.count}
                  </span>
                </div>
                <p className="text-[10px] text-[#8A9AB5] mt-0.5 font-mono">{key}</p>
              </button>
            ))}
          </div>

          {/* Table content */}
          <div className="flex-1 min-w-0">
            {current && (
              <div className="bg-white rounded-xl border border-[#E4E8EF] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-[#EEF1F7] bg-[#F8FAFD]">
                  <div className="flex items-center gap-2.5">
                    <Database size={15} className="text-[#8A9AB5]" />
                    <span className="text-[12.5px] font-bold text-[#1A2B42]">{current.label}</span>
                    <span className="text-[10px] font-mono text-[#8A9AB5]">{activeTable}</span>
                  </div>
                  <span className="text-[11px] text-[#8A9AB5]">{current.count} rows</span>
                </div>

                {current.error && (
                  <p className="px-5 py-6 text-[12px] text-rose-600">{current.error}</p>
                )}

                {current.rows.length === 0 && !current.error && (
                  <p className="px-5 py-10 text-center text-[12px] text-[#8A9AB5]">No rows in this table yet.</p>
                )}

                {current.rows.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px]">
                      <thead className="bg-[#F0F2F7] text-[#8A9AB5] text-[9.5px] uppercase tracking-[0.07em]">
                        <tr>
                          {current.columns.map(col => (
                            <th key={col} className="text-left px-4 py-2.5 font-bold whitespace-nowrap">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F4F6FA]">
                        {current.rows.map((row, i) => (
                          <tr key={i} className="hover:bg-[#F8FAFD]">
                            {current.columns.map(col => (
                              <td key={col} className="px-4 py-2.5 text-[#5A7093] max-w-[220px]">
                                <span className={`block truncate font-mono ${
                                  String(row[col]).startsWith("[") ? "text-[#B0BBC8] italic" : ""
                                }`} title={String(row[col])}>
                                  {row[col] === null || row[col] === undefined ? <span className="text-[#C5CDD8]">null</span> : String(row[col])}
                                </span>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
