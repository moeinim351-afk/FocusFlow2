/**
 * ارقام فارسی (۰-۹) و عربی (٠-٩) را به لاتین تبدیل می‌کند.
 * کیبورد فارسی «۲۵» تایپ می‌کند و Number('۲۵') برابر NaN است؛ بدون این تبدیل کاربر فارسی‌زبان
 * در فیلدهای عددی مدام خطای «عدد صحیح وارد کنید» می‌گیرد.
 */
export function toEnglishDigits(s: string): string {
  return s
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

/** رشته‌ی عددی (با هر نوع رقم) را به عدد تبدیل می‌کند؛ ورودی نامعتبر NaN می‌دهد. */
export function parseNumberInput(v: string | number): number {
  if (typeof v === 'number') return v;
  // «٫» جداکننده‌ی اعشار و «٬» جداکننده‌ی هزارگان فارسی است
  const t = toEnglishDigits(v).replace(/\u066B/g, '.').replace(/\u066C/g, '').trim();
  return t === '' ? NaN : Number(t);
}
