import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { TimerMode } from '../../types/index.ts';
import { BRAND } from '../../config/brand.ts';
import { notifyBrowser } from '../../lib/notify.ts';
import { useToast } from '../../components/Toast.tsx';
import { formatClock } from '../../utils/format.ts';
import { useData } from '../tasks/DataContext.tsx';
import * as T from './timer.ts';

interface PomodoroApi {
  state: T.TimerState;
  remaining: number;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  setMode: (m: TimerMode) => void;
  setTask: (id: string | null) => void;
}

const Ctx = createContext<PomodoroApi | null>(null);

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const { user, settings, addSession } = useData();
  const toast = useToast();
  const storageKey = `${BRAND.storagePrefix}:timer:${user.id}`;
  const durations = useMemo(
    () => ({ focusMinutes: settings.focusMinutes, shortBreakMinutes: settings.shortBreakMinutes, longBreakMinutes: settings.longBreakMinutes }),
    [settings.focusMinutes, settings.shortBreakMinutes, settings.longBreakMinutes],
  );
  const durationsRef = useRef(durations);
  durationsRef.current = durations;

  const [state, setState] = useState<T.TimerState>(() => T.parseStoredTimer(localStorage.getItem(storageKey)) ?? T.createIdle('focus', durations));
  const [now, setNow] = useState(() => Date.now());
  const ref = useRef(state);
  // ثانیه‌ی نمایش‌داده‌شده؛ فقط با عوض شدن آن رندر مجدد می‌کنیم (نه ۴ بار در ثانیه برای کل برنامه)
  const shownSec = useRef(-1);
  const remindersRef = useRef(settings.remindersEnabled);
  remindersRef.current = settings.remindersEnabled;

  const commit = useCallback((s: T.TimerState) => {
    ref.current = s;
    setState(s);
    try {
      localStorage.setItem(storageKey, JSON.stringify(s));
    } catch {
      /* ذخیره‌سازی پر یا مسدود است؛ تایمر همچنان در حافظه کار می‌کند */
    }
  }, [storageKey]);

  const check = useCallback(() => {
    const t = Date.now();
    const sec = Math.ceil(T.remainingMs(ref.current, t) / 1000);
    if (sec !== shownSec.current) {
      shownSec.current = sec;
      setNow(t);
    }
    const r = T.tick(ref.current, t, durationsRef.current);
    if (!r.completed) return;
    if (settings.soundEnabled) { try { const Ctx = window.AudioContext || (window as any).webkitAudioContext; const audio = new Ctx(); const oscillator = audio.createOscillator(); const gain = audio.createGain(); oscillator.connect(gain); gain.connect(audio.destination); oscillator.frequency.value = r.completed.mode === 'focus' ? 880 : 660; gain.gain.setValueAtTime(0.12, audio.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.45); oscillator.start(); oscillator.stop(audio.currentTime + 0.45); } catch {} }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate([120, 70, 180]);
    commit(settings.autoStartNext ? T.start(r.state, Date.now()) : r.state);
    if (r.completed.mode === 'focus') {
      void addSession(r.completed);
      toast.show('یک جلسه‌ی تمرکز کامل شد. وقت استراحت است.', 'success');
      if (remindersRef.current) notifyBrowser('جلسه‌ی تمرکز تمام شد', 'کمی استراحت کنید.');
    } else {
      toast.show('استراحت تمام شد. آماده‌ی تمرکز بعدی؟', 'info');
      if (remindersRef.current) notifyBrowser('استراحت تمام شد', 'آماده‌ی جلسه‌ی بعدی هستید؟');
    }
  }, [addSession, commit, toast, settings.soundEnabled, settings.autoStartNext]);

  // بازیابی پس از رفرش: اگر زمان در غیاب صفحه تمام شده باشد همین‌جا ثبت می‌شود
  useEffect(() => {
    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (state.status !== 'running') return;
    const id = window.setInterval(check, 250);
    const onVisible = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [state.status, check]);

  // شمارش معکوس در عنوان تب، در همه‌ی صفحه‌ها (نه فقط صفحه‌ی تمرکز)
  const remaining = T.remainingMs(state, now);
  const titleSec = Math.ceil(remaining / 1000);
  useEffect(() => {
    if (state.status !== 'running') return;
    const prev = document.title;
    document.title = `${formatClock(titleSec * 1000)} • ${state.mode === 'focus' ? 'تمرکز' : 'استراحت'}`;
    return () => {
      document.title = prev;
    };
  }, [state.status, state.mode, titleSec]);

  // تغییر مدت‌ها در تنظیمات فقط وقتی تایمر idle است اعمال می‌شود
  useEffect(() => {
    const cur = ref.current;
    if (cur.status === 'idle' && cur.totalMs !== T.durationMs(cur.mode, durations)) {
      commit(T.createIdle(cur.mode, durations, cur.focusCompleted, cur.taskId));
    }
  }, [durations, commit]);

  const api = useMemo<PomodoroApi>(() => ({
    state,
    remaining,
    start: () => commit(T.start(ref.current, Date.now())),
    pause: () => commit(T.pause(ref.current, Date.now())),
    resume: () => commit(T.resume(ref.current, Date.now())),
    reset: () => commit(T.reset(ref.current, durationsRef.current)),
    setMode: (m) => commit(T.switchMode(ref.current, m, durationsRef.current)),
    setTask: (id) => commit({ ...ref.current, taskId: id }),
  }), [state, remaining, commit]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function usePomodoro(): PomodoroApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('PomodoroProvider یافت نشد');
  return v;
}
