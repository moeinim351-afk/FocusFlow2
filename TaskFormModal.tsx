import { useEffect, useState, type FormEvent } from 'react';
import type { Priority, Task } from '../../types/index.ts';
import { Modal } from '../../components/ui.tsx';
import { JalaliDateInput } from '../../components/JalaliDateInput.tsx';
import { useToast } from '../../components/Toast.tsx';
import { todayISO } from '../../utils/date.ts';
import { formatDateLong, PRIORITY_LABEL } from '../../utils/format.ts';
import { isValidISO } from '../../utils/date.ts';
import { MAX_DESCRIPTION, MAX_ESTIMATE, MAX_TITLE, MIN_ESTIMATE, validateTaskInput, type TaskErrors, type TaskInput } from './taskLogic.ts';
import { useData } from './DataContext.tsx';

const EMPTY = (date: string): TaskInput => ({ title: '', description: '', subject: '', isExam: false, date, time: '', priority: 'medium', estimatedMinutes: 30 });
const DURATIONS = [15, 25, 30, 45, 60, 90];

export function TaskFormModal({ open, task, defaultDate, onClose }: { open: boolean; task?: Task | null; defaultDate?: string; onClose: () => void }) {
  const { addTask, editTask } = useData();
  const toast = useToast();
  const [form, setForm] = useState<TaskInput>(EMPTY(defaultDate ?? todayISO()));
  const [errors, setErrors] = useState<TaskErrors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(task ? { title: task.title, description: task.description, subject: task.subject ?? '', isExam: !!task.isExam, date: task.date, time: task.time ?? '', priority: task.priority, estimatedMinutes: task.estimatedMinutes } : EMPTY(defaultDate ?? todayISO()));
  }, [open, task, defaultDate]);

  const set = <K extends keyof TaskInput>(k: K, v: TaskInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs = validateTaskInput(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSaving(true);
    try {
      if (task) await editTask(task.id, form);
      else await addTask(form);
      toast.show(task ? 'کار ویرایش شد.' : 'کار اضافه شد.', 'success');
      onClose();
    } catch {
      /* پیام خطا قبلاً نمایش داده شده است */
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} title={task ? 'ویرایش کار' : 'کار جدید'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label className="label" htmlFor="tf-title">عنوان</label>
          <input id="tf-title" className="input" value={form.title} maxLength={MAX_TITLE + 20} onChange={(e) => set('title', e.target.value)} placeholder="مثلاً: حل تمرین‌های فصل ۳" autoFocus aria-invalid={!!errors.title} />
          {errors.title && <p className="field-error">{errors.title}</p>}
        </div>
        <div>
          <label className="label" htmlFor="tf-desc">توضیحات (اختیاری)</label>
          <textarea id="tf-desc" className="input min-h-[84px] py-2" value={form.description} onChange={(e) => set('description', e.target.value)} maxLength={MAX_DESCRIPTION + 50} />
          {errors.description && <p className="field-error">{errors.description}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor="tf-subject">درس (اختیاری)</label><input id="tf-subject" className="input" value={form.subject ?? ''} onChange={(e) => set('subject', e.target.value)} placeholder="مثلاً ریاضی" /></div>
          <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" checked={!!form.isExam} onChange={(e) => set('isExam', e.target.checked)} className="h-4 w-4 accent-primary" />این کار، امتحان است</label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <label className="label" htmlFor="tf-date">تاریخ</label>
            <JalaliDateInput id="tf-date" value={form.date} onChange={(v) => set('date', v)} />
            {isValidISO(form.date) && <p className="mt-1 text-xs text-ink-soft dark:text-slate-400">{formatDateLong(form.date)}</p>}
            {errors.date && <p className="field-error">{errors.date}</p>}
          </div>
          <div className="min-w-0">
            <label className="label" htmlFor="tf-time">ساعت (اختیاری)</label>
            <input id="tf-time" type="time" className="input" value={form.time} onChange={(e) => set('time', e.target.value)} />
            {errors.time && <p className="field-error">{errors.time}</p>}
          </div>
        </div>
        <fieldset>
          <legend className="label">اولویت</legend>
          <div className="grid grid-cols-3 gap-2">
            {(['low', 'medium', 'high'] as Priority[]).map((p) => (
              <button key={p} type="button" onClick={() => set('priority', p)} aria-pressed={form.priority === p} className={`btn ${form.priority === p ? 'bg-primary text-white' : 'btn-soft'}`}>{PRIORITY_LABEL[p]}</button>
            ))}
          </div>
        </fieldset>
        <div>
          <label className="label" htmlFor="tf-est">مدت تخمینی (دقیقه)</label>
          <input id="tf-est" type="text" inputMode="numeric" autoComplete="off" className="input" value={form.estimatedMinutes} onChange={(e) => set('estimatedMinutes', e.target.value)} />
          <div className="mt-2 flex flex-wrap gap-2">
            {DURATIONS.map((d) => (
              <button key={d} type="button" className="chip bg-slate-100 text-ink-soft hover:bg-primary-50 dark:bg-white/10 dark:text-slate-300" onClick={() => set('estimatedMinutes', d)}>
                {d.toLocaleString('fa-IR')}
              </button>
            ))}
          </div>
          {errors.estimatedMinutes
            ? <p className="field-error">{errors.estimatedMinutes}</p>
            : <p className="mt-1 text-xs text-ink-soft dark:text-slate-400">بین {MIN_ESTIMATE.toLocaleString('fa-IR')} تا {MAX_ESTIMATE.toLocaleString('fa-IR')} دقیقه</p>}
        </div>
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-ghost" onClick={onClose}>انصراف</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'در حال ذخیره…' : task ? 'ذخیره‌ی تغییرات' : 'افزودن کار'}</button>
        </div>
      </form>
    </Modal>
  );
}
