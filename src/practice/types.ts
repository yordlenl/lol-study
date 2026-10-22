// 練習題的資料結構。
import type { Ability, Item, Quote, Rich, Rune, SentenceCard, SentenceUnit, SourceRef, Tri } from '../lol-shared-types.ts';

export type Mode = 'cloze' | 'translate' | 'dictation';

export const MODE_LABELS: Record<Mode, string> = {
  cloze: '挖空',
  translate: '看中寫英',
  dictation: '聽寫',
};

/** 畫面要怎麼顯示這一塊（挖空時照語料庫原樣） */
export type BlockView =
  | { type: 'spell'; ability: Ability; slotLabel?: string }
  | { type: 'item'; item: Item }
  | { type: 'quote'; quote: Quote }
  | { type: 'rune'; rune: Rune }
  | { type: 'plain'; label: string };

/** 一塊可以出題的內容，例如一個技能、一句台詞、一張句子卡 */
export interface Block {
  id: string;
  source: SourceRef;
  text: Tri<Rich>;
  view: BlockView;
  /** 有遊戲原聲時的音檔 */
  audio?: string;
  /** 整塊就是一句（台詞、句子卡）：寫錯時整塊收進句子庫 */
  whole?: boolean;
  /** 從句子卡出的題 */
  card?: SentenceCard;
}

export interface ClozeQuestion {
  mode: 'cloze';
  block: Block;
  /** 挖英文裡第幾個字 */
  blanks: number[];
}

export interface SentenceQuestion {
  mode: 'translate' | 'dictation';
  block: Block;
  /** 這一題的英文與中文 */
  text: Tri;
}

export type Question = ClozeQuestion | SentenceQuestion;

/** 作答結果 */
export interface Answer {
  correct: boolean;
  hinted: boolean;
  /** 寫錯的句子（練習時收進句子庫） */
  wrongUnits: SentenceUnit[];
}
