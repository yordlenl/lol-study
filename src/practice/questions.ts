// 把內容變成題目。挖空：一塊一題；看中寫英：一句一題（中文只對到整行時，那一行合成一題）；聽寫：有原聲的整句。
import type { Rich, SentenceUnit, Tri } from '../lol-shared-types.ts';
import type { Block, Mode, Question } from './types.ts';

export interface QuestionTools {
  planCloze(text: Rich): Promise<number[]>;
  sentenceUnits(text: Tri<Rich>): SentenceUnit[];
}

const plainTri = (t: Tri<Rich>): Tri => {
  const plain = (r: Rich) => (typeof r === 'string' ? r : r.map((x) => (typeof x === 'string' ? x : x[0])).join(''));
  return { en: plain(t.en), zh_TW: plain(t.zh_TW), zh_CN: plain(t.zh_CN) };
};

/** 看中寫英的題目：逐句對齊的一句一題；同一行的合成一題；只對到整段的不出題 */
export function translationTexts(block: Block, tools: QuestionTools): Tri[] {
  if (block.whole) return block.card?.alignment === 'block' ? [] : [plainTri(block.text)];
  const out: Tri[] = [];
  const lines = new Map<string, Tri>();
  for (const unit of tools.sentenceUnits(block.text)) {
    if (unit.alignment === 'sentence') out.push(unit.text);
    else if (unit.alignment === 'line') {
      const merged = lines.get(unit.text.zh_TW);
      if (merged) merged.en = `${merged.en} ${unit.text.en}`;
      else {
        const fresh = { ...unit.text };
        lines.set(unit.text.zh_TW, fresh);
        out.push(fresh);
      }
    }
  }
  return out;
}

export async function buildQuestions(blocks: Block[], mode: Mode, tools: QuestionTools): Promise<Question[]> {
  const questions: Question[] = [];
  for (const block of blocks) {
    if (mode === 'cloze') {
      const blanks = await tools.planCloze(block.text.en);
      if (blanks.length) questions.push({ mode, block, blanks });
    } else if (mode === 'translate') {
      for (const text of translationTexts(block, tools)) questions.push({ mode, block, text });
    } else if (block.audio && block.whole) {
      questions.push({ mode, block, text: plainTri(block.text) });
    }
  }
  return questions;
}
