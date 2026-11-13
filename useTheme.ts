import { useEffect } from 'react';
import type { AccentId, ThemeMode } from '../types/index.ts';
import { BRAND } from '../config/brand.ts';
import { applyAccent, getAccent, isAccentId } from '../config/accents.ts';

/**
 * حالت روشن/تیره در localStorage هم نگه داشته می‌شود تا:
 * ۱) صفحه‌ی ورود هم تیره باشد (تنظیمات کاربر فقط بعد از ورود از دیتابیس خوانده می‌شود)
 * ۲) هنگام بارگذاری، یک لحظه صفحه‌ی سفید نمایش داده نشود (اسکریپت درون‌خطی index.html همین کلید را می‌خواند).
 * اگر BRAND.storagePrefix را عوض کردید، کلید داخل index.html را هم عوض کنید.
 */
const MODE_KEY = `${BRAND.storagePrefix}:theme`;

export function readStoredThemeMode(): ThemeMode {
  try {
    const v = localStorage.getItem(MODE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* ignore */
  }
  return 'system';
}

function storeThemeMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    /* حالت خصوصی یا حافظه‌ی پر؛ مهم نیست */
  }
}

/**
 * mode برابر null یعنی تنظیمات واقعی هنوز بارگذاری نشده (یا کاربر وارد نشده) و حالت ذخیره‌شده‌ی مرورگر استفاده شود؛
 * بدون این، مقدار پیش‌فرض «system» تا رسیدن تنظیمات، حالت تیره‌ی انتخاب‌شده را موقتاً بر می‌داشت.
 * accent برابر null هم یعنی تم رنگی ذخیره‌شده دست‌نخورده بماند.
 */
export function useTheme(mode: ThemeMode | null, accent: AccentId | null): void {
  useEffect(() => {
    if (accent) applyAccent(accent);
  }, [accent]);

  useEffect(() => {
    const effective = mode ?? readStoredThemeMode();
    if (mode) storeThemeMode(mode);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = effective === 'dark' || (effective === 'system' && mq.matches);
      document.documentElement.classList.toggle('dark', dark);
      const id = document.documentElement.dataset.accent;
      const light = isAccentId(id) ? getAccent(id).main : BRAND.themeColor;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0F1220' : light);
    };
    apply();
    if (effective !== 'system') return;
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [mode, accent]);
}
