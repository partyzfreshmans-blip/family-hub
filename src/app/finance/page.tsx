'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Home,
  Car,
  CreditCard,
  Building,
  Plus,
  Calendar,
  CheckCircle,
  AlertTriangle,
  FileText,
  Upload,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  HelpCircle,
  PieChart,
  Coins,
  Sparkles,
  User,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  Bike,
  Maximize2,
  Filter,
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useAuth } from '@/components/AuthContext';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState, LoadingSkeleton } from '@/components/ui/EmptyState';
import { formatCurrency, formatThaiDate, getTodayDateString, compressImage } from '@/lib/utils';
import { Income, Debt, DebtPayment, CashflowSummary, IncomeSourceType, DebtType, FamilyMember } from '@/types';

export default function FinancePage() {
  const { t, lang } = useLanguage();
  const { member, family } = useAuth();

  // State
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [summary, setSummary] = useState<CashflowSummary | null>(null);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [recentDebtPayments, setRecentDebtPayments] = useState<DebtPayment[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Tab & Filters
  const [activeTab, setActiveTab] = useState<'overview' | 'rental' | 'debts' | 'incomes' | 'grab'>('overview');
  const [incomeSourceFilter, setIncomeSourceFilter] = useState<string>('ALL');

  // Modals
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isGrabModalOpen, setIsGrabModalOpen] = useState(false);
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [isPayDebtModalOpen, setIsPayDebtModalOpen] = useState(false);
  const [deletingIncomeId, setDeletingIncomeId] = useState<string | null>(null);
  const [deletingDebtId, setDeletingDebtId] = useState<string | null>(null);

  // Form States - Income
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeSourceType, setIncomeSourceType] = useState<IncomeSourceType>('SALARY');
  const [incomeSourceName, setIncomeSourceName] = useState('');
  const [incomeDate, setIncomeDate] = useState(getTodayDateString());
  const [incomeReceivedBy, setIncomeReceivedBy] = useState(member?.id || '');
  const [incomeAssetId, setIncomeAssetId] = useState<string>('');
  const [incomeNote, setIncomeNote] = useState('');

  // Form States - Grab Quick Log
  const [grabAmount, setGrabAmount] = useState('');
  const [grabDate, setGrabDate] = useState(getTodayDateString());
  const [grabTrips, setGrabTrips] = useState('');
  const [grabFuelCost, setGrabFuelCost] = useState('');
  const [grabNote, setGrabNote] = useState('');

  // Form States - Debt
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [debtName, setDebtName] = useState('');
  const [debtType, setDebtType] = useState<DebtType>('MORTGAGE');
  const [debtTotalAmount, setDebtTotalAmount] = useState('');
  const [debtRemainingBalance, setDebtRemainingBalance] = useState('');
  const [debtMonthlyPayment, setDebtMonthlyPayment] = useState('');
  const [debtInterestRate, setDebtInterestRate] = useState('');
  const [debtTotalInstallments, setDebtTotalInstallments] = useState('');
  const [debtPaidInstallments, setDebtPaidInstallments] = useState('');
  const [debtDueDay, setDebtDueDay] = useState('');
  const [debtLender, setDebtLender] = useState('');
  const [debtIsRental, setDebtIsRental] = useState(false);
  const [debtRentalIncome, setDebtRentalIncome] = useState('');
  const [debtTenantName, setDebtTenantName] = useState('');
  const [debtNotes, setDebtNotes] = useState('');

  // Form States - Pay Debt
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null);
  const [payDebtAmount, setPayDebtAmount] = useState('');
  const [payDebtPrincipal, setPayDebtPrincipal] = useState('');
  const [payDebtInterest, setPayDebtInterest] = useState('');
  const [payDebtDate, setPayDebtDate] = useState(getTodayDateString());
  const [payDebtBy, setPayDebtBy] = useState(member?.id || '');
  const [payDebtSlipUrl, setPayDebtSlipUrl] = useState<string | null>(null);
  const [isDraggingDebtSlip, setIsDraggingDebtSlip] = useState(false);
  const [payDebtRecordExpense, setPayDebtRecordExpense] = useState(true);
  const [payDebtNote, setPayDebtNote] = useState('');

  const [isSaving, setIsSaving] = useState(false);

  // Fetch Finance Data
  const fetchFinanceData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/finance?month=${selectedMonth}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
        setIncomes(data.incomes || []);
        setDebts(data.debts || []);
        setRecentDebtPayments(data.recentDebtPayments || []);
      }

      const memRes = await fetch('/api/families/members');
      if (memRes.ok) {
        const memData = await memRes.json();
        setFamilyMembers(memData.members || []);
      }
    } catch (err) {
      console.error('Error fetching finance data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchFinanceData();
  }, [fetchFinanceData]);

  // Month navigation
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    setSelectedMonth(`${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    setSelectedMonth(`${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleCurrentMonth = () => {
    const d = new Date();
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  // Open Add Income Modal
  const openAddIncomeModal = (preset?: { type: IncomeSourceType; name: string; assetId?: string }) => {
    setEditingIncome(null);
    setIncomeAmount('');
    setIncomeSourceType(preset?.type || 'SALARY');
    setIncomeSourceName(preset?.name || '');
    setIncomeDate(getTodayDateString());
    setIncomeReceivedBy(member?.id || familyMembers[0]?.id || '');
    setIncomeAssetId(preset?.assetId || '');
    setIncomeNote('');
    setIsIncomeModalOpen(true);
  };

  // Open Edit Income Modal
  const openEditIncomeModal = (inc: Income) => {
    setEditingIncome(inc);
    setIncomeAmount(String(inc.amount));
    setIncomeSourceType(inc.source_type);
    setIncomeSourceName(inc.source_name);
    setIncomeDate(inc.received_date);
    setIncomeReceivedBy(inc.received_by);
    setIncomeAssetId(inc.asset_id || '');
    setIncomeNote(inc.note || '');
    setIsIncomeModalOpen(true);
  };

  // Save Income
  const handleSaveIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incomeAmount || !incomeSourceName) return;

    setIsSaving(true);
    try {
      const payload = {
        id: editingIncome?.id,
        amount: parseFloat(incomeAmount),
        sourceType: incomeSourceType,
        sourceName: incomeSourceName,
        receivedDate: incomeDate,
        receivedBy: incomeReceivedBy || member?.id,
        assetId: incomeAssetId || null,
        note: incomeNote,
      };

      const res = await fetch('/api/incomes', {
        method: editingIncome ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsIncomeModalOpen(false);
        fetchFinanceData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save income');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Income
  const handleDeleteIncome = async () => {
    if (!deletingIncomeId) return;
    try {
      const res = await fetch(`/api/incomes?id=${deletingIncomeId}`, { method: 'DELETE' });
      if (res.ok) {
        setDeletingIncomeId(null);
        fetchFinanceData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save Grab Express Log
  const handleSaveGrab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grabAmount) return;

    setIsSaving(true);
    try {
      const tripsText = grabTrips ? ` (${grabTrips} เที่ยววิ่ง)` : '';
      const fuelText = grabFuelCost ? ` • ค่าน้ำมัน ฿${grabFuelCost}` : '';
      const fullNote = `${grabNote || 'รายได้วิ่ง Grab Express'}${tripsText}${fuelText}`;

      const res = await fetch('/api/incomes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(grabAmount),
          sourceType: 'SIDE_JOB',
          sourceName: 'Grab Express ส่งของ',
          receivedDate: grabDate,
          receivedBy: member?.id,
          note: fullNote,
        }),
      });

      if (res.ok) {
        setIsGrabModalOpen(false);
        setGrabAmount('');
        setGrabTrips('');
        setGrabFuelCost('');
        setGrabNote('');
        fetchFinanceData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save Grab log');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Open Add/Edit Debt Modal
  const openAddDebtModal = () => {
    setEditingDebt(null);
    setDebtName('');
    setDebtType('MORTGAGE');
    setDebtTotalAmount('');
    setDebtRemainingBalance('');
    setDebtMonthlyPayment('');
    setDebtInterestRate('');
    setDebtTotalInstallments('');
    setDebtPaidInstallments('');
    setDebtDueDay('');
    setDebtLender('');
    setDebtIsRental(false);
    setDebtRentalIncome('');
    setDebtTenantName('');
    setDebtNotes('');
    setIsDebtModalOpen(true);
  };

  const openEditDebtModal = (d: Debt) => {
    setEditingDebt(d);
    setDebtName(d.name);
    setDebtType(d.debt_type);
    setDebtTotalAmount(String(d.total_amount));
    setDebtRemainingBalance(String(d.remaining_balance));
    setDebtMonthlyPayment(String(d.monthly_payment));
    setDebtInterestRate(d.interest_rate ? String(d.interest_rate) : '');
    setDebtTotalInstallments(d.total_installments ? String(d.total_installments) : '');
    setDebtPaidInstallments(String(d.paid_installments));
    setDebtDueDay(d.due_day_of_month ? String(d.due_day_of_month) : '');
    setDebtLender(d.lender_name || '');
    setDebtIsRental(d.is_rental_asset === 1);
    setDebtRentalIncome(d.expected_rental_income ? String(d.expected_rental_income) : '');
    setDebtTenantName(d.tenant_name || '');
    setDebtNotes(d.notes || '');
    setIsDebtModalOpen(true);
  };

  // Save Debt
  const handleSaveDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtName || !debtMonthlyPayment) return;

    setIsSaving(true);
    try {
      const payload = {
        id: editingDebt?.id,
        name: debtName,
        debtType,
        totalAmount: parseFloat(debtTotalAmount) || 0,
        remainingBalance: debtRemainingBalance ? parseFloat(debtRemainingBalance) : (parseFloat(debtTotalAmount) || 0),
        monthlyPayment: parseFloat(debtMonthlyPayment),
        interestRate: debtInterestRate ? parseFloat(debtInterestRate) : null,
        totalInstallments: debtTotalInstallments ? parseInt(debtTotalInstallments) : null,
        paidInstallments: debtPaidInstallments ? parseInt(debtPaidInstallments) : 0,
        dueDayOfMonth: debtDueDay ? parseInt(debtDueDay) : null,
        lenderName: debtLender,
        isRentalAsset: debtIsRental ? 1 : 0,
        expectedRentalIncome: debtIsRental && debtRentalIncome ? parseFloat(debtRentalIncome) : 0,
        tenantName: debtTenantName,
        notes: debtNotes,
      };

      const res = await fetch('/api/debts', {
        method: editingDebt ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsDebtModalOpen(false);
        fetchFinanceData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save debt');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Debt
  const handleDeleteDebt = async () => {
    if (!deletingDebtId) return;
    try {
      const res = await fetch(`/api/debts?id=${deletingDebtId}`, { method: 'DELETE' });
      if (res.ok) {
        setDeletingDebtId(null);
        fetchFinanceData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Open Pay Debt Modal
  const openPayDebtModal = (debt: Debt) => {
    setPayingDebt(debt);
    setPayDebtAmount(String(debt.monthly_payment));
    setPayDebtPrincipal(String(debt.monthly_payment));
    setPayDebtInterest('0');
    setPayDebtDate(getTodayDateString());
    setPayDebtBy(member?.id || familyMembers[0]?.id || '');
    setPayDebtSlipUrl(null);
    setPayDebtRecordExpense(true);
    setPayDebtNote(`ชำระค่างวด: ${debt.name}`);
    setIsPayDebtModalOpen(true);
  };

  const processDebtSlip = async (file: File) => {
    if (!file) return;
    try {
      const compressed = await compressImage(file, 1280, 0.82);
      setPayDebtSlipUrl(compressed);
    } catch (err) {
      console.error('Image compression error:', err);
    }
  };

  // Handle Slip Upload
  const handleSlipChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processDebtSlip(file);
    }
    e.target.value = '';
  };

  // Submit Pay Debt
  const handleConfirmPayDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingDebt || !payDebtAmount) return;

    setIsSaving(true);
    try {
      const res = await fetch('/api/debts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          debtId: payingDebt.id,
          amount: parseFloat(payDebtAmount),
          principalAmount: parseFloat(payDebtPrincipal) || parseFloat(payDebtAmount),
          interestAmount: parseFloat(payDebtInterest) || 0,
          paidDate: payDebtDate,
          paidBy: payDebtBy,
          slipUrl: payDebtSlipUrl,
          note: payDebtNote,
          recordExpense: payDebtRecordExpense,
        }),
      });

      if (res.ok) {
        setIsPayDebtModalOpen(false);
        fetchFinanceData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to record debt payment');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (member?.role === 'CHILD') {
    return (
      <div className="p-8 text-center bg-card rounded-3xl border border-border shadow-soft">
        <h2 className="text-lg font-bold text-foreground mb-2">เข้าถึงเฉพาะผู้ปกครอง</h2>
        <p className="text-xs text-muted-foreground">ส่วนนี้สำหรับบันทึกและจัดการการเงินครอบครัวเท่านั้น</p>
      </div>
    );
  }

  const dsrValue = summary?.debtSummary.dsrPercent || 0;
  const dsrStatus = dsrValue <= 35 ? 'EXCELLENT' : dsrValue <= 50 ? 'MODERATE' : 'HIGH';

  const filteredIncomes = incomes.filter(
    (inc) => incomeSourceFilter === 'ALL' || inc.source_type === incomeSourceFilter
  );

  const grabIncomes = incomes.filter((i) => i.source_type === 'SIDE_JOB');
  const grabTotal = grabIncomes.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* 1. TOP HEADER & PERIOD SWITCHER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              {t.finance?.title || 'การเงิน & หนี้สิน'}
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
              Cash Flow & Assets
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {t.finance?.subtitle || 'บริหารจัดการรายรับหลายทาง ภาระหนี้สิน และกระแสเงินสดจากทรัพย์สินปล่อยเช่า'}
          </p>
        </div>

        {/* Action Buttons & Month Picker */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Month Selector */}
          <div className="flex items-center gap-1 bg-card border border-border/80 rounded-2xl p-1 shadow-2xs">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="เดือนก่อนหน้า"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleCurrentMonth}
              className="px-2.5 py-1 rounded-xl text-xs font-extrabold hover:bg-muted text-foreground transition-colors"
            >
              {selectedMonth}
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="เดือนถัดไป"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Log Grab Button */}
          <button
            type="button"
            onClick={() => setIsGrabModalOpen(true)}
            className="px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-soft flex items-center gap-1.5 transition-all"
          >
            <Bike className="w-4 h-4" />
            <span>+ วิ่ง Grab</span>
          </button>

          {/* Add Income Button */}
          <button
            type="button"
            onClick={() => openAddIncomeModal()}
            className="px-3.5 py-2 rounded-2xl bg-primary hover:bg-primary/90 active:scale-95 text-primary-foreground text-xs font-bold shadow-soft flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ บันทึกรายรับ</span>
          </button>

          {/* Add Debt Button */}
          {member?.role === 'ADMIN' && (
            <button
              type="button"
              onClick={openAddDebtModal}
              className="px-3.5 py-2 rounded-2xl bg-muted hover:bg-muted/80 text-foreground border border-border text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-all"
            >
              <CreditCard className="w-4 h-4" />
              <span>+ เพิ่มหนี้/สินเชื่อ</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. TOP BENTO KPI CARDS: CASHFLOW OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Incomes */}
        <div className="p-4 rounded-3xl bg-card border border-border/80 shadow-soft relative overflow-hidden group">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold text-muted-foreground">รายรับรวมทั้งหมด</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-foreground tracking-tight">
            {formatCurrency(summary?.totalIncome || 0)}
          </div>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/60 text-[11px] text-muted-foreground">
            <span>💼 เงินเดือน: {formatCurrency(summary?.incomeBreakdown.salary || 0)}</span>
            <span>•</span>
            <span>🛵 เสริม: {formatCurrency(summary?.incomeBreakdown.sideJob || 0)}</span>
          </div>
        </div>

        {/* Card 2: Total Outflows (Expenses + Debt) */}
        <div className="p-4 rounded-3xl bg-card border border-border/80 shadow-soft relative overflow-hidden group">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold text-muted-foreground">รายจ่าย & ผ่อนหนี้รวม</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-foreground tracking-tight">
            {formatCurrency((summary?.totalExpense || 0) + (summary?.totalDebtPayment || 0))}
          </div>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/60 text-[11px] text-muted-foreground">
            <span>🛒 ค่าใช้จ่าย: {formatCurrency(summary?.totalExpense || 0)}</span>
            <span>•</span>
            <span>🏦 ผ่อนหนี้: {formatCurrency(summary?.totalDebtPayment || 0)}</span>
          </div>
        </div>

        {/* Card 3: Net Cash Flow (Profit/Savings) */}
        <div className={`p-4 rounded-3xl border shadow-soft relative overflow-hidden ${
          (summary?.netCashflow || 0) >= 0
            ? 'bg-gradient-to-br from-card to-emerald-500/5 border-emerald-500/30'
            : 'bg-gradient-to-br from-card to-rose-500/5 border-rose-500/30'
        }`}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold text-muted-foreground">กระแสเงินสดสุทธิ (คงเหลือ)</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              (summary?.netCashflow || 0) >= 0 ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/15 text-rose-500'
            }`}>
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-extrabold tracking-tight ${
            (summary?.netCashflow || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
          }`}>
            {(summary?.netCashflow || 0) >= 0 ? '+' : ''}{formatCurrency(summary?.netCashflow || 0)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/60 text-[11px]">
            {(summary?.netCashflow || 0) >= 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> กระแสเงินสดเป็นบวก พร้อมออม/ลงทุน
              </span>
            ) : (
              <span className="text-rose-500 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> รายจ่ายสูงกว่ารายรับ ควรควบคุม
              </span>
            )}
          </div>
        </div>

        {/* Card 4: DSR (Debt Service Ratio) */}
        <div className="p-4 rounded-3xl bg-card border border-border/80 shadow-soft relative overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold text-muted-foreground">ภาระหนี้ต่อรายได้ (DSR)</span>
            <div className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              dsrStatus === 'EXCELLENT'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : dsrStatus === 'MODERATE'
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
            }`}>
              {dsrStatus === 'EXCELLENT' ? '🟢 สุขภาพดี' : dsrStatus === 'MODERATE' ? '🟡 ปานกลาง' : '🔴 ควรระวัง'}
            </div>
          </div>
          <div className="text-2xl font-extrabold text-foreground tracking-tight">
            {dsrValue}%
          </div>
          <div className="w-full bg-muted rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                dsrStatus === 'EXCELLENT' ? 'bg-emerald-500' : dsrStatus === 'MODERATE' ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, dsrValue)}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">
            หนี้คงเหลือรวม: {formatCurrency(summary?.debtSummary.totalRemainingDebt || 0)}
          </p>
        </div>
      </div>

      {/* 3. NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-border/80 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'overview'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>ภาพรวมกระแสเงินสด</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rental')}
          className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'rental'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>🏠🚗 ทรัพย์สินปล่อยเช่า ({summary?.rentalAssets.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('grab')}
          className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'grab'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <Bike className="w-4 h-4" />
          <span>🛵 Grab Express & งานเสริม</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('debts')}
          className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'debts'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>ทะเบียนหนี้สิน & สินเชื่อ ({debts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('incomes')}
          className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'incomes'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>ประวัติรายรับ ({incomes.length})</span>
        </button>
      </div>

      {/* 4. MAIN TAB CONTENTS */}
      {isLoading ? (
        <LoadingSkeleton count={3} height="h-32" />
      ) : (
        <>
          {/* TAB: OVERVIEW & RENTAL ASSETS */}
          {(activeTab === 'overview' || activeTab === 'rental') && (
            <div className="space-y-6">
              {/* RENTAL ASSETS CASHFLOW SIMULATOR */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
                      <Building className="w-5 h-5 text-primary" />
                      <span>ทรัพย์สินปล่อยเช่า & วิเคราะห์กำไรกระแสเงินสด (Rental Net Cash Flow)</span>
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      คำนวณกำไรสุทธิจาก (ค่าเช่ารับ - ค่างวดผ่อนธนาคาร) สำหรับบ้านและรถยนต์
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={openAddDebtModal}
                    className="px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>เพิ่มทรัพย์สินปล่อยเช่า</span>
                  </button>
                </div>

                {summary?.rentalAssets.length === 0 ? (
                  <div className="p-8 rounded-3xl bg-card border border-border/80 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                      <Home className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-foreground">ยังไม่มีทรัพย์สินปล่อยเช่าในระบบ</p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      กดปุ่ม "เพิ่มทรัพย์สินปล่อยเช่า" เพื่อบันทึกบ้านหรือรถยนต์ที่ผ่อนอยู่พร้อมระบุค่าเช่าที่ได้รับ
                    </p>
                    <button
                      type="button"
                      onClick={openAddDebtModal}
                      className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm"
                    >
                      + เพิ่มบ้าน/รถปล่อยเช่า
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {summary?.rentalAssets.map((asset) => {
                      const isHouse = asset.debt.debt_type === 'MORTGAGE';
                      const isCar = asset.debt.debt_type === 'AUTO';
                      const isPositive = asset.netCashflow >= 0;

                      return (
                        <div
                          key={asset.debt.id}
                          className="p-5 rounded-3xl bg-card border border-border/80 hover:border-primary/40 shadow-soft transition-all space-y-4 relative overflow-hidden group"
                        >
                          {/* Top Tag & Asset Title */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                                isHouse ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                              }`}>
                                {isHouse ? <Home className="w-6 h-6" /> : <Car className="w-6 h-6" />}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    isHouse ? 'bg-amber-500/10 text-amber-600' : 'bg-sky-500/10 text-sky-600'
                                  }`}>
                                    {isHouse ? '🏠 อสังหาฯ ปล่อยเช่า' : '🚗 รถยนต์ปล่อยเช่า'}
                                  </span>
                                  {asset.debt.lender_name && (
                                    <span className="text-[10px] text-muted-foreground truncate">
                                      • {asset.debt.lender_name}
                                    </span>
                                  )}
                                </div>
                                <h3 className="text-base font-extrabold text-foreground truncate mt-0.5">
                                  {asset.debt.name}
                                </h3>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditDebtModal(asset.debt)}
                                className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title="แก้ไข"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Cash Flow Simulation Card */}
                          <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-3">
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="text-muted-foreground block text-[11px]">ค่าเช่ารับ (Income)</span>
                                <span className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                                  +{formatCurrency(asset.monthlyRent)}/ด.
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground block text-[11px]">ค่างวดผ่อน (Outflow)</span>
                                <span className="font-extrabold text-sm text-rose-500">
                                  -{formatCurrency(asset.monthlyPayment)}/ด.
                                </span>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-border/80 flex items-center justify-between">
                              <span className="text-xs font-bold text-foreground">กำไรกระแสเงินสดสุทธิ (Net Cash Flow)</span>
                              <span className={`text-base font-extrabold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                                {isPositive ? '+' : ''}{formatCurrency(asset.netCashflow)}/ด.
                              </span>
                            </div>
                          </div>

                          {/* Debt Progress & Info */}
                          <div className="space-y-1.5 text-xs">
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                              <span>ผ่อนไปแล้ว {asset.debt.progress_percent}% ({asset.debt.paid_installments || 0}{asset.debt.total_installments ? `/${asset.debt.total_installments}` : ''} งวด)</span>
                              <span>หนี้คงเหลือ: {formatCurrency(asset.debt.remaining_balance)}</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-primary h-full rounded-full transition-all"
                                style={{ width: `${Math.min(100, asset.debt.progress_percent || 0)}%` }}
                              />
                            </div>
                          </div>

                          {/* Tenant Info & Pay Action */}
                          <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                            <div className="text-[11px] text-muted-foreground truncate">
                              {asset.debt.tenant_name ? `👤 ผู้เช่า: ${asset.debt.tenant_name}` : 'ยังไม่ได้ระบุชื่อผู้เช่า'}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openAddIncomeModal({
                                  type: 'RENTAL',
                                  name: `ค่าเช่า: ${asset.debt.name}`,
                                  assetId: asset.debt.id,
                                })}
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs transition-colors"
                              >
                                + รับค่าเช่า
                              </button>

                              <button
                                type="button"
                                onClick={() => openPayDebtModal(asset.debt)}
                                className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs transition-colors shadow-2xs"
                              >
                                จ่ายค่างวด
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: GRAB EXPRESS & SIDE HUSTLE */}
          {(activeTab === 'overview' || activeTab === 'grab') && (
            <div className="space-y-4 pt-4 border-t border-border/80">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
                    <Bike className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <span>งานเสริม & Grab Express (Side Hustle Tracker)</span>
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    บันทึกรายได้จากการวิ่งส่งของ วิ่งรอบช่วงเย็น หรือเสาร์-อาทิตย์
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsGrabModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-soft flex items-center gap-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ บันทึกรอบวิ่ง Grab</span>
                </button>
              </div>

              {/* Grab Stats Banner */}
              <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-600/15 via-emerald-500/5 to-card border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                    <Bike className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-muted-foreground">รายได้เสริมสะสมเดือนนี้</span>
                    <div className="text-2xl font-black text-foreground">
                      +{formatCurrency(grabTotal)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground">บันทึกแล้ว {grabIncomes.length} รายการ</span>
                </div>
              </div>

              {/* Grab Logs List */}
              {grabIncomes.length > 0 && (
                <div className="space-y-2">
                  {grabIncomes.map((inc) => (
                    <div
                      key={inc.id}
                      className="p-3.5 rounded-2xl bg-card border border-border/70 hover:border-emerald-500/40 flex items-center justify-between gap-3 text-xs shadow-2xs transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <Bike className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-extrabold text-foreground truncate">{inc.source_name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {formatThaiDate(inc.received_date, { shortMonth: true })}
                            {inc.note && ` • ${inc.note}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-black text-sm text-emerald-600 dark:text-emerald-400">
                          +{formatCurrency(inc.amount)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setDeletingIncomeId(inc.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title="ลบ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: ALL DEBTS & LIABILITIES */}
          {(activeTab === 'overview' || activeTab === 'debts') && (
            <div className="space-y-4 pt-4 border-t border-border/80">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <span>ทะเบียนหนี้สิน & สินเชื่อทั้งหมด (All Debts & Loans)</span>
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    ติดตามยอดหนี้คงเหลือ ค่างวดผ่อน และประวัติการจ่าย
                  </p>
                </div>

                {member?.role === 'ADMIN' && (
                  <button
                    type="button"
                    onClick={openAddDebtModal}
                    className="px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ เพิ่มรายการหนี้</span>
                  </button>
                )}
              </div>

              {debts.length === 0 ? (
                <div className="p-8 rounded-3xl bg-card border border-border/80 text-center space-y-2">
                  <p className="text-sm font-bold text-foreground">ยังไม่มีรายการหนี้สินในระบบ</p>
                  <p className="text-xs text-muted-foreground">ไม่มีภาระผ่อนสินเชื่อ สุขภาพทางการเงินยอดเยี่ยม!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {debts.map((d) => {
                    const isMortgage = d.debt_type === 'MORTGAGE';
                    const isAuto = d.debt_type === 'AUTO';
                    const isCard = d.debt_type === 'CREDIT_CARD';

                    return (
                      <div
                        key={d.id}
                        className="p-4 rounded-3xl bg-card border border-border/80 hover:border-primary/40 shadow-soft transition-all space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              {isMortgage ? <Home className="w-5 h-5" /> : isAuto ? <Car className="w-5 h-5" /> : isCard ? <CreditCard className="w-5 h-5" /> : <Building className="w-5 h-5" />}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-sm text-foreground truncate">{d.name}</h4>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {d.lender_name || 'สถาบันการเงิน'} {d.interest_rate ? `• ดอกเบี้ย ${d.interest_rate}%` : ''}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-bold text-muted-foreground block">ค่างวดต่อเดือน</span>
                            <span className="text-sm font-black text-rose-500">
                              {formatCurrency(d.monthly_payment)}
                            </span>
                          </div>
                        </div>

                        {/* Progress */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">
                              ยอดหนี้คงเหลือ: <strong className="text-foreground">{formatCurrency(d.remaining_balance)}</strong>
                            </span>
                            <span className="text-primary font-bold">
                              {d.paid_installments || 0}{d.total_installments ? ` / ${d.total_installments} งวด` : ' งวด'}
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-primary h-full rounded-full transition-all"
                              style={{ width: `${Math.min(100, d.progress_percent || 0)}%` }}
                            />
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                          <span className="text-[11px] text-muted-foreground">
                            {d.due_day_of_month ? `ครบกำหนดทุกวันที่ ${d.due_day_of_month}` : ''}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {member?.role === 'ADMIN' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openEditDebtModal(d)}
                                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                  title="แก้ไข"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingDebtId(d.id)}
                                  className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors"
                                  title="ลบ"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}

                            <button
                              type="button"
                              onClick={() => openPayDebtModal(d)}
                              className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs transition-colors shadow-2xs"
                            >
                              จ่ายค่างวด
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB: INCOMES LIST */}
          {(activeTab === 'overview' || activeTab === 'incomes') && (
            <div className="space-y-4 pt-4 border-t border-border/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <span>รายการบันทึกรายรับทั้งหมด (Income History)</span>
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    บันทึกและตรวจสอบรายรับทุกช่องทางในครอบครัว
                  </p>
                </div>

                {/* Filter */}
                <div className="flex items-center gap-2">
                  <select
                    value={incomeSourceFilter}
                    onChange={(e) => setIncomeSourceFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-border bg-background text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs"
                  >
                    <option value="ALL">ทุกแหล่งรายได้</option>
                    <option value="SALARY">💼 งานประจำ (เงินเดือน)</option>
                    <option value="SIDE_JOB">🛵 งานเสริม / Grab</option>
                    <option value="RENTAL">🏠 ค่าเช่าทรัพย์สิน</option>
                    <option value="BUSINESS">🏢 ธุรกิจ</option>
                    <option value="OTHER">อื่นๆ</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => openAddIncomeModal()}
                    className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-1 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>เพิ่มรายรับ</span>
                  </button>
                </div>
              </div>

              {filteredIncomes.length === 0 ? (
                <div className="p-8 rounded-3xl bg-card border border-border/80 text-center space-y-2">
                  <p className="text-sm font-bold text-foreground">ยังไม่มีรายการรายรับในหมวดนี้</p>
                  <p className="text-xs text-muted-foreground">แตะที่ปุ่ม "เพิ่มรายรับ" เพื่อเริ่มบันทึกเงินเดือนหรือรายได้เสริม</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredIncomes.map((inc) => (
                    <div
                      key={inc.id}
                      className="p-3.5 rounded-2xl bg-card border border-border/70 hover:border-emerald-500/40 flex items-center justify-between gap-3 text-xs shadow-2xs transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          inc.source_type === 'SALARY' ? 'bg-primary/10 text-primary' : inc.source_type === 'SIDE_JOB' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                        }`}>
                          {inc.source_type === 'SALARY' ? <Building className="w-5 h-5" /> : inc.source_type === 'SIDE_JOB' ? <Bike className="w-5 h-5" /> : <Home className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-extrabold text-foreground truncate">{inc.source_name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {formatThaiDate(inc.received_date, { shortMonth: true })}
                            {inc.receiver_nick && ` • รับโดย ${inc.receiver_nick}`}
                            {inc.note && ` • ${inc.note}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-black text-sm text-emerald-600 dark:text-emerald-400">
                          +{formatCurrency(inc.amount)}
                        </span>

                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => openEditIncomeModal(inc)}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="แก้ไข"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingIncomeId(inc.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors"
                            title="ลบ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* 5. MODAL: ADD / EDIT INCOME */}
      <Modal
        isOpen={isIncomeModalOpen}
        onClose={() => setIsIncomeModalOpen(false)}
        title={editingIncome ? 'แก้ไขรายการรายรับ' : 'บันทึกรายรับใหม่'}
        maxWidth="md"
      >
        <form onSubmit={handleSaveIncome} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                จำนวนเงิน (บาท) *
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="เช่น 45000"
                value={incomeAmount}
                onChange={(e) => setIncomeAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-background text-base font-extrabold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                ประเภทรายรับ *
              </label>
              <select
                value={incomeSourceType}
                onChange={(e) => setIncomeSourceType(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-background text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="SALARY">💼 งานประจำ (เงินเดือน)</option>
                <option value="SIDE_JOB">🛵 งานเสริม / Grab Express</option>
                <option value="RENTAL">🏠 ค่าเช่าทรัพย์สิน (บ้าน/รถ)</option>
                <option value="BUSINESS">🏢 ธุรกิจส่วนตัว</option>
                <option value="INVESTMENT">📈 เงินปันผล / กำไรลงทุน</option>
                <option value="OTHER">อื่นๆ</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">
              ชื่อแหล่งที่มารายรับ *
            </label>
            <input
              type="text"
              required
              placeholder="เช่น เงินเดือน บ.ไทยซอฟต์แวร์, Grab Express รอบเย็น, ค่าเช่าบ้านสุขใจ"
              value={incomeSourceName}
              onChange={(e) => setIncomeSourceName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-background text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                วันที่รับเงิน *
              </label>
              <input
                type="date"
                required
                value={incomeDate}
                onChange={(e) => setIncomeDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                ผู้รับเงิน
              </label>
              <select
                value={incomeReceivedBy}
                onChange={(e) => setIncomeReceivedBy(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-background text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {familyMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    👤 {m.nickname} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* If rental, optionally link to debt asset */}
          {incomeSourceType === 'RENTAL' && debts.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                ผูกกับทรัพย์สินปล่อยเช่า (เพื่อคำนวณ Net Cash Flow)
              </label>
              <select
                value={incomeAssetId}
                onChange={(e) => setIncomeAssetId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">ไม่ผูกกับทรัพย์สินเฉพาะ</option>
                {debts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.debt_type === 'MORTGAGE' ? '🏠' : '🚗'} {d.name} (ผ่อน {formatCurrency(d.monthly_payment)}/ด.)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">
              หมายเหตุเพิ่มเติม
            </label>
            <input
              type="text"
              placeholder="เช่น โอนเข้าบัญชีกสิกร, สัปดาห์ที่ 2"
              value={incomeNote}
              onChange={(e) => setIncomeNote(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/80">
            <button
              type="button"
              onClick={() => setIsIncomeModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold hover:bg-muted text-muted-foreground transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกรายรับ'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* 6. MODAL: GRAB EXPRESS QUICK LOG */}
      <Modal
        isOpen={isGrabModalOpen}
        onClose={() => setIsGrabModalOpen(false)}
        title="🛵 บันทึกรอบวิ่ง Grab Express"
        maxWidth="md"
      >
        <form onSubmit={handleSaveGrab} className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300">
            บันทึกรายได้เสริมจากการขับ Grab Express วิ่งส่งพัสดุ / อาหาร เพื่อคำนวณเข้ากระแสเงินสดครอบครัวอัตโนมัติ
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                รายได้รอบนี้ (บาท) *
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="เช่น 850"
                value={grabAmount}
                onChange={(e) => setGrabAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-background text-base font-black text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                วันที่วิ่ง *
              </label>
              <input
                type="date"
                required
                value={grabDate}
                onChange={(e) => setGrabDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                จำนวนเที่ยววิ่ง (รอบ)
              </label>
              <input
                type="number"
                placeholder="เช่น 8"
                value={grabTrips}
                onChange={(e) => setGrabTrips(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                ค่าน้ำมันโดยประมาณ (บาท)
              </label>
              <input
                type="number"
                placeholder="เช่น 120"
                value={grabFuelCost}
                onChange={(e) => setGrabFuelCost(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">
              หมายเหตุ / รายละเอียดรอบวิ่ง
            </label>
            <input
              type="text"
              placeholder="เช่น วิ่งช่วงเย็น 17:00-21:00 โซนสุขุมวิท"
              value={grabNote}
              onChange={(e) => setGrabNote(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/80">
            <button
              type="button"
              onClick={() => setIsGrabModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold hover:bg-muted text-muted-foreground transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกรายได้ Grab'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* 7. MODAL: ADD / EDIT DEBT */}
      <Modal
        isOpen={isDebtModalOpen}
        onClose={() => setIsDebtModalOpen(false)}
        title={editingDebt ? 'แก้ไขข้อมูลหนี้สิน/สินเชื่อ' : 'เพิ่มรายการหนี้สิน/สินเชื่อใหม่'}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveDebt} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                ชื่อสินเชื่อ / หนี้สิน *
              </label>
              <input
                type="text"
                required
                placeholder="เช่น สินเชื่อบ้านสุขใจ, ค่างวดรถ Honda Civic"
                value={debtName}
                onChange={(e) => setDebtName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-background text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                ประเภทหนี้สิน *
              </label>
              <select
                value={debtType}
                onChange={(e) => setDebtType(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-background text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="MORTGAGE">🏠 สินเชื่อบ้าน & ที่อยู่อาศัย</option>
                <option value="AUTO">🚗 สินเชื่อรถยนต์ / มอเตอร์ไซค์</option>
                <option value="CREDIT_CARD">💳 บัตรเครดิต</option>
                <option value="PERSONAL_LOAN">📄 สินเชื่อส่วนบุคคล / กู้ยืม</option>
                <option value="OTHER">อื่นๆ</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                ยอดกู้รวมเริ่มต้น (บาท)
              </label>
              <input
                type="number"
                step="any"
                placeholder="เช่น 3200000"
                value={debtTotalAmount}
                onChange={(e) => setDebtTotalAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                ยอดหนี้คงเหลือปัจจุบัน (บาท)
              </label>
              <input
                type="number"
                step="any"
                placeholder="เช่น 2850000"
                value={debtRemainingBalance}
                onChange={(e) => setDebtRemainingBalance(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-background text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                ค่างวดต่อเดือน (บาท) *
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="เช่น 18000"
                value={debtMonthlyPayment}
                onChange={(e) => setDebtMonthlyPayment(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-background text-sm font-extrabold text-rose-500 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                อัตราดอกเบี้ย (% ต่อปี)
              </label>
              <input
                type="number"
                step="any"
                placeholder="เช่น 3.75"
                value={debtInterestRate}
                onChange={(e) => setDebtInterestRate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                งวดที่ผ่อนแล้ว / ทั้งหมด
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  placeholder="ผ่อนแล้ว"
                  value={debtPaidInstallments}
                  onChange={(e) => setDebtPaidInstallments(e.target.value)}
                  className="w-1/2 px-3 py-2 rounded-2xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="text-muted-foreground">/</span>
                <input
                  type="number"
                  placeholder="ทั้งหมด"
                  value={debtTotalInstallments}
                  onChange={(e) => setDebtTotalInstallments(e.target.value)}
                  className="w-1/2 px-3 py-2 rounded-2xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                สถาบันการเงิน / ธนาคาร
              </label>
              <input
                type="text"
                placeholder="เช่น ธนาคารกสิกรไทย, กรุงศรี"
                value={debtLender}
                onChange={(e) => setDebtLender(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* RENTAL ASSET TOGGLE */}
          <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={debtIsRental}
                onChange={(e) => setDebtIsRental(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary"
              />
              <span className="text-xs font-extrabold text-foreground">
                🏠🚗 เป็นทรัพย์สินที่นำไป "ปล่อยเช่าสร้างกระแสเงินสด" (Rental Asset)
              </span>
            </label>

            {debtIsRental && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    ค่าเช่าที่ได้รับ / คาดหวังต่อเดือน (บาท)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="เช่น 22000"
                    value={debtRentalIncome}
                    onChange={(e) => setDebtRentalIncome(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-sm font-bold text-emerald-600 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    ชื่อผู้เช่า (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น คุณสมบูรณ์ (สัญญา 1 ปี)"
                    value={debtTenantName}
                    onChange={(e) => setDebtTenantName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">
              หมายเหตุเพิ่มเติม
            </label>
            <input
              type="text"
              placeholder="เช่น ตัดค่างวดอัตโนมัติทุกวันที่ 25 ของเดือน"
              value={debtNotes}
              onChange={(e) => setDebtNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/80">
            <button
              type="button"
              onClick={() => setIsDebtModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold hover:bg-muted text-muted-foreground transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 active:scale-95 text-primary-foreground text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลหนี้สิน'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* 8. MODAL: PAY INSTALLMENT / DEBT PAYMENT */}
      <Modal
        isOpen={isPayDebtModalOpen}
        onClose={() => setIsPayDebtModalOpen(false)}
        title={payingDebt ? `ชำระค่างวด: ${payingDebt.name}` : 'ชำระค่างวด'}
        maxWidth="md"
      >
        <form onSubmit={handleConfirmPayDebt} className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 text-xs text-foreground flex items-center justify-between">
            <div>
              <span className="text-muted-foreground block text-[11px]">ยอดหนี้คงเหลือปัจจุบัน</span>
              <span className="text-base font-extrabold text-foreground">
                {formatCurrency(payingDebt?.remaining_balance || 0)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground block text-[11px]">ค่างวดปกติต่อเดือน</span>
              <span className="text-sm font-extrabold text-rose-500">
                {formatCurrency(payingDebt?.monthly_payment || 0)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-foreground mb-1.5">
                ยอดที่จ่ายงวดนี้ (บาท) *
              </label>
              <input
                type="number"
                step="any"
                required
                value={payDebtAmount}
                onChange={(e) => {
                  setPayDebtAmount(e.target.value);
                  setPayDebtPrincipal(e.target.value);
                }}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-background text-base font-black text-rose-500 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                ตัดเงินต้น (บาท)
              </label>
              <input
                type="number"
                step="any"
                value={payDebtPrincipal}
                onChange={(e) => setPayDebtPrincipal(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                ตัดดอกเบี้ย (บาท)
              </label>
              <input
                type="number"
                step="any"
                value={payDebtInterest}
                onChange={(e) => setPayDebtInterest(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                วันที่จ่าย *
              </label>
              <input
                type="date"
                required
                value={payDebtDate}
                onChange={(e) => setPayDebtDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Slip Attachment */}
          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">
              แนบสลิปโอนเงิน / หลักฐาน
            </label>
            {payDebtSlipUrl ? (
              <div className="p-3 rounded-2xl bg-muted/40 border border-border flex items-center justify-between gap-3">
                <img
                  src={payDebtSlipUrl}
                  alt="Slip Preview"
                  className="w-12 h-12 rounded-xl object-cover border border-border"
                />
                <button
                  type="button"
                  onClick={() => setPayDebtSlipUrl(null)}
                  className="text-xs font-bold text-rose-500 hover:underline"
                >
                  ลบสลิป
                </button>
              </div>
            ) : (
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingDebtSlip(true);
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingDebtSlip(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingDebtSlip(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingDebtSlip(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    processDebtSlip(file);
                  }
                }}
                className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all select-none ${
                  isDraggingDebtSlip
                    ? 'border-primary bg-primary/15 scale-[1.02] shadow-lg shadow-primary/10 ring-4 ring-primary/20'
                    : 'border-border hover:border-primary/50 hover:bg-primary/5'
                }`}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleSlipChange}
                  className="hidden"
                />
                {isDraggingDebtSlip ? (
                  <>
                    <div className="w-10 h-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-md animate-bounce">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-black text-primary">
                        วางไฟล์ที่นี่เพื่อแนบสลิปทันที (Drop slip here)
                      </p>
                      <p className="text-[10px] text-primary/80 font-medium mt-0.5">
                        ปล่อยไฟล์เพื่อเริ่มประมวลผลสลิปการโอน
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-2xl bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                      <Upload className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                        ลากและวาง (Drag & Drop) หรือ แตะเพื่อแนบสลิปจ่ายเงิน
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        รูปภาพสลิปจากแอปธนาคาร (ไม่เกิน 5MB)
                      </p>
                    </div>
                  </>
                )}
              </label>
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={payDebtRecordExpense}
              onChange={(e) => setPayDebtRecordExpense(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary"
            />
            <span className="text-xs text-foreground">
              ลงบันทึกใน <strong>"ค่าใช้จ่ายประจำเดือน (Expenses)"</strong> ด้วยอัตโนมัติ
            </span>
          </label>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/80">
            <button
              type="button"
              onClick={() => setIsPayDebtModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold hover:bg-muted text-muted-foreground transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 active:scale-95 text-primary-foreground text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isSaving ? 'กำลังบันทึก...' : 'ยืนยันการชำระค่างวด'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={!!deletingIncomeId}
        onClose={() => setDeletingIncomeId(null)}
        onConfirm={handleDeleteIncome}
        title="ลบรายการรายรับ"
        message="คุณต้องการลบรายการรายรับนี้ใช่หรือไม่?"
      />

      <ConfirmDialog
        isOpen={!!deletingDebtId}
        onClose={() => setDeletingDebtId(null)}
        onConfirm={handleDeleteDebt}
        title="ลบข้อมูลหนี้สิน/สินเชื่อ"
        message="คุณต้องการลบรายการหนี้สินนี้ใช่หรือไม่? (เฉพาะแอดมินเท่านั้น)"
      />
    </div>
  );
}
