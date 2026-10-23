import { describe, expect, it } from 'vitest';
import { isCorrect, nextState, START, type FlowAction } from './recognize-flow.ts';

const run = (...actions: FlowAction[]) => actions.reduce(nextState, START);
const choose = (id: string) => ({ type: 'choose' as const, id, answerId: 'ahri' });

describe('英→中五步流程', () => {
  it('沒看懂 → 結束，進複習', () => {
    const s = run({ type: 'not-understood' });
    expect(s).toEqual({ step: 'done', outcome: 'not-understood' });
    expect(isCorrect(s)).toBe(false);
  });

  it('看懂了 → 四選一 → 選錯 → 結束，進複習', () => {
    const s = run({ type: 'understood' }, choose('lux'));
    expect(s).toEqual({ step: 'done', chosen: 'lux', outcome: 'wrong-choice' });
    expect(isCorrect(s)).toBe(false);
  });

  it('選對 → 確認理解 → 不一樣：和沒看懂一樣進複習', () => {
    const s = run({ type: 'understood' }, choose('ahri'), { type: 'different' });
    expect(s.outcome).toBe('different');
    expect(isCorrect(s)).toBe(false);
  });

  it('選對 → 確認理解 → 一樣：記為答對', () => {
    const s = run({ type: 'understood' }, choose('ahri'), { type: 'same' });
    expect(s).toEqual({ step: 'done', chosen: 'ahri', outcome: 'understood' });
    expect(isCorrect(s)).toBe(true);
  });

  it('不在當下步驟的動作不會改變狀態', () => {
    expect(run({ type: 'same' })).toEqual(START);
    expect(run({ type: 'understood' }, { type: 'not-understood' })).toEqual({ step: 'choose' });
  });
});
