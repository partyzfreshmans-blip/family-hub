import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserContext } from '@/lib/session';
import { execute } from '@/lib/db';

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getCurrentUserContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (ctx.member.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only Family Admin can update family settings' }, { status: 403 });
    }

    const { name, monthlyBudget, rewardsEnabled, avatarIcon } = await req.json();

    const newName = name?.trim() || ctx.family.name;
    const newBudget = typeof monthlyBudget === 'number' ? Math.max(0, monthlyBudget) : ctx.family.monthly_budget;
    const newRewards = typeof rewardsEnabled === 'number' ? rewardsEnabled : ctx.family.rewards_enabled;
    const newIcon = avatarIcon || ctx.family.avatar_icon;
    const now = new Date().toISOString();

    await execute(
      'UPDATE families SET name = ?, monthly_budget = ?, rewards_enabled = ?, avatar_icon = ?, updated_at = ? WHERE id = ?',
      [newName, newBudget, newRewards, newIcon, now, ctx.family.id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json({ error: 'Failed to update family settings' }, { status: 500 });
  }
}
