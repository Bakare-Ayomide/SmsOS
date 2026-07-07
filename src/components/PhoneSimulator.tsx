/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Gateway, SaaSUser } from "../types";
import { 
  Smartphone, 
  Wifi, 
  Battery, 
  Send, 
  RefreshCw, 
  Radio, 
  Play, 
  Square, 
  MessageSquare, 
  Plus, 
  Settings, 
  Info,
  CircleAlert,
  HelpCircle,
  Cpu,
  BookOpen,
  Terminal,
  Copy,
  Check,
  Download,
  AlertCircle,
  ShieldAlert,
  ArrowUpCircle
} from "lucide-react";

interface PhoneSimulatorProps {
  gateways: Gateway[];
  onActionTriggered: () => void;
}

export default function PhoneSimulator({ gateways, onActionTriggered }: PhoneSimulatorProps) {
  const [activeSubTab, setActiveSubTab] = useState<'apk-onboarding' | 'device-emulator'>('apk-onboarding');
  const [selectedGatewayId, setSelectedGatewayId] = useState<string>("");
  const [isActive, setIsActive] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [incomingSender, setIncomingSender] = useState<string>("");
  const [incomingText, setIncomingText] = useState<string>("");
  const [incomingSim, setIncomingSim] = useState<number>(1);
  const [isSendingIncoming, setIsSendingIncoming] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Client telemetry state
  const [clientVersion, setClientVersion] = useState<string>("2.0.0");
  const [isUpdatingOTA, setIsUpdatingOTA] = useState<boolean>(false);
  const [isSuspended, setIsSuspended] = useState<boolean>(false);
  const [associatedCustomer, setAssociatedCustomer] = useState<SaaSUser | null>(null);

  // Simulated metrics
  const [batteryLevel, setBatteryLevel] = useState<number>(92);
  const [signalLevel, setSignalLevel] = useState<'excellent' | 'good' | 'fair' | 'poor'>("excellent");

  const logEndRef = useRef<HTMLDivElement>(null);
  const activeGateway = gateways.find(g => g.id === selectedGatewayId) || gateways[0];

  // Set default selected gateway and load owner
  useEffect(() => {
    if (gateways.length > 0 && !selectedGatewayId) {
      setSelectedGatewayId(gateways[0].id);
    }
  }, [gateways, selectedGatewayId]);

  // Fetch gateway owner info on change
  useEffect(() => {
    if (!activeGateway) {
      setAssociatedCustomer(null);
      return;
    }
    
    // Fetch SaaS users to find owner
    fetch("/api/admin/users")
      .then(res => res.json())
      .then((users: SaaSUser[]) => {
        const owner = users.find(u => u.id === activeGateway.ownerId);
        setAssociatedCustomer(owner || null);
        if (owner && owner.subscriptionStatus !== "active") {
          setIsSuspended(true);
        } else {
          setIsSuspended(false);
        }
      })
      .catch(() => {});
  }, [activeGateway, selectedGatewayId]);

  // Log auto-scroll
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const addLog = (text: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${text}`].slice(-40));
  };

  // Initialize Terminal Log
  useEffect(() => {
    if (activeGateway && activeSubTab === 'device-emulator') {
      setLogs([]);
      addLog(`SMS-OS Daemon client initialized: ${activeGateway.name}`);
      addLog(`Device UUID: ${activeGateway.id}`);
      addLog(`Running Client Core Version: v${clientVersion}`);
      if (isActive) {
        addLog(`Daemon service started. Remote polling & SMS listeners live.`);
      } else {
        addLog(`Daemon in standby. Click "Start Daemon Service" in the Emulator to simulate the connected device running.`);
      }
    }
  }, [selectedGatewayId, activeSubTab]);

  // Capacitor Heartbeat Ping and Fetch queue effect (only when Web Debug is active and turned on)
  useEffect(() => {
    if (!isActive || !activeGateway || activeSubTab !== 'device-emulator' || isUpdatingOTA) return;

    const triggerPing = async () => {
      try {
        const response = await fetch("/api/gateway/ping", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Gateway-Id": activeGateway.id,
            "X-Gateway-Token": activeGateway.token
          },
          body: JSON.stringify({
            battery: batteryLevel,
            signal: signalLevel,
            sim1Carrier: activeGateway.sim1Carrier,
            sim2Carrier: activeGateway.sim2Carrier,
            sim1Number: activeGateway.sim1Number,
            sim2Number: activeGateway.sim2Number
          })
        });

        if (response.status === 402) {
          const data = await response.json();
          addLog(`❌ [Billing Guard] PING REJECTED: ${data.error}`);
          addLog(`⚠️ SaaS hardware link suspended. Disabling cellular transceivers.`);
          setIsSuspended(true);
          setIsActive(false);
          return;
        }

        if (!response.ok) {
          throw new Error(`HTTP status ${response.status}`);
        }

        const data = await response.json();
        setIsSuspended(false);
        
        // Handle OTA Remote Update
        const targetVersion = data.remoteAppVersion || "2.5.0";
        if (targetVersion !== clientVersion) {
          addLog(`🔄 [OTA Update Engine] Server pushed remote software update: v${clientVersion} -> v${targetVersion}`);
          setIsUpdatingOTA(true);
          addLog(`⚡ Downloading Capacitor web assets update...`);
          
          setTimeout(() => {
            addLog(`💾 Staging new assets into Capacitor document directory...`);
            setTimeout(() => {
              addLog(`🚀 Core rebooting: Live-applying new remote client software v${targetVersion}!`);
              setClientVersion(targetVersion);
              setIsUpdatingOTA(false);
              addLog(`✅ Software update completed successfully. Resume polling.`);
              onActionTriggered();
            }, 1800);
          }, 1500);

          return;
        }

        addLog(`Heartbeat synchronized over Capacitor WebView Bridge. (200 OK)`);
        onActionTriggered();

        if (data.pending && data.pending.length > 0) {
          addLog(`📩 Received ${data.pending.length} pending SMS from SaaS queue!`);
          
          for (const sms of data.pending) {
            addLog(`📡 Broadcasting SMS over LTE network -> To: ${sms.to} (SIM slot ${sms.simSlot || 1})`);
            
            // Cellular latency simulation
            await new Promise(resolve => setTimeout(resolve, 1500));

            addLog(`✅ Mobile cellular network reported: Message delivered successfully.`);
            
            // Report DELIVERED back to SaaS
            await fetch("/api/gateway/messages/update", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Gateway-Id": activeGateway.id,
                "X-Gateway-Token": activeGateway.token
              },
              body: JSON.stringify({
                messageId: sms.id,
                status: "delivered"
              })
            });
            addLog(`SaaS server status synced: DELIVERED.`);
            onActionTriggered();
          }
        }
      } catch (err: any) {
        addLog(`❌ Capacitor WebBridge connection lost: ${err.message || String(err)}`);
      }
    };

    triggerPing();
    
    // Use the remote polling interval returned by server, default to 7s
    const pollingInterval = associatedCustomer ? associatedCustomer.remotePollingInterval * 1000 : 7000;
    const interval = setInterval(triggerPing, pollingInterval);

    return () => clearInterval(interval);
  }, [isActive, selectedGatewayId, batteryLevel, signalLevel, activeSubTab, clientVersion, isUpdatingOTA, associatedCustomer]);

  const handleSimulateIncoming = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGateway) return;
    if (!incomingSender.trim() || !incomingText.trim()) return;

    setIsSendingIncoming(true);
    addLog(`🔔 Cellular network delivered incoming SMS to mobile device...`);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      addLog(`From: ${incomingSender}`);
      addLog(`Body: "${incomingText}"`);

      // Upload received SMS to SaaS
      const response = await fetch("/api/gateway/incoming", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Gateway-Id": activeGateway.id,
          "X-Gateway-Token": activeGateway.token
        },
        body: JSON.stringify({
          sender: incomingSender,
          message: incomingText,
          simSlot: incomingSim
        })
      });

      if (response.ok) {
        addLog(`✅ Capacitor successfully uploaded inbound cellular SMS to SaaS gateway!`);
        setIncomingText("");
        onActionTriggered();
      } else {
        addLog(`⚠️ SaaS server reported inbound sync failure.`);
      }
    } catch (err: any) {
      addLog(`❌ Error synchronizing inbound message: ${err.message}`);
    } finally {
      setIsSendingIncoming(false);
    }
  };

  const handleToggleService = () => {
    if (isActive) {
      setIsActive(false);
      addLog(`Capacitor polling worker stopped. Status changed to offline.`);
    } else {
      setIsActive(true);
      addLog(`Capacitor polling worker started. Polling SaaS queues every ${associatedCustomer ? associatedCustomer.remotePollingInterval : 7}s...`);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode("javascript");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const signalBars = {
    excellent: "bg-indigo-500",
    good: "bg-indigo-400",
    fair: "bg-amber-400",
    poor: "bg-rose-500"
  };

  const serverUrl = typeof window !== "undefined" ? window.location.origin : "https://your-saas-url.com";

  // Production-ready JavaScript client code for Capacitor background task polling and broadcasting SMS
  const jsCapacitorCode = `/**
 * Capacitor Mobile Client - Background SMS Gateway Thread
 * Runs on standard React/JS within a Capacitor WebView.
 */
import { Capacitor } from '@capacitor/core';
import { KeepAwake } from '@capacitor-community/keep-awake';

// Config secrets obtained during gateway QR coupling
const CONFIG = {
  SERVER_URL: "${serverUrl}",
  GATEWAY_ID: "YOUR_GATEWAY_ID",
  GATEWAY_TOKEN: "YOUR_GATEWAY_TOKEN",
  POLL_INTERVAL: 5000 // Milliseconds
};

export async function startCapacitorSmsDaemon() {
  if (Capacitor.getPlatform() !== 'android') {
    console.warn("SMS Transceiver requires active physical Android device.");
    return;
  }

  // Prevent CPU sleep to ensure uninterrupted background SMS processing
  await KeepAwake.keepAwake();
  console.log("Capacitor KeepAwake lock acquired.");

  // Begin background daemon
  setInterval(async () => {
    try {
      await pollAndBroadcastSms();
    } catch (error) {
      console.error("Daemon exception:", error);
    }
  }, CONFIG.POLL_INTERVAL);
}

async function pollAndBroadcastSms() {
  // 1. Post telemetry & fetch pending SMS queue
  const response = await fetch(\`\${CONFIG.SERVER_URL}/api/gateway/ping\`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Gateway-Id": CONFIG.GATEWAY_ID,
      "X-Gateway-Token": CONFIG.GATEWAY_TOKEN
    },
    body: JSON.stringify({
      battery: 85,
      signal: "excellent",
      sim1Carrier: "T-Mobile USA"
    })
  });

  if (response.status === 402) {
    console.error("Subscription suspended. Pausing hardware link.");
    return;
  }

  const data = await response.json();
  const pendingSms = data.pending || [];

  for (const sms of pendingSms) {
    try {
      // 2. Broadcast physical SMS via Capacitor Android Bridge
      // (Uses standard Cordova/Capacitor SMS Broadcast interface)
      await new Promise((resolve, reject) => {
        window.sms.send(sms.to, sms.message, {
          android: { intent: "INTENT" } // Send directly without opening system UI
        }, resolve, reject);
      });

      // 3. Post back delivery status
      await fetch(\`\${CONFIG.SERVER_URL}/api/gateway/messages/update\`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Gateway-Id": CONFIG.GATEWAY_ID,
          "X-Gateway-Token": CONFIG.GATEWAY_TOKEN
        },
        body: JSON.stringify({
          messageId: sms.id,
          status: "delivered"
        })
      });
    } catch (err) {
      // Post fail status back to SaaS
      await fetch(\`\${CONFIG.SERVER_URL}/api/gateway/messages/update\`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Gateway-Id": CONFIG.GATEWAY_ID,
          "X-Gateway-Token": CONFIG.GATEWAY_TOKEN
        },
        body: JSON.stringify({
          messageId: sms.id,
          status: "failed",
          error: err.message || "Carrier dispatch failure"
        })
      });
    }
  }
}`;

  return (
    <div id="phone-control-center-widget" className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col h-full text-slate-200">
      <div className="flex flex-col gap-3.5 border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-indigo-400" />
            <span className="font-bold text-sm tracking-wide text-slate-100">SMS-OS Gateway Client</span>
          </div>
          <span className="bg-emerald-950 text-[9px] font-mono font-bold border border-emerald-900/60 px-2.5 py-0.5 rounded-full text-emerald-400">
            UNIVERSAL APK
          </span>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 bg-slate-950 border border-slate-850 p-1 rounded-xl">
          <button
            onClick={() => setActiveSubTab('apk-onboarding')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              activeSubTab === 'apk-onboarding'
                ? "bg-indigo-600 text-white shadow-md border border-indigo-500/20"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>APK Setup Guide</span>
          </button>
          <button
            onClick={() => setActiveSubTab('device-emulator')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              activeSubTab === 'device-emulator'
                ? "bg-indigo-650 text-white shadow-md border border-indigo-500/20"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Device Emulator</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'apk-onboarding' ? (
        /* Universal SaaS Customer APK Setup & QR Coupling Guide */
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
          {/* Official Premium Download Card */}
          <div className="bg-gradient-to-br from-indigo-950 to-slate-950 border border-indigo-900/50 p-4 rounded-xl text-slate-200 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none"></div>
            <div className="flex items-start gap-3 relative z-10">
              <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30 shrink-0">
                <Download className="w-5 h-5 animate-bounce" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-white tracking-wide">SMS-OS Gateway Daemon</h4>
                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Download Pre-Built Universal APK</p>
                <div className="flex flex-wrap gap-2 mt-2 text-[9px] font-mono text-slate-400">
                  <span className="bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-800">Size: 14.2 MB</span>
                  <span className="bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-800">v2.4.1</span>
                  <span className="bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-800">Android 8.0+</span>
                </div>
              </div>
            </div>

            <a
              href="/api/download/sms-os-gateway.apk"
              download="sms-os-gateway.apk"
              onClick={(e) => {
                // Instantly simulate a download experience so the customer gets a perfect visual feedback
                addLog(`📥 Triggered official SMS-OS Gateway Universal APK download (14.2 MB)`);
              }}
              className="mt-3.5 w-full bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white text-[11px] font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer text-center"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download sms-os-gateway.apk</span>
            </a>
          </div>

          <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed">
            <h5 className="font-bold text-[10px] uppercase tracking-wider text-slate-400 font-mono">How to Link Physical Android Devices:</h5>

            {/* Step 1 */}
            <div className="bg-slate-950/45 border border-slate-850 p-3 rounded-xl flex items-start gap-2.5">
              <span className="bg-indigo-950 text-indigo-400 border border-indigo-900/60 font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                1
              </span>
              <div>
                <strong className="block text-slate-100 font-semibold mb-0.5">Download & Install</strong>
                <p className="text-slate-400 text-[11px]">
                  Download the universal APK above on any target Android smartphone. Enable "Install Unknown Apps" if prompted by system security.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-950/45 border border-slate-850 p-3 rounded-xl flex items-start gap-2.5">
              <span className="bg-indigo-950 text-indigo-400 border border-indigo-900/60 font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                2
              </span>
              <div>
                <strong className="block text-slate-100 font-semibold mb-0.5">Create Gateway Node</strong>
                <p className="text-slate-400 text-[11px]">
                  On this web dashboard, go to <strong>Gateways</strong> and click <strong>Add Gateway</strong> to name your endpoint and set up SIM cellular options.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-950/45 border border-slate-850 p-3 rounded-xl flex items-start gap-2.5">
              <span className="bg-indigo-950 text-indigo-400 border border-indigo-900/60 font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                3
              </span>
              <div>
                <strong className="block text-slate-100 font-semibold mb-0.5">Scan Dashboard QR Code</strong>
                <p className="text-slate-400 text-[11px]">
                  Open the installed APK on your phone, click <strong>📸 Scan QR Code</strong>, and point it at the dynamic pairing QR Code displayed on the SaaS wizard.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-slate-950/45 border border-slate-850 p-3 rounded-xl flex items-start gap-2.5">
              <span className="bg-indigo-950 text-indigo-400 border border-indigo-900/60 font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                4
              </span>
              <div>
                <strong className="block text-slate-100 font-semibold mb-0.5">Complete Automatic Pairing</strong>
                <p className="text-slate-400 text-[11px]">
                  The phone will automatically load the SaaS URL and secret coupling token, connect securely, and synchronize live cellular dispatching!
                </p>
              </div>
            </div>

            {/* Live Web Preview of the APK client UI */}
            <div className="bg-indigo-950/30 border border-indigo-900/40 p-3.5 rounded-xl text-center mt-1">
              <h6 className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">Live Gateway Agent UI Preview</h6>
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                Curious what the actual compiled Android APK looks like on a physical phone? Toggle the view to inspect and test the standalone Gateway Agent (The Muscle) client:
              </p>
              <button
                onClick={() => {
                  localStorage.setItem("mode_apk", "true");
                  window.location.reload();
                }}
                className="mt-2.5 w-full bg-slate-900 hover:bg-slate-850 text-indigo-400 hover:text-indigo-300 font-bold text-[10px] py-1.5 px-3 rounded-lg border border-indigo-500/20 transition-all cursor-pointer"
              >
                Toggle Browser view to Mobile APK Client UI
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Web Connected Device Debugger console */
        <div className="flex-1 flex flex-col gap-4">
          {gateways.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-950/50 rounded-2xl border border-dashed border-slate-800">
              <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
              <p className="text-sm font-medium text-slate-300">No Gateways Configured</p>
              <p className="text-xs text-slate-500 mt-1 max-w-[240px]">
                Add a physical gateway transceiver inside the dashboard first to display its pairing QR Code and test connectivity.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-3">
              {/* Device Selector */}
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Active Simulated Physical Device
                </label>
                <select
                  value={selectedGatewayId}
                  onChange={(e) => setSelectedGatewayId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                >
                  {gateways.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.sim1Number || "No Number"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Hardware Coupling Controller */}
              <div className="bg-slate-950 rounded-2xl border border-slate-800 p-3.5 flex flex-col">
                {/* Phone Top Notch Status bar */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pb-2 border-b border-slate-900">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-300">LTE</span>
                    <div className="flex items-end gap-0.5 h-3">
                      <div className={`w-[2px] h-1 rounded-sm ${signalLevel !== 'poor' ? signalBars[signalLevel] : 'bg-slate-700'}`}></div>
                      <div className={`w-[2px] h-1.5 rounded-sm ${['good', 'excellent'].includes(signalLevel) ? signalBars[signalLevel] : 'bg-slate-700'}`}></div>
                      <div className={`w-[2px] h-2 rounded-sm ${signalLevel === 'excellent' ? signalBars[signalLevel] : 'bg-slate-700'}`}></div>
                    </div>
                    <span className="text-[10px] text-slate-500 max-w-[90px] truncate">
                      {activeGateway?.sim1Carrier || "T-Mobile"}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Battery className="w-3 h-3 text-slate-300" />
                    <span>{batteryLevel}%</span>
                  </div>
                </div>

                {/* Simulated App Screen */}
                <div className="py-2.5 flex flex-col gap-2">
                  <div className="flex items-center justify-between bg-slate-900 border border-slate-800/80 rounded-xl p-2 px-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-300 font-mono flex items-center gap-1">
                        <span>CAPACITOR BACKGROUND RUNNER</span>
                      </span>
                      <span className="text-[9px] text-slate-500">
                        Running Version: <span className="text-indigo-400 font-bold">v{clientVersion}</span>
                      </span>
                    </div>
                    <button
                      onClick={handleToggleService}
                      disabled={isUpdatingOTA}
                      className={`p-1 px-2.5 rounded-lg flex items-center gap-1 text-[11px] font-semibold tracking-wide transition-all cursor-pointer ${
                        isActive 
                          ? "bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30" 
                          : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30"
                      } disabled:opacity-50`}
                    >
                      {isActive ? (
                        <>
                          <Square className="w-2.5 h-2.5 fill-rose-300 text-rose-300" />
                          <span>Stop Link</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-2.5 h-2.5 fill-emerald-300 text-emerald-300" />
                          <span>Start Web Link</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Owner billing telemetry */}
                  {associatedCustomer && (
                    <div className="flex items-center justify-between bg-slate-900/40 p-2 rounded-xl text-[10px] border border-slate-900">
                      <span className="text-slate-500">Registered Subscriber:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-300">{associatedCustomer.name}</span>
                        <span className={`px-1.5 py-0.5 rounded-md font-mono text-[9px] font-bold ${
                          associatedCustomer.subscriptionStatus === 'active' 
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-900/60" 
                            : "bg-rose-950 text-rose-400 border border-rose-900/60"
                        }`}>
                          {associatedCustomer.subscriptionStatus.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Sliders to Customize Metrics */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-900/50 border border-slate-900 rounded-xl p-2">
                    <div>
                      <div className="flex justify-between text-[9px] text-slate-500 mb-0.5">
                        <span>Simulated Battery</span>
                        <span className="font-mono text-slate-300">{batteryLevel}%</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="100"
                        value={batteryLevel}
                        onChange={(e) => setBatteryLevel(parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[9px] text-slate-500 mb-0.5">
                        <span>Carrier Signal</span>
                        <span className="font-mono text-slate-300 uppercase">{signalLevel}</span>
                      </div>
                      <select
                        value={signalLevel}
                        onChange={(e: any) => setSignalLevel(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 text-[9px] text-slate-300 rounded-md p-0.5 focus:outline-none"
                      >
                        <option value="excellent">Excellent</option>
                        <option value="good">Good</option>
                        <option value="fair">Fair</option>
                        <option value="poor">Poor</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Real-Time Daemon Event Log Console */}
                <div className="bg-slate-950 border border-slate-900 rounded-xl p-3 h-36 flex flex-col font-mono text-[9px] leading-relaxed">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-1 mb-1.5 text-slate-500 text-[8px]">
                    <span>CAPACITOR WEBBRIDGE LIVE LOGS</span>
                    <button 
                      onClick={() => setLogs([])}
                      className="hover:text-slate-300 transition-colors"
                      title="Clear Console"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar scrollbar-thin scrollbar-thumb-slate-800">
                    {isUpdatingOTA && (
                      <div className="flex flex-col items-center justify-center h-full text-indigo-400 gap-1.5 text-center">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span className="font-semibold text-[10px]">Applying Over-The-Air Software Update...</span>
                      </div>
                    )}
                    
                    {!isUpdatingOTA && logs.length === 0 ? (
                      <span className="text-slate-700 italic">No console logs... click "Start Web Link" to run Capacitor background lifecycle daemon.</span>
                    ) : !isUpdatingOTA && (
                      logs.map((log, i) => (
                        <div key={i} className="text-slate-400 break-words">
                          {log.startsWith("[") ? (
                            <>
                              <span className="text-indigo-500 font-bold">{log.slice(0, 10)}</span>
                              <span className={
                                log.includes("❌") || log.includes("Suspended") ? "text-rose-400 font-semibold" :
                                log.includes("⚠️") || log.includes("Billing") ? "text-amber-400 font-medium" :
                                log.includes("Success") || log.includes("delivered") || log.includes("200 OK") || log.includes("successfully") ? "text-emerald-400 font-medium" :
                                log.includes("dispatched") || log.includes("OTA") || log.includes("🔄") ? "text-sky-300 font-bold" :
                                "text-slate-300"
                              }>
                                {log.slice(10)}
                              </span>
                            </>
                          ) : (
                            log
                          )}
                        </div>
                      ))
                    )}
                    <div ref={logEndRef} />
                  </div>
                </div>
              </div>

              {/* SIM Card Incoming SMS Simulator Injector */}
              <div className="bg-slate-950 border border-slate-850 rounded-2xl p-3">
                <div className="flex items-center gap-1 text-xs font-semibold text-slate-300 mb-2 pb-1 border-b border-slate-900">
                  <Radio className="w-3 h-3 text-indigo-400" />
                  <span>Deliver Inbound LTE Mobile Message</span>
                </div>
                
                <form onSubmit={handleSimulateIncoming} className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-medium text-slate-500 mb-0.5">
                        Sender Mobile Number
                      </label>
                      <input
                        type="tel"
                        required
                        value={incomingSender}
                        onChange={(e) => setIncomingSender(e.target.value)}
                        placeholder="e.g. +1 (415) 880-9111"
                        className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-medium text-slate-500 mb-0.5">
                        Target SIM Slot
                      </label>
                      <select
                        value={incomingSim}
                        onChange={(e) => setIncomingSim(parseInt(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value={1}>SIM 1 ({activeGateway?.sim1Carrier || "Carrier 1"})</option>
                        {activeGateway?.sim2Carrier && activeGateway?.sim2Carrier !== "None" && (
                          <option value={2}>SIM 2 ({activeGateway.sim2Carrier})</option>
                        )}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-medium text-slate-500 mb-0.5">
                      SMS Body (Delivered to Phone Transceiver)
                    </label>
                    <textarea
                      required
                      rows={1}
                      value={incomingText}
                      onChange={(e) => setIncomingText(e.target.value)}
                      placeholder="Type real SMS text carrier delivered to phone..."
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none font-sans"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSendingIncoming || !isActive || isSuspended}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-xs py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-indigo-500/10 shadow-lg"
                  >
                    {isSendingIncoming ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Receiving Carrier Transceiver SMS...</span>
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-3 h-3" />
                        <span>Inject Received SMS into SaaS Gateway</span>
                      </>
                    )}
                  </button>
                  
                  {isSuspended && (
                    <p className="text-[9px] text-rose-400 text-center font-mono">
                      ❌ Connection blocked. Owner's billing subscription is suspended!
                    </p>
                  )}
                  {!isSuspended && !isActive && (
                    <p className="text-[9px] text-amber-400 text-center font-mono animate-pulse">
                      ⚠️ Start Web Link above to run Capacitor background sync
                    </p>
                  )}
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
