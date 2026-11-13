import { useEffect, useRef, useState } from 'react';
import { Bell, Check, Crown, LogOut, Moon, RefreshCw, Sun, SunMoon } from 'lucide-react';
import { ConfirmDialog, PageHeader } from '../components/ui.tsx';
import { useToast } from '../components/Toast.tsx';
import type { Settings, ThemeMode } from '../types/index.ts';
import { notificationSupport, requestNotificationPermission, type NotifySupport } from '../lib/notify.ts';
import { useAuth } from '../features/auth/AuthContext.tsx';
import { useData } from '../features/tasks/DataContext.tsx';
import { fa, formatMinutes } from '../utils/format.ts';
import { parseNumberInput } from '../utils/digits.ts';
import { ACCENTS } from '../config/accents.ts';
import { deleteUserLocalData } from '../services/repository.ts';

interface Draft { displayName: string; focusMinutes: string; shortBreakMinutes: string; longBreakMinutes: string; dailyAvailableMinutes: string; reminderLeadMinutes: string }
type Errors = Partial<Record<keyof Draft, string>>;

const toDraft = (s: Settings): Draft => ({
  displayName: s.displayName, focusMinutes: String(s.focusMinutes), shortBreakMinutes: String(s.shortBreakMinutes),
  longBreakMinutes: String(s.longBreakMinutes), dailyAvailableMinutes: String(s.dailyAvailableMinutes), reminderLeadMinutes: String(s.reminderLeadMinutes),
});

function intIn(v: string, min: number, max: number, label: string): string | undefined {
  const n = parseNumberInput(v);
  if (!Number.isInteger(n)) return `${label} را به صورت عدد صحیح وارد کنید.`;
  if (n < min || n > max) return `${label} باید بین ${fa(min)} تا ${fa(max)} باشد.`;
  return undefined;
}

