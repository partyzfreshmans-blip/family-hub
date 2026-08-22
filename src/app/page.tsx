'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Calendar,
  CheckSquare,
  ShoppingCart,
  DollarSign,
  Receipt,
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  MapPin,
  Sparkles,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useAuth } from '@/components/AuthContext';
import { formatThaiDate, formatCurrency, getTodayDateString } from '@/lib/utils';
import { MemberAvatar } from '@/components/ui/MemberAvatar';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, LoadingSkeleton } from '@/components/ui/EmptyState';
import { QuickAddModal } from '@/components/layout/QuickAddModal';

export default function HomePage() {
  const { t } = useLanguage();
  const { member, family, refreshUser } = useAuth();
  const [data, setData] = useState<any>(null);
  const [locationMembers, setLocationMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [quickAddType, setQuickAddType] = useState<any>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const [dashRes, locRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/location'),
      ]);
      if (dashRes.ok) {
        const json = await dashRes.json();
        setData(json);
      }
      if (locRes.ok) {
        const locJson = await locRes.json();
        setLocationMembers(locJson.members || []);
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Fast task complete toggle
  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'COMPLETED' ? 'TODO' : 'COMPLETED';
    try {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, status: nextStatus }),
      });
      if (res.ok) {
        fetchDashboard();
        refreshUser();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const todayStr = getTodayDateString();
  const formattedToday = formatThaiDate(todayStr, { showDayOfWeek: true, showYear: true });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton count={1} height="h-20" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LoadingSkeleton count={2} height="h-44" />
          <LoadingSkeleton count={2} height="h-44" />
        </div>
      </div>
    );
  }

  const events = data?.events || [];
  const tasks = data?.tasks || [];
  const shopping = data?.shopping || { totalPending: 0, items: [] };
  const expenses = data?.expenses || { spent: 0, budget: 0, remaining: 0, showFinancials: false };
  const bills = data?.bills || [];

  const budgetPercent = expenses.budget > 0 ? Math.min(100, Math.round((expenses.spent / expenses.budget) * 100)) : 0;

  return (
    <div className="space-y-6">
      {/* Top Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-border/40">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            {t.home.greeting}, {member?.nickname || 'สมาชิก'}
            <span className="inline-block animate-bounce">👋</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-0.5">
            {formattedToday}
          </p>
        </div>

        {family?.rewards_enabled === 1 && (
          <div className="flex items-center gap-2 self-start sm:self-auto bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 px-3.5 py-1.5 rounded-2xl">
            <Sparkles className="w-4 h-4" />
            <div className="text-xs font-bold">
              {member?.points_balance || 0} {t.common.pts}
            </div>
          </div>
        )}
      </div>

      {/* Family Right Now (ครอบครัวตอนนี้) Widget */}
      {locationMembers.length > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-card border border-border/80 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-extrabold text-foreground">
              <span className="p-1.5 rounded-xl bg-sky-500/10 text-sky-500">
                <MapPin className="w-4 h-4" />
              </span>
              <span>{t.location.homeWidgetTitle}</span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {locationMembers.map((m: any) => {
                const isSharing = m.is_sharing || m.family_member_id === member?.id;
                const place = m.matched_place?.name || (isSharing && m.latitude ? 'นอกสถานที่' : 'ไม่ได้แชร์');
                const isLive = m.stale_status === 'LIVE' && isSharing;

                return (
                  <div
                    key={m.family_member_id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-muted/40 border border-border/50 text-xs"
                  >
                    <div className="relative">
                      <div
                        style={{ backgroundColor: m.member?.member_color || '#3b82f6' }}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white font-extrabold text-[10px]"
                      >
                        {(m.member?.nickname || 'สมาชิก').substring(0, 1)}
                      </div>
                      {isLive && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white" />
                      )}
                    </div>
                    <span className="font-bold text-foreground">{m.member?.nickname}:</span>
                    <span className="text-muted-foreground font-medium">{place}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <Link
            href="/location"
            className="self-end sm:self-center px-4 py-2 rounded-2xl bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs flex items-center gap-1.5 transition-all shrink-0"
          >
            ดูแผนที่ <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Grid Cards Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* 1. Today Events Card */}
        <div className="bg-card text-card-foreground rounded-3xl p-5 border border-border shadow-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <Calendar className="w-4 h-4" />
                </div>
                <h2 className="font-bold text-base">{t.home.upcomingEvents}</h2>
              </div>
              <Link
                href="/calendar"
                className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
              >
                {t.common.viewAll} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {events.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title={t.home.noEventsToday}
                actionText="เพิ่มกิจกรรม"
                onAction={() => setQuickAddType('event')}
              />
            ) : (
              <div className="space-y-2.5">
                {events.map((evt: any) => (
                  <div
                    key={evt.id}
                    className="p-3 rounded-2xl bg-muted/40 border border-border/40 flex items-start justify-between gap-3 hover:bg-muted/70 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <p className="font-bold text-sm text-foreground truncate">{evt.title}</p>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1 font-semibold text-primary">
                          <Clock className="w-3 h-3" />
                          {evt.all_day ? 'ทั้งวัน' : evt.start_time || '09:00'}
                        </span>
                        {evt.location && (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3" />
                            {evt.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant="primary" size="sm">
                      {evt.category}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 mt-3 border-t border-border/40 flex justify-end">
            <button
              onClick={() => setQuickAddType('event')}
              className="text-xs font-bold text-primary flex items-center gap-1 hover:opacity-80"
            >
              <Plus className="w-3.5 h-3.5" /> เพิ่มกิจกรรมใหม่
            </button>
          </div>
        </div>

        {/* 2. Tasks Card */}
        <div className="bg-card text-card-foreground rounded-3xl p-5 border border-border shadow-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <h2 className="font-bold text-base">{t.home.tasksToday}</h2>
              </div>
              <Link
                href="/tasks"
                className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
              >
                {t.common.viewAll} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {tasks.length === 0 ? (
              <EmptyState
                icon={CheckSquare}
                title={t.home.noTasksToday}
                actionText="เพิ่มงาน"
                onAction={() => setQuickAddType('task')}
              />
            ) : (
              <div className="space-y-2.5">
                {tasks.map((tsk: any) => {
                  const isDone = tsk.status === 'COMPLETED';
                  return (
                    <div
                      key={tsk.id}
                      className="p-3 rounded-2xl bg-muted/40 border border-border/40 flex items-center justify-between gap-3 hover:bg-muted/70 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          onClick={() => handleToggleTask(tsk.id, tsk.status)}
                          className="text-muted-foreground hover:text-emerald-500 transition-colors flex-shrink-0"
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <Circle className="w-5 h-5" />
                          )}
                        </button>
                        <div className="min-w-0">
                          <p
                            className={`text-sm font-bold truncate ${
                              isDone ? 'line-through text-muted-foreground' : 'text-foreground'
                            }`}
                          >
                            {tsk.title}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                            {tsk.assignee_nick && (
                              <span className="font-semibold text-foreground/80">
                                {tsk.assignee_nick}
                              </span>
                            )}
                            {tsk.due_time && <span>• {tsk.due_time}</span>}
                            {tsk.points > 0 && (
                              <span className="text-amber-600 dark:text-amber-400 font-bold">
                                +{tsk.points}แต้ม
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {tsk.priority === 'HIGH' && (
                        <Badge variant="danger" size="sm">
                          ด่วน
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-3 mt-3 border-t border-border/40 flex justify-end">
            <button
              onClick={() => setQuickAddType('task')}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:opacity-80"
            >
              <Plus className="w-3.5 h-3.5" /> เพิ่มงานใหม่
            </button>
          </div>
        </div>

        {/* 3. Shopping List Summary Card */}
        <div className="bg-card text-card-foreground rounded-3xl p-5 border border-border shadow-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-base">{t.home.shoppingList}</h2>
                  <p className="text-[11px] text-muted-foreground">
                    {shopping.totalPending} {t.home.pendingShopping}
                  </p>
                </div>
              </div>
              <Link
                href="/shopping"
                className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
              >
                {t.common.viewAll} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {shopping.items.length === 0 ? (
              <EmptyState
                icon={ShoppingCart}
                title={t.home.noShopping}
                actionText="เพิ่มของที่ต้องซื้อ"
                onAction={() => setQuickAddType('shopping')}
              />
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {shopping.items.map((shp: any) => (
                  <div
                    key={shp.id}
                    className="p-3 rounded-2xl bg-muted/40 border border-border/40 flex flex-col justify-between"
                  >
                    <span className="font-bold text-xs text-foreground truncate">{shp.name}</span>
                    <span className="text-[10px] text-muted-foreground mt-1">
                      {shp.quantity} {shp.unit || 'ชิ้น'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 mt-3 border-t border-border/40 flex justify-end">
            <button
              onClick={() => setQuickAddType('shopping')}
              className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 hover:opacity-80"
            >
              <Plus className="w-3.5 h-3.5" /> เพิ่มของที่ต้องซื้อ
            </button>
          </div>
        </div>

        {/* 4. Monthly Expense Card (Hidden for Child role) */}
        {expenses.showFinancials && (
          <div className="bg-card text-card-foreground rounded-3xl p-5 border border-border shadow-soft flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <h2 className="font-bold text-base">{t.home.monthlyExpense}</h2>
                </div>
                <Link
                  href="/expenses"
                  className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                >
                  {t.common.viewAll} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-3 py-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-extrabold tracking-tight text-foreground">
                    {formatCurrency(expenses.spent)}
                  </span>
                  {expenses.budget > 0 && (
                    <span className="text-xs text-muted-foreground font-medium">
                      จากงบ {formatCurrency(expenses.budget)}
                    </span>
                  )}
                </div>

                {expenses.budget > 0 && (
                  <div className="space-y-1.5">
                    <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        style={{ width: `${budgetPercent}%` }}
                        className={`h-full rounded-full transition-all duration-500 ${
                          expenses.isOverBudget ? 'bg-rose-500' : 'bg-gradient-to-r from-primary to-sky-400'
                        }`}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] font-semibold text-muted-foreground">
                      <span>{budgetPercent}% ที่ใช้ไป</span>
                      <span className={expenses.isOverBudget ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}>
                        {expenses.isOverBudget
                          ? `เกินงบ ${formatCurrency(expenses.spent - expenses.budget)}`
                          : `เหลือ ${formatCurrency(expenses.remaining)}`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-border/40 flex justify-end">
              <button
                onClick={() => setQuickAddType('expense')}
                className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1 hover:opacity-80"
              >
                <Plus className="w-3.5 h-3.5" /> บันทึกรายจ่าย
              </button>
            </div>
          </div>
        )}

        {/* 5. Upcoming Bills Card (Hidden for Child role) */}
        {expenses.showFinancials && (
          <div className="bg-card text-card-foreground rounded-3xl p-5 border border-border shadow-soft md:col-span-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <h2 className="font-bold text-base">{t.home.upcomingBills}</h2>
                </div>
                <Link
                  href="/bills"
                  className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                >
                  {t.common.viewAll} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {bills.length === 0 ? (
                <EmptyState
                  icon={Receipt}
                  title={t.home.noUpcomingBills}
                  actionText="เพิ่มบิล"
                  onAction={() => setQuickAddType('bill')}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {bills.map((b: any) => (
                    <div
                      key={b.id}
                      className="p-3.5 rounded-2xl bg-muted/40 border border-border/40 flex flex-col justify-between gap-2"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-xs truncate text-foreground">{b.name}</p>
                          <Badge variant={b.status === 'OVERDUE' ? 'danger' : 'warning'} size="sm">
                            {b.status === 'OVERDUE' ? 'เกินกำหนด' : 'รอชำระ'}
                          </Badge>
                        </div>
                        <p className="text-base font-extrabold text-foreground">{formatCurrency(b.amount)}</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        ครบกำหนด: {formatThaiDate(b.due_date, { shortMonth: true })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Add Modal */}
      {quickAddType && (
        <QuickAddModal
          isOpen={!!quickAddType}
          defaultType={quickAddType}
          onClose={() => setQuickAddType(null)}
          onSuccess={() => {
            setQuickAddType(null);
            fetchDashboard();
          }}
        />
      )}
    </div>
  );
}
