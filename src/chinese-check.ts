// 簡體字檢查（測試用）。和語料庫 scripts/data/chinese.ts 的做法相同：
// OpenCC 簡轉繁字表裡會被換掉的字，扣掉在任何繁體詞句或台灣字形裡出現過的字。
import * as OpenCC from 'opencc-js';

const pairs = (dict: string) =>
  dict
    .split('|')
    .filter(Boolean)
    .map((p) => p.split(' ') as [string, string]);

const SIMPLIFIED_ONLY: Set<string> = (() => {
  const [[stPhrases, stChars]] = OpenCC.Locale.from.cn as unknown as [[string, string]];
  const [[tsPhrases, tsChars]] = OpenCC.Locale.to.cn as unknown as [[string, string]];
  const [[, twChars]] = OpenCC.Locale.from.tw as unknown as [[string, string]];
  const traditional = new Set<string>();
  for (const [, t] of [...pairs(stPhrases), ...pairs(stChars)]) for (const ch of t) traditional.add(ch);
  for (const [t] of [...pairs(tsPhrases), ...pairs(tsChars), ...pairs(twChars)]) for (const ch of t) traditional.add(ch);
  return new Set(pairs(stChars).filter(([s, t]) => s !== t && !traditional.has(s)).map(([s]) => s));
})();

export function findSimplified(text: string): string[] {
  const found = new Set<string>();
  for (const ch of text) if (SIMPLIFIED_ONLY.has(ch)) found.add(ch);
  return [...found];
}
