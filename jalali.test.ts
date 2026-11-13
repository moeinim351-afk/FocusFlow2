import test from 'node:test';
import assert from 'node:assert/strict';
import { daysInJalaliMonth, isoToJalali, jalaliToIso } from '../src/utils/jalali.ts';

test('تبدیل میلادی به شمسی (تاریخ‌های مرجع)', () => {
  assert.deepEqual(isoToJalali('2026-03-21'), { jy: 1405, jm: 1, jd: 1 });
  assert.deepEqual(isoToJalali('2025-03-21'), { jy: 1404, jm: 1, jd: 1 });
  assert.deepEqual(isoToJalali('2025-03-20'), { jy: 1403, jm: 12, jd: 30 }); // سال کبیسه
  assert.deepEqual(isoToJalali('2026-11-12'), { jy: 1405, jm: 8, jd: 21 });
});

test('تبدیل شمسی به میلادی و رفت‌وبرگشت', () => {
  assert.equal(jalaliToIso(1405, 1, 1), '2026-03-21');
  assert.equal(jalaliToIso(1403, 12, 30), '2025-03-20');
  for (let i = 0; i < 4000; i++) {
    const d = new Date(2020, 0, 1 + i, 12);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const j = isoToJalali(iso);
    assert.equal(jalaliToIso(j.jy, j.jm, j.jd), iso);
  }
});

test('تعداد روزهای ماه شمسی', () => {
  assert.equal(daysInJalaliMonth(1405, 1), 31);
  assert.equal(daysInJalaliMonth(1405, 7), 30);
  assert.equal(daysInJalaliMonth(1403, 12), 30);
  assert.equal(daysInJalaliMonth(1404, 12), 29);
});
