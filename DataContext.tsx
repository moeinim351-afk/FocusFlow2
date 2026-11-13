import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_SETTINGS, type AppUser, type FocusSession, type Settings, type Task, type WeeklyReview } from '../../types/index.ts';
import * as repo from '../../services/repository.ts';
import { syncAll } from '../../services/sync.ts';
import { newId } from '../../lib/id.ts';
import { putMany } from '../../lib/idb.ts';
import { useOnline } from '../../hooks/useOnline.ts';
import { applyAssignments, type Assignment } from '../planner/planner.ts';
import type { CompletedSession } from '../pomodoro/timer.ts';
import type { TaskInput } from './taskLogic.ts';
import { useToast } from '../../components/Toast.tsx';

export type SyncState = 'off' | 'idle' | 'syncing' | 'error';

interface DataApi {
  user: AppUser;
  tasks: Task[];
  sessions: FocusSession[];
  reviews: WeeklyReview[];
  settings: Settings;
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  reload: () => void;
  addTask: (input: TaskInput) => Promise<void>;
  editTask: (id: string, input: TaskInput) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  applyPlan: (assignments: Assignment[], review: Omit<WeeklyReview, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'dirty'>) => Promise<number>;
  addSession: (c: CompletedSession) => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  importBackup: (data: { tasks: Task[]; sessions: FocusSession[]; reviews?: WeeklyReview[]; settings?: Settings }) => Promise<void>;
  sync: { state: SyncState; lastSyncAt: string | null; error: string | null; conflicts: number };
  syncNow: () => Promise<void>;
}

const Ctx = createContext<DataApi | null>(null);

