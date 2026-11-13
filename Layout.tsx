import type { ReactNode } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { CalendarClock, CalendarDays, Cloud, CloudOff, Focus, LayoutDashboard, ListChecks, Settings, Timer, WifiOff } from 'lucide-react';
import { BRAND } from '../config/brand.ts';
import { useOnline } from '../hooks/useOnline.ts';
import { useData } from '../features/tasks/DataContext.tsx';

const NAV = [
  { to: '/', label: 'داشبورد', icon: LayoutDashboard, end: true },
  { to: '/tasks', label: 'کارها', icon: ListChecks },
  { to: '/calendar', label: 'تقویم', icon: CalendarDays },
  { to: '/pomodoro', label: 'تمرکز', icon: Timer },
  { to: '/planner', label: 'برنامه‌ریز', icon: CalendarClock },
] as const;

function SyncBadge() {
  const { sync, user } = useData();
  if (user.isDemo) return null;
  const Icon = sync.state === 'error' ? CloudOff : Cloud;
  const label = sync.state === 'syncing' ? 'در حال همگام‌سازی' : sync.state === 'error' ? 'همگام‌سازی ناموفق' : 'همگام';
  return (
    <span className={`chip ${sync.state === 'error' ? 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300' : 'bg-slate-100 text-ink-soft dark:bg-white/10 dark:text-slate-300'}`} title={sync.error ?? undefined}>
      <Icon className="h-3.5 w-3.5" />{label}
    </span>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const online = useOnline();
  const { user } = useData();
  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? 'bg-primary-50 text-primary-700 dark:bg-white/10 dark:text-white' : 'text-ink-soft hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5'}`;

  return (
    <div className="min-h-dvh lg:flex">
      <aside className="hidden w-64 shrink-0 flex-col overflow-y-auto border-e border-slate-200/70 bg-white p-4 dark:border-white/5 dark:bg-[#12162A] lg:fixed lg:inset-y-0 lg:right-0 lg:z-40 lg:flex lg:h-dvh">
        <Link to="/" className="mb-6 flex items-center gap-2 px-2 text-lg font-bold text-primary">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white"><Focus className="h-5 w-5" /></span>
          <span className="tracking-tight">{BRAND.name}</span>
        </Link>
        <nav className="flex flex-col gap-1" aria-label="ناوبری اصلی">
          {NAV.map((n) => <NavLink key={n.to} to={n.to} end={'end' in n ? n.end : false} className={linkCls}><n.icon className="h-5 w-5" />{n.label}</NavLink>)}
        </nav>
        <div className="mt-auto space-y-3">
          <SyncBadge />
          <NavLink to="/settings" className={linkCls}><Settings className="h-5 w-5" />تنظیمات و حساب</NavLink>
        </div>
      </aside>

      <div className="min-w-0 flex-1 lg:mr-64">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-slate-200/70 bg-surface/90 px-4 py-3 backdrop-blur dark:border-white/5 dark:bg-surface-dark/90 lg:hidden" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
          <Link to="/" className="font-bold text-primary">{BRAND.name}</Link>
          <div className="flex items-center gap-2">
            <SyncBadge />
            <NavLink to="/settings" aria-label="تنظیمات و حساب" className="btn-ghost !min-h-0 rounded-xl p-2"><Settings className="h-5 w-5" /></NavLink>
          </div>
        </header>

        {!online && (
          <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:bg-amber-500/15 dark:text-amber-200" role="status">
            <WifiOff className="h-4 w-4 shrink-0" />
            آفلاین هستید؛ تغییرات روی دستگاه ذخیره می‌شود{user.isDemo ? '.' : ' و پس از اتصال همگام می‌شود.'}
          </div>
        )}
        {user.isDemo && (
          <div className="bg-primary-50 px-4 py-2 text-sm text-primary-700 dark:bg-white/5 dark:text-slate-200">
            حالت دمو: داده‌ها فقط روی همین دستگاه ذخیره می‌شوند و همگام نمی‌شوند.
          </div>
        )}

        <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-5 lg:pb-10">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200/70 bg-white/95 backdrop-blur dark:border-white/5 dark:bg-[#12162A]/95 lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} aria-label="ناوبری اصلی">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={'end' in n ? n.end : false} className={({ isActive }) => `flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${isActive ? 'text-primary' : 'text-ink-soft dark:text-slate-400'}`}>
              <n.icon className="h-5 w-5" />{n.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
