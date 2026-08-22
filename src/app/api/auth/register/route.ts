import { NextRequest, NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { hashPassword, setSessionCookie } from '@/lib/auth';
import { generateId } from '@/lib/utils';
import { User } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const { email, password, displayName } = await req.json();

    if (!email || !password || !displayName) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน (อีเมล, รหัสผ่าน, ชื่อ)' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await queryOne<User>('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing) {
      return NextResponse.json(
        { error: 'อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่นหรือเข้าสู่ระบบ' },
        { status: 409 }
      );
    }

    const userId = generateId('usr');
    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();

    await execute(
      `INSERT INTO users (id, email, password_hash, display_name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, cleanEmail, passwordHash, displayName.trim(), now, now]
    );

    // Set initial session
    await setSessionCookie({
      userId,
      email: cleanEmail,
      displayName: displayName.trim(),
    });

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: cleanEmail,
        display_name: displayName.trim(),
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการลงทะเบียน' }, { status: 500 });
  }
}
