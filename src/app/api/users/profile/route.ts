import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserContext } from '@/lib/session';
import { execute, queryOne } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { User, FamilyMember } from '@/types';

// PATCH: Update current user's own profile (avatar_url, display_name, nickname, member_color, pin/password)
export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { avatarUrl, displayName, nickname, memberColor, pin, password } = await req.json();

    const now = new Date().toISOString();
    const cleanDisplayName = displayName !== undefined ? displayName.trim() : ctx.user.display_name;

    // 1. Update users table (avatar_url, display_name, password if provided)
    const passOrPin = pin || password;
    if (passOrPin && passOrPin.trim()) {
      if (passOrPin.trim().length < 4) {
        return NextResponse.json({ error: 'PIN หรือรหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร' }, { status: 400 });
      }
      const passwordHash = await hashPassword(passOrPin.trim());
      if (avatarUrl !== undefined) {
        await execute(
          'UPDATE users SET avatar_url = ?, display_name = ?, password_hash = ?, updated_at = ? WHERE id = ?',
          [avatarUrl, cleanDisplayName, passwordHash, now, ctx.user.id]
        );
      } else {
        await execute(
          'UPDATE users SET display_name = ?, password_hash = ?, updated_at = ? WHERE id = ?',
          [cleanDisplayName, passwordHash, now, ctx.user.id]
        );
      }
    } else {
      if (avatarUrl !== undefined) {
        await execute(
          'UPDATE users SET avatar_url = ?, display_name = ?, updated_at = ? WHERE id = ?',
          [avatarUrl, cleanDisplayName, now, ctx.user.id]
        );
      } else {
        await execute(
          'UPDATE users SET display_name = ?, updated_at = ? WHERE id = ?',
          [cleanDisplayName, now, ctx.user.id]
        );
      }
    }

    // 2. Update family_members table if nickname or memberColor provided
    if (ctx.member && (nickname !== undefined || memberColor !== undefined)) {
      const cleanNickname = nickname !== undefined ? nickname.trim() : ctx.member.nickname;
      const cleanColor = memberColor || ctx.member.member_color;

      await execute(
        'UPDATE family_members SET nickname = ?, member_color = ? WHERE id = ? AND family_id = ?',
        [cleanNickname, cleanColor, ctx.member.id, ctx.family.id]
      );
    }

    const updatedUser = await queryOne<User>(
      'SELECT id, email, display_name, avatar_url, created_at, updated_at FROM users WHERE id = ?',
      [ctx.user.id]
    );

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
