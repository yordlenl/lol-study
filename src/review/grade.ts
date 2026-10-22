// 評分規則（spec）：不分大小寫；忽略標點和多餘空白；彎引號與直引號視為相同；其他一律精確比對。

export function normalizeAnswer(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”‟″]/g, '"')
    .replace(/\p{P}/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isCorrect(answer: string, accepted: string[]): boolean {
  const a = normalizeAnswer(answer);
  return a !== '' && accepted.some((x) => normalizeAnswer(x) === a);
}

/** 自動評分對應：一次寫對 Good(3)、用了提示才寫對 Hard(2)、寫錯 Again(1) */
export function ratingFor(correct: boolean, hintLevel: number): 1 | 2 | 3 {
  if (!correct) return 1;
  return hintLevel > 0 ? 2 : 3;
}

/** 提示：第一次給首字母，第二次給答案 */
export function hintText(answer: string, level: number): string {
  if (level <= 0) return '';
  if (level === 1) return `首字母：${answer[0]}${'＿'.repeat(Math.max(0, answer.length - 1))}`;
  return `答案：${answer}`;
}
