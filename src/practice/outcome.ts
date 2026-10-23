// 練習和隨機挑戰的結果怎麼進複習：寫錯的句子自動收進句子庫並記一次「寫錯」（明天複習）；答對不影響排程。
import type { LogSource, SentenceUnit, SharedModule, SourceRef } from '../lol-shared-types.ts';
import type { Answer, Question } from './types.ts';

type Origin = Exclude<LogSource, 'review'>;

/** 把寫錯的句子收進句子庫，並記一次寫錯；回傳收了幾句 */
export async function recordWrongUnits(
  shared: SharedModule,
  where: { source: SourceRef; audio?: string; whole?: boolean },
  units: SentenceUnit[],
  mode: string,
  hinted: boolean,
  origin: Origin,
): Promise<number> {
  for (const unit of units) {
    const card = await shared.collection.addSentence({
      unit,
      source: where.source,
      origin,
      // 整塊就是那一句（台詞、句子卡）才把原聲一起存
      ...(where.whole && where.audio ? { audio: where.audio } : {}),
    });
    await shared.recordReview(card, { rating: 1, mode, hinted, source: origin });
  }
  return units.length;
}

export async function recordPractice(shared: SharedModule, question: Question, answer: Answer, origin: Origin = 'practice'): Promise<number> {
  if (answer.correct) return 0;
  return recordWrongUnits(shared, question.block, answer.wrongUnits, question.mode, answer.hinted, origin);
}
