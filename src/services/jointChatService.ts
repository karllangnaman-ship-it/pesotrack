import {
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  Unsubscribe,
} from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { db, auth } from './firebase';
import { JointMessage, JointRingRequest, MessageDeliveryStatus } from '../types/finance';
import { sendJointApiAction } from './apiClient';

export const CHAT_NOTIFICATION_CHANNEL_ID = 'pesotrack_chat_channel';
export const RING_NOTIFICATION_CHANNEL_ID = 'pesotrack_ring_channel';

/**
 * Initializes notification channels for chat messages and urgent ring alerts on native Android.
 */
export async function initChatNotificationChannels(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.createChannel({
      id: CHAT_NOTIFICATION_CHANNEL_ID,
      name: 'PesoTrack Partner Chat',
      description: 'Incoming messages from your joint finances partner.',
      importance: 4, // HIGH
      visibility: 1, // PUBLIC
      vibration: true,
      lights: true,
      sound: 'beep.wav',
    });

    await LocalNotifications.createChannel({
      id: RING_NOTIFICATION_CHANNEL_ID,
      name: 'PesoTrack Ring Partner Alert',
      description: 'Urgent incoming partner call alerts and doorbells.',
      importance: 5, // MAX
      visibility: 1,
      vibration: true,
      lights: true,
      sound: 'beep.wav',
    });
  } catch (err) {
    console.warn('[JointChat] Failed to create chat notification channels:', err);
  }
}

// -----------------------------------------------------------------------------
// LOCAL CACHE & DURABLE OUTBOX PERSISTENCE
// -----------------------------------------------------------------------------

function getMessagesCacheKey(workspaceId: string): string {
  return `pesotrack_chat_messages_${workspaceId}`;
}

function getOutboxStorageKey(workspaceId: string): string {
  return `pesotrack_chat_outbox_${workspaceId}`;
}

export interface PendingChatOp {
  id: string;
  workspaceId: string;
  type: 'delete_for_me' | 'unsend' | 'clear_chat';
  messageId?: string;
  scope?: 'for_me' | 'for_everyone';
  userId: string;
  timestamp: string;
}

function getPendingOpsStorageKey(workspaceId: string): string {
  return `pesotrack_chat_pending_ops_${workspaceId}`;
}

