import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CalendarCheck, Plus, Timer } from 'lucide-react';
import { EmptyState, ProgressRing } from '../components/ui.tsx';
import { fa, formatDateLong, formatMinutes, greeting } from '../utils/format.ts';
import { isoDateOfTimestamp, todayISO } from '../utils/date.ts';
import { dayProgress, isOverdue, tasksOnDate } from '../features/tasks/taskLogic.ts';
import { useData } from '../features/tasks/DataContext.tsx';
import { TaskItem } from '../features/tasks/TaskItem.tsx';
import { TaskFormModal } from '../features/tasks/TaskFormModal.tsx';
import { ProgressDashboard } from '../features/analytics/ProgressDashboard.tsx';
import { usePomodoro } from '../features/pomodoro/PomodoroContext.tsx';
import { formatClock } from '../utils/format.ts';
import type { Task } from '../types/index.ts';

export function DashboardPage() {
  const { tasks, settings, toggleTask, sessions } = useData();
  const pomo = usePomodoro();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const today = todayISO();
  const todays = tasksOnDate(tasks, today);
  const p = dayProgress(todays);
  const overdue = tasks.filter((t) => isOverdue(t));
  const focusToday = sessions.filter((s) => s.mode === 'focus' && isoDateOfTimestamp(s.startedAt) === today);
  const focusMinutes = Math.round(focusToday.reduce((s, x) => s + x.actualSeconds, 0) / 60);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{greeting()}{settings.displayName ? `، ${settings.displayName}` : ''}</h1>
        <p className="mt-1 text-sm text-ink-soft dark:text-slate-400">{formatDateLong(new Date())}</p>
      </div>

      {overdue.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10" role="alert">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
          <p className="min-w-0 flex-1 text-sm text-red-800 dark:text-red-200">{fa(overdue.length)} کار عقب‌افتاده دارید.</p>
          <Link to="/planner" className="btn-soft">بازبرنامه‌ریزی هوشمند</Link>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <section className="card flex items-center gap-4 p-5 md:col-span-2" aria-label="پیشرفت امروز">
          <ProgressRing percent={p.percent} label={`${fa(p.percent)}٪`} />
          <div className="min-w-0 flex-1">
            <p className="font-medium">پیشرفت امروز</p>
            <div className="mt-3 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-500/10"><p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{fa(p.done)}</p><p className="text-xs text-ink-soft dark:text-slate-400">انجام‌شده</p></div>
              <div className="rounded-xl bg-primary-50 p-3 dark:bg-white/10"><p className="text-xl font-bold text-primary-700 dark:text-slate-100">{fa(p.remaining)}</p><p className="text-xs text-ink-soft dark:text-slate-400">باقی‌مانده</p></div>
            </div>
          </div>
        </section>

        <section className="card p-5" aria-label="تمرکز">
          <div className="mb-3 flex items-center gap-2 font-medium"><Timer className="h-5 w-5 text-primary" />تمرکز</div>
          <p className="text-3xl font-bold tabular-nums">{formatClock(pomo.remaining)}</p>
          <p className="mt-1 text-xs text-ink-soft dark:text-slate-400">امروز {formatMinutes(focusMinutes)} تمرکز ثبت شده</p>
          <Link to="/pomodoro" className="btn-primary mt-3 w-full">{pomo.state.status === 'running' ? 'بازگشت به تایمر' : 'شروع تمرکز'}</Link>
        </section>
      </div>

      <section aria-label="کارهای امروز">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold">کارهای امروز</h2>
          <button className="btn-primary" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" />کار جدید</button>
        </div>
        {todays.length === 0 ? (
          <div className="card"><EmptyState icon={<CalendarCheck className="h-6 w-6" />} title="برای امروز کاری ثبت نشده" hint="با افزودن یک کار کوچک شروع کنید." action={<button className="btn-soft" onClick={() => { setEditing(null); setFormOpen(true); }}>افزودن کار</button>} /></div>
        ) : (
          <ul className="space-y-2">
            {todays.map((t) => <TaskItem key={t.id} task={t} onToggle={(x) => toggleTask(x.id).catch(() => undefined)} onEdit={(x) => { setEditing(x); setFormOpen(true); }} />)}
          </ul>
        )}
      </section>

      <ProgressDashboard />

      <TaskFormModal open={formOpen} task={editing} defaultDate={today} onClose={() => setFormOpen(false)} />
    </div>
  );
}
