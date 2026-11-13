import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import type { Priority } from '../types/index.ts';
import { PRIORITY_LABEL } from '../utils/format.ts';

export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  // onClose معمولاً تابع درون‌خطی است و در هر رندر عوض می‌شود؛ اگر در وابستگی‌های effect باشد،
  // با هر رندر والد (مثلاً شمارش تایمر) فوکوس از فیلد در حال تایپ دزدیده می‌شد.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !ref.current) return;
      // فوکوس داخل پنجره می‌ماند
      const items = ref.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === ref.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    // اگر فیلدی (autoFocus) از قبل فوکوس گرفته، دست نمی‌زنیم
    if (ref.current && !ref.current.contains(document.activeElement)) ref.current.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previous?.focus?.();
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className="card max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-b-none p-5 outline-none sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <button className="btn-ghost !min-h-0 rounded-lg p-2" onClick={onClose} aria-label="بستن"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel, danger, onConfirm, onCancel }: { open: boolean; title: string; message: string; confirmLabel: string; danger?: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <p className="mb-5 text-sm leading-7 text-ink-soft dark:text-slate-300">{message}</p>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button className="btn-ghost" onClick={onCancel}>انصراف</button>
        <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </Modal>
  );
}

export function EmptyState({ icon, title, hint, action }: { icon: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <div className="rounded-2xl bg-primary-50 p-4 text-primary dark:bg-white/10">{icon}</div>
      <p className="font-medium">{title}</p>
      {hint && <p className="max-w-sm text-sm text-ink-soft dark:text-slate-400">{hint}</p>}
      {action}
    </div>
  );
}

export function Spinner({ label = 'در حال بارگذاری…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-ink-soft dark:text-slate-400" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200" role="alert">
      <p>{message}</p>
      {onRetry && <button className="btn-soft mt-3" onClick={onRetry}>تلاش دوباره</button>}
    </div>
  );
}

const PRIORITY_STYLE: Record<Priority, string> = {
  low: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
  medium: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  high: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300',
};
export function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={`chip ${PRIORITY_STYLE[priority]}`}>{PRIORITY_LABEL[priority]}</span>;
}

export function ProgressRing({ percent, size = 96, label }: { percent: number; size?: number; label: string }) {
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth="8" className="fill-none stroke-slate-100 dark:stroke-white/10" />
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth="8" strokeLinecap="round" className="fill-none stroke-primary transition-[stroke-dashoffset] duration-500" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(100, Math.max(0, percent)) / 100)} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">{label}</span>
    </div>
  );
}

export function LoadBar({ used, capacity, overloaded }: { used: number; capacity: number; overloaded?: boolean }) {
  const pct = capacity <= 0 ? 0 : Math.min(100, Math.round((used / capacity) * 100));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10" role="presentation">
      <div className={`h-full rounded-full ${overloaded || used > capacity ? 'bg-red-500' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-soft dark:text-slate-400">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}
