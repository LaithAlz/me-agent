/**
 * Me-Agent Backend API Client
 * Connects to the FastAPI backend for authority, policy, audit, and voice features.
 */

const API_BASE = 'http://localhost:8000/api';

// ============================================================
// Types
// ============================================================

export interface AgentPolicy {
  maxSpend: number;
  allowedCategories: string[];
  agentEnabled: boolean;
  requireConfirm: boolean;
}

export interface PolicyResponse {
  userId: string;
  policy: AgentPolicy;
  updatedAt?: string;
}

export interface AuthorityCheckRequest {
  action: 'cartCreate' | 'recommendBundle' | 'checkoutStart' | 'addToCart';
  cartTotal?: number;
  categories?: string[];
  items?: Array<{
    id: string;
    title: string;
    price: number;
    category: string;
    qty?: number;
  }>;
  meta?: Record<string, unknown>;
}

export interface AuthorityCheckResponse {
  decision: 'ALLOW' | 'BLOCK';
  reason: string;
  policySnapshot: AgentPolicy;
  blockedItems?: Array<{ id: string; title: string; category: string }>;
  auditEventId: string;
}

export interface AuditEvent {
  id: string;
  ts: string;
  actor: 'user' | 'agent';
  action: string;
  decision: 'ALLOW' | 'BLOCK';
  reason: string;
  policySnapshot: AgentPolicy;
  meta?: Record<string, unknown>;
}

export interface AuditLogResponse {
  userId: string;
  events: AuditEvent[];
  total: number;
}

export interface VoiceResponse {
  success: boolean;
  audioBase64?: string;
  contentType: string;
  text: string;
  mock: boolean;
  error?: string;
}

export interface SessionInfo {
  authenticated: boolean;
  userId?: string;
  username?: string;
  demoMode: boolean;
}

export interface AvatarResponse {
  hasAvatar: boolean;
  avatarBase64?: string;
  style?: string;
  createdAt?: string;
}

// ============================================================
// API Client Functions
// ============================================================

/**
 * Generic fetch wrapper with credentials
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include', // Include cookies for session
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}

// ============================================================
// Session / Auth
// ============================================================

export async function getSession(): Promise<SessionInfo> {
  return apiFetch<SessionInfo>('/auth/session');
}

export async function demoLogin(): Promise<{ success: boolean; userId: string; username: string }> {
  return apiFetch('/auth/demo-login', { method: 'POST' });
}

export async function logout(): Promise<{ success: boolean }> {
  return apiFetch('/auth/logout', { method: 'POST' });
}

// ============================================================
// Policy
// ============================================================

export async function getPolicy(): Promise<PolicyResponse> {
  return apiFetch<PolicyResponse>('/policy');
}

export async function updatePolicy(
  updates: Partial<AgentPolicy>
): Promise<PolicyResponse> {
  return apiFetch<PolicyResponse>('/policy', {
    method: 'POST',
    body: JSON.stringify(updates),
  });
}

export async function resetPolicy(): Promise<{ success: boolean }> {
  return apiFetch('/policy', { method: 'DELETE' });
}

// ============================================================
// Authority
// ============================================================

export async function checkAuthority(
  request: AuthorityCheckRequest
): Promise<AuthorityCheckResponse> {
  return apiFetch<AuthorityCheckResponse>('/authority/check', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function getAuthorityStatus(): Promise<{
  userId: string;
  agentEnabled: boolean;
  maxSpend: number;
  allowedCategories: string[];
  requireConfirm: boolean;
  message: string;
}> {
  return apiFetch('/authority/status');
}

// ============================================================
// Audit
// ============================================================

export async function getAuditLog(limit = 50): Promise<AuditLogResponse> {
  return apiFetch<AuditLogResponse>(`/audit?limit=${limit}`);
}

export async function getAuditSummary(): Promise<{
  userId: string;
  total: number;
  allowed: number;
  blocked: number;
  blockRate: number;
  mostRecent?: AuditEvent;
  actionCounts: Record<string, number>;
}> {
  return apiFetch('/audit/summary');
}

// ============================================================
// Voice
// ============================================================

export async function synthesizeVoice(
  text: string,
  voiceId?: string
): Promise<VoiceResponse> {
  return apiFetch<VoiceResponse>('/voice', {
    method: 'POST',
    body: JSON.stringify({ text, voiceId }),
  });
}

export async function cloneVoice(audioFile: File): Promise<{ success: boolean; voiceId?: string; error?: string }> {
  const formData = new FormData();
  formData.append('file', audioFile);
  
  const response = await fetch(`${API_BASE}/voice/clone`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Clone failed' }));
    throw new Error(error.detail || `Clone error: ${response.status}`);
  }
  
  return response.json();
}

export async function useVoiceId(voiceId: string): Promise<{ success: boolean; voiceId?: string; error?: string }> {
  const response = await fetch(`${API_BASE}/voice/use`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ voiceId }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to use voice' }));
    throw new Error(error.detail || `Error: ${response.status}`);
  }
  
  return response.json();
}

export async function getCloneStatus(): Promise<{ hasClonedVoice: boolean; voiceId?: string }> {
  return apiFetch('/voice/clone/status');
}

export async function getAvailableVoices(): Promise<{
  available: boolean;
  voices: Array<{ id: string; name: string; category: string }>;
  default?: string;
}> {
  return apiFetch('/voice/voices');
}

// ============================================================
// Avatar
// ============================================================

export async function generateAvatar(
  imageBase64: string,
  style = 'bitmoji'
): Promise<{ success: boolean; avatarBase64?: string; error?: string }> {
  return apiFetch('/avatar/generate', {
    method: 'POST',
    body: JSON.stringify({ imageBase64, style }),
  });
}

export async function getAvatar(): Promise<AvatarResponse> {
  return apiFetch<AvatarResponse>('/avatar');
}

export async function deleteAvatar(): Promise<{ success: boolean }> {
  return apiFetch('/avatar', { method: 'DELETE' });
}

// ============================================================
// Health Check
// ============================================================

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE.replace('/api', '')}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
