import { useEffect, useState } from 'react';
import type { Task } from '../../types/index.ts';
import { Modal } from '../../components/ui.tsx';
import { JalaliDateInput } from '../../components/JalaliDateInput.tsx';
import { useToast } from '../../components/Toast.tsx';
import { isValidISO } from '../../utils/date.ts';
import { formatDateLong } from '../../utils/format.ts';
import { taskToInput } from './taskLogic.ts';
import { useData } from './DataContext.tsx';

export function MoveTaskModal({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const { editTask } = useData();
  const toast = useToast();
  const [date, setDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDate(task?.date ?? '');
    setError(null);
  }, [task]);

  async function save() {
    if (!task) return;
    if (!isValidISO(date)) return setError('تاریخ معتبر انتخاب کنید.');
    if (date === task.date) return onClose();
    try {
      await editTask(task.id, { ...taskToInput(task), date });
      toast.show('کار به روز جدید منتقل شد.', 'success');
      onClose();
    } catch {
      /* پیام خطا نمایش داده شده */
    }
  }

  return (
    <Modal open={!!task} title="جابه‌جایی کار" onClose={onClose}>
      {task && (
        <div className="space-y-4">
          <p className="break-words text-sm text-ink-soft dark:text-slate-300">«{task.title}» به چه روزی منتقل شود؟</p>
          <div>
            <label className="label" htmlFor="mv-date">تاریخ جدید</label>
            <JalaliDateInput id="mv-date" value={date} onChange={setDate} />
            {isValidISO(date) && <p className="mt-1 text-xs text-ink-soft dark:text-slate-400">{formatDateLong(date)}</p>}
            {error && <p className="field-error">{error}</p>}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button className="btn-ghost" onClick={onClose}>انصراف</button>
            <button className="btn-primary" onClick={() => void save()}>انتقال</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
