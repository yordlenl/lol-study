// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { sentence, word } from '../../review/fixtures.ts';
import { matchesCard } from './words.ts';

describe('生詞本搜尋', () => {
  it('單字卡：英文、原形、釋義都搜得到', () => {
    expect(matchesCard(word('minion'), 'MIN')).toBe(true);
    expect(matchesCard(word('minion'), '奴才', 'n. 奴才, 寵臣')).toBe(true);
    expect(matchesCard(word('minion'), 'fox')).toBe(false);
  });

  it('句子卡：英文和中文都搜得到', () => {
    expect(matchesCard(sentence('Ahri heals.'), 'heals')).toBe(true);
    expect(matchesCard(sentence('Ahri heals.'), '甲')).toBe(true);
  });
});
