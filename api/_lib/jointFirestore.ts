import { getAdminFirestore, hasAdminCredentials } from './firebaseAdmin.ts';
import fs from 'node:fs';

let firebaseConfig: any = {};
try {
  firebaseConfig = JSON.parse(fs.readFileSync(new URL('../../firebase-applet-config.json', import.meta.url), 'utf8'));
} catch {}

const PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ||
  firebaseConfig.projectId ||
  'pesotrack-51670';

const FIRESTORE_DATABASE_ID =
  (firebaseConfig as any).firestoreDatabaseId || '(default)';

const BASE_REST_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${FIRESTORE_DATABASE_ID}/documents`;

// ---------------------------------------------------------------------------
// REST Format Converters
// ---------------------------------------------------------------------------

export function toFirestoreFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      fields[key] = toFirestoreValue(val);
    }
  }
  return fields;
}

export function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    return { mapValue: { fields: toFirestoreFields(val) } };
  }
  return { stringValue: String(val) };
}

export function fromFirestoreFields(fields: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields || {})) {
    result[k] = fromFirestoreValue(v);
  }
  return result;
}

export function fromFirestoreValue(val: any): any {
  if (!val) return null;
  if ('nullValue' in val) return null;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return val.doubleValue;
  if ('stringValue' in val) return val.stringValue;
  if ('timestampValue' in val) return val.timestampValue;
  if ('arrayValue' in val) {
    return (val.arrayValue.values || []).map(fromFirestoreValue);
  }
  if ('mapValue' in val) {
    return fromFirestoreFields(val.mapValue.fields || {});
  }
  return null;
}

// ---------------------------------------------------------------------------
// Document Storage Operations
// ---------------------------------------------------------------------------

export async function getDoc(
  collectionPath: string,
  docId: string,
  userToken: string
): Promise<any | null> {
  if (hasAdminCredentials()) {
    const snap = await getAdminFirestore().collection(collectionPath).doc(docId).get();
    return snap.exists ? snap.data() : null;
  }

  const url = `${BASE_REST_URL}/${collectionPath}/${docId}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${userToken}`,
      Accept: 'application/json',
    },
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new Error(errBody?.error?.message || `Failed to read document: HTTP ${res.status}`);
  }

  const json = await res.json();
  return json.fields ? fromFirestoreFields(json.fields) : null;
}

export async function setDoc(
  collectionPath: string,
  docId: string,
  data: any,
  userToken: string
): Promise<void> {
  if (hasAdminCredentials()) {
    await getAdminFirestore().collection(collectionPath).doc(docId).set(data);
    return;
  }

  const url = `${BASE_REST_URL}/${collectionPath}/${docId}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${userToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new Error(errBody?.error?.message || `Failed to write document: HTTP ${res.status}`);
  }
}

export async function updateDoc(
  collectionPath: string,
  docId: string,
  updates: Record<string, any>,
  userToken: string
): Promise<void> {
  if (hasAdminCredentials()) {
    await getAdminFirestore().collection(collectionPath).doc(docId).update(updates);
    return;
  }

  const fieldPaths = Object.keys(updates);
  const maskQuery = fieldPaths.map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
  const url = `${BASE_REST_URL}/${collectionPath}/${docId}?${maskQuery}`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${userToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ fields: toFirestoreFields(updates) }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new Error(errBody?.error?.message || `Failed to update document: HTTP ${res.status}`);
  }
}

