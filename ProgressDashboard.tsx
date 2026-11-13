import { useMemo, type ReactNode } from 'react';
import { BarChart3, CheckCircle2, Clock, Flame } from 'lucide-react';
import { ProgressRing } from '../../components/ui.tsx';
import { todayISO } from '../../utils/date.ts';
import { fa, formatDateShort, formatMinutes, formatWeekday, formatWeekdayShort } from '../../utils/format.ts';
import { useData } from '../tasks/DataContext.tsx';
import { buildProgressStats, buildActivityHeatmap, focusMinutesBySubject } from './stats.ts';

function StatCard({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary dark:bg-white/10">{icon}</div>
      <p className="text-lg font-bold leading-7 tabular-nums">{value}</p>
      <p className="text-sm text-ink-soft dark:text-slate-300">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-soft dark:text-slate-400">{hint}</p>}
    </div>
  );
}

export function ProgressDashboard() {
  const { tasks, sessions } = useData();
  const today = todayISO();
  const stats = useMemo(() => buildProgressStats(tasks, sessions, today), [tasks, sessions, today]);
  const heat = useMemo(() => buildActivityHeatmap(tasks, sessions, today), [tasks, sessions, today]);
  const subjects = useMemo(() => focusMinutesBySubject(tasks, sessions), [tasks, sessions]);

  const chartLabel = `زمان مطالعه‌ی این هفته: ${stats.week
    .filter((d) => !d.isFuture)
    .map((d) => `${formatWeekday(d.date)} ${formatMinutes(d.minutes)}`)
    .join('، ')}`;

  return (
    <section className="space-y-4" aria-label="داشبورد پیشرفت">
      <h2 className="text-lg font-bold">داشبورد پیشرفت</h2>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-5 md:col-span-2">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h3 className="font-medium">زمان مطالعه‌ی این هفته</h3>
            <p className="text-xs text-ink-soft dark:text-slate-400">
              {formatDateShort(stats.weekStart)} تا {formatDateShort(stats.weekEnd)} · جمع {formatMinutes(stats.weekMinutes)}
            </p>
          </div>

          <div className="flex items-end gap-2 sm:gap-3" role="img" aria-label={chartLabel}>
            {stats.week.map((d) => {
              const pct = stats.maxDayMinutes > 0 ? (d.minutes / stats.maxDayMinutes) * 100 : 0;
              const height = d.minutes > 0 ? `${Math.max(8, pct)}%` : '3px';
              const color = d.minutes === 0 ? 'bg-slate-200 dark:bg-white/10' : d.isToday ? 'bg-primary' : 'bg-primary/45';
              return (
                <div key={d.date} className="flex min-w-0 flex-1 flex-col items-center gap-1.5" title={`${formatWeekday(d.date)}: ${formatMinutes(d.minutes)}`}>
                  <div className="flex h-32 w-full items-end justify-center">
                    <div className={`w-full max-w-[40px] rounded-t-lg transition-[height] duration-500 ${color}`} style={{ height }} />
                  </div>
                  <span className={`text-xs ${d.isToday ? 'font-bold text-primary' : 'text-ink-soft dark:text-slate-400'}`}>{formatWeekdayShort(d.date)}</span>
                  <span className="h-4 text-[11px] tabular-nums text-ink-soft dark:text-slate-400">{d.isFuture ? '' : d.minutes > 0 ? fa(d.minutes) : '–'}</span>
                </div>
              );
            })}
          </div>

          <p className="mt-3 text-xs text-ink-soft dark:text-slate-400">
            اعداد زیر هر ستون بر حسب دقیقه است.
            {!stats.hasAnyFocus && ' با اولین جلسه‌ی تمرکز در بخش «تمرکز»، نمودار پر می‌شود.'}
          </p>
        </div>

        <div className="card flex flex-col items-center justify-center gap-3 p-5 text-center">
          <h3 className="font-medium">پیشرفت هفتگی</h3>
          <ProgressRing percent={stats.weeklyPercent} label={`${fa(stats.weeklyPercent)}٪`} />
          <p className="text-xs text-ink-soft dark:text-slate-400">
            {stats.weeklyTotal === 0 ? 'برای این هفته کاری ثبت نشده است.' : `${fa(stats.weeklyDone)} از ${fa(stats.weeklyTotal)} کار این هفته انجام شده است.`}
          </p>
        </div>
      </div>

      <div className="card space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">نقشه‌ی استمرار ۹۱ روز اخیر</h3><span className="text-xs text-ink-soft dark:text-slate-400">هر مربع یک روز فعال</span></div>
        <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto pb-1" aria-label="نقشه‌ی حرارتی فعالیت">{heat.map(d=><span key={d.date} title={`${d.date} · ${fa(d.minutes)} دقیقه`} className={`h-3.5 w-3.5 rounded-[3px] ${d.minutes>=120?'bg-emerald-700':d.minutes>=60?'bg-emerald-600':d.active?'bg-emerald-400':'bg-slate-200 dark:bg-white/10'}`} />)}</div>
      </div>
      <div className="card space-y-3 p-5"><h3 className="font-bold">زمان تمرکز به تفکیک درس</h3>{subjects.length===0?<p className="text-sm text-ink-soft dark:text-slate-400">جلسه‌ی تمرکزی که به یک کارِ دارای درس وصل باشد، اینجا نمایش داده می‌شود.</p>:subjects.map((s)=><div key={s.subject}><div className="mb-1 flex justify-between text-sm"><span>{s.subject}</span><span>{formatMinutes(s.minutes)}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"><div className="h-full rounded-full bg-primary" style={{width:`${Math.max(3,s.minutes/Math.max(...subjects.map(x=>x.minutes))*100)}%`,backgroundColor:`hsl(${[...s.subject].reduce((a,c)=>a+c.charCodeAt(0),0)%360} 65% 48%)`}} /></div></div>)}</div>
      <div className="card flex flex-wrap items-center justify-between gap-3 p-5"><div><h3 className="font-bold">کارت هفتگی قابل اشتراک</h3><p className="text-sm text-ink-soft dark:text-slate-400">درصد انجام {fa(stats.weeklyPercent)}٪ · تمرکز {formatMinutes(stats.weekMinutes)} · استمرار {fa(stats.streak)} روز</p></div><button className="btn-primary" onClick={()=>{const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;const c=canvas.getContext('2d');if(!c)return;c.fillStyle='#111827';c.fillRect(0,0,1080,1350);c.fillStyle='#a5b4fc';c.font='bold 64px sans-serif';c.fillText('گزارش هفتگی من',90,180);c.fillStyle='#fff';c.font='bold 120px sans-serif';c.fillText(`${stats.weeklyPercent}%`,90,430);c.font='42px sans-serif';c.fillText('درصد انجام کارها',90,510);c.fillText(`تمرکز: ${stats.weekMinutes} دقیقه`,90,680);c.fillText(`استمرار: ${stats.streak} روز`,90,790);c.font='30px sans-serif';c.fillStyle='#cbd5e1';c.fillText('Focusly',90,1190);const a=document.createElement('a');a.download='weekly-progress.png';a.href=canvas.toDataURL('image/png');a.click();}}>دانلود تصویر استوری</button></div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={<Clock className="h-5 w-5" />} label="مجموع زمان تمرکز" value={formatMinutes(stats.totalFocusMinutes)} hint={`این هفته ${formatMinutes(stats.weekMinutes)}`} />
        <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="تکالیف تکمیل‌شده" value={fa(stats.completedTasks)} hint={`این هفته ${fa(stats.completedThisWeek)}`} />
        <StatCard icon={<BarChart3 className="h-5 w-5" />} label="میانگین مطالعه‌ی روزانه" value={formatMinutes(stats.dailyAverageMinutes)} hint="۷ روز اخیر" />
        <StatCard icon={<Flame className="h-5 w-5" />} label="روزهای استمرار" value={`${fa(stats.streak)} روز`} hint={stats.streak === 0 ? 'با یک جلسه‌ی تمرکز یا تکمیل یک کار شروع کنید.' : 'روز پیاپیِ فعال'} />
      </div>
    </section>
  );
}
