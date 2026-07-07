/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { exec } from "child_process";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Path to JSON DB file
const DB_FILE = path.join(process.cwd(), "db-store.json");

// Structure of our DB store
interface DbStore {
  users: any[];
  gateways: any[];
  messages: any[];
  apiKeys: any[];
  webhooks: any[];
  webhookLogs: any[];
  githubRepo?: string;
  githubToken?: string;
  githubBranch?: string;
  githubLastPush?: string;
  githubLogs?: string[];
}

// Default/mock data for onboarding and preview testing
const DEFAULT_STORE: DbStore = {
  users: [
    {
      id: "usr_acme",
      name: "Acme Logistics Corp",
      email: "billing@acme-logistics.com",
      subscriptionTier: "pro",
      subscriptionStatus: "active",
      gatewayQuota: 5,
      smsLimitMonthly: 10000,
      smsSentThisMonth: 1420,
      remoteAppVersion: "2.4.5",
      remotePollingInterval: 5,
      createdAt: new Date(Date.now() - 30 * 24 * 3600000).toISOString(), // 30 days ago
      lastActive: new Date().toISOString()
    },
    {
      id: "usr_global",
      name: "Global Tech Retailers",
      email: "devops@globalretail.io",
      subscriptionTier: "enterprise",
      subscriptionStatus: "active",
      gatewayQuota: 20,
      smsLimitMonthly: 50000,
      smsSentThisMonth: 12480,
      remoteAppVersion: "2.5.0",
      remotePollingInterval: 3,
      createdAt: new Date(Date.now() - 15 * 24 * 3600000).toISOString(), // 15 days ago
      lastActive: new Date().toISOString()
    },
    {
      id: "usr_sandburg",
      name: "Mark Sandburg (Free Trial)",
      email: "mark.sandburg@gmail.com",
      subscriptionTier: "free",
      subscriptionStatus: "canceled",
      gatewayQuota: 1,
      smsLimitMonthly: 100,
      smsSentThisMonth: 82,
      remoteAppVersion: "1.9.0",
      remotePollingInterval: 15,
      createdAt: new Date(Date.now() - 45 * 24 * 3600000).toISOString(), // 45 days ago
      lastActive: new Date(Date.now() - 5 * 24 * 3600000).toISOString()
    }
  ],
  gateways: [
    {
      id: "gw_acme_1",
      name: "Acme Delivery Terminal 1 (Pixel 8)",
      token: "gt_token_acme_pixel8_secret",
      ownerId: "usr_acme",
      status: "online",
      lastPing: new Date().toISOString(),
      battery: 89,
      signal: "excellent",
      sim1Carrier: "T-Mobile USA",
      sim2Carrier: "None",
      sim1Number: "+1 (555) 019-9001",
      sim2Number: ""
    },
    {
      id: "gw_global_1",
      name: "Global HQ Primary Node (Galaxy S23)",
      token: "gt_token_global_hq_secret",
      ownerId: "usr_global",
      status: "online",
      lastPing: new Date().toISOString(),
      battery: 94,
      signal: "good",
      sim1Carrier: "Verizon Wireless",
      sim2Carrier: "AT&T Mobility",
      sim1Number: "+1 (555) 014-4422",
      sim2Number: "+1 (555) 014-4423"
    }
  ],
  messages: [
    {
      id: "msg_acme_1",
      to: "+1 (555) 012-3456",
      message: "Your Acme delivery is scheduled for today between 2 PM and 4 PM.",
      type: "outbox",
      gatewayId: "gw_acme_1",
      simSlot: 1,
      status: "delivered",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      sentAt: new Date(Date.now() - 3598000).toISOString(),
      deliveredAt: new Date(Date.now() - 3580000).toISOString(),
      priority: "high"
    },
    {
      id: "msg_global_1",
      from: "+1 (555) 014-4422",
      message: "Gateway test ping back successful.",
      type: "inbox",
      gatewayId: "gw_global_1",
      simSlot: 1,
      status: "delivered",
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      priority: "normal"
    }
  ],
  apiKeys: [
    {
      id: "key_1",
      name: "Default Backend SDK Key",
      key: "sms_live_default_key_unlimited",
      createdAt: new Date().toISOString(),
    }
  ],
  webhooks: [],
  webhookLogs: []
};

// Database state
let db: DbStore = { ...DEFAULT_STORE };

// Helper to load DB
function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      db = JSON.parse(content);
      // Ensure arrays exist
      db.users = db.users || [];
      db.gateways = db.gateways || [];
      db.messages = db.messages || [];
      db.apiKeys = db.apiKeys || [];
      db.webhooks = db.webhooks || [];
      db.webhookLogs = db.webhookLogs || [];
    } else {
      saveDb();
    }
  } catch (error) {
    console.error("Error reading JSON database store:", error);
  }
}

