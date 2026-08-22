import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserContext } from '@/lib/session';
import { queryOne, execute } from '@/lib/db';
import { MemberLocationSettings } from '@/types';

export const dynamic = 'force-dynamic';

// GET /api/location/settings - Get current member's location settings
export async function GET() {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = ctx.family.id;
    const memberId = ctx.member.id;
    const now = new Date().toISOString();

    let settings = await queryOne<MemberLocationSettings>(
      `SELECT * FROM member_location_settings WHERE family_id = ? AND family_member_id = ?`,
      [familyId, memberId]
    );

    if (!settings) {
      const id = `locset_${memberId}_${Date.now()}`;
      await execute(
        `INSERT INTO member_location_settings (id, family_id, family_member_id, sharing_mode, sharing_enabled, history_enabled, retention_days, updated_at)
         VALUES (?, ?, ?, 'APP_ACTIVE', 1, 0, 7, ?)`,
        [id, familyId, memberId, now]
      );
      settings = {
        id,
        family_id: familyId,
        family_member_id: memberId,
        sharing_mode: 'APP_ACTIVE',
        sharing_enabled: 1,
        sharing_expires_at: null,
        history_enabled: 0,
        retention_days: 7,
        updated_at: now,
      };
    }

    return NextResponse.json(settings);
  } catch (error: any) {
    console.error('Error getting location settings:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/location/settings - Update current member's location settings
export async function PUT(request: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = ctx.family.id;
    const memberId = ctx.member.id;
    const body = await request.json();

    const {
      sharing_mode = 'APP_ACTIVE',
      sharing_enabled = 1,
      duration_hours = null, // e.g. 1, 4, 8, 'EOD'
      history_enabled = 0,
      retention_days = 7,
    } = body;

    const now = new Date();
    let expiresAt: string | null = null;

    if (sharing_mode === 'TIMED') {
      if (duration_hours === 'EOD') {
        const eod = new Date(now);
        eod.setHours(23, 59, 59, 999);
        expiresAt = eod.toISOString();
      } else {
        const hours = Number(duration_hours) || 4;
        expiresAt = new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
      }
    }

    const existing = await queryOne<MemberLocationSettings>(
      `SELECT * FROM member_location_settings WHERE family_id = ? AND family_member_id = ?`,
      [familyId, memberId]
    );

    const nowIso = now.toISOString();

    if (existing) {
      await execute(
        `UPDATE member_location_settings
         SET sharing_mode = ?, sharing_enabled = ?, sharing_expires_at = ?, history_enabled = ?, retention_days = ?, updated_at = ?
         WHERE id = ?`,
        [
          sharing_mode,
          sharing_enabled ? 1 : 0,
          expiresAt,
          history_enabled ? 1 : 0,
          Number(retention_days) || 7,
          nowIso,
          existing.id,
        ]
      );
    } else {
      const id = `locset_${memberId}_${Date.now()}`;
      await execute(
        `INSERT INTO member_location_settings (id, family_id, family_member_id, sharing_mode, sharing_enabled, sharing_expires_at, history_enabled, retention_days, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          familyId,
          memberId,
          sharing_mode,
          sharing_enabled ? 1 : 0,
          expiresAt,
          history_enabled ? 1 : 0,
          Number(retention_days) || 7,
          nowIso,
        ]
      );
    }

    return NextResponse.json({
      success: true,
      sharing_mode,
      sharing_enabled: sharing_enabled ? 1 : 0,
      sharing_expires_at: expiresAt,
      history_enabled: history_enabled ? 1 : 0,
      retention_days: Number(retention_days) || 7,
    });
  } catch (error: any) {
    console.error('Error updating location settings:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
