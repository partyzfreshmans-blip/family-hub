'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Home, Users, PlusCircle, KeyRound, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useAuth } from '@/components/AuthContext';

export default function OnboardingPage() {
  const { t } = useLanguage();
  const { user, refreshUser } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');
  const [familyName, setFamilyName] = useState('');
  const [nickname, setNickname] = useState(user?.display_name || '');
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/families', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: familyName,
          nickname,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'สร้างครอบครัวไม่สำเร็จ');

      await refreshUser();
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการสร้างครอบครัว');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/families/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteCode,
          nickname,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.auth.invalidInviteCode);

      await refreshUser();
      router.push('/');
    } catch (err: any) {
      setError(err.message || t.auth.invalidInviteCode);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-sky-50/50 via-background to-background dark:from-sky-950/20">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-primary to-sky-400 flex items-center justify-center text-white shadow-lg shadow-primary/25 mx-auto mb-3">
            <Home className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            {t.auth.welcomeOnboarding}
          </h1>
          <p className="text-xs text-muted-foreground">{t.auth.onboardingSubtitle}</p>
        </div>

        {/* Card */}
        <div className="bg-card text-card-foreground rounded-3xl p-6 sm:p-8 border border-border shadow-soft space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}

          {mode === 'select' && (
            <div className="space-y-3.5">
              <button
                onClick={() => setMode('create')}
                className="w-full p-4 rounded-2xl border-2 border-primary/20 bg-primary-50/50 dark:bg-primary-950/30 hover:border-primary hover:bg-primary-50 text-left transition-all group flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform flex-shrink-0">
                  <PlusCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">{t.auth.createFamilyBtn}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    สำหรับผู้เริ่มต้นสร้างบ้านใหม่ และเป็นผู้ดูแลระบบ (Admin)
                  </p>
                </div>
              </button>

              <button
                onClick={() => setMode('join')}
                className="w-full p-4 rounded-2xl border border-border bg-card hover:bg-muted/60 text-left transition-all group flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-muted text-foreground flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                  <KeyRound className="w-6 h-6 text-sky-500" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">{t.auth.joinFamilyBtn}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    เข้าร่วมบ้านที่มีอยู่แล้วด้วยรหัสเชิญ เช่น FAM-7KX92
                  </p>
                </div>
              </button>
            </div>
          )}

          {mode === 'create' && (
            <form onSubmit={handleCreateFamily} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">{t.auth.familyNameLabel}</label>
                <input
                  type="text"
                  required
                  placeholder={t.auth.familyNamePlaceholder}
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">{t.auth.nicknameLabel}</label>
                <input
                  type="text"
                  required
                  placeholder={t.auth.nicknamePlaceholder}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setMode('select')}
                  className="w-1/3 py-2.5 rounded-2xl border border-border text-xs font-bold hover:bg-muted transition-colors"
                >
                  {t.common.back}
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-2/3 py-2.5 rounded-2xl bg-primary hover:bg-primary-600 active:scale-95 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  {isLoading ? t.common.saving : 'สร้างครอบครัวทันที'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {mode === 'join' && (
            <form onSubmit={handleJoinFamily} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">{t.auth.inviteCodeLabel}</label>
                <input
                  type="text"
                  required
                  placeholder={t.auth.inviteCodePlaceholder}
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2.5 rounded-2xl border border-border bg-background text-sm font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-primary font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">{t.auth.nicknameLabel}</label>
                <input
                  type="text"
                  required
                  placeholder={t.auth.nicknamePlaceholder}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setMode('select')}
                  className="w-1/3 py-2.5 rounded-2xl border border-border text-xs font-bold hover:bg-muted transition-colors"
                >
                  {t.common.back}
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-2/3 py-2.5 rounded-2xl bg-primary hover:bg-primary-600 active:scale-95 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  {isLoading ? t.common.saving : 'เข้าร่วมบ้าน'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
