import type { Settings, TimerMode } from '../../types/index.ts';

export type TimerStatus = 'idle' | 'running' | 'paused';

export interface TimerState {
  mode: TimerMode;
  status: TimerStatus;
  totalMs: number;
  /** زمان باقی‌مانده در لحظه‌ی شروع/ادامه‌ی بازه‌ی فعلی */
  remainingAtStartMs: number;
  /** برچسب زمانی (ms) شروع بازه‌ی فعلی؛ فقط وقتی running است */
  segmentStartedAt: number | null;
  /** زمان واقعی شروع جلسه (ISO) برای ذخیره */
  sessionStartedAt: string | null;
  taskId: string | null;
  /** تعداد جلسات تمرکز کامل‌شده در چرخه‌ی فعلی */
  focusCompleted: number;
}

export interface CompletedSession {
  mode: TimerMode;
  plannedSeconds: number;
  startedAt: string;
  endedAt: string;
  taskId: string | null;
}

export const LONG_BREAK_EVERY = 4;

type Durations = Pick<Settings, 'focusMinutes' | 'shortBreakMinutes' | 'longBreakMinutes'>;

export function durationMs(mode: TimerMode, s: Durations): number {
  const minutes = mode === 'focus' ? s.focusMinutes : mode === 'short_break' ? s.shortBreakMinutes : s.longBreakMinutes;
  return Math.max(1, Math.round(minutes)) * 60_000;
}

export function createIdle(mode: TimerMode, s: Durations, focusCompleted = 0, taskId: string | null = null): TimerState {
  const total = durationMs(mode, s);
  return {
    mode,
    status: 'idle',
    totalMs: total,
    remainingAtStartMs: total,
    segmentStartedAt: null,
    sessionStartedAt: null,
    taskId,
    focusCompleted,
  };
}

export function remainingMs(state: TimerState, now: number): number {
  if (state.status !== 'running' || state.segmentStartedAt === null) return state.remainingAtStartMs;
  const elapsed = Math.max(0, now - state.segmentStartedAt); // اگر ساعت سیستم عقب رفت، منفی نشود
  return Math.max(0, state.remainingAtStartMs - elapsed);
}

export function start(state: TimerState, now: number): TimerState {
  if (state.status === 'running') return state;
  return {
    ...state,
    status: 'running',
    segmentStartedAt: now,
    sessionStartedAt: state.sessionStartedAt ?? new Date(now).toISOString(),
  };
}

export function pause(state: TimerState, now: number): TimerState {
  if (state.status !== 'running') return state;
  return { ...state, status: 'paused', remainingAtStartMs: remainingMs(state, now), segmentStartedAt: null };
}

export function resume(state: TimerState, now: number): TimerState {
  if (state.status !== 'paused') return state;
  return { ...state, status: 'running', segmentStartedAt: now };
}

/** بازنشانی: جلسه‌ی ناتمام هرگز ذخیره یا شمرده نمی‌شود. */
export function reset(state: TimerState, s: Durations): TimerState {
  return createIdle(state.mode, s, state.focusCompleted, state.taskId);
}

export function nextMode(state: Pick<TimerState, 'mode' | 'focusCompleted'>): TimerMode {
  if (state.mode !== 'focus') return 'focus';
  return state.focusCompleted > 0 && state.focusCompleted % LONG_BREAK_EVERY === 0 ? 'long_break' : 'short_break';
}

export function switchMode(state: TimerState, mode: TimerMode, s: Durations): TimerState {
  if (state.status !== 'idle') return state;
  return createIdle(mode, s, state.focusCompleted, state.taskId);
}

export interface TickResult {
  state: TimerState;
  completed: CompletedSession | null;
}

/** اگر زمان تمام شده باشد، جلسه را کامل می‌کند و حالت بعدی را آماده (idle) می‌گذارد. */
export function tick(state: TimerState, now: number, s: Durations): TickResult {
  if (state.status !== 'running' || remainingMs(state, now) > 0) return { state, completed: null };
  const endMs = (state.segmentStartedAt ?? now) + state.remainingAtStartMs;
  const completed: CompletedSession = {
    mode: state.mode,
    plannedSeconds: Math.round(state.totalMs / 1000),
    startedAt: state.sessionStartedAt ?? new Date(endMs - state.totalMs).toISOString(),
    endedAt: new Date(Math.min(endMs, now)).toISOString(),
    taskId: state.taskId,
  };
  const focusCompleted = state.mode === 'focus' ? state.focusCompleted + 1 : state.focusCompleted;
  const upcoming = nextMode({ mode: state.mode, focusCompleted });
  // پس از استراحت بلند، چرخه از نو شروع می‌شود
  const cycleCount = state.mode === 'long_break' ? 0 : focusCompleted;
  return { state: createIdle(upcoming, s, cycleCount, state.taskId), completed };
}

/** برای ذخیره/بازیابی پس از رفرش */
export function parseStoredTimer(raw: string | null): TimerState | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<TimerState>;
    const modes: TimerMode[] = ['focus', 'short_break', 'long_break'];
    const statuses: TimerStatus[] = ['idle', 'running', 'paused'];
    if (!v || !modes.includes(v.mode as TimerMode) || !statuses.includes(v.status as TimerStatus)) return null;
    if (typeof v.totalMs !== 'number' || typeof v.remainingAtStartMs !== 'number') return null;
    if (v.status === 'running' && typeof v.segmentStartedAt !== 'number') return null;
    return {
      mode: v.mode as TimerMode,
      status: v.status as TimerStatus,
      totalMs: v.totalMs,
      remainingAtStartMs: v.remainingAtStartMs,
      segmentStartedAt: v.segmentStartedAt ?? null,
      sessionStartedAt: v.sessionStartedAt ?? null,
      taskId: v.taskId ?? null,
      focusCompleted: typeof v.focusCompleted === 'number' ? v.focusCompleted : 0,
    };
  } catch {
    return null;
  }
}
