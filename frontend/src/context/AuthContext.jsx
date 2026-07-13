import React, { createContext, useContext, useEffect, useState } from "react";
import client from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("pe_user");
      if (stored && stored !== "undefined" && stored !== "null") {
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      localStorage.removeItem("pe_user");
      localStorage.removeItem("pe_token");
    }
    setLoading(false);
  }, []);

  function persist(data) {
    localStorage.setItem("pe_token", data.token);
    localStorage.setItem("pe_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  // Real local authentication — email + password checked against a stored
  // bcrypt hash on the backend.
  async function loginWithPassword(email, password) {
    const { data } = await client.post("/auth/login", { email, password });
    return persist(data);
  }

  // Real SSO — exchanges a Google-issued, signed ID token for our own app
  // session JWT. The backend verifies the token's signature and audience
  // against Google before issuing this token; this app never sees the
  // user's Google password.
  async function loginWithGoogle(credential) {
    const { data } = await client.post("/auth/sso/google", { credential });
    return persist(data);
  }

  function logout() {
    localStorage.removeItem("pe_token");
    localStorage.removeItem("pe_user");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loginWithPassword, loginWithGoogle, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
