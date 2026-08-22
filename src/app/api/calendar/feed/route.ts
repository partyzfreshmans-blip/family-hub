import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { CalendarEvent, Family } from '@/types';

export const dynamic = 'force-dynamic';

function formatIcsDate(dateStr: string, timeStr?: string | null, allDay?: number): { start: string; end: string } {
  const cleanDate = dateStr.replace(/-/g, '');
  if (allDay || !timeStr) {
    return {
      start: `VALUE=DATE:${cleanDate}`,
      end: `VALUE=DATE:${cleanDate}`,
    };
  }

  const cleanTime = timeStr.replace(/:/g, '') + '00';
  const start = `;TZID=Asia/Bangkok:${cleanDate}T${cleanTime}`;

  // Default duration 1 hour if no end time
  const [h, m] = timeStr.split(':').map(Number);
  const endH = String((h + 1) % 24).padStart(2, '0');
  const endCleanTime = `${endH}${String(m).padStart(2, '0')}00`;
  const end = `;TZID=Asia/Bangkok:${cleanDate}T${endCleanTime}`;

  return { start, end };
}

function getRrule(rule?: string | null): string | null {
  if (!rule || rule === 'NONE') return null;
  switch (rule) {
    case 'DAILY':
      return 'RRULE:FREQ=DAILY';
    case 'WEEKDAYS':
      return 'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR';
    case 'WEEKLY':
      return 'RRULE:FREQ=WEEKLY';
    case 'BIWEEKLY':
      return 'RRULE:FREQ=WEEKLY;INTERVAL=2';
    case 'MONTHLY':
      return 'RRULE:FREQ=MONTHLY';
    case 'YEARLY':
      return 'RRULE:FREQ=YEARLY';
    default:
      return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const familyId = searchParams.get('familyId') || searchParams.get('id');

    if (!familyId) {
      return new NextResponse('Family ID required', { status: 400 });
    }

    const family = await queryOne<Family>('SELECT * FROM families WHERE id = ?', [familyId]);
    if (!family) {
      return new NextResponse('Family not found', { status: 404 });
    }

    // Fetch all events for this family
    const events = await query<CalendarEvent>(
      'SELECT * FROM events WHERE family_id = ? ORDER BY event_date ASC',
      [family.id]
    );

    // Fetch upcoming bills too
    const bills = await query<{ id: string; name: string; amount: number; due_date: string; recurrence_rule: string; category: string }>(
      'SELECT * FROM bills WHERE family_id = ? AND status != "PAID"',
      [family.id]
    );

    const nowIso = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    let ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Family Hub//TH',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${family.name} - Family Hub`,
      'X-WR-TIMEZONE:Asia/Bangkok',
      'X-WR-CALDESC:ปฏิทินกิจกรรมและบิลค่าใช้จ่ายของครอบครัว',
    ];

    // Add Events
    for (const ev of events) {
      const { start, end } = formatIcsDate(ev.event_date, ev.start_time, ev.all_day);
      const rrule = getRrule(ev.recurrence_rule);

      ics.push(
        'BEGIN:VEVENT',
        `UID:evt_${ev.id}@familyhub.local`,
        `DTSTAMP:${nowIso}`,
        `SUMMARY:${ev.title.replace(/\n/g, ' ')}`,
        `DTSTART${start}`,
        `DTEND${end}`
      );

      if (ev.description) {
        ics.push(`DESCRIPTION:${ev.description.replace(/\n/g, '\\n')}`);
      }
      if (ev.location) {
        ics.push(`LOCATION:${ev.location.replace(/\n/g, ' ')}`);
      }
      if (ev.category) {
        ics.push(`CATEGORIES:${ev.category}`);
      }
      if (rrule) {
        ics.push(rrule);
      }

      // Add reminder alarm (30 mins before)
      ics.push(
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:เตือนกิจกรรม: ${ev.title}`,
        'TRIGGER:-PT30M',
        'END:VALARM',
        'END:VEVENT'
      );
    }

    // Add Bills as all-day events
    for (const b of bills) {
      const cleanDate = b.due_date.replace(/-/g, '');
      const rrule = getRrule(b.recurrence_rule);

      ics.push(
        'BEGIN:VEVENT',
        `UID:bill_${b.id}@familyhub.local`,
        `DTSTAMP:${nowIso}`,
        `SUMMARY:🧾 ครบกำหนดบิล: ${b.name} (฿${b.amount.toLocaleString()})`,
        `DTSTART;VALUE=DATE:${cleanDate}`,
        `DTEND;VALUE=DATE:${cleanDate}`,
        `DESCRIPTION:บิลค่าใช้จ่ายประจำบ้าน ${b.name} จำนวน ฿${b.amount.toLocaleString()}`,
        `CATEGORIES:Bills`
      );

      if (rrule) {
        ics.push(rrule);
      }

      ics.push(
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:เตือนชำระบิล: ${b.name}`,
        'TRIGGER:-P1D',
        'END:VALARM',
        'END:VEVENT'
      );
    }

    ics.push('END:VCALENDAR');

    const icsContent = ics.join('\r\n');

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `inline; filename="${encodeURIComponent(family.name)}.ics"`,
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Calendar Feed Error:', error);
    return new NextResponse('Internal server error generating calendar feed', { status: 500 });
  }
}
