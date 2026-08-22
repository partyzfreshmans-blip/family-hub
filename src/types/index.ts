export type Role = 'ADMIN' | 'ADULT' | 'CHILD';

export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Family {
  id: string;
  name: string;
  owner_id: string;
  currency: string;
  monthly_budget: number;
  rewards_enabled: number; // 0 or 1
  avatar_icon?: string;
  created_at: string;
  updated_at: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  role: Role;
  nickname: string;
  member_color: string;
  points_balance: number;
  joined_at: string;
  display_name?: string;
  email?: string;
  avatar_url?: string | null;
}

export interface FamilyInvite {
  id: string;
  family_id: string;
  invite_code: string;
  role: Role;
  expires_at?: string | null;
  revoked: number;
  created_by: string;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  family_id: string;
  title: string;
  description?: string | null;
  event_date: string; // YYYY-MM-DD
  start_time?: string | null; // HH:mm
  end_time?: string | null; // HH:mm
  all_day: number; // 0 or 1
  location?: string | null;
  category: 'Family' | 'School' | 'Work' | 'Appointment' | 'Birthday' | 'Travel' | 'Health' | 'Other';
  recurrence_rule: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  reminder_minutes: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  member_ids?: string[];
  members?: FamilyMember[];
}

export interface Task {
  id: string;
  family_id: string;
  title: string;
  description?: string | null;
  assigned_to?: string | null;
  due_date?: string | null; // YYYY-MM-DD
  due_time?: string | null; // HH:mm
  priority: 'LOW' | 'NORMAL' | 'HIGH';
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
  recurrence_rule: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  points: number;
  created_by: string;
  completed_by?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  assignee?: FamilyMember;
}

export interface ShoppingItem {
  id: string;
  family_id: string;
  name: string;
  quantity: number;
  unit?: string | null;
  category: 'Grocery' | 'Household' | 'Pharmacy' | 'Personal' | 'Pets' | 'Other';
  note?: string | null;
  added_by: string;
  purchased: number; // 0 or 1
  purchased_by?: string | null;
  purchased_at?: string | null;
  created_at: string;
  updated_at: string;
  adder?: FamilyMember;
  buyer?: FamilyMember;
}

export interface Expense {
  id: string;
  family_id: string;
  amount: number;
  category: 'Food' | 'Utilities' | 'Transport' | 'Shopping' | 'Education' | 'Health' | 'House' | 'Pets' | 'Entertainment' | 'Other';
  description: string;
  paid_by: string;
  expense_date: string; // YYYY-MM-DD
  note?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  payer?: FamilyMember;
}

export interface Bill {
  id: string;
  family_id: string;
  name: string;
  amount: number;
  category: string;
  due_date: string; // YYYY-MM-DD
  recurrence_rule: 'NONE' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  status: 'UNPAID' | 'PAID' | 'OVERDUE';
  notes?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  payments?: BillPayment[];
}

export interface BillPayment {
  id: string;
  bill_id: string;
  family_id: string;
  amount: number;
  paid_date: string;
  paid_by: string;
  note?: string | null;
  created_at: string;
  payer?: FamilyMember;
}

export interface Reward {
  id: string;
  family_id: string;
  name: string;
  required_points: number;
  active: number;
  created_by: string;
  created_at: string;
}

export interface PointsTransaction {
  id: string;
  family_id: string;
  family_member_id: string;
  points: number;
  source_type: 'TASK' | 'REWARD_REDEEM' | 'BONUS' | 'ADJUSTMENT';
  source_id?: string | null;
  description: string;
  created_at: string;
  member?: FamilyMember;
}

export interface HouseholdInfo {
  id: string;
  family_id: string;
  category: 'EMERGENCY' | 'UTILITY' | 'DEVICE' | 'WARRANTY' | 'PET' | 'GENERAL';
  title: string;
  value: string;
  contact_phone?: string | null;
  notes?: string | null;
  created_by: string;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  family_id: string;
  type: string;
  title: string;
  message: string;
  read: number;
  created_at: string;
}

export interface SessionPayload {
  userId: string;
  email: string;
  displayName: string;
  activeFamilyId?: string;
  activeMemberId?: string;
  role?: Role;
}
