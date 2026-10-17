import { auth } from './firebase';
import { PesoTrackState } from '../types/finance';
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
