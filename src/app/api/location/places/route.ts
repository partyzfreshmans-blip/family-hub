import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserContext } from '@/lib/session';
import { query, queryOne, execute } from '@/lib/db';
import { FamilySavedPlace } from '@/types';

export const dynamic = 'force-dynamic';

// GET /api/location/places - Get all saved places for active family
export async function GET() {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const places = await query<FamilySavedPlace>(
      `SELECT * FROM family_saved_places WHERE family_id = ? AND active = 1 ORDER BY name ASC`,
      [ctx.family.id]
    );

    return NextResponse.json(places);
  } catch (error: any) {
    console.error('Error fetching saved places:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/location/places - Create new saved place
export async function POST(request: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = ctx.family.id;
    const memberId = ctx.member.id;
    const body = await request.json();

    const {
      name,
      latitude,
      longitude,
      radius_meters = 150,
      category = 'OTHER',
      icon = 'MapPin',
    } = body;

    if (!name || typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json({ error: 'Missing name or coordinates' }, { status: 400 });
    }

    const id = `place_${Date.now()}`;
    const now = new Date().toISOString();

    await execute(
      `INSERT INTO family_saved_places (id, family_id, name, latitude, longitude, radius_meters, category, icon, active, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      [id, familyId, name.trim(), latitude, longitude, Math.max(50, Number(radius_meters) || 150), category, icon, memberId, now, now]
    );

    return NextResponse.json({
      id,
      family_id: familyId,
      name: name.trim(),
      latitude,
      longitude,
      radius_meters: Math.max(50, Number(radius_meters) || 150),
      category,
      icon,
      active: 1,
      created_by: memberId,
      created_at: now,
      updated_at: now,
    });
  } catch (error: any) {
    console.error('Error creating saved place:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/location/places - Update an existing saved place
export async function PUT(request: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = ctx.family.id;
    const body = await request.json();

    const { id, name, latitude, longitude, radius_meters, category, icon } = body;
    if (!id) {
      return NextResponse.json({ error: 'Place ID required' }, { status: 400 });
    }

    const existing = await queryOne<FamilySavedPlace>(
      `SELECT * FROM family_saved_places WHERE id = ? AND family_id = ?`,
      [id, familyId]
    );
    if (!existing) {
      return NextResponse.json({ error: 'Place not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    await execute(
      `UPDATE family_saved_places
       SET name = ?, latitude = ?, longitude = ?, radius_meters = ?, category = ?, icon = ?, updated_at = ?
       WHERE id = ? AND family_id = ?`,
      [
        name ? name.trim() : existing.name,
        typeof latitude === 'number' ? latitude : existing.latitude,
        typeof longitude === 'number' ? longitude : existing.longitude,
        radius_meters ? Math.max(50, Number(radius_meters)) : existing.radius_meters,
        category || existing.category,
        icon || existing.icon,
        now,
        id,
        familyId,
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating saved place:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/location/places - Delete a saved place
export async function DELETE(request: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Place ID required' }, { status: 400 });
    }

    await execute(
      `DELETE FROM family_saved_places WHERE id = ? AND family_id = ?`,
      [id, ctx.family.id]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting saved place:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
