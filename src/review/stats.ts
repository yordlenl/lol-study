// 首頁的統計：連續學習天數、正確率、最常錯的詞。
import type { ReviewLog, StudyCard, WordCard } from '../lol-shared-types.ts';
import { studyDayKey, studyDayStart } from './days.ts';

/** 連續學習天數：今天還沒複習的話，從昨天往回算 */
export function streak(logs: ReviewLog[], now: Date): number {
  const days = new Set(logs.map((l) => studyDayKey(new Date(l.reviewedAt))));
  const day = studyDayStart(now);
  if (!days.has(studyDayKey(day))) day.setDate(day.getDate() - 1);
  let count = 0;
  while (days.has(studyDayKey(day))) {
    count++;
    day.setDate(day.getDate() - 1);
  }
  return count;
}

/** 正確率：近 N 天的複習裡，沒用提示就答對（Good 以上）的比例。練習、隨機挑戰寫錯自動記的不算。 */
export function accuracy(logs: ReviewLog[], now: Date, days = 30): { correct: number; total: number } {
  const since = studyDayStart(now);
  since.setDate(since.getDate() - (days - 1));
  const recent = logs.filter((l) => (!l.source || l.source === 'review') && new Date(l.reviewedAt) >= since);
  return { correct: recent.filter((l) => l.rating >= 3 && !l.hinted).length, total: recent.length };
}

/** 最常錯的單字（答錯次數由多到少） */
export function mostMissed(cards: StudyCard[], logs: ReviewLog[], limit = 5): Array<{ card: WordCard; misses: number }> {
  const misses = new Map<string, number>();
  for (const l of logs) if (l.rating === 1) misses.set(l.cardId, (misses.get(l.cardId) ?? 0) + 1);
  return cards
    .filter((c): c is WordCard => c.kind === 'word' && (misses.get(c.id) ?? 0) > 0)
    .map((card) => ({ card, misses: misses.get(card.id)! }))
    .sort((a, b) => b.misses - a.misses || a.card.lemma.localeCompare(b.card.lemma))
    .slice(0, limit);
}

/** 每張卡答錯幾次 */
export function missCounts(logs: ReviewLog[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const l of logs) if (l.rating === 1) counts.set(l.cardId, (counts.get(l.cardId) ?? 0) + 1);
  return counts;
}
