'use client';

import React, { useState } from 'react';
import {
  Settings,
  User,
  Home,
  Sun,
  Moon,
  Laptop,
  Languages,
  LogOut,
  Sparkles,
  DollarSign,
  Shield,
  Save,
  Check,
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useTheme } from '@/components/ThemeContext';
import { useAuth } from '@/components/AuthContext';
import { formatCurrency } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { MemberAvatar } from '@/components/ui/MemberAvatar';
import { Badge } from '@/components/ui/Badge';

export default function SettingsPage() {
  const { t, lang, setLang } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { user, family, member, logout, refreshUser } = useAuth();

  // Family Settings Form (Admin Only)
  const [familyName, setFamilyName] = useState(family?.name || '');
  const [monthlyBudget, setMonthlyBudget] = useState(String(family?.monthly_budget || 0));
  const [rewardsEnabled, setRewardsEnabled] = useState(family?.rewards_enabled === 1);
  const [isSavingFamily, setIsSavingFamily] = useState(false);
  const [familySaveSuccess, setFamilySaveSuccess] = useState(false);

  // Logout Confirm Dialog
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  const isAdmin = member?.role === 'ADMIN';

  const handleSaveFamilySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingFamily(true);
    setFamilySaveSuccess(false);

    try {
      const res = await fetch('/api/families/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: familyName,
          monthlyBudget: parseFloat(monthlyBudget) || 0,
          rewardsEnabled: rewardsEnabled ? 1 : 0,
        }),
      });

      if (res.ok) {
        setFamilySaveSuccess(true);
        refreshUser();
        setTimeout(() => setFamilySaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingFamily(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{t.settings.title}</h1>
        <p className="text-xs text-muted-foreground">จัดการข้อมูลบัญชีผู้ใช้และการตั้งค่าของครอบครัว</p>
      </div>

      {/* 1. My Account Section */}
      <div className="bg-card text-card-foreground rounded-3xl p-6 border border-border shadow-soft space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border/60">
          <User className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-base">{t.settings.myAccount}</h2>
        </div>

        <div className="flex items-center gap-4">
          <MemberAvatar name={member?.nickname || user?.display_name || '?'} color={member?.member_color} size="lg" />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base">{member?.nickname}</h3>
              <Badge variant="primary" size="sm">
                <Shield className="w-3 h-3" />
                <span>{member?.role}</span>
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{user?.display_name} ({user?.email})</p>
          </div>
        </div>
      </div>

      {/* 2. Family Workspace Settings (Admin Only) */}
      {isAdmin && (
        <div className="bg-card text-card-foreground rounded-3xl p-6 border border-border shadow-soft space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Home className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-base">ตั้งค่าครอบครัว (Admin)</h2>
            </div>
            {familySaveSuccess && (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> บันทึกสำเร็จ
              </span>
            )}
          </div>

          <form onSubmit={handleSaveFamilySettings} className="space-y-4">
            <div>
              <label className="block text-xs font-bold mb-1.5">{t.settings.familyName}</label>
              <input
                type="text"
                required
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5">{t.settings.monthlyBudget}</label>
              <input
                type="number"
                min="0"
                step="500"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                สำหรับแสดงแถบความคืบหน้ารายจ่ายบนหน้าหลัก
              </p>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/40 border border-border/40">
              <div className="space-y-0.5">
                <p className="font-bold text-xs text-foreground">{t.settings.enableRewards}</p>
                <p className="text-[11px] text-muted-foreground">ระบบแต้มสะสมเมื่อทำงานบ้านสำเร็จ</p>
              </div>
              <input
                type="checkbox"
                checked={rewardsEnabled}
                onChange={(e) => setRewardsEnabled(e.target.checked)}
                className="w-5 h-5 rounded text-primary focus:ring-primary"
              />
            </div>

            <button
              type="submit"
              disabled={isSavingFamily}
              className="px-5 py-2.5 rounded-2xl bg-primary hover:bg-primary-600 active:scale-95 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingFamily ? t.common.saving : t.common.save}</span>
            </button>
          </form>
        </div>
      )}

      {/* 3. Appearance / Theme */}
      <div className="bg-card text-card-foreground rounded-3xl p-6 border border-border shadow-soft space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border/60">
          <Sun className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-base">{t.settings.theme}</h2>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setTheme('light')}
            className={`p-3.5 rounded-2xl border text-center flex flex-col items-center gap-2 transition-all ${
              theme === 'light'
                ? 'border-primary ring-2 ring-primary/20 bg-primary-50/50 dark:bg-primary-950/30 font-bold'
                : 'border-border bg-card hover:bg-muted'
            }`}
          >
            <Sun className="w-5 h-5 text-amber-500" />
            <span className="text-xs">{t.settings.themes.light}</span>
          </button>

          <button
            onClick={() => setTheme('dark')}
            className={`p-3.5 rounded-2xl border text-center flex flex-col items-center gap-2 transition-all ${
              theme === 'dark'
                ? 'border-primary ring-2 ring-primary/20 bg-primary-50/50 dark:bg-primary-950/30 font-bold'
                : 'border-border bg-card hover:bg-muted'
            }`}
          >
            <Moon className="w-5 h-5 text-sky-500" />
            <span className="text-xs">{t.settings.themes.dark}</span>
          </button>

          <button
            onClick={() => setTheme('system')}
            className={`p-3.5 rounded-2xl border text-center flex flex-col items-center gap-2 transition-all ${
              theme === 'system'
                ? 'border-primary ring-2 ring-primary/20 bg-primary-50/50 dark:bg-primary-950/30 font-bold'
                : 'border-border bg-card hover:bg-muted'
            }`}
          >
            <Laptop className="w-5 h-5 text-purple-500" />
            <span className="text-xs">{t.settings.themes.system}</span>
          </button>
        </div>
      </div>

      {/* 4. Language Selection */}
      <div className="bg-card text-card-foreground rounded-3xl p-6 border border-border shadow-soft space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border/60">
          <Languages className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-base">ภาษา / Language</h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setLang('th')}
            className={`p-3.5 rounded-2xl border text-center transition-all ${
              lang === 'th'
                ? 'border-primary ring-2 ring-primary/20 bg-primary-50/50 dark:bg-primary-950/30 font-bold text-primary'
                : 'border-border bg-card hover:bg-muted'
            }`}
          >
            <span className="text-sm font-bold">ภาษาไทย (Thai)</span>
          </button>

          <button
            onClick={() => setLang('en')}
            className={`p-3.5 rounded-2xl border text-center transition-all ${
              lang === 'en'
                ? 'border-primary ring-2 ring-primary/20 bg-primary-50/50 dark:bg-primary-950/30 font-bold text-primary'
                : 'border-border bg-card hover:bg-muted'
            }`}
          >
            <span className="text-sm font-bold">English</span>
          </button>
        </div>
      </div>

      {/* 5. Logout Button */}
      <div className="pt-2">
        <button
          onClick={() => setIsLogoutConfirmOpen(true)}
          className="w-full py-3.5 rounded-3xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-sm transition-all flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>{t.settings.logout}</span>
        </button>
      </div>

      {/* Logout Confirmation */}
      <ConfirmDialog
        isOpen={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        onConfirm={logout}
        title={t.settings.logout}
        message={t.settings.logoutConfirm}
        confirmText="ออกจากระบบ"
        isDestructive={true}
      />
    </div>
  );
}