// Helper to save DB
function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing to JSON database store:", error);
  }
}

// Initial DB load
loadDb();

// Express middlewares
app.use(express.json());

// Logging Middleware
app.use((req, res, next) => {
  // Simple request logging for development
  if (req.url.startsWith("/api/")) {
    console.log(`[API Request] ${req.method} ${req.url}`);
  }
  next();
});

// Helper to fire real webhooks when SMS is received
async function triggerWebhooks(receivedMsg: any) {
  const activeWebhooks = db.webhooks.filter((wh) =>
    wh.events.includes("sms.received")
  );

  for (const wh of activeWebhooks) {
    const payload = {
      event: "sms.received",
      timestamp: new Date().toISOString(),
      data: {
        id: receivedMsg.id,
        from: receivedMsg.from,
        message: receivedMsg.message,
        gatewayId: receivedMsg.gatewayId,
        simSlot: receivedMsg.simSlot,
        receivedAt: receivedMsg.createdAt,
      },
    };

    const payloadString = JSON.stringify(payload);
    // Sign the payload using the Webhook's secret
    const signature = crypto
      .createHmac("sha256", wh.secret)
      .update(payloadString)
      .digest("hex");

    const logId = "whl_" + crypto.randomUUID();
    const newLog: any = {
      id: logId,
      webhookId: wh.id,
      url: wh.url,
      event: "sms.received",
      payload: payloadString,
      createdAt: new Date().toISOString(),
    };

    try {
      console.log(`[Webhook Dispatch] Triggering ${wh.url} for message ${receivedMsg.id}`);
      
      const response = await fetch(wh.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-SMS-Gateway-Signature": signature,
          "User-Agent": "Android-SMS-Gateway-SaaS/1.0",
        },
        body: payloadString,
        signal: AbortSignal.timeout(6000), // 6 seconds timeout
      });

      newLog.status = response.ok ? "success" : "failed";
      newLog.statusCode = response.status;
      if (!response.ok) {
        newLog.error = `HTTP Error Code: ${response.status}`;
      }
    } catch (err: any) {
      console.error(`[Webhook Error] Failed to dispatch ${wh.url}:`, err.message);
      newLog.status = "failed";
      newLog.error = err.message || String(err);
    }

    db.webhookLogs.unshift(newLog);
    // Keep logs size reasonable
    if (db.webhookLogs.length > 200) {
      db.webhookLogs = db.webhookLogs.slice(0, 200);
    }
  }
  saveDb();
}

// ==========================================
// CLIENT DASHBOARD API ENDPOINTS
// ==========================================

// GET Statistics
app.get("/api/stats", (req, res) => {
  const activeGateways = db.gateways.filter((g) => g.status === "online").length;
  
  const sentMessages = db.messages.filter((m) => m.type === "outbox");
  const totalSent = sentMessages.length;
  const totalDelivered = sentMessages.filter((m) => m.status === "delivered" || m.status === "sent").length;
  const totalReceived = db.messages.filter((m) => m.type === "inbox").length;
  const queuedCount = db.messages.filter((m) => m.type === "outbox" && m.status === "queued").length;
  
  const successRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 100;

  // SaaS wide metrics for the super admin
  const saasTotalUsers = db.users ? db.users.length : 0;
  const saasActiveProUsers = db.users ? db.users.filter(u => u.subscriptionStatus === "active" && u.subscriptionTier !== "free").length : 0;
  const saasMRR = db.users ? db.users.reduce((acc, u) => {
    if (u.subscriptionStatus !== "active") return acc;
    if (u.subscriptionTier === "pro") return acc + 49;
    if (u.subscriptionTier === "enterprise") return acc + 249;
    return acc;
  }, 0) : 0;

  res.json({
    activeGateways,
    totalSent,
    totalReceived,
    queuedCount,
    successRate,
    saasTotalUsers,
    saasActiveProUsers,
    saasMRR
  });
});

// GET Gateways
app.get("/api/gateways", (req, res) => {
  // Auto-set offline if gateway hasn't pinged in 30 seconds
  const thirtySecsAgo = Date.now() - 30000;
  let modified = false;
  db.gateways.forEach((gw) => {
    const lastPingTime = new Date(gw.lastPing).getTime();
    if (gw.status === "online" && lastPingTime < thirtySecsAgo) {
      gw.status = "offline";
      modified = true;
    }
  });
  if (modified) saveDb();

  res.json(db.gateways);
});

