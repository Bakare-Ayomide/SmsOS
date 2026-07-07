/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, FormEvent } from "react";
import { Capacitor } from "@capacitor/core";
import { 
  Smartphone, 
  Battery, 
  Wifi, 
  Settings, 
  Power, 
  Play, 
  Square, 
  Terminal, 
  Shield, 
  Check, 
  X, 
  RefreshCw, 
  Cpu, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Copy, 
  Link,
  ChevronRight,
  UserCheck
} from "lucide-react";

interface ConsoleLog {
  timestamp: string;
  type: "info" | "success" | "error" | "warn" | "inbound" | "outbound";
  message: string;
}

export default function MobileGatewayAgent() {
  // Read initial configuration from local storage or defaults
  const [serverUrl, setServerUrl] = useState(() => {
    const metaEnv = (import.meta as any).env || {};
    return localStorage.getItem("sms_gw_server_url") || 
           metaEnv.VITE_API_SERVER_URL || 
           window.location.origin;
  });
  const [gatewayId, setGatewayId] = useState(() => localStorage.getItem("sms_gw_id") || "");
  const [gatewayToken, setGatewayToken] = useState(() => localStorage.getItem("sms_gw_token") || "");
  const [simSlot, setSimSlot] = useState<number>(() => {
    const saved = localStorage.getItem("sms_gw_sim_slot");
    return saved ? parseInt(saved) : 1;
  });
  const [pollInterval, setPollInterval] = useState<number>(() => {
    const saved = localStorage.getItem("sms_gw_poll_interval");
    return saved ? parseInt(saved) : 5000; // ms
  });

  // State
  const [isCoupled, setIsCoupled] = useState(() => {
    return !!(localStorage.getItem("sms_gw_id") && localStorage.getItem("sms_gw_token"));
  });
  const [isServiceActive, setIsServiceActive] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [logs, setLogs] = useState<ConsoleLog[]>([]);
  const [copiedId, setCopiedId] = useState<boolean>(false);
  
  // Dynamic stats & telemetry
  const [batteryLevel, setBatteryLevel] = useState<number>(92);
  const [signalStrength, setSignalStrength] = useState<string>("excellent");
  const [successCount, setSuccessCount] = useState<number>(() => {
    return parseInt(localStorage.getItem("sms_gw_stat_success") || "0");
  });
  const [incomingCount, setIncomingCount] = useState<number>(() => {
    return parseInt(localStorage.getItem("sms_gw_stat_incoming") || "0");
  });
  const [pingCount, setPingCount] = useState<number>(0);
  const [isPendingPing, setIsPendingPing] = useState<boolean>(false);
  const [lastPingTime, setLastPingTime] = useState<string | null>(null);

  // Incoming SMS simulation state
  const [simulatedSender, setSimulatedSender] = useState<string>("");
  const [simulatedBody, setSimulatedBody] = useState<string>("");
  const [isUploadingInbound, setIsUploadingInbound] = useState<boolean>(false);

  // UI state
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Log helper
  const addLog = (message: string, type: ConsoleLog["type"] = "info") => {
    const now = new Date();
    const timeStr = now.toTimeString().split(" ")[0] + `.${String(now.getMilliseconds()).padStart(3, "0")}`;
    setLogs(prev => {
      const updated = [...prev, { timestamp: timeStr, type, message }];
      // Limit to 100 logs
      return updated.slice(-100);
    });
  };

  // Scroll to bottom of terminal
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Handle saving of credentials
  const handleSaveConfig = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!serverUrl.trim() || !gatewayId.trim() || !gatewayToken.trim()) {
      setSaveFeedback("Error: All coupling parameters are required.");
      return;
    }

    // Clean server URL (no trailing slash)
    let cleanedUrl = serverUrl.trim();
    if (cleanedUrl.endsWith("/")) {
      cleanedUrl = cleanedUrl.slice(0, -1);
    }

    localStorage.setItem("sms_gw_server_url", cleanedUrl);
    localStorage.setItem("sms_gw_id", gatewayId.trim());
    localStorage.setItem("sms_gw_token", gatewayToken.trim());
    localStorage.setItem("sms_gw_sim_slot", String(simSlot));
    localStorage.setItem("sms_gw_poll_interval", String(pollInterval));

    setServerUrl(cleanedUrl);
    setIsCoupled(true);
    setShowSettings(false);
    setSaveFeedback(null);
    addLog(`Coupling configuration saved successfully.`, "success");
    addLog(`Host SaaS Node: ${cleanedUrl}`, "info");
    addLog(`Device Hooked ID: ${gatewayId.trim()}`, "info");
  };

  const handleDisconnect = () => {
    if (!confirm("Are you sure you want to disconnect this Gateway Agent? This device will stop serving cellular requests.")) return;
    setIsServiceActive(false);
    setIsCoupled(false);
    localStorage.removeItem("sms_gw_id");
    localStorage.removeItem("sms_gw_token");
    setLogs([]);
    addLog("Gateway coupling dismantled. Reverted to standby state.");
  };

  // Keep stats in localStorage
  useEffect(() => {
    localStorage.setItem("sms_gw_stat_success", String(successCount));
  }, [successCount]);

  useEffect(() => {
    localStorage.setItem("sms_gw_stat_incoming", String(incomingCount));
  }, [incomingCount]);

  // Periodic simulated state variation (Battery & Signal)
  useEffect(() => {
    const telemetryInterval = setInterval(() => {
      // Randomly fluctuate battery slightly (mostly downward)
      setBatteryLevel(prev => {
        if (prev <= 15) return 98; // Charge back up for demo
        return Math.max(1, prev - (Math.random() > 0.85 ? 1 : 0));
      });

      // Randomly change signal bars
      const signals = ["excellent", "good", "fair", "poor"];
      if (Math.random() > 0.9) {
        const nextSignal = signals[Math.floor(Math.random() * signals.length)];
        setSignalStrength(nextSignal);
        if (isServiceActive) {
          addLog(`Cellular signal state transition -> ${nextSignal.toUpperCase()}`, "warn");
        }
      }
    }, 15000);

    return () => clearInterval(telemetryInterval);
  }, [isServiceActive]);

  // Core Service Loop (Active Daemon)
  useEffect(() => {
    if (!isServiceActive || !isCoupled) return;

    addLog(`🚀 Mobile Gateway Agent Daemon Active - Polling every ${pollInterval / 1000}s`, "success");
    addLog(`System Platform: Android via Capacitor Hybrid Native Bridge`, "info");

    const triggerSync = async () => {
      setIsPendingPing(true);
      try {
        const pingResponse = await fetch(`${serverUrl}/api/gateway/ping`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Gateway-Id": gatewayId.trim(),
            "X-Gateway-Token": gatewayToken.trim()
          },
          body: JSON.stringify({
            battery: batteryLevel,
            signal: signalStrength,
            sim1Carrier: "Android Core Link",
            sim2Carrier: "None",
            sim1Number: "Physical Transceiver",
            sim2Number: ""
          })
        });

        if (pingResponse.status === 402) {
          addLog(`❌ [Billing Guard] PING REJECTED BY HOST: Subscription or active credits suspended.`, "error");
          addLog(`⚠️ SaaS hardware synchronization halted. Suspending daemon.`, "warn");
          setIsServiceActive(false);
          return;
        }

        if (!pingResponse.ok) {
          throw new Error(`HTTP Error ${pingResponse.status}`);
        }

        const data = await pingResponse.json();
        setPingCount(p => p + 1);
        setLastPingTime(new Date().toLocaleTimeString());
        addLog(`Heartbeat synced with SaaS cloud server (200 OK)`, "info");

        // Process any outbox messages
        const pendingMessages = data.pending || [];
        if (pendingMessages.length > 0) {
          addLog(`📥 Fetched ${pendingMessages.length} pending SMS from outbox queue!`, "success");

          for (const sms of pendingMessages) {
            addLog(`📡 Sending SMS -> Recipient: ${sms.to} (SIM Slot ${sms.simSlot || simSlot})`, "info");
            addLog(`💬 Message Body: "${sms.message}"`, "info");

            let dispatchSuccess = false;
            let dispatchError = "";

            // 1. Try to call the actual Capacitor native SMS plugin if available
            const nativeSms = (window as any).sms;
            if (nativeSms && typeof nativeSms.send === "function") {
              try {
                await new Promise<void>((resolve, reject) => {
                  nativeSms.send(
                    sms.to, 
                    sms.message, 
                    { android: { intent: "INTENT" } }, 
                    () => resolve(), 
                    (err: any) => reject(err)
                  );
                });
                dispatchSuccess = true;
                addLog(`✓ Native Android LTE Hardware dispatched SMS successfully!`, "success");
              } catch (err: any) {
                dispatchSuccess = false;
                dispatchError = err?.message || String(err) || "Hardware error";
                addLog(`❌ Native LTE Broadcast failed: ${dispatchError}`, "error");
              }
            } else {
              // 2. Browser / Simulation fallback
              await new Promise(resolve => setTimeout(resolve, 1200));
              dispatchSuccess = true;
              addLog(`✓ Simulated dispatch: broadcast successful.`, "success");
            }

            // Post result back to SaaS Server
            const updateResponse = await fetch(`${serverUrl}/api/gateway/messages/update`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Gateway-Id": gatewayId.trim(),
                "X-Gateway-Token": gatewayToken.trim()
              },
              body: JSON.stringify({
                messageId: sms.id,
                status: dispatchSuccess ? "delivered" : "failed",
                error: dispatchSuccess ? undefined : dispatchError
              })
            });

            if (updateResponse.ok) {
              if (dispatchSuccess) {
                setSuccessCount(s => s + 1);
                addLog(`Outbox status synced with SaaS: DELIVERED`, "success");
              } else {
                addLog(`Outbox failure state reported back to SaaS.`, "warn");
              }
            } else {
              addLog(`⚠️ Failed to sync message update back to SaaS server.`, "error");
            }
          }
        }
      } catch (error: any) {
        addLog(`⚡ Connection lost to ${serverUrl}: ${error.message || String(error)}`, "error");
      } finally {
        setIsPendingPing(false);
      }
    };

    // First trigger immediately
    triggerSync();

    // Set polling interval
    const intervalId = setInterval(triggerSync, pollInterval);

    return () => {
      clearInterval(intervalId);
      addLog("🛑 Daemon service entered standby state.", "warn");
    };
  }, [isServiceActive, isCoupled, serverUrl, gatewayId, gatewayToken, pollInterval, batteryLevel, signalStrength, simSlot]);

  // Trigger simulated incoming message
  const handleSimulateIncomingSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCoupled) return;
    if (!simulatedSender.trim() || !simulatedBody.trim()) {
      alert("Please provide simulated sender phone number and message body.");
      return;
    }

    setIsUploadingInbound(true);
    addLog(`🔔 Physical SIM card received cellular SMS on SIM Slot ${simSlot}`, "inbound");
    addLog(`📱 Sender: ${simulatedSender.trim()}`, "inbound");
    addLog(`💬 Content: "${simulatedBody.trim()}"`, "inbound");

    try {
      await new Promise(resolve => setTimeout(resolve, 600));

      const uploadResponse = await fetch(`${serverUrl}/api/gateway/incoming`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Gateway-Id": gatewayId.trim(),
          "X-Gateway-Token": gatewayToken.trim()
        },
        body: JSON.stringify({
          sender: simulatedSender.trim(),
          message: simulatedBody.trim(),
          simSlot: simSlot
        })
      });

      if (uploadResponse.ok) {
        setIncomingCount(c => c + 1);
        addLog(`✓ Incoming SMS forwarded & synced with SaaS webhook processors!`, "success");
        setSimulatedSender("");
        setSimulatedBody("");
      } else {
        throw new Error(`Server returned HTTP ${uploadResponse.status}`);
      }
    } catch (err: any) {
      addLog(`❌ Failed to forward incoming SMS to SaaS Server: ${err.message || String(err)}`, "error");
    } finally {
      setIsUploadingInbound(false);
    }
  };

  const handleCopyId = () => {
    if (!gatewayId) return;
    navigator.clipboard.writeText(gatewayId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const autofillDemoNode = () => {
    setServerUrl(window.location.origin);
    setGatewayId("gw_global_1");
    setGatewayToken("gt_token_global_hq_secret");
    setSimSlot(1);
    setPollInterval(3000);
    addLog("Autofilled configurations with Demo Sandbox Credentials.", "info");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased">
      
      {/* Header bar */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-30 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="bg-indigo-600 p-2 rounded-xl text-white border border-indigo-400/20 shadow-md">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-wider text-white">
              SMS-OS GATEWAY
            </h1>
            <p className="text-[10px] text-emerald-400 font-bold font-mono tracking-widest flex items-center gap-1 mt-0.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isServiceActive ? 'bg-emerald-400' : 'bg-amber-400'} opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isServiceActive ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              </span>
              <span>{isServiceActive ? "DAEMON LIVE" : "STANDBY"}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick toggle settings */}
          {isCoupled && (
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                showSettings 
                  ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-500/10" 
                  : "bg-slate-800 border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-750"
              }`}
              title="Gateway Connection Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          {/* Fallback to return to Web SaaS if loaded in browser */}
          {!Capacitor.isNativePlatform() && (
            <button
              onClick={() => {
                localStorage.removeItem("mode_apk");
                window.location.href = "/";
              }}
              className="bg-slate-800 hover:bg-slate-750 border border-slate-700/60 text-slate-300 font-bold text-[10px] px-2.5 py-1.5 rounded-lg transition-all"
              title="Return to primary SaaS Administrator console"
            >
              Return to SaaS Web
            </button>
          )}
        </div>
      </header>

      {/* Main Content scroll window */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 flex flex-col gap-4 overflow-y-auto">
        
        {!isCoupled || showSettings ? (
          /* Coupling Form Configuration Setup */
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20 shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Coupling Authentication</h2>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Link this Android phone to your SMS-OS SaaS Server to process incoming/outgoing cellular networks.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              {/* Server URL */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                  SMS-OS SaaS Server Endpoint URL
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Link className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="url"
                    required
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    placeholder="https://sms-os.io"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl text-xs pl-9 pr-3 py-2.5 font-mono text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Gateway Node ID */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                  Gateway Node Identifier (UUID)
                </label>
                <input
                  type="text"
                  required
                  value={gatewayId}
                  onChange={(e) => setGatewayId(e.target.value)}
                  placeholder="gw_xxxx_xxxx_xxxx"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl text-xs px-3 py-2.5 font-mono text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Gateway Token */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                  Gateway Token / Secret Key
                </label>
                <input
                  type="password"
                  required
                  value={gatewayToken}
                  onChange={(e) => setGatewayToken(e.target.value)}
                  placeholder="gt_token_xxxxxxxxxxxx"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl text-xs px-3 py-2.5 font-mono text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Advanced params row */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* Active SIM slot */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                    Hardware SIM Slot
                  </label>
                  <select
                    value={simSlot}
                    onChange={(e) => setSimSlot(parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl text-xs px-3 py-2.5 font-semibold text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value={1}>SIM 1 Primary</option>
                    <option value={2}>SIM 2 Secondary</option>
                  </select>
                </div>

                {/* Polling interval */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                    Polling Interval
                  </label>
                  <select
                    value={pollInterval}
                    onChange={(e) => setPollInterval(parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl text-xs px-3 py-2.5 font-semibold text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value={3000}>3 seconds</option>
                    <option value={5000}>5 seconds</option>
                    <option value={10000}>10 seconds</option>
                    <option value={30000}>30 seconds</option>
                  </select>
                </div>
              </div>

              {saveFeedback && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-[10px] font-medium">
                  {saveFeedback}
                </div>
              )}

              {/* Action triggers */}
              <div className="flex gap-3 pt-2">
                {isCoupled && (
                  <button
                    type="button"
                    onClick={() => setShowSettings(false)}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs rounded-xl border border-slate-700/60 transition-all cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/10 border border-indigo-500/20 transition-all cursor-pointer text-center"
                >
                  {isCoupled ? "Update Link" : "Couple Gateway"}
                </button>
              </div>

              {/* Demo Sandbox Quick Autofill */}
              {!isCoupled && (
                <div className="border-t border-slate-800/80 pt-3 mt-2 text-center">
                  <button
                    type="button"
                    onClick={autofillDemoNode}
                    className="text-[10px] text-slate-500 hover:text-indigo-400 underline font-medium cursor-pointer"
                  >
                    Quick Autofill Sandbox Credentials (Demo Test)
                  </button>
                </div>
              )}
            </form>
          </div>
        ) : (
          /* Live Gateway Daemon Core Interface */
          <div className="space-y-4">
            
            {/* Quick Status bar & Controls */}
            <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 shadow-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Status indicator button */}
                <button
                  onClick={() => setIsServiceActive(!isServiceActive)}
                  className={`p-3 rounded-2xl text-white transition-all active:scale-95 cursor-pointer flex items-center justify-center border ${
                    isServiceActive 
                      ? "bg-emerald-600 border-emerald-500 hover:bg-emerald-500 shadow-md shadow-emerald-500/10" 
                      : "bg-rose-600 border-rose-500 hover:bg-rose-500 shadow-md shadow-rose-500/10"
                  }`}
                  title={isServiceActive ? "Stop Daemon Service" : "Start Daemon Service"}
                >
                  {isServiceActive ? <Power className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>
                <div>
                  <h2 className="text-xs font-bold text-slate-200">
                    {isServiceActive ? "Daemon Thread Active" : "Daemon Suspended"}
                  </h2>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {isServiceActive ? `Polling every ${pollInterval/1000}s...` : "Standby. Core is idle."}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-500 font-mono block">Node Ping count</span>
                <span className="text-sm font-bold text-slate-300 font-mono mt-0.5 block">{pingCount}</span>
              </div>
            </div>

            {/* Hardware Telemetry stats banner */}
            <div className="grid grid-cols-4 bg-slate-900 border border-slate-800/80 rounded-2xl p-3 shadow-md text-center gap-2">
              <div className="border-r border-slate-800">
                <div className="flex justify-center mb-1 text-slate-400">
                  <Battery className="w-4 h-4" />
                </div>
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Battery</span>
                <span className="text-xs font-bold font-mono text-slate-300 block mt-0.5">{batteryLevel}%</span>
              </div>

              <div className="border-r border-slate-800">
                <div className="flex justify-center mb-1 text-indigo-400">
                  <Wifi className="w-4 h-4" />
                </div>
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Signal</span>
                <span className="text-xs font-bold font-mono text-slate-300 block mt-0.5 uppercase">{signalStrength}</span>
              </div>

              <div className="border-r border-slate-800">
                <div className="flex justify-center mb-1 text-emerald-400">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Outbox</span>
                <span className="text-xs font-bold font-mono text-emerald-400 block mt-0.5">{successCount}</span>
              </div>

              <div>
                <div className="flex justify-center mb-1 text-blue-400">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Inbound</span>
                <span className="text-xs font-bold font-mono text-blue-400 block mt-0.5">{incomingCount}</span>
              </div>
            </div>

            {/* Scrolling JetBrains-style console terminal */}
            <div className="bg-slate-950 border border-slate-850 rounded-2xl overflow-hidden shadow-xl flex flex-col h-[280px]">
              <div className="bg-slate-900 px-3 py-2 border-b border-slate-850 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider font-mono">Console Logs Terminal</span>
                </div>
                {isPendingPing && (
                  <RefreshCw className="w-3 h-3 text-indigo-400 animate-spin" />
                )}
              </div>

              <div className="flex-1 p-3 overflow-y-auto font-mono text-[10px] space-y-1.5 select-text">
                {logs.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-600 text-[11px] italic text-center">
                    No active operations registered yet.<br/>
                    Toggle the green power button above to start service.
                  </div>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="leading-relaxed">
                      <span className="text-slate-500 mr-1.5 font-medium">{log.timestamp}</span>
                      <span className={`font-semibold mr-1 px-1.5 py-0.2 rounded-md uppercase text-[8px] ${
                        log.type === "success" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        log.type === "error" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                        log.type === "warn" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                        log.type === "inbound" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                        log.type === "outbound" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" :
                        "bg-slate-800 text-slate-400"
                      }`}>
                        {log.type}
                      </span>
                      <span className={`${
                        log.type === "success" ? "text-slate-100" :
                        log.type === "error" ? "text-rose-300 font-bold" :
                        log.type === "warn" ? "text-amber-200" :
                        log.type === "inbound" ? "text-blue-100" :
                        log.type === "outbound" ? "text-indigo-100" :
                        "text-slate-300"
                      }`}>
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
                <div ref={consoleEndRef} />
              </div>
            </div>

            {/* Inbound Simulator form - Extremely professional for developers testing and users configuring */}
            <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 shadow-md space-y-3">
              <div className="flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-indigo-400 animate-pulse" />
                <h3 className="text-xs font-bold text-white">Physical Cellular SIM Simulator</h3>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                Simulate receiving an actual SMS on this physical phone SIM. Since we are linked to the cloud, it will forward it directly to the SaaS Web webhook listeners!
              </p>

              <form onSubmit={handleSimulateIncomingSms} className="space-y-2.5">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <input
                      type="text"
                      required
                      value={simulatedSender}
                      onChange={(e) => setSimulatedSender(e.target.value)}
                      placeholder="From Phone"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg text-[11px] p-2 font-mono text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      required
                      value={simulatedBody}
                      onChange={(e) => setSimulatedBody(e.target.value)}
                      placeholder="Message content body"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg text-[11px] p-2 font-mono text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isUploadingInbound || !isCoupled}
                  className="w-full bg-slate-800 hover:bg-indigo-600 disabled:bg-slate-850 disabled:text-slate-600 text-white font-bold text-[10px] py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 border border-slate-700/60 shadow-sm cursor-pointer"
                >
                  {isUploadingInbound ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Forwarding over LTE and APIs...</span>
                    </>
                  ) : (
                    <>
                      <ArrowDownLeft className="w-3.5 h-3.5 text-blue-400" />
                      <span>Simulate Receive SMS (Triggers SaaS Webhooks)</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Linked Credentials Info footer */}
            <div className="bg-slate-900/50 border border-slate-850 rounded-2xl p-4 space-y-2 text-[11px]">
              <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider font-extrabold pb-1.5 border-b border-slate-800/40">
                <span>Active Credentials</span>
                <span className="text-indigo-400 font-bold normal-case flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" /> Coupled Node
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-400">Host URL:</span>
                <span className="font-mono text-slate-200 text-[10px] truncate max-w-[200px]" title={serverUrl}>
                  {serverUrl}
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-400">Gateway ID:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-slate-200 text-[10px]">
                    {gatewayId.slice(0, 8)}...{gatewayId.slice(-4)}
                  </span>
                  <button 
                    onClick={handleCopyId}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-all cursor-pointer"
                    title="Copy Gateway UUID"
                  >
                    {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-400">Active SIM Slot:</span>
                <span className="font-mono text-indigo-400 font-bold">
                  SIM {simSlot} Primary
                </span>
              </div>
              
              <div className="pt-3 border-t border-slate-850 flex gap-2">
                <button
                  onClick={() => setShowSettings(true)}
                  className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-[10px] rounded-lg border border-slate-700/60 transition-all cursor-pointer text-center"
                >
                  Edit Params
                </button>
                <button
                  onClick={handleDisconnect}
                  type="button"
                  className="flex-1 py-1.5 bg-rose-950/20 hover:bg-rose-950/40 text-rose-300 font-bold text-[10px] rounded-lg border border-rose-900/40 transition-all cursor-pointer text-center"
                >
                  Uncouple Gateway
                </button>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Aesthetic Footer indicators */}
      <footer className="p-4 shrink-0 text-center text-[9px] font-mono text-slate-600 border-t border-slate-900 bg-slate-950">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <span>CLIENT CORE v2.4.1</span>
          <span className="text-indigo-500 font-semibold tracking-wider flex items-center gap-1">
            <Cpu className="w-3 h-3 animate-spin" style={{ animationDuration: '6s' }} /> SMS-OS MOBILE TRANSLATOR
          </span>
        </div>
      </footer>

    </div>
  );
}
