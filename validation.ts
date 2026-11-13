export interface AuthErrors { email?: string; password?: string; name?: string }

export function validateAuth(email: string, password: string, mode: 'signin' | 'signup', name = ''): AuthErrors {
  const e: AuthErrors = {};
  if (!email.trim()) e.email = 'ایمیل را وارد کنید.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) e.email = 'ایمیل معتبر نیست.';
  if (!password) e.password = 'رمز عبور را وارد کنید.';
  else if (mode === 'signup' && password.length < 8) e.password = 'رمز عبور باید حداقل ۸ نویسه باشد.';
  else if (mode === 'signup' && !(/[A-Za-z]/.test(password) && /\d/.test(password))) e.password = 'رمز عبور باید شامل حرف و عدد باشد.';
  if (mode === 'signup' && name.trim().length > 60) e.name = 'نام باید حداکثر ۶۰ نویسه باشد.';
  return e;
}

export function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return 'ایمیل یا رمز عبور اشتباه است.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'این ایمیل قبلاً ثبت‌نام شده است.';
  if (m.includes('email not confirmed')) return 'ایمیل شما هنوز تایید نشده است. صندوق ورودی را بررسی کنید.';
  if (m.includes('rate limit') || m.includes('too many')) return 'تعداد تلاش‌ها زیاد است. کمی بعد دوباره امتحان کنید.';
  if (m.includes('password')) return 'رمز عبور پذیرفته نشد. رمز قوی‌تری انتخاب کنید.';
  if (m.includes('fetch') || m.includes('network')) return 'ارتباط با سرور برقرار نشد. اینترنت خود را بررسی کنید.';
  return 'خطایی رخ داد. لطفاً دوباره تلاش کنید.';
}