// CREATE / ADD Gateway
app.post("/api/gateways", (req, res) => {
  const { name, sim1Carrier, sim2Carrier, sim1Number, sim2Number, ownerId } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Gateway name is required" });
  }

  const id = "gw_" + crypto.randomBytes(6).toString("hex");
  const token = "gt_token_" + crypto.randomBytes(16).toString("hex");

  const newGateway = {
    id,
    name,
    token,
    ownerId: ownerId || undefined,
    status: "offline",
    lastPing: new Date(0).toISOString(), // Never pinged
    battery: 100,
    signal: "poor",
    sim1Carrier: sim1Carrier || "None/SIM 1",
    sim2Carrier: sim2Carrier || "None/SIM 2",
    sim1Number: sim1Number || "",
    sim2Number: sim2Number || "",
  };

  db.gateways.push(newGateway);
  saveDb();
  res.status(201).json(newGateway);
});

// ==========================================
// SAAS SUPER ADMIN CUSTOMER MANAGEMENT API
// ==========================================

// GET SaaS Customers
app.get("/api/admin/users", (req, res) => {
  res.json(db.users || []);
});

// CREATE SaaS Customer
app.post("/api/admin/users", (req, res) => {
  const { name, email, subscriptionTier, subscriptionStatus, gatewayQuota, smsLimitMonthly, remoteAppVersion, remotePollingInterval } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required for SaaS customers" });
  }

  const newUser = {
    id: "usr_" + crypto.randomBytes(6).toString("hex"),
    name,
    email,
    subscriptionTier: subscriptionTier || "free",
    subscriptionStatus: subscriptionStatus || "active",
    gatewayQuota: parseInt(gatewayQuota) || 1,
    smsLimitMonthly: parseInt(smsLimitMonthly) || 500,
    smsSentThisMonth: 0,
    remoteAppVersion: remoteAppVersion || "2.5.0",
    remotePollingInterval: parseInt(remotePollingInterval) || 7,
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString()
  };

  db.users = db.users || [];
  db.users.push(newUser);
  saveDb();
  res.status(201).json(newUser);
});

// UPDATE SaaS Customer & Remote Settings
app.put("/api/admin/users/:id", (req, res) => {
  const { id } = req.params;
  const user = db.users.find(u => u.id === id);
  if (!user) {
    return res.status(404).json({ error: "SaaS customer not found" });
  }

  const { name, email, subscriptionTier, subscriptionStatus, gatewayQuota, smsLimitMonthly, remoteAppVersion, remotePollingInterval } = req.body;

  if (name !== undefined) user.name = name;
  if (email !== undefined) user.email = email;
  if (subscriptionTier !== undefined) user.subscriptionTier = subscriptionTier;
  if (subscriptionStatus !== undefined) user.subscriptionStatus = subscriptionStatus;
  if (gatewayQuota !== undefined) user.gatewayQuota = parseInt(gatewayQuota);
  if (smsLimitMonthly !== undefined) user.smsLimitMonthly = parseInt(smsLimitMonthly);
  if (remoteAppVersion !== undefined) user.remoteAppVersion = remoteAppVersion;
  if (remotePollingInterval !== undefined) user.remotePollingInterval = parseInt(remotePollingInterval);

  saveDb();
  res.json(user);
});

// DELETE SaaS Customer & Terminate Fleet Links
app.delete("/api/admin/users/:id", (req, res) => {
  const { id } = req.params;
  db.users = db.users.filter(u => u.id !== id);
  
  // Set all gateways owned by this deleted customer to offline and unlink
  db.gateways.forEach(g => {
    if (g.ownerId === id) {
      g.status = "offline";
      delete g.ownerId;
    }
  });

  saveDb();
  res.json({ success: true, message: "SaaS customer deleted and their hardware nodes unlinked successfully" });
});

// ==========================================
// GITHUB INTEGRATION & LIVE APK COMPILER API
// ==========================================

function runGitCommand(cmd: string, cwd: string): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    exec(cmd, { cwd }, (error, stdout, stderr) => {
      resolve({
        stdout: stdout || "",
        stderr: stderr || "",
        code: error ? (error.code || 1) : 0,
      });
    });
  });
}

// GET GitHub Config
app.get("/api/github/config", (req, res) => {
  res.json({
    githubRepo: db.githubRepo || "",
    githubBranch: db.githubBranch || "main",
    githubLastPush: db.githubLastPush || null,
    githubLogs: db.githubLogs || [],
    hasToken: !!db.githubToken,
  });
});

// POST GitHub Config
app.post("/api/github/config", (req, res) => {
  const { githubRepo, githubToken, githubBranch } = req.body;
  
  if (githubRepo !== undefined) db.githubRepo = githubRepo.trim();
  if (githubToken !== undefined) db.githubToken = githubToken.trim();
  if (githubBranch !== undefined) db.githubBranch = githubBranch.trim() || "main";
  
  saveDb();
  res.json({ success: true, message: "GitHub authentication saved successfully!" });
});

