import zhCN from './zh-CN';
import enUS from './en-US';

export const locales = { 'zh-CN': zhCN, 'en-US': enUS } as const;
export type Locale = keyof typeof locales;

export function t(key: string, locale: Locale = 'zh-CN'): string {
  const keys = key.split('.');
  let obj: any = locales[locale];
  for (const k of keys) { if (obj == null) return key; obj = obj[k]; }
  return typeof obj === 'string' ? obj : key;
}
