import { describe, expect, it } from 'vitest';
import { hintText, isCorrect, normalizeAnswer, ratingFor } from './grade.ts';

describe('評分規則', () => {
  it('不分大小寫、忽略標點和多餘空白', () => {
    expect(isCorrect('  Minion. ', ['minion'])).toBe(true);
    expect(isCorrect('Let me   end this!', ['Let me end this'])).toBe(true);
  });

  it('彎引號和直引號相同', () => {
    expect(normalizeAnswer('Don’t')).toBe(normalizeAnswer("don't"));
  });

  it('拼錯就算錯；空白答案算錯', () => {
    expect(isCorrect('invinsible', ['invincible'])).toBe(false);
    expect(isCorrect('   ', ['a'])).toBe(false);
  });

  it('原形或收藏時的字形都算對', () => {
    expect(isCorrect('minions', ['minion', 'minions'])).toBe(true);
  });
});

describe('自動評分對應', () => {
  it('一次寫對 Good、用了提示才寫對 Hard、寫錯 Again', () => {
    expect(ratingFor(true, 0)).toBe(3);
    expect(ratingFor(true, 1)).toBe(2);
    expect(ratingFor(true, 2)).toBe(2);
    expect(ratingFor(false, 0)).toBe(1);
  });

  it('提示：先給首字母，再給答案', () => {
    expect(hintText('heal', 1)).toBe('首字母：h＿＿＿');
    expect(hintText('heal', 2)).toBe('答案：heal');
  });
});
