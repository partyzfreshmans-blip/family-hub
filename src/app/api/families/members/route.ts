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

import { hashPassword } from '@/lib/auth';
import { generateId } from '@/lib/utils';

// POST: Add new member directly (Admin only)
export async function POST(req: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (ctx.member.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only Family Admin can add members directly' }, { status: 403 });
    }

    const { nickname, displayName, email, pin, password, role, memberColor, initialPoints, avatarUrl } = await req.json();

    if (!nickname || !nickname.trim()) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อเรียกของสมาชิก' }, { status: 400 });
    }

    const cleanNick = nickname.trim();
    const cleanDisplay = (displayName && displayName.trim()) || cleanNick;
    let cleanEmail = email ? email.trim().toLowerCase() : '';
    const passOrPin = pin || password || '123456';

    if (passOrPin.length < 4) {
      return NextResponse.json({ error: 'PIN หรือรหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร' }, { status: 400 });
    }

    // If no email provided, generate one
    if (!cleanEmail) {
      const randomSuffix = Math.random().toString(36).substring(2, 6);
      cleanEmail = `${cleanNick.toLowerCase().replace(/\s+/g, '') || 'member'}_${randomSuffix}@familyhub.local`;
    }

    const now = new Date().toISOString();
    let userId: string;

    // Check if user already exists
    const existingUser = await queryOne<{ id: string }>('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existingUser) {
      userId = existingUser.id;
      // Check if already member of this family
      const existingMember = await queryOne<{ id: string }>(
        'SELECT id FROM family_members WHERE user_id = ? AND family_id = ?',
        [userId, ctx.family.id]
      );
      if (existingMember) {
        return NextResponse.json({ error: 'สมาชิกท่านนี้อยู่ในครอบครัวนี้อยู่แล้ว' }, { status: 400 });
      }
      if (avatarUrl !== undefined) {
        await execute('UPDATE users SET avatar_url = ?, updated_at = ? WHERE id = ?', [avatarUrl, now, userId]);
      }
    } else {
      userId = generateId('usr');
      const passwordHash = await hashPassword(passOrPin);
      await execute(
        `INSERT INTO users (id, email, password_hash, display_name, avatar_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, cleanEmail, passwordHash, cleanDisplay, avatarUrl || null, now, now]
      );
    }

    const memberId = generateId('mem');
    const assignedRole = role || 'ADULT';
    const assignedColor = memberColor || '#0284c7';
    const initialPts = initialPoints ? parseInt(initialPoints) || 0 : 0;

    await execute(
      `INSERT INTO family_members (id, family_id, user_id, role, nickname, member_color, points_balance, joined_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [memberId, ctx.family.id, userId, assignedRole, cleanNick, assignedColor, initialPts, now]
    );

    return NextResponse.json({ success: true, memberId });
  } catch (error) {
    console.error('Add member error:', error);
    return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });
  }
}

// PATCH: Update member details or role (Admin can change role, user can change own nickname/color, reset PIN/password, and adjust points)
export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      memberId,
      role,
      nickname,
      displayName,
      email,
      pin,
      password,
      memberColor,
      pointsDelta,
      pointsBalance,
      pointsReason,
      avatarUrl,
    } = await req.json();

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

    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

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

    const newRole = (isAdmin && role) ? role : targetMember.role;
    const newNick = nickname?.trim() || targetMember.nickname;
    const newColor = memberColor || targetMember.member_color;

    // Update family_members
    await execute(
      'UPDATE family_members SET role = ?, nickname = ?, member_color = ? WHERE id = ? AND family_id = ?',
      [newRole, newNick, newColor, memberId, ctx.family.id]
    );

    // Update Points if provided by Admin
    const now = new Date().toISOString();
    if (isAdmin && (pointsDelta !== undefined || pointsBalance !== undefined)) {
      let newBalance = targetMember.points_balance;
      let change = 0;
      if (pointsBalance !== undefined) {
        newBalance = Math.max(0, parseInt(pointsBalance) || 0);
        change = newBalance - targetMember.points_balance;
      } else if (pointsDelta !== undefined) {
        change = parseInt(pointsDelta) || 0;
        newBalance = Math.max(0, targetMember.points_balance + change);
      }

      if (change !== 0) {
        await execute('UPDATE family_members SET points_balance = ? WHERE id = ?', [newBalance, memberId]);
        await execute(
          `INSERT INTO points_transactions (id, family_id, family_member_id, points, source_type, description, created_at)
           VALUES (?, ?, ?, ?, 'ADMIN_ADJUST', ?, ?)`,
          [
            generateId('ptx'),
            ctx.family.id,
            memberId,
            change,
            pointsReason || (change > 0 ? `ผู้ดูแลปรับเพิ่มแต้ม (+${change})` : `ผู้ดูแลปรับลดแต้ม (${change})`),
            now,
          ]
        );
      }
    }

    // Update User details (display_name, email, avatar_url, password/PIN if provided)
    const passOrPin = pin || password;

    if (displayName !== undefined || email !== undefined || passOrPin || avatarUrl !== undefined) {
      const user = await queryOne<{ id: string; email: string; display_name: string; avatar_url: string | null }>(
        'SELECT id, email, display_name, avatar_url FROM users WHERE id = ?',
        [targetMember.user_id]
      );

      if (user) {
        const newDisplayName = displayName !== undefined ? displayName.trim() : user.display_name;
        const newEmail = email !== undefined ? email.trim().toLowerCase() : user.email;
        const newAvatar = avatarUrl !== undefined ? avatarUrl : user.avatar_url;

        if (passOrPin && passOrPin.trim()) {
          if (passOrPin.trim().length < 4) {
            return NextResponse.json({ error: 'PIN หรือรหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร' }, { status: 400 });
          }
          const passwordHash = await hashPassword(passOrPin.trim());
          await execute(
            'UPDATE users SET display_name = ?, email = ?, avatar_url = ?, password_hash = ?, updated_at = ? WHERE id = ?',
            [newDisplayName, newEmail, newAvatar, passwordHash, now, user.id]
          );
        } else {
          await execute(
            'UPDATE users SET display_name = ?, email = ?, avatar_url = ?, updated_at = ? WHERE id = ?',
            [newDisplayName, newEmail, newAvatar, now, user.id]
          );
        }
      }
    }

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
