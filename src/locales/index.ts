import { th, Locale } from './th';
import { en } from './en';

export type Language = 'th' | 'en';

export const dictionaries = {
  th,
  en,
};

export function getDictionary(lang: Language = 'th') {
  return dictionaries[lang] || dictionaries.th;
}

export { th, en };
export type { Locale };
