/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SubscriptionTier = "free" | "pro" | "enterprise";
export type SubscriptionStatus = "active" | "past_due" | "unpaid" | "canceled";

export interface SaaSUser {
  id: string;
  name: string;
  email: string;
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
  gatewayQuota: number;       // Max gateways allowed
  smsLimitMonthly: number;    // Monthly limit
  smsSentThisMonth: number;
  remoteAppVersion: string;   // Remote software version (e.g. "2.4.5")
  remotePollingInterval: number; // Device ping interval in seconds (e.g. 7)
  createdAt: string;
  lastActive: string;
}

export interface Gateway {
  id: string;
  name: string;
  token: string;
  ownerId?: string;           // SaaS Customer Owner ID
  status: 'online' | 'offline';
  lastPing: string;
  battery: number;
  signal: 'excellent' | 'good' | 'fair' | 'poor';
  sim1Carrier: string;
  sim2Carrier: string;
  sim1Number: string;
  sim2Number: string;
}

export type MessageStatus = 'queued' | 'sending' | 'sent' | 'delivered' | 'failed';
export type MessageType = 'outbox' | 'inbox';

export interface Message {
  id: string;
  to?: string;
  from?: string;
  message: string;
  type: MessageType;
  gatewayId: string;
  simSlot: number; // 1 or 2
  status: MessageStatus;
  error?: string;
  createdAt: string;
  sentAt?: string;
  deliveredAt?: string;
  priority: 'high' | 'normal';
}

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed?: string;
}

export interface Webhook {
  id: string;
  url: string;
  secret: string;
  events: string[];
  createdAt: string;
}

export interface WebhookLog {
  id: string;
  webhookId: string;
  url: string;
  event: string;
  payload: string;
  status: 'success' | 'failed';
  statusCode?: number;
  error?: string;
  createdAt: string;
}

export interface DashboardStats {
  activeGateways: number;
  totalSent: number;
  totalReceived: number;
  queuedCount: number;
  successRate: number;
  
  // SaaS Super Admin specific stats
  saasTotalUsers: number;
  saasActiveProUsers: number;
  saasMRR: number; // Monthly Recurring Revenue
}
