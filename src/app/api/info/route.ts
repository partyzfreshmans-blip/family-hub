import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserContext } from '@/lib/session';
import { query, queryOne, execute } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { HouseholdInfo } from '@/types';

export async function GET() {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const items = await query<HouseholdInfo>(
      'SELECT * FROM household_info WHERE family_id = ? ORDER BY created_at DESC',
      [ctx.family.id]
    );

    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch household info' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { category, title, value, contactPhone, notes } = body;

    if (!title || !title.trim() || !value || !value.trim()) {
      return NextResponse.json({ error: 'กรุณากรอกหัวข้อและข้อมูล' }, { status: 400 });
    }

    const id = generateId('inf');
    const now = new Date().toISOString();

    await execute(
      `INSERT INTO household_info (id, family_id, category, title, value, contact_phone, notes, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, ctx.family.id, category || 'GENERAL', title.trim(), value.trim(), contactPhone?.trim() || null, notes?.trim() || null, ctx.member.id, now]
    );

    return NextResponse.json({ success: true, id });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save household info' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    await execute('DELETE FROM household_info WHERE id = ? AND family_id = ?', [id, ctx.family.id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
