import test from 'node:test';
import assert from 'node:assert/strict';
import { dayProgress, filterTasks, isOverdue, validateTaskInput } from '../src/features/tasks/taskLogic.ts';
import { addDaysISO, isValidISO, startOfWeekISO, weekDays } from '../src/utils/date.ts';
import { buildWeeklyReport } from '../src/features/analytics/report.ts';
import { makeTask } from './helpers.ts';

const now = new Date(2026, 10, 11, 14, 30); // ۱۱ نوامبر ۲۰۲۶ (چهارشنبه)

test('اعتبارسنجی ورودی کار', () => {
  const ok = { title: 'ریاضی', description: '', date: '2026-11-12', time: '', priority: 'high' as const, estimatedMinutes: 45 };
  assert.deepEqual(validateTaskInput(ok), {});
  assert.ok(validateTaskInput({ ...ok, title: '  ' }).title);
  assert.ok(validateTaskInput({ ...ok, date: '2026-13-40' }).date);
  assert.ok(validateTaskInput({ ...ok, time: '25:99' }).time);
  assert.ok(validateTaskInput({ ...ok, estimatedMinutes: 1 }).estimatedMinutes);
  assert.ok(validateTaskInput({ ...ok, estimatedMinutes: 'abc' }).estimatedMinutes);
  assert.ok(validateTaskInput({ ...ok, estimatedMinutes: 12.5 }).estimatedMinutes);
});

test('تشخیص عقب‌افتاده شامل ساعت گذشته‌ی امروز', () => {
  assert.equal(isOverdue(makeTask({ date: '2026-11-10' }), now), true);
  assert.equal(isOverdue(makeTask({ date: '2026-11-11', time: '09:00' }), now), true);
  assert.equal(isOverdue(makeTask({ date: '2026-11-11', time: '18:00' }), now), false);
  assert.equal(isOverdue(makeTask({ date: '2026-11-11' }), now), false);
  assert.equal(isOverdue(makeTask({ date: '2026-11-10', completed: true }), now), false);
});

test('فیلتر و جست‌وجو', () => {
  const tasks = [
    makeTask({ id: '1', title: 'حل تمرین ریاضی', date: '2026-11-10' }),
    makeTask({ id: '2', title: 'مطالعه علوم', date: '2026-11-12', completed: true }),
    makeTask({ id: '3', title: 'حذف‌شده', date: '2026-11-12', deleted: true }),
  ];
  assert.deepEqual(filterTasks(tasks, 'all', '', now).map((t) => t.id), ['1', '2']);
  assert.deepEqual(filterTasks(tasks, 'pending', '', now).map((t) => t.id), ['1']);
  assert.deepEqual(filterTasks(tasks, 'completed', '', now).map((t) => t.id), ['2']);
  assert.deepEqual(filterTasks(tasks, 'overdue', '', now).map((t) => t.id), ['1']);
  assert.deepEqual(filterTasks(tasks, 'all', 'ریاضی', now).map((t) => t.id), ['1']);
});

test('درصد پیشرفت روزانه', () => {
  assert.equal(dayProgress([]).percent, 0);
  const p = dayProgress([makeTask({ date: 'x', completed: true }), makeTask({ date: 'x' }), makeTask({ date: 'x' })]);
  assert.deepEqual(p, { total: 3, done: 1, remaining: 2, percent: 33 });
});

test('هفته از شنبه شروع می‌شود', () => {
  assert.equal(startOfWeekISO('2026-11-11'), '2026-11-07'); // چهارشنبه → شنبه
  assert.equal(startOfWeekISO('2026-11-07'), '2026-11-07');
  assert.equal(startOfWeekISO('2026-11-13'), '2026-11-07'); // جمعه
  assert.equal(weekDays('2026-11-07').length, 7);
  assert.equal(addDaysISO('2026-12-31', 1), '2027-01-01');
  assert.equal(isValidISO('2026-02-30'), false);
});

test('گزارش هفتگی', () => {
  const tasks = [
    makeTask({ date: '2026-11-08', completed: true }),
    makeTask({ date: '2026-11-09', carryOverCount: 1 }),
    makeTask({ date: '2026-11-12' }),
    makeTask({ date: '2026-11-20' }), // خارج از هفته
  ];
  const sessions = [
    { id: 's1', userId: 'u', taskId: null, mode: 'focus' as const, plannedSeconds: 1500, actualSeconds: 1500, startedAt: new Date(2026, 10, 9, 10).toISOString(), endedAt: '', createdAt: '', updatedAt: '', dirty: false },
    { id: 's2', userId: 'u', taskId: null, mode: 'short_break' as const, plannedSeconds: 300, actualSeconds: 300, startedAt: new Date(2026, 10, 9, 11).toISOString(), endedAt: '', createdAt: '', updatedAt: '', dirty: false },
  ];
  const r = buildWeeklyReport(tasks, sessions, '2026-11-07', '2026-11-11');
  assert.equal(r.total, 3);
  assert.equal(r.completed, 1);
  assert.equal(r.overdue, 1);
  assert.equal(r.carried, 1);
  assert.equal(r.completionRate, 33);
  assert.equal(r.focusMinutes, 25);
  assert.equal(r.focusSessions, 1);
});
