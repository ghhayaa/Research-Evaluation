import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Loader2, ShieldCheck } from "lucide-react";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function Login() {
  const { user, loginWithPassword, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const gsiRef = useRef(null);

  useEffect(() => { if (user) navigate("/"); }, [user]);

  useEffect(() => {
    if (mode !== "sso" || !GOOGLE_CLIENT_ID) return;
    const render = () => {
      if (!window.google?.accounts?.id || !gsiRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async r => {
          setBusy(true); setError("");
          try { await loginWithGoogle(r.credential); navigate("/"); }
          catch (e) { setError(e?.response?.data?.error || "Google sign-in failed."); setBusy(false); }
        }
      });
      gsiRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(gsiRef.current, { theme: "outline", size: "large", width: 320 });
    };
    if (window.google?.accounts?.id) render();
    else {
      const t = setInterval(() => { if (window.google?.accounts?.id) { render(); clearInterval(t); } }, 200);
      return () => clearInterval(t);
    }
  }, [mode]);

  async function submit(e) {
    e.preventDefault(); setError(""); setBusy(true);
    try { await loginWithPassword(email.trim().toLowerCase(), password); navigate("/"); }
    catch (e) { setError(e?.response?.data?.error || "Invalid email or password."); }
    finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "#F0F2F7" }}>

      {/* KU logo + title */}
      <div className="text-center mb-7">
        <div className="inline-flex items-center justify-center bg-white rounded-2xl px-6 py-4 shadow-sm border border-[#E4E8EF] mb-5">
          <img src="/ku-logo.jpg" alt="Khalifa University" className="h-10" />
        </div>
        <h1 className="text-[20px] font-extrabold text-[#1A2B42]">Proposal Compliance Platform</h1>
        <p className="text-[12px] text-[#8A9AB5] mt-1">Research Office · Khalifa University</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-[380px] bg-white rounded-2xl border border-[#E4E8EF] shadow-sm overflow-hidden">

        {/* Navy top accent bar */}
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #1e3a5f 0%, #C89B2A 100%)" }} />

        <div className="p-6">
          {/* SSO notice */}
          <div className="flex items-center gap-2 text-[10.5px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-4">
            <ShieldCheck size={13} />
            Restricted to authorised KU PIs and Research Admin Staff
          </div>

          {/* Tab switcher */}
          <div className="flex bg-[#F0F2F7] p-[3px] rounded-lg mb-4">
            {["password", "sso"].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                className={`flex-1 text-[11.5px] font-semibold py-1.5 rounded-md transition-all ${mode === m ? "bg-white text-[#1A2B42] shadow-sm" : "text-[#8A9AB5] hover:text-[#5A7093]"}`}>
                {m === "password" ? "Email & password" : "Single sign-on"}
              </button>
            ))}
          </div>

          {error && (
            <div className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3">
              {error}
            </div>
          )}

          {mode === "password" && (
            <form onSubmit={submit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-[#5A7093] mb-1">Email</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="name@ku.ac.ae" autoFocus
                  className="w-full rounded-lg border border-[#E4E8EF] px-3.5 py-2.5 text-[12.5px] text-[#1A2B42] placeholder-[#B0BCC8] focus:outline-none focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/10 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#5A7093] mb-1">Password</label>
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-[#E4E8EF] px-3.5 py-2.5 text-[12.5px] text-[#1A2B42] focus:outline-none focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/10 transition-colors"
                />
              </div>
              <button
                type="submit" disabled={busy || !email || !password}
                className="w-full flex items-center justify-center gap-2 text-[13px] font-bold py-2.5 rounded-lg text-white transition-opacity disabled:opacity-50 mt-1"
                style={{ background: "#1e3a5f" }}>
                {busy ? <><Loader2 size={15} className="animate-spin" /> Signing in…</> : "Sign in"}
              </button>
            </form>
          )}

          {mode === "sso" && (
            <div className="flex flex-col items-center gap-3 py-2">
              {GOOGLE_CLIENT_ID
                ? <div ref={gsiRef} className="min-h-[44px] flex items-center justify-center w-full" />
                : <p className="text-[11px] text-[#8A9AB5] text-center leading-relaxed">
                    Google SSO is not configured. Set <code className="bg-[#F0F2F7] px-1.5 py-0.5 rounded text-[10px]">VITE_GOOGLE_CLIENT_ID</code> in your <code className="bg-[#F0F2F7] px-1.5 py-0.5 rounded text-[10px]">frontend/.env</code> file.
                  </p>}
              {busy && <Loader2 size={18} className="animate-spin" style={{ color: "#C89B2A" }} />}
            </div>
          )}
        </div>
      </div>

      <p className="text-[10px] text-[#B0BCC8] mt-5">
        © {new Date().getFullYear()} Khalifa University · Research Office
      </p>
    </div>
  );
}
