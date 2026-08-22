import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserContext } from '@/lib/session';
import { query, queryOne, execute } from '@/lib/db';
import { LocationRequest, FamilyMember } from '@/types';

export const dynamic = 'force-dynamic';

// GET /api/location/requests - Get pending requests for current member
export async function GET() {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = ctx.family.id;
    const memberId = ctx.member.id;
    const now = new Date().toISOString();

    const requests = await query<LocationRequest>(
      `SELECT r.*, m.nickname as requester_nickname, m.member_color as requester_color FROM location_requests r
       JOIN family_members m ON r.requester_member_id = m.id
       WHERE r.family_id = ? AND r.target_member_id = ? AND r.status = 'PENDING' AND r.expires_at > ?
       ORDER BY r.requested_at DESC`,
      [familyId, memberId, now]
    );

    return NextResponse.json(requests);
  } catch (error: any) {
    console.error('Error fetching location requests:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/location/requests - Send a location request to a family member
export async function POST(request: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = ctx.family.id;
    const requesterId = ctx.member.id;
    const body = await request.json();
    const { target_member_id } = body;

    if (!target_member_id) {
      return NextResponse.json({ error: 'Target member ID required' }, { status: 400 });
    }
    if (target_member_id === requesterId) {
      return NextResponse.json({ error: 'Cannot request your own location' }, { status: 400 });
    }

    // Verify target belongs to same family
    const target = await queryOne<FamilyMember>(
      `SELECT * FROM family_members WHERE id = ? AND family_id = ?`,
      [target_member_id, familyId]
    );
    if (!target) {
      return NextResponse.json({ error: 'Family member not found' }, { status: 404 });
    }

    const now = new Date();
    const nowIso = now.toISOString();

    // Check rate limit: max 1 pending or recent request within last 2 minutes
    const recentReq = await queryOne<LocationRequest>(
      `SELECT * FROM location_requests
       WHERE family_id = ? AND requester_member_id = ? AND target_member_id = ? AND requested_at > ?`,
      [familyId, requesterId, target_member_id, new Date(now.getTime() - 2 * 60 * 1000).toISOString()]
    );
    if (recentReq) {
      return NextResponse.json(
        { error: 'คุณเพิ่งส่งคำขอตำแหน่งไปเมื่อสักครู่ กรุณารอสักครู่ก่อนส่งใหม่' },
        { status: 429 }
      );
    }

    const id = `locreq_${Date.now()}`;
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString(); // 15 mins expiry

    await execute(
      `INSERT INTO location_requests (id, family_id, requester_member_id, target_member_id, status, requested_at, expires_at)
       VALUES (?, ?, ?, ?, 'PENDING', ?, ?)`,
      [id, familyId, requesterId, target_member_id, nowIso, expiresAt]
    );

    // Create notification for target
    const requester = await queryOne<FamilyMember>(
      `SELECT * FROM family_members WHERE id = ?`,
      [requesterId]
    );
    const notifId = `notif_${Date.now()}`;
    await execute(
      `INSERT INTO notifications (id, user_id, family_id, type, title, message, read, created_at)
       VALUES (?, ?, ?, 'LOCATION_REQUEST', ?, ?, 0, ?)`,
      [
        notifId,
        target.user_id,
        familyId,
        '📍 คำขอตำแหน่งปัจจุบัน',
        `${requester?.nickname || 'สมาชิกในครอบครัว'} ขอตำแหน่งปัจจุบันของคุณ`,
        nowIso,
      ]
    );

    return NextResponse.json({ success: true, id, expires_at: expiresAt });
  } catch (error: any) {
    console.error('Error creating location request:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/location/requests - Respond to location request (Approve or Decline)
export async function PUT(request: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = ctx.family.id;
    const memberId = ctx.member.id;
    const body = await request.json();
    const { id, action } = body; // action: 'APPROVE' | 'DECLINE'

    if (!id || !['APPROVE', 'DECLINE'].includes(action)) {
      return NextResponse.json({ error: 'Valid request ID and action required' }, { status: 400 });
    }

    const req = await queryOne<LocationRequest>(
      `SELECT * FROM location_requests WHERE id = ? AND family_id = ? AND target_member_id = ?`,
      [id, familyId, memberId]
    );
    if (!req) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const status = action === 'APPROVE' ? 'APPROVED' : 'DECLINED';

    await execute(
      `UPDATE location_requests SET status = ?, responded_at = ? WHERE id = ?`,
      [status, now, id]
    );

    return NextResponse.json({ success: true, status });
  } catch (error: any) {
    console.error('Error responding to location request:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
