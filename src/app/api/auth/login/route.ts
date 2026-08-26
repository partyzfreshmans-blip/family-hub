import { NextRequest, NextResponse } from 'next/server';
import { queryOne, query } from '@/lib/db';
import { verifyPassword, setSessionCookie } from '@/lib/auth';
import { seedDatabase } from '@/lib/seed';
import { User, FamilyMember } from '@/types';

export async function POST(req: NextRequest) {
  try {
    // Auto-seed if database is empty on first run
    await seedDatabase();

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'กรุณากรอกอีเมลและรหัสผ่าน' },
        { status: 400 }
      );
    }

    const cleanInput = email.trim().toLowerCase();
    let user = await queryOne<User & { password_hash: string }>(
      'SELECT id, email, password_hash, display_name, avatar_url, created_at, updated_at FROM users WHERE LOWER(email) = ?',
      [cleanInput]
    );

    if (!user) {
      // Try matching by email username prefix (e.g. "ton" -> "ton@...")
      user = await queryOne<User & { password_hash: string }>(
        'SELECT id, email, password_hash, display_name, avatar_url, created_at, updated_at FROM users WHERE LOWER(email) LIKE ?',
        [`${cleanInput}@%`]
      );
    }

    if (!user) {
      // Try matching by family member nickname
      const memMatch = await queryOne<{ user_id: string }>(
        'SELECT user_id FROM family_members WHERE LOWER(nickname) = ? LIMIT 1',
        [cleanInput]
      );
      if (memMatch) {
        user = await queryOne<User & { password_hash: string }>(
          'SELECT id, email, password_hash, display_name, avatar_url, created_at, updated_at FROM users WHERE id = ?',
          [memMatch.user_id]
        );
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json(
        { error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    // Check family membership
    const memberships = await query<FamilyMember>(
      'SELECT * FROM family_members WHERE user_id = ? ORDER BY joined_at ASC',
      [user.id]
    );

    const firstMember = memberships[0];

    await setSessionCookie({
      userId: user.id,
      email: user.email,
      displayName: user.display_name,
      activeFamilyId: firstMember?.family_id,
      activeMemberId: firstMember?.id,
      role: firstMember?.role,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
      },
      hasFamily: memberships.length > 0,
      activeFamilyId: firstMember?.family_id,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' }, { status: 500 });
  }
}
