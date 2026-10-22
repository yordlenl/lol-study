import { describe, expect, it } from 'vitest';
import type { Quote, SentenceUnit, Tri } from '../lol-shared-types.ts';
import { quoteBlocks } from './catalog.ts';
import { buildQuestions, translationTexts, type QuestionTools } from './questions.ts';
import type { Block } from './types.ts';

const tri = (en: string, zh = '中'): Tri => ({ en, zh_TW: zh, zh_CN: zh });

function tools(units: SentenceUnit[] = [], blanks: number[] = [1]): QuestionTools {
  return { planCloze: async () => blanks, sentenceUnits: () => units };
}

const spellBlock: Block = { id: 'Ahri/Q', source: { type: 'spell', id: 'Ahri/Q' }, text: tri('A b c.'), view: { type: 'plain', label: '' } };

function quote(id: string, extra: Partial<Quote> = {}): Quote {
  return {
    id,
    champion: 'Jinx',
    voiceSet: 'base',
    event: 'pick',
    text: { en: '"Rules are made to be broken!"', zh_TW: '規則就是用來打破的！', zh_CN: '规则就是用来打破的！', ko: '' },
    audio: { en: 'https://wiki.leagueoflegends.com/a.mp3', zh_TW: '', zh_CN: '', ko: '' },
    translation: { en: 'original', zh_TW: 'learning', zh_CN: 'learning', ko: '' },
    source: 'https://wiki.leagueoflegends.com/x?oldid=1',
    ...extra,
  };
}

describe('看中寫英的題目', () => {
  it('逐句對齊的一句一題；同一行的英文合成一題；只對到整段的不出題', () => {
    const units: SentenceUnit[] = [
      { text: tri('One sentence here.', '一'), alignment: 'sentence' },
      { text: tri('Two parts here.', '二三'), alignment: 'line' },
      { text: tri('Three parts there.', '二三'), alignment: 'line' },
      { text: tri('Block only text.', '整段'), alignment: 'block' },
    ];
    expect(translationTexts(spellBlock, tools(units)).map((t) => [t.en, t.zh_TW])).toEqual([
      ['One sentence here.', '一'],
      ['Two parts here. Three parts there.', '二三'],
    ]);
  });

  it('台詞、句子卡整句出一題；只對到整段的句子卡不出題', () => {
    const [q] = quoteBlocks({ id: 'Jinx', quotes: [quote('Jinx/base/pick-1')] });
    expect(translationTexts(q, tools())).toHaveLength(1);
    const card = { ...q, card: { alignment: 'block' } } as Block;
    expect(translationTexts(card, tools())).toEqual([]);
  });
});

describe('出題', () => {
  it('挖空：挖得出空格的塊才出題', async () => {
    expect(await buildQuestions([spellBlock], 'cloze', tools([], [2]))).toHaveLength(1);
    expect(await buildQuestions([spellBlock], 'cloze', tools([], []))).toHaveLength(0);
  });

  it('聽寫只出有原聲的整句；非語言聲音、虛構語言的台詞不出題', async () => {
    const blocks = quoteBlocks({
      id: 'Jinx',
      quotes: [quote('Jinx/base/pick-1'), quote('Jinx/base/ban-1', { nonverbal: true }), quote('Jinx/base/x', { fictionalLanguage: true })],
    });
    expect(blocks).toHaveLength(1);
    expect(await buildQuestions(blocks, 'dictation', tools())).toHaveLength(1);
    expect(await buildQuestions([spellBlock], 'dictation', tools())).toHaveLength(0);
  });
});
