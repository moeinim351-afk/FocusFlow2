import type { AccentId } from '../types/index.ts';
import { BRAND } from './brand.ts';

export interface AccentPalette {
  id: AccentId;
  label: string;
  /** رنگ اصلی (دکمه‌ها، آیکن‌ها، نمودار) و رنگ نشانه‌ی theme-color مرورگر */
  main: string;
  p50: string;
  p100: string;
  p600: string;
  p700: string;
  secondary: string;
}

/**
 * شش تم رنگی. رنگ اصلی طوری انتخاب شده که متن سفید روی دکمه خوانا بماند
 * (به همین دلیل «کهربایی» کمی تیره‌تر از زرد معمول است).
 */
export const ACCENTS: readonly AccentPalette[] = [
  { id: 'indigo', label: 'ایندیگو', main: '#536DFE', p50: '#EEF1FF', p100: '#DDE3FF', p600: '#3F57E8', p700: '#3346C9', secondary: '#8B7CF6' },
  { id: 'emerald', label: 'زمردی', main: '#059669', p50: '#ECFDF5', p100: '#D1FAE5', p600: '#047857', p700: '#065F46', secondary: '#14B8A6' },
  { id: 'rose', label: 'رز', main: '#E11D48', p50: '#FFF1F2', p100: '#FFE4E6', p600: '#BE123C', p700: '#9F1239', secondary: '#F472B6' },
  { id: 'violet', label: 'بنفش', main: '#7C3AED', p50: '#F5F3FF', p100: '#EDE9FE', p600: '#6D28D9', p700: '#5B21B6', secondary: '#C084FC' },
  { id: 'ocean', label: 'اقیانوسی', main: '#0284C7', p50: '#F0F9FF', p100: '#E0F2FE', p600: '#0369A1', p700: '#075985', secondary: '#06B6D4' },
  { id: 'amber', label: 'کهربایی', main: '#B45309', p50: '#FFFBEB', p100: '#FEF3C7', p600: '#92400E', p700: '#78350F', secondary: '#F59E0B' },
];

export const DEFAULT_ACCENT: AccentId = 'indigo';

export function isAccentId(v: unknown): v is AccentId {
  return typeof v === 'string' && ACCENTS.some((a) => a.id === v);
}

export function getAccent(id: AccentId): AccentPalette {
  return ACCENTS.find((a) => a.id === id) ?? ACCENTS[0];
}

/** '#536DFE' → '83 109 254' (قالب مورد نیاز rgb(var(--x) / alpha) در Tailwind) */
export function hexToChannels(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

const STORAGE_KEY = `${BRAND.storagePrefix}:accent`;

/** تم را روی کل برنامه اعمال می‌کند و برای بارگذاری بعدی (بدون پرش رنگ) در مرورگر نگه می‌دارد. */
export function applyAccent(id: AccentId): void {
  const a = getAccent(id);
  const style = document.documentElement.style;
  style.setProperty('--c-primary', hexToChannels(a.main));
  style.setProperty('--c-primary-50', hexToChannels(a.p50));
  style.setProperty('--c-primary-100', hexToChannels(a.p100));
  style.setProperty('--c-primary-600', hexToChannels(a.p600));
  style.setProperty('--c-primary-700', hexToChannels(a.p700));
  style.setProperty('--c-secondary', hexToChannels(a.secondary));
  document.documentElement.dataset.accent = a.id;
  try {
    localStorage.setItem(STORAGE_KEY, a.id);
  } catch {
    /* حالت خصوصی یا حافظه‌ی پر؛ مهم نیست */
  }
}

/** پیش از رندر اولیه صدا زده می‌شود تا تم قبلی کاربر تا رسیدن تنظیمات اصلی دیده شود. */
export function applyStoredAccent(): void {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (isAccentId(v)) applyAccent(v);
  } catch {
    /* ignore */
  }
}
