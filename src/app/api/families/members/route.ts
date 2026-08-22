import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserContext } from '@/lib/session';
import { query, queryOne, execute } from '@/lib/db';
import { FamilyMember, Role } from '@/types';

// GET: list all members of the active family
export async function GET() {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const members = await query<FamilyMember>(
      `SELECT 
        m.id, m.family_id, m.user_id, m.role, m.nickname, m.member_color, m.points_balance, m.joined_at,
        u.display_name, u.email, u.avatar_url
       FROM family_members m
       JOIN users u ON m.user_id = u.id
       WHERE m.family_id = ?
       ORDER BY 
         CASE m.role 
           WHEN 'ADMIN' THEN 1 
           WHEN 'ADULT' THEN 2 
           ELSE 3 
         END, m.joined_at ASC`,
      [ctx.family.id]
    );

    return NextResponse.json({ members });
  } catch (error) {
    console.error('Fetch members error:', error);
    return NextResponse.json({ error: 'Failed to fetch family members' }, { status: 500 });
  }
}

// PATCH: Update member details or role (Admin can change role, user can change own nickname/color)
export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { memberId, role, nickname, memberColor } = await req.json();
    if (!memberId) {
      return NextResponse.json({ error: 'Member ID required' }, { status: 400 });
    }

    const targetMember = await queryOne<FamilyMember>(
      'SELECT * FROM family_members WHERE id = ? AND family_id = ?',
      [memberId, ctx.family.id]
    );

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found in family' }, { status: 404 });
    }

    const isSelf = targetMember.id === ctx.member.id;
    const isAdmin = ctx.member.role === 'ADMIN';

    // Role change requires ADMIN
    if (role && role !== targetMember.role) {
      if (!isAdmin) {
        return NextResponse.json({ error: 'Only Family Admin can change member roles' }, { status: 403 });
      }
      // Cannot demote last admin
      if (targetMember.role === 'ADMIN' && role !== 'ADMIN') {
        const adminCount = await queryOne<{ count: number }>(
          "SELECT COUNT(*) as count FROM family_members WHERE family_id = ? AND role = 'ADMIN'",
          [ctx.family.id]
        );
        if ((adminCount?.count || 0) <= 1) {
          return NextResponse.json({ error: 'ครอบครัวต้องมีผู้ดูแลอย่างน้อย 1 คน' }, { status: 400 });
        }
      }
    }

    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const newRole = (isAdmin && role) ? role : targetMember.role;
    const newNick = nickname?.trim() || targetMember.nickname;
    const newColor = memberColor || targetMember.member_color;

    await execute(
      'UPDATE family_members SET role = ?, nickname = ?, member_color = ? WHERE id = ? AND family_id = ?',
      [newRole, newNick, newColor, memberId, ctx.family.id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update member error:', error);
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 });
  }
}

// DELETE: Remove member (Admin only, or self-leave)
export async function DELETE(req: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get('id');

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID required' }, { status: 400 });
    }

    const targetMember = await queryOne<FamilyMember>(
      'SELECT * FROM family_members WHERE id = ? AND family_id = ?',
      [memberId, ctx.family.id]
    );

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const isSelf = targetMember.id === ctx.member.id;
    const isAdmin = ctx.member.role === 'ADMIN';

    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: 'Only Family Admin can remove members' }, { status: 403 });
    }

    if (targetMember.role === 'ADMIN') {
      const adminCount = await queryOne<{ count: number }>(
        "SELECT COUNT(*) as count FROM family_members WHERE family_id = ? AND role = 'ADMIN'",
        [ctx.family.id]
      );
      if ((adminCount?.count || 0) <= 1) {
        return NextResponse.json({ error: 'ไม่สามารถลบผู้ดูแลคนเดียวของครอบครัวได้' }, { status: 400 });
      }
    }

    await execute('DELETE FROM family_members WHERE id = ? AND family_id = ?', [memberId, ctx.family.id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove member error:', error);
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}
