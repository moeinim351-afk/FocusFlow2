import type { FocusSession, Task } from '../src/types/index.ts';

let n = 0;
export function makeTask(p: Partial<Task> & { date: string }): Task {
  n += 1;
  return {
    id: p.id ?? `t${n}`,
    userId: 'u1',
    title: p.title ?? `کار ${n}`,
    description: '',
    time: null,
    priority: 'medium',
    estimatedMinutes: 60,
    completed: false,
    completedAt: null,
    originalDate: p.date,
    carryOverCount: 0,
    createdAt: `2026-11-0${(n % 9) + 1}T08:00:00.000Z`,
    updatedAt: '2026-11-01T08:00:00.000Z',
    deleted: false,
    dirty: false,
    ...p,
  };
}

let sn = 0;
/** minutes دقیقه تمرکز که از ساعت hour:00 روزِ date (به وقت محلی) شروع شده است. */
export function makeSession(p: { date: string; minutes: number; hour?: number; mode?: FocusSession['mode'] }): FocusSession {
  sn += 1;
  const [y, m, d] = p.date.split('-').map(Number);
  const start = new Date(y, m - 1, d, p.hour ?? 10, 0, 0);
  const seconds = Math.round(p.minutes * 60);
  return {
    id: `s${sn}`,
    userId: 'u1',
    taskId: null,
    mode: p.mode ?? 'focus',
    plannedSeconds: seconds,
    actualSeconds: seconds,
    startedAt: start.toISOString(),
    endedAt: new Date(start.getTime() + seconds * 1000).toISOString(),
    createdAt: start.toISOString(),
    updatedAt: start.toISOString(),
    dirty: false,
  };
}