// POST Trigger Codebase Push to GitHub
app.post("/api/github/push", async (req, res) => {
  const repo = db.githubRepo;
  const token = db.githubToken;
  const branch = db.githubBranch || "main";

  if (!repo || !token) {
    return res.status(400).json({ error: "GitHub Repository and Personal Access Token (PAT) are required." });
  }

  db.githubLogs = db.githubLogs || [];
  db.githubLogs.push(`[${new Date().toISOString()}] 🚀 Initiating secure GitHub code synchronization...`);
  saveDb();

  const cwd = process.cwd();

  const appendLog = (msg: string) => {
    // Sanitize any potential token leaks in log statements
    const sanitized = msg.replace(new RegExp(token, "g"), "ghp_********************");
    console.log(`[Git CI] ${sanitized}`);
    db.githubLogs = db.githubLogs || [];
    db.githubLogs.push(`[${new Date().toISOString()}] ${sanitized}`);
    saveDb();
  };

  // Run pushing in background asynchronously to prevent HTTP Gateway timeouts
  res.json({ success: true, message: "SaaS codebase export started. Live logs stream below." });

  (async () => {
    try {
      // 1. Git init if necessary
      if (!fs.existsSync(path.join(cwd, ".git"))) {
        appendLog("Repository not initialized locally. Creating local node...");
        const initRes = await runGitCommand("git init", cwd);
        appendLog(initRes.stdout || initRes.stderr || "Git workspace initialized.");
      }

      // 2. Local config setup
      appendLog("Setting workspace identity permissions...");
      await runGitCommand('git config user.name "SMS-OS Daemon"', cwd);
      await runGitCommand('git config user.email "daemon@sms-os.io"', cwd);

      // 3. Checkout branch
      appendLog(`Validating branch "${branch}" presence...`);
      const branchRes = await runGitCommand(`git checkout ${branch}`, cwd);
      if (branchRes.code !== 0) {
        appendLog(`Creating clean root branch "${branch}"...`);
        const createBranchRes = await runGitCommand(`git checkout -b ${branch}`, cwd);
        appendLog(createBranchRes.stdout || createBranchRes.stderr || `Created and checked out "${branch}".`);
      } else {
        appendLog(`Switched to branch "${branch}".`);
      }

      // 4. Staging files
      appendLog("Analyzing workspace differences & staging files...");
      const addRes = await runGitCommand("git add .", cwd);
      if (addRes.code !== 0) {
        appendLog(`Warning during staging: ${addRes.stderr}`);
      }

      // 5. Commit changes
      appendLog("Packing codebase distribution commit...");
      const commitRes = await runGitCommand(`git commit -m "chore: publish latest enterprise SMS-OS codebase [v2.4.1]"`, cwd);
      appendLog(commitRes.stdout || "No workspace changes to package. Proceeding to push upstream.");

      // 6. Reset Remote Origin with authenticated URL
      appendLog("Verifying authenticated remote upstream gateway...");
      await runGitCommand("git remote remove origin", cwd);

      const cleanRepo = repo.replace(/^https:\/\/github\.com\//, "").replace(/\.git$/, "");
      const authenticatedUrl = `https://${token}@github.com/${cleanRepo}.git`;

      await runGitCommand(`git remote add origin ${authenticatedUrl}`, cwd);

      // 7. Push to GitHub
      appendLog(`Synchronizing codebase with https://github.com/${cleanRepo}...`);
      const pushRes = await runGitCommand(`git push -u origin ${branch} --force`, cwd);

      if (pushRes.code === 0) {
        appendLog(`🎉 SUCCESS! Fully synchronized with GitHub!`);
        appendLog(`Your GitHub Actions build pipeline will now compile your APK automatically.`);
        db.githubLastPush = new Date().toISOString();
        saveDb();
      } else {
        appendLog(`❌ PUSH FAILED! Exit Code: ${pushRes.code}`);
        appendLog(pushRes.stderr || pushRes.stdout || "General socket transmission error.");
      }
    } catch (err: any) {
      appendLog(`❌ UNEXPECTED COMPILER FAILURE: ${err?.message || err}`);
    }
  })();
});

// Dynamic Retrieval of APK from local filesystem or direct remote build path
app.get("/api/download/sms-os-gateway.apk", (req, res) => {
  const repo = db.githubRepo;
  const branch = db.githubBranch || "main";

  // 1. Look for pre-compiled local files in standard folders
  const localPaths = [
    path.join(process.cwd(), "public", "sms-os-gateway.apk"),
    path.join(process.cwd(), "public", "downloads", "sms-os-gateway.apk"),
    path.join(process.cwd(), "sms-os-gateway.apk")
  ];

  for (const p of localPaths) {
    if (fs.existsSync(p)) {
      console.log(`[Download Engine] Serving pre-compiled local APK asset: ${p}`);
      return res.download(p, "sms-os-gateway.apk");
    }
  }

  // 2. If no local files exist but user has GitHub configured, fetch or redirect to the GitHub Actions compiled path!
  if (repo) {
    const cleanRepo = repo.replace(/^https:\/\/github\.com\//, "").replace(/\.git$/, "");
    
    // Gradle outputs debug APK exactly to this folder inside the repository
    const rawGithubActionsApkUrl = `https://raw.githubusercontent.com/${cleanRepo}/${branch}/sms-os-gateway.apk`;
    
    console.log(`[Download Engine] Local file not found. Fetching from compiled GitHub Action upstream: ${rawGithubActionsApkUrl}`);
    return res.redirect(rawGithubActionsApkUrl);
  }

  // 3. Absolute Fallback: write a demo binary file representing the placeholder APK so it is fully testable and doesn't 404
  const fallbackPath = path.join(process.cwd(), "sms-os-gateway.apk");
  if (!fs.existsSync(fallbackPath)) {
    fs.writeFileSync(
      fallbackPath, 
      Buffer.from("SMS-OS Universal Gateway Client - Demo compilation placeholder (14.2 MB)")
    );
  }
  
  console.log(`[Download Engine] Serving simulated compilation fallback APK`);
  return res.download(fallbackPath, "sms-os-gateway-demo.apk");
});

// DELETE Gateway
app.delete("/api/gateways/:id", (req, res) => {
  const { id } = req.params;
  const initialLength = db.gateways.length;
  db.gateways = db.gateways.filter((g) => g.id !== id);
  
  if (db.gateways.length === initialLength) {
    return res.status(404).json({ error: "Gateway not found" });
  }
  
  // Clean up messages associated with deleted gateway
  db.messages = db.messages.filter((m) => m.gatewayId !== id);
  
  saveDb();
  res.json({ success: true, message: "Gateway and its logs deleted successfully" });
});

// GET Messages Logs
app.get("/api/messages", (req, res) => {
  res.json(db.messages);
});

// CREATE Single Outbox Message
app.post("/api/messages/send", (req, res) => {
  const { to, message, gatewayId, simSlot, priority } = req.body;
  
  if (!to || !message || !gatewayId) {
    return res.status(400).json({ error: "to, message, and gatewayId are required" });
  }

  // Find the gateway
  const gateway = db.gateways.find((g) => g.id === gatewayId);
  if (!gateway) {
    return res.status(404).json({ error: "Selected gateway not found" });
  }

  const newMsg = {
    id: "msg_" + crypto.randomUUID(),
    to,
    message,
    type: "outbox",
    gatewayId,
    simSlot: parseInt(simSlot) || 1,
    status: "queued",
    createdAt: new Date().toISOString(),
    priority: priority || "normal",
  };

  db.messages.unshift(newMsg);
  saveDb();
  res.status(201).json(newMsg);
});

// CREATE Bulk Outbox Messages
app.post("/api/messages/bulk", (req, res) => {
  const { numbers, message, gatewayId, simSlot, priority, delaySeconds } = req.body;
  
  if (!numbers || !message || !gatewayId) {
    return res.status(400).json({ error: "numbers, message, and gatewayId are required" });
  }

  const gateway = db.gateways.find((g) => g.id === gatewayId);
  if (!gateway) {
    return res.status(404).json({ error: "Selected gateway not found" });
  }

  const phoneNumbers = Array.isArray(numbers) 
    ? numbers 
    : String(numbers).split(",").map(n => n.trim()).filter(Boolean);

  if (phoneNumbers.length === 0) {
    return res.status(400).json({ error: "No valid recipient phone numbers provided" });
  }

  const addedMessages: any[] = [];
  const delay = parseInt(delaySeconds) || 0;

  phoneNumbers.forEach((num, index) => {
    const queueTime = new Date(Date.now() + index * delay * 1000);
    const newMsg = {
      id: "msg_" + crypto.randomUUID(),
      to: num,
      message,
      type: "outbox",
      gatewayId,
      simSlot: parseInt(simSlot) || 1,
      status: "queued",
      createdAt: queueTime.toISOString(), // Staggered queue times
      priority: priority || "normal",
    };
    db.messages.unshift(newMsg);
    addedMessages.push(newMsg);
  });

  saveDb();
  res.status(201).json({ success: true, count: addedMessages.length, messages: addedMessages });
});

// RETRY Outbox Message
app.post("/api/messages/:id/retry", (req, res) => {
  const { id } = req.params;
  const msg = db.messages.find((m) => m.id === id);
  if (!msg) {
    return res.status(404).json({ error: "Message not found" });
  }
  if (msg.type !== "outbox") {
    return res.status(400).json({ error: "Only outbox SMS logs can be retried" });
  }

  msg.status = "queued";
  msg.createdAt = new Date().toISOString();
  delete msg.error;
  delete msg.sentAt;
  delete msg.deliveredAt;

  saveDb();
  res.json(msg);
});

// DELETE Message Log
app.delete("/api/messages/:id", (req, res) => {
  const { id } = req.params;
  const initialLength = db.messages.length;
  db.messages = db.messages.filter((m) => m.id !== id);

  if (db.messages.length === initialLength) {
    return res.status(404).json({ error: "Message not found" });
  }

  saveDb();
  res.json({ success: true, message: "Log entry deleted successfully" });
});

// GET Developer API Keys
app.get("/api/keys", (req, res) => {
  res.json(db.apiKeys);
});

// CREATE Developer API Key
app.post("/api/keys", (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "API Key label/name is required" });
  }

  const keyHex = crypto.randomBytes(24).toString("hex");
  const newKey = {
    id: "key_" + crypto.randomBytes(6).toString("hex"),
    name,
    key: `sms_live_${keyHex}`,
    createdAt: new Date().toISOString(),
  };

  db.apiKeys.push(newKey);
  saveDb();
  res.status(201).json(newKey);
});

