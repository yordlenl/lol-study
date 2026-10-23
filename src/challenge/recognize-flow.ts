// 英→中五步流程（spec）：
// 1 看懂了／沒看懂 → 2 沒看懂：看翻譯和出處、進複習
// 3 看懂了：四選一出自哪裡 → 4 選錯：看答案、進複習；選對：看翻譯，問「我理解的和這個一樣嗎？」
// 5 不一樣：同沒看懂；一樣：答對

export type Step = 'ask' | 'choose' | 'confirm' | 'done';

export interface FlowState {
  step: Step;
  /** 選了哪個選項 */
  chosen?: string;
  /** 結果：done 時才有 */
  outcome?: 'understood' | 'not-understood' | 'wrong-choice' | 'different';
}

export type FlowAction =
  | { type: 'understood' }
  | { type: 'not-understood' }
  | { type: 'choose'; id: string; answerId: string }
  | { type: 'same' }
  | { type: 'different' };

export const START: FlowState = { step: 'ask' };

export function nextState(state: FlowState, action: FlowAction): FlowState {
  switch (state.step) {
    case 'ask':
      if (action.type === 'understood') return { step: 'choose' };
      if (action.type === 'not-understood') return { step: 'done', outcome: 'not-understood' };
      return state;
    case 'choose':
      if (action.type !== 'choose') return state;
      return action.id === action.answerId
        ? { step: 'confirm', chosen: action.id }
        : { step: 'done', chosen: action.id, outcome: 'wrong-choice' };
    case 'confirm':
      if (action.type === 'same') return { ...state, step: 'done', outcome: 'understood' };
      if (action.type === 'different') return { ...state, step: 'done', outcome: 'different' };
      return state;
    case 'done':
      return state;
  }
}

/** 只有「一樣」算答對；其他結果都進複習 */
export const isCorrect = (state: FlowState) => state.outcome === 'understood';