export async function deleteDoc(
  collectionPath: string,
  docId: string,
  userToken: string
): Promise<void> {
  if (hasAdminCredentials()) {
    await getAdminFirestore().collection(collectionPath).doc(docId).delete();
    return;
  }

  const url = `${BASE_REST_URL}/${collectionPath}/${docId}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${userToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok && res.status !== 404) {
    const errBody = await res.json().catch(() => null);
    throw new Error(errBody?.error?.message || `Failed to delete document: HTTP ${res.status}`);
  }
}

// ---------------------------------------------------------------------------
// Specialized High-Level Query Helpers
// ---------------------------------------------------------------------------

export async function queryWorkspacesForUser(
  uid: string,
  userToken: string
): Promise<any[]> {
  if (hasAdminCredentials()) {
    const snap = await getAdminFirestore()
      .collection('jointWorkspaces')
      .where('memberUids', 'array-contains', uid)
      .get();
    const list: any[] = [];
    snap.forEach((d) => list.push(d.data()));
    return list;
  }

  const queryBody = {
    structuredQuery: {
      from: [{ collectionId: 'jointWorkspaces' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'memberUids' },
          op: 'ARRAY_CONTAINS',
          value: { stringValue: uid },
        },
      },
    },
  };

  const res = await fetch(`${BASE_REST_URL}:runQuery`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(queryBody),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new Error(errBody?.error?.message || `Workspaces query failed: HTTP ${res.status}`);
  }

  const list: any[] = [];
  const jsonArray = await res.json();
  if (Array.isArray(jsonArray)) {
    for (const item of jsonArray) {
      if (item.document && item.document.fields) {
        list.push(fromFirestoreFields(item.document.fields));
      }
    }
  }
  return list;
}

export async function queryReceivedInvitations(
  inviteeEmail: string,
  userToken: string
): Promise<any[]> {
  const normEmail = inviteeEmail.toLowerCase().trim();
  if (!normEmail) return [];

  if (hasAdminCredentials()) {
    const snap = await getAdminFirestore()
      .collection('jointInvitations')
      .where('inviteeEmail', '==', normEmail)
      .where('status', '==', 'pending')
      .get();
    const list: any[] = [];
    snap.forEach((d) => list.push(d.data()));
    return list;
  }

  const queryBody = {
    structuredQuery: {
      from: [{ collectionId: 'jointInvitations' }],
      where: {
        compositeFilter: {
          op: 'AND',
          filters: [
            {
              fieldFilter: {
                field: { fieldPath: 'inviteeEmail' },
                op: 'EQUAL',
                value: { stringValue: normEmail },
              },
            },
            {
              fieldFilter: {
                field: { fieldPath: 'status' },
                op: 'EQUAL',
                value: { stringValue: 'pending' },
              },
            },
          ],
        },
      },
    },
  };

  const res = await fetch(`${BASE_REST_URL}:runQuery`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(queryBody),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new Error(errBody?.error?.message || `Invitations query failed: HTTP ${res.status}`);
  }

  const list: any[] = [];
  const jsonArray = await res.json();
  if (Array.isArray(jsonArray)) {
    for (const item of jsonArray) {
      if (item.document && item.document.fields) {
        list.push(fromFirestoreFields(item.document.fields));
      }
    }
  }
  return list;
}

export async function querySentInvitations(
  inviterUid: string,
  userToken: string
): Promise<any[]> {
  if (hasAdminCredentials()) {
    const snap = await getAdminFirestore()
      .collection('jointInvitations')
      .where('inviterUid', '==', inviterUid)
      .get();
    const list: any[] = [];
    snap.forEach((d) => list.push(d.data()));
    return list;
  }

  const queryBody = {
    structuredQuery: {
      from: [{ collectionId: 'jointInvitations' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'inviterUid' },
          op: 'EQUAL',
          value: { stringValue: inviterUid },
        },
      },
    },
  };

  const res = await fetch(`${BASE_REST_URL}:runQuery`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(queryBody),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new Error(errBody?.error?.message || `Sent invitations query failed: HTTP ${res.status}`);
  }

  const list: any[] = [];
  const jsonArray = await res.json();
  if (Array.isArray(jsonArray)) {
    for (const item of jsonArray) {
      if (item.document && item.document.fields) {
        list.push(fromFirestoreFields(item.document.fields));
      }
    }
  }
  return list;
}

export async function queryWorkspacePendingInvitations(
  workspaceId: string,
  userToken: string,
  inviterUid?: string
): Promise<any[]> {
  if (!workspaceId) return [];

  // 1. If admin credentials available, query via Admin Firestore
  if (hasAdminCredentials()) {
    try {
      const snap = await getAdminFirestore()
        .collection('jointInvitations')
        .where('jointWorkspaceId', '==', workspaceId)
        .where('status', '==', 'pending')
        .get();
      const list: any[] = [];
      snap.forEach((d) => list.push(d.data()));
      return list;
    } catch (adminErr) {
      console.warn('[jointFirestore] Admin query error:', adminErr);
    }
  }

  // 2. Read directly from the workspace document (accessible to any workspace member without extra permission hurdles)
  try {
    const wsDoc = await getDoc('jointWorkspaces', workspaceId, userToken);
    if (wsDoc && Array.isArray(wsDoc.pendingInvitations)) {
      const pendingFromDoc = wsDoc.pendingInvitations.filter((i: any) => i && i.status === 'pending');
      if (pendingFromDoc.length > 0) {
        return pendingFromDoc;
      }
    }
  } catch (docErr) {
    console.warn('[jointFirestore] Workspace doc pending invitations fallback:', docErr);
  }

  // 3. If inviterUid provided, query sent invitations (inviterUid == request.auth.uid satisfies Firestore rules 100%)
  if (inviterUid) {
    try {
      const sent = await querySentInvitations(inviterUid, userToken);
      const filtered = sent.filter(
        (i) => i.jointWorkspaceId === workspaceId && i.status === 'pending'
      );
      if (filtered.length > 0) {
        return filtered;
      }
    } catch (sentErr) {
      console.warn('[jointFirestore] Sent invitations query fallback:', sentErr);
    }
  }

  // 4. Try REST runQuery, but catch any 403/permission error gracefully rather than throwing
  try {
    const queryBody = {
      structuredQuery: {
        from: [{ collectionId: 'jointInvitations' }],
        where: {
          compositeFilter: {
            op: 'AND',
            filters: [
              {
                fieldFilter: {
                  field: { fieldPath: 'jointWorkspaceId' },
                  op: 'EQUAL',
                  value: { stringValue: workspaceId },
                },
              },
              {
                fieldFilter: {
                  field: { fieldPath: 'status' },
                  op: 'EQUAL',
                  value: { stringValue: 'pending' },
                },
              },
            ],
          },
        },
      },
    };

    const res = await fetch(`${BASE_REST_URL}:runQuery`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${userToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(queryBody),
    });

    if (res.ok) {
      const list: any[] = [];
      const jsonArray = await res.json();
      if (Array.isArray(jsonArray)) {
        for (const item of jsonArray) {
          if (item.document && item.document.fields) {
            list.push(fromFirestoreFields(item.document.fields));
          }
        }
      }
      return list;
    } else {
      console.warn(`[jointFirestore] Workspace pending invitations query returned HTTP ${res.status}`);
    }
  } catch (restErr) {
    console.warn('[jointFirestore] Workspace pending invitations runQuery catch:', restErr);
  }

  return [];
}

export async function queryJointMessages(
  workspaceId: string,
  userToken: string,
  limitCount = 100
): Promise<any[]> {
  if (hasAdminCredentials()) {
    const snap = await getAdminFirestore()
      .collection('jointWorkspaces')
      .doc(workspaceId)
      .collection('messages')
      .orderBy('timestamp', 'asc')
      .limit(limitCount)
      .get();
    const list: any[] = [];
    snap.forEach((d) => list.push(d.data()));
    return list;
  }

  const queryBody = {
    structuredQuery: {
      from: [{ collectionId: 'messages' }],
      orderBy: [{ field: { fieldPath: 'timestamp' }, direction: 'ASCENDING' }],
      limit: limitCount,
    },
  };

  const res = await fetch(`${BASE_REST_URL}/jointWorkspaces/${workspaceId}:runQuery`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(queryBody),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new Error(errBody?.error?.message || `Messages query failed: HTTP ${res.status}`);
  }

  const list: any[] = [];
  const jsonArray = await res.json();
  if (Array.isArray(jsonArray)) {
    for (const item of jsonArray) {
      if (item.document && item.document.fields) {
        list.push(fromFirestoreFields(item.document.fields));
      }
    }
  }
  return list;
}

export async function queryActiveRingRequests(
  workspaceId: string,
  userToken: string
): Promise<any[]> {
  const nowIso = new Date().toISOString();

  if (hasAdminCredentials()) {
    const snap = await getAdminFirestore()
      .collection('jointWorkspaces')
      .doc(workspaceId)
      .collection('ringRequests')
      .where('status', '==', 'ringing')
      .where('expiresAt', '>', nowIso)
      .get();
    const list: any[] = [];
    snap.forEach((d) => list.push(d.data()));
    return list;
  }

  const queryBody = {
    structuredQuery: {
      from: [{ collectionId: 'ringRequests' }],
      where: {
        compositeFilter: {
          op: 'AND',
          filters: [
            {
              fieldFilter: {
                field: { fieldPath: 'status' },
                op: 'EQUAL',
                value: { stringValue: 'ringing' },
              },
            },
            {
              fieldFilter: {
                field: { fieldPath: 'expiresAt' },
                op: 'GREATER_THAN',
                value: { stringValue: nowIso },
              },
            },
          ],
        },
      },
    },
  };

  const res = await fetch(`${BASE_REST_URL}/jointWorkspaces/${workspaceId}:runQuery`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(queryBody),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new Error(errBody?.error?.message || `Ring requests query failed: HTTP ${res.status}`);
  }

  const list: any[] = [];
  const jsonArray = await res.json();
  if (Array.isArray(jsonArray)) {
    for (const item of jsonArray) {
      if (item.document && item.document.fields) {
        list.push(fromFirestoreFields(item.document.fields));
      }
    }
  }
  return list;
}

export async function queryUserDeviceTokens(
  targetUid: string,
  userToken: string
): Promise<any[]> {
  if (hasAdminCredentials()) {
    const snap = await getAdminFirestore()
      .collection('users')
      .doc(targetUid)
      .collection('deviceTokens')
      .get();
    const list: any[] = [];
    snap.forEach((d) => list.push(d.data()));
    return list;
  }

  const res = await fetch(`${BASE_REST_URL}/users/${targetUid}/deviceTokens`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${userToken}`,
      Accept: 'application/json',
    },
  });

  if (res.status === 404) return [];
  if (!res.ok) return [];

  const json = await res.json();
  const list: any[] = [];
  if (Array.isArray(json.documents)) {
    for (const doc of json.documents) {
      if (doc.fields) {
        list.push(fromFirestoreFields(doc.fields));
      }
    }
  }
  return list;
}
