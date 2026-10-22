// 練習結果怎麼進複習：寫錯的句子自動收進句子庫並記一次「寫錯」（明天複習）；答對不影響排程。
import type { SharedModule } from '../lol-shared-types.ts';
import type { Answer, Question } from './types.ts';

export async function recordPractice(shared: SharedModule, question: Question, answer: Answer): Promise<number> {
  if (answer.correct) return 0;
  const block = question.block;
  for (const unit of answer.wrongUnits) {
    const card = await shared.collection.addSentence({
      unit,
      source: block.source,
      // 整塊就是那一句（台詞、句子卡）才把原聲一起存
      ...(block.whole && block.audio ? { audio: block.audio } : {}),
    });
    await shared.recordReview(card, { rating: 1, mode: question.mode, hinted: answer.hinted, source: 'practice' });
  }
  return answer.wrongUnits.length;
}
