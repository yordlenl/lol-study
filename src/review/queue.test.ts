import { describe, expect, it } from 'vitest';
import { log, sentence, word } from './fixtures.ts';
import { buildQueue } from './queue.ts';

const at = (d: number, h: number) => new Date(2026, 9, d, h);
const NOW = at(23, 21);

describe('今天要複習的卡', () => {
  it('到期的複習卡：排定時間在明天凌晨 4 點以前都算今天，依到期時間排序', () => {
    const cards = [word('due-night', { due: at(24, 2) }), word('due-morning', { due: at(23, 9) }), word('later', { due: at(24, 5) })];
    const q = buildQueue(cards, [], 20, NOW);
    expect(q.due.map((c) => (c.kind === 'word' ? c.lemma : ''))).toEqual(['due-morning', 'due-night']);
  });

  it('句子卡也進複習，並分開計數', () => {
    const q = buildQueue([word('orb', { due: at(23, 8) }), sentence('Ahri heals.', { due: at(23, 9) })], [], 20, NOW);
    expect(q.due).toHaveLength(2);
    expect([q.dueWords, q.dueSentences]).toEqual([1, 1]);
  });

  it('新卡：單字卡和句子卡合計，依收藏先後，扣掉今天已學的，不超過每日上限', () => {
    const cards = [word('a', { addedAt: at(1, 12) }), sentence('Second card here.', { addedAt: at(2, 12) }), word('c', { addedAt: at(3, 12) }), word('d', { addedAt: at(4, 12) })];
    const logs = [log('word:old', at(23, 9), 3, { wasNew: true }), log('word:older', at(22, 9), 3, { wasNew: true })];
    const q = buildQueue(cards, logs, 3, NOW);
    expect(q.newLearnedToday).toBe(1);
    expect(q.newLeftToday).toBe(2);
    expect(q.fresh.map((c) => c.id)).toEqual(['word:a', 'sentence:spell:Ahri/Q:Second card here.']);
    expect(q.newTotal).toBe(4);
  });
});
