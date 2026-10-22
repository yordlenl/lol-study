import { describe, expect, it, vi } from 'vitest';
import type { SharedModule } from '../lol-shared-types.ts';
import { recordPractice } from './outcome.ts';
import type { Question } from './types.ts';

function fakeShared() {
  const addSentence = vi.fn(async (input: { unit: { text: { en: string } } }) => ({ id: `sentence:${input.unit.text.en}` }));
  const recordReview = vi.fn(async () => ({}));
  return { shared: { collection: { addSentence }, recordReview } as unknown as SharedModule, addSentence, recordReview };
}

const question: Question = {
  mode: 'translate',
  block: { id: 'q', source: { type: 'quote', id: 'Jinx/base/pick-1' }, text: { en: 'Hi there.', zh_TW: '嗨', zh_CN: '嗨' }, view: { type: 'plain', label: '' }, audio: 'https://wiki.leagueoflegends.com/a.mp3', whole: true },
  text: { en: 'Hi there.', zh_TW: '嗨', zh_CN: '嗨' },
};

describe('練習結果進複習', () => {
  it('答對不影響排程', async () => {
    const f = fakeShared();
    expect(await recordPractice(f.shared, question, { correct: true, hinted: false, wrongUnits: [] })).toBe(0);
    expect(f.addSentence).not.toHaveBeenCalled();
    expect(f.recordReview).not.toHaveBeenCalled();
  });

  it('寫錯：收進句子庫（整句時連原聲），記一次寫錯並標成練習', async () => {
    const f = fakeShared();
    const unit = { text: question.text, alignment: 'sentence' as const };
    expect(await recordPractice(f.shared, question, { correct: false, hinted: true, wrongUnits: [unit] })).toBe(1);
    expect(f.addSentence).toHaveBeenCalledWith({ unit, source: question.block.source, audio: 'https://wiki.leagueoflegends.com/a.mp3' });
    expect(f.recordReview).toHaveBeenCalledWith({ id: 'sentence:Hi there.' }, { rating: 1, mode: 'translate', hinted: true, source: 'practice' });
  });
});
