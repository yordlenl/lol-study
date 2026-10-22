// 挖空題：畫面和語料庫那一頁一樣，英文挖掉幾個字；點空格放大成手寫區。
import { html, nothing } from 'lit';
import type { BlankEventDetail, PracticeBlank, PracticeState, SentenceUnit } from '../../lol-shared-types.ts';
import type { Answer, ClozeQuestion } from '../../practice/types.ts';
import { shared } from '../../shared.ts';
import { LightElement } from '../light.ts';
import { openSheet } from '../sheet.ts';

export class QCloze extends LightElement {
  static properties = { question: { attribute: false }, state: { state: true } };

  declare question: ClozeQuestion;
  declare state: PracticeState;
  private hints = new Map<number, number>();

  protected willUpdate(changed: Map<string, unknown>) {
    if (changed.has('question')) {
      const text = this.question.block.text.en;
      this.state = {
        blanks: this.question.blanks.map((index) => ({ index, answer: shared().wordAt(text, index), value: '' })),
        revealed: false,
      };
      this.hints = new Map();
    }
  }

  private async onBlank(event: Event) {
    const { index } = (event as CustomEvent<BlankEventDetail>).detail;
    const blank = this.state.blanks.find((b) => b.index === index);
    if (!blank || this.state.revealed) return;
    const filled = this.state.blanks.filter((b) => b.value).length;
    const result = await openSheet({
      title: `填空（第 ${this.state.blanks.indexOf(blank) + 1} / ${this.state.blanks.length} 格）`,
      context: filled ? `已填 ${filled} 格` : undefined,
      value: blank.value,
      answer: blank.answer,
      hint: 'word',
      hintLevel: this.hints.get(index) ?? 0,
    });
    this.hints.set(index, result.hintLevel);
    this.state = { ...this.state, blanks: this.state.blanks.map((b) => (b.index === index ? { ...b, value: result.value } : b)) };
  }

  private submit() {
    const g = shared().grade;
    const blanks: PracticeBlank[] = this.state.blanks.map((b) => ({ ...b, result: g.isCorrect(b.value, [b.answer]) ? 'right' : 'wrong' }));
    this.state = { blanks, revealed: true };
    const correct = blanks.every((b) => b.result === 'right');
    const block = this.question.block;
    let wrongUnits: SentenceUnit[] = [];
    if (!correct) {
      if (block.whole) wrongUnits = [{ text: { en: plain(block.text.en), zh_TW: plain(block.text.zh_TW), zh_CN: plain(block.text.zh_CN) }, alignment: block.card?.alignment ?? 'sentence' }];
      else {
        const seen = new Set<string>();
        for (const b of blanks.filter((x) => x.result === 'wrong')) {
          const unit = shared().unitForWord(block.text, b.index);
          if (unit && !seen.has(unit.text.en)) {
            seen.add(unit.text.en);
            wrongUnits.push(unit);
          }
        }
      }
    }
    const answer: Answer = { correct, hinted: [...this.hints.values()].some((h) => h > 0), wrongUnits };
    this.dispatchEvent(new CustomEvent('answered', { detail: answer, bubbles: true }));
  }

  private view() {
    const { block } = this.question;
    const v = block.view;
    switch (v.type) {
      case 'spell':
        return html`<lol-spell class="panel" .ability=${v.ability} slot-label=${v.slotLabel ?? ''} .source=${block.source} mode="practice" .practice=${this.state}></lol-spell>`;
      case 'item':
        return html`<lol-item-card class="panel" .item=${v.item} mode="practice" .practice=${this.state}></lol-item-card>`;
      case 'quote':
        return html`<lol-quote class="panel" .quote=${v.quote} mode="practice" .practice=${this.state}></lol-quote>`;
      case 'rune':
        return html`<section class="panel">
          <div class="rune-head">
            <img src=${shared().corpusUrl(v.rune.icon)} alt="" width="48" height="48" />
            <lol-trilingual .text=${v.rune.name} context="name" compact></lol-trilingual>
          </div>
          <lol-trilingual .text=${block.text} mode="practice" .practice=${this.state}></lol-trilingual>
        </section>`;
      case 'plain':
        return html`<section class="panel">
          <p class="hint">${v.label}</p>
          <lol-trilingual .text=${block.text} mode="practice" .practice=${this.state}></lol-trilingual>
        </section>`;
    }
  }

  render() {
    const filled = this.state.blanks.filter((b) => b.value).length;
    return html`<div @lol-blank=${this.onBlank}>
      <p class="hint">點空格用 Pencil 寫，全部寫好按「送出」。</p>
      ${this.view()}
      ${this.state.revealed
        ? nothing
        : html`<div class="actions">
            <button type="button" ?disabled=${filled === 0} @click=${this.submit}>送出（已填 ${filled} / ${this.state.blanks.length}）</button>
          </div>`}
    </div>`;
  }
}

const plain = (r: import('../../lol-shared-types.ts').Rich) =>
  typeof r === 'string' ? r : r.map((x) => (typeof x === 'string' ? x : x[0])).join('');

customElements.define('q-cloze', QCloze);
