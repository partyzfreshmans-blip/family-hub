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
  image_url?: string | null;
  category: 'Family' | 'School' | 'Work' | 'Appointment' | 'Birthday' | 'Travel' | 'Health' | 'Other';
  recurrence_rule: 'NONE' | 'DAILY' | 'WEEKDAYS' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'YEARLY';
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
  recurrence_rule: 'NONE' | 'DAILY' | 'WEEKDAYS' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  points: number;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
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
  price?: number | null;
  expense_id?: string | null;
  added_by: string;
  purchased: number; // 0 or 1
  purchased_by?: string | null;
  purchased_at?: string | null;
  created_at: string;
  updated_at: string;
  adder?: FamilyMember;
  buyer?: FamilyMember;
  adder_nick?: string;
  buyer_nick?: string;
  adder_color?: string;
  buyer_color?: string;
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
  location?: string | null;
  image_url?: string | null;
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
  recurrence_rule: 'NONE' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'BIMONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';
  status: 'UNPAID' | 'PAID' | 'OVERDUE';
  notes?: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  image_url?: string | null;
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
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  image_url?: string | null;
  created_at: string;
  payer?: FamilyMember;
  payer_nick?: string;
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

// ----------------------------------------------------
// Family Location Types
// ----------------------------------------------------

export type LocationSharingMode = 'OFF' | 'ONCE' | 'TIMED' | 'APP_ACTIVE';

export interface MemberLocationSettings {
  id: string;
  family_id: string;
  family_member_id: string;
  sharing_mode: LocationSharingMode;
  sharing_enabled: number; // 0 or 1
  sharing_expires_at?: string | null;
  history_enabled: number; // 0 or 1
  retention_days: number; // 0, 1, 7, 30
  updated_at: string;
}

export interface MemberCurrentLocation {
  id: string;
  family_id: string;
  family_member_id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  recorded_at: string;
  updated_at: string;
  source?: 'foreground' | 'one_time_share' | 'sos' | 'manual_request';
  member?: FamilyMember;
  matched_place?: FamilySavedPlace | null;
  distance_to_place_meters?: number | null;
  stale_status?: 'LIVE' | 'RECENT' | 'STALE' | 'OFFLINE' | 'DISABLED';
  is_sharing?: boolean;
  sharing_mode?: string;
}

export interface MemberLocationHistory {
  id: string;
  family_id: string;
  family_member_id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  recorded_at: string;
  source: string;
  created_at: string;
  place_name?: string | null;
}

export interface FamilySavedPlace {
  id: string;
  family_id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  category: 'HOME' | 'SCHOOL' | 'WORK' | 'GRANDPARENTS' | 'HOSPITAL' | 'OTHER';
  icon: string;
  active: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface LocationRequest {
  id: string;
  family_id: string;
  requester_member_id: string;
  target_member_id: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'EXPIRED';
  requested_at: string;
  responded_at?: string | null;
  expires_at: string;
  requester?: FamilyMember;
  target?: FamilyMember;
}

export interface LocationPlaceAlert {
  id: string;
  family_id: string;
  viewer_member_id: string;
  target_member_id: string;
  saved_place_id: string;
  notify_on_arrival: number;
  notify_on_leave: number;
  active: number;
  created_at: string;
  updated_at: string;
}

export interface SosEvent {
  id: string;
  family_id: string;
  family_member_id: string;
  status: 'ACTIVE' | 'RESOLVED' | 'CANCELLED';
  started_at: string;
  ended_at?: string | null;
  initial_latitude: number;
  initial_longitude: number;
  initial_accuracy: number;
  last_latitude: number;
  last_longitude: number;
  last_accuracy: number;
  last_updated_at: string;
  member?: FamilyMember;
}

export type DocumentCategory = 'HOUSE' | 'VEHICLE' | 'PERSONAL' | 'FINANCE' | 'OTHER';
export type DocumentPrivacyLevel = 'FAMILY' | 'ADULTS' | 'PRIVATE';

export interface FamilyDocument {
  id: string;
  family_id: string;
  title: string;
  category: DocumentCategory;
  sub_category?: string | null;
  document_number?: string | null;
  issuer?: string | null;
  owner_member_id?: string | null;
  privacy_level: DocumentPrivacyLevel;
  issue_date?: string | null; // YYYY-MM-DD
  expiry_date?: string | null; // YYYY-MM-DD
  file_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  notes?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  owner_nick?: string;
  owner_color?: string;
  owner_avatar?: string | null;
  creator_nick?: string;
  expiry_status?: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'NO_EXPIRY';
  days_until_expiry?: number | null;
}

// ----------------------------------------------------
// Financial & Debt Management Types
// ----------------------------------------------------

export type IncomeSourceType = 'SALARY' | 'SIDE_JOB' | 'RENTAL' | 'BUSINESS' | 'INVESTMENT' | 'OTHER';

export interface Income {
  id: string;
  family_id: string;
  amount: number;
  source_type: IncomeSourceType;
  source_name: string; // e.g. 'เงินเดือนประจำ', 'Grab Express', 'ค่าเช่าบ้านสุขใจ', 'ค่าเช่ารถ Civic'
  received_date: string; // YYYY-MM-DD
  received_by: string; // family_member_id
  asset_id?: string | null; // linked debt/asset id if rental
  note?: string | null;
  attachment_url?: string | null;
  created_at: string;
  updated_at: string;
  receiver_nick?: string;
  receiver_color?: string;
}

export type DebtType = 'MORTGAGE' | 'AUTO' | 'CREDIT_CARD' | 'PERSONAL_LOAN' | 'OTHER';
export type DebtStatus = 'ACTIVE' | 'PAID_OFF';

export interface Debt {
  id: string;
  family_id: string;
  name: string; // e.g. 'สินเชื่อบ้านสุขใจ (กสิกรไทย)', 'ค่างวดรถ Honda Civic (กรุงศรี)'
  debt_type: DebtType;
  total_amount: number; // Original loan amount
  remaining_balance: number; // Current remaining debt balance
  monthly_payment: number; // Monthly installment
  interest_rate?: number | null; // % per year
  total_installments?: number | null; // Total installments (e.g. 60, 360)
  paid_installments: number; // Number of installments paid
  due_day_of_month?: number | null; // Day of month (1-31)
  lender_name?: string | null; // Bank / Financial institute
  is_rental_asset: number; // 0 or 1
  expected_rental_income: number; // Expected monthly rental income
  tenant_name?: string | null; // Tenant name if rented
  notes?: string | null;
  status: DebtStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Computed fields
  net_rental_cashflow?: number; // expected_rental_income - monthly_payment
  progress_percent?: number;
}

export interface DebtPayment {
  id: string;
  debt_id: string;
  family_id: string;
  amount: number;
  principal_amount?: number | null;
  interest_amount?: number | null;
  paid_date: string;
  paid_by: string;
  installment_number?: number | null;
  slip_url?: string | null;
  note?: string | null;
  created_at: string;
  payer_nick?: string;
  debt_name?: string;
}

export interface CashflowSummary {
  month: string;
  totalIncome: number;
  totalExpense: number;
  totalDebtPayment: number;
  netCashflow: number; // totalIncome - (totalExpense + totalDebtPayment)
  incomeBreakdown: {
    salary: number;
    sideJob: number;
    rental: number;
    other: number;
  };
  debtSummary: {
    totalRemainingDebt: number;
    monthlyCommitment: number;
    dsrPercent: number; // (monthlyCommitment / totalIncome) * 100
  };
  rentalAssets: Array<{
    debt: Debt;
    monthlyRent: number;
    monthlyPayment: number;
    netCashflow: number;
  }>;
}
