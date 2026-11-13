import type { ISODate, Priority, Task } from '../../types/index.ts';
import { addDaysISO, diffDays, rangeDays } from '../../utils/date.ts';

export const PRIORITY_WEIGHT: Record<Priority, number> = { low: 1, medium: 2, high: 3 };

export interface PlannerInput {
  tasks: Task[];
  today: ISODate;
  /** ظرفیت مطالعه‌ی روزانه به دقیقه */
  dailyCapacityMinutes: number;
  /** تعداد روزهای پیش رو (از امروز) */
  horizonDays?: number;
}

export interface Assignment {
  taskId: string;
  title: string;
  fromDate: ISODate;
  toDate: ISODate;
  estimatedMinutes: number;
  priority: Priority;
  carryOverCount: number;
  score: number;
}

export type UnplacedReason = 'too_long' | 'no_capacity';

export interface Unplaced {
  taskId: string;
  title: string;
  estimatedMinutes: number;
  reason: UnplacedReason;
}

export interface DayLoad {
  date: ISODate;
  capacity: number;
  existingMinutes: number;
  addedMinutes: number;
  remaining: number;
  overloaded: boolean;
}

export interface PlanResult {
  assignments: Assignment[];
  unplaced: Unplaced[];
  days: DayLoad[];
  totalMinutes: number;
  availableMinutes: number;
  overloaded: boolean;
  warnings: string[];
}

/** کارهای ناتمام و گذشته‌ی کاندید جابه‌جایی */
export function findCandidates(tasks: Task[], today: ISODate): Task[] {
  return tasks.filter((t) => !t.deleted && !t.completed && t.date < today);
}

/** امتیاز بالاتر یعنی زودتر جا گرفتن: اولویت، نزدیکی/گذشتگی مهلت، تعداد انتقال قبلی */
export function scoreTask(task: Task, today: ISODate, nearestExam?: Task): number {
  const overdueDays = Math.max(0, diffDays(today, task.date));
  const daysToExam = nearestExam ? diffDays(nearestExam.date, today) : -1;
  const sameSubject = !!nearestExam && !!task.subject && task.subject === nearestExam.subject;
  const examUrgency = sameSubject && daysToExam >= 0 ? Math.max(0, 10 - daysToExam) * 3 : 0;
  return PRIORITY_WEIGHT[task.priority] * 10 + Math.min(overdueDays, 14) * 2 + task.carryOverCount * 5 + examUrgency;
}

function rank(a: { score: number; task: Task }, b: { score: number; task: Task }): number {
  if (b.score !== a.score) return b.score - a.score;
  if (a.task.date !== b.task.date) return a.task.date < b.task.date ? -1 : 1;
  if (a.task.createdAt !== b.task.createdAt) return a.task.createdAt < b.task.createdAt ? -1 : 1;
  return a.task.id < b.task.id ? -1 : 1;
}

function existingLoad(tasks: Task[], candidateIds: Set<string>, date: ISODate): number {
  return tasks
    .filter((t) => !t.deleted && !t.completed && t.date === date && !candidateIds.has(t.id))
    .reduce((s, t) => s + t.estimatedMinutes, 0);
}

