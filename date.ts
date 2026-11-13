import type { ISODate } from '../types/index.ts';

/** هفته در تقویم ایرانی از شنبه (6 در getDay) شروع می‌شود. */
export const WEEK_STARTS_ON = 6;

const pad = (n: number) => String(n).padStart(2, '0');

export function toISO(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISO(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number);
  // ظهر محلی تا مشکل تغییر ساعت تابستانی پیش نیاید
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function isValidISO(s: unknown): s is ISODate {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return toISO(fromISO(s)) === s;
}

export function isValidTime(s: unknown): s is string {
  return typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

export function todayISO(now: Date = new Date()): ISODate {
  return toISO(now);
}

export function nowHHmm(now: Date = new Date()): string {
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function addDaysISO(s: ISODate, n: number): ISODate {
  const d = fromISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((fromISO(a).getTime() - fromISO(b).getTime()) / 86_400_000);
}

export function startOfWeekISO(s: ISODate, weekStartsOn: number = WEEK_STARTS_ON): ISODate {
  const dow = fromISO(s).getDay();
  const offset = (dow - weekStartsOn + 7) % 7;
  return addDaysISO(s, -offset);
}

export function weekDays(weekStart: ISODate): ISODate[] {
  return Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i));
}

export function rangeDays(start: ISODate, count: number): ISODate[] {
  return Array.from({ length: count }, (_, i) => addDaysISO(start, i));
}

/**
 * مقایسه‌ی دو برچسب زمانی. قالب Postgres («...+00:00» با میکروثانیه) با قالب جاوااسکریپت («...Z») فرق دارد
 * و مقایسه‌ی رشته‌ای آن‌ها نادرست است؛ پس اول به میلی‌ثانیه تبدیل می‌شوند.
 */
export function isNewerTimestamp(a: string, b: string): boolean {
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (Number.isFinite(ta) && Number.isFinite(tb)) return ta > tb;
  return a > b;
}

/** تبدیل زمان ISO کامل به روز محلی */
export function isoDateOfTimestamp(ts: string): ISODate {
  return toISO(new Date(ts));
}
