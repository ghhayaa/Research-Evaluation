import React, { useEffect, useState } from "react";
import client from "../api/client.js";
import Topbar from "./Topbar.jsx";
export default function AuditLog() {
  const [rows, setRows] = useState([]);
  useEffect(() => { client.get("/audit").then(r => setRows(r.data)); }, []);
  return (
    <div>
      <Topbar title="Audit log" subtitle="Every action retained for governance — minimum 7-year retention." />
      <div className="bg-white rounded-lg border border-[#E0E6EF] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F8FAFD] text-[#8A9AB5] text-[9px] uppercase tracking-[0.08em]">
            <tr>
              <th className="text-left px-4 py-2.5 font-bold">Timestamp</th>
              <th className="text-left px-4 py-2.5 font-bold">Role</th>
              <th className="text-left px-4 py-2.5 font-bold">Action</th>
              <th className="text-left px-4 py-2.5 font-bold">Entity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F4F6FA]">
            {rows.map(r => (
              <tr key={r.id} className="hover:bg-[#F8FAFD]">
                <td className="px-4 py-2.5 text-[10.5px] text-[#8A9AB5]">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-4 py-2.5 text-[11px] text-[#5A7093] font-medium capitalize">{r.actor_role}</td>
                <td className="px-4 py-2.5 text-[11px] font-semibold text-[#1A2B42]">{r.action}</td>
                <td className="px-4 py-2.5 text-[10.5px] text-[#8A9AB5]">{r.entity_type} · {r.entity_id.slice(0,8)}…</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-[11px] text-[#8A9AB5]">No log entries yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
