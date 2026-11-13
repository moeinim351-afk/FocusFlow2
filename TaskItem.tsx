import { CalendarClock, Check, Clock, Pencil, Repeat2, Trash2 } from 'lucide-react';
import type { Task } from '../../types/index.ts';
import { PriorityBadge } from '../../components/ui.tsx';
import { fa, formatDateShort, formatMinutes, formatTime } from '../../utils/format.ts';
import { isOverdue } from './taskLogic.ts';

interface Props {
  task: Task;
  showDate?: boolean;
  onToggle: (t: Task) => void;
  onEdit?: (t: Task) => void;
  onDelete?: (t: Task) => void;
  onMove?: (t: Task) => void;
}

export function TaskItem({ task, showDate, onToggle, onEdit, onDelete, onMove }: Props) {
  const overdue = isOverdue(task);
  return (
    <li className={`card flex items-start gap-3 p-3 ${overdue ? 'border-red-200 dark:border-red-500/40' : ''}`}>
      <button
        onClick={() => onToggle(task)}
        aria-label={task.completed ? 'علامت‌گذاری به عنوان انجام‌نشده' : 'علامت‌گذاری به عنوان انجام‌شده'}
        aria-pressed={task.completed}
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${task.completed ? 'border-emerald-500 bg-emerald-500 text-white' : overdue ? 'border-red-400' : 'border-slate-300 hover:border-primary dark:border-white/30'}`}
      >
        {task.completed && <Check className="h-4 w-4" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`break-words font-medium ${task.completed ? 'text-slate-400 line-through' : ''}`}>{task.title}</p>
        {task.description && <p className="mt-0.5 line-clamp-2 break-words text-sm text-ink-soft dark:text-slate-400">{task.description}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          {task.subject && <span className="chip" style={{backgroundColor:`hsl(${[...task.subject].reduce((a,c)=>a+c.charCodeAt(0),0)%360} 75% 91%)`,color:`hsl(${[...task.subject].reduce((a,c)=>a+c.charCodeAt(0),0)%360} 65% 28%)`}}>{task.subject}</span>}
          {task.isExam && <span className="chip bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">امتحان</span>}
          <PriorityBadge priority={task.priority} />
          <span className="chip bg-slate-100 text-ink-soft dark:bg-white/10 dark:text-slate-300"><Clock className="h-3 w-3" />{formatMinutes(task.estimatedMinutes)}</span>
          {task.time && <span className="chip bg-slate-100 text-ink-soft dark:bg-white/10 dark:text-slate-300">{formatTime(task.time)}</span>}
          {showDate && <span className="chip bg-slate-100 text-ink-soft dark:bg-white/10 dark:text-slate-300"><CalendarClock className="h-3 w-3" />{formatDateShort(task.date)}</span>}
          {overdue && <span className="chip bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300">عقب‌افتاده</span>}
          {task.carryOverCount > 0 && <span className="chip bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"><Repeat2 className="h-3 w-3" />{fa(task.carryOverCount)} بار منتقل شده</span>}
        </div>
      </div>
      <div className="flex shrink-0 items-center">
        {onMove && !task.completed && <button className="btn-ghost !min-h-0 rounded-lg p-2" onClick={() => onMove(task)} aria-label="جابه‌جایی به روز دیگر"><CalendarClock className="h-4 w-4" /></button>}
        {onEdit && <button className="btn-ghost !min-h-0 rounded-lg p-2" onClick={() => onEdit(task)} aria-label="ویرایش"><Pencil className="h-4 w-4" /></button>}
        {onDelete && <button className="btn-ghost !min-h-0 rounded-lg p-2 text-red-600" onClick={() => onDelete(task)} aria-label="حذف"><Trash2 className="h-4 w-4" /></button>}
      </div>
    </li>
  );
}
