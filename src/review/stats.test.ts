import { describe, expect, it } from 'vitest';
import { log, word } from './fixtures.ts';
import { accuracy, mostMissed, streak } from './stats.ts';

const at = (d: number, h: number) => new Date(2026, 9, d, h);

describe('連續學習天數', () => {
  it('今天有複習：從今天往回算', () => {
    const logs = [log('a', at(21, 10), 3), log('a', at(22, 10), 3), log('a', at(23, 10), 3)];
    expect(streak(logs, at(23, 22))).toBe(3);
  });

  it('今天還沒複習：從昨天往回算，不會變成 0', () => {
    expect(streak([log('a', at(21, 10), 3), log('a', at(22, 10), 3)], at(23, 22))).toBe(2);
  });

  it('中間斷一天就重新算；凌晨 2 點複習算前一天', () => {
    const logs = [log('a', at(20, 10), 3), log('a', at(23, 2), 3)];
    expect(streak(logs, at(23, 3))).toBe(1);
  });
});

describe('正確率與最常錯的詞', () => {
  it('只算近 30 天；用了提示才答對不算一次寫對', () => {
    const logs = [
      log('a', at(23, 10), 3),
      log('a', at(22, 10), 2, { hinted: true }),
      log('a', at(21, 10), 1),
      log('a', new Date(2026, 7, 1), 3),
    ];
    expect(accuracy(logs, at(23, 22))).toEqual({ correct: 1, total: 3 });
  });

  it('練習寫錯自動記的不算進正確率', () => {
    const logs = [log('a', at(23, 10), 3), log('b', at(23, 11), 1, { source: 'practice' })];
    expect(accuracy(logs, at(23, 22))).toEqual({ correct: 1, total: 1 });
  });

  it('依答錯次數排序，只列單字卡', () => {
    const cards = [word('orb'), word('heal'), word('fox')];
    const logs = [log('word:orb', at(20, 1), 1), log('word:heal', at(20, 1), 1), log('word:heal', at(21, 1), 1), log('word:fox', at(21, 1), 3)];
    expect(mostMissed(cards, logs).map((m) => [m.card.lemma, m.misses])).toEqual([
      ['heal', 2],
      ['orb', 1],
    ]);
  });
});
