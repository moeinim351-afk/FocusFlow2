import type { ISODate } from '../types/index.ts';
import { fromISO } from './date.ts';

const nf = new Intl.NumberFormat('fa-IR');
export const fa = (n: number): string => nf.format(n);

const dateLong = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const dateShort = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day: 'numeric', month: 'long' });
const weekday = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { weekday: 'long' });
const weekdayShort = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { weekday: 'short' });

export const formatDateLong = (d: ISODate | Date) => dateLong.format(typeof d === 'string' ? fromISO(d) : d);
export const formatDateShort = (d: ISODate) => dateShort.format(fromISO(d));
export const formatWeekday = (d: ISODate) => weekday.format(fromISO(d));
export const formatWeekdayShort = (d: ISODate) => weekdayShort.format(fromISO(d));

export function formatMinutes(min: number): string {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${fa(r)} دقیقه`;
  if (r === 0) return `${fa(h)} ساعت`;
  return `${fa(h)} ساعت و ${fa(r)} دقیقه`;
}

export function formatClock(ms: number): string {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  const mm = String(Math.floor(total / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  return `${faDigits(mm)}:${faDigits(ss)}`;
}

export function faDigits(s: string): string {
  return s.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
}

export function formatTime(t: string | null): string {
  return t ? faDigits(t) : '';
}

export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 5) return 'شب بخیر';
  if (h < 12) return 'صبح بخیر';
  if (h < 17) return 'ظهر بخیر';
  if (h < 20) return 'عصر بخیر';
  return 'شب بخیر';
}

export const PRIORITY_LABEL = { low: 'کم', medium: 'متوسط', high: 'زیاد' } as const;
