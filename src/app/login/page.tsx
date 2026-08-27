'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Home,
  Lock,
  User,
  ArrowRight,
  Sparkles,
  Eye,
  EyeOff,
  Users,
  Shield,
  KeyRound,
  Loader2,
  Delete,
  Crown,
  Baby,
  UserCheck,
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useAuth } from '@/components/AuthContext';
import { MemberAvatar } from '@/components/ui/MemberAvatar';
import { Badge } from '@/components/ui/Badge';

interface FamilyAuthMember {
  id: string;
  nickname: string;
  display_name: string;
  avatar_url: string | null;
  member_color: string;
  role: string;
  email: string;
}

export default function LoginPage() {
  const { t } = useLanguage();
  const { refreshUser } = useAuth();
  const router = useRouter();

  // Mode: 'profiles' (Quick select avatar + PIN) | 'form' (Type nickname/email + PIN)
  const [loginMode, setLoginMode] = useState<'profiles' | 'form'>('profiles');
  const [familyMembers, setFamilyMembers] = useState<FamilyAuthMember[]>([]);
  const [familyName, setFamilyName] = useState('');
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);

  // Selected Profile state for PIN keypad
  const [selectedMember, setSelectedMember] = useState<FamilyAuthMember | null>(null);
  const [pinCode, setPinCode] = useState('');

  // Form state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load family members for quick login
  useEffect(() => {
    async function loadMembers() {
      try {
        const res = await fetch('/api/auth/members');
        if (res.ok) {
          const data = await res.json();
          setFamilyMembers(data.members || []);
          setFamilyName(data.familyName || '');
          if (!data.members || data.members.length === 0) {
            setLoginMode('form');
          }
        } else {
          setLoginMode('form');
        }
      } catch (err) {
        console.error(err);
        setLoginMode('form');
      } finally {
        setIsLoadingMembers(false);
      }
    }
    loadMembers();
  }, []);

  const handleLogin = async (loginIdentifier: string, loginPin: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: loginIdentifier,
          pin: loginPin,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบรหัส PIN');
      }

      await refreshUser();
      if (data.hasFamily) {
        router.push('/');
      } else {
        router.push('/onboarding');
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
      setPinCode('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) return;
    handleLogin(identifier.trim(), password.trim());
  };

  const handleSelectMember = (m: FamilyAuthMember) => {
    setSelectedMember(m);
    setPinCode('');
    setError(null);
  };

  const handleKeypadPress = (num: string) => {
    if (pinCode.length < 6) {
      const newPin = pinCode + num;
      setPinCode(newPin);
      // Auto submit when 6 digits entered
      if (newPin.length === 6 && selectedMember) {
        handleLogin(selectedMember.nickname || selectedMember.email, newPin);
      }
    }
  };

  const handleKeypadDelete = () => {
    setPinCode((prev) => prev.slice(0, -1));
  };

  const handleKeypadClear = () => {
    setPinCode('');
  };

  // Quick Demo Account Auto-Fill
  const handleQuickLogin = (demoName: string) => {
    setIdentifier(demoName);
    setPassword('123456');
    setLoginMode('form');
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
            {familyName ? `เข้าสู่ระบบ ${familyName}` : 'เข้าสู่ระบบ Family Hub'}
          </h1>
          <p className="text-xs text-muted-foreground">
            บ้านหนึ่งหลัง พื้นที่เดียวสำหรับทุกคนในครอบครัว
          </p>
        </div>

        {/* Mode Switch Tabs */}
        {familyMembers.length > 0 && (
          <div className="flex items-center p-1 rounded-2xl bg-muted/60 border border-border/80 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setLoginMode('profiles');
                setError(null);
              }}
              className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                loginMode === 'profiles'
                  ? 'bg-card text-primary shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>เลือกสมาชิกในบ้าน</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setLoginMode('form');
                setSelectedMember(null);
                setError(null);
              }}
              className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                loginMode === 'form'
                  ? 'bg-card text-primary shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <User className="w-4 h-4" />
              <span>กรอกชื่อ / อีเมล</span>
            </button>
          </div>
        )}

        {/* Card */}
        <div className="bg-card text-card-foreground rounded-3xl p-6 sm:p-8 border border-border shadow-soft space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
              <span className="shrink-0">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* MODE 1: Profile Selection / PIN Keypad */}
          {loginMode === 'profiles' && (
            <>
              {!selectedMember ? (
                /* Member Avatar Grid */
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="font-bold text-sm text-foreground">เลือกโปรไฟล์ของคุณ</h3>
                    <p className="text-[11px] text-muted-foreground">แตะที่รูปเพื่อใส่รหัส PIN เข้าใช้งาน</p>
                  </div>

                  {isLoadingMembers ? (
                    <div className="py-8 text-center text-muted-foreground text-xs">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                      กำลังโหลดสมาชิกในบ้าน...
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {familyMembers.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleSelectMember(m)}
                          className="p-3.5 rounded-2xl border border-border/80 hover:border-primary/60 bg-muted/30 hover:bg-muted/60 transition-all flex flex-col items-center gap-2 text-center group active:scale-95 shadow-2xs"
                        >
                          <div className="relative">
                            <MemberAvatar
                              name={m.nickname}
                              color={m.member_color}
                              avatarUrl={m.avatar_url}
                              size="lg"
                              className="group-hover:scale-105 transition-transform"
                            />
                            {m.role === 'ADMIN' && (
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center">
                                <Crown className="w-2.5 h-2.5" />
                              </div>
                            )}
                          </div>

                          <div className="space-y-0.5 min-w-0 w-full">
                            <p className="font-extrabold text-sm text-foreground truncate">
                              {m.nickname}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {m.role === 'ADMIN' ? '👑 ผู้ดูแล' : m.role === 'CHILD' ? '🧒 เด็ก' : '🧑 ผู้ใหญ่'}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Selected Member PIN Keypad */
                <div className="space-y-4 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <MemberAvatar
                      name={selectedMember.nickname}
                      color={selectedMember.member_color}
                      avatarUrl={selectedMember.avatar_url}
                      size="xl"
                      className="ring-4 ring-primary/20 shadow-md"
                    />
                    <div>
                      <h3 className="font-extrabold text-lg text-foreground">{selectedMember.nickname}</h3>
                      <p className="text-xs text-muted-foreground">ใส่รหัส PIN 4-6 หลักเพื่อเข้าใช้งาน</p>
                    </div>
                  </div>

                  {/* PIN Dots Indicator */}
                  <div className="flex items-center justify-center gap-3 py-2">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`w-3.5 h-3.5 rounded-full transition-all ${
                          pinCode.length > i
                            ? 'bg-primary scale-110 shadow-sm'
                            : 'bg-muted border border-border/80'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Numeric Keypad for Tablets/Phones */}
                  <div className="grid grid-cols-3 gap-2 max-w-[280px] mx-auto pt-1">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleKeypadPress(num)}
                        disabled={isLoading}
                        className="h-12 rounded-2xl bg-muted/50 hover:bg-muted active:scale-90 font-extrabold text-lg text-foreground border border-border/60 transition-all flex items-center justify-center shadow-2xs"
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleKeypadClear}
                      disabled={isLoading}
                      className="h-12 rounded-2xl text-xs font-bold text-muted-foreground hover:bg-muted active:scale-90 transition-all flex items-center justify-center"
                    >
                      ล้าง
                    </button>
                    <button
                      type="button"
                      onClick={() => handleKeypadPress('0')}
                      disabled={isLoading}
                      className="h-12 rounded-2xl bg-muted/50 hover:bg-muted active:scale-90 font-extrabold text-lg text-foreground border border-border/60 transition-all flex items-center justify-center shadow-2xs"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={handleKeypadDelete}
                      disabled={isLoading}
                      className="h-12 rounded-2xl text-xs font-bold text-muted-foreground hover:bg-muted active:scale-90 transition-all flex items-center justify-center"
                      title="ลบตัวเลข"
                    >
                      <Delete className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Direct PIN button if 4-6 chars */}
                  {pinCode.length >= 4 && (
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleLogin(selectedMember.nickname || selectedMember.email, pinCode)}
                      className="w-full py-3 rounded-2xl bg-primary hover:bg-primary-600 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>กำลังเข้าสู่ระบบ...</span>
                        </>
                      ) : (
                        <>
                          <span>เข้าสู่ระบบ</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  )}

                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMember(null);
                        setPinCode('');
                        setError(null);
                      }}
                      className="text-xs font-bold text-muted-foreground hover:text-foreground hover:underline"
                    >
                      ← เปลี่ยนสมาชิก
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* MODE 2: Flexible Form Input */}
          {loginMode === 'form' && (
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  ชื่อเรียกในบ้าน / บัญชีผู้ใช้ / อีเมล
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="เช่น น้องต้น, พ่อ, แม่, ton หรือ dad@familyhub.local"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-border bg-background text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-foreground">
                    รหัส PIN / รหัสผ่าน
                  </label>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    (PIN 4-6 หลัก เช่น 123456)
                  </span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPin ? 'text' : 'password'}
                    required
                    placeholder="เช่น 123456"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-border bg-background text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !identifier.trim() || !password.trim()}
                className="w-full py-3 rounded-2xl bg-primary hover:bg-primary-600 active:scale-95 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t.common.loading}</span>
                  </>
                ) : (
                  <>
                    <span>เข้าสู่ระบบ</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Quick Demo Logins for Fast Testing */}
          <div className="border-t border-border pt-4 space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>ทดลองเข้าสู่ระบบบัญชีตัวอย่าง (PIN: 123456):</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('พ่อ')}
                className="p-2 rounded-xl bg-muted/60 hover:bg-muted text-[11px] font-bold text-center border border-border/50 transition-colors"
              >
                พ่อ (Admin)
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('แม่')}
                className="p-2 rounded-xl bg-muted/60 hover:bg-muted text-[11px] font-bold text-center border border-border/50 transition-colors"
              >
                แม่ (Adult)
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('น้องต้น')}
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
