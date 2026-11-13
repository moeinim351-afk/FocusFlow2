export type Priority = 'low' | 'medium' | 'high';
export type ThemeMode = 'light' | 'dark' | 'system';
export type AccentId = 'indigo' | 'emerald' | 'rose' | 'violet' | 'ocean' | 'amber';
export type TimerMode = 'focus' | 'short_break' | 'long_break';

/** تاریخ‌ها به صورت رشته‌ی yyyy-MM-dd (روز تقویمی محلی) ذخیره می‌شوند. */
export type ISODate = string;

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  subject?: string;
  isExam?: boolean;
  date: ISODate;
  time: string | null; // HH:mm
  priority: Priority;
  estimatedMinutes: number;
  completed: boolean;
  completedAt: string | null;
  originalDate: ISODate;
  carryOverCount: number;
  createdAt: string;
  updatedAt: string;
  deleted: boolean; // حذف نرم برای همگام‌سازی
  dirty: boolean; // تغییر همگام‌نشده
}

export interface FocusSession {
  id: string;
  userId: string;
  taskId: string | null;
  mode: TimerMode;
  plannedSeconds: number;
  actualSeconds: number;
  startedAt: string;
  endedAt: string;
  createdAt: string;
  updatedAt: string;
  dirty: boolean;
}

export interface WeeklyReview {
  id: string;
  userId: string;
  weekStart: ISODate;
  totalTasks: number;
  completedTasks: number;
  rescheduledTasks: number;
  focusMinutes: number;
  createdAt: string;
  updatedAt: string;
  dirty: boolean;
}

export interface Settings {
  displayName: string;
  theme: ThemeMode;
  accent: AccentId; // تم رنگی برنامه
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  dailyAvailableMinutes: number;
  remindersEnabled: boolean;
  reminderLeadMinutes: number;
  soundEnabled: boolean;
  autoStartNext: boolean;
  updatedAt: string;
}

export const DEFAULT_SETTINGS: Settings = {
  displayName: '',
  theme: 'system',
  accent: 'indigo',
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  dailyAvailableMinutes: 240,
  remindersEnabled: true,
  reminderLeadMinutes: 15,
  soundEnabled: true,
  autoStartNext: false,
  updatedAt: new Date(0).toISOString(),
};

export interface AppUser {
  id: string;
  email: string | null;
  isDemo: boolean;
}
