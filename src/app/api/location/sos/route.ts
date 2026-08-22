import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserContext } from '@/lib/session';
import { query, queryOne, execute } from '@/lib/db';
import { SosEvent, FamilyMember } from '@/types';

export const dynamic = 'force-dynamic';

// GET /api/location/sos - Get active SOS events for family
export async function GET() {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const events = await query<SosEvent>(
      `SELECT s.*, m.nickname, m.member_color FROM sos_events s
       JOIN family_members m ON s.family_member_id = m.id
       WHERE s.family_id = ? AND s.status = 'ACTIVE' ORDER BY s.started_at DESC`,
      [ctx.family.id]
    );

    return NextResponse.json(events);
  } catch (error: any) {
    console.error('Error fetching SOS events:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/location/sos - Start an SOS event
export async function POST(request: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = ctx.family.id;
    const memberId = ctx.member.id;
    const body = await request.json();
    const { latitude = 0, longitude = 0, accuracy = 10 } = body;

    const now = new Date().toISOString();

    // Check if member already has an active SOS
    const existing = await queryOne<SosEvent>(
      `SELECT * FROM sos_events WHERE family_id = ? AND family_member_id = ? AND status = 'ACTIVE'`,
      [familyId, memberId]
    );

    let sosId = existing?.id;
    if (existing) {
      await execute(
        `UPDATE sos_events SET last_latitude = ?, last_longitude = ?, last_accuracy = ?, last_updated_at = ? WHERE id = ?`,
        [latitude, longitude, accuracy, now, existing.id]
      );
    } else {
      sosId = `sos_${Date.now()}`;
      await execute(
        `INSERT INTO sos_events (id, family_id, family_member_id, status, started_at, initial_latitude, initial_longitude, initial_accuracy, last_latitude, last_longitude, last_accuracy, last_updated_at)
         VALUES (?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [sosId, familyId, memberId, now, latitude, longitude, accuracy, latitude, longitude, accuracy, now]
      );

      // Notify other members
      const member = await queryOne<FamilyMember>(`SELECT * FROM family_members WHERE id = ?`, [memberId]);
      const otherMembers = await query<FamilyMember>(
        `SELECT * FROM family_members WHERE family_id = ? AND id != ?`,
        [familyId, memberId]
      );

      for (const om of otherMembers) {
        const notifId = `notif_${Date.now()}_${om.id}`;
        await execute(
          `INSERT INTO notifications (id, user_id, family_id, type, title, message, read, created_at)
           VALUES (?, ?, ?, 'SOS', ?, ?, 0, ?)`,
          [
            notifId,
            om.user_id,
            familyId,
            '🚨 แจ้งเตือนฉุกเฉิน (SOS)',
            `ขอความช่วยเหลือจาก ${member?.nickname || 'สมาชิกในครอบครัว'} กำลังแชร์ตำแหน่งล่าสุด`,
            now,
          ]
        );
      }
    }

    return NextResponse.json({ success: true, id: sosId, started_at: now });
  } catch (error: any) {
    console.error('Error starting SOS:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/location/sos - Resolve or Stop an SOS event
export async function PUT(request: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = ctx.family.id;
    const memberId = ctx.member.id;
    const now = new Date().toISOString();

    await execute(
      `UPDATE sos_events SET status = 'RESOLVED', ended_at = ? WHERE family_id = ? AND family_member_id = ? AND status = 'ACTIVE'`,
      [now, familyId, memberId]
    );

    return NextResponse.json({ success: true, ended_at: now });
  } catch (error: any) {
    console.error('Error stopping SOS:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
