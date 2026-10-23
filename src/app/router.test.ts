import { describe, expect, it } from 'vitest';
import { parseHash } from './router.ts';

describe('網址與頁面', () => {
  it('解析各頁網址', () => {
    expect(parseHash('')).toEqual({ page: 'home' });
    expect(parseHash('#/review')).toEqual({ page: 'review' });
    expect(parseHash('#/words')).toEqual({ page: 'words', tab: 'word' });
    expect(parseHash('#/words/sentences')).toEqual({ page: 'words', tab: 'sentence' });
    expect(parseHash('#/settings')).toEqual({ page: 'settings' });
  });

  it('練習：類別 → 項目 → 模式', () => {
    expect(parseHash('#/practice')).toEqual({ page: 'practice' });
    expect(parseHash('#/practice/skills')).toEqual({ page: 'practice-items', category: 'skills' });
    expect(parseHash('#/practice/skills/Ahri')).toEqual({ page: 'practice-modes', category: 'skills', id: 'Ahri' });
    expect(parseHash('#/practice/quotes/random/dictation')).toEqual({ page: 'practice-session', category: 'quotes', id: 'random', mode: 'dictation' });
    expect(parseHash('#/practice/nonsense')).toEqual({ page: 'practice' });
    expect(parseHash('#/practice/skills/Ahri/bad')).toEqual({ page: 'practice-modes', category: 'skills', id: 'Ahri' });
  });

  it('隨機挑戰：開始畫面與作答', () => {
    expect(parseHash('#/challenge')).toEqual({ page: 'challenge' });
    expect(parseHash('#/challenge/en2zh/all')).toEqual({ page: 'challenge-run', direction: 'en2zh', scope: 'all' });
    expect(parseHash('#/challenge/mixed/mine')).toEqual({ page: 'challenge-run', direction: 'mixed', scope: 'mine' });
    expect(parseHash('#/challenge/bad/all')).toEqual({ page: 'challenge' });
  });
});
