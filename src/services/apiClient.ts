import { auth } from './firebase';
import { db } from './firebase';
import { collection, getDoc, getDocs, query, runTransaction, setDoc, updateDoc, where, doc } from 'firebase/firestore';
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
        error: data?.error || `Server returned HTTP ${res.status}`,
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
        error: body?.error || `Server returned HTTP ${res.status}`,
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

function shouldUseDirectFirestore(response: Response, body: any): boolean {
  return response.status === 503 && body?.code === 'FIREBASE_ADMIN_NOT_CONFIGURED';
}

function requireVerifiedFirebaseUser() {
  const user = auth.currentUser;
  if (!user) throw new Error('Unauthenticated: Please sign in to continue.');
  if (!user.emailVerified && !user.providerData.some((provider) => provider.providerId === 'google.com')) {
    throw new Error('Email verification required before using Joint Finances.');
  }
  return user;
}

async function fetchMyJointWorkspacesDirect(): Promise<any[]> {
  const user = requireVerifiedFirebaseUser();
  const snapshot = await getDocs(query(collection(db, 'jointWorkspaces'), where('memberUids', 'array-contains', user.uid)));
  return snapshot.docs.map((item) => item.data()).sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
}

async function fetchJointInvitationsDirect(): Promise<{ invitations: any[]; sentInvitations: any[] }> {
  const user = requireVerifiedFirebaseUser();
  const email = (user.email || '').toLowerCase().trim();
  const [received, sent] = await Promise.all([
    getDocs(query(collection(db, 'jointInvitations'), where('inviteeEmail', '==', email))),
    getDocs(query(collection(db, 'jointInvitations'), where('inviterUid', '==', user.uid))),
  ]);
  return { invitations: received.docs.map((item) => item.data()).filter((item: any) => item.status === 'pending'), sentInvitations: sent.docs.map((item) => item.data()) };
}