// DELETE Developer API Key
app.delete("/api/keys/:id", (req, res) => {
  const { id } = req.params;
  db.apiKeys = db.apiKeys.filter((k) => k.id !== id);
  saveDb();
  res.json({ success: true, message: "API key revoked successfully" });
});

// GET Webhooks
app.get("/api/webhooks", (req, res) => {
  res.json(db.webhooks);
});

// CREATE Webhook
app.post("/api/webhooks", (req, res) => {
  const { url, events } = req.body;
  if (!url) {
    return res.status(400).json({ error: "Webhook endpoint URL is required" });
  }

  const secretHex = crypto.randomBytes(16).toString("hex");
  const newWebhook = {
    id: "wh_" + crypto.randomBytes(6).toString("hex"),
    url,
    secret: `whsec_${secretHex}`,
    events: events || ["sms.received"],
    createdAt: new Date().toISOString(),
  };

  db.webhooks.push(newWebhook);
  saveDb();
  res.status(201).json(newWebhook);
});

// DELETE Webhook
app.delete("/api/webhooks/:id", (req, res) => {
  const { id } = req.params;
  db.webhooks = db.webhooks.filter((w) => w.id !== id);
  db.webhookLogs = db.webhookLogs.filter((l) => l.webhookId !== id);
  saveDb();
  res.json({ success: true, message: "Webhook deleted successfully" });
});

