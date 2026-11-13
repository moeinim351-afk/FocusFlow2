import { useMemo, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { ConfirmDialog, PageHeader } from '../components/ui.tsx';
import type { TimerMode } from '../types/index.ts';
import { isoDateOfTimestamp, todayISO } from '../utils/date.ts';
import { fa, formatClock, formatMinutes } from '../utils/format.ts';
import { sortTasks } from '../features/tasks/taskLogic.ts';
import { useData } from '../features/tasks/DataContext.tsx';
import { usePomodoro } from '../features/pomodoro/PomodoroContext.tsx';
import { LONG_BREAK_EVERY } from '../features/pomodoro/timer.ts';

const MODES: { id: TimerMode; label: string }[] = [
  { id: 'focus', label: 'تمرکز' },
  { id: 'short_break', label: 'استراحت کوتاه' },
  { id: 'long_break', label: 'استراحت بلند' },
];

export function PomodoroPage() {
  const { tasks, sessions } = useData();
  const p = usePomodoro();
  const { state, remaining } = p;
  const [confirmReset, setConfirmReset] = useState(false);

  const pending = useMemo(() => sortTasks(tasks.filter((t) => !t.completed)), [tasks]);
  const today = todayISO();
  const todays = sessions.filter((s) => s.mode === 'focus' && isoDateOfTimestamp(s.startedAt) === today);
  const todayMinutes = Math.round(todays.reduce((s, x) => s + x.actualSeconds, 0) / 60);

  const progress = 1 - remaining / state.totalMs;
  const size = 260;
  const r = 118;
  const c = 2 * Math.PI * r;
  const cycle = state.focusCompleted % LONG_BREAK_EVERY;
  const inProgress = state.status !== 'idle';

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="تمرکز (پومودورو)" subtitle="تایمر بر اساس زمان واقعی کار می‌کند و با رفرش صفحه از بین نمی‌رود." />

      <div className="card p-5">
        <div className="mb-5 grid grid-cols-3 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-white/10" role="tablist" aria-label="نوع جلسه">
          {MODES.map((m) => (
            <button key={m.id} role="tab" aria-selected={state.mode === m.id} disabled={inProgress && state.mode !== m.id} onClick={() => p.setMode(m.id)} className={`min-h-[40px] rounded-lg px-1 text-xs font-medium disabled:opacity-40 sm:text-sm ${state.mode === m.id ? 'bg-white shadow-card dark:bg-[#171B2E]' : 'text-ink-soft dark:text-slate-300'}`}>{m.label}</button>
          ))}
        </div>

        <div className="relative mx-auto" style={{ width: size, maxWidth: '100%', aspectRatio: '1' }}>
          <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img" aria-label={`زمان باقی‌مانده ${formatClock(remaining)}`}>
            <circle cx={size / 2} cy={size / 2} r={r} strokeWidth="10" className="fill-none stroke-slate-100 dark:stroke-white/10" />
            <circle cx={size / 2} cy={size / 2} r={r} strokeWidth="10" strokeLinecap="round" className={`fill-none ${state.mode === 'focus' ? 'stroke-primary' : 'stroke-secondary'}`} strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, Math.max(0, progress)))} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-bold tabular-nums" aria-live="off">{formatClock(remaining)}</span>
            <span className="mt-1 text-sm text-ink-soft dark:text-slate-400">{state.status === 'paused' ? 'متوقف شده' : state.status === 'running' ? 'در حال اجرا' : 'آماده'}</span>
          </div>
        </div>

        <div className="mt-5 flex justify-center gap-2">
          {state.status === 'idle' && <button className="btn-primary min-w-[140px]" onClick={p.start}><Play className="h-4 w-4" />شروع</button>}
          {state.status === 'running' && <button className="btn-primary min-w-[140px]" onClick={p.pause}><Pause className="h-4 w-4" />توقف</button>}
          {state.status === 'paused' && <button className="btn-primary min-w-[140px]" onClick={p.resume}><Play className="h-4 w-4" />ادامه</button>}
          {inProgress && <button className="btn-soft" onClick={() => (state.mode === 'focus' ? setConfirmReset(true) : p.reset())}><RotateCcw className="h-4 w-4" />بازنشانی</button>}
        </div>

        <div className="mt-5 flex items-center justify-center gap-2" aria-label={`${fa(cycle)} از ${fa(LONG_BREAK_EVERY)} جلسه‌ی تمرکز چرخه`} role="img">
          {Array.from({ length: LONG_BREAK_EVERY }, (_, i) => <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < cycle ? 'bg-primary' : 'bg-slate-200 dark:bg-white/15'}`} />)}
        </div>
      </div>

      <div className="card mt-4 p-5">
        <label className="label" htmlFor="pm-task">کار مرتبط (اختیاری)</label>
        <select id="pm-task" className="input" value={state.taskId ?? ''} onChange={(e) => p.setTask(e.target.value || null)}>
          <option value="">بدون کار مشخص</option>
          {pending.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          {state.taskId && !pending.some((t) => t.id === state.taskId) && <option value={state.taskId}>کار انتخاب‌شده</option>}
        </select>
        <div className="mt-4 grid grid-cols-2 gap-3 text-center">
          <div className="rounded-xl bg-primary-50 p-3 dark:bg-white/10"><p className="text-xl font-bold">{fa(todays.length)}</p><p className="text-xs text-ink-soft dark:text-slate-400">جلسه‌ی کامل امروز</p></div>
          <div className="rounded-xl bg-primary-50 p-3 dark:bg-white/10"><p className="text-xl font-bold">{formatMinutes(todayMinutes)}</p><p className="text-xs text-ink-soft dark:text-slate-400">تمرکز امروز</p></div>
        </div>
        <p className="mt-3 text-xs leading-6 text-ink-soft dark:text-slate-400">فقط جلسه‌های کامل ثبت می‌شوند؛ جلسه‌ی بازنشانی‌شده یا ناتمام شمرده نمی‌شود.</p>
      </div>

      <ConfirmDialog open={confirmReset} danger title="بازنشانی تایمر" message="جلسه‌ی تمرکز در حال اجرا ناتمام می‌ماند و ثبت نمی‌شود. ادامه می‌دهید؟" confirmLabel="بازنشانی" onConfirm={() => { p.reset(); setConfirmReset(false); }} onCancel={() => setConfirmReset(false)} />
    </div>
  );
}
