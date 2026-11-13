import { useState, type FormEvent } from 'react';
import { Focus } from 'lucide-react';
import { BRAND } from '../config/brand.ts';
import { useAuth } from '../features/auth/AuthContext.tsx';
import { validateAuth, type AuthErrors } from '../features/auth/validation.ts';

export function AuthPage() {
  const { configured, signIn, signUp, enterDemo } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<AuthErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setInfo(null);
    const errs = validateAuth(email, password, mode, name);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setBusy(true);
    if (mode === 'signin') {
      const err = await signIn(email, password);
      if (err) setFormError(err);
    } else {
      const r = await signUp(email, password, name);
      if (r.error) setFormError(r.error);
      else {
        setPassword('');
        if (r.needsConfirmation) setInfo('ثبت‌نام انجام شد. برای فعال‌سازی حساب، لینک ارسال‌شده به ایمیل خود را باز کنید.');
      }
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white"><Focus className="h-7 w-7" /></span>
        <h1 className="text-2xl font-bold">{BRAND.name}</h1>
        <p className="mt-1 text-sm text-ink-soft dark:text-slate-400">{BRAND.tagline}</p>
      </div>

      <div className="card p-5">
        {configured ? (
          <>
            <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-white/10" role="tablist">
              {(['signin', 'signup'] as const).map((m) => (
                <button key={m} role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setErrors({}); setFormError(null); setInfo(null); }} className={`min-h-[40px] rounded-lg text-sm font-medium ${mode === m ? 'bg-white shadow-card dark:bg-[#171B2E]' : 'text-ink-soft dark:text-slate-300'}`}>
                  {m === 'signin' ? 'ورود' : 'ثبت‌نام'}
                </button>
              ))}
            </div>
            <form onSubmit={submit} className="space-y-4" noValidate>
              {mode === 'signup' && (
                <div>
                  <label className="label" htmlFor="au-name">نام نمایشی (اختیاری)</label>
                  <input id="au-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                  {errors.name && <p className="field-error">{errors.name}</p>}
                </div>
              )}
              <div>
                <label className="label" htmlFor="au-email">ایمیل</label>
                <input id="au-email" type="email" dir="ltr" className="input text-left" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" />
                {errors.email && <p className="field-error">{errors.email}</p>}
              </div>
              <div>
                <label className="label" htmlFor="au-pass">رمز عبور</label>
                <input id="au-pass" type="password" dir="ltr" className="input text-left" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} />
                {errors.password && <p className="field-error">{errors.password}</p>}
              </div>
              {formError && <p className="field-error" role="alert">{formError}</p>}
              {info && <p className="text-sm text-emerald-700 dark:text-emerald-300" role="status">{info}</p>}
              <button type="submit" className="btn-primary w-full" disabled={busy}>{busy ? 'لطفاً صبر کنید…' : mode === 'signin' ? 'ورود' : 'ساخت حساب'}</button>
            </form>
            <div className="my-4 border-t border-slate-100 dark:border-white/10" />
          </>
        ) : (
          <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm leading-7 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
            اتصال به Supabase هنوز تنظیم نشده است، بنابراین ثبت‌نام و ورود در دسترس نیست. می‌توانید در حالت دمو از برنامه استفاده کنید؛ داده‌ها فقط روی همین دستگاه می‌مانند.
          </p>
        )}
        <button className={configured ? 'btn-ghost w-full' : 'btn-primary w-full'} onClick={enterDemo}>ادامه در حالت دمو (بدون حساب)</button>
        {configured && <p className="mt-2 text-center text-xs text-ink-soft dark:text-slate-400">داده‌های حالت دمو با حساب کاربری منتقل نمی‌شوند.</p>}
      </div>
    </div>
  );
}
