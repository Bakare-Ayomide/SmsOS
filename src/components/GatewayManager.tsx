/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Gateway } from "../types";
import { 
  Smartphone, 
  Battery, 
  Wifi, 
  Trash2, 
  Plus, 
  Check, 
  Copy, 
  Info, 
  QrCode, 
  X, 
  CheckCircle2, 
  Loader2,
  Cpu
} from "lucide-react";

interface GatewayManagerProps {
  gateways: Gateway[];
  onReload: () => void;
}

export default function GatewayManager({ gateways, onReload }: GatewayManagerProps) {
  const [showAddWizard, setShowAddWizard] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>("");
  const [sim1Carrier, setSim1Carrier] = useState<string>("T-Mobile USA");
  const [sim2Carrier, setSim2Carrier] = useState<string>("None");
  const [sim1Number, setSim1Number] = useState<string>("");
  const [sim2Number, setSim2Number] = useState<string>("");
  
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdGateway, setCreatedGateway] = useState<Gateway | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleRegisterGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/gateways", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          sim1Carrier,
          sim2Carrier,
          sim1Number,
          sim2Number
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCreatedGateway(data);
        setNewName("");
        setSim1Carrier("T-Mobile USA");
        setSim2Carrier("None");
        setSim1Number("");
        setSim2Number("");
        onReload();
      } else {
        alert("Failed to provision gateway endpoint on SaaS server.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGateway = async (id: string) => {
    if (!confirm("Are you sure you want to delete this gateway phone? All queued messages and logs will be deleted.")) return;

    try {
      const response = await fetch(`/api/gateways/${id}`, {
        method: "DELETE"
      });
      if (response.ok) {
        onReload();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const serverUrl = window.location.origin;

  const signalBars = {
    excellent: "text-emerald-500 fill-emerald-500",
    good: "text-emerald-400 fill-emerald-400",
    fair: "text-amber-500 fill-amber-500",
    poor: "text-rose-500 fill-rose-500"
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-indigo-600" />
            Gateway Phones & Hardware
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Register and manage physical Android devices operating as SMS dispatches.
          </p>
        </div>

        <button
          onClick={() => { setShowAddWizard(true); setCreatedGateway(null); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-indigo-500/10 shadow-lg shadow-indigo-600/10"
        >
          <Plus className="w-4 h-4" />
          <span>Add Gateway</span>
        </button>
      </div>

      {/* Gateway Devices Grid */}
      {gateways.length === 0 ? (
        <div className="text-center p-12 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
          <Smartphone className="w-8 h-8 text-slate-400" />
          <span className="font-semibold text-slate-700">No gateway phone nodes registered yet</span>
          <p className="text-slate-400 max-w-[340px]">
            Configure and link an Android phone node using the physical APK connection wizard.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {gateways.map((gw) => {
            const isOnline = gw.status === "online";
            return (
              <div 
                key={gw.id} 
                className={`bg-slate-50 border rounded-2xl p-4.5 flex flex-col gap-3.5 transition-all relative overflow-hidden ${
                  isOnline 
                    ? "border-slate-200 shadow-sm" 
                    : "border-slate-200/80 opacity-75 shadow-none"
                }`}
              >
                {/* Visual Status Indicator Ring on Right Top */}
                <div className="absolute right-4.5 top-4.5 flex items-center gap-1.5">
                  <span className={`inline-block h-2 w-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-rose-500"}`}></span>
                  <span className={`text-[10px] font-bold font-mono tracking-wider uppercase ${isOnline ? "text-emerald-700" : "text-rose-600"}`}>
                    {gw.status}
                  </span>
                </div>

                {/* Device Primary Info */}
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl ${isOnline ? "bg-indigo-50 text-indigo-600" : "bg-slate-200 text-slate-500"}`}>
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 leading-tight">{gw.name}</h3>
                    <code className="text-[10px] text-slate-400 block font-mono mt-0.5">ID: {gw.id}</code>
                  </div>
                </div>

                {/* Network & SIM Slots */}
                <div className="grid grid-cols-2 gap-2 bg-white border border-slate-150 rounded-xl p-2.5">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">SIM 1 Carrier</span>
                    <span className="text-[11px] font-medium text-slate-700 font-mono truncate">
                      {gw.sim1Carrier || "Unconfigured"}
                    </span>
                    {gw.sim1Number && (
                      <span className="text-[9px] text-slate-400 font-mono mt-0.5">{gw.sim1Number}</span>
                    )}
                  </div>
                  <div className="flex flex-col border-l border-slate-100 pl-2.5">
                    <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">SIM 2 Carrier</span>
                    <span className="text-[11px] font-medium text-slate-700 font-mono truncate">
                      {gw.sim2Carrier && gw.sim2Carrier !== "None" ? gw.sim2Carrier : "None"}
                    </span>
                    {gw.sim2Number && (
                      <span className="text-[9px] text-slate-400 font-mono mt-0.5">{gw.sim2Number}</span>
                    )}
                  </div>
                </div>

                {/* Battery & Signal Telemetry */}
                <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-200/50 pt-3">
                  <div className="flex items-center gap-1.5">
                    <Battery className={`w-4 h-4 ${isOnline ? 'text-indigo-500' : 'text-slate-400'}`} />
                    <span className="font-semibold font-mono text-slate-600">{gw.battery}%</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Wifi className={`w-4 h-4 ${isOnline ? signalBars[gw.signal] : 'text-slate-400'}`} />
                    <span className="capitalize font-mono text-[11px] text-slate-600">{gw.signal} signal</span>
                  </div>

                  <button
                    onClick={() => handleDeleteGateway(gw.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer ml-2"
                    title="Delete gateway record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Last ping info */}
                <div className="text-[10px] text-slate-400 font-mono pt-1.5 border-t border-slate-100/50 flex justify-between">
                  <span>Last Seen Heartbeat:</span>
                  <span className="font-semibold text-slate-500">
                    {gw.lastPing && new Date(gw.lastPing).getTime() > 0 
                      ? new Date(gw.lastPing).toLocaleTimeString() 
                      : "Never connected"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Connection Wizard Modal Overlay */}
      {showAddWizard && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-5 relative">
            <button
              onClick={() => setShowAddWizard(false)}
              className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-indigo-600" />
                Register New Cellular Gateway Node
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Generate gateway coupling secrets on SaaS backend to prepare Android APK synchronization.
              </p>
            </div>

            {!createdGateway ? (
              /* Step 1: Input details to create record and token */
              <form onSubmit={handleRegisterGateway} className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-700 font-semibold">Device Display Name</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Pixel 8 Pro (Primary Office)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-slate-700 font-semibold">SIM 1 Carrier Operator</label>
                    <input
                      type="text"
                      value={sim1Carrier}
                      onChange={(e) => setSim1Carrier(e.target.value)}
                      placeholder="e.g. T-Mobile"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-slate-700 font-semibold">SIM 1 Cellular Number (Optional)</label>
                    <input
                      type="text"
                      value={sim1Number}
                      onChange={(e) => setSim1Number(e.target.value)}
                      placeholder="e.g. +1 (555) 012-3456"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-slate-700 font-semibold">SIM 2 Carrier Operator (Optional)</label>
                    <input
                      type="text"
                      value={sim2Carrier}
                      onChange={(e) => setSim2Carrier(e.target.value)}
                      placeholder="e.g. eSIM (Google Fi)"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-slate-700 font-semibold">SIM 2 Cellular Number (Optional)</label>
                    <input
                      type="text"
                      value={sim2Number}
                      onChange={(e) => setSim2Number(e.target.value)}
                      placeholder="e.g. +1 (555) 012-9900"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 p-3.5 bg-indigo-50 border border-indigo-100/60 rounded-xl text-indigo-950">
                  <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    This step provisions an isolated gateway endpoint on the database. You will be provided with an Android APK token to securely pair the physical hardware to this channel.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Provisioning Channel...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Generate Coupling Credentials</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* Step 2: Show credentials & visual QR Code simulation */
              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-2.5 text-emerald-700 bg-emerald-50 border border-emerald-100 p-3 rounded-xl text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Gateway successfully provisioned on SaaS backend! Proceed to phone coupling.</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                  {/* Pair instructions */}
                  <div className="flex flex-col gap-3 text-xs text-slate-600 leading-relaxed">
                    <span className="font-bold uppercase text-slate-500 tracking-wider text-[10px]">APK Connection Instructions</span>
                    
                    <ol className="list-decimal pl-4.5 space-y-2.5">
                      <li>
                        Download and install the <code className="bg-slate-100 p-0.5 font-mono text-indigo-600">SMS-Gateway-Daemon.apk</code> on your physical Android phone.
                      </li>
                      <li>
                        Open the APK. Under Connection settings, set the Server API Endpoint to:
                        <div className="flex items-center mt-1 bg-slate-50 p-2 border border-slate-200 rounded-lg text-[10px] font-mono break-all relative">
                          <span>{serverUrl}</span>
                          <button
                            onClick={() => handleCopy(serverUrl, 'server-url')}
                            className="p-1 ml-auto text-slate-400 hover:text-slate-700"
                            title="Copy Server URL"
                          >
                            {copiedText === 'server-url' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </li>
                      <li>
                        Set the secure pairing Gateway Token credential:
                        <div className="flex items-center mt-1 bg-slate-50 p-2 border border-slate-200 rounded-lg text-[10px] font-mono break-all relative">
                          <span className="text-indigo-600 font-semibold">{createdGateway.token}</span>
                          <button
                            onClick={() => handleCopy(createdGateway.token, 'token')}
                            className="p-1 ml-auto text-slate-400 hover:text-slate-700"
                            title="Copy Token"
                          >
                            {copiedText === 'token' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </li>
                      <li>
                        Click <strong className="text-slate-800">Start Daemon service</strong>. The phone's battery levels, cellular carrier signal, and SIM slots will synchronize with this SaaS immediately!
                      </li>
                    </ol>
                  </div>

                  {/* Visual QR Code Mockup */}
                  <div className="flex flex-col items-center justify-center bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center">
                    <span className="font-bold uppercase text-slate-500 tracking-wider text-[10px] mb-3">Coupling QR Code Scan</span>
                    
                    {/* Visual QR element */}
                    <div className="bg-white p-3 border border-slate-200 rounded-xl shadow-xs relative">
                      <QrCode className="w-32 h-32 text-slate-900" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-10 bg-slate-950/20">
                        <Smartphone className="w-8 h-8 text-indigo-600" />
                      </div>
                    </div>
                    
                    <p className="text-[10px] text-slate-400 mt-3 leading-normal max-w-[200px]">
                      Or scan this QR Code inside the Android APK app to auto-configure the Server URL and Coupling Token instantly.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowAddWizard(false)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 rounded-xl transition-all cursor-pointer mt-2"
                >
                  Close Wizard & View Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
