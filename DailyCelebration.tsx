import { useEffect, useState } from 'react';
import { useData } from '../features/tasks/DataContext.tsx';
import { todayISO } from '../utils/date.ts';

/** جشن سبک و یک‌باره وقتی همه‌ی کارهای امروز تکمیل می‌شوند. */
export function DailyCelebration() {
  const { tasks } = useData();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const today = todayISO();
    const todays = tasks.filter(t => !t.deleted && t.date === today);
    const key = `student-planner:celebrated:${today}`;
    if (todays.length && todays.every(t => t.completed) && localStorage.getItem(key) !== '1') {
      localStorage.setItem(key, '1');
      setShow(true);
      const timer = window.setTimeout(() => setShow(false), 4200);
      return () => window.clearTimeout(timer);
    }
  }, [tasks]);
  if (!show) return null;
  return <div className="pointer-events-none fixed inset-0 z-[100] flex items-start justify-center pt-24" role="status" aria-live="polite">
    {Array.from({ length: 32 }, (_, i) => <span key={i} className="celebration-confetti" style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 9) * 0.11}s`, backgroundColor: `hsl(${(i * 47) % 360} 85% 58%)` }} />)}
    <div className="rounded-2xl bg-slate-900/90 px-7 py-5 text-center text-white shadow-2xl"><div className="text-4xl">🎉 ✨ 🎊</div><p className="mt-2 text-lg font-bold">همه‌ی کارهای امروز تمام شد!</p><p className="mt-1 text-sm text-white/75">به خودت افتخار کن؛ عالی پیش رفتی.</p></div>
  </div>;
}
