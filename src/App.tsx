/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { Gateway, Message, ApiKey, Webhook, WebhookLog, DashboardStats } from "./types";
import PhoneSimulator from "./components/PhoneSimulator";
import DeveloperApiDocs from "./components/DeveloperApiDocs";
import WebhookManager from "./components/WebhookManager";
import SmsDispatcher from "./components/SmsDispatcher";
import SmsLogs from "./components/SmsLogs";
import GatewayManager from "./components/GatewayManager";
import SaaSAdminPanel from "./components/SaaSAdminPanel";

import { 
  Smartphone, 
  Send, 
  History, 
  Webhook as WebhookIcon, 
  Terminal, 
  RefreshCw, 
  Activity, 
  Database,
  ArrowUpRight,
  ArrowDownLeft,
  Layers,
  Percent,
  CheckCircle,
  HelpCircle,
  Cpu,
  Eye,
  EyeOff,
  Github,
  Users
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<'gateways' | 'dispatcher' | 'logs' | 'webhooks' | 'developer' | 'admin'>('gateways');
  const [showSimulator, setShowSimulator] = useState<boolean>(true);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Core state from SaaS APIs
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    activeGateways: 0,
    totalSent: 0,
    totalReceived: 0,
    queuedCount: 0,
    successRate: 100,
    saasTotalUsers: 0,
    saasActiveProUsers: 0,
    saasMRR: 0
  });

  // Fetch all state elements concurrently from Express endpoints
  const safeFetchJson = async (url: string, fallback: any) => {
    try {
      const res = await fetch(url);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn(`[Silent Recovery] Failed to fetch state from ${url}:`, e);
    }
    return fallback;
  };

  const refreshAllData = async () => {
    setIsRefreshing(true);
    try {
      const [statsData, gatewaysData, messagesData, keysData, webhooksData, whLogsData] = await Promise.all([
        safeFetchJson("/api/stats", stats),
        safeFetchJson("/api/gateways", []),
        safeFetchJson("/api/messages", []),
        safeFetchJson("/api/keys", []),
        safeFetchJson("/api/webhooks", []),
        safeFetchJson("/api/webhook-logs", [])
      ]);

      if (statsData) setStats(statsData);
      if (gatewaysData) setGateways(gatewaysData);
      if (messagesData) setMessages(messagesData);
      if (keysData) setApiKeys(keysData);
      if (webhooksData) setWebhooks(webhooksData);
      if (whLogsData) setWebhookLogs(whLogsData);
    } catch (err) {
      console.error("Error polling state from API endpoints:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Poll for status updates and messages every 3 seconds to keep SaaS dashboard in perfect sync with simulated phone events
  useEffect(() => {
    refreshAllData();
    const interval = setInterval(refreshAllData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleResetData = async () => {
    if (!confirm("Are you sure you want to reset the SaaS database to factory defaults? All manual gateways and SMS logs will be cleared.")) return;
    
    setIsResetting(true);
    try {
      const response = await fetch("/api/reset-data", { method: "POST" });
      if (response.ok) {
        await refreshAllData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* SaaS Primary Top Navigation bar */}
      <header className="bg-slate-950/95 backdrop-blur-md border-b border-slate-800/60 p-3 sm:p-4 shrink-0 text-white shadow-lg sticky top-0 z-40 transition-all">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
          
          {/* Brand Logo & Name */}
          <div className="flex items-center justify-between md:justify-start gap-3">
            <div className="flex items-center gap-2.5">
              <div className="bg-gradient-to-tr from-indigo-500 via-indigo-600 to-violet-600 p-2 rounded-xl text-white shadow-md shadow-indigo-500/10 border border-indigo-400/20 shrink-0">
                <Cpu className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-slate-50 via-slate-100 to-indigo-200">
                    SMS-OS
                  </h1>
                  <span className="bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-bold font-mono text-[9px] uppercase px-1.5 py-0.5 rounded-md">
                    v2.4.1
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
                  Self-Hosted Cellular SMS Gateway Platform
                </p>
              </div>
            </div>

            {/* Micro Live Signal Status Dot on mobile/all */}
            <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-900/60 border border-slate-850 rounded-lg text-[9px] font-mono text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>LIVE</span>
            </div>
          </div>

          {/* Action Toolbar buttons */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Quick Simulator Visibility Toggle */}
            <button
              onClick={() => setShowSimulator(!showSimulator)}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 py-2 px-2.5 sm:px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                showSimulator
                  ? "bg-indigo-600/10 hover:bg-indigo-600/20 border-indigo-500/30 text-indigo-300"
                  : "bg-slate-800 hover:bg-slate-750 border-slate-700/50 text-slate-300 hover:text-white"
              }`}
              title={showSimulator ? "Hide Phone Simulator" : "Show Phone Simulator"}
            >
              {showSimulator ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 shrink-0" />
                  <span className="inline sm:inline">Hide Simulator</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 shrink-0" />
                  <span className="inline sm:inline">Show Simulator</span>
                </>
              )}
            </button>

            {/* Manual Sync reload */}
            <button
              onClick={refreshAllData}
              disabled={isRefreshing}
              className="p-2 bg-slate-800 hover:bg-slate-750 active:scale-95 text-slate-300 hover:text-white disabled:text-slate-600 rounded-xl border border-slate-700/50 transition-all cursor-pointer shrink-0"
              title="Force Refresh SaaS Sync"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>

            {/* Factory DB reset */}
            <button
              onClick={handleResetData}
              disabled={isResetting}
              className="bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 border border-rose-500/20 text-rose-300 font-bold text-xs py-2 px-2.5 sm:px-3.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
              title="Factory Reset Sandbox"
            >
              <Database className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="hidden sm:inline">
                {isResetting ? "Resetting..." : "Reset Sandbox"}
              </span>
              <span className="sm:hidden">
                {isResetting ? "..." : "Reset"}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6">
        
        {/* Enterprise Stats Overview Board */}
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Active Gateways */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Gateways</span>
              <span className="block text-2xl font-extrabold text-slate-900 mt-1 font-mono">
                {stats.activeGateways}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                of {gateways.length} registered
              </span>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100/40">
              <Smartphone className="w-5 h-5" />
            </div>
          </div>

          {/* SMS Queued */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">SMS Queued</span>
              <span className="block text-2xl font-extrabold text-slate-900 mt-1 font-mono">
                {stats.queuedCount}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                pending device polling
              </span>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100/40">
              <Layers className="w-5 h-5 animate-pulse" />
            </div>
          </div>

          {/* Outbox SMS Sent */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">SMS Sent Logs</span>
              <span className="block text-2xl font-extrabold text-slate-900 mt-1 font-mono">
                {stats.totalSent}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                outbound cellular push
              </span>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100/40">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>

          {/* Inbox SMS Received */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Inbox SMS Logs</span>
              <span className="block text-2xl font-extrabold text-slate-900 mt-1 font-mono">
                {stats.totalReceived}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                incoming forwarding active
              </span>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100/40">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>

          {/* Success Rate */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between col-span-2 lg:col-span-1">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">SMC Success Rate</span>
              <span className="block text-2xl font-extrabold text-slate-900 mt-1 font-mono">
                {stats.successRate}%
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                cellular delivery confirm
              </span>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100/40">
              <Percent className="w-5 h-5" />
            </div>
          </div>
        </section>

        {/* Tab Routing and Workspace Area split with Collapsible Android Simulator */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left panel: SaaS Navigation Tabs & Main Workspace Component */}
          <div className={`flex flex-col gap-5 ${showSimulator ? "lg:col-span-8 col-span-12" : "col-span-12"}`}>
            
            {/* Primary Navigation tab rail */}
            <div className="flex items-center overflow-x-auto bg-white border border-slate-200 p-1 rounded-2xl shadow-xs gap-1 scrollbar-none">
              <button
                onClick={() => setActiveTab('gateways')}
                className={`flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold tracking-wide transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'gateways'
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>Gateways & Nodes</span>
              </button>

              <button
                onClick={() => setActiveTab('dispatcher')}
                className={`flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold tracking-wide transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'dispatcher'
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Send className="w-4 h-4" />
                <span>Dispatch Console</span>
              </button>

              <button
                onClick={() => setActiveTab('logs')}
                className={`flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold tracking-wide transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'logs'
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <History className="w-4 h-4" />
                <span>SMS History Database</span>
              </button>

              <button
                onClick={() => setActiveTab('webhooks')}
                className={`flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold tracking-wide transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'webhooks'
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <WebhookIcon className="w-4 h-4" />
                <span>Webhooks Forwarding</span>
              </button>

              <button
                onClick={() => setActiveTab('developer')}
                className={`flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold tracking-wide transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'developer'
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Terminal className="w-4 h-4" />
                <span>Developer API</span>
              </button>

              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold tracking-wide transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'admin'
                    ? "bg-indigo-600 text-white shadow-sm font-bold"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Users className="w-4 h-4" />
                <span>SaaS Customers</span>
              </button>
            </div>

            {/* Dynamic Content Switching Panels */}
            <div>
              {activeTab === 'gateways' && (
                <GatewayManager 
                  gateways={gateways} 
                  onReload={refreshAllData} 
                />
              )}
              
              {activeTab === 'dispatcher' && (
                <SmsDispatcher 
                  gateways={gateways} 
                  onActionComplete={refreshAllData} 
                />
              )}

              {activeTab === 'logs' && (
                <SmsLogs 
                  messages={messages} 
                  gateways={gateways} 
                  onReload={refreshAllData} 
                />
              )}

              {activeTab === 'webhooks' && (
                <WebhookManager 
                  webhooks={webhooks} 
                  webhookLogs={webhookLogs} 
                  onReload={refreshAllData} 
                />
              )}

              {activeTab === 'developer' && (
                <DeveloperApiDocs 
                  apiKeys={apiKeys} 
                  webhooks={webhooks} 
                />
              )}

              {activeTab === 'admin' && (
                <SaaSAdminPanel 
                  gateways={gateways} 
                  onReload={refreshAllData} 
                />
              )}
            </div>
          </div>

          {/* Right panel: Collapsible Virtual Android APK Device Console */}
          {showSimulator && (
            <div className="lg:col-span-4 col-span-12 h-full lg:sticky lg:top-24">
              <PhoneSimulator 
                gateways={gateways} 
                onActionTriggered={refreshAllData} 
              />
            </div>
          )}

        </section>

      </main>

      {/* Footer Branding block */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-500 py-6 mt-12 text-center text-xs">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-400 font-medium">
            <span className="text-indigo-400 font-bold tracking-wider mr-1">SMS-OS</span> Cellular Gateway. Built securely using Node.js, Express, and React.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <span className="bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800/60 font-mono text-[10px] text-slate-400">Secure HMAC-SHA256 Signatures</span>
            <span className="hidden sm:inline text-slate-800">|</span>
            <span className="bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800/60 font-mono text-[10px] text-slate-400">Dual SIM LTE Transceivers Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
