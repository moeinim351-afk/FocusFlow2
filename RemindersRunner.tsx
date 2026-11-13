import { useEffect } from 'react';
import { useToast } from '../../components/Toast.tsx';
import { notifyBrowser } from '../../lib/notify.ts';
import { diffDays, nowHHmm, toISO } from '../../utils/date.ts';
import { formatTime } from '../../utils/format.ts';
import { isOverdue } from '../tasks/taskLogic.ts';
import { useData } from '../tasks/DataContext.tsx';

/** یادآورهای درون‌برنامه‌ای؛ فقط وقتی برنامه باز است کار می‌کنند. اعلان پس‌زمینه (Push) پیاده‌سازی نشده است. */
export function RemindersRunner() {
  const { tasks, settings } = useData();
  const toast = useToast();

  useEffect(() => {
    if (!settings.remindersEnabled) return;
    const seen = (key: string): boolean => {
      try {
        if (sessionStorage.getItem(key)) return true;
        sessionStorage.setItem(key, '1');
      } catch {
        /* ignore */
      }
      return false;
    };
    const run = () => {
      const now = new Date();
      const today = toISO(now);
      const hhmm = nowHHmm(now);
      const [nh, nm] = hhmm.split(':').map(Number);
      for (const t of tasks) {
        if (t.completed || t.deleted) continue;
        if (t.date === today && t.time) {
          const [h, m] = t.time.split(':').map(Number);
          const minutesLeft = h * 60 + m - (nh * 60 + nm);
          if (minutesLeft >= 0 && minutesLeft <= settings.reminderLeadMinutes && !seen(`rem:up:${t.id}:${today}`)) {
            toast.show(`«${t.title}» ساعت ${formatTime(t.time)} شروع می‌شود.`, 'info');
            notifyBrowser('یادآوری کار', `«${t.title}» ساعت ${formatTime(t.time)}`);
          }
        }
      }
      const overdue = tasks.filter((t) => isOverdue(t, now));
      if (overdue.length > 0 && !seen(`rem:overdue:${today}`)) {
        const oldest = Math.max(...overdue.map((t) => diffDays(today, t.date)));
        toast.show(`${overdue.length.toLocaleString('fa-IR')} کار عقب‌افتاده دارید${oldest > 0 ? ` (قدیمی‌ترین ${oldest.toLocaleString('fa-IR')} روز پیش)` : ''}.`, 'error');
      }
    };
    run();
    const id = window.setInterval(run, 30_000);
    return () => window.clearInterval(id);
  }, [tasks, settings.remindersEnabled, settings.reminderLeadMinutes, toast]);

  return null;
}
