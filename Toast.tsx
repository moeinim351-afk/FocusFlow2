import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, Check, Info, X } from 'lucide-react';

type Kind = 'success' | 'error' | 'info';
interface ToastItem { id: number; kind: Kind; text: string }
interface ToastApi { show: (text: string, kind?: Kind) => void }

const Ctx = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const dismiss = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const show = useCallback((text: string, kind: Kind = 'info') => {
    const id = Date.now() + Math.random();
    setItems((l) => [...l.slice(-3), { id, kind, text }]);
    window.setTimeout(() => dismiss(id), kind === 'error' ? 7000 : 4500);
  }, [dismiss]);
  const api = useMemo(() => ({ show }), [show]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-3" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className="card pointer-events-auto flex w-full max-w-md items-start gap-3 p-3 text-sm">
            {t.kind === 'success' ? <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /> : t.kind === 'error' ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" /> : <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />}
            <p className="min-w-0 flex-1 break-words">{t.text}</p>
            <button className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10" onClick={() => dismiss(t.id)} aria-label="بستن">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('ToastProvider یافت نشد');
  return v;
}