async function createJointWorkspaceDirect(payload: { name: string; relationship?: string; inviteeEmail?: string; invitationMessage?: string; displayName?: string }): Promise<{ workspace: any; invitation?: any }> {
  const user = requireVerifiedFirebaseUser();
  const email = (user.email || '').toLowerCase().trim();
  const name = (payload.name || 'Our Household').trim();
  if (!name) throw new Error('Joint account name is required.');
  const relationship = (payload.relationship || 'Partner').trim();
  const memberLimit = /partner|spouse|married/i.test(relationship) ? 2 : 10;
  const now = new Date().toISOString();
  const id = `jw_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const displayName = (payload.displayName || user.displayName || email.split('@')[0] || 'User').trim();
  const workspace = { id, name, relationship, memberLimit, ownerUid: user.uid, ownerEmail: email, ownerName: displayName, memberUids: [user.uid], members: [{ uid: user.uid, email, displayName, role: 'owner', joinedAt: now, avatarColor: '#174F32' }], createdAt: now, updatedAt: now };
  await setDoc(doc(db, 'jointWorkspaces', id), workspace);
  let invitation: any;
  const inviteeEmail = payload.inviteeEmail?.toLowerCase().trim();
  if (inviteeEmail) {
    if (inviteeEmail === email) throw new Error('You cannot invite yourself to a joint account.');
    const inviteId = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    invitation = { id: inviteId, jointWorkspaceId: id, jointWorkspaceName: name, inviterUid: user.uid, inviterEmail: email, inviterName: displayName, inviteeEmail, relationship, message: (payload.invitationMessage || '').trim(), status: 'pending', createdAt: now };
    await setDoc(doc(db, 'jointInvitations', inviteId), invitation);
  }
  return { workspace, invitation };
}

async function invitePartnerToJointDirect(payload: { workspaceId: string; inviteeEmail: string; relationship?: string; message?: string; displayName?: string }): Promise<any> {
  const user = requireVerifiedFirebaseUser();
  const email = (user.email || '').toLowerCase().trim();
  const inviteeEmail = payload.inviteeEmail.toLowerCase().trim();
  if (!inviteeEmail || inviteeEmail === email) throw new Error('Enter another verified user email address.');
  const ws = (await getDocs(query(collection(db, 'jointWorkspaces'), where('memberUids', 'array-contains', user.uid)))).docs.map((item) => item.data()).find((item: any) => item.id === payload.workspaceId);
  if (!ws) throw new Error('Joint workspace not found or you are not a member.');
  const now = new Date().toISOString();
  const id = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const invitation = { id, jointWorkspaceId: payload.workspaceId, jointWorkspaceName: ws.name || 'Joint Workspace', inviterUid: user.uid, inviterEmail: email, inviterName: (payload.displayName || user.displayName || email.split('@')[0] || 'User').trim(), inviteeEmail, relationship: payload.relationship || ws.relationship || 'Partner', message: (payload.message || '').trim(), status: 'pending', createdAt: now };
  await setDoc(doc(db, 'jointInvitations', id), invitation);
  return invitation;
}

async function acceptJointInvitationDirect(invitationId: string, displayName?: string): Promise<any> {
  const user = requireVerifiedFirebaseUser();
  const invitationRef = doc(db, 'jointInvitations', invitationId);
  return runTransaction(db, async (transaction) => {
    const invitationSnap = await transaction.get(invitationRef);
    if (!invitationSnap.exists()) throw new Error('Invitation not found.');
    const invitation = invitationSnap.data() as any;
    if (invitation.status !== 'pending') throw new Error('This invitation is no longer pending.');
    if ((invitation.inviteeEmail || '').toLowerCase() !== (user.email || '').toLowerCase()) throw new Error('This invitation is not addressed to you.');
    const workspaceRef = doc(db, 'jointWorkspaces', invitation.jointWorkspaceId);
    const workspaceSnap = await transaction.get(workspaceRef);
    if (!workspaceSnap.exists()) throw new Error('Joint workspace no longer exists.');
    const current = workspaceSnap.data() as any;
    const members = current.members || [];
    if (!current.memberUids?.includes(user.uid) && members.length >= (current.memberLimit || 10)) throw new Error('This joint workspace is full.');
    const nextMembers = current.memberUids?.includes(user.uid) ? members : [...members, { uid: user.uid, email: (user.email || '').toLowerCase(), displayName: displayName || user.displayName || user.email?.split('@')[0] || 'User', role: 'member', joinedAt: new Date().toISOString(), avatarColor: '#2D7D5A' }];
    const nextWorkspace = { ...current, members: nextMembers, memberUids: nextMembers.map((member: any) => member.uid), updatedAt: new Date().toISOString() };
    transaction.update(workspaceRef, nextWorkspace);
    transaction.update(invitationRef, { status: 'accepted', acceptedAt: new Date().toISOString(), acceptedByUid: user.uid });
    return nextWorkspace;
  });
}

export async function fetchMyJointWorkspaces(): Promise<{ ok: boolean; workspaces?: any[]; error?: string }> {
  try {
    const res = await authorizedFetch('/api/joint?action=get-my-workspaces', {
      method: 'GET',
    });
    const body = await res.json().catch(() => null);
    if (shouldUseDirectFirestore(res, body)) return { ok: true, workspaces: await fetchMyJointWorkspacesDirect() };
    if (!res.ok) return { ok: false, error: body?.error || `HTTP ${res.status}` };
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
    if (shouldUseDirectFirestore(res, body)) { const result = await fetchJointInvitationsDirect(); return { ok: true, ...result }; }
    if (!res.ok) return { ok: false, error: body?.error || `HTTP ${res.status}` };
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
}): Promise<{ ok: boolean; workspace?: any; invitation?: any; error?: string }> {
  try {
    const res = await authorizedFetch('/api/joint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create-workspace', ...payload }),
    });
    const body = await res.json().catch(() => null);
    if (shouldUseDirectFirestore(res, body)) { const result = await createJointWorkspaceDirect(payload); return { ok: true, ...result }; }
    if (!res.ok) return { ok: false, error: body?.error || `HTTP ${res.status}`, workspace: body?.workspace };
    return { ok: true, workspace: body?.workspace, invitation: body?.invitation };
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
    if (shouldUseDirectFirestore(res, body)) return { ok: true, invitation: await invitePartnerToJointDirect(payload) };
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
    if (shouldUseDirectFirestore(res, body)) { const workspace = await acceptJointInvitationDirect(invitationId, displayName); return { ok: true, workspace, message: 'Invitation accepted.' }; }
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
    if (shouldUseDirectFirestore(res, body)) { await updateDoc(doc(db, 'jointInvitations', invitationId), { status: 'declined', declinedAt: new Date().toISOString() }); return { ok: true }; }
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

