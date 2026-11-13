import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProgressStats, computeStreak } from '../src/features/analytics/stats.ts';
import { ACCENTS, hexToChannels, isAccentId } from '../src/config/accents.ts';
import { makeSession, makeTask } from './helpers.ts';

const today = '2026-11-12'; // پنجشنبه؛ هفته از شنبه ۲۰۲۶-۱۱-۰۷ شروع می‌شود

test('نمودار هفتگی: هفت روز از شنبه، فقط تمرکز، امروز و آینده مشخص', () => {
  const sessions = [
    makeSession({ date: '2026-11-07', minutes: 30 }),
    makeSession({ date: '2026-11-07', minutes: 20, hour: 15 }),
    makeSession({ date: '2026-11-12', minutes: 45 }),
    makeSession({ date: '2026-11-12', minutes: 5, mode: 'short_break' }),
    makeSession({ date: '2026-11-06', minutes: 99 }), // هفته‌ی قبل
  ];
  const s = buildProgressStats([], sessions, today);
  assert.equal(s.weekStart, '2026-11-07');
  assert.equal(s.week.length, 7);
  assert.deepEqual(s.week.map((d) => d.minutes), [50, 0, 0, 0, 0, 45, 0]); // شنبه ... جمعه؛ پنجشنبه = اندیس ۵
  assert.equal(s.week[5].date, '2026-11-12');
  assert.equal(s.week[5].isToday, true);
  assert.equal(s.week[6].isFuture, true);
  assert.equal(s.weekMinutes, 95);
  assert.equal(s.maxDayMinutes, 50);
});

test('مجموع تمرکز همه‌ی زمان‌ها و تعداد تکلیف تکمیل‌شده (بدون حذف‌شده‌ها)', () => {
  const sessions = [
    makeSession({ date: '2026-10-01', minutes: 60 }),
    makeSession({ date: today, minutes: 25 }),
    makeSession({ date: today, minutes: 5, mode: 'long_break' }),
  ];
  const tasks = [
    makeTask({ date: today, completed: true, completedAt: new Date(2026, 10, 12, 9).toISOString() }),
    makeTask({ date: '2026-10-02', completed: true, completedAt: new Date(2026, 9, 2, 9).toISOString() }),
    makeTask({ date: today, completed: true, deleted: true, completedAt: new Date(2026, 10, 12, 9).toISOString() }),
    makeTask({ date: today }),
  ];
  const s = buildProgressStats(tasks, sessions, today);
  assert.equal(s.totalFocusMinutes, 85);
  assert.equal(s.completedTasks, 2);
  assert.equal(s.completedThisWeek, 1);
});

test('میانگین روزانه: ۷ روز اخیر، و برای کاربر تازه از اولین روز مطالعه', () => {
  assert.equal(buildProgressStats([], [], today).dailyAverageMinutes, 0);
  // اولین مطالعه امروز است: تقسیم بر ۱ روز
  assert.equal(buildProgressStats([], [makeSession({ date: today, minutes: 30 })], today).dailyAverageMinutes, 30);
  // دو روز داده (پریروز و امروز) → تقسیم بر ۳ روز
  const three = [makeSession({ date: '2026-11-10', minutes: 60 }), makeSession({ date: today, minutes: 30 })];
  assert.equal(buildProgressStats([], three, today).dailyAverageMinutes, 30);
  // مطالعه‌ی ۱۰ روز پیش خارج از پنجره است: ۷۰ دقیقه‌ی امروز / ۷
  const old = [makeSession({ date: '2026-11-02', minutes: 500 }), makeSession({ date: today, minutes: 70 })];
  assert.equal(buildProgressStats([], old, today).dailyAverageMinutes, 10);
});

test('استمرار: روزهای پیاپی، امروز خالی از دیروز حساب می‌شود، شکاف قطعش می‌کند', () => {
  const days = (...d: string[]) => new Set(d);
  assert.equal(computeStreak(days(), today), 0);
  assert.equal(computeStreak(days('2026-11-12', '2026-11-11', '2026-11-10'), today), 3);
  assert.equal(computeStreak(days('2026-11-11', '2026-11-10'), today), 2); // امروز هنوز شروع نشده
  assert.equal(computeStreak(days('2026-11-12', '2026-11-10'), today), 1); // شکاف
  assert.equal(computeStreak(days('2026-11-10', '2026-11-09'), today), 0); // دیروز هم نبوده
});

test('استمرار از جلسه‌ی تمرکز و تکلیف تکمیل‌شده ساخته می‌شود، جلسه‌ی زیر یک دقیقه نه', () => {
  const sessions = [
    makeSession({ date: today, minutes: 0.5 }), // ۳۰ ثانیه
    makeSession({ date: '2026-11-11', minutes: 10 }),
  ];
  const tasks = [makeTask({ date: '2026-11-10', completed: true, completedAt: new Date(2026, 10, 10, 20).toISOString() })];
  const s = buildProgressStats(tasks, sessions, today);
  assert.equal(s.streak, 2); // دیروز + پریروز (از تکلیف)؛ امروز فعال نیست
});

test('درصد پیشرفت هفتگی', () => {
  const tasks = [
    makeTask({ date: '2026-11-08', completed: true }),
    makeTask({ date: '2026-11-09', completed: true }),
    makeTask({ date: '2026-11-13' }),
    makeTask({ date: '2026-11-13' }),
    makeTask({ date: '2026-11-01', completed: true }), // هفته‌ی قبل
    makeTask({ date: '2026-11-09', deleted: true }),
  ];
  const s = buildProgressStats(tasks, [], today);
  assert.equal(s.weeklyTotal, 4);
  assert.equal(s.weeklyDone, 2);
  assert.equal(s.weeklyPercent, 50);
  assert.equal(buildProgressStats([], [], today).weeklyPercent, 0);
});

test('شش تم رنگی با نام و رنگ معتبر', () => {
  assert.deepEqual(ACCENTS.map((a) => a.label), ['ایندیگو', 'زمردی', 'رز', 'بنفش', 'اقیانوسی', 'کهربایی']);
  assert.equal(new Set(ACCENTS.map((a) => a.id)).size, 6);
  for (const a of ACCENTS) {
    for (const hex of [a.main, a.p50, a.p100, a.p600, a.p700, a.secondary]) assert.match(hex, /^#[0-9A-F]{6}$/);
    assert.ok(isAccentId(a.id));
  }
  assert.equal(isAccentId('pink'), false);
  assert.equal(hexToChannels('#536DFE'), '83 109 254');
});

test('نقشه‌ی حرارتی و زمان تمرکز به تفکیک درس', async () => {
  const { buildActivityHeatmap, focusMinutesBySubject } = await import('../src/features/analytics/stats.ts');
  const math = makeTask({ id: 'math-subject', date: today, subject: 'ریاضی' });
  const science = makeTask({ id: 'science-subject', date: today, subject: 'علوم' });
  const sessions = [
    { ...makeSession({ date: today, minutes: 30 }), taskId: math.id },
    { ...makeSession({ date: today, minutes: 15 }), taskId: science.id },
  ];
  const heat = buildActivityHeatmap([], sessions, today, 7);
  assert.equal(heat.length, 7);
  assert.equal(heat[6].active, true);
  assert.equal(heat[6].minutes, 45);
  assert.deepEqual(focusMinutesBySubject([math, science], sessions), [
    { subject: 'ریاضی', minutes: 30 }, { subject: 'علوم', minutes: 15 },
  ]);
});
