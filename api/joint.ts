import { handleCors } from './_lib/cors.ts';
import { authenticateRequest, hasAdminCredentials } from './_lib/firebaseAdmin.ts';
import {
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  queryWorkspacesForUser,
  queryReceivedInvitations,
  querySentInvitations,
  queryWorkspacePendingInvitations,
  queryJointMessages,
  queryActiveRingRequests,
} from './_lib/jointFirestore.ts';

/**
 * Returns the maximum allowed total members (including owner) for a workspace relationship.
 * - Partner: 2
 * - Spouse / Married: 2
 * - Family: 10
 * - Housemate / Roommate: 10
 * - Other: 10
 */
export function getWorkspaceMemberLimit(relationship?: string): number {
  const rel = (relationship || '').toLowerCase().trim();
  if (rel === 'partner' || rel.startsWith('partner') || rel.includes('spouse') || rel.includes('married')) {
    return 2;
  }
  return 10;
}

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return res.status(405).json({
      ok: false,
      error: 'Method Not Allowed.',
    });
  }

  // 1. Authenticate user from Firebase ID Token (cryptographically verified)
  let user;
  try {
    user = await authenticateRequest(req);
  } catch (err: any) {
    return res.status(err.statusCode || 401).json({
      ok: false,
      error: err.message || 'Unauthorized.',
    });
  }

  // 2. Enforce email verification policy for shared finances
  if (!user.emailVerified) {
    return res.status(403).json({
      ok: false,
      error: 'Email verification required. Please verify your email address to access Joint Accounts.',
      email: user.email,
    });
  }

  // The joint API performs privileged multi-user operations. A Firebase ID
  // token is enough for the browser Firestore SDK, but it is not a substitute
  // for the service-account credentials needed by this serverless API. Do
  // not forward an opaque Firestore 500 when Vercel has not been configured.
  if (!hasAdminCredentials()) {
    return res.status(503).json({
      ok: false,
      code: 'FIREBASE_ADMIN_NOT_CONFIGURED',
      error: 'The server sync service is not configured. The app will use its secure direct Firestore connection instead.',
    });
  }

  const { uid, email, token } = user;
  const userEmailNormalized = (email || '').toLowerCase().trim();
  const callerDisplayName = (req.body?.displayName || email?.split('@')[0] || 'User').trim();
  const nowIso = new Date().toISOString();

  const action = req.body?.action || (req.query?.action as string);

  try {
    // -------------------------------------------------------------------------
    // ACTION: GET MY WORKSPACES
    // -------------------------------------------------------------------------
    if (action === 'get-my-workspaces' || (req.method === 'GET' && !action)) {
      const workspaces = await queryWorkspacesForUser(uid, token);

      // Sort by updatedAt descending
      workspaces.sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt).getTime() -
          new Date(a.updatedAt || a.createdAt).getTime()
      );

      return res.status(200).json({
        ok: true,
        workspaces,
      });
    }

    // -------------------------------------------------------------------------
    // ACTION: GET PENDING INVITATIONS FOR ME & SENT BY ME
    // -------------------------------------------------------------------------
    if (action === 'get-invitations') {
      if (!userEmailNormalized) {
        return res.status(200).json({ ok: true, invitations: [], sentInvitations: [] });
      }

      const [invitations, sentInvitations] = await Promise.all([
        queryReceivedInvitations(userEmailNormalized, token),
        querySentInvitations(uid, token),
      ]);

      return res.status(200).json({
        ok: true,
        invitations,
        sentInvitations,
      });
    }

    // -------------------------------------------------------------------------
    // ACTION: GET WORKSPACE PENDING INVITATIONS & CAPACITY
    // -------------------------------------------------------------------------
    if (action === 'get-workspace-invitations') {
      const workspaceId = req.body?.workspaceId || (req.query?.workspaceId as string);
      if (!workspaceId) {
        return res.status(400).json({ ok: false, error: 'Workspace ID required.' });
      }

      const wsData = await getDoc('jointWorkspaces', workspaceId, token);
      if (!wsData) {
        return res.status(404).json({ ok: false, error: 'Joint workspace not found.' });
      }

      if (!wsData.memberUids?.includes(uid)) {
        return res.status(403).json({ ok: false, error: 'Unauthorized: You are not a member of this workspace.' });
      }

      const pendingInvitations = await queryWorkspacePendingInvitations(workspaceId, token, uid);
      const activeMembers = wsData.members || [];
      const memberLimit = getWorkspaceMemberLimit(wsData.relationship);
      const occupiedSlots = activeMembers.length + pendingInvitations.length;
      const availableSlots = Math.max(0, memberLimit - occupiedSlots);

      return res.status(200).json({
        ok: true,
        workspaceId,
        pendingInvitations,
        activeMemberCount: activeMembers.length,
        pendingCount: pendingInvitations.length,
        memberLimit,
        availableSlots,
      });
    }

    // -------------------------------------------------------------------------
    // ACTION: CREATE WORKSPACE (AND OPTIONALLY INVITE MEMBER)
    // -------------------------------------------------------------------------
    if (action === 'create-workspace') {
      const { name, relationship, inviteeEmail, invitationMessage } = req.body || {};
      const workspaceName = (name || 'Our Household').trim();
      const workspaceRelationship = (relationship || 'Partner').trim();
      const memberLimit = getWorkspaceMemberLimit(workspaceRelationship);

      if (!workspaceName) {
        return res.status(400).json({ ok: false, error: 'Joint account name is required.' });
      }

      const workspaceId = `jw_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      const initialMember = {
        uid,
        email: userEmailNormalized,
        displayName: callerDisplayName,
        role: 'owner',
        joinedAt: nowIso,
        avatarColor: '#174F32',
      };

      const workspaceData = {
        id: workspaceId,
        name: workspaceName,
        relationship: workspaceRelationship,
        memberLimit,
        ownerUid: uid,
        ownerEmail: userEmailNormalized,
        ownerName: callerDisplayName,
        memberUids: [uid],
        members: [initialMember],
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      // 1. Create Workspace
      await setDoc('jointWorkspaces', workspaceId, workspaceData, token);

      // 2. Activity record
      const activityId = `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      await setDoc(
        `jointWorkspaces/${workspaceId}/activity`,
        activityId,
        {
          id: activityId,
          jointWorkspaceId: workspaceId,
          actorUid: uid,
          actorName: callerDisplayName,
          actorEmail: userEmailNormalized,
          actionType: 'workspace_created',
          description: `${callerDisplayName} created the "${workspaceName}" joint workspace.`,
          timestamp: nowIso,
        },
        token
      ).catch(() => {});

      let invitationData: any = null;

      // 3. Handle partner invitation if provided
      if (inviteeEmail && typeof inviteeEmail === 'string') {
        const targetEmail = inviteeEmail.toLowerCase().trim();
        if (targetEmail === userEmailNormalized) {
          return res.status(400).json({
            ok: false,
            error: 'You cannot invite yourself to a joint account.',
            workspace: workspaceData,
          });
        }

        const inviteId = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        invitationData = {
          id: inviteId,
          jointWorkspaceId: workspaceId,
          jointWorkspaceName: workspaceName,
          inviterUid: uid,
          inviterEmail: userEmailNormalized,
          inviterName: callerDisplayName,
          inviteeEmail: targetEmail,
          relationship: workspaceRelationship,
          message: (invitationMessage || '').trim(),
          status: 'pending',
          createdAt: nowIso,
        };

        try {
          await setDoc('jointInvitations', inviteId, invitationData, token);

          const inviteActId = `act_${Date.now()}_invite`;
          await setDoc(
            `jointWorkspaces/${workspaceId}/activity`,
            inviteActId,
            {
              id: inviteActId,
              jointWorkspaceId: workspaceId,
              actorUid: uid,
              actorName: callerDisplayName,
              actorEmail: userEmailNormalized,
              actionType: 'member_invited',
              description: `${callerDisplayName} sent an invitation to ${targetEmail}.`,
              timestamp: nowIso,
            },
            token
          ).catch(() => {});
        } catch (inviteErr: any) {
          // Compensating action: Delete workspace if invitation creation failed
          await deleteDoc('jointWorkspaces', workspaceId, token).catch(() => {});
          throw new Error(`Failed creating invitation: ${inviteErr?.message || inviteErr}`);
        }
      }

      return res.status(200).json({
        ok: true,
        workspace: workspaceData,
        invitation: invitationData,
      });
    }

    // -------------------------------------------------------------------------
    // ACTION: INVITE MEMBER TO EXISTING WORKSPACE
    // -------------------------------------------------------------------------
    if (action === 'invite-partner' || action === 'invite-member') {
      const { workspaceId, inviteeEmail, relationship, message } = req.body || {};
      if (!workspaceId || !inviteeEmail) {
        return res.status(400).json({
          ok: false,
          error: 'Workspace ID and Invitee Email are required.',
        });
      }

      const targetEmail = inviteeEmail.toLowerCase().trim();
      if (targetEmail === userEmailNormalized) {
        return res.status(400).json({
          ok: false,
          error: 'You cannot invite yourself to a joint account.',
        });
      }

      const wsData = await getDoc('jointWorkspaces', workspaceId, token);
      if (!wsData) {
        return res.status(404).json({ ok: false, error: 'Joint workspace not found.' });
      }

      if (!wsData.memberUids?.includes(uid)) {
        return res.status(403).json({
          ok: false,
          error: 'Unauthorized: You are not a member of this workspace.',
        });
      }

      // Calculate member limit for this workspace type
      const maxMembers = getWorkspaceMemberLimit(wsData.relationship);
      const activeMembers = wsData.members || [];
      const activeCount = activeMembers.length;

      // Check if already a member
      if (activeMembers.some((m: any) => m.email?.toLowerCase() === targetEmail)) {
        return res.status(400).json({
          ok: false,
          error: `${targetEmail} is already an active member of this joint workspace.`,
        });
      }

      // Query all pending invitations for this workspace to reserve slots accurately
      const pendingInvites = await queryWorkspacePendingInvitations(workspaceId, token, uid);

      // Check for existing pending invitation to this email
      const isDuplicate = pendingInvites.some(
        (i: any) => i.inviteeEmail?.toLowerCase() === targetEmail
      );
      if (isDuplicate) {
        return res.status(400).json({
          ok: false,
          error: `An invitation has already been sent to ${targetEmail} and is pending acceptance.`,
        });
      }

      // Check capacity: Active members + reserved pending invitation slots cannot exceed limit
      const totalOccupied = activeCount + pendingInvites.length;
      if (totalOccupied >= maxMembers) {
        return res.status(400).json({
          ok: false,
          error: `Workspace is at maximum capacity (${totalOccupied}/${maxMembers} slots occupied or reserved). ${wsData.relationship || 'This'} workspaces allow up to ${maxMembers} members total (${activeCount} active, ${pendingInvites.length} pending).`,
        });
      }

      const inviteId = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const invitationData = {
        id: inviteId,
        jointWorkspaceId: workspaceId,
        jointWorkspaceName: wsData.name || 'Joint Account',
        inviterUid: uid,
        inviterEmail: userEmailNormalized,
        inviterName: callerDisplayName,
        inviteeEmail: targetEmail,
        relationship: relationship || wsData.relationship || 'Partner',
        message: (message || '').trim(),
        status: 'pending',
        createdAt: nowIso,
      };

      await setDoc('jointInvitations', inviteId, invitationData, token);

      // Keep pendingInvitations synced on the workspace document for instant, zero-permission queries
      const currentPending = (wsData.pendingInvitations || []).filter(
        (p: any) => p.inviteeEmail?.toLowerCase() !== targetEmail && p.status === 'pending'
      );
      currentPending.push(invitationData);
      await updateDoc(
        'jointWorkspaces',
        workspaceId,
        {
          pendingInvitations: currentPending,
          updatedAt: nowIso,
        },
        token
      ).catch((err) => {
        console.warn('[api/joint] Updating workspace pendingInvitations error:', err);
      });

      const inviteActId = `act_${Date.now()}_invite`;
      await setDoc(
        `jointWorkspaces/${workspaceId}/activity`,
        inviteActId,
        {
          id: inviteActId,
          jointWorkspaceId: workspaceId,
          actorUid: uid,
          actorName: callerDisplayName,
          actorEmail: userEmailNormalized,
          actionType: 'member_invited',
          description: `${callerDisplayName} invited ${targetEmail} to join.`,
          timestamp: nowIso,
        },
        token
      ).catch(() => {});

      return res.status(200).json({
        ok: true,
        invitation: invitationData,
      });
    }

    // -------------------------------------------------------------------------
    // ACTION: ACCEPT INVITATION
    // -------------------------------------------------------------------------
    if (action === 'accept-invitation') {
      const { invitationId } = req.body || {};
      if (!invitationId) {
        return res.status(400).json({ ok: false, error: 'Invitation ID required.' });
      }

      const inviteData = await getDoc('jointInvitations', invitationId, token);
      if (!inviteData) {
        return res.status(404).json({ ok: false, error: 'Invitation not found.' });
      }

      if (inviteData.status !== 'pending') {
        return res.status(400).json({
          ok: false,
          error: `This invitation is no longer pending (current status: ${inviteData.status}).`,
        });
      }

      // CRITICAL SECURITY CHECK: Authenticated user's verified email must match inviteeEmail
      if (inviteData.inviteeEmail.toLowerCase() !== userEmailNormalized) {
        return res.status(403).json({
          ok: false,
          error: `Permission denied: This invitation was sent to ${inviteData.inviteeEmail}, but you are signed in as ${userEmailNormalized}.`,
        });
      }

      const workspaceId = inviteData.jointWorkspaceId;
      const wsData = await getDoc('jointWorkspaces', workspaceId, token);
      if (!wsData) {
        return res.status(404).json({ ok: false, error: 'Joint workspace does not exist.' });
      }

      const existingMembers = wsData.members || [];
      const existingUids = wsData.memberUids || [];

      if (existingUids.includes(uid)) {
        await updateDoc(
          'jointInvitations',
          invitationId,
          { status: 'accepted', respondedAt: nowIso },
          token
        );
        return res.status(200).json({ ok: true, workspace: wsData, message: 'Already a member.' });
      }

      // Re-verify capacity on the server using the workspace relationship type limit
      const maxLimit = getWorkspaceMemberLimit(wsData.relationship);
      if (existingMembers.length >= maxLimit) {
        return res.status(400).json({
          ok: false,
          error: `This joint workspace is full (${existingMembers.length}/${maxLimit} active members).`,
        });
      }

      const newMember = {
        uid,
        email: userEmailNormalized,
        displayName: callerDisplayName,
        role: 'member',
        joinedAt: nowIso,
        avatarColor: '#1D5BB5',
      };

      const updatedMembers = [...existingMembers, newMember];
      const updatedUids = Array.from(new Set([...existingUids, uid]));
      const updatedPending = (wsData.pendingInvitations || []).filter(
        (p: any) => p.id !== invitationId && p.inviteeEmail?.toLowerCase() !== userEmailNormalized
      );

      // Update workspace and invitation
      await updateDoc(
        'jointWorkspaces',
        workspaceId,
        {
          members: updatedMembers,
          memberUids: updatedUids,
          pendingInvitations: updatedPending,
          updatedAt: nowIso,
        },
        token
      );

      await updateDoc(
        'jointInvitations',
        invitationId,
        {
          status: 'accepted',
          respondedAt: nowIso,
        },
        token
      );

      // Log activity
      const actId = `act_${Date.now()}_joined`;
      await setDoc(
        `jointWorkspaces/${workspaceId}/activity`,
        actId,
        {
          id: actId,
          jointWorkspaceId: workspaceId,
          actorUid: uid,
          actorName: callerDisplayName,
          actorEmail: userEmailNormalized,
          actionType: 'member_joined',
          description: `${callerDisplayName} accepted the invitation and joined the workspace.`,
          timestamp: nowIso,
        },
        token
      ).catch(() => {});

      const updatedWs = {
        ...wsData,
        members: updatedMembers,
        memberUids: updatedUids,
        updatedAt: nowIso,
      };

      return res.status(200).json({
        ok: true,
        workspace: updatedWs,
        message: 'Successfully joined the joint workspace!',
      });
    }

    // -------------------------------------------------------------------------
    // ACTION: DECLINE INVITATION
    // -------------------------------------------------------------------------
    if (action === 'decline-invitation') {
      const { invitationId } = req.body || {};
      if (!invitationId) {
        return res.status(400).json({ ok: false, error: 'Invitation ID required.' });
      }

      const inviteData = await getDoc('jointInvitations', invitationId, token);
      if (!inviteData) {
        return res.status(404).json({ ok: false, error: 'Invitation not found.' });
      }

      if (inviteData.inviteeEmail.toLowerCase() !== userEmailNormalized) {
        return res.status(403).json({ ok: false, error: 'Unauthorized.' });
      }

      await updateDoc(
        'jointInvitations',
        invitationId,
        {
          status: 'declined',
          respondedAt: nowIso,
        },
        token
      );

      return res.status(200).json({ ok: true, message: 'Invitation declined.' });
    }

    // -------------------------------------------------------------------------
    // ACTION: REVOKE INVITATION (BY INVITER)
    // -------------------------------------------------------------------------
    if (action === 'revoke-invitation') {
      const { invitationId } = req.body || {};
      const inviteData = await getDoc('jointInvitations', invitationId, token);
      if (!inviteData) {
        return res.status(404).json({ ok: false, error: 'Invitation not found.' });
      }

      if (inviteData.inviterUid !== uid) {
        return res.status(403).json({ ok: false, error: 'Only the inviter can cancel an invitation.' });
      }

      await updateDoc(
        'jointInvitations',
        invitationId,
        {
          status: 'revoked',
          respondedAt: nowIso,
        },
        token
      );

      if (inviteData.jointWorkspaceId) {
        try {
          const ws = await getDoc('jointWorkspaces', inviteData.jointWorkspaceId, token);
          if (ws && Array.isArray(ws.pendingInvitations)) {
            const filtered = ws.pendingInvitations.filter((p: any) => p.id !== invitationId);
            await updateDoc('jointWorkspaces', inviteData.jointWorkspaceId, {
              pendingInvitations: filtered,
              updatedAt: nowIso,
            }, token);
          }
        } catch (e) {
          console.warn('[api/joint] Revoke invite workspace doc cleanup warning:', e);
        }
      }

      return res.status(200).json({ ok: true, message: 'Invitation cancelled.' });
    }

    // -------------------------------------------------------------------------
    // ACTION: LEAVE WORKSPACE OR REMOVE MEMBER
    // -------------------------------------------------------------------------
    if (action === 'leave-workspace') {
      const { workspaceId } = req.body || {};
      const wsData = await getDoc('jointWorkspaces', workspaceId, token);
      if (!wsData) {
        return res.status(404).json({ ok: false, error: 'Workspace not found.' });
      }

      const members = wsData.members || [];
      const updatedMembers = members.filter((m: any) => m.uid !== uid);
      const updatedUids = (wsData.memberUids || []).filter((id: string) => id !== uid);

      if (wsData.ownerUid === uid && updatedMembers.length > 0) {
        const newOwner = updatedMembers[0];
        newOwner.role = 'owner';
        await updateDoc(
          'jointWorkspaces',
          workspaceId,
          {
            ownerUid: newOwner.uid,
            ownerEmail: newOwner.email,
            ownerName: newOwner.displayName,
            members: updatedMembers,
            memberUids: updatedUids,
            updatedAt: nowIso,
          },
          token
        );
      } else {
        await updateDoc(
          'jointWorkspaces',
          workspaceId,
          {
            members: updatedMembers,
            memberUids: updatedUids,
            updatedAt: nowIso,
          },
          token
        );
      }

      const actId = `act_${Date.now()}_left`;
      await setDoc(
        `jointWorkspaces/${workspaceId}/activity`,
        actId,
        {
          id: actId,
          jointWorkspaceId: workspaceId,
          actorUid: uid,
          actorName: callerDisplayName,
          actorEmail: userEmailNormalized,
          actionType: 'member_left',
          description: `${callerDisplayName} left the joint workspace.`,
          timestamp: nowIso,
        },
        token
      ).catch(() => {});

      return res.status(200).json({ ok: true, message: 'Successfully left workspace.' });
    }

    if (action === 'remove-member') {
      const { workspaceId, memberUid } = req.body || {};
      const wsData = await getDoc('jointWorkspaces', workspaceId, token);
      if (!wsData) {
        return res.status(404).json({ ok: false, error: 'Workspace not found.' });
      }

      if (wsData.ownerUid !== uid) {
        return res.status(403).json({ ok: false, error: 'Only the workspace owner can remove a partner.' });
      }

      if (memberUid === uid) {
        return res.status(400).json({
          ok: false,
          error: 'Workspace owner cannot remove themselves. Use leave workspace instead.',
        });
      }

      const targetMember = wsData.members?.find((m: any) => m.uid === memberUid);
      const updatedMembers = (wsData.members || []).filter((m: any) => m.uid !== memberUid);
      const updatedUids = (wsData.memberUids || []).filter((id: string) => id !== memberUid);

      await updateDoc(
        'jointWorkspaces',
        workspaceId,
        {
          members: updatedMembers,
          memberUids: updatedUids,
          updatedAt: nowIso,
        },
        token
      );

      const actId = `act_${Date.now()}_removed`;
      await setDoc(
        `jointWorkspaces/${workspaceId}/activity`,
        actId,
        {
          id: actId,
          jointWorkspaceId: workspaceId,
          actorUid: uid,
          actorName: callerDisplayName,
          actorEmail: userEmailNormalized,
          actionType: 'member_removed',
          description: `${callerDisplayName} removed ${targetMember?.displayName || 'partner'} from the workspace.`,
          timestamp: nowIso,
        },
        token
      ).catch(() => {});

      return res.status(200).json({ ok: true, message: 'Member removed.' });
    }

    // -------------------------------------------------------------------------
    // ACTION: UPDATE WORKSPACE SETTINGS
    // -------------------------------------------------------------------------
    if (action === 'update-workspace') {
      const { workspaceId, name, relationship, notificationSettings } = req.body || {};
      const wsData = await getDoc('jointWorkspaces', workspaceId, token);
      if (!wsData) {
        return res.status(404).json({ ok: false, error: 'Workspace not found.' });
      }

      if (!wsData.memberUids?.includes(uid)) {
        return res.status(403).json({ ok: false, error: 'Unauthorized.' });
      }

      const updates: any = { updatedAt: nowIso };
      if (name && typeof name === 'string') updates.name = name.trim();

      if (relationship && typeof relationship === 'string') {
        const proposedRel = relationship.trim();
        const proposedLimit = getWorkspaceMemberLimit(proposedRel);
        const pendingInvites = await queryWorkspacePendingInvitations(workspaceId, token, uid);
        const activeCount = (wsData.members || []).length;
        const totalCount = activeCount + pendingInvites.length;

        // Prevent relationship change if it would violate the member limit
        if (totalCount > proposedLimit) {
          return res.status(400).json({
            ok: false,
            error: `Cannot switch relationship to "${proposedRel}". This workspace currently has ${activeCount} active member(s) and ${pendingInvites.length} pending invitation(s) (${totalCount} total occupied/reserved), which exceeds the limit of ${proposedLimit} for ${proposedRel}.`,
          });
        }
        updates.relationship = proposedRel;
        updates.memberLimit = proposedLimit;
      }

      if (notificationSettings && typeof notificationSettings === 'object') {
        updates.notificationSettings = notificationSettings;
      }

      await updateDoc('jointWorkspaces', workspaceId, updates, token);

      if (notificationSettings) {
        const actId = `act_${Date.now()}_settings`;
        await setDoc(
          `jointWorkspaces/${workspaceId}/activity`,
          actId,
          {
            id: actId,
            jointWorkspaceId: workspaceId,
            actorUid: uid,
            actorName: callerDisplayName,
            actorEmail: userEmailNormalized,
            actionType: 'settings_updated',
            description: `${callerDisplayName} updated joint reminder preferences.`,
            timestamp: nowIso,
          },
          token
        ).catch(() => {});
      }

      return res.status(200).json({ ok: true, workspace: { ...wsData, ...updates } });
    }

    // -------------------------------------------------------------------------
    // ACTION: UPDATE MEMBER ROLE / TRANSFER OWNERSHIP
    // -------------------------------------------------------------------------
    if (action === 'update-member-role') {
      const { workspaceId, memberUid, newRole } = req.body || {};
      if (!workspaceId || !memberUid || !newRole) {
        return res.status(400).json({ ok: false, error: 'Workspace ID, member UID, and new role are required.' });
      }

      const wsData = await getDoc('jointWorkspaces', workspaceId, token);
      if (!wsData) {
        return res.status(404).json({ ok: false, error: 'Workspace not found.' });
      }

      if (wsData.ownerUid !== uid) {
        return res.status(403).json({ ok: false, error: 'Only the workspace owner can modify member roles.' });
      }

      const members = wsData.members || [];
      const targetMember = members.find((m: any) => m.uid === memberUid);
      if (!targetMember) {
        return res.status(404).json({ ok: false, error: 'Member not found in this workspace.' });
      }

      if (newRole === 'owner') {
        // Transfer ownership
        const updatedMembers = members.map((m: any) => {
          if (m.uid === memberUid) return { ...m, role: 'owner' };
          if (m.uid === uid) return { ...m, role: 'member' };
          return m;
        });

        await updateDoc('jointWorkspaces', workspaceId, {
          ownerUid: targetMember.uid,
          ownerEmail: targetMember.email,
          ownerName: targetMember.displayName,
          members: updatedMembers,
          updatedAt: nowIso,
        }, token);

        const actId = `act_${Date.now()}_role`;
        await setDoc(
          `jointWorkspaces/${workspaceId}/activity`,
          actId,
          {
            id: actId,
            jointWorkspaceId: workspaceId,
            actorUid: uid,
            actorName: callerDisplayName,
            actorEmail: userEmailNormalized,
            actionType: 'settings_updated',
            description: `${callerDisplayName} transferred workspace ownership to ${targetMember.displayName}.`,
            timestamp: nowIso,
          },
          token
        ).catch(() => {});

        return res.status(200).json({
          ok: true,
          message: `Transferred workspace ownership to ${targetMember.displayName}.`,
          workspace: {
            ...wsData,
            ownerUid: targetMember.uid,
            ownerEmail: targetMember.email,
            ownerName: targetMember.displayName,
            members: updatedMembers,
            updatedAt: nowIso,
          },
        });
      } else {
        const updatedMembers = members.map((m: any) => {
          if (m.uid === memberUid) return { ...m, role: newRole };
          return m;
        });

        await updateDoc('jointWorkspaces', workspaceId, {
          members: updatedMembers,
          updatedAt: nowIso,
        }, token);

        return res.status(200).json({
          ok: true,
          message: `Updated role for ${targetMember.displayName} to ${newRole}.`,
          workspace: {
            ...wsData,
            members: updatedMembers,
            updatedAt: nowIso,
          },
        });
      }
    }

    // -------------------------------------------------------------------------
    // ACTION: LOG ACTIVITY
    // -------------------------------------------------------------------------
    if (action === 'log-activity') {
      const { workspaceId, activity } = req.body || {};
      if (!workspaceId || !activity) {
        return res.status(400).json({ ok: false, error: 'Missing activity data.' });
      }

      const wsData = await getDoc('jointWorkspaces', workspaceId, token);
      if (!wsData || !wsData.memberUids?.includes(uid)) {
        return res.status(403).json({ ok: false, error: 'Unauthorized.' });
      }

      const activityId = activity.id || `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      await setDoc(
        `jointWorkspaces/${workspaceId}/activity`,
        activityId,
        {
          ...activity,
          id: activityId,
          jointWorkspaceId: workspaceId,
          actorUid: uid,
          actorName: activity.actorName || callerDisplayName,
          actorEmail: userEmailNormalized,
          timestamp: activity.timestamp || nowIso,
        },
        token
      );

      return res.status(200).json({ ok: true });
    }

    // -------------------------------------------------------------------------
    // ACTION: MARK NOTIFICATION AS READ
    // -------------------------------------------------------------------------
    if (action === 'mark-notification-read') {
      const { workspaceId, notificationId } = req.body || {};
      if (!workspaceId || !notificationId) {
        return res.status(400).json({ ok: false, error: 'Missing notificationId or workspaceId.' });
      }

      const wsData = await getDoc('jointWorkspaces', workspaceId, token);
      if (!wsData || !wsData.memberUids?.includes(uid)) {
        return res.status(403).json({ ok: false, error: 'Unauthorized.' });
      }

      await updateDoc(
        `jointWorkspaces/${workspaceId}/notifications`,
        notificationId,
        { isRead: true, readAt: nowIso },
        token
      );

      return res.status(200).json({ ok: true });
    }

    // -------------------------------------------------------------------------
    // ACTION: MARK ALL NOTIFICATIONS AS READ
    // -------------------------------------------------------------------------
    if (action === 'mark-all-notifications-read') {
      const { workspaceId, notificationIds } = req.body || {};
      if (!workspaceId || !Array.isArray(notificationIds)) {
        return res.status(400).json({ ok: false, error: 'Missing notificationIds array.' });
      }

      const wsData = await getDoc('jointWorkspaces', workspaceId, token);
      if (!wsData || !wsData.memberUids?.includes(uid)) {
        return res.status(403).json({ ok: false, error: 'Unauthorized.' });
      }

      await Promise.all(
        notificationIds.map((nId: string) =>
          updateDoc(
            `jointWorkspaces/${workspaceId}/notifications`,
            nId,
            { isRead: true, readAt: nowIso },
            token
          ).catch(() => {})
        )
      );

      return res.status(200).json({ ok: true });
    }

    // -------------------------------------------------------------------------
    // ACTION: SEND JOINT MESSAGE
    // -------------------------------------------------------------------------
    if (action === 'send-message') {
      const {
        workspaceId,
        messageId,
        text,
        senderAvatarColor,
        mediaUrl,
        mediaType,
        mediaName,
        replyTo,
        replyToMessageId,
        replyToSenderId,
        replyToSenderName,
        replyToPreview,
        fileSize,
      } = req.body || {};
      if (!workspaceId || (!text && !mediaUrl)) {
        return res.status(400).json({ ok: false, error: 'Missing workspaceId or message text/media.' });
      }

      const trimmedText = (text || '').trim();
      if (!trimmedText && !mediaUrl) {
        return res.status(400).json({ ok: false, error: 'Message cannot be empty.' });
      }

      if (trimmedText.length > 2000) {
        return res.status(400).json({ ok: false, error: 'Message exceeds maximum length (2000 characters).' });
      }

      // Check workspace membership
      const wsData = await getDoc('jointWorkspaces', workspaceId, token);
      if (!wsData) {
        return res.status(404).json({ ok: false, error: 'Workspace not found.' });
      }

      if (!wsData.memberUids?.includes(uid)) {
        return res.status(403).json({ ok: false, error: 'Unauthorized: You are not a member of this workspace.' });
      }

      // Determine recipient partner UID
      const otherMembers = (wsData.members || []).filter((m: any) => m.uid !== uid);
      if (otherMembers.length === 0) {
        return res.status(400).json({
          ok: false,
          error: 'No partner has joined this workspace yet. Invite your partner to start chatting.',
        });
      }

      const recipientUid = otherMembers[0].uid;
      const finalMessageId =
        messageId && typeof messageId === 'string' && messageId.length < 128
          ? messageId
          : `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      const messageData: any = {
        id: finalMessageId,
        workspaceId,
        senderUid: uid,
        senderName: callerDisplayName,
        senderEmail: userEmailNormalized,
        senderAvatarColor: senderAvatarColor || '#174F32',
        recipientUid,
        text: trimmedText,
        timestamp: nowIso,
        status: 'sent',
      };

      if (mediaUrl) {
        messageData.mediaUrl = mediaUrl;
        messageData.mediaType = mediaType || 'image';
        if (mediaName) messageData.mediaName = mediaName;
        if (fileSize) messageData.fileSize = fileSize;
      }

      if (replyTo && typeof replyTo === 'object') {
        messageData.replyTo = {
          id: replyTo.id,
          senderName: replyTo.senderName || 'Partner',
          text: (replyTo.text || '').slice(0, 150),
        };
      }
      if (replyToMessageId) messageData.replyToMessageId = replyToMessageId;
      if (replyToSenderId) messageData.replyToSenderId = replyToSenderId;
      if (replyToSenderName) messageData.replyToSenderName = replyToSenderName;
      if (replyToPreview) messageData.replyToPreview = replyToPreview.slice(0, 150);

      // 1. Write message to subcollection
      await setDoc(
        `jointWorkspaces/${workspaceId}/messages`,
        finalMessageId,
        messageData,
        token
      );

      // 2. Write joint notification for partner device
      const notifId = `notif_${Date.now()}_msg_${Math.random().toString(36).slice(2, 6)}`;
      const previewText = trimmedText || (mediaUrl ? '📷 Sent a photo' : 'New message');
      await setDoc(
        `jointWorkspaces/${workspaceId}/notifications`,
        notifId,
        {
          id: notifId,
          scope: 'joint',
          type: 'general',
          title: `New message from ${callerDisplayName}`,
          message: previewText.length > 80 ? `${previewText.slice(0, 77)}...` : previewText,
          timestamp: nowIso,
          isRead: false,
          actorUid: uid,
          actorName: callerDisplayName,
          workspaceId,
          targetTab: 'messages',
          targetId: finalMessageId,
        },
        token
      ).catch(() => {});

      return res.status(200).json({
        ok: true,
        message: messageData,
      });
    }

    // -------------------------------------------------------------------------
    // ACTION: GET JOINT MESSAGES
    // -------------------------------------------------------------------------
    if (action === 'get-messages') {
      const workspaceId = req.body?.workspaceId || (req.query?.workspaceId as string);
      if (!workspaceId) {
        return res.status(400).json({ ok: false, error: 'Missing workspaceId.' });
      }

      const wsData = await getDoc('jointWorkspaces', workspaceId, token);
      if (!wsData || !wsData.memberUids?.includes(uid)) {
        return res.status(403).json({ ok: false, error: 'Unauthorized.' });
      }

      const limit = Number(req.body?.limit || req.query?.limit) || 100;
      const rawMessages = await queryJointMessages(workspaceId, token, Math.min(limit, 200));

      const clearedForEveryoneAt = wsData.chatClearedForEveryoneAt;
      const clearedForUserAt = wsData.clearedAtByMember?.[uid];

      const filteredMessages = rawMessages
        .filter((m: any) => {
          if (m.isDeleted) return false;
          if (Array.isArray(m.deletedForUserIds) && m.deletedForUserIds.includes(uid)) return false;
          if (clearedForEveryoneAt && new Date(m.timestamp).getTime() <= new Date(clearedForEveryoneAt).getTime()) return false;
          if (clearedForUserAt && new Date(m.timestamp).getTime() <= new Date(clearedForUserAt).getTime()) return false;
          return true;
        })
        .map((m: any) => {
          if (m.isUnsent) {
            return {
              ...m,
              text: '',
              mediaUrl: undefined,
              mediaType: undefined,
              mediaName: undefined,
            };
          }
          return m;
        });

      return res.status(200).json({
        ok: true,
        messages: filteredMessages,
      });
    }

    // -------------------------------------------------------------------------
    // ACTION: DELETE MESSAGE FOR ME
    // -------------------------------------------------------------------------
    if (action === 'delete-message-for-me') {
      const { workspaceId, messageId } = req.body || {};
      if (!workspaceId || !messageId) {
        return res.status(400).json({ ok: false, error: 'Missing workspaceId or messageId.' });
      }

      const wsData = await getDoc('jointWorkspaces', workspaceId, token);
      if (!wsData || !wsData.memberUids?.includes(uid)) {
        return res.status(403).json({ ok: false, error: 'Unauthorized.' });
      }

      const msg = await getDoc(`jointWorkspaces/${workspaceId}/messages`, messageId, token);
      if (msg) {
        const currentList = Array.isArray(msg.deletedForUserIds) ? msg.deletedForUserIds : [];
        if (!currentList.includes(uid)) {
          await updateDoc(
            `jointWorkspaces/${workspaceId}/messages`,
            messageId,
            { deletedForUserIds: [...currentList, uid] },
            token
          );
        }
      }

      return res.status(200).json({ ok: true, messageId, deletedForUid: uid });
    }

    // -------------------------------------------------------------------------
    // ACTION: UNSEND MESSAGE (FOR EVERYONE)
    // -------------------------------------------------------------------------
    if (action === 'unsend-message') {
      const { workspaceId, messageId } = req.body || {};
      if (!workspaceId || !messageId) {
        return res.status(400).json({ ok: false, error: 'Missing workspaceId or messageId.' });
      }

      const wsData = await getDoc('jointWorkspaces', workspaceId, token);
      if (!wsData || !wsData.memberUids?.includes(uid)) {
        return res.status(403).json({ ok: false, error: 'Unauthorized.' });
      }

      const msg = await getDoc(`jointWorkspaces/${workspaceId}/messages`, messageId, token);
      if (!msg) {
        return res.status(404).json({ ok: false, error: 'Message not found.' });
      }

      // Security check: Only original sender can unsend
      if (msg.senderUid !== uid) {
        return res.status(403).json({
          ok: false,
          error: 'Forbidden: You can only unsend messages that you sent.',
        });
      }

      await updateDoc(
        `jointWorkspaces/${workspaceId}/messages`,
        messageId,
        {
          isUnsent: true,
          unsentAt: nowIso,
          unsentByUid: uid,
          text: '',
          mediaUrl: '',
          mediaType: '',
          mediaName: '',
        },
        token
      );

      return res.status(200).json({
        ok: true,
        messageId,
        isUnsent: true,
        unsentAt: nowIso,
      });
    }

    // -------------------------------------------------------------------------
    // ACTION: CLEAR CHAT
    // -------------------------------------------------------------------------
    if (action === 'clear-chat') {
      const { workspaceId, scope } = req.body || {};
      if (!workspaceId) {
        return res.status(400).json({ ok: false, error: 'Missing workspaceId.' });
      }

      const clearScope = scope === 'for_everyone' ? 'for_everyone' : 'for_me';

      const wsData = await getDoc('jointWorkspaces', workspaceId, token);
      if (!wsData || !wsData.memberUids?.includes(uid)) {
        return res.status(403).json({ ok: false, error: 'Unauthorized.' });
      }

      if (clearScope === 'for_everyone') {
        // Clear for all members in the shared workspace
        await updateDoc(
          'jointWorkspaces',
          workspaceId,
          {
            chatClearedForEveryoneAt: nowIso,
            updatedAt: nowIso,
          },
          token
        );

        // Soft-delete existing message records in messages subcollection
        try {
          const messages = await queryJointMessages(workspaceId, token, 300);
          await Promise.all(
            messages.map((m: any) =>
              updateDoc(
                `jointWorkspaces/${workspaceId}/messages`,
                m.id,
                { isDeleted: true, deletedAt: nowIso },
                token
              ).catch(() => {})
            )
          );
        } catch (subErr) {
          console.warn('[clear-chat] Batch soft-delete warning:', subErr);
        }

        return res.status(200).json({
          ok: true,
          scope: 'for_everyone',
          chatClearedForEveryoneAt: nowIso,
        });
      } else {
        // Clear for current user only
        const existingCleared = wsData.clearedAtByMember || {};
        await updateDoc(
          'jointWorkspaces',
          workspaceId,
          {
            clearedAtByMember: {
              ...existingCleared,
              [uid]: nowIso,
            },
            updatedAt: nowIso,
          },
          token
        );

        return res.status(200).json({
          ok: true,
          scope: 'for_me',
          clearedAt: nowIso,
        });
      }
    }

    // -------------------------------------------------------------------------
    // ACTION: ACKNOWLEDGE MESSAGES DELIVERED
    // -------------------------------------------------------------------------
    if (action === 'acknowledge-delivered') {
      const { workspaceId, messageIds } = req.body || {};
      if (!workspaceId || !Array.isArray(messageIds) || messageIds.length === 0) {
        return res.status(400).json({ ok: false, error: 'Missing workspaceId or messageIds array.' });
      }

      const wsData = await getDoc('jointWorkspaces', workspaceId, token);
      if (!wsData || !wsData.memberUids?.includes(uid)) {
        return res.status(403).json({ ok: false, error: 'Unauthorized.' });
      }

      await Promise.all(
        messageIds.slice(0, 50).map((msgId: string) =>
          updateDoc(
            `jointWorkspaces/${workspaceId}/messages`,
            msgId,
            { status: 'delivered', deliveredAt: nowIso },
            token
          ).catch(() => {})
        )
      );

      return res.status(200).json({ ok: true });
    }

    // -------------------------------------------------------------------------
    // ACTION: MARK MESSAGES AS READ
    // -------------------------------------------------------------------------
    if (action === 'mark-messages-read') {
      const { workspaceId, messageIds } = req.body || {};
      if (!workspaceId || !Array.isArray(messageIds) || messageIds.length === 0) {
        return res.status(400).json({ ok: false, error: 'Missing workspaceId or messageIds array.' });
      }

      const wsData = await getDoc('jointWorkspaces', workspaceId, token);
      if (!wsData || !wsData.memberUids?.includes(uid)) {
        return res.status(403).json({ ok: false, error: 'Unauthorized.' });
      }

      await Promise.all(
        messageIds.slice(0, 50).map((msgId: string) =>
          updateDoc(
            `jointWorkspaces/${workspaceId}/messages`,
            msgId,
            { status: 'read', readAt: nowIso },
            token
          ).catch(() => {})
        )
      );

      return res.status(200).json({ ok: true });
    }

    // -------------------------------------------------------------------------
    // ACTION: RING PARTNER
    // -------------------------------------------------------------------------
    if (action === 'ring-partner') {
      const { workspaceId, callerAvatarColor } = req.body || {};
      if (!workspaceId) {
        return res.status(400).json({ ok: false, error: 'Missing workspaceId.' });
      }

      const wsData = await getDoc('jointWorkspaces', workspaceId, token);
      if (!wsData) {
        return res.status(404).json({ ok: false, error: 'Workspace not found.' });
      }

      if (!wsData.memberUids?.includes(uid)) {
        return res.status(403).json({ ok: false, error: 'Unauthorized: You are not a member of this workspace.' });
      }

      const partner = (wsData.members || []).find((m: any) => m.uid !== uid);
      if (!partner) {
        return res.status(400).json({
          ok: false,
          error: 'No partner has joined this workspace yet. Invite your partner before ringing.',
        });
      }

      // Check rate-limiting cooldown (30 seconds between calls)
      const recentRings = await queryActiveRingRequests(workspaceId, token).catch(() => []);
      const activeCallerRing = recentRings.find(
        (r: any) =>
          r.callerUid === uid &&
          new Date(r.createdAt).getTime() > Date.now() - 30000 &&
          r.status === 'ringing'
      );

      if (activeCallerRing) {
        const remainingSeconds = Math.max(
          1,
          Math.ceil((30000 - (Date.now() - new Date(activeCallerRing.createdAt).getTime())) / 1000)
        );
        return res.status(429).json({
          ok: false,
          error: `Please wait ${remainingSeconds}s before ringing again.`,
          retryAfter: remainingSeconds,
        });
      }

      const ringId = `ring_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const expiresAt = new Date(Date.now() + 45000).toISOString(); // 45 seconds ring timeout

      const ringData = {
        id: ringId,
        workspaceId,
        callerUid: uid,
        callerName: callerDisplayName,
        callerEmail: userEmailNormalized,
        callerAvatarColor: callerAvatarColor || '#174F32',
        targetUid: partner.uid,
        targetName: partner.displayName || 'Partner',
        status: 'ringing',
        createdAt: nowIso,
        expiresAt,
      };

      await setDoc(
        `jointWorkspaces/${workspaceId}/ringRequests`,
        ringId,
        ringData,
        token
      );

      // Create urgent joint notification
      const notifId = `notif_${Date.now()}_ring`;
      await setDoc(
        `jointWorkspaces/${workspaceId}/notifications`,
        notifId,
        {
          id: notifId,
          scope: 'joint',
          type: 'general',
          title: `🔔 Partner Alert`,
          message: `${callerDisplayName} is ringing your device!`,
          timestamp: nowIso,
          isRead: false,
          actorUid: uid,
          actorName: callerDisplayName,
          workspaceId,
          targetTab: 'messages',
          targetId: ringId,
        },
        token
      ).catch(() => {});

      return res.status(200).json({
        ok: true,
        ringRequest: ringData,
      });
    }

    // -------------------------------------------------------------------------
    // ACTION: RESPOND TO RING (ACCEPT / DISMISS / CANCEL)
    // -------------------------------------------------------------------------
    if (action === 'respond-ring') {
      const { workspaceId, ringId, responseStatus } = req.body || {};
      if (!workspaceId || !ringId || !responseStatus) {
        return res.status(400).json({ ok: false, error: 'Missing workspaceId, ringId, or responseStatus.' });
      }

      const allowedStatuses = ['accepted', 'dismissed', 'cancelled'];
      if (!allowedStatuses.includes(responseStatus)) {
        return res.status(400).json({ ok: false, error: `Invalid status: ${responseStatus}` });
      }

      const wsData = await getDoc('jointWorkspaces', workspaceId, token);
      if (!wsData || !wsData.memberUids?.includes(uid)) {
        return res.status(403).json({ ok: false, error: 'Unauthorized.' });
      }

      await updateDoc(
        `jointWorkspaces/${workspaceId}/ringRequests`,
        ringId,
        {
          status: responseStatus,
          respondedAt: nowIso,
        },
        token
      );

      return res.status(200).json({ ok: true });
    }

    // -------------------------------------------------------------------------
    // ACTION: REGISTER DEVICE TOKEN (FOR PUSH NOTIFICATIONS)
    // -------------------------------------------------------------------------
    if (action === 'register-device-token') {
      const { deviceToken, platform } = req.body || {};
      if (!deviceToken || typeof deviceToken !== 'string') {
        return res.status(400).json({ ok: false, error: 'Invalid device token.' });
      }

      const tokenId = `tok_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await setDoc(
        `users/${uid}/deviceTokens`,
        tokenId,
        {
          id: tokenId,
          userId: uid,
          token: deviceToken,
          platform: platform || 'web',
          updatedAt: nowIso,
          userAgent: (req.headers['user-agent'] || '').slice(0, 200),
        },
        token
      );

      return res.status(200).json({ ok: true, tokenId });
    }

    // -------------------------------------------------------------------------
    // ACTION: UNREGISTER DEVICE TOKEN
    // -------------------------------------------------------------------------
    if (action === 'unregister-device-token') {
      const { tokenId } = req.body || {};
      if (!tokenId) {
        return res.status(400).json({ ok: false, error: 'Missing tokenId.' });
      }

      await deleteDoc(`users/${uid}/deviceTokens`, tokenId, token).catch(() => {});
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({
      ok: false,
      error: `Unknown action: "${action}"`,
    });
  } catch (err: any) {
    console.error('[API /api/joint] Error handling action:', action, err);
    const isPermissionError =
      err?.message?.includes('Missing or insufficient permissions') ||
      err?.message?.includes('permission-denied') ||
      err?.code === 'permission-denied';

    const errorMessage = isPermissionError
      ? 'Firestore permission denied: Please publish the updated security rules from FIREBASE_SETUP.md in your Firebase Console (Build > Firestore Database > Rules).'
      : err?.message || 'Internal Server Error';

    return res.status(isPermissionError ? 403 : 500).json({
      ok: false,
      error: errorMessage,
      isRulesPermissionError: isPermissionError,
    });
  }
}
