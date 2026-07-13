import React, { useEffect, useState, useRef } from "react";
import client from "../api/client.js";
import Topbar from "./Topbar.jsx";
import { Sparkles, Plus, Trash2, Loader2, Save, X, FileText, Upload, Download, ChevronDown, ChevronRight, FileBadge, FileSpreadsheet, FileCheck, GitBranch, File, Pencil } from "lucide-react";

const DOC_TYPE_OPTIONS = [
  { value: "call_for_proposals", label: "Call for Proposals" },
  { value: "scoring_criteria",   label: "Scoring Criteria" },
  { value: "loc_template",       label: "LOC Template" },
  { value: "decision_matrix",    label: "Decision Matrix" },
  { value: "los_template",       label: "Letter of Support Template" },
  { value: "other",              label: "Other" },
];

const DOC_TYPE_META = {
  call_for_proposals: { cls: "bg-blue-100 text-blue-800",   icon: FileText },
  scoring_criteria:   { cls: "bg-violet-100 text-violet-800", icon: FileSpreadsheet },
  loc_template:       { cls: "bg-amber-100 text-amber-800",  icon: FileCheck },
  decision_matrix:    { cls: "bg-rose-100 text-rose-800",    icon: GitBranch },
  los_template:       { cls: "bg-emerald-100 text-emerald-800", icon: FileBadge },
  other:              { cls: "bg-slate-100 text-slate-600",  icon: File },
};

function emptyCriterion() {
  return { id: `c_${Math.random().toString(36).slice(2, 8)}`, label: "", description: "" };
}

