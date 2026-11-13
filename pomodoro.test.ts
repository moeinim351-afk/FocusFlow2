import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../src/features/pomodoro/timer.ts';

const S = { focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15 };
const MIN = 60_000;
const t0 = 1_700_000_000_000;

test('شروع، توقف و ادامه با برچسب زمانی', () => {
  let s = T.start(T.createIdle('focus', S), t0);
  assert.equal(T.remainingMs(s, t0 + 5 * MIN), 20 * MIN);
  s = T.pause(s, t0 + 5 * MIN);
  assert.equal(s.status, 'paused');
  // در حالت مکث زمان نمی‌گذرد
  assert.equal(T.remainingMs(s, t0 + 60 * MIN), 20 * MIN);
  s = T.resume(s, t0 + 60 * MIN);
  assert.equal(T.remainingMs(s, t0 + 70 * MIN), 10 * MIN);
});

test('رفرش صفحه: بازیابی از حالت ذخیره‌شده بدون خطا', () => {
  let s = T.start(T.createIdle('focus', S), t0);
  const restored = T.parseStoredTimer(JSON.stringify(s))!;
  assert.equal(T.remainingMs(restored, t0 + 10 * MIN), 15 * MIN);
  s = T.pause(s, t0 + 3 * MIN);
  const restoredPaused = T.parseStoredTimer(JSON.stringify(s))!;
  assert.equal(T.remainingMs(restoredPaused, t0 + 999 * MIN), 22 * MIN);
  assert.equal(T.parseStoredTimer('{bad json'), null);
  assert.equal(T.parseStoredTimer(null), null);
});

test('بازنشانی جلسه‌ی ناتمام را کامل حساب نمی‌کند', () => {
  let s = T.start(T.createIdle('focus', S), t0);
  s = T.reset(s, S);
  assert.equal(s.status, 'idle');
  const r = T.tick(s, t0 + 100 * MIN, S);
  assert.equal(r.completed, null);
  assert.equal(s.focusCompleted, 0);
});

test('تیک قبل از پایان چیزی ثبت نمی‌کند و بعد از پایان ثبت می‌کند', () => {
  const s = T.start(T.createIdle('focus', S, 0, 'task-1'), t0);
  assert.equal(T.tick(s, t0 + 24 * MIN, S).completed, null);
  const r = T.tick(s, t0 + 25 * MIN, S);
  assert.ok(r.completed);
  assert.equal(r.completed!.plannedSeconds, 1500);
  assert.equal(r.completed!.taskId, 'task-1');
  assert.equal(r.state.mode, 'short_break');
  assert.equal(r.state.focusCompleted, 1);
  assert.equal(r.state.status, 'idle');
});

test('اتمام هنگام بسته بودن صفحه: زمان پایان واقعی ثبت می‌شود', () => {
  const s = T.start(T.createIdle('focus', S), t0);
  const r = T.tick(s, t0 + 90 * MIN, S);
  assert.ok(r.completed);
  assert.equal(new Date(r.completed!.endedAt).getTime(), t0 + 25 * MIN);
});

test('استراحت بلند بعد از چهار جلسه‌ی تمرکز', () => {
  let s = T.createIdle('focus', S);
  let now = t0;
  const modes: string[] = [];
  for (let i = 0; i < 4; i++) {
    s = T.start(s, now);
    now += 25 * MIN;
    s = T.tick(s, now, S).state;
    modes.push(s.mode);
    if (i < 3) {
      s = T.start(s, now);
      now += 5 * MIN;
      s = T.tick(s, now, S).state; // برگشت به تمرکز
    }
  }
  assert.deepEqual(modes, ['short_break', 'short_break', 'short_break', 'long_break']);
  // بعد از استراحت بلند چرخه ریست می‌شود
  s = T.start(s, now);
  now += 15 * MIN;
  const r = T.tick(s, now, S);
  assert.equal(r.state.mode, 'focus');
  assert.equal(r.state.focusCompleted, 0);
});

test('ساعت سیستم عقب برود زمان باقی‌مانده بیشتر از کل نمی‌شود', () => {
  const s = T.start(T.createIdle('focus', S), t0);
  assert.equal(T.remainingMs(s, t0 - 10 * MIN), 25 * MIN);
});

test('تغییر حالت فقط در حالت idle مجاز است', () => {
  const running = T.start(T.createIdle('focus', S), t0);
  assert.equal(T.switchMode(running, 'long_break', S).mode, 'focus');
  assert.equal(T.switchMode(T.createIdle('focus', S), 'long_break', S).mode, 'long_break');
});
