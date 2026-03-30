/**
 * Lancelot translation catalogs formatted for @portneuf/i18n.
 *
 * All keys are prefixed with 'lancelot.' to namespace them
 * within the Portal's shared i18n system.
 */

import { messages as en } from '../locales/en/messages';
import { messages as de } from '../locales/de/messages';
import { messages as es } from '../locales/es/messages';
import { messages as fr } from '../locales/fr/messages';
import { messages as ja } from '../locales/ja/messages';
import { messages as ko } from '../locales/ko/messages';
import { messages as zh } from '../locales/zh/messages';

function prefixKeys(msgs: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(msgs)) {
    result[`lancelot.${key}`] = value;
  }
  return result;
}

export const lancelotTranslations: Record<string, Record<string, string>> = {
  en: prefixKeys(en),
  de: prefixKeys(de),
  es: prefixKeys(es),
  fr: prefixKeys(fr),
  ja: prefixKeys(ja),
  ko: prefixKeys(ko),
  zh: prefixKeys(zh),
};
