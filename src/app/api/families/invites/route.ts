import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserContext } from '@/lib/session';
import { query, queryOne, execute } from '@/lib/db';
import { generateId, generateInviteCode } from '@/lib/utils';
import { FamilyInvite } from '@/types';

// GET active invites
export async function GET() {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const invites = await query<FamilyInvite>(
      'SELECT * FROM family_invites WHERE family_id = ? AND revoked = 0 ORDER BY created_at DESC',
      [ctx.family.id]
    );

    return NextResponse.json({ invites });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 });
  }
}

// POST: generate new invite code (Admin & Adult allowed)
export async function POST(req: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (ctx.member.role === 'CHILD') {
      return NextResponse.json({ error: 'Children cannot generate invite codes' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const role = body.role || 'ADULT';
    const inviteCode = generateInviteCode();
    const now = new Date().toISOString();

    const newInvite: FamilyInvite = {
      id: generateId('inv'),
      family_id: ctx.family.id,
      invite_code: inviteCode,
      role: role,
      revoked: 0,
      created_by: ctx.member.id,
      created_at: now,
    };

    await execute(
      `INSERT INTO family_invites (id, family_id, invite_code, role, revoked, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [newInvite.id, newInvite.family_id, newInvite.invite_code, newInvite.role, 0, newInvite.created_by, newInvite.created_at]
    );

    return NextResponse.json({ success: true, invite: newInvite });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
  }
}

// DELETE: revoke invite
export async function DELETE(req: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (ctx.member.role === 'CHILD') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const inviteId = searchParams.get('id');

    if (!inviteId) {
      return NextResponse.json({ error: 'Invite ID required' }, { status: 400 });
    }

    await execute('UPDATE family_invites SET revoked = 1 WHERE id = ? AND family_id = ?', [inviteId, ctx.family.id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to revoke invite' }, { status: 500 });
  }
}
