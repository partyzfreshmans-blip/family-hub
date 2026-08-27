import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { seedDatabase } from '@/lib/seed';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await seedDatabase();

    // Fetch primary family
    const family = await queryOne<{ id: string; name: string }>(
      'SELECT id, name FROM families ORDER BY created_at ASC LIMIT 1'
    );

    if (!family) {
      return NextResponse.json({ members: [], familyName: '' });
    }

    const members = await query<{
      id: string;
      nickname: string;
      display_name: string;
      avatar_url: string | null;
      member_color: string;
      role: string;
      email: string;
    }>(
      `SELECT m.id, m.nickname, m.member_color, m.role, u.display_name, u.email, u.avatar_url 
       FROM family_members m 
       JOIN users u ON m.user_id = u.id 
       WHERE m.family_id = ? 
       ORDER BY 
         CASE m.role 
           WHEN 'ADMIN' THEN 1 
           WHEN 'ADULT' THEN 2 
           WHEN 'CHILD' THEN 3 
           ELSE 4 
         END, 
         m.joined_at ASC`,
      [family.id]
    );

    return NextResponse.json({
      members,
      familyName: family.name,
    });
  } catch (error) {
    console.error('Fetch auth members error:', error);
    return NextResponse.json({ members: [], familyName: '' });
  }
}
