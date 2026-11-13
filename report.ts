import type { FocusSession, ISODate, Task } from '../../types/index.ts';
import { addDaysISO, isoDateOfTimestamp } from '../../utils/date.ts';

export interface WeeklyReport {
  weekStart: ISODate;
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  carried: number;
  completionRate: number; // 0..100
  focusMinutes: number;
  focusSessions: number;
}

export function buildWeeklyReport(tasks: Task[], sessions: FocusSession[], weekStart: ISODate, today: ISODate): WeeklyReport {
  const weekEnd = addDaysISO(weekStart, 6);
  const inWeek = tasks.filter((t) => !t.deleted && t.date >= weekStart && t.date <= weekEnd);
  const completed = inWeek.filter((t) => t.completed).length;
  const overdue = inWeek.filter((t) => !t.completed && t.date < today).length;
  const carried = inWeek.filter((t) => t.carryOverCount > 0).length;
  const weekSessions = sessions.filter((s) => {
    if (s.mode !== 'focus') return false;
    const d = isoDateOfTimestamp(s.startedAt);
    return d >= weekStart && d <= weekEnd;
  });
  const focusSeconds = weekSessions.reduce((sum, s) => sum + s.actualSeconds, 0);
  return {
    weekStart,
    total: inWeek.length,
    completed,
    pending: inWeek.length - completed,
    overdue,
    carried,
    completionRate: inWeek.length === 0 ? 0 : Math.round((completed / inWeek.length) * 100),
    focusMinutes: Math.round(focusSeconds / 60),
    focusSessions: weekSessions.length,
  };
}