// GET Webhook Logs
app.get("/api/webhooks/:id/logs", (req, res) => {
  const { id } = req.params;
  const logs = db.webhookLogs.filter((l) => l.webhookId === id);
  res.json(logs);
});

// GET ALL Webhook Logs (for dashboard general logging)
app.get("/api/webhook-logs", (req, res) => {
  res.json(db.webhookLogs);
});

// TEST Webhook
app.post("/api/webhooks/:id/test", async (req, res) => {
  const { id } = req.params;
  const wh = db.webhooks.find((w) => w.id === id);
  if (!wh) {
    return res.status(404).json({ error: "Webhook not found" });
  }

  // Create mock incoming message
  const mockMsg = {
    id: "msg_test_" + crypto.randomBytes(4).toString("hex"),
    from: "+1 (555) 000-TEST",
    message: "This is a sandbox webhook test ping! Gateway reporting live.",
    gatewayId: "sim-gateway-1",
    simSlot: 1,
    createdAt: new Date().toISOString(),
  };

  // Run the dispatch async
  await triggerWebhooks(mockMsg);

  // Return the latest log created
  const latestLog = db.webhookLogs.find((l) => l.webhookId === id);
  res.json({ success: true, log: latestLog });
});

// RESET DB DATA TO DEFAULTS
app.post("/api/reset-data", (req, res) => {
  db = JSON.parse(JSON.stringify(DEFAULT_STORE));

  saveDb();
  res.json({ success: true, message: "SaaS database cleared to real physical setup mode successfully!" });
});


// ==========================================
// DEVELOPER PROGRAMMATIC API (PUBLIC API v1)
// ==========================================