export function SettingsPage() {
  const { settings, updateSettings, user, sync, syncNow, tasks, sessions, reviews, importBackup } = useData();
  const { signOut } = useAuth();
  const toast = useToast();
  const [draft, setDraft] = useState<Draft>(toDraft(settings));
  const [errors, setErrors] = useState<Errors>({});
  const [notify, setNotify] = useState<NotifySupport>(notificationSupport());
  const [confirmOut, setConfirmOut] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // تا وقتی کاربر چیزی را ویرایش نکرده، فرم با تنظیمات ذخیره‌شده هم‌گام می‌ماند؛ ویرایش نیمه‌کاره با همگام‌سازی یا تغییر پوسته پاک نمی‌شود.
  const touched = useRef(false);
  useEffect(() => {
    if (!touched.current) setDraft(toDraft(settings));
  }, [settings]);
  const set = (k: keyof Draft, v: string) => {
    touched.current = true;
    setDraft((d) => ({ ...d, [k]: v }));
  };

  async function save() {
    const e: Errors = {
      displayName: draft.displayName.trim().length > 60 ? 'نام باید حداکثر ۶۰ نویسه باشد.' : undefined,
      focusMinutes: intIn(draft.focusMinutes, 1, 180, 'مدت تمرکز'),
      shortBreakMinutes: intIn(draft.shortBreakMinutes, 1, 60, 'استراحت کوتاه'),
      longBreakMinutes: intIn(draft.longBreakMinutes, 1, 120, 'استراحت بلند'),
      dailyAvailableMinutes: intIn(draft.dailyAvailableMinutes, 15, 1440, 'زمان مطالعه‌ی روزانه'),
      reminderLeadMinutes: intIn(draft.reminderLeadMinutes, 0, 240, 'زمان پیش از یادآوری'),
    };
    const clean = Object.fromEntries(Object.entries(e).filter(([, v]) => v)) as Errors;
    setErrors(clean);
    if (Object.keys(clean).length > 0) return;
    touched.current = false;
    try {
      await updateSettings({
        displayName: draft.displayName.trim(), focusMinutes: parseNumberInput(draft.focusMinutes), shortBreakMinutes: parseNumberInput(draft.shortBreakMinutes),
        longBreakMinutes: parseNumberInput(draft.longBreakMinutes), dailyAvailableMinutes: parseNumberInput(draft.dailyAvailableMinutes), reminderLeadMinutes: parseNumberInput(draft.reminderLeadMinutes),
      });
      toast.show('تنظیمات ذخیره شد.', 'success');
    } catch {
      touched.current = true; // ذخیره نشد؛ ویرایش کاربر حفظ شود
    }
  }

  const themes: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
    { id: 'light', label: 'روشن', icon: Sun }, { id: 'dark', label: 'تیره', icon: Moon }, { id: 'system', label: 'سیستم', icon: SunMoon },
  ];

  const field = (k: keyof Draft, label: string, hint?: string) => (
    <div>
      <label className="label" htmlFor={`st-${k}`}>{label}</label>
      <input id={`st-${k}`} className="input" inputMode={k === 'displayName' ? 'text' : 'numeric'} value={draft[k]} onChange={(e) => set(k, e.target.value)} />
      {hint && !errors[k] && <p className="mt-1 text-xs text-ink-soft dark:text-slate-400">{hint}</p>}
      {errors[k] && <p className="field-error">{errors[k]}</p>}
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="تنظیمات و حساب" />

      <section className="card space-y-4 p-5">
        <h2 className="font-bold">پروفایل</h2>
        {field('displayName', 'نام نمایشی')}
        <fieldset>
          <legend className="label">پوسته</legend>
          <div className="grid grid-cols-3 gap-2">
            {themes.map((t) => (
              <button key={t.id} aria-pressed={settings.theme === t.id} onClick={() => updateSettings({ theme: t.id }).catch(() => undefined)} className={`btn ${settings.theme === t.id ? 'bg-primary text-white' : 'btn-soft'}`}><t.icon className="h-4 w-4" />{t.label}</button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="label">رنگ تم</legend>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {ACCENTS.map((a) => {
              const active = settings.accent === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => updateSettings({ accent: a.id }).catch(() => undefined)}
                  className={`flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-xl border-2 px-2 py-2 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${active ? 'border-primary bg-primary-50 dark:bg-white/10' : 'border-transparent bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10'}`}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full text-white" style={{ backgroundColor: a.main }}>{active && <Check className="h-4 w-4" />}</span>
                  {a.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-bold">پومودورو و زمان مطالعه</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {field('focusMinutes', 'تمرکز (دقیقه)')}
          {field('shortBreakMinutes', 'استراحت کوتاه (دقیقه)')}
          {field('longBreakMinutes', 'استراحت بلند (دقیقه)')}
        </div>
        {field('dailyAvailableMinutes', 'زمان مطالعه‌ی روزانه (دقیقه)', `معادل ${formatMinutes(parseNumberInput(draft.dailyAvailableMinutes) || 0)}؛ برای محاسبه‌ی ظرفیت برنامه‌ریز استفاده می‌شود.`)}
        <p className="text-xs text-ink-soft dark:text-slate-400">تغییر مدت‌ها فقط وقتی تایمر در حالت آماده است اعمال می‌شود.</p>
        <label className="flex items-center justify-between gap-3 text-sm"><span>صدای پایان جلسه و لرزش دستگاه</span><input type="checkbox" className="h-5 w-5 accent-primary" checked={settings.soundEnabled} onChange={e => updateSettings({soundEnabled:e.target.checked}).catch(()=>undefined)} /></label>
        <label className="flex items-center justify-between gap-3 text-sm"><span>شروع خودکار مرحله‌ی بعد (تمرکز/استراحت)</span><input type="checkbox" className="h-5 w-5 accent-primary" checked={settings.autoStartNext} onChange={e => updateSettings({autoStartNext:e.target.checked}).catch(()=>undefined)} /></label>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="flex items-center gap-2 font-bold"><Bell className="h-5 w-5 text-primary" />یادآوری‌ها</h2>
        <label className="flex min-h-[44px] items-center justify-between gap-3">
          <span className="text-sm">یادآوری درون‌برنامه‌ای برای کارهای نزدیک و عقب‌افتاده</span>
          <input type="checkbox" className="h-5 w-5 accent-primary" checked={settings.remindersEnabled} onChange={(e) => updateSettings({ remindersEnabled: e.target.checked }).catch(() => undefined)} />
        </label>
        {field('reminderLeadMinutes', 'یادآوری چند دقیقه قبل از شروع کار', 'مقدار صفر یعنی دقیقاً هنگام شروع.')}
        <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-white/5">
          {notify === 'unsupported' && <p>این مرورگر از اعلان پشتیبانی نمی‌کند؛ یادآوری‌ها فقط درون برنامه نمایش داده می‌شوند.</p>}
          {notify === 'granted' && <p>اعلان مرورگر فعال است.</p>}
          {notify === 'denied' && <p>اعلان مرورگر در تنظیمات مرورگر مسدود شده است؛ یادآوری‌ها درون برنامه نمایش داده می‌شوند.</p>}
          {notify === 'default' && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p>برای دریافت اعلان مرورگر اجازه بدهید.</p>
              <button className="btn-soft" onClick={async () => setNotify(await requestNotificationPermission())}>فعال‌سازی اعلان</button>
            </div>
          )}
          <p className="mt-2 text-xs text-ink-soft dark:text-slate-400">اعلان‌ها فقط وقتی برنامه باز است نمایش داده می‌شوند؛ اعلان پس‌زمینه (Push) هنوز پشتیبانی نمی‌شود.</p>
        </div>
      </section>

      <div className="flex justify-end"><button className="btn-primary" onClick={() => void save()}>ذخیره‌ی تنظیمات</button></div>

      <section className="card space-y-3 p-5">
        <h2 className="font-bold">پشتیبان‌گیری و انتقال اطلاعات</h2>
        <p className="text-sm text-ink-soft dark:text-slate-400">از کارها، جلسه‌های تمرکز، گزارش‌ها و تنظیمات یک نسخه‌ی JSON بگیرید یا آن را بازیابی کنید.</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-soft" onClick={() => { const blob = new Blob([JSON.stringify({version:1, exportedAt:new Date().toISOString(), tasks, sessions, reviews, settings}, null, 2)], {type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='focusly-backup.json'; a.click(); URL.revokeObjectURL(url); }}>خروجی JSON</button>
          <label className="btn-soft cursor-pointer">ورود فایل JSON<input type="file" accept="application/json,.json" className="hidden" onChange={async e => { const file=e.target.files?.[0]; if(!file) return; try { const data=JSON.parse(await file.text()); if(!data || data.version!==1 || !Array.isArray(data.tasks) || !Array.isArray(data.sessions)) throw new Error('invalid'); if (!window.confirm('اطلاعات فایل به داده‌های فعلی اضافه می‌شود. ادامه می‌دهید؟')) return; await importBackup(data); toast.show('بازیابی اطلاعات با موفقیت انجام شد.', 'success'); } catch { toast.show('فایل پشتیبان معتبر نیست.', 'error'); } e.currentTarget.value=''; }} /></label>
        </div>
        <p className="text-xs text-ink-soft dark:text-slate-400">بازیابی، اطلاعات فایل را به داده‌های حساب فعلی اضافه می‌کند و شناسه‌ی مالک را به حساب واردشده تغییر می‌دهد.</p>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="font-bold">حساب کاربری</h2>
        {user.isDemo ? (
          <p className="text-sm text-ink-soft dark:text-slate-300">در حالت دمو هستید و داده‌ها فقط روی همین دستگاه ذخیره می‌شوند.</p>
        ) : (
          <>
            <p className="break-all text-sm" dir="ltr">{user.email}</p>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-ink-soft dark:text-slate-300">{sync.state === 'syncing' ? 'در حال همگام‌سازی…' : sync.state === 'error' ? `خطا: ${sync.error ?? ''}` : sync.lastSyncAt ? 'همگام‌سازی انجام شد.' : 'در انتظار همگام‌سازی'}</span>
              <button className="btn-soft" onClick={() => void syncNow()} disabled={sync.state === 'syncing'}><RefreshCw className="h-4 w-4" />همگام‌سازی اکنون</button>
            </div>
            {sync.conflicts > 0 && <p className="text-xs text-amber-700 dark:text-amber-300">{fa(sync.conflicts)} تغییر هم‌زمان شناسایی شد؛ نسخه‌ی جدیدتر سرور نگه داشته شد.</p>}
          </>
        )}
        {!user.isDemo && <button className="btn-ghost text-red-600" onClick={() => setConfirmDelete(true)}>حذف دائمی حساب و همه‌ی داده‌ها</button>}
        <button className="btn-ghost text-red-600" onClick={() => setConfirmOut(true)}><LogOut className="h-4 w-4" />{user.isDemo ? 'خروج از حالت دمو' : 'خروج از حساب'}</button>
      </section>

      <section className="card flex items-center gap-3 p-5">
        <Crown className="h-6 w-6 shrink-0 text-secondary" />
        <div className="min-w-0 flex-1"><p className="font-bold">اشتراک Pro</p><p className="text-sm text-ink-soft dark:text-slate-400">امکانات بیشتر در نسخه‌های بعدی.</p></div>
        <span className="chip bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">به‌زودی</span>
      </section>

      <ConfirmDialog open={confirmDelete} danger title="حذف دائمی حساب" message="این کار غیرقابل بازگشت است و حساب و داده‌های همگام‌شده را از سرور حذف می‌کند. آیا مطمئن هستید؟" confirmLabel="حذف حساب" onConfirm={async () => { try { const { supabase } = await import('../lib/supabase.ts'); if (!supabase) throw new Error('supabase'); const { error } = await supabase.rpc('delete_my_account'); if (error) throw error; await deleteUserLocalData(user.id); await signOut(); } catch { toast.show('حذف حساب انجام نشد. ابتدا migration شماره ۰۰۳ را در Supabase اجرا کنید.', 'error'); } setConfirmDelete(false); }} onCancel={() => setConfirmDelete(false)} />
      <ConfirmDialog open={confirmOut} title={user.isDemo ? 'خروج از حالت دمو' : 'خروج از حساب'} message={user.isDemo ? 'با خروج از حالت دمو، داده‌های محلی حذف نمی‌شوند ولی بدون حساب همگام نخواهند شد. ادامه می‌دهید؟' : 'از حساب خود خارج می‌شوید. داده‌های همگام‌نشده روی این دستگاه می‌مانند. ادامه می‌دهید؟'} confirmLabel="خروج" danger onConfirm={() => void signOut()} onCancel={() => setConfirmOut(false)} />
    </div>
  );
}
