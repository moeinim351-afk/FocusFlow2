import { useMemo } from 'react';
import { isValidISO, todayISO } from '../utils/date.ts';
import { daysInJalaliMonth, isoToJalali, jalaliToIso, JALALI_MONTHS } from '../utils/jalali.ts';
import { fa } from '../utils/format.ts';

/** انتخاب تاریخ شمسی با سه لیست کشویی؛ مقدار بیرونی همچنان ISO میلادی (yyyy-MM-dd) است. */
export function JalaliDateInput({ value, onChange, id }: { value: string; onChange: (iso: string) => void; id?: string }) {
  const j = isoToJalali(isValidISO(value) ? value : todayISO());
  const thisYear = isoToJalali(todayISO()).jy;
  const years = useMemo(() => {
    const from = Math.min(thisYear - 1, j.jy);
    const to = Math.max(thisYear + 5, j.jy);
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  }, [thisYear, j.jy]);
  const dayCount = daysInJalaliMonth(j.jy, j.jm);

  const update = (jy: number, jm: number, jd: number) => onChange(jalaliToIso(jy, jm, Math.min(jd, daysInJalaliMonth(jy, jm))));

  return (
    <div className="grid grid-cols-[1fr_1.6fr_1.2fr] gap-2" role="group" aria-label="تاریخ شمسی">
      <select id={id} className="input !px-2" value={j.jd} onChange={(e) => update(j.jy, j.jm, Number(e.target.value))} aria-label="روز">
        {Array.from({ length: dayCount }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{fa(d).replace(/٬/g, '')}</option>)}
      </select>
      <select className="input !px-2" value={j.jm} onChange={(e) => update(j.jy, Number(e.target.value), j.jd)} aria-label="ماه">
        {JALALI_MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
      </select>
      <select className="input !px-2" value={j.jy} onChange={(e) => update(Number(e.target.value), j.jm, j.jd)} aria-label="سال">
        {years.map((y) => <option key={y} value={y}>{fa(y).replace(/٬/g, '')}</option>)}
      </select>
    </div>
  );
}
