import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserContext } from '@/lib/session';
import { execute, transaction } from '@/lib/db';
import { generateId } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (ctx.member.role === 'CHILD') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { items } = await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'ไม่มีรายการที่ต้องการบันทึก' }, { status: 400 });
    }

    const now = new Date().toISOString();
    let insertedCount = 0;

    await transaction(async () => {
      for (const item of items) {
        const numAmount = parseFloat(item.amount);
        if (isNaN(numAmount) || numAmount <= 0 || !item.description) {
          continue;
        }

        const expenseId = generateId('exp');
        await execute(
          `INSERT INTO expenses (
            id, family_id, amount, category, description, paid_by,
            expense_date, note, created_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            expenseId,
            ctx.family.id,
            numAmount,
            item.category || 'Other',
            item.description.trim(),
            item.paidBy || ctx.member.id,
            item.expenseDate || now.split('T')[0],
            item.note?.trim() || 'นำเข้าจาก Statement',
            ctx.member.id,
            now,
            now,
          ]
        );
        insertedCount++;
      }
    });

    return NextResponse.json({
      success: true,
      count: insertedCount,
      message: `บันทึกรายจ่ายสำเร็จ ${insertedCount} รายการ`,
    });
  } catch (error) {
    console.error('Batch expenses error:', error);
    return NextResponse.json({ error: 'ไม่สามารถบันทึกรายการได้' }, { status: 500 });
  }
}
