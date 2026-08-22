import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie, setSessionCookie } from '@/lib/auth';
import { execute, queryOne } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { FamilyInvite, FamilyMember, Family } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionCookie();
    if (!session?.userId) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    const { inviteCode, nickname } = await req.json();
    if (!inviteCode || !inviteCode.trim()) {
      return NextResponse.json({ error: 'กรุณากรอกรหัสเชิญ' }, { status: 400 });
    }

    const cleanCode = inviteCode.trim().toUpperCase();

    // 1. Verify invite code
    const invite = await queryOne<FamilyInvite>(
      'SELECT * FROM family_invites WHERE invite_code = ? AND revoked = 0',
      [cleanCode]
    );

    if (!invite) {
      return NextResponse.json({ error: 'รหัสเชิญไม่ถูกต้องหรือถูกยกเลิกแล้ว' }, { status: 404 });
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'รหัสเชิญนี้หมดอายุแล้ว' }, { status: 400 });
    }

    // 2. Check if already member
    const existingMember = await queryOne<FamilyMember>(
      'SELECT * FROM family_members WHERE family_id = ? AND user_id = ?',
      [invite.family_id, session.userId]
    );

    const family = await queryOne<Family>('SELECT * FROM families WHERE id = ?', [invite.family_id]);
    if (!family) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลครอบครัว' }, { status: 404 });
    }

    let memberId: string;
    const now = new Date().toISOString();
    const cleanNick = nickname?.trim() || session.displayName || 'สมาชิก';

    if (existingMember) {
      memberId = existingMember.id;
    } else {
      memberId = generateId('mem');
      const colors = ['#0284c7', '#ec4899', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      await execute(
        `INSERT INTO family_members (id, family_id, user_id, role, nickname, member_color, points_balance, joined_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
        [memberId, invite.family_id, session.userId, invite.role, cleanNick, randomColor, now]
      );
    }

    // Update session active family
    await setSessionCookie({
      ...session,
      activeFamilyId: invite.family_id,
      activeMemberId: memberId,
      role: invite.role,
    });

    return NextResponse.json({
      success: true,
      familyId: invite.family_id,
      familyName: family.name,
      role: invite.role,
    });
  } catch (error) {
    console.error('Join family error:', error);
    return NextResponse.json({ error: 'ไม่สามารถเข้าร่วมครอบครัวได้' }, { status: 500 });
  }
}
