// 「一天」從凌晨 4 點算起：半夜打完遊戲再複習，還算同一天。

export const DAY_START_HOUR = 4;

/** 現在所屬這一天的開始（當地時間凌晨 4 點） */
export function studyDayStart(now: Date): Date {
  const start = new Date(now);
  start.setHours(DAY_START_HOUR, 0, 0, 0);
  if (now < start) start.setDate(start.getDate() - 1);
  return start;
}

/** 下一天的開始 */
export function nextStudyDayStart(now: Date): Date {
  const next = studyDayStart(now);
  next.setDate(next.getDate() + 1);
  return next;
}

/** 這一天的代號，例如 2026-10-23 */
export function studyDayKey(date: Date): string {
  const d = studyDayStart(date);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 相差幾天（以凌晨 4 點換日） */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((studyDayStart(to).getTime() - studyDayStart(from).getTime()) / 86_400_000);
}

/** 下次複習日期的說明，例如「10/26（3 天後）」 */
export function describeDue(dueIso: string, now: Date): string {
  const due = new Date(dueIso);
  const days = daysBetween(now, due);
  const day = studyDayStart(due);
  const date = `${day.getMonth() + 1}/${day.getDate()}`;
  if (days <= 0) return `${date}（今天）`;
  if (days === 1) return `${date}（明天）`;
  return `${date}（${days} 天後）`;
}