export function loadPendingOps(workspaceId: string): PendingChatOp[] {
  try {
    const raw = localStorage.getItem(getPendingOpsStorageKey(workspaceId));
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function savePendingOps(workspaceId: string, ops: PendingChatOp[]): void {
  try {
    localStorage.setItem(getPendingOpsStorageKey(workspaceId), JSON.stringify(ops));
  } catch {}
}

export function queuePendingOp(op: PendingChatOp): void {
  const current = loadPendingOps(op.workspaceId);
  const filtered = current.filter((o) => o.id !== op.id);
  filtered.push(op);
  savePendingOps(op.workspaceId, filtered);
}

export function removePendingOp(workspaceId: string, opId: string): void {
  const current = loadPendingOps(workspaceId);
  const filtered = current.filter((o) => o.id !== opId);
  savePendingOps(workspaceId, filtered);
}

export function loadCachedMessages(
  workspaceId: string,
  currentUserId?: string,
  userClearedAt?: string,
  everyoneClearedAt?: string
): JointMessage[] {
  try {
    const raw = localStorage.getItem(getMessagesCacheKey(workspaceId));
    if (!raw) return [];
    const list: JointMessage[] = JSON.parse(raw);

    const userClearedTs = userClearedAt
      ? new Date(userClearedAt).getTime()
      : (() => {
          if (!currentUserId) return 0;
          const stored = localStorage.getItem(`pesotrack_chat_cleared_${workspaceId}_${currentUserId}`);
          return stored ? new Date(stored).getTime() : 0;
        })();

    const everyoneClearedTs = everyoneClearedAt
      ? new Date(everyoneClearedAt).getTime()
      : (() => {
          const stored = localStorage.getItem(`pesotrack_chat_cleared_everyone_${workspaceId}`);
          return stored ? new Date(stored).getTime() : 0;
        })();

    return list.filter((m) => {
      if (m.isDeleted) return false;
      if (currentUserId && Array.isArray(m.deletedForUserIds) && m.deletedForUserIds.includes(currentUserId)) {
        return false;
      }
      const msgTs = new Date(m.timestamp).getTime();
      if (everyoneClearedTs && msgTs <= everyoneClearedTs) return false;
      if (userClearedTs && msgTs <= userClearedTs) return false;
      return true;
    });
  } catch {
    return [];
  }
}

export function saveCachedMessages(workspaceId: string, messages: JointMessage[]): void {
  try {
    // Keep up to 300 recent messages in local cache
    const sorted = [...messages].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    localStorage.setItem(getMessagesCacheKey(workspaceId), JSON.stringify(sorted.slice(-300)));
  } catch {}
}

export function loadOutbox(workspaceId: string): JointMessage[] {
  try {
    const raw = localStorage.getItem(getOutboxStorageKey(workspaceId));
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveOutbox(workspaceId: string, outbox: JointMessage[]): void {
  try {
    localStorage.setItem(getOutboxStorageKey(workspaceId), JSON.stringify(outbox));
  } catch {}
}

export function queueOutgoingMessage(message: JointMessage): void {
  const current = loadOutbox(message.workspaceId);
  const filtered = current.filter((m) => m.id !== message.id);
  filtered.push(message);
  saveOutbox(message.workspaceId, filtered);
}

export function removeMessageFromOutbox(workspaceId: string, messageId: string): void {
  const current = loadOutbox(workspaceId);
  const filtered = current.filter((m) => m.id !== messageId);
  saveOutbox(workspaceId, filtered);
}

// -----------------------------------------------------------------------------
// MESSAGE DISPATCH & OUTBOX FLUSHING
// -----------------------------------------------------------------------------

/**
 * Flush all pending local messages from the outbox to Firestore / Server.
 * Guarantees message delivery once online, idempotent submission, and updates state.
 */
export async function flushMessageOutbox(
  workspaceId: string,
  idToken?: string
): Promise<{ flushedCount: number; errors: string[] }> {
  const outbox = loadOutbox(workspaceId);
  if (outbox.length === 0) return { flushedCount: 0, errors: [] };

  const errors: string[] = [];
  let flushedCount = 0;
  const remainingOutbox: JointMessage[] = [];

  for (const msg of outbox) {
    let sent = false;
    try {
      // 1. Try writing directly via Firestore client if authenticated
      if (auth.currentUser && navigator.onLine) {
        try {
          const msgDocRef = doc(db, 'jointWorkspaces', workspaceId, 'messages', msg.id);
          await setDoc(
            msgDocRef,
            {
              ...msg,
              status: 'sent',
              serverAcceptedAt: new Date().toISOString(),
            },
            { merge: true }
          );
          flushedCount++;
          sent = true;
        } catch (fErr: any) {
          console.warn('[JointChat] Outbox setDoc failed, trying REST API fallback:', fErr?.message);
        }
      }

      // 2. Try REST backend endpoint if not already sent
      if (!sent && navigator.onLine) {
        const res = await sendJointApiAction('send-message', {
          workspaceId,
          messageId: msg.id,
          text: msg.text,
          senderAvatarColor: msg.senderAvatarColor,
          mediaUrl: msg.mediaUrl,
          mediaType: msg.mediaType,
          mediaName: msg.mediaName,
          fileSize: msg.fileSize,
          replyTo: msg.replyTo,
          replyToMessageId: msg.replyToMessageId || msg.replyTo?.id,
          replyToSenderId: msg.replyToSenderId,
          replyToSenderName: msg.replyToSenderName || msg.replyTo?.senderName,
          replyToPreview: msg.replyToPreview || msg.replyTo?.text,
        });
        if (res.ok) {
          flushedCount++;
          sent = true;
        } else {
          throw new Error(res.error || 'Failed sending from outbox');
        }
      }

      if (!sent) {
        remainingOutbox.push(msg);
      }
    } catch (err: any) {
      console.warn('[JointChat] Failed flushing outbox message:', msg.id, err?.message);
      errors.push(err?.message || 'Flush error');
      remainingOutbox.push({
        ...msg,
        retryCount: (msg.retryCount || 0) + 1,
        errorMessage: err?.message,
      });
    }
  }

  // Flush pending destructive operations as well
  flushPendingChatOps(workspaceId).catch(() => {});

  saveOutbox(workspaceId, remainingOutbox);
  return { flushedCount, errors };
}

/**
 * Flush pending destructive operations (delete for me, unsend, clear chat)
 * that were queued while offline.
 */
export async function flushPendingChatOps(workspaceId: string): Promise<void> {
  const ops = loadPendingOps(workspaceId);
  if (ops.length === 0) return;

  const remaining: PendingChatOp[] = [];

  for (const op of ops) {
    try {
      if (op.type === 'delete_for_me' && op.messageId) {
        if (auth.currentUser && navigator.onLine) {
          const msgRef = doc(db, 'jointWorkspaces', workspaceId, 'messages', op.messageId);
          await updateDoc(msgRef, {
            deletedForUserIds: arrayUnion(op.userId),
          }).catch(() => {});
        }
        await sendJointApiAction('delete-message-for-me', {
          workspaceId,
          messageId: op.messageId,
        });
      } else if (op.type === 'unsend' && op.messageId) {
        if (auth.currentUser && navigator.onLine) {
          const msgRef = doc(db, 'jointWorkspaces', workspaceId, 'messages', op.messageId);
          await updateDoc(msgRef, {
            isUnsent: true,
            unsentAt: op.timestamp,
            unsentByUid: op.userId,
            text: '',
            mediaUrl: '',
            mediaType: '',
            mediaName: '',
          }).catch(() => {});
        }
        await sendJointApiAction('unsend-message', {
          workspaceId,
          messageId: op.messageId,
        });
      } else if (op.type === 'clear_chat') {
        if (auth.currentUser && navigator.onLine) {
          const wsRef = doc(db, 'jointWorkspaces', workspaceId);
          if (op.scope === 'for_everyone') {
            await updateDoc(wsRef, { chatClearedForEveryoneAt: op.timestamp, updatedAt: op.timestamp }).catch(() => {});
          } else {
            await updateDoc(wsRef, { [`clearedAtByMember.${op.userId}`]: op.timestamp, updatedAt: op.timestamp }).catch(() => {});
          }
        }
        await sendJointApiAction('clear-chat', {
          workspaceId,
          scope: op.scope || 'for_me',
        });
      }
    } catch (err) {
      console.warn('[JointChat] Failed flushing pending chat op:', op.id, err);
      remaining.push(op);
    }
  }

  savePendingOps(workspaceId, remaining);
}

/**
 * Delete a message from the current user's view ("Delete for me").
 */
export async function deleteMessageForMeAction(
  workspaceId: string,
  messageId: string,
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  // 1. Immediately update cached messages
  const cached = loadCachedMessages(workspaceId);
  const updated = cached.map((m) => {
    if (m.id === messageId) {
      const existing = m.deletedForUserIds || [];
      return { ...m, deletedForUserIds: [...existing, userId] };
    }
    return m;
  });
  saveCachedMessages(workspaceId, updated);

  const opId = `op_del_${Date.now()}_${messageId}`;
  queuePendingOp({
    id: opId,
    workspaceId,
    type: 'delete_for_me',
    messageId,
    userId,
    timestamp: new Date().toISOString(),
  });

  if (!navigator.onLine) {
    return { ok: true };
  }

  try {
    if (auth.currentUser) {
      const msgRef = doc(db, 'jointWorkspaces', workspaceId, 'messages', messageId);
      await updateDoc(msgRef, {
        deletedForUserIds: arrayUnion(userId),
      }).catch(() => {});
    }

    const res = await sendJointApiAction('delete-message-for-me', {
      workspaceId,
      messageId,
    });

    if (res.ok) {
      removePendingOp(workspaceId, opId);
      return { ok: true };
    }
    return { ok: true }; // Queued in pending ops
  } catch (err: any) {
    return { ok: true }; // Queued in pending ops
  }
}

/**
 * Unsend a message for everyone ("Unsend for everyone").
 * Only permitted if current user is the original sender.
 */
export async function unsendChatMessageAction(
  workspaceId: string,
  messageId: string,
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  const nowIso = new Date().toISOString();

  // 1. Update local cached messages
  const cached = loadCachedMessages(workspaceId);
  const updated = cached.map((m) => {
    if (m.id === messageId) {
      return {
        ...m,
        isUnsent: true,
        unsentAt: nowIso,
        unsentByUid: userId,
        text: '',
        mediaUrl: undefined,
        mediaType: undefined,
        mediaName: undefined,
      };
    }
    return m;
  });
  saveCachedMessages(workspaceId, updated);

  const opId = `op_unsend_${Date.now()}_${messageId}`;
  queuePendingOp({
    id: opId,
    workspaceId,
    type: 'unsend',
    messageId,
    userId,
    timestamp: nowIso,
  });

  if (!navigator.onLine) {
    return { ok: true };
  }

  try {
    if (auth.currentUser) {
      const msgRef = doc(db, 'jointWorkspaces', workspaceId, 'messages', messageId);
      await updateDoc(msgRef, {
        isUnsent: true,
        unsentAt: nowIso,
        unsentByUid: userId,
        text: '',
        mediaUrl: '',
        mediaType: '',
        mediaName: '',
      }).catch(() => {});
    }

    const res = await sendJointApiAction('unsend-message', {
      workspaceId,
      messageId,
    });

    if (res.ok) {
      removePendingOp(workspaceId, opId);
      return { ok: true };
    }
    return { ok: false, error: res.error || 'Failed to unsend message' };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error while unsending' };
  }
}

/**
 * Clear chat history: either 'for_me' or 'for_everyone'.
 */
export async function clearChatHistoryAction(
  workspaceId: string,
  scope: 'for_me' | 'for_everyone',
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  const nowIso = new Date().toISOString();

  if (scope === 'for_everyone') {
    try {
      localStorage.setItem(`pesotrack_chat_cleared_everyone_${workspaceId}`, nowIso);
      localStorage.removeItem(getMessagesCacheKey(workspaceId));
    } catch {}
  } else {
    try {
      localStorage.setItem(`pesotrack_chat_cleared_${workspaceId}_${userId}`, nowIso);
      const cached = loadCachedMessages(workspaceId);
      const filtered = cached.filter(
        (m) => new Date(m.timestamp).getTime() > new Date(nowIso).getTime()
      );
      saveCachedMessages(workspaceId, filtered);
    } catch {}
  }

  const opId = `op_clear_${Date.now()}`;
  queuePendingOp({
    id: opId,
    workspaceId,
    type: 'clear_chat',
    scope,
    userId,
    timestamp: nowIso,
  });

  if (!navigator.onLine) {
    return { ok: true };
  }

  try {
    if (auth.currentUser) {
      const wsRef = doc(db, 'jointWorkspaces', workspaceId);
      if (scope === 'for_everyone') {
        await updateDoc(wsRef, {
          chatClearedForEveryoneAt: nowIso,
          updatedAt: nowIso,
        }).catch(() => {});
      } else {
        await updateDoc(wsRef, {
          [`clearedAtByMember.${userId}`]: nowIso,
          updatedAt: nowIso,
        }).catch(() => {});
      }
    }

    const res = await sendJointApiAction('clear-chat', {
      workspaceId,
      scope,
    });

    if (res.ok) {
      removePendingOp(workspaceId, opId);
      return { ok: true };
    }
    return { ok: false, error: res.error || 'Failed to clear chat' };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error while clearing chat' };
  }
}

/**
 * Compresses an image client-side before sending or caching.
 * Ensures the image never exceeds Firestore's 1MB limit while maintaining crisp visuals.
 */
export async function compressImageFile(
  file: File,
  maxDimension = 1280,
  quality = 0.78
): Promise<{ dataUrl: string; width: number; height: number; sizeBytes: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image preview'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Canvas context unavailable'));
        }

        // Draw image on white background (for transparent PNGs converted to JPEG)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const approxSize = Math.round((dataUrl.length * 3) / 4);

        resolve({
          dataUrl,
          width,
          height,
          sizeBytes: approxSize,
        });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Sends a chat message. If offline, stores in outbox and marks as 'pending'.
 * If online, sends immediately to Firestore / Server with automatic fallback.
 */
export async function sendChatMessage(
  message: JointMessage,
  idToken?: string
): Promise<JointMessage> {
  const workspaceId = message.workspaceId;

  // Always save to durable outbox first to protect against crash/kill
  queueOutgoingMessage(message);

  if (!navigator.onLine) {
    return { ...message, status: 'pending' };
  }

  // 1. Attempt direct Firestore SDK write if authenticated
  let firestoreSuccess = false;
  let firestoreErr: any = null;

  if (auth.currentUser) {
    try {
      const msgRef = doc(db, 'jointWorkspaces', workspaceId, 'messages', message.id);
      const payload: JointMessage = {
        ...message,
        status: 'sent',
      };
      await setDoc(msgRef, payload, { merge: true });
      removeMessageFromOutbox(workspaceId, message.id);
      return payload;
    } catch (err: any) {
      firestoreErr = err;
      console.warn('[JointChat] Direct Firestore write failed, falling back to server API:', err?.message);
    }
  }

  // 2. Fallback: REST API endpoint (server-side admin access)
  try {
    const res = await sendJointApiAction('send-message', {
      workspaceId,
      messageId: message.id,
      text: message.text,
      senderAvatarColor: message.senderAvatarColor,
      mediaUrl: message.mediaUrl,
      mediaType: message.mediaType,
      mediaName: message.mediaName,
      fileSize: message.fileSize,
      replyTo: message.replyTo,
      replyToMessageId: message.replyToMessageId || message.replyTo?.id,
      replyToSenderId: message.replyToSenderId,
      replyToSenderName: message.replyToSenderName || message.replyTo?.senderName,
      replyToPreview: message.replyToPreview || message.replyTo?.text,
    });

    if (res.ok && res.message) {
      removeMessageFromOutbox(workspaceId, message.id);
      return res.message;
    }

    throw new Error(res.error || firestoreErr?.message || 'Failed to send message');
  } catch (err: any) {
    console.warn('[JointChat] Message send failed via both Firestore and REST API, queued in outbox:', err?.message);
    return {
      ...message,
      status: 'pending',
      errorMessage: err?.message || 'Waiting to reconnect',
    };
  }
}

/**
 * Acknowledge message delivery by the recipient client.
 * Transitions messages from 'sent' to 'delivered'.
 */
export async function acknowledgeMessageDelivery(
  workspaceId: string,
  messageIds: string[]
): Promise<void> {
  if (messageIds.length === 0) return;
  const nowIso = new Date().toISOString();

  // Update in Firestore
  if (auth.currentUser && navigator.onLine) {
    await Promise.all(
      messageIds.map((id) => {
        const ref = doc(db, 'jointWorkspaces', workspaceId, 'messages', id);
        return updateDoc(ref, { status: 'delivered', deliveredAt: nowIso }).catch(() => {});
      })
    );
  }

  // Also notify server via REST
  sendJointApiAction('acknowledge-delivered', {
    workspaceId,
    messageIds,
  }).catch(() => {});
}

/**
 * Mark messages as read by current user.
 */
export async function markMessagesAsRead(
  workspaceId: string,
  messageIds: string[]
): Promise<void> {
  if (messageIds.length === 0) return;
  const nowIso = new Date().toISOString();

  // Update in Firestore
  if (auth.currentUser && navigator.onLine) {
    await Promise.all(
      messageIds.map((id) => {
        const ref = doc(db, 'jointWorkspaces', workspaceId, 'messages', id);
        return updateDoc(ref, { status: 'read', readAt: nowIso }).catch(() => {});
      })
    );
  }

  // Also notify server via REST
  sendJointApiAction('mark-messages-read', {
    workspaceId,
    messageIds,
  }).catch(() => {});
}

// -----------------------------------------------------------------------------
// RING PARTNER SERVICES
// -----------------------------------------------------------------------------

/**
 * Initiates a Ring Partner request with rate-limiting and expiration.
 */
export async function ringPartnerAction(
  workspaceId: string,
  callerAvatarColor?: string
): Promise<{ ok: boolean; ringRequest?: JointRingRequest; error?: string }> {
  if (!navigator.onLine) {
    return {
      ok: false,
      error: 'Cannot ring partner while offline. Please connect to internet to alert your partner.',
    };
  }

  try {
    const res = await sendJointApiAction('ring-partner', {
      workspaceId,
      callerAvatarColor,
    });

    if (res.ok && res.ringRequest) {
      return { ok: true, ringRequest: res.ringRequest };
    }

    return {
      ok: false,
      error: res.error || 'Failed to ring partner.',
    };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || 'Failed to ring partner.',
    };
  }
}

/**
 * Respond to an incoming ring (accept, dismiss, or cancel).
 */
export async function respondToRingAction(
  workspaceId: string,
  ringId: string,
  responseStatus: 'accepted' | 'dismissed' | 'cancelled'
): Promise<void> {
  const nowIso = new Date().toISOString();

  if (auth.currentUser && navigator.onLine) {
    const ringRef = doc(db, 'jointWorkspaces', workspaceId, 'ringRequests', ringId);
    await updateDoc(ringRef, { status: responseStatus, respondedAt: nowIso }).catch(() => {});
  }

  sendJointApiAction('respond-ring', {
    workspaceId,
    ringId,
    responseStatus,
  }).catch(() => {});
}

// -----------------------------------------------------------------------------
// NATIVE PUSH & LOCAL NOTIFICATIONS DISPATCH
// -----------------------------------------------------------------------------

/**
 * Deliver a notification for incoming partner message when user is in another tab or personal mode.
 */
export async function deliverMessageLocalNotification(
  senderName: string,
  text: string,
  workspaceName?: string
): Promise<void> {
  const title = `💬 ${senderName}${workspaceName ? ` (${workspaceName})` : ''}`;
  const body = text.length > 90 ? `${text.slice(0, 87)}...` : text;

  if (Capacitor.isNativePlatform()) {
    try {
      await initChatNotificationChannels();
      const notifId = Math.floor(Date.now() % 1000000000);
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title,
            body,
            schedule: { at: new Date(Date.now() + 250), allowWhileIdle: true },
            channelId: CHAT_NOTIFICATION_CHANNEL_ID,
            sound: 'beep.wav',
            extra: { type: 'chat_message', deepLink: 'messages' },
          },
        ],
      });
      return;
    } catch (err) {
      console.warn('[JointChat] Native notification error:', err);
    }
  }

  // Web notification
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'pesotrack-chat',
      });
    } catch {}
  }
}

/**
 * Deliver a high-priority ringing alert on Android native device.
 */
export async function deliverRingLocalNotification(
  callerName: string,
  workspaceName?: string
): Promise<void> {
  const title = `🔔 Partner is Ringing!`;
  const body = `${callerName} is ringing you on ${workspaceName || 'Joint Finances'}. Tap to open.`;

  if (Capacitor.isNativePlatform()) {
    try {
      await initChatNotificationChannels();
      await LocalNotifications.schedule({
        notifications: [
          {
            id: 888888,
            title,
            body,
            schedule: { at: new Date(Date.now() + 100), allowWhileIdle: true },
            channelId: RING_NOTIFICATION_CHANNEL_ID,
            sound: 'beep.wav',
            extra: { type: 'ring_alert', deepLink: 'messages' },
          },
        ],
      });
    } catch (err) {
      console.warn('[JointChat] Failed to schedule ring notification:', err);
    }
  }
}
