// 今天要複習哪些卡：先出到期的複習卡，再出新卡（依收藏先後，每天有上限）。
// 句子卡在第三階段只計數，複習等第四階段的練習模式。
import type { ReviewLog, StudyCard, WordCard } from '../lol-shared-types.ts';
import { nextStudyDayStart, studyDayStart } from './days.ts';

/** FSRS 的新卡狀態 */
const STATE_NEW = 0;

export const isNew = (card: StudyCard) => card.fsrs.state === STATE_NEW;

/** 到期：排定的時間在下一天開始之前 */
export const isDue = (card: StudyCard, now: Date) => !isNew(card) && new Date(card.fsrs.due) < nextStudyDayStart(now);

export interface Queue {
  dueWords: WordCard[];
  newWords: WordCard[];
  /** 新單字卡總數（含今天上限以外的） */
  newWordsTotal: number;
  /** 今天已經學過的新卡數 */
  newLearnedToday: number;
  /** 今天還可以學幾張新卡 */
  newLeftToday: number;
  dueSentences: number;
  newSentences: number;
}

export function buildQueue(cards: StudyCard[], logs: ReviewLog[], dailyNew: number, now: Date): Queue {
  const words = cards.filter((c): c is WordCard => c.kind === 'word');
  const sentences = cards.filter((c) => c.kind === 'sentence');
  const dayStart = studyDayStart(now).toISOString();
  const learnedToday = new Set(logs.filter((l) => l.wasNew && l.reviewedAt >= dayStart).map((l) => l.cardId));
  const newLeftToday = Math.max(0, dailyNew - learnedToday.size);
  const allNew = words.filter(isNew).sort((a, b) => a.addedAt.localeCompare(b.addedAt));
  return {
    dueWords: words.filter((c) => isDue(c, now)).sort((a, b) => a.fsrs.due.localeCompare(b.fsrs.due)),
    newWords: allNew.slice(0, newLeftToday),
    newWordsTotal: allNew.length,
    newLearnedToday: learnedToday.size,
    newLeftToday,
    dueSentences: sentences.filter((c) => isDue(c, now)).length,
    newSentences: sentences.filter(isNew).length,
  };
}
