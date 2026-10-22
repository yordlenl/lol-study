import { describe, expect, it } from 'vitest';
import { daysBetween, describeDue, nextStudyDayStart, studyDayKey, studyDayStart } from './days.ts';

// 一律用當地時間建立日期，測試不受電腦時區影響
const at = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m);

describe('一天從凌晨 4 點算起', () => {
  it('凌晨 3:59 還算前一天，4:00 換新的一天', () => {
    expect(studyDayKey(at(23, 3, 59))).toBe('2026-10-22');
    expect(studyDayKey(at(23, 4, 0))).toBe('2026-10-23');
    expect(studyDayStart(at(23, 1))).toEqual(at(22, 4));
    expect(nextStudyDayStart(at(23, 1))).toEqual(at(23, 4));
  });

  it('相差天數以凌晨 4 點換日', () => {
    expect(daysBetween(at(23, 23), at(24, 2))).toBe(0);
    expect(daysBetween(at(23, 23), at(24, 5))).toBe(1);
  });

  it('下次複習日期的說明', () => {
    const now = at(23, 10);
    expect(describeDue(at(23, 20).toISOString(), now)).toBe('10/23（今天）');
    expect(describeDue(at(24, 10).toISOString(), now)).toBe('10/24（明天）');
    expect(describeDue(at(26, 10).toISOString(), now)).toBe('10/26（3 天後）');
  });
});
