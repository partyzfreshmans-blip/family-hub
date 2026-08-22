import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserContext } from '@/lib/session';
import { query, execute } from '@/lib/db';
import { MemberLocationHistory } from '@/types';

export const dynamic = 'force-dynamic';

// GET /api/location/history - Fetch location history for a family member
export async function GET(request: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetMemberId = searchParams.get('memberId') || ctx.member.id;

    const history = await query<MemberLocationHistory>(
      `SELECT * FROM member_location_history
       WHERE family_id = ? AND family_member_id = ?
       ORDER BY recorded_at DESC LIMIT 100`,
      [ctx.family.id, targetMemberId]
    );

    return NextResponse.json(history);
  } catch (error: any) {
    console.error('Error fetching location history:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/location/history - Purge location history for current member
export async function DELETE(request: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = ctx.family.id;
    const memberId = ctx.member.id;
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'ALL'; // 'TODAY', 'WEEK', 'ALL'

    const now = new Date();

    if (range === 'TODAY') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      await execute(
        `DELETE FROM member_location_history WHERE family_id = ? AND family_member_id = ? AND recorded_at >= ?`,
        [familyId, memberId, todayStart]
      );
    } else if (range === 'WEEK') {
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      await execute(
        `DELETE FROM member_location_history WHERE family_id = ? AND family_member_id = ? AND recorded_at >= ?`,
        [familyId, memberId, weekStart]
      );
    } else {
      await execute(
        `DELETE FROM member_location_history WHERE family_id = ? AND family_member_id = ?`,
        [familyId, memberId]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting location history:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
