import { describe, expect, it } from 'vitest';
import { PUBLISHED_SHARED_URL, sharedModuleUrl } from './corpus.ts';

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
