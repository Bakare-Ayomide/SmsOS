/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Gateway } from "../types";
import { 
  Send, 
  Layers, 
  Smartphone, 
  Clock, 
  AlertCircle, 
  Play, 
  CheckCircle2, 
  Plus, 
  Users,
  Loader2
} from "lucide-react";

interface SmsDispatcherProps {
  gateways: Gateway[];
  onActionComplete: () => void;
}

export default function SmsDispatcher({ gateways, onActionComplete }: SmsDispatcherProps) {
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form states - Single
  const [singleTo, setSingleTo] = useState<string>("");
  const [singleMessage, setSingleMessage] = useState<string>("");
  const [singleGatewayId, setSingleGatewayId] = useState<string>("");
  const [singleSimSlot, setSingleSimSlot] = useState<number>(1);
  const [singlePriority, setSinglePriority] = useState<'high' | 'normal'>('normal');

  // Form states - Bulk
  const [bulkNumbers, setBulkNumbers] = useState<string>("");
  const [bulkMessage, setBulkMessage] = useState<string>("");
  const [bulkGatewayId, setBulkGatewayId] = useState<string>("");
  const [bulkSimSlot, setBulkSimSlot] = useState<number>(1);
  const [bulkPriority, setBulkPriority] = useState<'high' | 'normal'>('normal');
  const [bulkDelay, setBulkDelay] = useState<number>(5); // 5 seconds default gap

  // Automatically select the first gateway if none is selected
  const defaultGateway = gateways.find((g) => g.status === "online") || gateways[0];
  const activeGatewayId = activeTab === 'single' ? singleGatewayId : bulkGatewayId;
  const currentGateway = gateways.find((g) => g.id === (activeGatewayId || defaultGateway?.id));

  const handleSendSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    const gwId = singleGatewayId || defaultGateway?.id;

    if (!singleTo.trim() || !singleMessage.trim() || !gwId) {
      alert("Please configure recipient number, message content, and select a gateway phone.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: singleTo,
          message: singleMessage,
          gatewayId: gwId,
          simSlot: singleSimSlot,
          priority: singlePriority
        })
      });

      if (response.ok) {
        setSingleTo("");
        setSingleMessage("");
        onActionComplete();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to enqueue SMS dispatch.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    const gwId = bulkGatewayId || defaultGateway?.id;

    if (!bulkNumbers.trim() || !bulkMessage.trim() || !gwId) {
      alert("Please provide bulk numbers list, message content, and select a gateway phone.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/messages/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numbers: bulkNumbers,
          message: bulkMessage,
          gatewayId: gwId,
          simSlot: bulkSimSlot,
          priority: bulkPriority,
          delaySeconds: bulkDelay
        })
      });

      if (response.ok) {
        setBulkNumbers("");
        setBulkMessage("");
        onActionComplete();
        alert("Bulk SMS campaign has been enqueued successfully. Gateways will begin staggered cellular broad-casting!");
      } else {
        const data = await response.json();
        alert(data.error || "Failed to trigger bulk campaign.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Send className="w-5 h-5 text-indigo-600" />
            SMS Dispatch Console
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Dispatch cellular text messages manually or create bulk marketing campaign queues.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/60 p-1 rounded-xl self-start">
        <button
          onClick={() => setActiveTab('single')}
          className={`flex items-center gap-1.5 py-1.5 px-4 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
            activeTab === 'single'
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Single SMS</span>
        </button>
        <button
          onClick={() => setActiveTab('bulk')}
          className={`flex items-center gap-1.5 py-1.5 px-4 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
            activeTab === 'bulk'
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Bulk Campaign</span>
        </button>
      </div>

      {gateways.length === 0 ? (
        <div className="text-center p-8 bg-amber-50/50 border border-amber-200/60 rounded-xl text-xs text-amber-800 flex flex-col items-center justify-center gap-2">
          <AlertCircle className="w-6 h-6 text-amber-600" />
          <span className="font-semibold">No Gateway Devices Connected</span>
          <p className="text-slate-600 max-w-[340px]">
            Please register and couple at least one Android phone as a gateway to activate cellular dispatches.
          </p>
        </div>
      ) : (
        <div>
          {/* SINGLE SMS DISPATCH */}
          {activeTab === 'single' && (
            <form onSubmit={handleSendSingle} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-4">
                {/* Gateway Selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-700 font-semibold">Broadcasting Phone Gateway</label>
                  <select
                    value={singleGatewayId || defaultGateway?.id}
                    onChange={(e) => setSingleGatewayId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-colors"
                  >
                    {gateways.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.status === "online" ? "🟢 ONLINE" : "🔴 OFFLINE"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* SIM Slot Selector */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-slate-700 font-semibold">Active SIM Slot</label>
                    <select
                      value={singleSimSlot}
                      onChange={(e) => setSingleSimSlot(parseInt(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                    >
                      <option value={1}>SIM 1 ({currentGateway?.sim1Carrier || "Primary"})</option>
                      {currentGateway?.sim2Carrier && currentGateway?.sim2Carrier !== "None" && (
                        <option value={2}>SIM 2 ({currentGateway.sim2Carrier})</option>
                      )}
                    </select>
                  </div>

                  {/* Priority */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-slate-700 font-semibold">Queue Priority</label>
                    <select
                      value={singlePriority}
                      onChange={(e: any) => setSinglePriority(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                    >
                      <option value="normal">Normal</option>
                      <option value="high">High (Bypass FIFO)</option>
                    </select>
                  </div>
                </div>

                {/* Recipient number */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-700 font-semibold">Recipient Phone Number</label>
                  <input
                    type="text"
                    required
                    value={singleTo}
                    onChange={(e) => setSingleTo(e.target.value)}
                    placeholder="+1 (555) 012-3456"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {/* Message text */}
                <div className="flex flex-col gap-1.5 flex-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-700 font-semibold">Message Text</label>
                    <span className="text-[10px] text-slate-400">
                      {singleMessage.length} chars | {Math.ceil(singleMessage.length / 160)} SMS Credits
                    </span>
                  </div>
                  <textarea
                    required
                    rows={5}
                    value={singleMessage}
                    onChange={(e) => setSingleMessage(e.target.value)}
                    placeholder="Type cellular text message body here..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all resize-none flex-1 font-sans"
                  />
                </div>

                {currentGateway && currentGateway.status === "offline" && (
                  <p className="text-[11px] text-amber-600 flex items-center gap-1.5 font-mono">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Warning: Selected Gateway is offline. SMS will queue.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-slate-200 disabled:text-slate-500 font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/10"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Queueing Broadcast...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Queue Cellular SMS Dispatch</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* BULK SMS CAMPAIGN */}
          {activeTab === 'bulk' && (
            <form onSubmit={handleSendBulk} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-4">
                {/* Gateway Selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-700 font-semibold">Broadcasting Phone Gateway</label>
                  <select
                    value={bulkGatewayId || defaultGateway?.id}
                    onChange={(e) => setBulkGatewayId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-colors"
                  >
                    {gateways.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.status === "online" ? "🟢 ONLINE" : "🔴 OFFLINE"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* SIM Slot Selector */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-slate-700 font-semibold">Active SIM Slot</label>
                    <select
                      value={bulkSimSlot}
                      onChange={(e) => setBulkSimSlot(parseInt(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                    >
                      <option value={1}>SIM 1 ({currentGateway?.sim1Carrier || "Primary"})</option>
                      {currentGateway?.sim2Carrier && currentGateway?.sim2Carrier !== "None" && (
                        <option value={2}>SIM 2 ({currentGateway.sim2Carrier})</option>
                      )}
                    </select>
                  </div>

                  {/* Anti-blocking delay */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-slate-700 font-semibold">Anti-Block Delay (Stagger)</label>
                    <select
                      value={bulkDelay}
                      onChange={(e) => setBulkDelay(parseInt(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white font-mono"
                    >
                      <option value={0}>No Delay (Instantly push)</option>
                      <option value={3}>3 seconds interval</option>
                      <option value={5}>5 seconds interval</option>
                      <option value={10}>10 seconds interval</option>
                      <option value={30}>30 seconds interval</option>
                    </select>
                  </div>
                </div>

                {/* Recipients Text Area */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-700 font-semibold">Recipient List (CSV / Comma Separated)</label>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                      <Users className="w-3 h-3" />
                      {bulkNumbers.split(",").map(n => n.trim()).filter(Boolean).length} Numbers
                    </span>
                  </div>
                  <textarea
                    required
                    rows={4}
                    value={bulkNumbers}
                    onChange={(e) => setBulkNumbers(e.target.value)}
                    placeholder="+15550199001, +15550199002, +15550199003"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white font-mono leading-relaxed"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {/* Message text */}
                <div className="flex flex-col gap-1.5 flex-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-700 font-semibold">Campaign Message Body</label>
                    <span className="text-[10px] text-slate-400">
                      {bulkMessage.length} chars
                    </span>
                  </div>
                  <textarea
                    required
                    rows={7}
                    value={bulkMessage}
                    onChange={(e) => setBulkMessage(e.target.value)}
                    placeholder="Type campaign text message body here..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all resize-none flex-1 font-sans"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-slate-200 disabled:text-slate-500 font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/10"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Scheduling Bulk campaign...</span>
                    </>
                  ) : (
                    <>
                      <Layers className="w-4 h-4" />
                      <span>Launch Staggered Campaign</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
