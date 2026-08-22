'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { th, en, Locale } from '@/locales';

type Language = 'th' | 'en';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: Locale;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'th',
  setLang: () => {},
  t: th,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('th');

  useEffect(() => {
    const saved = localStorage.getItem('family_hub_lang') as Language | null;
    if (saved === 'th' || saved === 'en') {
      setLangState(saved);
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('family_hub_lang', newLang);
  };

  const t = lang === 'en' ? en : th;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