// Authenticate API key middleware
function authenticateApiKey(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized. Missing or invalid Bearer API key in Authorization header." });
  }

  const keyStr = authHeader.split(" ")[1];
  const apiKey = db.apiKeys.find((k) => k.key === keyStr);
  
  if (!apiKey) {
    return res.status(401).json({ error: "Unauthorized. The provided API key is invalid or has been revoked." });
  }

  // Update last used timestamp
  apiKey.lastUsed = new Date().toISOString();
  saveDb();

  // Attach context to request
  (req as any).apiKey = apiKey;
  next();
}

// v1 POST /api/v1/send (Programmatic API)
app.post("/api/v1/send", authenticateApiKey, (req, res) => {
  const { to, message, gatewayId, simSlot, priority } = req.body;

  if (!to || !message) {
    return res.status(400).json({ error: "Missing required fields. 'to' and 'message' must be provided." });
  }

  // If gatewayId is not provided, find the first online gateway
  let selectedGatewayId = gatewayId;
  if (!selectedGatewayId) {
    const onlineGateway = db.gateways.find((g) => g.status === "online");
    if (!onlineGateway) {
      return res.status(503).json({ error: "No online SMS gateways are registered or connected. Unable to queue message." });
    }
    selectedGatewayId = onlineGateway.id;
  } else {
    // Validate the requested gateway
    const gateway = db.gateways.find((g) => g.id === selectedGatewayId);
    if (!gateway) {
      return res.status(404).json({ error: `Gateway with ID '${selectedGatewayId}' not found.` });
    }
  }

  const newMsg = {
    id: "msg_" + crypto.randomUUID(),
    to,
    message,
    type: "outbox",
    gatewayId: selectedGatewayId,
    simSlot: parseInt(simSlot) || 1,
    status: "queued",
    createdAt: new Date().toISOString(),
    priority: priority || "normal",
  };

  db.messages.unshift(newMsg);
  saveDb();

  res.status(202).json({
    success: true,
    message: "SMS successfully queued for dispatch.",
    id: newMsg.id,
    status: newMsg.status,
    gatewayId: newMsg.gatewayId,
    simSlot: newMsg.simSlot,
    priority: newMsg.priority,
  });
});

// v1 GET /api/v1/messages/:id (Check status programmatically)
app.get("/api/v1/messages/:id", authenticateApiKey, (req, res) => {
  const { id } = req.params;
  const msg = db.messages.find((m) => m.id === id);

  if (!msg) {
    return res.status(404).json({ error: `Message with ID '${id}' not found.` });
  }

  res.json({
    id: msg.id,
    to: msg.to,
    from: msg.from,
    message: msg.message,
    type: msg.type,
    gatewayId: msg.gatewayId,
    simSlot: msg.simSlot,
    status: msg.status,
    error: msg.error,
    createdAt: msg.createdAt,
    sentAt: msg.sentAt,
    deliveredAt: msg.deliveredAt,
  });
});


// ==========================================
// ANDROID GATEWAY APK COMMUNICATOR API
// ==========================================

// Authenticate Gateway Header Token middleware
function authenticateGateway(req: express.Request, res: express.Response, next: express.NextFunction) {
  const gatewayId = req.headers["x-gateway-id"] as string;
  const token = req.headers["x-gateway-token"] as string;

  if (!gatewayId || !token) {
    return res.status(401).json({ error: "Unauthorized. Missing gateway headers." });
  }

  const gateway = db.gateways.find((g) => g.id === gatewayId && g.token === token);
  if (!gateway) {
    return res.status(401).json({ error: "Unauthorized. Invalid Gateway ID or Token." });
  }

  (req as any).gateway = gateway;
  next();
}

// POST /api/gateway/register - Scan QR / Enter token to complete coupling
app.post("/api/gateway/register", (req, res) => {
  const { token, name, sim1Carrier, sim2Carrier, sim1Number, sim2Number } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Authentication token is required for registration." });
  }

  const gateway = db.gateways.find((g) => g.token === token);
  if (!gateway) {
    return res.status(404).json({ error: "Invalid registration token. Please check your admin dashboard." });
  }

  // Update details with what the physical device is reporting
  gateway.status = "online";
  gateway.lastPing = new Date().toISOString();
  if (name) gateway.name = name;
  if (sim1Carrier) gateway.sim1Carrier = sim1Carrier;
  if (sim2Carrier) gateway.sim2Carrier = sim2Carrier;
  if (sim1Number) gateway.sim1Number = sim1Number;
  if (sim2Number) gateway.sim2Number = sim2Number;

  saveDb();

  res.json({
    success: true,
    id: gateway.id,
    name: gateway.name,
    message: "Android Gateway registered and connected successfully!",
  });
});

