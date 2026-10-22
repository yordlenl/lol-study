import { describe, expect, it } from 'vitest';
import { describeMeta, pickRandom, PUBLISHED_SHARED_URL, sharedModuleUrl } from './corpus.ts';

describe('共用模組的網址', () => {
  it('正式網站：和語料庫同網域，用路徑', () => {
    expect(sharedModuleUrl({ DEV: false })).toBe('/lol-corpus/shared/lol-shared.js');
  });

  it('在 Mac 上開發：預設載入已發布的語料庫', () => {
    expect(sharedModuleUrl({ DEV: true })).toBe(PUBLISHED_SHARED_URL);
  });

  it('可以指定本機的語料庫', () => {
    expect(sharedModuleUrl({ DEV: true, VITE_SHARED_URL: 'http://localhost:5173/x.js' })).toBe('http://localhost:5173/x.js');
  });
});

describe('隨機挑一個', () => {
  it('依亂數挑', () => {
    expect(pickRandom(['a', 'b', 'c'], () => 0)).toBe('a');
    expect(pickRandom(['a', 'b', 'c'], () => 0.99)).toBe('c');
  });

  it('空清單會報錯', () => {
    expect(() => pickRandom([])).toThrow('清單是空的');
  });
});

describe('首頁的連線說明', () => {
  it('顯示版本、英雄數、台詞數', () => {
    const meta = { schema: 1, ddragon: '16.21.1', cdragon: '16.21', generatedAt: '', counts: { champions: 173, quotes: 346 } };
    expect(describeMeta(meta)).toBe('已連上語料庫：遊戲資料版本 16.21.1・英雄 173 位・台詞 346 句');
  });
});
