import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { AppUser } from '../../types/index.ts';
import { isSupabaseConfigured, supabase } from '../../lib/supabase.ts';
import { BRAND } from '../../config/brand.ts';
import { translateAuthError } from './validation.ts';

const DEMO_FLAG = `${BRAND.storagePrefix}:demo`; // فقط یک پرچم؛ هیچ رمزی ذخیره نمی‌شود
export const DEMO_USER: AppUser = { id: 'demo', email: null, isDemo: true };

interface AuthApi {
  user: AppUser | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  enterDemo: () => void;
}

const Ctx = createContext<AuthApi | null>(null);

const toUser = (s: Session | null): AppUser | null => (s ? { id: s.user.id, email: s.user.email ?? null, isDemo: false } : null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setUser(localStorage.getItem(DEMO_FLAG) === '1' ? DEMO_USER : null);
      setLoading(false);
      return;
    }
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(toUser(data.session) ?? (localStorage.getItem(DEMO_FLAG) === '1' ? DEMO_USER : null));
      setLoading(false);
    }).catch(() => {
      if (active) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) {
        localStorage.removeItem(DEMO_FLAG);
        setUser(toUser(session));
      } else {
        setUser((u) => (u?.isDemo ? u : null));
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return 'اتصال به سرویس حساب کاربری تنظیم نشده است.';
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      return error ? translateAuthError(error.message) : null;
    } catch (e) {
      return translateAuthError(e instanceof Error ? e.message : '');
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    if (!supabase) return { error: 'اتصال به سرویس حساب کاربری تنظیم نشده است.', needsConfirmation: false };
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { display_name: name.trim() } },
      });
      if (error) return { error: translateAuthError(error.message), needsConfirmation: false };
      return { error: null, needsConfirmation: !data.session };
    } catch (e) {
      return { error: translateAuthError(e instanceof Error ? e.message : ''), needsConfirmation: false };
    }
  }, []);

  const signOut = useCallback(async () => {
    localStorage.removeItem(DEMO_FLAG);
    if (supabase) await supabase.auth.signOut().catch(() => undefined);
    setUser(null);
  }, []);

  const enterDemo = useCallback(() => {
    localStorage.setItem(DEMO_FLAG, '1');
    setUser(DEMO_USER);
  }, []);

  const value = useMemo(
    () => ({ user, loading, configured: isSupabaseConfigured, signIn, signUp, signOut, enterDemo }),
    [user, loading, signIn, signUp, signOut, enterDemo],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('AuthProvider یافت نشد');
  return v;
}
