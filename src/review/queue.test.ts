import { describe, expect, it } from 'vitest';
import { log, sentence, word } from './fixtures.ts';
import { buildQueue } from './queue.ts';

const at = (d: number, h: number) => new Date(2026, 9, d, h);
const NOW = at(23, 21);

describe('今天要複習的卡', () => {
  it('到期的複習卡：排定時間在明天凌晨 4 點以前都算今天', () => {
    const cards = [word('due-morning', { due: at(23, 9) }), word('due-night', { due: at(24, 2) }), word('later', { due: at(24, 5) })];
    const q = buildQueue(cards, [], 20, NOW);
    expect(q.dueWords.map((c) => c.lemma)).toEqual(['due-morning', 'due-night']);
  });

  it('新卡依收藏先後，扣掉今天已學的，不超過每日上限', () => {
    const cards = [1, 2, 3, 4, 5].map((n) => word(`new${n}`, { addedAt: at(n, 12) }));
    const logs = [log('word:old', at(23, 9), 3, { wasNew: true }), log('word:older', at(22, 9), 3, { wasNew: true })];
    const q = buildQueue(cards, logs, 3, NOW);
    expect(q.newLearnedToday).toBe(1);
    expect(q.newLeftToday).toBe(2);
    expect(q.newWords.map((c) => c.lemma)).toEqual(['new1', 'new2']);
    expect(q.newWordsTotal).toBe(5);
  });

  it('句子卡只計數，不放進單字複習', () => {
    const q = buildQueue([sentence('Ahri heals.', { due: at(23, 8) }), sentence('New one.')], [], 20, NOW);
    expect(q.dueWords).toEqual([]);
    expect(q.dueSentences).toBe(1);
    expect(q.newSentences).toBe(1);
  });
});
