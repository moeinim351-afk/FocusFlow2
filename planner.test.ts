import test from 'node:test';
import assert from 'node:assert/strict';
import { applyAssignments, buildPlan, evaluateAssignments, findCandidates, scoreTask } from '../src/features/planner/planner.ts';
import { makeTask } from './helpers.ts';

const today = '2026-11-11';

test('فقط کارهای ناتمام و گذشته کاندید می‌شوند', () => {
  const tasks = [
    makeTask({ id: 'a', date: '2026-11-09' }),
    makeTask({ id: 'b', date: '2026-11-09', completed: true }),
    makeTask({ id: 'c', date: '2026-11-09', deleted: true }),
    makeTask({ id: 'd', date: today }),
    makeTask({ id: 'e', date: '2026-11-15' }),
  ];
  assert.deepEqual(findCandidates(tasks, today).map((t) => t.id), ['a']);
});

test('رتبه‌بندی: اولویت، گذشتگی مهلت و تعداد انتقال', () => {
  const low = makeTask({ date: '2026-11-10', priority: 'low' });
  const high = makeTask({ date: '2026-11-10', priority: 'high' });
  const carried = makeTask({ date: '2026-11-10', priority: 'low', carryOverCount: 3 });
  const older = makeTask({ date: '2026-11-05', priority: 'low' });
  assert.ok(scoreTask(high, today) > scoreTask(low, today));
  assert.ok(scoreTask(carried, today) > scoreTask(low, today));
  assert.ok(scoreTask(older, today) > scoreTask(low, today));
});

test('سناریوی واقعی: توزیع بدون عبور از ظرفیت روزانه', () => {
  const tasks = [
    makeTask({ id: 'math', date: '2026-11-08', priority: 'high', estimatedMinutes: 90 }),
    makeTask({ id: 'sci', date: '2026-11-09', priority: 'medium', estimatedMinutes: 60, carryOverCount: 1 }),
    makeTask({ id: 'lit', date: '2026-11-10', priority: 'low', estimatedMinutes: 45 }),
    makeTask({ id: 'eng', date: '2026-11-10', priority: 'high', estimatedMinutes: 120 }),
    // کار از قبل برنامه‌ریزی‌شده‌ی امروز که نباید جابه‌جا شود
    makeTask({ id: 'today', date: today, estimatedMinutes: 100 }),
  ];
  const plan = buildPlan({ tasks, today, dailyCapacityMinutes: 180 });
  assert.equal(plan.unplaced.length, 0);
  assert.equal(plan.assignments.length, 4);
  for (const d of plan.days) assert.ok(d.existingMinutes + d.addedMinutes <= d.capacity, `روز ${d.date} بیش از ظرفیت`);
  // امروز فقط ۸۰ دقیقه جا دارد؛ مهم‌ترین کار (math, ۹۰ دقیقه) امروز جا نمی‌شود ولی فردا می‌رود
  const math = plan.assignments.find((a) => a.taskId === 'math')!;
  assert.equal(math.toDate, '2026-11-12');
  // کار امروز دست نخورده است
  assert.ok(!plan.assignments.some((a) => a.taskId === 'today'));
});

test('اضافه‌بار: هشدار و عدم ساخت برنامه‌ی غیرواقعی', () => {
  const tasks = Array.from({ length: 10 }, (_, i) =>
    makeTask({ id: `x${i}`, date: '2026-11-09', estimatedMinutes: 120, priority: i < 3 ? 'high' : 'low' }),
  );
  const plan = buildPlan({ tasks, today, dailyCapacityMinutes: 120, horizonDays: 3 });
  assert.equal(plan.assignments.length, 3); // ۳ روز × ۱ کار
  assert.equal(plan.unplaced.length, 7);
  assert.ok(plan.overloaded);
  assert.ok(plan.warnings.length > 0);
  // کارهای با اولویت بالا جا گرفته‌اند
  assert.ok(plan.assignments.every((a) => a.priority === 'high'));
  for (const d of plan.days) assert.ok(d.addedMinutes <= d.capacity);
});

test('کار طولانی‌تر از یک روز جا نمی‌گیرد و هشدار می‌دهد', () => {
  const tasks = [makeTask({ id: 'big', date: '2026-11-09', estimatedMinutes: 300 })];
  const plan = buildPlan({ tasks, today, dailyCapacityMinutes: 240 });
  assert.equal(plan.unplaced[0].reason, 'too_long');
  assert.ok(plan.warnings.some((w) => w.includes('تقسیم')));
});

test('اعمال برنامه: تاریخ اصلی حفظ و شمارنده زیاد می‌شود، چیزی حذف نمی‌شود', () => {
  const tasks = [
    makeTask({ id: 'a', date: '2026-11-08', carryOverCount: 1 }),
    makeTask({ id: 'b', date: '2026-11-15' }),
  ];
  const plan = buildPlan({ tasks, today, dailyCapacityMinutes: 240 });
  const out = applyAssignments(tasks, plan.assignments, '2026-11-11T10:00:00.000Z');
  assert.equal(out.length, 2);
  const a = out.find((t) => t.id === 'a')!;
  assert.equal(a.originalDate, '2026-11-08');
  assert.equal(a.carryOverCount, 2);
  assert.equal(a.date, today);
  assert.equal(a.dirty, true);
  assert.deepEqual(out.find((t) => t.id === 'b'), tasks[1]);
  // ورودی تغییر نکرده است
  assert.equal(tasks[0].date, '2026-11-08');
});

test('تنظیم دستی: ارزیابی مجدد بار روزها', () => {
  const tasks = [
    makeTask({ id: 'a', date: '2026-11-08', estimatedMinutes: 100 }),
    makeTask({ id: 'b', date: '2026-11-08', estimatedMinutes: 100 }),
  ];
  const input = { tasks, today, dailyCapacityMinutes: 150 };
  const plan = buildPlan(input);
  const manual = plan.assignments.map((a) => ({ ...a, toDate: '2026-11-13' }));
  const days = evaluateAssignments(input, manual);
  const d = days.find((x) => x.date === '2026-11-13')!;
  assert.equal(d.addedMinutes, 200);
  assert.ok(d.overloaded);
});

test('امتحان نزدیک ظرفیت روزهای قبل را فشرده و روز امتحان را سبک می‌کند', () => {
  const exam = makeTask({ id: 'exam', date: '2026-11-13', isExam: true, subject: 'ریاضی' });
  const plan = buildPlan({ tasks: [exam], today, dailyCapacityMinutes: 180, horizonDays: 4 });
  assert.equal(plan.days[0].capacity, 216); // دو روز مانده
  assert.equal(plan.days[1].capacity, 216); // یک روز مانده
  assert.equal(plan.days[2].capacity, 117); // روز امتحان
});
