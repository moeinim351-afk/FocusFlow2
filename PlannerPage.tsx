import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarCheck, Sparkles } from 'lucide-react';
import { ConfirmDialog, EmptyState, LoadBar, PageHeader, PriorityBadge, ProgressRing } from '../components/ui.tsx';
import { useToast } from '../components/Toast.tsx';
import { rangeDays, startOfWeekISO, todayISO } from '../utils/date.ts';
import { fa, formatDateShort, formatMinutes, formatWeekday } from '../utils/format.ts';
import { buildWeeklyReport } from '../features/analytics/report.ts';
import { buildPlan, evaluateAssignments, findCandidates, scoreTask, type Assignment, type PlannerInput } from '../features/planner/planner.ts';
import { useData } from '../features/tasks/DataContext.tsx';

const SKIP = 'skip';

export function PlannerPage() {
  const { tasks, sessions, settings, applyPlan } = useData();
  const toast = useToast();
  const today = todayISO();
  const weekStart = startOfWeekISO(today);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => setOverrides({}), [tasks]);

  const report = useMemo(() => buildWeeklyReport(tasks, sessions, weekStart, today), [tasks, sessions, weekStart, today]);
  const input: PlannerInput = useMemo(() => ({ tasks, today, dailyCapacityMinutes: settings.dailyAvailableMinutes, horizonDays: 7 }), [tasks, today, settings.dailyAvailableMinutes]);
  const plan = useMemo(() => buildPlan(input), [input]);
  const candidates = useMemo(() => findCandidates(tasks, today).sort((a, b) => scoreTask(b, today) - scoreTask(a, today)), [tasks, today]);
  const dates = useMemo(() => rangeDays(today, 7), [today]);

  const planned = useMemo(() => new Map(plan.assignments.map((a) => [a.taskId, a.toDate])), [plan]);
  const choiceOf = (id: string) => overrides[id] ?? planned.get(id) ?? SKIP;

  const assignments: Assignment[] = candidates.flatMap((t) => {
    const to = choiceOf(t.id);
    if (to === SKIP) return [];
    return [{ taskId: t.id, title: t.title, fromDate: t.date, toDate: to, estimatedMinutes: t.estimatedMinutes, priority: t.priority, carryOverCount: t.carryOverCount, score: scoreTask(t, today) }];
  });
  const loads = evaluateAssignments(input, assignments);
  const overloadedDays = loads.filter((d) => d.overloaded && d.addedMinutes > 0);
  const skipped = candidates.length - assignments.length;
  const canApply = assignments.length > 0 && overloadedDays.length === 0;

  async function confirm() {
    setApplying(true);
    try {
      const n = await applyPlan(assignments, { weekStart, totalTasks: report.total, completedTasks: report.completed, rescheduledTasks: assignments.length, focusMinutes: report.focusMinutes });
      toast.show(`${fa(n)} کار جابه‌جا شد.`, 'success');
    } catch {
      /* پیام خطا نمایش داده شده؛ چیزی ذخیره نشده */
    } finally {
      setApplying(false);
      setConfirming(false);
    }
  }

  return (
    <div>
      <PageHeader title="برنامه‌ریز هوشمند هفتگی" subtitle="کارهای عقب‌افتاده را بررسی کنید و پیش از هر تغییر، پیش‌نمایش ببینید." />

      <section className="card mb-5 flex flex-wrap items-center gap-4 p-5" aria-label="گزارش هفته">
        <ProgressRing percent={report.completionRate} label={`${fa(report.completionRate)}٪`} />
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-3 text-center sm:grid-cols-4">
          {[
            ['کل کارهای هفته', fa(report.total)],
            ['انجام‌شده', fa(report.completed)],
            ['عقب‌افتاده', fa(report.overdue)],
            ['تمرکز ثبت‌شده', formatMinutes(report.focusMinutes)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-primary-50 p-3 dark:bg-white/10"><p className="font-bold">{v}</p><p className="text-xs text-ink-soft dark:text-slate-400">{k}</p></div>
          ))}
        </div>
      </section>

      {candidates.length === 0 ? (
        <div className="card"><EmptyState icon={<CalendarCheck className="h-6 w-6" />} title="کار عقب‌افتاده‌ای ندارید" hint="وقتی کارهای ناتمامِ گذشته داشته باشید، اینجا برای بازبرنامه‌ریزی نمایش داده می‌شوند." /></div>
      ) : (
        <>
          {(plan.warnings.length > 0 || overloadedDays.length > 0) && (
            <div className="mb-4 space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200" role="alert">
              {plan.warnings.map((w) => <p key={w} className="flex gap-2"><AlertTriangle className="mt-1 h-4 w-4 shrink-0" />{w}</p>)}
              {overloadedDays.length > 0 && <p className="flex gap-2"><AlertTriangle className="mt-1 h-4 w-4 shrink-0" />تنظیم دستی شما ظرفیت {fa(overloadedDays.length)} روز را پر می‌کند؛ برای اعمال برنامه، کارها را بین روزها پخش کنید.</p>}
            </div>
          )}

          <section className="mb-5" aria-label="پیش‌نمایش جابه‌جایی‌ها">
            <h2 className="mb-1 flex items-center gap-2 text-lg font-bold"><Sparkles className="h-5 w-5 text-primary" />پیش‌نمایش</h2>
            <p className="mb-3 text-sm text-ink-soft dark:text-slate-400">ترتیب بر اساس اولویت، قدمت مهلت و تعداد انتقال‌های قبلی است. روز هر کار را می‌توانید تغییر دهید. تا تایید شما چیزی تغییر نمی‌کند.</p>
            <ul className="space-y-2">
              {candidates.map((t) => {
                const choice = choiceOf(t.id);
                const unplaced = plan.unplaced.find((u) => u.taskId === t.id);
                return (
                  <li key={t.id} className="card p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="break-words font-medium">{t.title}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                          <PriorityBadge priority={t.priority} />
                          <span className="chip bg-slate-100 text-ink-soft dark:bg-white/10 dark:text-slate-300">{formatMinutes(t.estimatedMinutes)}</span>
                          <span className="chip bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300">از {formatDateShort(t.date)}</span>
                          {t.carryOverCount > 0 && <span className="chip bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">{fa(t.carryOverCount)} بار منتقل شده</span>}
                        </div>
                        {unplaced && choice === SKIP && <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-300">{unplaced.reason === 'too_long' ? 'از ظرفیت یک روز طولانی‌تر است.' : 'جای خالی کافی در هفته‌ی پیش رو نیست.'}</p>}
                      </div>
                      <select className="input !w-auto min-w-[150px] max-w-full" value={choice} onChange={(e) => setOverrides((o) => ({ ...o, [t.id]: e.target.value }))} aria-label={`روز جدید برای ${t.title}`}>
                        <option value={SKIP}>جابه‌جا نشود</option>
                        {dates.map((d) => <option key={d} value={d}>{formatWeekday(d)} {formatDateShort(d)}</option>)}
                      </select>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="card mb-5 p-4" aria-label="ظرفیت روزها">
            <h2 className="mb-1 font-bold">ظرفیت روزهای پیش رو</h2>
            <p className="mb-3 text-xs text-ink-soft dark:text-slate-400">ظرفیت روزانه: {formatMinutes(settings.dailyAvailableMinutes)} (از تنظیمات قابل تغییر است)</p>
            <ul className="space-y-3">
              {loads.map((d) => (
                <li key={d.date}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span>{formatWeekday(d.date)} {formatDateShort(d.date)}</span>
                    <span className={d.overloaded ? 'text-red-600 dark:text-red-400' : 'text-ink-soft dark:text-slate-400'}>{formatMinutes(d.existingMinutes + d.addedMinutes)}{d.addedMinutes > 0 ? ` (+${formatMinutes(d.addedMinutes)})` : ''}</span>
                  </div>
                  <LoadBar used={d.existingMinutes + d.addedMinutes} capacity={d.capacity} overloaded={d.overloaded} />
                </li>
              ))}
            </ul>
          </section>

          <div className="sticky bottom-20 z-20 lg:bottom-4">
            <div className="card flex flex-wrap items-center justify-between gap-3 p-3">
              <p className="text-sm">{fa(assignments.length)} کار جابه‌جا می‌شود{skipped > 0 ? `، ${fa(skipped)} کار دست‌نخورده می‌ماند` : ''}.</p>
              <button className="btn-primary" disabled={!canApply} onClick={() => setConfirming(true)}>بررسی و تایید برنامه</button>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirming}
        title="اعمال برنامه‌ی جدید"
        message={`${fa(assignments.length)} کار به روزهای انتخاب‌شده منتقل می‌شود. تاریخ اصلی هر کار حفظ می‌شود و شمارنده‌ی انتقال آن یک واحد زیاد می‌شود. هیچ کاری حذف نمی‌شود. ادامه می‌دهید؟`}
        confirmLabel={applying ? 'در حال اعمال…' : 'تایید و اعمال'}
        onConfirm={() => void confirm()}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
