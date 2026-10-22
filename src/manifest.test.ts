import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ORIGIN = 'https://yordlenl.github.io';
const MANIFEST_URL = `${ORIGIN}/lol-study/manifest.webmanifest`;
const manifest = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'));
const resolve = (path: string) => new URL(path, MANIFEST_URL).href;

describe('主畫面 App 設定', () => {
  it('從主畫面打開時進入學習 App', () => {
    expect(resolve(manifest.start_url)).toBe(`${ORIGIN}/lol-study/`);
  });

  it('範圍涵蓋語料庫和學習 App，切換網站時留在同一個 App 裡', () => {
    const scope = resolve(manifest.scope);
    expect(`${ORIGIN}/lol-corpus/`.startsWith(scope)).toBe(true);
    expect(`${ORIGIN}/lol-study/`.startsWith(scope)).toBe(true);
  });

  it('列出的圖示檔案都存在', () => {
    for (const icon of manifest.icons) {
      expect(existsSync(new URL(`../public/${icon.src}`, import.meta.url))).toBe(true);
    }
  });
});
