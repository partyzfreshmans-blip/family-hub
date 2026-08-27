import { NextRequest, NextResponse } from 'next/server';
import { queryOne, query } from '@/lib/db';
import { verifyPassword, setSessionCookie } from '@/lib/auth';
import { seedDatabase } from '@/lib/seed';
import { User, FamilyMember } from '@/types';

export async function POST(req: NextRequest) {
  try {
    // Auto-seed if database is empty on first run
    await seedDatabase();

    const body = await req.json();
    const identifier = (body.identifier || body.email || body.username || body.nickname || '').trim();
    const passOrPin = String(body.pin || body.password || '').trim();

    if (!identifier || !passOrPin) {
      return NextResponse.json(
        { error: 'กรุณากรอกชื่อเรียก/อีเมล และรหัส PIN' },
        { status: 400 }
      );
    }

    const cleanInput = identifier.toLowerCase();
    
    // 1. Try matching by exact email
    let user = await queryOne<User & { password_hash: string }>(
      'SELECT id, email, password_hash, display_name, avatar_url, created_at, updated_at FROM users WHERE LOWER(email) = ?',
      [cleanInput]
    );

    // 2. Try matching by email prefix before @
    if (!user) {
      user = await queryOne<User & { password_hash: string }>(
        'SELECT id, email, password_hash, display_name, avatar_url, created_at, updated_at FROM users WHERE LOWER(email) LIKE ?',
        [`${cleanInput}@%`]
      );
    }

    // 3. Try matching by family member nickname (case-insensitive)
    if (!user) {
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

    // 4. Try matching by display_name
    if (!user) {
      user = await queryOne<User & { password_hash: string }>(
        'SELECT id, email, password_hash, display_name, avatar_url, created_at, updated_at FROM users WHERE LOWER(display_name) = ? OR display_name LIKE ?',
        [cleanInput, `${identifier}%`]
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'ไม่พบบัญชีผู้ใช้นี้ในระบบ กรุณาตรวจสอบชื่อเรียกหรืออีเมล' },
        { status: 401 }
      );
    }

    // Verify Password or PIN
    let valid = await verifyPassword(passOrPin, user.password_hash);
    
    // Support default demo fallback for initial seed accounts
    if (!valid && (passOrPin === '123456' || passOrPin === 'password123')) {
      const isDefault = await verifyPassword('password123', user.password_hash);
      if (isDefault) {
        valid = true;
      }
    }

    if (!valid) {
      return NextResponse.json(
        { error: 'รหัส PIN หรือรหัสผ่านไม่ถูกต้อง' },
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
