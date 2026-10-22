// 今天要複習哪些卡：先出到期的複習卡（單字卡、句子卡），再出新卡（依收藏先後，單字卡和句子卡合計，每天有上限）。
import type { ReviewLog, StudyCard } from '../lol-shared-types.ts';
import { nextStudyDayStart, studyDayStart } from './days.ts';

/** FSRS 的新卡狀態 */
const STATE_NEW = 0;

export const isNew = (card: StudyCard) => card.fsrs.state === STATE_NEW;

/** 到期：排定的時間在下一天開始之前 */
export const isDue = (card: StudyCard, now: Date) => !isNew(card) && new Date(card.fsrs.due) < nextStudyDayStart(now);

export interface Queue {
  /** 到期的複習卡，依到期時間排序 */
  due: StudyCard[];
  /** 今天要學的新卡（上限以內） */
  fresh: StudyCard[];
  dueWords: number;
  dueSentences: number;
  /** 新卡總數（含今天上限以外的） */
  newTotal: number;
  /** 今天已經學過的新卡數 */
  newLearnedToday: number;
  /** 今天還可以學幾張新卡 */
  newLeftToday: number;
}

export function buildQueue(cards: StudyCard[], logs: ReviewLog[], dailyNew: number, now: Date): Queue {
  const dayStart = studyDayStart(now).toISOString();
  const learnedToday = new Set(logs.filter((l) => l.wasNew && l.reviewedAt >= dayStart).map((l) => l.cardId));
  const newLeftToday = Math.max(0, dailyNew - learnedToday.size);
  const allNew = cards.filter(isNew).sort((a, b) => a.addedAt.localeCompare(b.addedAt));
  const due = cards.filter((c) => isDue(c, now)).sort((a, b) => a.fsrs.due.localeCompare(b.fsrs.due));
  return {
    due,
    fresh: allNew.slice(0, newLeftToday),
    dueWords: due.filter((c) => c.kind === 'word').length,
    dueSentences: due.filter((c) => c.kind === 'sentence').length,
    newTotal: allNew.length,
    newLearnedToday: learnedToday.size,
    newLeftToday,
  };
}
