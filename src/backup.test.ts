import { describe, expect, it } from 'vitest';
import { backupFileName, summarizeBackup } from './backup.ts';
import { log, sentence, word } from './review/fixtures.ts';

describe('備份', () => {
  it('檔名帶日期時間', () => {
    expect(backupFileName(new Date(2026, 9, 23, 9, 5))).toBe('lol-english-備份-20261023-0905.json');
  });

  it('匯入前的摘要', () => {
    const file = { app: 'lol-english', formatVersion: 1, exportedAt: '2026-10-23T01:00:00.000Z', cards: [word('a'), word('b'), sentence('C d e.')], reviewLogs: [log('word:a', new Date(), 3)] };
    expect(summarizeBackup(file)).toEqual({ words: 2, sentences: 1, reviewLogs: 1, exportedAt: '2026-10-23T01:00:00.000Z' });
  });

  it('不是這個 App 的檔案會被擋下', () => {
    expect(() => summarizeBackup({ hello: 1 })).toThrow('這不是 LoL 英語的備份檔');
    expect(() => summarizeBackup(null)).toThrow('這不是 LoL 英語的備份檔');
  });
});
