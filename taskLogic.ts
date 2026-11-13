import type { ISODate, Priority, Task } from '../../types/index.ts';
import { isValidISO, isValidTime, nowHHmm, toISO } from '../../utils/date.ts';
import { parseNumberInput } from '../../utils/digits.ts';

export type TaskFilter = 'all' | 'pending' | 'completed' | 'overdue';

export interface TaskInput {
  title: string;
  description: string;
  date: string;
  time: string;
  priority: Priority;
  estimatedMinutes: number | string;
  subject?: string;
  isExam?: boolean;
}

export type TaskErrors = Partial<Record<keyof TaskInput, string>>;

export const MAX_TITLE = 120;
export const MAX_DESCRIPTION = 1000;
export const MIN_ESTIMATE = 5;
export const MAX_ESTIMATE = 600;

export function validateTaskInput(input: TaskInput): TaskErrors {
  const errors: TaskErrors = {};
  const title = input.title.trim();
  if (!title) errors.title = 'عنوان کار را وارد کنید.';
  else if (title.length > MAX_TITLE) errors.title = `عنوان باید حداکثر ${MAX_TITLE} نویسه باشد.`;
  if (input.description.length > MAX_DESCRIPTION)
    errors.description = `توضیحات باید حداکثر ${MAX_DESCRIPTION} نویسه باشد.`;
  if (!isValidISO(input.date)) errors.date = 'تاریخ معتبر انتخاب کنید.';
  if (input.time && !isValidTime(input.time)) errors.time = 'ساعت معتبر نیست.';
  if (!['low', 'medium', 'high'].includes(input.priority)) errors.priority = 'اولویت معتبر نیست.';
  const est = parseNumberInput(input.estimatedMinutes);
  if (!Number.isFinite(est) || !Number.isInteger(est)) errors.estimatedMinutes = 'مدت زمان را به صورت عدد صحیح (دقیقه) وارد کنید.';
  else if (est < MIN_ESTIMATE || est > MAX_ESTIMATE)
    errors.estimatedMinutes = `مدت زمان باید بین ${MIN_ESTIMATE} تا ${MAX_ESTIMATE} دقیقه باشد.`;
  return errors;
}

export function isOverdue(task: Task, now: Date = new Date()): boolean {
  if (task.completed || task.deleted) return false;
  const today: ISODate = toISO(now);
  if (task.date < today) return true;
  if (task.date === today && task.time) return task.time < nowHHmm(now);
  return false;
}

export function matchesQuery(task: Task, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return task.title.toLowerCase().includes(q) || task.description.toLowerCase().includes(q);
}

export function filterTasks(tasks: Task[], filter: TaskFilter, query: string, now: Date = new Date()): Task[] {
  return tasks.filter((t) => {
    if (t.deleted) return false;
    if (!matchesQuery(t, query)) return false;
    switch (filter) {
      case 'pending':
        return !t.completed;
      case 'completed':
        return t.completed;
      case 'overdue':
        return isOverdue(t, now);
      default:
        return true;
    }
  });
}

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    const at = a.time ?? '99:99';
    const bt = b.time ?? '99:99';
    if (at !== bt) return at < bt ? -1 : 1;
    return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  });
}

export function tasksOnDate(tasks: Task[], date: ISODate): Task[] {
  return sortTasks(tasks.filter((t) => !t.deleted && t.date === date));
}

export function dayProgress(tasks: Task[]): { total: number; done: number; remaining: number; percent: number } {
  const total = tasks.length;
  const done = tasks.filter((t) => t.completed).length;
  return { total, done, remaining: total - done, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

export function taskToInput(t: Task): TaskInput {
  return { title: t.title, description: t.description, subject: t.subject ?? '', isExam: !!t.isExam, date: t.date, time: t.time ?? '', priority: t.priority, estimatedMinutes: t.estimatedMinutes };
}
