import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import Header from "./components/Header.jsx";
import NavRail from "./components/NavRail.jsx";
import ToastStack from "./components/ToastStack.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import SubmitProposal from "./pages/SubmitProposal.jsx";
import ProposalsList from "./pages/ProposalsList.jsx";
import ProposalReport from "./pages/ProposalReport.jsx";
import ReviewQueue from "./pages/ReviewQueue.jsx";
import AuditLog from "./pages/AuditLog.jsx";
import GrantCallDetail from "./pages/GrantCallDetail.jsx";
import ManageGrantCalls from "./pages/ManageGrantCalls.jsx";
import AccountPage from "./pages/AccountPage.jsx";
import PreScreen from "./pages/PreScreen.jsx";

function Protected({ children, padded = true }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <NavRail />
        <main className={`flex-1 overflow-auto bg-[#F0F2F7] ${padded ? "p-6" : ""}`}>
          {children}
        </main>
      </div>
      <ToastStack />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/submit" element={<Protected><SubmitProposal /></Protected>} />
      <Route path="/proposals" element={<Protected><ProposalsList /></Protected>} />
      <Route path="/proposals/:id" element={<Protected padded={false}><ProposalReport /></Protected>} />
      <Route path="/grants/:id" element={<Protected><GrantCallDetail /></Protected>} />
      <Route path="/manage-grants" element={<Protected><ManageGrantCalls /></Protected>} />
      <Route path="/review-queue" element={<Protected><ReviewQueue /></Protected>} />
      <Route path="/prescreen" element={<Protected><PreScreen /></Protected>} />
      <Route path="/account" element={<Protected><AccountPage /></Protected>} />
      <Route path="/audit-log" element={<Protected><AuditLog /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