export function DataProvider({ user, children }: { user: AppUser; children: ReactNode }) {
  const toast = useToast();
  const online = useOnline();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [reviews, setReviews] = useState<WeeklyReview[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<SyncState>(user.isDemo ? 'off' : 'idle');
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState(0);

  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const reviewsRef = useRef(reviews);
  reviewsRef.current = reviews;
  const syncing = useRef(false);
  const timer = useRef<number | undefined>(undefined);

  const loadLocal = useCallback(async () => {
    const [t, s, r, st] = await Promise.all([repo.loadTasks(user.id), repo.loadSessions(user.id), repo.loadReviews(user.id), repo.loadSettings(user.id)]);
    setTasks(t);
    setSessions(s);
    setReviews(r);
    setSettings(st.settings);
  }, [user.id]);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      await loadLocal();
      setStatus('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خواندن داده‌های محلی ناموفق بود.');
      setStatus('error');
    }
  }, [loadLocal]);

  useEffect(() => {
    void load();
  }, [load]);

  const syncNow = useCallback(async () => {
    if (user.isDemo || syncing.current) return;
    if (!navigator.onLine) {
      setSyncState('error');
      setSyncError('آفلاین هستید. تغییرات پس از اتصال همگام می‌شوند.');
      return;
    }
    syncing.current = true;
    setSyncState('syncing');
    try {
      const r = await syncAll(user.id);
      await loadLocal();
      setConflicts((c) => c + r.conflicts);
      if (r.conflicts > 0) toast.show(`${r.conflicts} مورد تغییر هم‌زمان پیدا شد؛ نسخه‌ی جدیدتر سرور حفظ شد.`, 'info');
      setLastSyncAt(new Date().toISOString());
      setSyncError(null);
      setSyncState('idle');
    } catch (e) {
      setSyncState('error');
      setSyncError(e instanceof Error ? e.message : 'همگام‌سازی ناموفق بود.');
    } finally {
      syncing.current = false;
    }
  }, [user.id, user.isDemo, loadLocal, toast]);

  const scheduleSync = useCallback(() => {
    if (user.isDemo) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void syncNow(), 1500);
  }, [user.isDemo, syncNow]);

  useEffect(() => {
    if (status === 'ready' && online && !user.isDemo) void syncNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, online, user.isDemo]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const guard = useCallback(async (fn: () => Promise<void>, failure: string) => {
    try {
      await fn();
      scheduleSync();
    } catch {
      toast.show(failure, 'error');
      throw new Error(failure);
    }
  }, [scheduleSync, toast]);

  const addTask = useCallback((input: TaskInput) => guard(async () => {
    const t = repo.buildTask(user.id, input);
    await repo.saveTasks([t]);
    setTasks((l) => [...l, t]);
  }, 'ذخیره‌ی کار ناموفق بود.'), [guard, user.id]);

  const editTask = useCallback((id: string, input: TaskInput) => guard(async () => {
    const cur = tasksRef.current.find((t) => t.id === id);
    if (!cur) throw new Error('not found');
    const next = repo.patchTask(cur, input);
    await repo.saveTasks([next]);
    setTasks((l) => l.map((t) => (t.id === id ? next : t)));
  }, 'ویرایش کار ناموفق بود.'), [guard]);

  const toggleTask = useCallback((id: string) => guard(async () => {
    const cur = tasksRef.current.find((t) => t.id === id);
    if (!cur) return;
    const next = repo.toggleTask(cur);
    await repo.saveTasks([next]);
    setTasks((l) => l.map((t) => (t.id === id ? next : t)));
  }, 'تغییر وضعیت کار ناموفق بود.'), [guard]);

  const removeTask = useCallback((id: string) => guard(async () => {
    const cur = tasksRef.current.find((t) => t.id === id);
    if (!cur) return;
    await repo.saveTasks([repo.markDeleted(cur)]);
    setTasks((l) => l.filter((t) => t.id !== id));
  }, 'حذف کار ناموفق بود.'), [guard]);

  const applyPlan = useCallback(async (assignments: Assignment[], review: Omit<WeeklyReview, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'dirty'>) => {
    const now = new Date().toISOString();
    const before = tasksRef.current;
    const after = applyAssignments(before, assignments, now);
    const changed = after.filter((t, i) => t !== before[i]);
    const existing = reviewsRef.current.find((r) => r.weekStart === review.weekStart);
    const rec: WeeklyReview = { ...review, id: existing?.id ?? newId(), userId: user.id, createdAt: existing?.createdAt ?? now, updatedAt: now, dirty: true };
    try {
      await repo.saveTasks(changed);
      await repo.saveReview(rec);
    } catch {
      toast.show('اعمال برنامه ناموفق بود. هیچ تغییری ذخیره نشد.', 'error');
      throw new Error('apply failed');
    }
    setTasks(after);
    setReviews((l) => [...l.filter((r) => r.weekStart !== rec.weekStart), rec]);
    scheduleSync();
    return changed.length;
  }, [user.id, scheduleSync, toast]);

  const addSession = useCallback(async (c: CompletedSession) => {
    const now = new Date().toISOString();
    const s: FocusSession = {
      id: newId(), userId: user.id, taskId: c.taskId, mode: c.mode, plannedSeconds: c.plannedSeconds,
      actualSeconds: c.plannedSeconds, startedAt: c.startedAt, endedAt: c.endedAt, createdAt: now, updatedAt: now, dirty: true,
    };
    try {
      await repo.saveSession(s);
      setSessions((l) => [...l, s]);
      scheduleSync();
    } catch {
      toast.show('ذخیره‌ی جلسه‌ی تمرکز ناموفق بود.', 'error');
    }
  }, [user.id, scheduleSync, toast]);

  const updateSettings = useCallback(async (patch: Partial<Settings>) => {
    const next: Settings = { ...settingsRef.current, ...patch, updatedAt: new Date().toISOString() };
    try {
      await repo.saveSettings(user.id, next, !user.isDemo);
      setSettings(next);
      scheduleSync();
    } catch {
      toast.show('ذخیره‌ی تنظیمات ناموفق بود.', 'error');
      throw new Error('settings failed');
    }
  }, [user.id, user.isDemo, scheduleSync, toast]);

  const importBackup = useCallback(async (data: { tasks: Task[]; sessions: FocusSession[]; reviews?: WeeklyReview[]; settings?: Settings }) => {
    const now = new Date().toISOString();
    const importedTasks = data.tasks.map(t => ({ ...t, userId: user.id, subject: t.subject ?? '', isExam: !!t.isExam, dirty: !user.isDemo, deleted: !!t.deleted }));
    const importedSessions = data.sessions.map(s => ({ ...s, userId: user.id, dirty: !user.isDemo }));
    const importedReviews = (data.reviews ?? []).map(r => ({ ...r, userId: user.id, dirty: !user.isDemo }));
    await putMany('tasks', importedTasks);
    await putMany('sessions', importedSessions);
    await putMany('reviews', importedReviews);
    if (data.settings) await repo.saveSettings(user.id, { ...DEFAULT_SETTINGS, ...data.settings, updatedAt: now }, !user.isDemo);
    await loadLocal();
    scheduleSync();
  }, [user.id, user.isDemo, loadLocal, scheduleSync]);

  const value = useMemo<DataApi>(() => ({
    user, tasks, sessions, reviews, settings, status, error, reload: () => void load(),
    addTask, editTask, removeTask, toggleTask, applyPlan, addSession, updateSettings, importBackup,
    sync: { state: syncState, lastSyncAt, error: syncError, conflicts }, syncNow,
  }), [user, tasks, sessions, reviews, settings, status, error, load, addTask, editTask, removeTask, toggleTask, applyPlan, addSession, updateSettings, importBackup, syncState, lastSyncAt, syncError, conflicts, syncNow]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): DataApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('DataProvider یافت نشد');
  return v;
}
