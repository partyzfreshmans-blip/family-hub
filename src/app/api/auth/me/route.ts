import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserContext } from '@/lib/session';
import { setSessionCookie } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { User, FamilyMember } from '@/types';
import { getSessionCookie } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSessionCookie();
    if (!session?.userId) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const user = await queryOne<User>(
      'SELECT id, email, display_name, avatar_url, created_at, updated_at FROM users WHERE id = ?',
      [session.userId]
    );

    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({
        authenticated: true,
        user,
        hasFamily: false,
      });
    }

    return NextResponse.json({
      authenticated: true,
      user: ctx.user,
      family: ctx.family,
      member: ctx.member,
      allMemberships: ctx.allMemberships,
      hasFamily: true,
    });
  } catch (error) {
    console.error('Me endpoint error:', error);
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
  }
}

// Switch active family
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionCookie();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { familyId } = await req.json();
    if (!familyId) {
      return NextResponse.json({ error: 'Family ID required' }, { status: 400 });
    }

    const member = await queryOne<FamilyMember>(
      'SELECT * FROM family_members WHERE user_id = ? AND family_id = ?',
      [session.userId, familyId]
    );

    if (!member) {
      return NextResponse.json({ error: 'You are not a member of this family' }, { status: 403 });
    }

    await setSessionCookie({
      ...session,
      activeFamilyId: member.family_id,
      activeMemberId: member.id,
      role: member.role,
    });

    return NextResponse.json({ success: true, activeFamilyId: member.family_id });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to switch family' }, { status: 500 });
  }
}
