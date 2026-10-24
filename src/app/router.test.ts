import { describe, expect, it } from 'vitest';
import { opensClientHome, parseHash } from './router.ts';

describe('網址與頁面', () => {
  it('主頁、複習、生詞本、設定', () => {
    expect(parseHash('#/home')).toEqual({ page: 'home' });
    expect(parseHash('#/review')).toEqual({ page: 'review' });
    expect(parseHash('#/words')).toEqual({ page: 'words', tab: 'word' });
    expect(parseHash('#/words/sentences')).toEqual({ page: 'words', tab: 'sentence' });
    expect(parseHash('#/settings')).toEqual({ page: 'settings' });
  });

  it('練習：類別和題型 → 確認 → 選要練哪一個 → 作答', () => {
    expect(parseHash('#/practice')).toEqual({ page: 'practice' });
    expect(parseHash('#/practice/skills')).toEqual({ page: 'practice', category: 'skills' });
    expect(parseHash('#/practice/skills/cloze')).toEqual({ page: 'practice-pick', category: 'skills', mode: 'cloze' });
    expect(parseHash('#/practice/champions/translate/random-names')).toEqual({
      page: 'practice-session',
      category: 'champions',
      mode: 'translate',
      id: 'random-names',
    });
    expect(parseHash('#/practice/nonsense')).toEqual({ page: 'practice' });
  });

  it('隨機挑戰：類別 → 確認 → 選方向 → 作答', () => {
    expect(parseHash('#/practice/items/challenge')).toEqual({ page: 'challenge-setup', category: 'items' });
    expect(parseHash('#/practice/items/challenge/en2zh')).toEqual({ page: 'challenge-run', category: 'items', direction: 'en2zh' });
    expect(parseHash('#/practice/items/challenge/bad')).toEqual({ page: 'challenge-setup', category: 'items' });
  });

  it('舊網址照樣能用', () => {
    expect(parseHash('#/practice/skills/Ahri/cloze')).toEqual({ page: 'practice-session', category: 'skills', mode: 'cloze', id: 'Ahri' });
    expect(parseHash('#/practice/quotes/random/dictation')).toEqual({ page: 'practice-session', category: 'champions', mode: 'dictation', id: 'random-quotes' });
    expect(parseHash('#/practice/mine')).toEqual({ page: 'practice' });
    expect(parseHash('#/challenge/en2zh/all')).toEqual({ page: 'practice' });
  });

  it('從主畫面打開（網址沒有 #…）先到客戶端首頁；從「開始」進來（#/home）不會被轉走', () => {
    expect(opensClientHome('')).toBe(true);
    expect(opensClientHome('#/')).toBe(true);
    expect(opensClientHome('#/home')).toBe(false);
    expect(opensClientHome('#/practice')).toBe(false);
  });
});
