import React, { createContext, useContext, useEffect, useState } from "react";
import client from "../api/client.js";
import { useAuth } from "./AuthContext.jsx";

// Polls /proposals for status transitions and surfaces a toast whenever a
// proposal's status changes to something the relevant person should know
// about — without requiring them to manually refresh or click into each one.
//
//   Researchers see toasts when: their AI review finishes, or an admin
//   approves / declines / requests changes on their proposal.
//   Admins see a toast whenever a new proposal is submitted by anyone.
//
// "Seen" status per proposal is tracked in localStorage (scoped per user),
// so toasts only fire on genuine transitions, not on every page load.
const NotificationContext = createContext(null);
const POLL_INTERVAL_MS = 4000;

const RESEARCHER_NOTIFY = {
  ai_reviewed: "AI compliance review is ready",
  approved: "Your proposal was approved",
  declined: "Your proposal was declined",
  changes_requested: "Admin requested changes to your proposal",
};

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [toasts, setToasts] = useState([]);

  function dismissToast(toastId) {
    setToasts((prev) => prev.filter((t) => t.id !== toastId));
  }

  function pushToast(proposalId, title, message) {
    setToasts((prev) => [...prev, { id: `${proposalId}-${Date.now()}`, proposalId, title, message }]);
  }

  // Kept for backwards compatibility with SubmitProposal.jsx, which calls
  // this right after a successful submit — the watcher below will still
  // pick up the eventual AI-ready transition on its own, but this lets the
  // proposal start being watched immediately rather than waiting a cycle.
  function trackPending() { /* no-op: unified watcher below covers this */ }

  useEffect(() => {
    if (!user?.id) return;
    const seenKey = `pe_seen_statuses_${user.id}`;

    function getSeen() {
      try { return JSON.parse(localStorage.getItem(seenKey)) || {}; } catch { return {}; }
    }
    function setSeen(map) {
      localStorage.setItem(seenKey, JSON.stringify(map));
    }

    async function poll() {
      try {
        const { data } = await client.get("/proposals");
        const seen = getSeen();
        const nextSeen = { ...seen };
        const firstRun = Object.keys(seen).length === 0;

        for (const p of data) {
          const prevStatus = seen[p.id];
          nextSeen[p.id] = p.status;

          if (firstRun) continue; // don't spam toasts for pre-existing data on first load
          if (prevStatus === p.status) continue;

          if (!isAdmin && RESEARCHER_NOTIFY[p.status]) {
            pushToast(p.id, p.title, RESEARCHER_NOTIFY[p.status]);
          }
        }

        if (isAdmin) {
          // Admin: toast for brand-new submissions specifically (not every status change).
          for (const p of data) {
            if (!(p.id in seen) && !firstRun && p.status === "submitted") {
              pushToast(p.id, p.title, `New proposal submitted by ${p.owner_name}`);
            }
          }
        }

        setSeen(nextSeen);
      } catch {
        // ignore transient errors
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user?.id, isAdmin]);

  return (
    <NotificationContext.Provider value={{ trackPending, toasts, dismissToast }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
