import { useMemo, useState } from 'react';
import { ListChecks, Plus, Search } from 'lucide-react';
import { ConfirmDialog, EmptyState, PageHeader } from '../components/ui.tsx';
import { useToast } from '../components/Toast.tsx';
import type { Task } from '../types/index.ts';
import { filterTasks, sortTasks, type TaskFilter } from '../features/tasks/taskLogic.ts';
import { useData } from '../features/tasks/DataContext.tsx';
import { TaskItem } from '../features/tasks/TaskItem.tsx';
import { TaskFormModal } from '../features/tasks/TaskFormModal.tsx';
import { MoveTaskModal } from '../features/tasks/MoveTaskModal.tsx';
import { fa } from '../utils/format.ts';
import { todayISO, addDaysISO, diffDays } from '../utils/date.ts';
import { parseNumberInput, toEnglishDigits } from '../utils/digits.ts';

const FILTERS: { id: TaskFilter; label: string }[] = [
  { id: 'all', label: 'همه' },
  { id: 'pending', label: 'انجام‌نشده' },
  { id: 'completed', label: 'انجام‌شده' },
  { id: 'overdue', label: 'عقب‌افتاده' },
];

export function TasksPage() {
  const { tasks, toggleTask, removeTask, addTask } = useData();
  const toast = useToast();
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [moving, setMoving] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [quickText, setQuickText] = useState('');
  const [quickBusy, setQuickBusy] = useState(false);

  const visible = useMemo(() => sortTasks(filterTasks(tasks, filter, query)), [tasks, filter, query]);
  const filtering = filter !== 'all' || query.trim() !== '';


  async function quickAdd() {
    const raw = toEnglishDigits(quickText.trim()); if (!raw) return;
    setQuickBusy(true);
    try {
      const recurring = /هر\s*روز|روزانه/.test(raw);
      const withoutDuration = raw.replace(/\d+\s*دقیقه/g, '');
      const timeMatch = withoutDuration.match(/(\d{1,2})(?::(\d{2}))?\s*(عصر|صبح|بعدازظهر)?/);
      let time = '';
      if (timeMatch) { let h = Number(timeMatch[1]); const suffix = timeMatch[3]; if (suffix === 'عصر' || suffix === 'بعدازظهر') h = h < 12 ? h + 12 : h; if (suffix === 'صبح' && h === 12) h = 0; if (h >= 0 && h <= 23) time = `${String(h).padStart(2,'0')}:${timeMatch[2] ?? '00'}`; }
      const minutesMatch = raw.match(/(\d+)\s*دقیقه/);
      const minutes = Math.min(600, Math.max(5, minutesMatch ? parseNumberInput(minutesMatch[1]) : 30));
      const title = raw.replace(/هر\s*روز|روزانه|فردا|امروز|\d{1,2}(?::\d{2})?\s*(عصر|صبح|بعدازظهر)?|\d+\s*دقیقه/g,' ').replace(/\s+/g,' ').trim() || 'مرور درس';
      const date = /فردا/.test(raw) ? addDaysISO(todayISO(),1) : todayISO();
      const subject = title.split(' ')[0];
      for (let i=0;i<(recurring?7:1);i++) await addTask({title: recurring ? `${title} (${i+1}/7)` : title, description:'', subject, isExam:false, date:addDaysISO(date,i), time, priority:'medium', estimatedMinutes:minutes});
      toast.show(recurring ? 'برنامه‌ی تکرارشونده برای ۷ روز ساخته شد.' : 'کار سریع اضافه شد.', 'success'); setQuickText('');
    } catch { toast.show('ساخت کار ناموفق بود.', 'error'); } finally { setQuickBusy(false); }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await removeTask(deleting.id);
      toast.show('کار حذف شد.', 'success');
    } catch {
      /* پیام خطا نمایش داده شده */
    }
    setDeleting(null);
  }

  return (
    <div>
      <PageHeader title="کارها" subtitle={`${fa(tasks.length)} کار ثبت شده`} actions={<button className="btn-primary" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" />کار جدید</button>} />

      <div className="card mb-4 space-y-2 p-4">
        <label className="label" htmlFor="quick-task">افزودن سریع با جمله‌ی طبیعی</label>
        <div className="flex gap-2"><input id="quick-task" className="input" value={quickText} onChange={e=>setQuickText(e.target.value)} placeholder="مثلاً فردا ۵ عصر ریاضی ۳۰ دقیقه" onKeyDown={e=>{if(e.key==='Enter') void quickAdd();}} /><button className="btn-primary shrink-0" disabled={!quickText.trim()||quickBusy} onClick={()=>void quickAdd()}>افزودن</button></div>
        <p className="text-xs text-ink-soft dark:text-slate-400">عبارت‌های «فردا»، ساعت، نام درس و مدت دقیقه پشتیبانی می‌شوند؛ «هر روز» یک برنامه‌ی ۷ روزه می‌سازد.</p>
      </div>

      {tasks.filter(t=>t.isExam && !t.completed && !t.deleted && t.date>=todayISO()).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,3).length>0 && <div className="mb-4 grid gap-2 sm:grid-cols-3">{tasks.filter(t=>t.isExam && !t.completed && !t.deleted && t.date>=todayISO()).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,3).map(exam=><div key={exam.id} className="rounded-xl border border-amber-300/60 bg-amber-50 p-3 text-sm dark:bg-amber-500/10"><p className="font-bold">امتحان {exam.subject || exam.title}</p><p className="mt-1 text-xs">{exam.date===todayISO()?'امروز':`${fa(diffDays(exam.date,todayISO()))} روز مانده`}</p></div>)}</div>}

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input className="input ps-9" type="search" placeholder="جست‌وجو در عنوان و توضیحات…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="جست‌وجوی کارها" />
      </div>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="فیلتر کارها">
        {FILTERS.map((f) => (
          <button key={f.id} role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)} className={`btn shrink-0 !min-h-[40px] ${filter === f.id ? 'bg-primary text-white' : 'btn-soft'}`}>{f.label}</button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<ListChecks className="h-6 w-6" />}
            title={filtering ? 'کاری با این شرایط پیدا نشد' : 'هنوز کاری اضافه نکرده‌اید'}
            hint={filtering ? 'فیلتر یا عبارت جست‌وجو را تغییر دهید.' : 'اولین کار خود را بسازید تا برنامه‌ریزی شروع شود.'}
            action={filtering ? <button className="btn-soft" onClick={() => { setFilter('all'); setQuery(''); }}>پاک‌کردن فیلترها</button> : <button className="btn-primary" onClick={() => { setEditing(null); setFormOpen(true); }}>افزودن کار</button>}
          />
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((t) => (
            <TaskItem key={t.id} task={t} showDate onToggle={(x) => toggleTask(x.id).catch(() => undefined)} onEdit={(x) => { setEditing(x); setFormOpen(true); }} onDelete={setDeleting} onMove={setMoving} />
          ))}
        </ul>
      )}

      <TaskFormModal open={formOpen} task={editing} onClose={() => setFormOpen(false)} />
      <MoveTaskModal task={moving} onClose={() => setMoving(null)} />
      <ConfirmDialog open={!!deleting} danger title="حذف کار" message={deleting ? `«${deleting.title}» حذف شود؟ این کار قابل بازگشت نیست.` : ''} confirmLabel="حذف" onConfirm={() => void confirmDelete()} onCancel={() => setDeleting(null)} />
    </div>
  );
}
