import { i18n } from '@lingui/core';

export const supportedLocales = {
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  ja: '日本語',
  ko: '한국어',
  zh: '中文',
} as const;

export type SupportedLocale = keyof typeof supportedLocales;

export const defaultLocale: SupportedLocale = 'en';

/**
 * Dynamically imports and activates the compiled message catalog for the given locale.
 *
 * @param locale - One of the supported locale codes (en, de, ja, ko, zh).
 */
export async function dynamicActivate(locale: SupportedLocale): Promise<void> {
  const { messages } = await import(`../locales/${locale}/messages.ts`);
  i18n.load(locale, messages);
  i18n.activate(locale);
}

/**
 * Detects the user's preferred locale using the following priority:
 *
 * 1. Value stored in localStorage under 'lancelot-locale'
 * 2. The browser's navigator.language (matched by base language code)
 * 3. Falls back to the default locale ('en')
 */
export function detectLocale(): SupportedLocale {
  const localeKeys = Object.keys(supportedLocales) as SupportedLocale[];

  // 1. Check localStorage
  try {
    const stored = localStorage.getItem('lancelot-locale');
    if (stored && localeKeys.includes(stored as SupportedLocale)) {
      return stored as SupportedLocale;
    }
  } catch {
    // localStorage may be unavailable (e.g. in some sandboxed contexts)
  }

  // 2. Check navigator.language (e.g. "de-DE" -> "de")
  if (typeof navigator !== 'undefined' && navigator.language) {
    const browserLang = navigator.language;

    // Try exact match first
    if (localeKeys.includes(browserLang as SupportedLocale)) {
      return browserLang as SupportedLocale;
    }

    // Try base language code (everything before the first hyphen)
    const baseLang = browserLang.split('-')[0];
    if (localeKeys.includes(baseLang as SupportedLocale)) {
      return baseLang as SupportedLocale;
    }
  }

  // 3. Fall back to default
  return defaultLocale;
}

export { i18n };
