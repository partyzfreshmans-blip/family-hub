import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserContext } from '@/lib/session';
import { getSessionCookie, setSessionCookie } from '@/lib/auth';
import { execute, query, queryOne, transaction } from '@/lib/db';
import { generateId, generateInviteCode } from '@/lib/utils';
import { Family } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionCookie();
    if (!session?.userId) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    const { name, nickname, avatarIcon } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'กรุณาระบุชื่อครอบครัว' }, { status: 400 });
    }

    const familyId = generateId('fam');
    const memberId = generateId('mem');
    const now = new Date().toISOString();
    const cleanNick = nickname?.trim() || session.displayName || 'สมาชิก';

    await transaction(async () => {
      // 1. Insert Family
      await execute(
        `INSERT INTO families (id, name, owner_id, currency, monthly_budget, rewards_enabled, avatar_icon, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [familyId, name.trim(), session.userId, 'THB', 20000, 1, avatarIcon || 'home', now, now]
      );

      // 2. Insert Owner as ADMIN Member
      await execute(
        `INSERT INTO family_members (id, family_id, user_id, role, nickname, member_color, points_balance, joined_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [memberId, familyId, session.userId, 'ADMIN', cleanNick, '#0284c7', 0, now]
      );

      // 3. Generate initial invite code
      const inviteCode = generateInviteCode();
      await execute(
        `INSERT INTO family_invites (id, family_id, invite_code, role, revoked, created_by, created_at)
         VALUES (?, ?, ?, ?, 0, ?, ?)`,
        [generateId('inv'), familyId, inviteCode, 'ADULT', memberId, now]
      );
    });

    // Update session cookie with active family
    await setSessionCookie({
      ...session,
      activeFamilyId: familyId,
      activeMemberId: memberId,
      role: 'ADMIN',
    });

    return NextResponse.json({
      success: true,
      familyId,
      name: name.trim(),
    });
  } catch (error) {
    console.error('Create family error:', error);
    return NextResponse.json({ error: 'ไม่สามารถสร้างครอบครัวได้' }, { status: 500 });
  }
}