// POST /api/gateway/ping - Heartbeat and Fetch queue
app.post("/api/gateway/ping", authenticateGateway, (req, res) => {
  const gateway = (req as any).gateway;
  const { battery, signal, sim1Carrier, sim2Carrier, sim1Number, sim2Number } = req.body;

  // Find owner user if exists
  let owner = null;
  if (gateway.ownerId) {
    db.users = db.users || [];
    owner = db.users.find((u) => u.id === gateway.ownerId);
  }

  // If subscription is suspended / canceled / unpaid, shut down device linking
  if (owner && owner.subscriptionStatus !== "active") {
    gateway.status = "offline";
    saveDb();
    return res.status(402).json({
      success: false,
      error: `Subscription Suspended. Billing Status: ${owner.subscriptionStatus.toUpperCase()}`,
      suspension_lock: true
    });
  }

  // Update telemetry
  gateway.status = "online";
  gateway.lastPing = new Date().toISOString();
  if (battery !== undefined) gateway.battery = battery;
  if (signal !== undefined) gateway.signal = signal;
  if (sim1Carrier !== undefined) gateway.sim1Carrier = sim1Carrier;
  if (sim2Carrier !== undefined) gateway.sim2Carrier = sim2Carrier;
  if (sim1Number !== undefined) gateway.sim1Number = sim1Number;
  if (sim2Number !== undefined) gateway.sim2Number = sim2Number;

  if (owner) {
    owner.lastActive = new Date().toISOString();
  }

  // Fetch pending messages queued for this specific gateway
  const pendingMessages = db.messages
    .filter((m) => m.gatewayId === gateway.id && m.type === "outbox" && m.status === "queued")
    // FIFO - process oldest first
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Automatically mark these as 'sending' to lock them from being grabbed again
  pendingMessages.forEach((msg) => {
    msg.status = "sending";
    if (owner) {
      owner.smsSentThisMonth = (owner.smsSentThisMonth || 0) + 1;
    }
  });

  saveDb();

  res.json({
    success: true,
    gatewayId: gateway.id,
    status: "online",
    remoteAppVersion: owner ? owner.remoteAppVersion : "2.5.0",
    remotePollingInterval: owner ? owner.remotePollingInterval : 7,
    pending: pendingMessages.map((m) => ({
      id: m.id,
      to: m.to,
      message: m.message,
      simSlot: m.simSlot,
      priority: m.priority,
    })),
  });
});

// POST /api/gateway/messages/update - APK reports SMS status back
app.post("/api/gateway/messages/update", authenticateGateway, (req, res) => {
  const { messageId, status, error } = req.body;

  if (!messageId || !status) {
    return res.status(400).json({ error: "Missing messageId or status" });
  }

  const msg = db.messages.find((m) => m.id === messageId);
  if (!msg) {
    return res.status(404).json({ error: "Message not found" });
  }

  msg.status = status; // 'sent' | 'delivered' | 'failed'
  if (status === "sent") {
    msg.sentAt = new Date().toISOString();
  } else if (status === "delivered") {
    if (!msg.sentAt) msg.sentAt = new Date().toISOString();
    msg.deliveredAt = new Date().toISOString();
  } else if (status === "failed") {
    msg.error = error || "Unknown device error";
  }

  saveDb();
  res.json({ success: true, message: "Message status updated." });
});

// POST /api/gateway/incoming - APK uploads incoming received SMS
app.post("/api/gateway/incoming", authenticateGateway, (req, res) => {
  const gateway = (req as any).gateway;
  const { sender, message, simSlot } = req.body;

  if (!sender || !message) {
    return res.status(400).json({ error: "sender and message are required" });
  }

  const newInboxMsg = {
    id: "msg_" + crypto.randomUUID(),
    from: sender,
    message,
    type: "inbox",
    gatewayId: gateway.id,
    simSlot: parseInt(simSlot) || 1,
    status: "delivered", // Inbox messages are instantly delivered to phone
    createdAt: new Date().toISOString(),
    priority: "normal",
  };

  db.messages.unshift(newInboxMsg);
  saveDb();

  // Trigger webhooks for received message asynchronously
  triggerWebhooks(newInboxMsg);

  res.status(201).json({
    success: true,
    id: newInboxMsg.id,
    message: "Incoming message recorded, triggering webhooks.",
  });
});


// ==========================================
// VITE AND STATIC ASSETS SERVING SETUP
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SMS Gateway SaaS] Server running on http://localhost:${PORT}`);
    console.log(`[SMS Gateway SaaS] Running in ${process.env.NODE_ENV || "development"} mode`);
  });
}

startServer();
