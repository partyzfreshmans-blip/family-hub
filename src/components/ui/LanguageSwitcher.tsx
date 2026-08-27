'use client';

import React from 'react';
import { Languages, Globe } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';

interface LanguageSwitcherProps {
  variant?: 'pill' | 'button' | 'full';
  className?: string;
}

export function LanguageSwitcher({ variant = 'pill', className = '' }: LanguageSwitcherProps) {
  const { lang, setLang } = useLanguage();

  const toggleLanguage = () => {
    setLang(lang === 'th' ? 'en' : 'th');
  };

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={toggleLanguage}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-muted/60 hover:bg-muted text-foreground text-xs font-bold transition-all border border-border/60 active:scale-95 ${className}`}
        title="สลับภาษา / Switch Language"
      >
        <Languages className="w-3.5 h-3.5 text-primary" />
        <span>{lang === 'th' ? '🇹🇭 TH' : '🇬🇧 EN'}</span>
      </button>
    );
  }

  if (variant === 'full') {
    return (
      <div className={`flex items-center p-1 rounded-2xl bg-muted/60 border border-border/80 text-xs font-bold ${className}`}>
        <button
          type="button"
          onClick={() => setLang('th')}
          className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            lang === 'th'
              ? 'bg-card text-primary shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>🇹🇭</span>
          <span>ไทย (TH)</span>
        </button>
        <button
          type="button"
          onClick={() => setLang('en')}
          className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            lang === 'en'
              ? 'bg-card text-primary shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>🇬🇧</span>
          <span>English (EN)</span>
        </button>
      </div>
    );
  }

  // Default 'pill' variant: compact dual toggle
  return (
    <div
      className={`inline-flex items-center p-0.5 rounded-xl bg-muted/70 border border-border/70 text-[11px] font-extrabold ${className}`}
    >
      <button
        type="button"
        onClick={() => setLang('th')}
        className={`px-2 py-1 rounded-lg transition-all flex items-center gap-1 ${
          lang === 'th'
            ? 'bg-card text-primary shadow-xs'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        title="ภาษาไทย"
      >
        <span>🇹🇭</span>
        <span>TH</span>
      </button>
      <button
        type="button"
        onClick={() => setLang('en')}
        className={`px-2 py-1 rounded-lg transition-all flex items-center gap-1 ${
          lang === 'en'
            ? 'bg-card text-primary shadow-xs'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        title="English"
      >
        <span>🇬🇧</span>
        <span>EN</span>
      </button>
    </div>
  );
}
