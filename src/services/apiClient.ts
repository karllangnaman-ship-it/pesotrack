import { auth } from './firebase';
import { PesoTrackState, NotificationSettings } from '../types/finance';
import { BackupSummary } from '../utils/backupService';
import { Capacitor } from '@capacitor/core';

/**
 * Returns the configured production API base URL.
 * Works seamlessly across web deployments and Android Capacitor APK.
 */
export function getApiBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }

  // In native Android Capacitor apps, relative /api paths won't hit a local web server unless configured.
  // We check if a user or deployment set a custom backend URL in localStorage.
  if (Capacitor.isNativePlatform()) {
    try {
      const stored = localStorage.getItem('pesotrack_backend_url');
      if (stored && stored.trim()) {
        return stored.trim().replace(/\/+$/, '');
      }
    } catch {}
  }

  // Same-origin relative path for web
  return '';
}

export interface BackendHealthResult {
  isDeviceOnline: boolean;
  isBackendReachable: boolean;
  service?: string;
  status?: string;
  message?: string;
  data?: any;
}

/** Convert API error payloads into a safe, user-readable message. */
function getApiErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === 'string' && payload.trim()) return payload;
  if (payload && typeof payload === 'object') {
    const value = payload as { message?: unknown; error?: unknown; detail?: unknown };
    if (typeof value.message === 'string' && value.message.trim()) return value.message;
    if (typeof value.error === 'string' && value.error.trim()) return value.error;
    if (value.error && typeof value.error === 'object') {
      const nested = value.error as { message?: unknown };
      if (typeof nested.message === 'string' && nested.message.trim()) return nested.message;
    }
    if (typeof value.detail === 'string' && value.detail.trim()) return value.detail;
  }
  return fallback;
}

/**
 * Check backend availability without exposing secrets.
 * Distinguishes device offline from an unreachable backend.
 */
export async function pingBackendHealth(): Promise<BackendHealthResult> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      isDeviceOnline: false,
      isBackendReachable: false,
      message: 'Device is offline (no internet connection).',
    };
  }

  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/health`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return {
        isDeviceOnline: true,
        isBackendReachable: true,
        service: data.service,
        status: data.status,
        message: 'Backend is online and reachable.',
        data,
      };
    }

    return {
      isDeviceOnline: true,
      isBackendReachable: false,
      status: `HTTP ${res.status}`,
      message: `Backend returned HTTP status ${res.status}.`,
    };
  } catch (err: any) {
    return {
      isDeviceOnline: true,
      isBackendReachable: false,
      message: `Backend is currently unreachable (${err?.name === 'AbortError' ? 'timed out' : err?.message || 'connection failed'}).`,
    };
  }
}

export interface BackendSyncResponse {
  ok: boolean;
  syncedCount?: number;
  serverTimestamp?: string;
  fallbackToClientSdk?: boolean;
  message?: string;
  error?: string;
  detail?: string;
}

/**
 * Synchronize local mutations to Cloud through the Vercel online-only backend.
 * Authenticates with Firebase ID Token as Bearer header.
 */
export async function sendSyncToBackend(payload: {
  queueItems?: any[];
  fullState?: PesoTrackState;
}): Promise<BackendSyncResponse> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return {
      ok: false,
      error: 'Unauthenticated: Please sign in to sync with the cloud vault.',
    };
  }

  // Obtain verified Firebase ID token
  let idToken: string;
  try {
    idToken = await currentUser.getIdToken(false);
  } catch (err: any) {
    return {
      ok: false,
      error: `Failed acquiring authentication token: ${err?.message || 'Token error'}`,
    };
  }

  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/sync`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        ok: false,
        error: getApiErrorMessage(data, `Server returned HTTP ${res.status}`),
        detail: data?.detail,
      };
    }

    return {
      ok: true,
      syncedCount: data?.syncedCount || 0,
      serverTimestamp: data?.serverTimestamp,
      fallbackToClientSdk: Boolean(data?.fallbackToClientSdk),
      message: data?.message || 'Successfully synchronized.',
    };
  } catch (err: any) {
    // Return error without throwing so caller can preserve pending queue!
    return {
      ok: false,
      error: `Network error reaching Vercel backend: ${err?.message || 'Connection failed'}`,
    };
  }
}

export interface BackendRestoreResponse {
  ok: boolean;
  hasCloudData?: boolean;
  data?: PesoTrackState;
  summary?: BackupSummary;
  fallbackToClientSdk?: boolean;
  message?: string;
  error?: string;
  detail?: string;
}