function DocumentLibrary({ grantCallId }) {
  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState("call_for_proposals");
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  async function load() {
    try {
      const { data } = await client.get(`/grant-calls/${grantCallId}/documents`);
      setDocs(data);
    } catch (e) { console.error(e); }
  }

  useEffect(() => { load(); }, [grantCallId]);

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true); setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("doc_type", docType);
      await client.post(`/grant-calls/${grantCallId}/documents`, form, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      await load();
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setError(err?.response?.data?.error || "Upload failed.");
    } finally { setUploading(false); }
  }

  async function handleDelete(docId) {
    if (!confirm("Remove this document from the library?")) return;
    await client.delete(`/grant-calls/${grantCallId}/documents/${docId}`);
    await load();
  }

  async function handleDownload(doc) {
    try {
      const resp = await client.get(
        `/grant-calls/${grantCallId}/documents/${doc.id}/download`,
        { responseType: "blob" }
      );
      const url = URL.createObjectURL(resp.data);
      const a = document.createElement("a");
      a.href = url; a.download = doc.original_name; a.click();
      URL.revokeObjectURL(url);
    } catch { alert("Could not download file."); }
  }

  const sel = "rounded-lg border border-[#E4E8EF] px-3 py-2 text-[11.5px] bg-white focus:outline-none text-[#1A2B42]";

  return (
    <div>
      {/* Upload row */}
      <div className="flex items-center gap-2 mb-4">
        <select value={docType} onChange={e => setDocType(e.target.value)} className={sel}>
          {DOC_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <label className={`flex items-center gap-1.5 cursor-pointer border border-[#E4E8EF] hover:border-[#C89B2A] text-[11.5px] font-semibold text-[#5A7093] px-3.5 py-2 rounded-lg transition-colors bg-white ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? "Uploading…" : "Attach document"}
          <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.xlsx,.txt" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
        {error && <p className="text-[11px] text-rose-600">{error}</p>}
      </div>

      {/* Document cards */}
      {docs.length === 0 ? (
        <div className="border-2 border-dashed border-[#E4E8EF] rounded-xl py-10 text-center">
          <FileText size={24} className="text-[#C5CDD8] mx-auto mb-2" />
          <p className="text-[12px] font-semibold text-[#8A9AB5]">No documents attached yet</p>
          <p className="text-[11px] text-[#B0BBC8] mt-1">Use the selector above to attach the Call for Proposals, Scoring Criteria, LOC Template, and Decision Matrix</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {docs.map(d => {
            const meta = DOC_TYPE_META[d.doc_type] || DOC_TYPE_META.other;
            const Icon = meta.icon;
            return (
              <div key={d.id} className="bg-white border border-[#E4E8EF] rounded-xl p-4 flex flex-col gap-3 hover:border-[#C89B2A] hover:shadow-sm transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#F0F2F7] flex items-center justify-center flex-shrink-0">
                    <Icon size={17} className="text-[#5A7093]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11.5px] font-semibold text-[#1A2B42] truncate" title={d.original_name}>{d.original_name}</p>
                    <p className="text-[10px] text-[#8A9AB5] mt-0.5">{new Date(d.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full ${meta.cls}`}>
                    {DOC_TYPE_OPTIONS.find(o => o.value === d.doc_type)?.label || d.doc_type}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleDownload(d)}
                      className="flex items-center gap-1 text-[10.5px] font-semibold text-[#2563EB] hover:underline px-2 py-1 rounded">
                      <Download size={12} /> Download
                    </button>
                    <button onClick={() => handleDelete(d.id)}
                      className="p-1 rounded hover:bg-rose-50 text-[#C5CDD8] hover:text-rose-500 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ManageGrantCalls() {
  const [grantCalls, setGrantCalls] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null); // grant call being edited
  const [title, setTitle] = useState(""); const [sponsor, setSponsor] = useState("");
  const [reference, setReference] = useState(""); const [summary, setSummary] = useState("");
  const [imageUrl, setImageUrl] = useState(""); const [deadline, setDeadline] = useState("");
  const [criteria, setCriteria] = useState([emptyCriterion()]);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function load() { client.get("/grant-calls").then(r => setGrantCalls(r.data)); }
  useEffect(load, []);

  function resetForm() {
    setTitle(""); setSponsor(""); setReference(""); setSummary(""); setImageUrl(""); setDeadline("");
    setCriteria([emptyCriterion()]); setError(""); setEditingId(null);
  }

  function startEdit(g) {
    setEditingId(g.id);
    setTitle(g.title); setSponsor(g.sponsor || ""); setReference(g.reference || "");
    setSummary(g.summary || ""); setImageUrl(g.image_url || ""); setDeadline(g.deadline || "");
    setCriteria(g.criteria?.length ? g.criteria : [emptyCriterion()]);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(g) {
    if (!confirm(`Delete "${g.title}"? This will also remove its document library entries. This cannot be undone.`)) return;
    try {
      await client.delete(`/grant-calls/${g.id}`);
      if (expandedId === g.id) setExpandedId(null);
      load();
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to delete.");
    }
  }

  async function handleExtract(e) {
    const f = e.target.files[0];
    if (!f) return;
    setExtracting(true); setError("");
    try {
      const form = new FormData();
      form.append("file", f);
      const { data } = await client.post("/grant-calls/extract", form, { headers: { "Content-Type": "multipart/form-data" } });
      if (data.summary) setSummary(data.summary);
      if (data.criteria?.length) setCriteria(data.criteria);
    } catch (err) {
      setError(err?.response?.data?.error || "Couldn't extract criteria from that document.");
    } finally { setExtracting(false); }
  }

  function updateCriterion(idx, field, value) {
    setCriteria(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  }

  async function handleSave(e) {
    e.preventDefault(); setError("");
    const clean = criteria.filter(c => c.label.trim());
    if (!title || clean.length === 0) { setError("Title and at least one labeled criterion are required."); return; }
    setSaving(true);
    try {
      if (editingId) {
        await client.patch(`/grant-calls/${editingId}`, { title, sponsor, reference, summary, image_url: imageUrl, deadline, criteria: clean });
      } else {
        await client.post("/grant-calls", { title, sponsor, reference, summary, image_url: imageUrl, deadline, criteria: clean });
      }
      resetForm(); setShowForm(false); load();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to save.");
    } finally { setSaving(false); }
  }

  const inputCls = "w-full rounded-lg border border-[#E4E8EF] px-3.5 py-2.5 text-[12px] text-[#1A2B42] focus:outline-none focus:border-[#C89B2A] focus:ring-1 focus:ring-[#C89B2A]/30";

  return (
    <div>
      <Topbar
        title="Manage Grant Calls"
        subtitle="Attach the source documents for each grant call — Call for Proposals, Scoring Criteria, LOC Template, and Decision Matrix."
        action={!showForm && (
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 text-[12px] font-bold text-white px-3.5 py-2 rounded-lg" style={{ background: "#1e3a5f" }}>
            <Plus size={15} /> New Grant Call
          </button>
        )}
      />

      {showForm && (
        <form onSubmit={handleSave} className="bg-white rounded-xl border border-[#E4E8EF] p-5 mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-bold text-[#1A2B42]">{editingId ? "Edit Grant Call" : "New Grant Call"}</p>
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }}><X size={17} className="text-[#8A9AB5]" /></button>
          </div>

          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#E4E8EF] rounded-xl py-7 cursor-pointer hover:border-[#C89B2A] hover:bg-amber-50/30 transition-colors">
            {extracting
              ? <><Loader2 size={20} className="animate-spin text-[#C89B2A]" /><span className="text-[11px] text-[#5A7093]">Extracting criteria with AI…</span></>
              : <><Sparkles size={20} className="text-[#C89B2A]" /><span className="text-[11.5px] font-semibold text-[#1A2B42]">Upload grant call document to auto-extract criteria</span><span className="text-[10px] text-[#8A9AB5]">PDF or DOCX — or fill in manually below</span></>}
            <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleExtract} disabled={extracting} />
          </label>

          <div className="grid md:grid-cols-2 gap-3">
            <div><label className="text-[10.5px] font-semibold text-[#5A7093]">Title *</label><input value={title} onChange={e => setTitle(e.target.value)} className={`mt-1 ${inputCls}`} placeholder="e.g. Research & Innovation Grant 2024" /></div>
            <div><label className="text-[10.5px] font-semibold text-[#5A7093]">Sponsor</label><input value={sponsor} onChange={e => setSponsor(e.target.value)} className={`mt-1 ${inputCls}`} placeholder="e.g. Khalifa University — Office of Research" /></div>
            <div><label className="text-[10.5px] font-semibold text-[#5A7093]">Reference</label><input value={reference} onChange={e => setReference(e.target.value)} className={`mt-1 ${inputCls}`} placeholder="e.g. RIG-2024" /></div>
            <div><label className="text-[10.5px] font-semibold text-[#5A7093]">Deadline</label><input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className={`mt-1 ${inputCls}`} /></div>
            <div className="md:col-span-2"><label className="text-[10.5px] font-semibold text-[#5A7093]">Cover image URL <span className="font-normal text-[#8A9AB5]">(optional)</span></label><input value={imageUrl} onChange={e => setImageUrl(e.target.value)} className={`mt-1 ${inputCls}`} placeholder="https://…" /></div>
            <div className="md:col-span-2"><label className="text-[10.5px] font-semibold text-[#5A7093]">PI-facing summary</label><textarea value={summary} onChange={e => setSummary(e.target.value)} rows={2} className={`mt-1 ${inputCls}`} placeholder="2-3 sentences describing what this call funds and who should apply" /></div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10.5px] font-semibold text-[#5A7093]">Compliance Criteria *</label>
              <button type="button" onClick={() => setCriteria(p => [...p, emptyCriterion()])} className="text-[10.5px] font-semibold text-[#C89B2A] hover:underline flex items-center gap-1"><Plus size={12} /> Add</button>
            </div>
            <div className="space-y-2">
              {criteria.map((c, i) => (
                <div key={i} className="flex gap-2 items-start bg-[#F8FAFD] rounded-lg p-2.5 border border-[#E4E8EF]">
                  <div className="flex-1 grid sm:grid-cols-3 gap-2">
                    <input value={c.label} onChange={e => updateCriterion(i, "label", e.target.value)} placeholder="Criterion name" className="rounded-lg border border-[#E4E8EF] px-2.5 py-1.5 text-[11px] focus:outline-none focus:border-[#C89B2A]" />
                    <input value={c.description} onChange={e => updateCriterion(i, "description", e.target.value)} placeholder="What's required" className="sm:col-span-2 rounded-lg border border-[#E4E8EF] px-2.5 py-1.5 text-[11px] focus:outline-none focus:border-[#C89B2A]" />
                  </div>
                  <button type="button" onClick={() => setCriteria(p => p.filter((_, j) => j !== i))} className="p-1.5 text-[#8A9AB5] hover:text-rose-600"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-[11px] text-rose-600">{error}</p>}
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 text-[12px] font-bold text-white px-4 py-2 rounded-lg disabled:opacity-60" style={{ background: "#1e3a5f" }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {editingId ? "Save changes" : "Save Grant Call"}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {grantCalls.map(g => (
          <div key={g.id} className="bg-white rounded-xl border border-[#E4E8EF] overflow-hidden">
            {/* Header row */}
            <div className="flex items-center">
              <button
                onClick={() => setExpandedId(expandedId === g.id ? null : g.id)}
                className="flex-1 flex items-center gap-4 px-5 py-4 hover:bg-[#F8FAFD] transition-colors text-left"
              >
                {g.image_url && (
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                    <img src={g.image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-[13px] font-bold text-[#1A2B42] truncate">{g.title}</p>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${g.status === "open" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{g.status}</span>
                  </div>
                  <p className="text-[10.5px] text-[#8A9AB5]">
                    {g.sponsor}{g.reference && ` · ${g.reference}`}{g.deadline && ` · Due ${g.deadline}`}
                    <span className="ml-2 font-semibold text-[#5A7093]">{g.criteria?.length || 0} criteria</span>
                  </p>
                </div>
                {expandedId === g.id ? <ChevronDown size={16} className="text-[#8A9AB5] flex-shrink-0" /> : <ChevronRight size={16} className="text-[#8A9AB5] flex-shrink-0" />}
              </button>

              {/* Edit + Delete actions */}
              <div className="flex items-center gap-1 pr-4 flex-shrink-0">
                <button
                  onClick={() => startEdit(g)}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-[#5A7093] hover:text-[#1A2B42] hover:bg-[#F0F2F7] px-2.5 py-1.5 rounded-lg transition-colors"
                  title="Edit grant call"
                >
                  <Pencil size={13} /> Edit
                </button>
                <button
                  onClick={() => handleDelete(g)}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-[#8A9AB5] hover:text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-colors"
                  title="Delete grant call"
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>

            {/* Expanded: summary + document library only (no criteria list) */}
            {expandedId === g.id && (
              <div className="px-5 pb-5 border-t border-[#EEF1F7]">
                {g.summary && (
                  <p className="text-[11.5px] text-[#5A7093] leading-relaxed mt-4 mb-4 bg-[#F8FAFD] rounded-lg px-4 py-3 border border-[#E4E8EF]">
                    {g.summary}
                  </p>
                )}
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#8A9AB5] mb-3">Document Library</p>
                <DocumentLibrary grantCallId={g.id} />
              </div>
            )}
          </div>
        ))}
        {grantCalls.length === 0 && <p className="text-[11px] text-[#8A9AB5] text-center py-10">No grant calls yet.</p>}
      </div>
    </div>
  );
}
