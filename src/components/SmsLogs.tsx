/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { Message, Gateway } from "../types";
import { 
  Inbox, 
  Send, 
  Search, 
  Filter, 
  RefreshCw, 
  Trash2, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ArrowDownLeft, 
  ArrowUpRight 
} from "lucide-react";

interface SmsLogsProps {
  messages: Message[];
  gateways: Gateway[];
  onReload: () => void;
}

export default function SmsLogs({ messages, gateways, onReload }: SmsLogsProps) {
  const [activeTab, setActiveTab] = useState<'outbox' | 'inbox'>('outbox');
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [gatewayFilter, setGatewayFilter] = useState<string>("all");
  const [isRetryingId, setIsRetryingId] = useState<string | null>(null);

  const handleRetryMessage = async (id: string) => {
    setIsRetryingId(id);
    try {
      const response = await fetch(`/api/messages/${id}/retry`, {
        method: "POST"
      });
      if (response.ok) {
        onReload();
      } else {
        alert("Failed to retry message dispatch.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRetryingId(null);
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (!confirm("Are you sure you want to delete this log entry?")) return;

    try {
      const response = await fetch(`/api/messages/${id}`, {
        method: "DELETE"
      });
      if (response.ok) {
        onReload();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter logs
  const filteredMessages = messages
    .filter((m) => {
      // Tab filter
      if (activeTab === 'outbox' && m.type !== 'outbox') return false;
      if (activeTab === 'inbox' && m.type !== 'inbox') return false;

      // Gateway filter
      if (gatewayFilter !== 'all' && m.gatewayId !== gatewayFilter) return false;

      // Status filter
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;

      // Search term
      if (search.trim()) {
        const query = search.toLowerCase();
        const toMatch = m.type === 'outbox' ? (m.to || "") : (m.from || "");
        const msgMatch = m.message.toLowerCase();
        return toMatch.toLowerCase().includes(query) || msgMatch.includes(query);
      }

      return true;
    });

  const statusColors = {
    queued: "bg-amber-100 text-amber-800 border-amber-200/60",
    sending: "bg-sky-100 text-sky-800 border-sky-200/60",
    sent: "bg-indigo-100 text-indigo-800 border-indigo-200/60",
    delivered: "bg-emerald-100 text-emerald-800 border-emerald-200/60",
    failed: "bg-rose-100 text-rose-800 border-rose-200/60"
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Inbox className="w-5 h-5 text-indigo-600" />
            Cellular SMS History Logs
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Browse fully authenticated outbox and inbox cellular SMS transactions.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1 rounded-xl self-start">
          <button
            onClick={() => { setActiveTab('outbox'); setSearch(""); setStatusFilter("all"); }}
            className={`flex items-center gap-1.5 py-1.5 px-4 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              activeTab === 'outbox'
                ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-indigo-500" />
            <span>Outbox</span>
          </button>
          <button
            onClick={() => { setActiveTab('inbox'); setSearch(""); setStatusFilter("all"); }}
            className={`flex items-center gap-1.5 py-1.5 px-4 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              activeTab === 'inbox'
                ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" />
            <span>Inbox</span>
          </button>
        </div>
      </div>

      {/* Filters panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50/50 border border-slate-200/60 p-3 rounded-xl">
        {/* Search Input */}
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={activeTab === 'outbox' ? "Search by recipient format or text..." : "Search by sender number or text..."}
            className="w-full bg-white border border-slate-200 rounded-lg p-2 pl-9 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Gateway Device Filter */}
        <div className="relative">
          <select
            value={gatewayFilter}
            onChange={(e) => setGatewayFilter(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Gateway Phones</option>
            {gateways.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter - Only shows in Outbox */}
        <div className="relative">
          {activeTab === 'outbox' ? (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Dispatches</option>
              <option value="queued">Queued</option>
              <option value="sending">Sending</option>
              <option value="sent">Sent (Unconfirmed)</option>
              <option value="delivered">Delivered</option>
              <option value="failed">Failed</option>
            </select>
          ) : (
            <div className="w-full bg-slate-100 border border-slate-200/50 rounded-lg p-2 text-xs text-slate-400 select-none italic text-center font-mono">
              Inbox is auto-delivered
            </div>
          )}
        </div>
      </div>

      {/* Logs Table */}
      {filteredMessages.length === 0 ? (
        <div className="text-center p-12 bg-slate-50 border border-slate-200/30 rounded-xl text-xs text-slate-500 flex flex-col items-center justify-center gap-1">
          <Inbox className="w-6 h-6 text-slate-400 mb-1" />
          <span className="font-semibold text-slate-700">No matching SMS logs found</span>
          <p className="text-slate-400 text-[11px]">
            {activeTab === 'outbox' 
              ? "Send a text message from the Dispatcher above or trigger one via API client." 
              : "Simulate an incoming message from the Phone Simulator console."}
          </p>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <th className="p-3 w-16">Dir</th>
                <th className="p-3 w-28">Contact</th>
                <th className="p-3">SMS Text Content</th>
                <th className="p-3 w-24">SIM / Carrier</th>
                <th className="p-3 w-24">Gateway Phone</th>
                <th className="p-3 w-28">Delivery Status</th>
                <th className="p-3 w-24 text-right">Time</th>
                <th className="p-3 w-12 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMessages.map((msg) => {
                const gw = gateways.find((g) => g.id === msg.gatewayId);
                const isFailed = msg.status === "failed";
                const simCarrierName = msg.simSlot === 1 
                  ? (gw?.sim1Carrier || "SIM 1") 
                  : (gw?.sim2Carrier || "SIM 2");

                return (
                  <tr key={msg.id} className="hover:bg-slate-50 transition-colors leading-relaxed">
                    {/* Direction icon */}
                    <td className="p-3">
                      {msg.type === 'outbox' ? (
                        <span className="inline-flex p-1 bg-indigo-50 border border-indigo-100/50 text-indigo-600 rounded-lg" title="Outbox (Sent)">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span className="inline-flex p-1 bg-emerald-50 border border-emerald-100/50 text-emerald-600 rounded-lg" title="Inbox (Received)">
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </td>

                    {/* Recipient / Sender */}
                    <td className="p-3 font-mono text-[11px] font-semibold text-slate-800 whitespace-nowrap">
                      {msg.type === 'outbox' ? msg.to : msg.from}
                    </td>

                    {/* Content */}
                    <td className="p-3 text-slate-600 max-w-[280px]">
                      <span className="block break-words whitespace-pre-wrap">{msg.message}</span>
                      {isFailed && msg.error && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-rose-600 mt-1 font-mono font-bold bg-rose-50 border border-rose-100 p-0.5 px-1.5 rounded">
                          <AlertCircle className="w-3 h-3" />
                          <span>Cellular Fail: {msg.error}</span>
                        </span>
                      )}
                    </td>

                    {/* SIM slot */}
                    <td className="p-3 whitespace-nowrap font-mono text-[10px] text-slate-500">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-600">SIM Slot {msg.simSlot}</span>
                        <span className="text-[9px] text-slate-400 truncate max-w-[100px]" title={simCarrierName}>
                          {simCarrierName}
                        </span>
                      </div>
                    </td>

                    {/* Gateway device name */}
                    <td className="p-3 whitespace-nowrap text-slate-600 text-[11px]">
                      {gw ? gw.name : <span className="text-slate-400 italic">Deleted Phone</span>}
                    </td>

                    {/* Delivery reports status */}
                    <td className="p-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize tracking-wide ${statusColors[msg.status]}`}>
                        {msg.status === "delivered" && <CheckCircle2 className="w-3 h-3" />}
                        {msg.status === "failed" && <AlertCircle className="w-3 h-3" />}
                        {msg.status === "sending" && <RefreshCw className="w-3 h-3 animate-spin" />}
                        <span>{msg.status}</span>
                      </span>
                    </td>

                    {/* Timestamps */}
                    <td className="p-3 text-right whitespace-nowrap text-slate-400 text-[10px] font-mono">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="font-semibold text-slate-500">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          {new Date(msg.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </td>

                    {/* Action buttons (Retry / Delete) */}
                    <td className="p-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        {msg.type === "outbox" && isFailed && (
                          <button
                            onClick={() => handleRetryMessage(msg.id)}
                            disabled={isRetryingId === msg.id}
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Retry sending SMS"
                          >
                            {isRetryingId === msg.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                            ) : (
                              <RefreshCw className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteLog(msg.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Log"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
