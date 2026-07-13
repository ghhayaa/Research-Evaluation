import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import client from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { ArrowLeft, Calendar, Building2, FileBadge2, UploadCloud } from "lucide-react";

export default function GrantCallDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [grant, setGrant] = useState(null);

  useEffect(() => {
    client.get(`/grant-calls/${id}`).then((r) => setGrant(r.data));
  }, [id]);

  if (!grant) return <p className="text-slate-400">Loading…</p>;

  return (
    <div>
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-5">
        <ArrowLeft size={15} /> Back to dashboard
      </Link>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-6">
        {grant.image_url && (
          <div className="h-56 w-full overflow-hidden">
            <img src={grant.image_url} alt={grant.title} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{grant.title}</h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 flex-wrap">
                {grant.sponsor && <span className="inline-flex items-center gap-1.5"><Building2 size={14} /> {grant.sponsor}</span>}
                {grant.reference && <span className="inline-flex items-center gap-1.5"><FileBadge2 size={14} /> {grant.reference}</span>}
                {grant.deadline && <span className="inline-flex items-center gap-1.5"><Calendar size={14} /> Deadline {grant.deadline}</span>}
              </div>
            </div>
            {user?.role !== "admin" && (
              <Link
                to={`/submit?grant=${grant.id}`}
                className="inline-flex items-center gap-2 bg-ku-navy hover:opacity-90 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shrink-0"
              >
                <UploadCloud size={16} /> Submit a Proposal
              </Link>
            )}
          </div>

          {grant.summary && <p className="text-slate-600 leading-relaxed mt-5">{grant.summary}</p>}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Compliance criteria for this grant call</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {grant.criteria.map((c) => (
            <div key={c.id} className="border border-slate-200 rounded-xl p-4">
              <p className="font-medium text-slate-800 text-sm mb-1">{c.label}</p>
              <p className="text-sm text-slate-500">{c.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
