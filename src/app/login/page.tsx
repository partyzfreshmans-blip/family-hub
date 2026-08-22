'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Home, Lock, Mail, ArrowRight, Sparkles, UserCheck } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useAuth } from '@/components/AuthContext';

export default function LoginPage() {
  const { t } = useLanguage();
  const { refreshUser } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'เข้าสู่ระบบไม่สำเร็จ');
      }

      await refreshUser();
      if (data.hasFamily) {
        router.push('/');
      } else {
        router.push('/onboarding');
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Demo Account Auto-Fill
  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
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
            {t.auth.loginTitle}
          </h1>
          <p className="text-xs text-muted-foreground">{t.auth.loginSubtitle}</p>
        </div>

        {/* Card */}
        <div className="bg-card text-card-foreground rounded-3xl p-6 sm:p-8 border border-border shadow-soft space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">{t.auth.email}</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">{t.auth.password}</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-2xl bg-primary hover:bg-primary-600 active:scale-95 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? t.common.loading : t.auth.loginBtn}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Logins for Fast Testing */}
          <div className="border-t border-border pt-4 space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>ทดลองเข้าสู่ระบบครอบครัวตัวอย่าง:</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('dad@familyhub.local')}
                className="p-2 rounded-xl bg-muted/60 hover:bg-muted text-[11px] font-bold text-center border border-border/50 transition-colors"
              >
                พ่อ (Admin)
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('mom@familyhub.local')}
                className="p-2 rounded-xl bg-muted/60 hover:bg-muted text-[11px] font-bold text-center border border-border/50 transition-colors"
              >
                แม่ (Adult)
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('ton@familyhub.local')}
                className="p-2 rounded-xl bg-muted/60 hover:bg-muted text-[11px] font-bold text-center border border-border/50 transition-colors"
              >
                น้องต้น (Child)
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            {t.auth.noAccount}{' '}
            <Link href="/register" className="font-bold text-primary hover:underline">
              {t.auth.registerBtn}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
