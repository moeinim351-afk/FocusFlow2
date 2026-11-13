import type { FocusSession, ISODate, Task } from '../../types/index.ts';
import { addDaysISO, diffDays, isoDateOfTimestamp, startOfWeekISO, weekDays } from '../../utils/date.ts';
import { buildWeeklyReport } from './report.ts';

export interface DayPoint {
  date: ISODate;
  minutes: number;
  isToday: boolean;
  isFuture: boolean;
}

export interface ProgressStats {
  weekStart: ISODate;
  weekEnd: ISODate;
  /** مطالعه‌ی هر روز هفته (از شنبه تا جمعه) */
  week: DayPoint[];
  weekMinutes: number;
  maxDayMinutes: number;
  /** مجموع تمام جلسه‌های تمرکز ثبت‌شده */
  totalFocusMinutes: number;
  completedTasks: number;
  completedThisWeek: number;
  /** میانگین مطالعه در ۷ روز اخیر (برای کاربر تازه‌وارد از اولین روز مطالعه) */
  dailyAverageMinutes: number;
  /** تعداد روزهای پیاپی فعال تا امروز */
  streak: number;
  weeklyTotal: number;
  weeklyDone: number;
  weeklyPercent: number;
  hasAnyFocus: boolean;
}

/** جلسه‌ی کمتر از یک دقیقه (مثلاً شروع و توقف اشتباهی) روز را «فعال» نمی‌کند. */
export const MIN_ACTIVE_SECONDS = 60;
export const AVERAGE_WINDOW_DAYS = 7;

function focusSecondsByDay(sessions: FocusSession[]): Map<ISODate, number> {
  const map = new Map<ISODate, number>();
  for (const s of sessions) {
    if (s.mode !== 'focus') continue;
    const d = isoDateOfTimestamp(s.startedAt);
    map.set(d, (map.get(d) ?? 0) + Math.max(0, s.actualSeconds));
  }
  return map;
}

/**
 * روز فعال: دست‌کم یک دقیقه تمرکز یا دست‌کم یک کار تکمیل‌شده.
 * شمارش از امروز به عقب است؛ اگر امروز هنوز چیزی ثبت نشده، از دیروز شروع می‌شود
 * تا استمرار قبل از اولین مطالعه‌ی امروز صفر نشان داده نشود.
 */
export function computeStreak(activeDays: Set<ISODate>, today: ISODate): number {
  let cursor = activeDays.has(today) ? today : addDaysISO(today, -1);
  let streak = 0;
  while (activeDays.has(cursor)) {
    streak++;
    cursor = addDaysISO(cursor, -1);
  }
  return streak;
}

export function buildProgressStats(tasks: Task[], sessions: FocusSession[], today: ISODate): ProgressStats {
  const secondsByDay = focusSecondsByDay(sessions);
  const liveTasks = tasks.filter((t) => !t.deleted);

  const weekStart = startOfWeekISO(today);
  const weekEnd = addDaysISO(weekStart, 6);
  const week: DayPoint[] = weekDays(weekStart).map((date) => ({
    date,
    minutes: Math.round((secondsByDay.get(date) ?? 0) / 60),
    isToday: date === today,
    isFuture: date > today,
  }));

  let totalSeconds = 0;
  for (const v of secondsByDay.values()) totalSeconds += v;

  // میانگین روزانه
  let dailyAverageMinutes = 0;
  if (secondsByDay.size > 0) {
    const firstDay = [...secondsByDay.keys()].sort()[0];
    const windowStart = addDaysISO(today, -(AVERAGE_WINDOW_DAYS - 1));
    const from = firstDay > windowStart ? firstDay : windowStart;
    const days = Math.max(1, diffDays(today, from) + 1);
    let windowSeconds = 0;
    for (const [d, sec] of secondsByDay) if (d >= from && d <= today) windowSeconds += sec;
    dailyAverageMinutes = Math.round(windowSeconds / 60 / days);
  }

  // استمرار
  const activeDays = new Set<ISODate>();
  for (const [d, sec] of secondsByDay) if (sec >= MIN_ACTIVE_SECONDS) activeDays.add(d);
  for (const t of liveTasks) if (t.completed && t.completedAt) activeDays.add(isoDateOfTimestamp(t.completedAt));

  const report = buildWeeklyReport(tasks, sessions, weekStart, today);

  return {
    weekStart,
    weekEnd,
    week,
    weekMinutes: week.reduce((s, d) => s + d.minutes, 0),
    maxDayMinutes: week.reduce((m, d) => Math.max(m, d.minutes), 0),
    totalFocusMinutes: Math.round(totalSeconds / 60),
    completedTasks: liveTasks.filter((t) => t.completed).length,
    completedThisWeek: report.completed,
    dailyAverageMinutes,
    streak: computeStreak(activeDays, today),
    weeklyTotal: report.total,
    weeklyDone: report.completed,
    weeklyPercent: report.completionRate,
    hasAnyFocus: totalSeconds > 0,
  };
}


/** نقشه‌ی حرارتی ۹۱ روز اخیر برای نمایش استمرار به سبک GitHub. */
export function buildActivityHeatmap(tasks: Task[], sessions: FocusSession[], today: ISODate, days = 91): { date: ISODate; minutes: number; active: boolean }[] {
  const byDay = new Map<ISODate, number>();
  for (const s of sessions) if (s.mode === 'focus') { const d = isoDateOfTimestamp(s.startedAt); byDay.set(d, (byDay.get(d) ?? 0) + Math.max(0, s.actualSeconds)); }
  for (const t of tasks) if (!t.deleted && t.completed && t.completedAt) { const d = isoDateOfTimestamp(t.completedAt); byDay.set(d, Math.max(MIN_ACTIVE_SECONDS, byDay.get(d) ?? 0)); }
  return Array.from({ length: days }, (_, i) => { const date = addDaysISO(today, -(days - 1 - i)); const seconds = byDay.get(date) ?? 0; return { date, minutes: Math.round(seconds / 60), active: seconds >= MIN_ACTIVE_SECONDS }; });
}

/** مجموع دقیقه‌های تمرکز به تفکیک درس با اتکا به taskId جلسه‌ها. */
export function focusMinutesBySubject(tasks: Task[], sessions: FocusSession[]): { subject: string; minutes: number }[] {
  const taskMap = new Map(tasks.map(t => [t.id, t.subject?.trim() || 'بدون درس']));
  const totals = new Map<string, number>();
  for (const s of sessions) if (s.mode === 'focus' && s.taskId) { const name = taskMap.get(s.taskId) ?? 'بدون درس'; totals.set(name, (totals.get(name) ?? 0) + Math.max(0, s.actualSeconds)); }
  return [...totals].map(([subject, seconds]) => ({ subject, minutes: Math.round(seconds / 60) })).sort((a,b) => b.minutes-a.minutes);
}
