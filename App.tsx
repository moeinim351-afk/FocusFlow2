import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './features/auth/AuthContext.tsx';
import { DataProvider, useData } from './features/tasks/DataContext.tsx';
import { PomodoroProvider } from './features/pomodoro/PomodoroContext.tsx';
import { RemindersRunner } from './features/reminders/RemindersRunner.tsx';
import { ToastProvider } from './components/Toast.tsx';
import { ErrorBox, Spinner } from './components/ui.tsx';
import { Layout } from './components/Layout.tsx';
import { useTheme } from './hooks/useTheme.ts';
import { AuthPage } from './pages/AuthPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { TasksPage } from './pages/TasksPage.tsx';
import { CalendarPage } from './pages/CalendarPage.tsx';
import { PomodoroPage } from './pages/PomodoroPage.tsx';
import { PlannerPage } from './pages/PlannerPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';
import { DailyCelebration } from './components/DailyCelebration.tsx';

function ThemeApplier() {
  const { settings, status } = useData();
  const ready = status === 'ready';
  useTheme(ready ? settings.theme : null, ready ? settings.accent : null);
  return null;
}

/** صفحه‌ی ورود: پوسته‌ی ذخیره‌شده‌ی مرورگر (یا حالت سیستم) اعمال شود. */
function GuestTheme() {
  useTheme(null, null);
  return null;
}

function Ready() {
  const { status, error, reload } = useData();
  if (status === 'loading') return <Spinner />;
  if (status === 'error') return <div className="mx-auto max-w-md p-6"><ErrorBox message={error ?? 'خطای ناشناخته'} onRetry={reload} /></div>;
  return (
    <PomodoroProvider>
      <RemindersRunner />
      <DailyCelebration />
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/pomodoro" element={<PomodoroPage />} />
          <Route path="/planner" element={<PlannerPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </PomodoroProvider>
  );
}

function Gate() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return (
    <>
      <GuestTheme />
      <AuthPage />
    </>
  );
  return (
    // key: با تغییر کاربر، همه‌ی state ها از نو ساخته می‌شوند (جداسازی داده‌ی کاربران)
    <DataProvider key={user.id} user={user}>
      <ThemeApplier />
      <Ready />
    </DataProvider>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Gate />
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