export function buildPlan(input: PlannerInput): PlanResult {
  const { tasks, today, dailyCapacityMinutes } = input;
  const horizon = Math.max(1, input.horizonDays ?? 7);
  const candidates = findCandidates(tasks, today);
  const candidateIds = new Set(candidates.map((t) => t.id));
  const dates = rangeDays(today, horizon);

  const nearestExam = tasks.filter(t => !t.deleted && !t.completed && t.isExam && t.date >= today).sort((a,b) => a.date.localeCompare(b.date))[0];
  const days: DayLoad[] = dates.map((date) => {
    const existing = existingLoad(tasks, candidateIds, date);
    const daysUntilExam = nearestExam ? diffDays(nearestExam.date, date) : -1;
    // تا سه روز مانده به امتحان، ظرفیت روزانه کمی فشرده‌تر می‌شود؛ روز امتحان سبک‌تر می‌ماند.
    const examFactor = daysUntilExam === 0 ? 0.65 : daysUntilExam > 0 && daysUntilExam <= 3 ? 1.2 : daysUntilExam > 3 && daysUntilExam <= 7 ? 1.1 : 1;
    const dayCapacity = Math.round(dailyCapacityMinutes * examFactor);
    return {
      date,
      capacity: dayCapacity,
      existingMinutes: existing,
      addedMinutes: 0,
      remaining: Math.max(0, dayCapacity - existing),
      overloaded: existing > dayCapacity,
    };
  });

  const ranked = candidates.map((task) => ({ task, score: scoreTask(task, today, nearestExam) })).sort(rank);

  const assignments: Assignment[] = [];
  const unplaced: Unplaced[] = [];

  for (const { task, score } of ranked) {
    if (task.estimatedMinutes > Math.max(...days.map(d => d.capacity))) {
      unplaced.push({ taskId: task.id, title: task.title, estimatedMinutes: task.estimatedMinutes, reason: 'too_long' });
      continue;
    }
    const day = days.find((d) => d.remaining >= task.estimatedMinutes);
    if (!day) {
      unplaced.push({ taskId: task.id, title: task.title, estimatedMinutes: task.estimatedMinutes, reason: 'no_capacity' });
      continue;
    }
    day.remaining -= task.estimatedMinutes;
    day.addedMinutes += task.estimatedMinutes;
    assignments.push({
      taskId: task.id,
      title: task.title,
      fromDate: task.date,
      toDate: day.date,
      estimatedMinutes: task.estimatedMinutes,
      priority: task.priority,
      carryOverCount: task.carryOverCount,
      score,
    });
  }

  const totalMinutes = candidates.reduce((s, t) => s + t.estimatedMinutes, 0);
  const availableMinutes = days.reduce((s, d) => s + Math.max(0, d.capacity - d.existingMinutes), 0);
  const warnings: string[] = [];
  const overloadedExisting = days.filter((d) => d.overloaded);
  if (overloadedExisting.length > 0)
    warnings.push(`${overloadedExisting.length} روز از قبل بیش از ظرفیت برنامه‌ریزی شده است.`);
  if (totalMinutes > availableMinutes)
    warnings.push('حجم کارهای عقب‌افتاده از زمان آزاد روزهای پیش رو بیشتر است. برای جلوگیری از برنامه‌ی غیرواقعی، بخشی از کارها جابه‌جا نشده‌اند.');
  if (unplaced.some((u) => u.reason === 'too_long'))
    warnings.push('برخی کارها از ظرفیت یک روز کامل طولانی‌ترند؛ آن‌ها را به کارهای کوچک‌تر تقسیم کنید.');

  return {
    assignments,
    unplaced,
    days,
    totalMinutes,
    availableMinutes,
    overloaded: unplaced.length > 0 || overloadedExisting.length > 0,
    warnings,
  };
}

/** پس از تنظیم دستی کاربر، بار هر روز را دوباره حساب می‌کند و روزهای پرشده را علامت می‌زند. */
export function evaluateAssignments(input: PlannerInput, assignments: Assignment[]): DayLoad[] {
  const { tasks, today, dailyCapacityMinutes } = input;
  const horizon = Math.max(1, input.horizonDays ?? 7);
  const candidateIds = new Set(findCandidates(tasks, today).map((t) => t.id));
  const nearestExam = tasks.filter(t => !t.deleted && !t.completed && t.isExam && t.date >= today).sort((a,b) => a.date.localeCompare(b.date))[0];
  return rangeDays(today, horizon).map((date) => {
    const existing = existingLoad(tasks, candidateIds, date);
    const added = assignments.filter((a) => a.toDate === date).reduce((s, a) => s + a.estimatedMinutes, 0);
    const daysUntilExam = nearestExam ? diffDays(nearestExam.date, date) : -1;
    const factor = daysUntilExam === 0 ? 0.65 : daysUntilExam > 0 && daysUntilExam <= 3 ? 1.2 : daysUntilExam > 3 && daysUntilExam <= 7 ? 1.1 : 1;
    const capacity = Math.round(dailyCapacityMinutes * factor);
    return {
      date,
      capacity,
      existingMinutes: existing,
      addedMinutes: added,
      remaining: Math.max(0, capacity - existing - added),
      overloaded: existing + added > capacity,
    };
  });
}

/**
 * اعمال برنامه روی کارها. تاریخ اصلی (originalDate) ثابت می‌ماند و فقط شمارنده‌ی انتقال زیاد می‌شود.
 * هیچ کاری حذف نمی‌شود و کارهایی که در برنامه نیستند دست‌نخورده می‌مانند.
 */
export function applyAssignments(tasks: Task[], assignments: Assignment[], nowISO: string): Task[] {
  const byId = new Map(assignments.map((a) => [a.taskId, a]));
  return tasks.map((t) => {
    const a = byId.get(t.id);
    if (!a || a.toDate === t.date) return t;
    return { ...t, date: a.toDate, carryOverCount: t.carryOverCount + 1, updatedAt: nowISO, dirty: true };
  });
}

/** بازه‌ی پیش‌فرض نمایش: از فردا */
export function tomorrowOf(today: ISODate): ISODate {
  return addDaysISO(today, 1);
}
