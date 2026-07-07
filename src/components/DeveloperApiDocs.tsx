/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { ApiKey, Webhook } from "../types";
import { Copy, Check, Terminal, Shield, Code, Server, HelpCircle } from "lucide-react";

interface DeveloperApiDocsProps {
  apiKeys: ApiKey[];
  webhooks: Webhook[];
}

export default function DeveloperApiDocs({ apiKeys, webhooks }: DeveloperApiDocsProps) {
  const [activeTab, setActiveTab] = useState<'curl' | 'node' | 'python'>('curl');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const activeKeyStr = apiKeys.length > 0 ? apiKeys[0].key : "sms_live_your_api_key_here";
  const activeSecretStr = webhooks.length > 0 ? webhooks[0].secret : "whsec_your_webhook_signing_secret";

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const codeSnippets = {
    curl: `# Send SMS via programmatically registered Android Gateways
curl -X POST \${window.location.origin || "http://localhost:3000"}/api/v1/send \\
  -H "Authorization: Bearer ${activeKeyStr}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "+15550199002",
    "message": "SaaS programmatic broadcast alert: Emergency core servers are running hot! Check cooling systems.",
    "simSlot": 1,
    "priority": "high"
  }'`,

    node: `// Programmatic Node.js SMS dispatch script
const payload = {
  to: "+15550199002",
  message: "SaaS programmatic broadcast alert: Emergency core servers are running hot! Check cooling systems.",
  simSlot: 1,
  priority: "high"
};

fetch("\${window.location.origin || "http://localhost:3000"}/api/v1/send", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${activeKeyStr}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify(payload)
})
.then(res => res.json())
.then(data => console.log("SMS Queued successfully. ID:", data.id))
.catch(err => console.error("Error sending SMS:", err));`,

    python: `# Programmatic Python SMS dispatch using requests
import requests

url = "\${window.location.origin || "http://localhost:3000"}/api/v1/send"
headers = {
    "Authorization": "Bearer ${activeKeyStr}",
    "Content-Type": "application/json"
}
payload = {
    "to": "+15550199002",
    "message": "SaaS programmatic broadcast alert: Emergency core servers are running hot! Check cooling systems.",
    "simSlot": 1,
    "priority": "high"
}

response = requests.post(url, headers=headers, json=payload)
data = response.json()
print(f"SMS Queued status: {data.get('status')} | Message ID: {data.get('id')}")`
  };

  const webhookVerificationNode = `// Webhook express.js receiver signature verification
const crypto = require("crypto");

app.post("/webhook", (req, res) => {
  const signature = req.headers["x-sms-gateway-signature"];
  const payloadString = JSON.stringify(req.body);
  const secret = "${activeSecretStr}";
  
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payloadString)
    .digest("hex");

  if (signature === expectedSignature) {
    console.log("Verified. Received incoming SMS from gateway:", req.body.data.message);
    res.sendStatus(200);
  } else {
    console.error("Signature verification failed. Untrusted payload.");
    res.sendStatus(401);
  }
});`;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-600" />
            SaaS Developer API Integration
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Programmatically queue SMS messages and securely receive incoming SMS webhook web sockets.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Sending Documentation */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-semibold text-slate-800">1. REST API Sending Client</h3>
          </div>
          
          <p className="text-xs text-slate-600 leading-relaxed">
            Trigger cellular SMS dispatches directly from your backend servers or custom apps. Deliveries are processed FIFO by your designated gateways.
          </p>

          {/* Code Tabs */}
          <div className="flex items-center border-b border-slate-100 gap-2">
            {(['curl', 'node', 'python'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-2 px-3 text-xs font-semibold capitalize border-b-2 transition-all cursor-pointer ${
                  activeTab === tab 
                    ? "border-indigo-600 text-indigo-600" 
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                {tab === 'curl' ? 'cURL' : tab === 'node' ? 'Node.js' : 'Python'}
              </button>
            ))}
          </div>

          <div className="relative">
            <pre className="bg-slate-950 text-slate-300 font-mono text-[11px] leading-relaxed p-4 rounded-xl overflow-x-auto border border-slate-800 max-h-72">
              <code>{codeSnippets[activeTab]}</code>
            </pre>
            <button
              onClick={() => handleCopy(codeSnippets[activeTab], activeTab)}
              className="absolute top-2.5 right-2.5 p-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg flex items-center gap-1 text-[10px] font-medium font-sans border border-slate-700/50 transition-colors cursor-pointer"
            >
              {copiedKey === activeTab ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Webhook HMAC Documentation */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-semibold text-slate-800">2. Secure Webhook HMAC Signing</h3>
          </div>
          
          <p className="text-xs text-slate-600 leading-relaxed">
            When a phone receives an incoming SMS, the SaaS dispatches a secure <code className="bg-slate-100 text-indigo-600 p-0.5 rounded font-mono px-1">POST</code> request to your webhook with an HMAC signature header.
          </p>

          <div className="bg-indigo-50/50 border border-indigo-100/60 rounded-xl p-3 flex gap-2.5">
            <Server className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
            <div className="text-[11px] leading-relaxed text-indigo-900">
              <span className="font-semibold block">Signature Header</span>
              The header <code className="font-mono bg-indigo-100/50 p-0.5 px-1 rounded">X-SMS-Gateway-Signature</code> is computed by signing the raw payload body with your Webhook Secret using HMAC SHA-256.
            </div>
          </div>

          <div className="relative">
            <pre className="bg-slate-950 text-slate-300 font-mono text-[11px] leading-relaxed p-4 rounded-xl overflow-x-auto border border-slate-800 max-h-72">
              <code>{webhookVerificationNode}</code>
            </pre>
            <button
              onClick={() => handleCopy(webhookVerificationNode, 'webhook-verify')}
              className="absolute top-2.5 right-2.5 p-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg flex items-center gap-1 text-[10px] font-medium font-sans border border-slate-700/50 transition-colors cursor-pointer"
            >
              {copiedKey === 'webhook-verify' ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