/**
 * Retrieve authenticated user's cloud backup from the Vercel backend.
 */
export async function fetchRestoreFromBackend(): Promise<BackendRestoreResponse> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return {
      ok: false,
      error: 'Unauthenticated: Please sign in to access your cloud backup.',
    };
  }

  let idToken: string;
  try {
    idToken = await currentUser.getIdToken(false);
  } catch (err: any) {
    return {
      ok: false,
      error: `Failed acquiring authentication token: ${err?.message || 'Token error'}`,
    };
  }

  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/restore`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${idToken}`,
        Accept: 'application/json',
      },
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        ok: false,
        error: getApiErrorMessage(body, `Server returned HTTP ${res.status}`),
        detail: body?.detail,
      };
    }

    return {
      ok: true,
      hasCloudData: Boolean(body?.hasCloudData),
      data: body?.data,
      summary: body?.summary,
      fallbackToClientSdk: Boolean(body?.fallbackToClientSdk),
      message: body?.message,
    };
  } catch (err: any) {
    return {
      ok: false,
      error: `Network error reaching Vercel backend: ${err?.message || 'Connection failed'}`,
    };
  }
}

// ---------------------------------------------------------------------------
// JOINT ACCOUNT BACKEND API CLIENT
// ---------------------------------------------------------------------------

async function getAuthBearerHeader(forceRefresh = false): Promise<{ Authorization: string } | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;
  try {
    const idToken = await currentUser.getIdToken(forceRefresh);
    return { Authorization: `Bearer ${idToken}` };
  } catch (err) {
    console.warn('[ApiClient] Failed acquiring auth token:', err);
    return null;
  }
}

/**
 * Executes an authenticated API request with automatic token refresh on HTTP 401.
 */
async function authorizedFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  let authHeader = await getAuthBearerHeader(false);
  if (!authHeader) {
    throw new Error('Unauthenticated: Please sign in to continue.');
  }

  let headers: Record<string, string> = {
    Accept: 'application/json',
    ...authHeader,
    ...((options.headers as Record<string, string>) || {}),
  };

  let res = await fetch(url, { ...options, headers });

  // If 401 Unauthorized, token might be expired. Force refresh and retry once.
  if (res.status === 401) {
    const freshAuthHeader = await getAuthBearerHeader(true);
    if (freshAuthHeader) {
      headers = {
        ...headers,
        ...freshAuthHeader,
      };
      res = await fetch(url, { ...options, headers });
    }
  }

  return res;
}

