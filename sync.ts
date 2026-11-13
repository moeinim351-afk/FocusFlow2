import type { AccentId, FocusSession, Settings, Task, WeeklyReview } from '../types/index.ts';
import { DEFAULT_ACCENT, isAccentId } from '../config/accents.ts';
import { supabase } from '../lib/supabase.ts';
import { putMany } from '../lib/idb.ts';
import { isNewerTimestamp } from '../utils/date.ts';
import { loadAllTasksRaw, loadReviews, loadSessions, loadSettings, saveSettings } from './repository.ts';

/**
 * همگام‌سازی دوطرفه با Supabase.
 * - شناسه‌ها در کلاینت UUID می‌شوند و با upsert ارسال می‌شوند، پس رکورد تکراری ساخته نمی‌شود.
 * - اول از سرور می‌خوانیم؛ اگر نسخه‌ی سرور جدیدتر از ویرایش محلی باشد، نسخه‌ی سرور حفظ می‌شود
 *   (بازنویسی بی‌صدا نداریم) و تعداد تعارض‌ها به کاربر نشان داده می‌شود.
 * - سپس فقط رکوردهای تغییرکرده‌ی محلی ارسال می‌شوند.
 */

export interface SyncResult {
  pushed: number;
  pulled: number;
  conflicts: number;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const hm = (t: string | null) => (t ? t.slice(0, 5) : null);

function taskFromRow(r: Row): Task {
  return {
    id: r.id,
    userId: r.user_id,
    title: r.title,
    description: r.description ?? '',
    subject: r.subject ?? '',
    isExam: !!r.is_exam,
    date: r.task_date,
    time: hm(r.task_time),
    priority: r.priority,
    estimatedMinutes: r.estimated_minutes,
    completed: r.completed,
    completedAt: r.completed_at,
    originalDate: r.original_date,
    carryOverCount: r.carry_over_count,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deleted: r.deleted_at !== null,
    dirty: false,
  };
}

function taskToRow(t: Task): Row {
  return {
    id: t.id,
    user_id: t.userId,
    title: t.title,
    description: t.description,
    subject: t.subject ?? '',
    is_exam: !!t.isExam,
    task_date: t.date,
    task_time: t.time,
    priority: t.priority,
    estimated_minutes: t.estimatedMinutes,
    completed: t.completed,
    completed_at: t.completedAt,
    original_date: t.originalDate,
    carry_over_count: t.carryOverCount,
    deleted_at: t.deleted ? t.updatedAt : null,
    created_at: t.createdAt,
  };
}

const sessionToRow = (s: FocusSession): Row => ({
  id: s.id,
  user_id: s.userId,
  task_id: s.taskId,
  mode: s.mode,
  planned_seconds: s.plannedSeconds,
  actual_seconds: s.actualSeconds,
  started_at: s.startedAt,
  ended_at: s.endedAt,
  created_at: s.createdAt,
});

const sessionFromRow = (r: Row): FocusSession => ({
  id: r.id,
  userId: r.user_id,
  taskId: r.task_id,
  mode: r.mode,
  plannedSeconds: r.planned_seconds,
  actualSeconds: r.actual_seconds,
  startedAt: r.started_at,
  endedAt: r.ended_at,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  dirty: false,
});

const reviewToRow = (v: WeeklyReview): Row => ({
  user_id: v.userId,
  week_start: v.weekStart,
  total_tasks: v.totalTasks,
  completed_tasks: v.completedTasks,
  rescheduled_tasks: v.rescheduledTasks,
  focus_minutes: v.focusMinutes,
});

const reviewFromRow = (r: Row): WeeklyReview => ({
  id: r.id,
  userId: r.user_id,
  weekStart: r.week_start,
  totalTasks: r.total_tasks,
  completedTasks: r.completed_tasks,
  rescheduledTasks: r.rescheduled_tasks,
  focusMinutes: r.focus_minutes,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  dirty: false,
});

const settingsToRow = (userId: string, s: Settings, withAccent = true): Row => ({
  id: userId,
  display_name: s.displayName,
  theme: s.theme,
  ...(withAccent ? { accent: s.accent } : {}),
  focus_minutes: s.focusMinutes,
  short_break_minutes: s.shortBreakMinutes,
  long_break_minutes: s.longBreakMinutes,
  daily_available_minutes: s.dailyAvailableMinutes,
  reminders_enabled: s.remindersEnabled,
  reminder_lead_minutes: s.reminderLeadMinutes,
});

// اگر ستون accent هنوز روی سرور ساخته نشده باشد (migration 0002)، تم محلی حفظ می‌شود.
const settingsFromRow = (r: Row, localAccent: AccentId = DEFAULT_ACCENT): Settings => ({
  displayName: r.display_name ?? '',
  theme: r.theme,
  accent: isAccentId(r.accent) ? r.accent : localAccent,
  focusMinutes: r.focus_minutes,
  shortBreakMinutes: r.short_break_minutes,
  longBreakMinutes: r.long_break_minutes,
  dailyAvailableMinutes: r.daily_available_minutes,
  remindersEnabled: r.reminders_enabled,
  reminderLeadMinutes: r.reminder_lead_minutes,
  soundEnabled: true,
  autoStartNext: false,
  updatedAt: r.updated_at,
});

export async function syncAll(userId: string): Promise<SyncResult> {
  if (!supabase) return { pushed: 0, pulled: 0, conflicts: 0 };
  const result: SyncResult = { pushed: 0, pulled: 0, conflicts: 0 };

  // ---------- 1) دریافت از سرور ----------
  const [tasksRes, sessionsRes, reviewsRes, profileRes] = await Promise.all([
    supabase.from('tasks').select('*').eq('user_id', userId),
    supabase.from('focus_sessions').select('*').eq('user_id', userId),
    supabase.from('weekly_reviews').select('*').eq('user_id', userId),
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
  ]);
  for (const r of [tasksRes, sessionsRes, reviewsRes, profileRes]) if (r.error) throw new Error(r.error.message);

  const localTasks = new Map((await loadAllTasksRaw(userId)).map((t) => [t.id, t]));
  const tasksToStore: Task[] = [];
  for (const row of (tasksRes.data ?? []) as Row[]) {
    const server = taskFromRow(row);
    const local = localTasks.get(server.id);
    if (!local) {
      tasksToStore.push(server);
      result.pulled++;
    } else if (!local.dirty) {
      if (isNewerTimestamp(server.updatedAt, local.updatedAt)) {
        tasksToStore.push(server);
        result.pulled++;
      }
    } else if (isNewerTimestamp(server.updatedAt, local.updatedAt)) {
      // تعارض: سرور جدیدتر است؛ نسخه‌ی سرور را نگه می‌داریم و گزارش می‌دهیم
      tasksToStore.push(server);
      result.conflicts++;
    }
  }
  await putMany('tasks', tasksToStore);

  const localSessions = new Map((await loadSessions(userId)).map((s) => [s.id, s]));
  const newSessions = ((sessionsRes.data ?? []) as Row[]).map(sessionFromRow).filter((s) => !localSessions.has(s.id));
  await putMany('sessions', newSessions);
  result.pulled += newSessions.length;

  const localReviews = await loadReviews(userId);
  const reviewsToStore: WeeklyReview[] = [];
  for (const row of (reviewsRes.data ?? []) as Row[]) {
    const server = reviewFromRow(row);
    const local = localReviews.find((r) => r.weekStart === server.weekStart);
    if (!local || (!local.dirty && isNewerTimestamp(server.updatedAt, local.updatedAt))) reviewsToStore.push(server);
  }
  await putMany('reviews', reviewsToStore);

  const localSettings = await loadSettings(userId);
  if (profileRes.data) {
    const server = { ...settingsFromRow(profileRes.data as Row, localSettings.settings.accent), soundEnabled: localSettings.settings.soundEnabled, autoStartNext: localSettings.settings.autoStartNext };
    if (!localSettings.dirty || isNewerTimestamp(server.updatedAt, localSettings.settings.updatedAt)) {
      if (localSettings.dirty) result.conflicts++;
      await saveSettings(userId, server, false);
    }
  }

  // ---------- 2) ارسال تغییرات محلی ----------
  const dirtyTasks = (await loadAllTasksRaw(userId)).filter((t) => t.dirty);
  if (dirtyTasks.length > 0) {
    const { data, error } = await supabase.from('tasks').upsert(dirtyTasks.map(taskToRow), { onConflict: 'id' }).select();
    if (error) throw new Error(error.message);
    const serverById = new Map(((data ?? []) as Row[]).map((r) => [r.id as string, taskFromRow(r)]));
    // اگر کاربر هنگام ارسال همان کار را ویرایش کرده، نسخه‌ی سرور نباید ویرایش تازه را بنویسد؛
    // آن را dirty نگه می‌داریم (با زمان جدیدتر از پاسخ سرور) تا در همگام‌سازی بعدی ارسال شود.
    const latest = new Map((await loadAllTasksRaw(userId)).map((t) => [t.id, t]));
    const afterPush: Task[] = dirtyTasks.map((t) => {
      const cur = latest.get(t.id);
      if (cur && cur.updatedAt !== t.updatedAt) return { ...cur, dirty: true, updatedAt: new Date().toISOString() };
      return serverById.get(t.id) ?? { ...t, dirty: false };
    });
    await putMany('tasks', afterPush);
    result.pushed += dirtyTasks.length;
  }

  const dirtySessions = (await loadSessions(userId)).filter((s) => s.dirty);
  if (dirtySessions.length > 0) {
    const { error } = await supabase.from('focus_sessions').upsert(dirtySessions.map(sessionToRow), { onConflict: 'id', ignoreDuplicates: true });
    if (error) throw new Error(error.message);
    await putMany('sessions', dirtySessions.map((s) => ({ ...s, dirty: false })));
    result.pushed += dirtySessions.length;
  }

  const dirtyReviews = (await loadReviews(userId)).filter((r) => r.dirty);
  for (const review of dirtyReviews) {
    const { data, error } = await supabase.from('weekly_reviews').upsert(reviewToRow(review), { onConflict: 'user_id,week_start' }).select().single();
    if (error) throw new Error(error.message);
    const curReview = (await loadReviews(userId)).find((r) => r.id === review.id);
    if (curReview && curReview.updatedAt !== review.updatedAt) {
      result.pushed++; // در حین ارسال دوباره تغییر کرده؛ dirty می‌ماند و بعداً ارسال می‌شود
      continue;
    }
    await putMany('reviews', [{ ...reviewFromRow(data as Row), id: review.id }]);
    result.pushed++;
  }

  const current = await loadSettings(userId);
  if (current.dirty) {
    let { error } = await supabase.from('profiles').upsert(settingsToRow(userId, current.settings), { onConflict: 'id' });
    // سرور هنوز migration 0002 را ندارد: بقیه‌ی تنظیمات بدون تم ارسال شود تا همگام‌سازی نشکند.
    if (error && /accent/i.test(error.message)) {
      ({ error } = await supabase.from('profiles').upsert(settingsToRow(userId, current.settings, false), { onConflict: 'id' }));
    }
    if (error) throw new Error(error.message);
    // اگر هنگام ارسال تنظیمات دوباره تغییر کرده، dirty بماند تا ویرایش تازه گم نشود
    const after = await loadSettings(userId);
    if (after.settings.updatedAt === current.settings.updatedAt) await saveSettings(userId, current.settings, false);
    result.pushed++;
  }

  return result;
}
