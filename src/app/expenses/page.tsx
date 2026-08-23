'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  DollarSign,
  Plus,
  Trash2,
  PieChart,
  Calendar,
  CreditCard,
  User,
  ArrowUpRight,
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useAuth } from '@/components/AuthContext';
import { formatCurrency, formatThaiDate, getTodayDateString } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, LoadingSkeleton } from '@/components/ui/EmptyState';
import { MemberAvatar } from '@/components/ui/MemberAvatar';
import { Expense, FamilyMember } from '@/types';
import { StatementReaderModal } from '@/components/expenses/StatementReaderModal';
import { Sparkles, FileSpreadsheet } from 'lucide-react';

export default function ExpensesPage() {
  const { t } = useLanguage();
  const { member, family } = useAuth();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const today = getTodayDateString();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<any>('Food');
  const [paidBy, setPaidBy] = useState(member?.id || '');
  const [expenseDate, setExpenseDate] = useState(today);
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchExpenses = useCallback(async () => {
    try {
      const res = await fetch('/api/expenses');
      if (res.ok) {
        const json = await res.json();
        setExpenses(json.expenses || []);
        setSummary(json.summary || null);
      }

      const memRes = await fetch('/api/families/members');
      if (memRes.ok) {
        const memJson = await memRes.json();
        setFamilyMembers(memJson.members || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const openAddModal = () => {
    setAmount('');
    setDescription('');
    setCategory('Food');
    setPaidBy(member?.id || '');
    setExpenseDate(today);
    setNote('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError(null);

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          description,
          category,
          paidBy,
          expenseDate,
          note,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t.common.errorMessage);
      }

      setIsModalOpen(false);
      fetchExpenses();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const res = await fetch(`/api/expenses?id=${deletingId}`, { method: 'DELETE' });
      if (res.ok) {
        setDeletingId(null);
        fetchExpenses();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const isChild = member?.role === 'CHILD';

  if (isChild) {
    return (
      <div className="p-8 text-center bg-card rounded-3xl border border-border shadow-soft">
        <h2 className="text-lg font-bold text-foreground mb-2">เข้าถึงเฉพาะผู้ปกครอง</h2>
        <p className="text-xs text-muted-foreground">ส่วนนี้สำหรับบันทึกค่าใช้จ่ายของครอบครัวเท่านั้น</p>
      </div>
    );
  }

  const totalSpent = summary?.totalSpent || 0;
  const budget = family?.monthly_budget || 0;
  const remaining = Math.max(0, budget - totalSpent);
  const isOverBudget = totalSpent > budget && budget > 0;
  const budgetPercent = budget > 0 ? Math.min(100, Math.round((totalSpent / budget) * 100)) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{t.expenses.title}</h1>
          <p className="text-xs text-muted-foreground">บันทึกและติดตามการใช้จ่ายภายในครอบครัว</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsStatementModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-border bg-card hover:bg-muted text-foreground text-xs font-bold shadow-soft transition-all"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>อ่าน Statement / สลิป</span>
          </button>

          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-primary hover:bg-primary-600 active:scale-95 text-white text-xs font-bold shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{t.expenses.addExpense}</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeleton count={3} height="h-28" />
      ) : (
        <>
          {/* Monthly Budget Summary Card */}
          <div className="bg-card text-card-foreground rounded-3xl p-6 border border-border shadow-soft space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {t.expenses.monthlyTotal}
                </p>
                <h2 className="text-3xl font-extrabold tracking-tight text-foreground mt-1">
                  {formatCurrency(totalSpent)}
                </h2>
              </div>

              {budget > 0 && (
                <div className="text-left sm:text-right space-y-0.5">
                  <p className="text-xs text-muted-foreground font-semibold">
                    {t.home.budget}: {formatCurrency(budget)}
                  </p>
                  <p
                    className={`text-sm font-extrabold ${
                      isOverBudget ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {isOverBudget
                      ? `เกินงบ ${formatCurrency(totalSpent - budget)}`
                      : `คงเหลือ ${formatCurrency(remaining)}`}
                  </p>
                </div>
              )}
            </div>

            {budget > 0 && (
              <div className="space-y-1.5">
                <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    style={{ width: `${budgetPercent}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${
                      isOverBudget ? 'bg-rose-500' : 'bg-gradient-to-r from-primary to-sky-400'
                    }`}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-bold text-muted-foreground">
                  <span>ใช้น้อยกว่างบ ({budgetPercent}%)</span>
                  <span>100%</span>
                </div>
              </div>
            )}

            {/* Category summary pills */}
            {summary?.categoryTotals && Object.keys(summary.categoryTotals).length > 0 && (
              <div className="border-t border-border/60 pt-3 flex flex-wrap gap-2">
                {Object.entries(summary.categoryTotals).map(([cat, sum]) => (
                  <div
                    key={cat}
                    className="px-3 py-1 rounded-xl bg-muted/60 text-xs font-semibold text-foreground flex items-center gap-1.5"
                  >
                    <span className="text-muted-foreground">{t.expenses.categories[cat as keyof typeof t.expenses.categories] || cat}:</span>
                    <span className="font-bold">{formatCurrency(sum as number)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Expenses List */}
          <div className="space-y-3">
            <h3 className="font-bold text-base text-foreground px-1">{t.expenses.recentExpenses}</h3>

            {expenses.length === 0 ? (
              <EmptyState
                icon={DollarSign}
                title={t.expenses.noExpensesThisMonth}
                description="แตะที่ปุ่มบันทึกรายจ่ายเพื่อเริ่มบันทึกเงินที่จ่ายไป"
                actionText={t.expenses.addExpense}
                onAction={openAddModal}
              />
            ) : (
              <div className="space-y-2.5">
                {expenses.map((exp: any) => {
                  const payer = familyMembers.find((m) => m.id === exp.paid_by);

                  return (
                    <div
                      key={exp.id}
                      className="p-4 rounded-3xl bg-card border border-border shadow-soft flex items-center justify-between gap-3 hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold flex-shrink-0">
                          <DollarSign className="w-5 h-5" />
                        </div>

                        <div className="space-y-0.5 min-w-0">
                          <p className="font-bold text-sm text-foreground truncate">{exp.description}</p>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                            <Badge variant="purple" size="sm">
                              {t.expenses.categories[exp.category as keyof typeof t.expenses.categories] || exp.category}
                            </Badge>
                            {payer && (
                              <div className="flex items-center gap-1 font-semibold text-foreground/80">
                                <MemberAvatar name={payer.nickname} color={payer.member_color} size="sm" className="w-4 h-4 text-[9px]" />
                                <span>{payer.nickname}</span>
                              </div>
                            )}
                            <span>• {formatThaiDate(exp.expense_date, { shortMonth: true })}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="font-extrabold text-base text-foreground">
                          -{formatCurrency(exp.amount)}
                        </span>

                        <button
                          onClick={() => setDeletingId(exp.id)}
                          className="p-2 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Add Expense Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t.expenses.addExpense}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold mb-1">{t.expenses.amount} *</label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-xl font-extrabold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">{t.expenses.description} *</label>
            <input
              type="text"
              required
              placeholder="เช่น ซื้อของ Lotus, เติมน้ำมันรถ, ค่าอาหารกลางวัน"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1">{t.expenses.category}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {(Object.entries(t.expenses.categories) as [string, string][]).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">{t.expenses.paidBy}</label>
              <select
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {familyMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nickname}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">{t.expenses.expenseDate}</label>
            <input
              type="date"
              required
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">{t.expenses.note}</label>
            <textarea
              rows={2}
              placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-border text-xs font-bold hover:bg-muted"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-600 active:scale-95 text-white text-xs font-bold shadow-md transition-all"
            >
              {isSaving ? t.common.saving : t.common.save}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