export async function fetchMyJointWorkspaces(): Promise<{ ok: boolean; workspaces?: any[]; error?: string }> {
  try {
    const res = await authorizedFetch('/api/joint?action=get-my-workspaces', {
      method: 'GET',
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: getApiErrorMessage(body, `HTTP ${res.status}`) };
    return { ok: true, workspaces: body?.workspaces || [] };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error' };
  }
}

export async function fetchJointInvitations(): Promise<{
  ok: boolean;
  invitations?: any[];
  sentInvitations?: any[];
  error?: string;
}> {
  try {
    const res = await authorizedFetch('/api/joint?action=get-invitations', {
      method: 'GET',
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: getApiErrorMessage(body, `HTTP ${res.status}`) };
    return {
      ok: true,
      invitations: body?.invitations || [],
      sentInvitations: body?.sentInvitations || [],
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error' };
  }
}

export async function createJointWorkspaceApi(payload: {
  name: string;
  relationship?: string;
  inviteeEmail?: string;
  invitationMessage?: string;
  displayName?: string;
}): Promise<{ ok: boolean; workspace?: any; invitation?: any; invitationWarning?: string; error?: string }> {
  try {
    const res = await authorizedFetch('/api/joint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create-workspace', ...payload }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: getApiErrorMessage(body, `HTTP ${res.status}`), workspace: body?.workspace };
    return {
      ok: true,
      workspace: body?.workspace,
      invitation: body?.invitation,
      invitationWarning: typeof body?.invitationWarning === 'string' ? body.invitationWarning : undefined,
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error' };
  }
}

export async function fetchWorkspacePendingInvitations(
  workspaceId: string
): Promise<{
  ok: boolean;
  pendingInvitations?: any[];
  activeMemberCount?: number;
  pendingCount?: number;
  memberLimit?: number;
  availableSlots?: number;
  error?: string;
}> {
  try {
    const res = await authorizedFetch(`/api/joint?action=get-workspace-invitations&workspaceId=${encodeURIComponent(workspaceId)}`, {
      method: 'GET',
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: body?.error || `HTTP ${res.status}` };
    return {
      ok: true,
      pendingInvitations: body?.pendingInvitations || [],
      activeMemberCount: body?.activeMemberCount || 0,
      pendingCount: body?.pendingCount || 0,
      memberLimit: body?.memberLimit || 2,
      availableSlots: body?.availableSlots || 0,
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error' };
  }
}

export async function updateJointMemberRoleApi(payload: {
  workspaceId: string;
  memberUid: string;
  newRole: string;
}): Promise<{ ok: boolean; workspace?: any; message?: string; error?: string }> {
  try {
    const res = await authorizedFetch('/api/joint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update-member-role', ...payload }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: body?.error || `HTTP ${res.status}` };
    return { ok: true, workspace: body?.workspace, message: body?.message };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error' };
  }
}

export async function invitePartnerToJointApi(payload: {
  workspaceId: string;
  inviteeEmail: string;
  relationship?: string;
  message?: string;
  displayName?: string;
}): Promise<{ ok: boolean; invitation?: any; error?: string }> {
  try {
    const res = await authorizedFetch('/api/joint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'invite-partner', ...payload }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: body?.error || `HTTP ${res.status}` };
    return { ok: true, invitation: body?.invitation };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error' };
  }
}

export async function acceptJointInvitationApi(
  invitationId: string,
  displayName?: string
): Promise<{ ok: boolean; workspace?: any; message?: string; error?: string }> {
  try {
    const res = await authorizedFetch('/api/joint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'accept-invitation', invitationId, displayName }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: body?.error || `HTTP ${res.status}` };
    return { ok: true, workspace: body?.workspace, message: body?.message };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error' };
  }
}

export async function declineJointInvitationApi(
  invitationId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await authorizedFetch('/api/joint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'decline-invitation', invitationId }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: body?.error || `HTTP ${res.status}` };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error' };
  }
}

export async function revokeJointInvitationApi(
  invitationId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await authorizedFetch('/api/joint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'revoke-invitation', invitationId }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: body?.error || `HTTP ${res.status}` };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error' };
  }
}

export async function leaveJointWorkspaceApi(
  workspaceId: string,
  displayName?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await authorizedFetch('/api/joint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'leave-workspace', workspaceId, displayName }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: body?.error || `HTTP ${res.status}` };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error' };
  }
}

export async function removeJointMemberApi(
  workspaceId: string,
  memberUid: string,
  displayName?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await authorizedFetch('/api/joint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove-member', workspaceId, memberUid, displayName }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: body?.error || `HTTP ${res.status}` };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error' };
  }
}

export async function updateJointWorkspaceApi(payload: {
  workspaceId: string;
  name?: string;
  relationship?: string;
  notificationSettings?: NotificationSettings;
}): Promise<{ ok: boolean; workspace?: any; error?: string }> {
  try {
    const res = await authorizedFetch('/api/joint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update-workspace', ...payload }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: body?.error || `HTTP ${res.status}` };
    return { ok: true, workspace: body?.workspace };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error' };
  }
}

export async function logJointActivityApi(
  workspaceId: string,
  activity: any
): Promise<{ ok: boolean; error?: string }> {
  try {
    await authorizedFetch('/api/joint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'log-activity', workspaceId, activity }),
    });
    return { ok: true };
  } catch {
    return { ok: false, error: 'Network error' };
  }
}

export async function markJointNotificationReadApi(
  workspaceId: string,
  notificationId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await authorizedFetch('/api/joint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark-notification-read', workspaceId, notificationId }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: body?.error || `HTTP ${res.status}` };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error' };
  }
}

export async function markAllJointNotificationsReadApi(
  workspaceId: string,
  notificationIds: string[]
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await authorizedFetch('/api/joint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark-all-notifications-read', workspaceId, notificationIds }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: body?.error || `HTTP ${res.status}` };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error' };
  }
}

export async function sendJointApiAction(
  actionOrPayload: string | Record<string, any>,
  payload?: Record<string, any>
): Promise<{ ok: boolean; [key: string]: any }> {
  try {
    const finalPayload =
      typeof actionOrPayload === 'string'
        ? { action: actionOrPayload, ...(payload || {}) }
        : actionOrPayload;

    const res = await authorizedFetch('/api/joint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finalPayload),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, error: body?.error || `HTTP ${res.status}`, ...body };
    }
    return { ok: true, ...body };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error' };
  }
}

