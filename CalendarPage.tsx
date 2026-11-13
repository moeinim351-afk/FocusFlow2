import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { LoadBar, PageHeader } from '../components/ui.tsx';
import type { Task } from '../types/index.ts';
import { addDaysISO, startOfWeekISO, todayISO, weekDays } from '../utils/date.ts';
import { fa, formatDateShort, formatMinutes, formatWeekday } from '../utils/format.ts';
import { isOverdue, tasksOnDate } from '../features/tasks/taskLogic.ts';
import { useData } from '../features/tasks/DataContext.tsx';
import { TaskFormModal } from '../features/tasks/TaskFormModal.tsx';
import { MoveTaskModal } from '../features/tasks/MoveTaskModal.tsx';

export function CalendarPage() {
  const { tasks, settings, toggleTask } = useData();
  const today = todayISO();
  const [weekStart, setWeekStart] = useState(startOfWeekISO(today));
  const [formDate, setFormDate] = useState<string | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);
  const [moving, setMoving] = useState<Task | null>(null);
  const days = useMemo(() => weekDays(weekStart), [weekStart]);
  const shift = (dir: 1 | -1) => setWeekStart(addDaysISO(weekStart, dir * 7));

  return (
    <div>
      <PageHeader title="تقویم هفتگی" subtitle={`${formatDateShort(days[0])} تا ${formatDateShort(days[6])}`} actions={
        <div className="flex items-center gap-2">
          <button className="btn-soft !px-3" onClick={() => shift(-1)} aria-label="هفته‌ی قبل"><ChevronRight className="h-5 w-5" /></button>
          <button className="btn-soft" onClick={() => setWeekStart(startOfWeekISO(today))} disabled={weekStart === startOfWeekISO(today)}>این هفته</button>
          <button className="btn-soft !px-3" onClick={() => shift(1)} aria-label="هفته‌ی بعد"><ChevronLeft className="h-5 w-5" /></button>
        </div>
      } />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {days.map((d) => {
          const list = tasksOnDate(tasks, d);
          const minutes = list.filter((t) => !t.completed).reduce((s, t) => s + t.estimatedMinutes, 0);
          const isToday = d === today;
          return (
            <section key={d} className={`card min-w-0 p-3 ${isToday ? 'ring-2 ring-primary/40' : ''}`} aria-label={formatWeekday(d)}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <p className="font-bold">{formatWeekday(d)}{isToday && <span className="chip ms-2 bg-primary-50 text-primary-700 dark:bg-white/10 dark:text-slate-100">امروز</span>}</p>
                  <p className="text-xs text-ink-soft dark:text-slate-400">{formatDateShort(d)}</p>
                </div>
                <button className="btn-ghost !min-h-0 rounded-lg p-2" onClick={() => setFormDate(d)} aria-label={`افزودن کار به ${formatWeekday(d)}`}><Plus className="h-4 w-4" /></button>
              </div>
              <LoadBar used={minutes} capacity={settings.dailyAvailableMinutes} />
              <p className="mb-2 mt-1 text-xs text-ink-soft dark:text-slate-400">بار کاری: {formatMinutes(minutes)} از {formatMinutes(settings.dailyAvailableMinutes)}</p>
              {list.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-400">کاری نیست</p>
              ) : (
                <ul className="space-y-1.5">
                  {list.map((t) => {
                    const od = isOverdue(t);
                    return (
                      <li key={t.id} className={`flex items-center gap-2 rounded-xl border p-2 text-sm ${t.completed ? 'border-emerald-100 bg-emerald-50/60 dark:border-emerald-500/20 dark:bg-emerald-500/10' : od ? 'border-red-200 bg-red-50/60 dark:border-red-500/30 dark:bg-red-500/10' : 'border-slate-100 dark:border-white/10'}`}>
                        <input type="checkbox" className="h-5 w-5 shrink-0 accent-primary" checked={t.completed} onChange={() => toggleTask(t.id).catch(() => undefined)} aria-label={`انجام ${t.title}`} />
                        <button className={`min-w-0 flex-1 break-words text-start ${t.completed ? 'text-slate-400 line-through' : ''}`} onClick={() => setEditing(t)}>{t.title}</button>
                        {!t.completed && <button className="chip shrink-0 bg-slate-100 text-ink-soft hover:bg-primary-50 dark:bg-white/10 dark:text-slate-300" onClick={() => setMoving(t)}>جابه‌جایی</button>}
                        {t.carryOverCount > 0 && <span className="chip shrink-0 bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">{fa(t.carryOverCount)}×</span>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <TaskFormModal open={formDate !== null || editing !== null} task={editing} defaultDate={formDate ?? today} onClose={() => { setFormDate(null); setEditing(null); }} />
      <MoveTaskModal task={moving} onClose={() => setMoving(null)} />
    </div>
  );
}
