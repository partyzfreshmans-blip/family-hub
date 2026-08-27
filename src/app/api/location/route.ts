import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserContext } from '@/lib/session';
import { query, queryOne, execute } from '@/lib/db';
import { matchSavedPlace, calculateDistanceMeters, getStaleStatus } from '@/lib/geo';
import { FamilyMember, FamilySavedPlace, MemberCurrentLocation, MemberLocationSettings, SosEvent, LocationRequest } from '@/types';

export const dynamic = 'force-dynamic';

// GET /api/location - Fetch family members' current locations, saved places, and status
export async function GET(request: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = ctx.family.id;
    const currentMemberId = ctx.member.id;
    const now = new Date().toISOString();

    // 1. Fetch all family members
    const members = await query<FamilyMember>(
      `SELECT m.*, u.display_name, u.email, u.avatar_url 
       FROM family_members m 
       JOIN users u ON m.user_id = u.id 
       WHERE m.family_id = ? 
       ORDER BY m.joined_at ASC`,
      [familyId]
    );

    // 2. Fetch saved places
    const places = await query<FamilySavedPlace>(
      `SELECT * FROM family_saved_places WHERE family_id = ? AND active = 1 ORDER BY name ASC`,
      [familyId]
    );

    // 3. Fetch location settings for all members
    const allSettings = await query<MemberLocationSettings>(
      `SELECT * FROM member_location_settings WHERE family_id = ?`,
      [familyId]
    );
    const settingsMap = new Map<string, MemberLocationSettings>();
    allSettings.forEach((s) => settingsMap.set(s.family_member_id, s));

    // 4. Fetch current locations for all members
    const rawLocations = await query<MemberCurrentLocation>(
      `SELECT * FROM member_current_locations WHERE family_id = ?`,
      [familyId]
    );
    const locationMap = new Map<string, MemberCurrentLocation>();
    rawLocations.forEach((l) => locationMap.set(l.family_member_id, l));

    // 5. Build member location payload with privacy filtering
    const memberLocations: (MemberCurrentLocation & { is_sharing: boolean; sharing_mode: string })[] = [];

    for (const mem of members) {
      const settings = settingsMap.get(mem.id);
      const loc = locationMap.get(mem.id);

      let isSharing = false;
      let sharingMode = 'OFF';

      if (settings) {
        sharingMode = settings.sharing_mode;
        if (settings.sharing_enabled === 1 && settings.sharing_mode !== 'OFF') {
          if (settings.sharing_mode === 'TIMED' && settings.sharing_expires_at) {
            if (new Date(settings.sharing_expires_at).getTime() > Date.now()) {
              isSharing = true;
            } else {
              // Expired
              isSharing = false;
            }
          } else {
            isSharing = true;
          }
        }
      }

      if (loc && (isSharing || mem.id === currentMemberId)) {
        const { matchedPlace, distanceMeters } = matchSavedPlace(loc.latitude, loc.longitude, places);
        const staleStatus = isSharing ? getStaleStatus(loc.recorded_at) : 'DISABLED';

        memberLocations.push({
          ...loc,
          member: mem,
          matched_place: matchedPlace,
          distance_to_place_meters: distanceMeters,
          stale_status: staleStatus,
          is_sharing: isSharing,
          sharing_mode: sharingMode,
        });
      } else {
        // Not sharing or no location yet
        memberLocations.push({
          id: `empty_${mem.id}`,
          family_id: familyId,
          family_member_id: mem.id,
          latitude: 0,
          longitude: 0,
          accuracy: 0,
          recorded_at: '',
          updated_at: '',
          member: mem,
          matched_place: null,
          distance_to_place_meters: null,
          stale_status: 'DISABLED',
          is_sharing: isSharing,
          sharing_mode: sharingMode,
        });
      }
    }

    // 6. Fetch active SOS events
    const activeSos = await query<SosEvent>(
      `SELECT s.*, m.nickname, m.member_color FROM sos_events s
       JOIN family_members m ON s.family_member_id = m.id
       WHERE s.family_id = ? AND s.status = 'ACTIVE' ORDER BY s.started_at DESC`,
      [familyId]
    );

    // 7. Fetch pending location requests targeted at current member
    const pendingRequests = await query<LocationRequest>(
      `SELECT r.*, m.nickname as requester_nickname, m.member_color as requester_color FROM location_requests r
       JOIN family_members m ON r.requester_member_id = m.id
       WHERE r.family_id = ? AND r.target_member_id = ? AND r.status = 'PENDING' AND r.expires_at > ?
       ORDER BY r.requested_at DESC`,
      [familyId, currentMemberId, now]
    );

    // Current member's own settings
    const mySettings = settingsMap.get(currentMemberId) || {
      id: `locset_${currentMemberId}`,
      family_id: familyId,
      family_member_id: currentMemberId,
      sharing_mode: 'APP_ACTIVE',
      sharing_enabled: 1,
      sharing_expires_at: null,
      history_enabled: 0,
      retention_days: 7,
      updated_at: now,
    };

    return NextResponse.json({
      members: memberLocations,
      places,
      mySettings,
      activeSos,
      pendingRequests,
    });
  } catch (error: any) {
    console.error('Error fetching family locations:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/location - Post current member's location update
export async function POST(request: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = ctx.family.id;
    const memberId = ctx.member.id;
    const body = await request.json();

    const { latitude, longitude, accuracy, source = 'foreground' } = body;

    // Validation
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json({ error: 'Invalid latitude or longitude values' }, { status: 400 });
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: 'Latitude/longitude out of range' }, { status: 400 });
    }
    const acc = typeof accuracy === 'number' && accuracy >= 0 ? accuracy : 10;

    const now = new Date().toISOString();

    // 1. Get or create member location settings
    let settings = await queryOne<MemberLocationSettings>(
      `SELECT * FROM member_location_settings WHERE family_id = ? AND family_member_id = ?`,
      [familyId, memberId]
    );

    if (!settings) {
      const newSettingsId = `locset_${memberId}_${Date.now()}`;
      await execute(
        `INSERT INTO member_location_settings (id, family_id, family_member_id, sharing_mode, sharing_enabled, history_enabled, retention_days, updated_at)
         VALUES (?, ?, ?, 'APP_ACTIVE', 1, 0, 7, ?)`,
        [newSettingsId, familyId, memberId, now]
      );
      settings = {
        id: newSettingsId,
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

    // 2. Fetch saved places for match detection
    const places = await query<FamilySavedPlace>(
      `SELECT * FROM family_saved_places WHERE family_id = ? AND active = 1`,
      [familyId]
    );
    const { matchedPlace } = matchSavedPlace(latitude, longitude, places);

    // 3. Upsert current location
    const existingLoc = await queryOne<MemberCurrentLocation>(
      `SELECT * FROM member_current_locations WHERE family_id = ? AND family_member_id = ?`,
      [familyId, memberId]
    );

    if (existingLoc) {
      await execute(
        `UPDATE member_current_locations
         SET latitude = ?, longitude = ?, accuracy = ?, recorded_at = ?, updated_at = ?, source = ?
         WHERE id = ?`,
        [latitude, longitude, acc, now, now, source, existingLoc.id]
      );
    } else {
      const locId = `curloc_${memberId}_${Date.now()}`;
      await execute(
        `INSERT INTO member_current_locations (id, family_id, family_member_id, latitude, longitude, accuracy, recorded_at, updated_at, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [locId, familyId, memberId, latitude, longitude, acc, now, now, source]
      );
    }

    // 4. If history enabled, apply write filtering (min 30m movement or 60s elapsed)
    if (settings.history_enabled === 1) {
      let shouldWriteHistory = true;
      if (existingLoc) {
        const dist = calculateDistanceMeters(existingLoc.latitude, existingLoc.longitude, latitude, longitude);
        const timeDiffSec = (new Date(now).getTime() - new Date(existingLoc.recorded_at).getTime()) / 1000;
        if (dist < 30 && timeDiffSec < 60 && source !== 'sos' && source !== 'one_time_share') {
          shouldWriteHistory = false;
        }
      }

      if (shouldWriteHistory) {
        const histId = `hist_${memberId}_${Date.now()}`;
        await execute(
          `INSERT INTO member_location_history (id, family_id, family_member_id, latitude, longitude, accuracy, recorded_at, source, created_at, place_name)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [histId, familyId, memberId, latitude, longitude, acc, now, source, now, matchedPlace ? matchedPlace.name : null]
        );

        // Retention cleanup
        if (settings.retention_days > 0) {
          const purgeCutoff = new Date(Date.now() - settings.retention_days * 24 * 60 * 60 * 1000).toISOString();
          await execute(
            `DELETE FROM member_location_history WHERE family_id = ? AND family_member_id = ? AND recorded_at < ?`,
            [familyId, memberId, purgeCutoff]
          );
        }
      }
    }

    // 5. If sharing mode was 'ONCE', turn it off after this update
    if (settings.sharing_mode === 'ONCE') {
      await execute(
        `UPDATE member_location_settings SET sharing_mode = 'OFF', sharing_enabled = 0, updated_at = ? WHERE id = ?`,
        [now, settings.id]
      );
    }

    // 6. Update active SOS if exists
    const activeSos = await queryOne<SosEvent>(
      `SELECT * FROM sos_events WHERE family_id = ? AND family_member_id = ? AND status = 'ACTIVE'`,
      [familyId, memberId]
    );
    if (activeSos) {
      await execute(
        `UPDATE sos_events SET last_latitude = ?, last_longitude = ?, last_accuracy = ?, last_updated_at = ? WHERE id = ?`,
        [latitude, longitude, acc, now, activeSos.id]
      );
    }

    return NextResponse.json({
      success: true,
      recorded_at: now,
      matched_place: matchedPlace,
    });
  } catch (error: any) {
    console.error('Error updating member location:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
