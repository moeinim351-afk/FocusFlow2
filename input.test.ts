import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNumberInput, toEnglishDigits } from '../src/utils/digits.ts';
import { isNewerTimestamp } from '../src/utils/date.ts';
import { validateTaskInput } from '../src/features/tasks/taskLogic.ts';

test('تبدیل ارقام فارسی و عربی به لاتین', () => {
  assert.equal(toEnglishDigits('۰۱۲۳۴۵۶۷۸۹'), '0123456789');
  assert.equal(toEnglishDigits('٠١٢٣٤٥٦٧٨٩'), '0123456789');
  assert.equal(toEnglishDigits('abc ۲۵ x'), 'abc 25 x');
});

test('خواندن عدد از ورودی با هر نوع رقم', () => {
  assert.equal(parseNumberInput('۲۵'), 25);
  assert.equal(parseNumberInput(' 45 '), 45);
  assert.equal(parseNumberInput(30), 30);
  assert.ok(Number.isNaN(parseNumberInput('')));
  assert.ok(Number.isNaN(parseNumberInput('   ')));
  assert.ok(Number.isNaN(parseNumberInput('ab')));
  assert.equal(parseNumberInput('۱۲٫۵'), 12.5); // اعشار حفظ می‌شود تا اعتبارسنجی آن را رد کند
  assert.equal(parseNumberInput('۱٬۲۰۰'), 1200);
});

test('مدت تخمینی با ارقام فارسی معتبر است', () => {
  const ok = { title: 'ریاضی', description: '', date: '2026-11-12', time: '', priority: 'low' as const };
  assert.deepEqual(validateTaskInput({ ...ok, estimatedMinutes: '۴۵' }), {});
  assert.ok(validateTaskInput({ ...ok, estimatedMinutes: '' }).estimatedMinutes);
  assert.ok(validateTaskInput({ ...ok, estimatedMinutes: '۱' }).estimatedMinutes);
  assert.ok(validateTaskInput({ ...ok, estimatedMinutes: '۹۹۹' }).estimatedMinutes);
  assert.ok(validateTaskInput({ ...ok, estimatedMinutes: '۱۲٫۵' }).estimatedMinutes);
});

test('مقایسه‌ی برچسب زمانی قالب Postgres با قالب جاوااسکریپت', () => {
  const pg = '2026-11-12T08:15:00.123456+00:00';
  const js = '2026-11-12T08:15:00.123Z';
  assert.equal(isNewerTimestamp(pg, js), false); // برابر (تا میلی‌ثانیه) یعنی جدیدتر نیست
  assert.equal(isNewerTimestamp('2026-11-12T08:15:01+00:00', js), true);
  assert.equal(isNewerTimestamp('2026-11-12T08:14:59.999+00:00', js), false);
  assert.equal(isNewerTimestamp('2026-11-12T10:00:00+02:00', '2026-11-12T07:59:59.000Z'), true); // منطقه‌ی زمانی
  assert.equal(isNewerTimestamp('بد', 'بد'), false);
});
