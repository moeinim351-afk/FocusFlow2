import { DEFAULT_SETTINGS, type FocusSession, type Settings, type Task, type WeeklyReview } from '../types/index.ts';
import { getAll, getOne, putMany, putOne, deleteOne } from '../lib/idb.ts';
import { newId } from '../lib/id.ts';
import type { TaskInput } from '../features/tasks/taskLogic.ts';
import { parseNumberInput } from '../utils/digits.ts';

/** لایه‌ی دسترسی به داده‌ی محلی (IndexedDB). همه‌ی خواندن‌ها بر اساس userId جدا می‌شوند. */

export async function loadTasks(userId: string): Promise<Task[]> {
  return (await getAll<Task>('tasks')).filter((t) => t.userId === userId && !t.deleted);
}

/** شامل رکوردهای حذف‌شده؛ برای همگام‌سازی */
export async function loadAllTasksRaw(userId: string): Promise<Task[]> {
  return (await getAll<Task>('tasks')).filter((t) => t.userId === userId);
}

export async function loadSessions(userId: string): Promise<FocusSession[]> {
  return (await getAll<FocusSession>('sessions')).filter((s) => s.userId === userId);
}

export async function loadReviews(userId: string): Promise<WeeklyReview[]> {
  return (await getAll<WeeklyReview>('reviews')).filter((r) => r.userId === userId);
}

export function buildTask(userId: string, input: TaskInput): Task {
  const now = new Date().toISOString();
  return {
    id: newId(),
    userId,
    title: input.title.trim(),
    description: input.description.trim(),
    subject: input.subject?.trim() || '',
    isExam: !!input.isExam,
    date: input.date,
    time: input.time || null,
    priority: input.priority,
    estimatedMinutes: parseNumberInput(input.estimatedMinutes),
    completed: false,
    completedAt: null,
    originalDate: input.date,
    carryOverCount: 0,
    createdAt: now,
    updatedAt: now,
    deleted: false,
    dirty: true,
  };
}

export function patchTask(task: Task, input: TaskInput): Task {
  const changedDate = input.date !== task.date;
  return {
    ...task,
    title: input.title.trim(),
    description: input.description.trim(),
    subject: input.subject?.trim() || '',
    isExam: !!input.isExam,
    date: input.date,
    time: input.time || null,
    priority: input.priority,
    estimatedMinutes: parseNumberInput(input.estimatedMinutes),
    // تغییر دستی تاریخ توسط کاربر هم یک جابه‌جایی است؛ تاریخ اصلی ثابت می‌ماند
    carryOverCount: changedDate && input.date > task.date ? task.carryOverCount + 1 : task.carryOverCount,
    updatedAt: new Date().toISOString(),
    dirty: true,
  };
}

export function toggleTask(task: Task): Task {
  const now = new Date().toISOString();
  const completed = !task.completed;
  return { ...task, completed, completedAt: completed ? now : null, updatedAt: now, dirty: true };
}

export function markDeleted(task: Task): Task {
  return { ...task, deleted: true, updatedAt: new Date().toISOString(), dirty: true };
}

export async function saveTasks(tasks: Task[]): Promise<void> {
  await putMany('tasks', tasks);
}

export async function saveSession(session: FocusSession): Promise<void> {
  await putOne('sessions', session);
}

export async function saveReview(review: WeeklyReview): Promise<void> {
  await putOne('reviews', review);
}

interface StoredSettings {
  key: string;
  settings: Settings;
  dirty: boolean;
}

export async function loadSettings(userId: string): Promise<{ settings: Settings; dirty: boolean }> {
  const rec = await getOne<StoredSettings>('meta', `settings:${userId}`);
  return rec ? { settings: { ...DEFAULT_SETTINGS, ...rec.settings }, dirty: rec.dirty } : { settings: DEFAULT_SETTINGS, dirty: false };
}

export async function saveSettings(userId: string, settings: Settings, dirty: boolean): Promise<void> {
  await putOne<StoredSettings>('meta', { key: `settings:${userId}`, settings, dirty });
}

/** پاک‌سازی داده‌های محلی یک حساب پس از حذف موفق حساب سرور. */
export async function deleteUserLocalData(userId: string): Promise<void> {
  const [tasks, sessions, reviews] = await Promise.all([getAll<Task>('tasks'), getAll<FocusSession>('sessions'), getAll<WeeklyReview>('reviews')]);
  await Promise.all([
    ...tasks.filter(x => x.userId === userId).map(x => deleteOne('tasks', x.id)),
    ...sessions.filter(x => x.userId === userId).map(x => deleteOne('sessions', x.id)),
    ...reviews.filter(x => x.userId === userId).map(x => deleteOne('reviews', x.id)),
    deleteOne('meta', `settings:${userId}`),
  ]);
}
