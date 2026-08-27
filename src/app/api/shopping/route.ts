import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserContext } from '@/lib/session';
import { query, queryOne, execute } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { ShoppingItem } from '@/types';

// GET: list shopping items
export async function GET() {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const items = await query<ShoppingItem & { adder_nick?: string; buyer_nick?: string }>(
      `SELECT s.*, 
        m1.nickname as adder_nick, m1.member_color as adder_color,
        m2.nickname as buyer_nick, m2.member_color as buyer_color
       FROM shopping_items s
       LEFT JOIN family_members m1 ON s.added_by = m1.id
       LEFT JOIN family_members m2 ON s.purchased_by = m2.id
       WHERE s.family_id = ?
       ORDER BY s.purchased ASC, s.created_at DESC`,
      [ctx.family.id]
    );

    // Common frequent items
    const frequentItems = [
      { name: 'นมสด', cat: 'Grocery', unit: 'กล่อง' },
      { name: 'ไข่ไก่', cat: 'Grocery', unit: 'แผง' },
      { name: 'ข้าวสาร', cat: 'Grocery', unit: 'ถุง' },
      { name: 'น้ำดื่ม', cat: 'Grocery', unit: 'แพ็ค' },
      { name: 'ขนมปัง', cat: 'Grocery', unit: 'แถว' },
      { name: 'กระดาษชำระ', cat: 'Household', unit: 'แพ็ค' },
    ];

    return NextResponse.json({ items, frequentItems });
  } catch (error) {
    console.error('Fetch shopping error:', error);
    return NextResponse.json({ error: 'Failed to fetch shopping items' }, { status: 500 });
  }
}

// POST: Add shopping item
export async function POST(req: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, quantity, unit, category, note, price } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'กรุณาระบุชื่อสินค้า' }, { status: 400 });
    }

    const itemId = generateId('shp');
    const now = new Date().toISOString();
    const numPrice = price ? parseFloat(price) : null;

    await execute(
      `INSERT INTO shopping_items (
        id, family_id, name, quantity, unit, category, note, price,
        added_by, purchased, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        itemId,
        ctx.family.id,
        name.trim(),
        quantity ? parseFloat(quantity) : 1,
        unit?.trim() || null,
        category || 'Grocery',
        note?.trim() || null,
        numPrice,
        ctx.member.id,
        now,
        now,
      ]
    );

    return NextResponse.json({ success: true, itemId });
  } catch (error) {
    console.error('Add shopping error:', error);
    return NextResponse.json({ error: 'Failed to add shopping item' }, { status: 500 });
  }
}

// PATCH: Toggle purchased or edit item (with optional automated expense logging)
export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      id,
      purchased,
      name,
      quantity,
      unit,
      category,
      note,
      price,
      recordExpense,
      expensePaidBy,
      expenseCategory,
      expenseNote,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 });
    }

    const existing = await queryOne<ShoppingItem>(
      'SELECT * FROM shopping_items WHERE id = ? AND family_id = ?',
      [id, ctx.family.id]
    );
    if (!existing) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const newPurchased = purchased !== undefined ? (purchased ? 1 : 0) : existing.purchased;
    const purchasedBy = newPurchased ? (existing.purchased ? existing.purchased_by : ctx.member.id) : null;
    const purchasedAt = newPurchased ? (existing.purchased ? existing.purchased_at : now) : null;

    let finalPrice = price !== undefined ? (price ? parseFloat(price) : null) : existing.price;
    let finalExpenseId = existing.expense_id;

    // Automated Expense Handling
    if (newPurchased === 1 && recordExpense && finalPrice && finalPrice > 0) {
      const targetName = name !== undefined ? name.trim() : existing.name;
      const targetQty = quantity !== undefined ? quantity : existing.quantity;
      const targetUnit = unit !== undefined ? unit : (existing.unit || 'ชิ้น');
      const itemDesc = `ซื้อ ${targetName} (${targetQty} ${targetUnit})`;
      const payerId = expensePaidBy || ctx.member.id;
      const expCat = expenseCategory || 'Shopping';
      const expNote = expenseNote || 'บันทึกอัตโนมัติจากรายการซื้อของ (Shopping)';

      if (!finalExpenseId) {
        // Create new expense
        finalExpenseId = generateId('exp');
        await execute(
          `INSERT INTO expenses (
            id, family_id, amount, category, description, paid_by,
            expense_date, note, created_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            finalExpenseId,
            ctx.family.id,
            finalPrice,
            expCat,
            itemDesc,
            payerId,
            today,
            expNote,
            ctx.member.id,
            now,
            now,
          ]
        );
      } else {
        // Update existing expense
        await execute(
          `UPDATE expenses SET amount = ?, category = ?, description = ?, paid_by = ?, updated_at = ? WHERE id = ? AND family_id = ?`,
          [finalPrice, expCat, itemDesc, payerId, now, finalExpenseId, ctx.family.id]
        );
      }
    } else if (newPurchased === 0 && existing.expense_id) {
      // If unmarked, remove linked auto-expense
      try {
        await execute('DELETE FROM expenses WHERE id = ? AND family_id = ?', [existing.expense_id, ctx.family.id]);
      } catch (e) {
        // ignore if not found
      }
      finalExpenseId = null;
      finalPrice = null;
    }

    await execute(
      `UPDATE shopping_items SET
        name = ?, quantity = ?, unit = ?, category = ?, note = ?, price = ?, expense_id = ?,
        purchased = ?, purchased_by = ?, purchased_at = ?, updated_at = ?
       WHERE id = ? AND family_id = ?`,
      [
        name !== undefined ? name.trim() : existing.name,
        quantity !== undefined ? parseFloat(quantity) : existing.quantity,
        unit !== undefined ? (unit?.trim() || null) : existing.unit,
        category || existing.category,
        note !== undefined ? (note?.trim() || null) : existing.note,
        finalPrice,
        finalExpenseId,
        newPurchased,
        purchasedBy,
        purchasedAt,
        now,
        id,
        ctx.family.id,
      ]
    );

    return NextResponse.json({ success: true, expenseId: finalExpenseId });
  } catch (error) {
    console.error('Update shopping error:', error);
    return NextResponse.json({ error: 'Failed to update shopping item' }, { status: 500 });
  }
}

// DELETE: Remove item
export async function DELETE(req: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get('id');

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 });
    }

    const existing = await queryOne<ShoppingItem>('SELECT expense_id FROM shopping_items WHERE id = ? AND family_id = ?', [itemId, ctx.family.id]);
    if (existing?.expense_id) {
      try {
        await execute('DELETE FROM expenses WHERE id = ? AND family_id = ?', [existing.expense_id, ctx.family.id]);
      } catch (e) {}
    }

    await execute('DELETE FROM shopping_items WHERE id = ? AND family_id = ?', [itemId, ctx.family.id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete shopping item' }, { status: 500 });
  }
}
