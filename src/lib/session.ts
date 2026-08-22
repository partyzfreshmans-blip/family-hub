import { getSessionCookie } from './auth';
import { queryOne, query } from './db';
import { User, Family, FamilyMember, Role } from '@/types';

export interface CurrentUserContext {
  user: User;
  family: Family;
  member: FamilyMember;
  allMemberships: { family: Family; member: FamilyMember }[];
}

export async function getCurrentUserContext(): Promise<CurrentUserContext | null> {
  const session = await getSessionCookie();
  if (!session?.userId) return null;

  const user = await queryOne<User>(
    'SELECT id, email, display_name, avatar_url, created_at, updated_at FROM users WHERE id = ?',
    [session.userId]
  );
  if (!user) return null;

  // Fetch all families user belongs to
  const memberships = await query<{
    member_id: string;
    family_id: string;
    user_id: string;
    role: Role;
    nickname: string;
    member_color: string;
    points_balance: number;
    joined_at: string;
    f_name: string;
    f_owner_id: string;
    f_currency: string;
    f_monthly_budget: number;
    f_rewards_enabled: number;
    f_avatar_icon: string;
    f_created_at: string;
    f_updated_at: string;
  }>(
    `SELECT 
      m.id as member_id, m.family_id, m.user_id, m.role, m.nickname, m.member_color, m.points_balance, m.joined_at,
      f.name as f_name, f.owner_id as f_owner_id, f.currency as f_currency, f.monthly_budget as f_monthly_budget,
      f.rewards_enabled as f_rewards_enabled, f.avatar_icon as f_avatar_icon, f.created_at as f_created_at, f.updated_at as f_updated_at
     FROM family_members m
     JOIN families f ON m.family_id = f.id
     WHERE m.user_id = ?`,
    [user.id]
  );

  if (memberships.length === 0) {
    return null;
  }

  // Pick active family from session or first membership
  let activeMembership = memberships.find((m) => m.family_id === session.activeFamilyId);
  if (!activeMembership) {
    activeMembership = memberships[0];
  }

  const family: Family = {
    id: activeMembership.family_id,
    name: activeMembership.f_name,
    owner_id: activeMembership.f_owner_id,
    currency: activeMembership.f_currency,
    monthly_budget: activeMembership.f_monthly_budget,
    rewards_enabled: activeMembership.f_rewards_enabled,
    avatar_icon: activeMembership.f_avatar_icon,
    created_at: activeMembership.f_created_at,
    updated_at: activeMembership.f_updated_at,
  };

  const member: FamilyMember = {
    id: activeMembership.member_id,
    family_id: activeMembership.family_id,
    user_id: activeMembership.user_id,
    role: activeMembership.role,
    nickname: activeMembership.nickname,
    member_color: activeMembership.member_color,
    points_balance: activeMembership.points_balance,
    joined_at: activeMembership.joined_at,
    display_name: user.display_name,
    email: user.email,
  };

  const allMemberships = memberships.map((m) => ({
    family: {
      id: m.family_id,
      name: m.f_name,
      owner_id: m.f_owner_id,
      currency: m.f_currency,
      monthly_budget: m.f_monthly_budget,
      rewards_enabled: m.f_rewards_enabled,
      avatar_icon: m.f_avatar_icon,
      created_at: m.f_created_at,
      updated_at: m.f_updated_at,
    },
    member: {
      id: m.member_id,
      family_id: m.family_id,
      user_id: m.user_id,
      role: m.role,
      nickname: m.nickname,
      member_color: m.member_color,
      points_balance: m.points_balance,
      joined_at: m.joined_at,
      display_name: user.display_name,
      email: user.email,
    },
  }));

  return {
    user,
    family,
    member,
    allMemberships,
  };
}

export function enforceRole(
  userRole: Role,
  allowedRoles: Role[]
): boolean {
  return allowedRoles.includes(userRole);
}
