import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserContext } from '@/lib/session';
import { query, queryOne, execute, transaction } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { CalendarEvent } from '@/types';

// GET: list events with optional date filtering
export async function GET(req: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let sql = `
      SELECT e.*, GROUP_CONCAT(em.family_member_id) as member_ids_str
      FROM events e
      LEFT JOIN event_members em ON e.id = em.event_id
      WHERE e.family_id = ?
    `;
    const params: any[] = [ctx.family.id];

    if (startDate && endDate) {
      sql += ' AND (e.event_date >= ? AND e.event_date <= ? OR e.recurrence_rule != "NONE")';
      params.push(startDate, endDate);
    }

    sql += ' GROUP BY e.id ORDER BY e.event_date ASC, e.start_time ASC';

    const rawEvents = await query<CalendarEvent & { member_ids_str?: string }>(sql, params);

    const events = rawEvents.map((e) => ({
      ...e,
      member_ids: e.member_ids_str ? e.member_ids_str.split(',') : [],
    }));

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Fetch events error:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

// POST: Create event
export async function POST(req: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      description,
      eventDate,
      startTime,
      endTime,
      allDay,
      location,
      category,
      recurrenceRule,
      reminderMinutes,
      memberIds,
    } = body;

    if (!title || !title.trim() || !eventDate) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อกิจกรรมและวันที่' }, { status: 400 });
    }

    const eventId = generateId('evt');
    const now = new Date().toISOString();

    await transaction(async () => {
      await execute(
        `INSERT INTO events (
          id, family_id, title, description, event_date, start_time, end_time,
          all_day, location, category, recurrence_rule, reminder_minutes,
          created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          eventId,
          ctx.family.id,
          title.trim(),
          description?.trim() || null,
          eventDate,
          startTime || null,
          endTime || null,
          allDay ? 1 : 0,
          location?.trim() || null,
          category || 'Family',
          recurrenceRule || 'NONE',
          reminderMinutes || 0,
          ctx.member.id,
          now,
          now,
        ]
      );

      if (Array.isArray(memberIds)) {
        for (const mid of memberIds) {
          if (mid) {
            await execute(
              'INSERT OR IGNORE INTO event_members (event_id, family_member_id) VALUES (?, ?)',
              [eventId, mid]
            );
          }
        }
      }
    });

    return NextResponse.json({ success: true, eventId });
  } catch (error) {
    console.error('Create event error:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}

// PUT / PATCH: Update event
export async function PUT(req: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      id,
      title,
      description,
      eventDate,
      startTime,
      endTime,
      allDay,
      location,
      category,
      recurrenceRule,
      reminderMinutes,
      memberIds,
    } = body;

    if (!id || !title || !eventDate) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }

    const existing = await queryOne('SELECT * FROM events WHERE id = ? AND family_id = ?', [id, ctx.family.id]);
    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const now = new Date().toISOString();

    await transaction(async () => {
      await execute(
        `UPDATE events SET 
          title = ?, description = ?, event_date = ?, start_time = ?, end_time = ?,
          all_day = ?, location = ?, category = ?, recurrence_rule = ?,
          reminder_minutes = ?, updated_at = ?
         WHERE id = ? AND family_id = ?`,
        [
          title.trim(),
          description?.trim() || null,
          eventDate,
          startTime || null,
          endTime || null,
          allDay ? 1 : 0,
          location?.trim() || null,
          category || 'Family',
          recurrenceRule || 'NONE',
          reminderMinutes || 0,
          now,
          id,
          ctx.family.id,
        ]
      );

      await execute('DELETE FROM event_members WHERE event_id = ?', [id]);
      if (Array.isArray(memberIds)) {
        for (const mid of memberIds) {
          if (mid) {
            await execute('INSERT INTO event_members (event_id, family_member_id) VALUES (?, ?)', [id, mid]);
          }
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update event error:', error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

// DELETE event
export async function DELETE(req: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('id');

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
    }

    await execute('DELETE FROM events WHERE id = ? AND family_id = ?', [eventId, ctx.family.id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
