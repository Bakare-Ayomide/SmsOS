/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { SaaSUser, Gateway, SubscriptionTier, SubscriptionStatus } from "../types";
import { 
  Users, 
  Layers, 
  DollarSign, 
  UserPlus, 
  RefreshCw, 
  Trash2, 
  Sliders, 
  Smartphone, 
  Check, 
  X, 
  Calendar, 
  ShieldAlert, 
  ArrowUpCircle, 
  Timer, 
  Activity, 
  Mail, 
  HardDrive, 
  Network,
  Github,
  ExternalLink,
  Lock,
  Settings,
  Terminal,
  CloudLightning,
  Eye,
  EyeOff,
  AlertTriangle
} from "lucide-react";

interface SaaSAdminPanelProps {
  gateways: Gateway[];
  onReload: () => void;
}

export default function SaaSAdminPanel({ gateways, onReload }: SaaSAdminPanelProps) {
  const [users, setUsers] = useState<SaaSUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<SaaSUser | null>(null);
  const [isAddingUser, setIsAddingUser] = useState<boolean>(false);

  // GitHub CI/CD & Publishing Panel State
  const [githubRepo, setGithubRepo] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [githubBranch, setGithubBranch] = useState("main");
  const [githubLastPush, setGithubLastPush] = useState<string | null>(null);
  const [githubLogs, setGithubLogs] = useState<string[]>([]);
  const [hasToken, setHasToken] = useState(false);
  const [customApkUrl, setCustomApkUrl] = useState("");
  const [isSavingGit, setIsSavingGit] = useState(false);
  const [isPushingCode, setIsPushingCode] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [gitFeedback, setGitFeedback] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: "" });

  // Load GitHub Config
  const fetchGitConfig = async () => {
    try {
      const res = await fetch("/api/github/config");
      if (res.ok) {
        const data = await res.json();
        setGithubRepo(data.githubRepo);
        setGithubBranch(data.githubBranch || "main");
        setGithubLastPush(data.githubLastPush);
        setGithubLogs(data.githubLogs || []);
        setHasToken(data.hasToken);
        setCustomApkUrl(data.customApkUrl || "");
      }
    } catch (err) {
      console.error("Error loading GitHub configuration:", err);
    }
  };

  // Poll logs when push is active
  useEffect(() => {
    let interval: any;
    if (isPushingCode) {
      interval = setInterval(async () => {
        try {
          const res = await fetch("/api/github/config");
          if (res.ok) {
            const data = await res.json();
            setGithubLogs(data.githubLogs || []);
            setGithubLastPush(data.githubLastPush);
            
            // If the logs contain "SUCCESS" or "FAILED", stop pushing state
            const lastLog = data.githubLogs?.[data.githubLogs.length - 1] || "";
            if (lastLog.includes("SUCCESS!") || lastLog.includes("FAILED!") || lastLog.includes("COMPILER FAILURE")) {
              setIsPushingCode(false);
              setHasToken(data.hasToken);
            }
          }
        } catch (err) {
          console.error(err);
        }
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isPushingCode]);

  const handleSaveGitConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubRepo.trim() && !customApkUrl.trim()) {
      setGitFeedback({ type: 'error', message: "Repository URL or Custom APK Download URL must be filled out." });
      return;
    }

    setIsSavingGit(true);
    setGitFeedback({ type: null, message: "" });
    try {
      const res = await fetch("/api/github/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          githubRepo: githubRepo.trim() || undefined,
          githubToken: githubToken || undefined, // Only send if not empty
          githubBranch: githubBranch.trim() || undefined,
          customApkUrl: customApkUrl.trim() || undefined
        })
      });

      if (res.ok) {
        setGitFeedback({ type: 'success', message: "GitHub upstream configurations updated successfully!" });
        setGithubToken(""); // Clear cleartext field
        fetchGitConfig();
      } else {
        setGitFeedback({ type: 'error', message: "Failed to store credentials." });
      }
    } catch (err) {
      setGitFeedback({ type: 'error', message: "Failed to communicate with local daemon compiler." });
    } finally {
      setIsSavingGit(false);
    }
  };

  const handleTriggerGitPush = async () => {
    if (!githubRepo) {
      setGitFeedback({ type: 'error', message: "Please configure and save your GitHub Repository credentials first." });
      return;
    }
    if (!hasToken && !githubToken) {
      setGitFeedback({ type: 'error', message: "Personal Access Token is required to authenticate push requests." });
      return;
    }

    setIsPushingCode(true);
    setGitFeedback({ type: null, message: "" });
    
    try {
      const res = await fetch("/api/github/push", { method: "POST" });
      if (res.ok) {
        setGitFeedback({ type: 'success', message: "GitHub publishing pipeline running in background..." });
      } else {
        const errData = await res.json();
        setGitFeedback({ type: 'error', message: errData.error || "Execution failed." });
        setIsPushingCode(false);
      }
    } catch (err) {
      setGitFeedback({ type: 'error', message: "Failed to communicate with repository builder service." });
      setIsPushingCode(false);
    }
  };

  // New User Form State
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newTier, setNewTier] = useState<SubscriptionTier>("free");
  const [newStatus, setNewStatus] = useState<SubscriptionStatus>("active");
  const [newQuota, setNewQuota] = useState(1);
  const [newLimit, setNewLimit] = useState(500);
  const [newVersion, setNewVersion] = useState("2.5.0");
  const [newPoll, setNewPoll] = useState(7);

  // Edit User Form State
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editTier, setEditTier] = useState<SubscriptionTier>("free");
  const [editStatus, setEditStatus] = useState<SubscriptionStatus>("active");
  const [editQuota, setEditQuota] = useState(1);
  const [editLimit, setEditLimit] = useState(500);
  const [editVersion, setEditVersion] = useState("2.5.0");
  const [editPoll, setEditPoll] = useState(7);

  // Load SaaS customers
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch (err) {
      console.error("Error loading SaaS customers:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchGitConfig();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          subscriptionTier: newTier,
          subscriptionStatus: newStatus,
          gatewayQuota: newQuota,
          smsLimitMonthly: newLimit,
          remoteAppVersion: newVersion,
          remotePollingInterval: newPoll,
        })
      });

      if (res.ok) {
        setNewName("");
        setNewEmail("");
        setIsAddingUser(false);
        fetchUsers();
        onReload();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartEdit = (user: SaaSUser) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditTier(user.subscriptionTier);
    setEditStatus(user.subscriptionStatus);
    setEditQuota(user.gatewayQuota);
    setEditLimit(user.smsLimitMonthly);
    setEditVersion(user.remoteAppVersion);
    setEditPoll(user.remotePollingInterval);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          subscriptionTier: editTier,
          subscriptionStatus: editStatus,
          gatewayQuota: editQuota,
          smsLimitMonthly: editLimit,
          remoteAppVersion: editVersion,
          remotePollingInterval: editPoll
        })
      });

      if (res.ok) {
        setEditingUser(null);
        fetchUsers();
        onReload();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this SaaS Customer? Their physical devices will be safely unlinked from the system.")) return;

    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchUsers();
        onReload();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Associate a gateway with a customer
  const handleAssignGateway = async (gatewayId: string, ownerId: string) => {
    try {
      const gw = gateways.find(g => g.id === gatewayId);
      if (!gw) return;

      await fetch(`/api/gateways`, {
        method: "POST", // In standard mock DB we recreate or can re-link
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...gw,
          ownerId: ownerId === "unassigned" ? null : ownerId
        })
      });
      onReload();
    } catch (err) {
      console.error(err);
    }
  };

  // SaaS Wide MRR Calculation
  const saasMRR = users.reduce((acc, u) => {
    if (u.subscriptionStatus !== "active") return acc;
    if (u.subscriptionTier === "pro") return acc + 49;
    if (u.subscriptionTier === "enterprise") return acc + 249;
    return acc;
  }, 0);

  const saasActivePro = users.filter(u => u.subscriptionStatus === "active" && u.subscriptionTier !== "free").length;

  return (
    <div id="saas-super-admin-root" className="space-y-6 animate-fade-in">
      {/* Head section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">SaaS Customers Console</h2>
          <p className="text-xs text-slate-500">
            Control subscriptions, manage software releases, and update hardware configurations remotely.
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={fetchUsers}
            disabled={isLoading}
            className="p-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Sync Accounts</span>
          </button>
          
          <button
            onClick={() => setIsAddingUser(true)}
            className="p-2 px-3.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-sm border border-indigo-500/10"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Onboard Customer</span>
          </button>
        </div>
      </div>

      {/* SaaS Live Metrics Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Customers */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-slate-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-mono font-bold text-slate-400 tracking-wider">SaaS Active Accounts</span>
            <span className="block text-2xl font-extrabold text-white mt-1 font-mono">
              {users.length}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Across {users.filter(u => u.subscriptionTier !== "free").length} premium contracts
            </span>
          </div>
          <div className="p-3.5 bg-slate-800 text-indigo-400 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Paying Customers */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-slate-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-mono font-bold text-slate-400 tracking-wider">Premium Gateways</span>
            <span className="block text-2xl font-extrabold text-indigo-400 mt-1 font-mono">
              {saasActivePro}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Pro ($49) and Enterprise ($249) seats
            </span>
          </div>
          <div className="p-3.5 bg-slate-800 text-indigo-400 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Total SaaS MRR */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-slate-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-mono font-bold text-slate-400 tracking-wider">SaaS Monthly Recurring Revenue</span>
            <span className="block text-2xl font-extrabold text-emerald-400 mt-1 font-mono">
              ${saasMRR.toLocaleString()}/mo
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              100% self-hosted contract volume
            </span>
          </div>
          <div className="p-3.5 bg-slate-800 text-emerald-400 rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Onboard Customer Overlay Modal */}
      {isAddingUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 max-w-lg w-full flex flex-col gap-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Onboard New SaaS Customer</h3>
              </div>
              <button 
                onClick={() => setIsAddingUser(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Customer Name</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Acme Logistics, LLC"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Billing Email Address</label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="billing@acme.com"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subscription Tier</label>
                  <select
                    value={newTier}
                    onChange={(e) => setNewTier(e.target.value as SubscriptionTier)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 focus:outline-none"
                  >
                    <option value="free">Free Trial</option>
                    <option value="pro">Pro ($49/mo)</option>
                    <option value="enterprise">Enterprise ($249/mo)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Billing Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as SubscriptionStatus)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 focus:outline-none"
                  >
                    <option value="active">Active (Paid)</option>
                    <option value="past_due">Past Due</option>
                    <option value="unpaid">Unpaid (Locked)</option>
                    <option value="canceled">Canceled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Gateway Quota (Devices)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newQuota}
                    onChange={(e) => setNewQuota(parseInt(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Monthly SMS Limit</label>
                  <input
                    type="number"
                    min="100"
                    max="100000"
                    value={newLimit}
                    onChange={(e) => setNewLimit(parseInt(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Push Remote Core Version</label>
                  <input
                    type="text"
                    required
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value)}
                    placeholder="2.5.0"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Polling Interval (Seconds)</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={newPoll}
                    onChange={(e) => setNewPoll(parseInt(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingUser(false)}
                  className="p-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="p-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-sm"
                >
                  Save and Provision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Settings Modal (Drawer) */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 max-w-lg w-full flex flex-col gap-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Remote Management Console</h3>
                  <p className="text-[10px] text-slate-500 font-mono">UID: {editingUser.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingUser(null)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Billing Email</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subscription Tier</label>
                  <select
                    value={editTier}
                    onChange={(e) => setEditTier(e.target.value as SubscriptionTier)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 focus:outline-none"
                  >
                    <option value="free">Free Trial</option>
                    <option value="pro">Pro ($49/mo)</option>
                    <option value="enterprise">Enterprise ($249/mo)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Billing Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as SubscriptionStatus)}
                    className={`w-full bg-slate-50 border text-xs rounded-xl p-2.5 focus:outline-none font-semibold ${
                      editStatus === 'active' 
                        ? "border-emerald-200 text-emerald-600" 
                        : "border-rose-200 text-rose-500"
                    }`}
                  >
                    <option value="active">Active (Paid)</option>
                    <option value="past_due">Past Due</option>
                    <option value="unpaid">Unpaid (Suspended)</option>
                    <option value="canceled">Canceled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Gateway Quota</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={editQuota}
                    onChange={(e) => setEditQuota(parseInt(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Monthly SMS Limit</label>
                  <input
                    type="number"
                    min="100"
                    max="100000"
                    value={editLimit}
                    onChange={(e) => setEditLimit(parseInt(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5"
                  />
                </div>

                <div className="bg-indigo-950/45 p-3.5 rounded-2xl col-span-2 space-y-3.5 border border-indigo-900/40 mt-1">
                  <div className="flex items-center gap-1 text-xs text-indigo-300 font-bold">
                    <ArrowUpCircle className="w-4 h-4" />
                    <span>Wireless Over-the-Air (OTA) Release Updater</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-slate-200">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Core Software Release</label>
                      <input
                        type="text"
                        required
                        value={editVersion}
                        onChange={(e) => setEditVersion(e.target.value)}
                        className="w-full bg-slate-900 border border-indigo-900 text-indigo-200 font-mono text-xs rounded-xl p-2"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Polling Speed (seconds)</label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={editPoll}
                        onChange={(e) => setEditPoll(parseInt(e.target.value))}
                        className="w-full bg-slate-900 border border-indigo-900 text-indigo-200 font-mono text-xs rounded-xl p-2"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-indigo-300/80 leading-relaxed">
                    Adjusting these parameters forces the client mobile device to synchronize, hot-install packages, and update transmission behavior instantly on its next sync.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="p-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="p-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-sm border border-indigo-500/10"
                >
                  Remote Deploy Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SaaS Customer Grid */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 p-4 bg-slate-50 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">Customer Database</h3>
          <span className="text-xs text-slate-500">{users.length} active contracts found</span>
        </div>

        {users.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
            <Users className="w-12 h-12 text-slate-300 mb-2" />
            <span className="font-semibold text-slate-500">No Customers Registered</span>
            <span className="text-xs mt-1 text-slate-400">Onboard some customers to populate your self-hosted SaaS network.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-mono text-[10px] uppercase bg-slate-50/50">
                  <th className="p-4 py-3 font-semibold">Subscriber</th>
                  <th className="p-4 py-3 font-semibold">Tier / Status</th>
                  <th className="p-4 py-3 font-semibold">Sms Limit</th>
                  <th className="p-4 py-3 font-semibold">Fleet Quota</th>
                  <th className="p-4 py-3 font-semibold">Client Version</th>
                  <th className="p-4 py-3 font-semibold">Last Active</th>
                  <th className="p-4 py-3 text-right font-semibold">Control Panel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {users.map((user) => {
                  const userGateways = gateways.filter(g => g.ownerId === user.id);
                  
                  return (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-xs">{user.name}</span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                            <Mail className="w-3 h-3 text-slate-300" />
                            {user.email}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-md font-mono text-[9px] font-bold uppercase ${
                            user.subscriptionTier === 'enterprise' 
                              ? "bg-purple-50 text-purple-600 border border-purple-100" 
                              : user.subscriptionTier === 'pro'
                              ? "bg-indigo-50 text-indigo-600 border border-indigo-100"
                              : "bg-slate-100 text-slate-500"
                          }`}>
                            {user.subscriptionTier}
                          </span>
                          
                          <span className={`px-1.5 py-0.5 rounded-md font-mono text-[9px] font-bold ${
                            user.subscriptionStatus === 'active'
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-rose-50 text-rose-500"
                          }`}>
                            {user.subscriptionStatus}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <div className="flex justify-between text-[10px] text-slate-500 mb-1 font-mono">
                            <span>{user.smsSentThisMonth || 0} / {user.smsLimitMonthly}</span>
                          </div>
                          <div className="w-24 bg-slate-100 h-1 rounded-full overflow-hidden">
                            <div 
                              className="bg-indigo-600 h-full rounded-full" 
                              style={{ width: `${Math.min(100, ((user.smsSentThisMonth || 0) / user.smsLimitMonthly) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 font-mono">
                            {userGateways.length} / {user.gatewayQuota}
                          </span>
                          <span className="text-[9px] text-slate-400">devices coupled</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-700 font-mono flex items-center gap-1">
                            <ArrowUpCircle className="w-3 h-3 text-indigo-500" />
                            v{user.remoteAppVersion}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1">
                            <Timer className="w-3 h-3 text-slate-300" />
                            {user.remotePollingInterval}s delay
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-500 font-mono text-[10px]">
                        {user.lastActive ? new Date(user.lastActive).toLocaleTimeString() : "Never"}
                      </td>
                      <td className="p-4 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => handleStartEdit(user)}
                          className="p-1 px-2.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors inline-flex items-center gap-1 font-semibold text-[10px] cursor-pointer"
                        >
                          <Sliders className="w-3 h-3 text-indigo-500" />
                          <span>Remote</span>
                        </button>
                        
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-1.5 bg-rose-50 border border-rose-100 text-rose-500 rounded-lg hover:bg-rose-100 transition-colors inline-flex cursor-pointer"
                          title="Offboard Customer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Coupled Device Allocation Map */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
        <h3 className="font-bold text-slate-900 text-sm mb-1 flex items-center gap-2">
          <Network className="w-4 h-4 text-indigo-500" />
          <span>Device Allocation Mapper</span>
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Couple connected physical smartphone terminals to specific SaaS Customers to provision their cellular dispatch routes.
        </p>

        {gateways.length === 0 ? (
          <div className="p-6 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl text-xs">
            No registered hardware terminals found to map. Register a gateway in the main console first.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {gateways.map((gw) => (
              <div key={gw.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Smartphone className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-bold text-xs text-slate-800 block truncate">{gw.name}</span>
                    <span className="text-[9px] text-slate-400 font-mono truncate block">
                      Carrier 1: {gw.sim1Number || "No Sim Detected"}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 font-medium">Owner:</span>
                  <select
                    value={gw.ownerId || "unassigned"}
                    onChange={(e) => handleAssignGateway(gw.id, e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg text-[11px] p-1.5 focus:outline-none"
                  >
                    <option value="unassigned">⚠️ Unassigned/Idle</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* GitHub DevOps Integration & Live CI/CD APK Builder */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-5 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-900 text-white rounded-xl">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">GitHub DevOps & Live CI/CD APK Compiler</h3>
              <p className="text-[11px] text-slate-500">
                Export the entire system codebase to GitHub and trigger automatic APK compilation via GitHub Actions.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
              githubLastPush 
                ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                : "bg-amber-50 text-amber-600 border border-amber-100"
            }`}>
              {githubLastPush ? "● Upstream Linked" : "● Offline Sandbox"}
            </span>
            {githubLastPush && (
              <span className="text-[10px] text-slate-400 font-mono">
                Synced: {new Date(githubLastPush).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Configuration & Push Control */}
          <form onSubmit={handleSaveGitConfig} className="lg:col-span-5 flex flex-col gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3.5">
              <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-indigo-500" />
                <span>Repository Authentication</span>
              </h4>

              {/* Repo field */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                  GitHub Repository Owner/Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-mono text-[10px] pointer-events-none">
                    github.com/
                  </span>
                  <input
                    type="text"
                    value={githubRepo}
                    onChange={(e) => setGithubRepo(e.target.value)}
                    placeholder="username/repository-name"
                    className="w-full bg-white border border-slate-200 rounded-lg text-xs p-2.5 pl-22 font-mono focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    required
                  />
                </div>
                <span className="text-[9px] text-slate-400 block mt-1">
                  Do not add ".git" extension or trailing slash.
                </span>
              </div>

              {/* Branch field */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Target Branch
                </label>
                <input
                  type="text"
                  value={githubBranch}
                  onChange={(e) => setGithubBranch(e.target.value)}
                  placeholder="main"
                  className="w-full bg-white border border-slate-200 rounded-lg text-xs p-2.5 font-mono focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              {/* Token field */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 flex justify-between">
                  <span>Personal Access Token (PAT)</span>
                  <span className="text-[9px] text-indigo-500 normal-case font-medium">Requires 'repo' & 'workflow' scope</span>
                </label>
                <div className="relative">
                  <input
                    type={showToken ? "text" : "password"}
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder={hasToken ? "••••••••••••••••••••••••••••••••••••••••" : "ghp_yourPersonalAccessTokenHere"}
                    className="w-full bg-white border border-slate-200 rounded-lg text-xs p-2.5 pr-10 font-mono focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[9px] text-slate-400 block mt-1">
                  {hasToken 
                    ? "🔒 Token securely stored on daemon backend. Leave empty to keep unchanged." 
                    : "🔒 Token is never exposed on frontend. Kept purely server-side."}
                </span>
              </div>

              {/* Custom APK URL Field */}
              <div className="border-t border-slate-100 pt-3 mt-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 flex justify-between">
                  <span>Custom APK Download URL (Optional)</span>
                  <span className="text-[9px] text-indigo-500 normal-case font-medium">Overrides default dynamic fallback</span>
                </label>
                <input
                  type="url"
                  value={customApkUrl}
                  onChange={(e) => setCustomApkUrl(e.target.value)}
                  placeholder="https://example.com/downloads/my-custom-sms-os-gateway.apk"
                  className="w-full bg-white border border-slate-200 rounded-lg text-xs p-2.5 font-mono focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
                <span className="text-[9px] text-slate-400 block mt-1">
                  If you compile or host your APK elsewhere (e.g. Google Drive, Dropbox, GitHub Releases, or custom storage), enter the absolute URL here. Any user clicking the "Download APK" link will be instantly redirected to this URL.
                </span>
              </div>

              {gitFeedback.message && (
                <div className={`p-2.5 rounded-lg text-[10px] font-medium ${
                  gitFeedback.type === 'success' 
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                    : "bg-rose-50 text-rose-600 border border-rose-100"
                }`}>
                  {gitFeedback.message}
                </div>
              )}

              <button
                type="submit"
                disabled={isSavingGit}
                className="w-full bg-slate-800 hover:bg-slate-700 active:scale-98 text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5 text-indigo-400" />
                <span>{isSavingGit ? "Saving Config..." : "Save Upstream Auth"}</span>
              </button>
            </div>

            {/* Deploy Trigger Panel */}
            <div className="bg-gradient-to-br from-indigo-950 to-slate-950 border border-indigo-900/50 p-4 rounded-xl text-slate-100 shadow-lg flex flex-col gap-3">
              <div className="flex items-start gap-2.5">
                <CloudLightning className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs font-bold text-white">Trigger System Sync & Push</h5>
                  <p className="text-[10px] text-slate-300 leading-relaxed mt-0.5">
                    Clicking below packages the current runtime React + Express code layout and forces a push to your upstream repo branch, sparking immediate CI/CD builds.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleTriggerGitPush}
                disabled={isPushingCode}
                className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white text-xs font-bold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Github className="w-4 h-4 animate-pulse" />
                <span>{isPushingCode ? "Pushing & Syncing Code..." : "Publish Full Code to GitHub"}</span>
              </button>
            </div>
          </form>

          {/* Right Column - CI/CD Workflow & Log Terminal */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* CI/CD Explanation Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5 mb-2">
                <Activity className="w-3.5 h-3.5 text-indigo-500" />
                <span>How the CI/CD Pipeline Operates</span>
              </h4>
              <ul className="text-[11px] text-slate-600 space-y-2 leading-relaxed">
                <li className="flex gap-2">
                  <span className="text-indigo-600 font-bold shrink-0">1.</span>
                  <span><strong>Workspace Push:</strong> Code packages include custom compiled Gradle configs and standard Capacitor scripts.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-600 font-bold shrink-0">2.</span>
                  <span><strong>Automatic Build:</strong> GitHub Actions triggers <code>build-android</code> executing React compilation and Gradle wrappers.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-600 font-bold shrink-0">3.</span>
                  <span><strong>APK Sync Commit:</strong> On successful build, GitHub Actions automatically copies the compiled APK directly into the project folder (<code>/sms-os-gateway.apk</code>) and commits it back!</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-600 font-bold shrink-0">4.</span>
                  <span><strong>Live Fetch Integration:</strong> Our download servers dynamically retrieve this freshly built APK from your GitHub repository so that anyone downloading from your landing page receives the true compiled binary!</span>
                </li>
              </ul>
            </div>

            {/* Live Log Terminal */}
            <div className="flex-1 flex flex-col bg-slate-950 border border-slate-900 rounded-xl overflow-hidden min-h-[250px]">
              <div className="bg-slate-900 border-b border-slate-850 px-3.5 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] font-mono font-bold text-slate-300">Live Execution Log (Git Output)</span>
                </div>
                
                <button
                  type="button"
                  onClick={() => setGithubLogs([])}
                  className="text-[9px] text-slate-400 hover:text-slate-200 cursor-pointer font-mono"
                >
                  Clear Terminal
                </button>
              </div>

              <div className="flex-1 p-3.5 font-mono text-[11px] text-emerald-400/90 overflow-y-auto max-h-[240px] space-y-1 select-text scrollbar-thin">
                {githubLogs.length === 0 ? (
                  <div className="text-slate-500 italic flex items-center justify-center h-full pt-12">
                    Terminal is in standby. Click "Publish Full Code to GitHub" to monitor live CI synchronization.
                  </div>
                ) : (
                  githubLogs.map((log, index) => (
                    <div key={index} className="leading-relaxed">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
