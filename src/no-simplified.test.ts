// 介面文字沒有簡體字：掃描所有網頁程式（測試檔除外）與 index.html。
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { findSimplified } from './chinese-check.ts';

const ROOT = new URL('../', import.meta.url);

const files = [
  ...readdirSync(new URL('src/', ROOT), { recursive: true, encoding: 'utf8' })
    .filter((f) => /\.(ts|css)$/.test(f) && !/\.test\.ts$|fixtures\.ts$|chinese-check\.ts$/.test(f))
    .map((f) => `src/${f}`),
  'index.html',
];

describe('介面文字沒有簡體字', () => {
  it('抓得到簡體字（檢查本身正常）', () => {
    expect(findSimplified('这是学习页面')).toEqual(['这', '学', '习', '页']);
  });

  it.each(files)('%s', (file) => {
    expect(findSimplified(readFileSync(new URL(file, ROOT), 'utf8'))).toEqual([]);
  });
});
