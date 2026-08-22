'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Calendar,
  CheckSquare,
  ShoppingCart,
  DollarSign,
  Receipt,
  Users,
  Award,
  Info,
  Settings,
  Plus,
  Moon,
  Sun,
  Laptop,
  LogOut,
  Sparkles,
  ChevronDown,
  MapPin,
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useTheme } from '@/components/ThemeContext';
import { useAuth } from '@/components/AuthContext';
import { MemberAvatar } from '@/components/ui/MemberAvatar';
import { QuickAddModal } from '@/components/layout/QuickAddModal';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { t, lang, setLang } = useLanguage();
  const { theme, setTheme, isDark } = useTheme();
  const { user, family, member, allMemberships, switchFamily, logout, isLoading } = useAuth();
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isFamilyMenuOpen, setIsFamilyMenuOpen] = useState(false);

  // If on auth pages, render children directly without shell
  const isAuthPage = ['/login', '/register', '/onboarding'].includes(pathname);
  if (isAuthPage) {
    return <>{children}</>;
  }

  const navItems = [
    { label: t.nav.home, href: '/', icon: Home },
    { label: t.nav.calendar, href: '/calendar', icon: Calendar },
    { label: t.nav.tasks, href: '/tasks', icon: CheckSquare },
    { label: t.nav.shopping, href: '/shopping', icon: ShoppingCart },
    { label: t.nav.location, href: '/location', icon: MapPin },
    { label: t.nav.expenses, href: '/expenses', icon: DollarSign, hideForChild: true },
    { label: t.nav.bills, href: '/bills', icon: Receipt, hideForChild: true },
    { label: t.nav.family, href: '/family', icon: Users },
    { label: t.nav.rewards, href: '/rewards', icon: Award },
    { label: t.nav.info, href: '/info', icon: Info },
    { label: t.nav.settings, href: '/settings', icon: Settings },
  ];

  const isChild = member?.role === 'CHILD';
  const visibleNavItems = navItems.filter((item) => !(isChild && item.hideForChild));

  // Bottom Nav items (6 items or 5 primary items with location)
  const bottomNavItems = [
    { label: t.nav.home, href: '/', icon: Home },
    { label: t.nav.calendar, href: '/calendar', icon: Calendar },
    { label: t.nav.tasks, href: '/tasks', icon: CheckSquare },
    { label: t.nav.shopping, href: '/shopping', icon: ShoppingCart },
    { label: t.nav.location, href: '/location', icon: MapPin },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border/80 bg-card p-4 h-screen sticky top-0 justify-between">
        <div className="space-y-6">
          {/* Brand & Family Switcher */}
          <div>
            <div className="flex items-center gap-3 px-2 py-1 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-sky-400 flex items-center justify-center text-white shadow-md">
                <Home className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-extrabold text-base tracking-tight leading-tight">Family Hub</h1>
                <p className="text-[11px] text-muted-foreground line-clamp-1">{family?.name || 'ครอบครัว'}</p>
              </div>
            </div>

            {/* Family Switcher Dropdown */}
            {allMemberships.length > 1 && (
              <div className="relative mb-3">
                <button
                  onClick={() => setIsFamilyMenuOpen(!isFamilyMenuOpen)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-muted/60 text-xs font-semibold hover:bg-muted transition-colors"
                >
                  <span className="truncate">{family?.name}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </button>

                {isFamilyMenuOpen && (
                  <div className="absolute top-full left-0 w-full mt-1 bg-card border border-border rounded-xl shadow-lg p-1 z-30 space-y-1">
                    {allMemberships.map((m) => (
                      <button
                        key={m.family.id}
                        onClick={() => {
                          switchFamily(m.family.id);
                          setIsFamilyMenuOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          m.family.id === family?.id ? 'bg-primary text-white' : 'hover:bg-muted'
                        }`}
                      >
                        {m.family.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Add Desktop Button */}
          <button
            onClick={() => setIsQuickAddOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-primary hover:bg-primary-600 active:scale-95 text-white font-semibold text-xs shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{t.nav.quickAdd}</span>
          </button>

          {/* Navigation links */}
          <nav className="space-y-1 overflow-y-auto max-h-[calc(100vh-320px)] pr-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-primary/10 text-primary dark:bg-primary/20 font-bold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : ''}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer info & Member profile */}
        <div className="border-t border-border/80 pt-4 space-y-3">
          {/* Member Card */}
          {member && (
            <div className="flex items-center justify-between p-2 rounded-2xl bg-muted/40">
              <div className="flex items-center gap-2.5 min-w-0">
                <MemberAvatar name={member.nickname} color={member.member_color} size="sm" />
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate leading-tight">{member.nickname}</p>
                  <p className="text-[10px] text-muted-foreground">{member.role}</p>
                </div>
              </div>

              {family?.rewards_enabled === 1 && (
                <div className="flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                  <Sparkles className="w-3 h-3" />
                  <span>{member.points_balance}</span>
                </div>
              )}
            </div>
          )}

          {/* Theme & Logout Controls */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
              <button
                onClick={() => setTheme('light')}
                className={`p-1.5 rounded-lg ${theme === 'light' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
                title="Light mode"
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`p-1.5 rounded-lg ${theme === 'dark' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
                title="Dark mode"
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTheme('system')}
                className={`p-1.5 rounded-lg ${theme === 'system' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
                title="System mode"
              >
                <Laptop className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={() => logout()}
              className="p-2 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
              title={t.settings.logout}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-6">
        {/* Mobile Top Header */}
        <header className="md:hidden sticky top-0 z-40 bg-card/85 backdrop-blur-md border-b border-border/80 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-sky-400 flex items-center justify-center text-white shadow-sm">
              <Home className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm leading-none">{family?.name || 'Family Hub'}</h2>
              <p className="text-[10px] text-muted-foreground">{member?.nickname} ({member?.role})</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {family?.rewards_enabled === 1 && (
              <Link
                href="/rewards"
                className="flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold px-2 py-1 rounded-xl"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{member?.points_balance || 0}</span>
              </Link>
            )}

            <Link
              href="/settings"
              className="p-2 rounded-xl bg-muted/60 text-muted-foreground hover:text-foreground"
            >
              <Settings className="w-4 h-4" />
            </Link>
          </div>
        </header>

        {/* Page Children Container */}
        <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 animate-fadeIn">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-lg border-t border-border/80 px-2 py-1.5 safe-bottom shadow-lg">
        <div className="flex items-center justify-around relative">
          {bottomNavItems.slice(0, 2).map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-2xl transition-colors ${
                  isActive ? 'text-primary font-bold' : 'text-muted-foreground'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] tracking-tight">{item.label}</span>
              </Link>
            );
          })}

          {/* Central Prominent Quick Add Button */}
          <div className="relative -top-5">
            <button
              onClick={() => setIsQuickAddOpen(true)}
              className="w-13 h-13 w-[52px] h-[52px] rounded-full bg-gradient-to-tr from-primary to-sky-400 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform ring-4 ring-card"
              title={t.nav.quickAdd}
            >
              <Plus className="w-7 h-7" />
            </button>
          </div>

          {bottomNavItems.slice(2, 5).map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-2xl transition-colors ${
                  isActive ? 'text-primary font-bold' : 'text-muted-foreground'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Quick Add Modal */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
      />
    </div>
  );
}
