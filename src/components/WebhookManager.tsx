/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Webhook, WebhookLog } from "../types";
import { 
  Webhook as WebhookIcon, 
  Trash2, 
  Plus, 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Link2, 
  ShieldAlert,
  Loader2,
  RefreshCw
} from "lucide-react";

interface WebhookManagerProps {
  webhooks: Webhook[];
  webhookLogs: WebhookLog[];
  onReload: () => void;
}

export default function WebhookManager({ webhooks, webhookLogs, onReload }: WebhookManagerProps) {
  const [newUrl, setNewUrl] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  const handleAddWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;

    // Validate URL
    try {
      new URL(newUrl);
    } catch {
      alert("Please enter a valid HTTP/HTTPS URL (e.g. https://httpbin.org/post)");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newUrl, events: ["sms.received"] })
      });

      if (response.ok) {
        setNewUrl("");
        onReload();
      } else {
        alert("Failed to register webhook endpoint.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm("Are you sure you want to delete this webhook? Logs will also be cleaned.")) return;

    try {
      const response = await fetch(`/api/webhooks/${id}`, {
        method: "DELETE"
      });
      if (response.ok) {
        onReload();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTestWebhook = async (id: string) => {
    setTestingId(id);
    try {
      const response = await fetch(`/api/webhooks/${id}/test`, {
        method: "POST"
      });
      if (response.ok) {
        onReload();
      } else {
        const errData = await response.json();
        alert(`Test Dispatch Error: ${errData.error || "Unknown server error"}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <WebhookIcon className="w-5 h-5 text-indigo-600" />
            Webhook Receivers (Forward Received SMS)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Whenever any Android phone receives an SMS, the SaaS instantly dispatches a POST request to these endpoints.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Add/View Webhooks */}
        <div className="lg:col-span-1 flex flex-col gap-5 border-r border-slate-100 pr-0 lg:pr-6">
          <form onSubmit={handleAddWebhook} className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Register Webhook Endpoint</h3>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-600 font-medium">Endpoint URL</label>
              <input
                type="text"
                required
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://yourdomain.com/sms/webhook"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white disabled:bg-slate-200 disabled:text-slate-500 font-semibold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Webhook</span>
                </>
              )}
            </button>
          </form>

          {/* Webhooks List */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Active Endpoints</h3>
            {webhooks.length === 0 ? (
              <div className="text-center p-6 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-500">
                No webhook endpoints registered.
              </div>
            ) : (
              <div className="space-y-3">
                {webhooks.map((wh) => (
                  <div key={wh.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col gap-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-slate-800 font-mono text-[11px] font-semibold break-all leading-snug">
                          <Link2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{wh.url}</span>
                        </div>
                        <span className="inline-block mt-1 px-1.5 py-0.5 bg-indigo-50 border border-indigo-100 text-[9px] font-bold uppercase tracking-wider text-indigo-700 rounded-md">
                          sms.received
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteWebhook(wh.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Webhook"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="border-t border-slate-200/60 pt-2.5 flex items-center justify-between">
                      <div className="text-[10px] text-slate-500">
                        <span className="block font-semibold">Verification Secret:</span>
                        <code className="font-mono text-slate-600 block truncate max-w-[140px]">{wh.secret}</code>
                      </div>
                      <button
                        onClick={() => handleTestWebhook(wh.id)}
                        disabled={testingId !== null}
                        className="p-1 px-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-[10px] rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {testingId === wh.id ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Pinging...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 fill-white text-white" />
                            <span>Test Ping</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Webhook logs (2/3 col-span) */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Webhook Delivery Logs (Real-time)</h3>
            <button 
              onClick={onReload}
              className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-[10px] font-medium"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh Logs
            </button>
          </div>

          {webhookLogs.length === 0 ? (
            <div className="text-center p-12 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
              <CheckCircle className="w-6 h-6 text-slate-400" />
              <span>No webhook dispatches captured yet.</span>
              <p className="text-[10px] text-slate-400 max-w-[280px]">
                Trigger a "Test Ping" above or use the Android Simulator on the right to receive an incoming message.
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[460px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="p-3">Status</th>
                    <th className="p-3">Webhook Endpoint URL</th>
                    <th className="p-3">Event</th>
                    <th className="p-3">Payload Preview</th>
                    <th className="p-3 text-right">Dispatched At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {webhookLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 align-top whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {log.status === "success" ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                          )}
                          <span className={`font-semibold ${log.status === "success" ? "text-emerald-700" : "text-rose-700"}`}>
                            {log.statusCode || "ERR"}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 align-top font-mono text-[10px] max-w-[180px] truncate" title={log.url}>
                        {log.url}
                      </td>
                      <td className="p-3 align-top whitespace-nowrap text-[10px]">
                        <code className="bg-slate-100 text-slate-600 p-0.5 px-1 rounded text-[9px] font-semibold">{log.event}</code>
                      </td>
                      <td className="p-3 align-top font-mono text-[10px] text-slate-500 max-w-[220px] break-all leading-normal">
                        {log.error ? (
                          <span className="text-rose-500 italic block font-sans">Error: {log.error}</span>
                        ) : null}
                        <span className="line-clamp-2 block bg-slate-950 text-slate-300 p-1.5 rounded-md text-[9px] leading-relaxed max-h-12 overflow-hidden">
                          {log.payload}
                        </span>
                      </td>
                      <td className="p-3 align-top whitespace-nowrap text-right text-slate-400 text-[10px] font-mono">
                        <div className="flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3 text-slate-300" />
                          <span>{new Date(log.createdAt).toLocaleTimeString()}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
