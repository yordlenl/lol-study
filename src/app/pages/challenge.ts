// 隨機挑戰：在練習分頁選好類別、按「確認」後選方向，再作答。只從那個類別抽題，每輪 20 題，可以中途結束。
import { html, nothing } from 'lit';
import { DIRECTION_LABELS, drawRound, ROUND_SIZE, type ChallengeItem, type Direction } from '../../challenge/draw.ts';
import { categoryLabel, type CategoryId } from '../../practice/catalog.ts';
import { recordPractice, recordWrongUnits } from '../../practice/outcome.ts';
import type { Answer } from '../../practice/types.ts';
import { shared } from '../../shared.ts';
import '../questions/cloze.ts';
import '../questions/recognize.ts';
import '../questions/sentence.ts';
import { LightElement } from '../light.ts';
import { href } from '../router.ts';

export class PageChallenge extends LightElement {
  static properties = { category: { attribute: false }, direction: { state: true } };
  declare category: CategoryId;
  declare direction: Direction;

  constructor() {
    super();
    this.direction = 'mixed';
  }

  render() {
    return html`<a class="back" href=${href('practice', this.category)}>← 練習</a>
      <h1>${categoryLabel(this.category)}・隨機挑戰</h1>
      <p class="hint">從「${categoryLabel(this.category)}」抽 ${ROUND_SIZE} 題，可以中途結束。答錯、沒看懂的句子會自動收進句子庫，明天複習。</p>
      <section class="panel">
        <h2>方向</h2>
        <div class="segmented">
          ${(Object.keys(DIRECTION_LABELS) as Direction[]).map(
            (k) => html`<button type="button" class=${k === this.direction ? 'on' : ''} aria-pressed=${k === this.direction} @click=${() => (this.direction = k)}>${DIRECTION_LABELS[k]}</button>`,
          )}
        </div>
        <p class="hint">中→英：挖空或看中寫英。英→中：看英文，選出它出自哪裡（名字會遮起來）。</p>
        <div class="actions">
          <a class="confirm-button" href=${href('practice', this.category, 'challenge', this.direction)}>開始</a>
        </div>
      </section>`;
  }
}

export class PageChallengeRun extends LightElement {
  static properties = {
    category: { attribute: false },
    direction: { attribute: false },
    items: { state: true },
    index: { state: true },
    answer: { state: true },
    saved: { state: true },
    tally: { state: true },
    finished: { state: true },
  };

  declare category: CategoryId;
  declare direction: Direction;
  declare items: ChallengeItem[] | undefined;
  declare index: number;
  declare answer: Answer | null;
  declare saved: number;
  declare tally: { correct: number; total: number; added: number };
  declare finished: boolean;

  protected willUpdate(changed: Map<string, unknown>) {
    if (changed.has('direction') || changed.has('category')) this.load();
  }

  private async load() {
    this.items = undefined;
    this.index = 0;
    this.answer = null;
    this.saved = 0;
    this.finished = false;
    this.tally = { correct: 0, total: 0, added: 0 };
    this.items = await drawRound(shared(), this.direction, this.category);
  }

  private async onAnswered(event: Event) {
    const answer = (event as CustomEvent<Answer>).detail;
    const item = this.items![this.index];
    this.answer = answer;
    const added =
      item.direction === 'zh2en'
        ? await recordPractice(shared(), item.question, answer, 'challenge')
        : answer.correct
          ? 0
          : await recordWrongUnits(shared(), item.drawn, answer.wrongUnits, 'recognize', false, 'challenge');
    this.saved = added;
    this.tally = { correct: this.tally.correct + (answer.correct ? 1 : 0), total: this.tally.total + 1, added: this.tally.added + added };
  }

  private next() {
    this.index++;
    this.answer = null;
    this.saved = 0;
    window.scrollTo(0, 0);
  }

  private question(item: ChallengeItem) {
    if (item.direction === 'en2zh') return html`<q-recognize .item=${item} @answered=${this.onAnswered}></q-recognize>`;
    const q = item.question;
    return html`<p class="hint">中→英</p>${q.mode === 'cloze'
      ? html`<q-cloze .question=${q} @answered=${this.onAnswered}></q-cloze>`
      : html`<q-sentence .question=${q} @answered=${this.onAnswered}></q-sentence>`}`;
  }

  private summary() {
    return html`<section class="panel done">
      <h1>${this.tally.total >= (this.items?.length ?? 0) ? '這一輪完成了' : '這一輪先到這裡'}</h1>
      <p>答對 ${this.tally.correct} / ${this.tally.total} 題。</p>
      ${this.tally.added ? html`<p class="hint">${this.tally.added} 句已收進句子庫，明天複習。</p>` : nothing}
      <div class="actions">
        <a class="button" href=${href('practice', this.category, 'challenge', this.direction)} @click=${() => this.load()}>再來一輪</a>
        <a class="button secondary" href=${href('practice', this.category)}>換類別</a>
      </div>
    </section>`;
  }

  render() {
    const back = html`<a class="back" href=${href('practice', this.category, 'challenge')}>← ${categoryLabel(this.category)}・隨機挑戰・${DIRECTION_LABELS[this.direction]}</a>`;
    if (!this.items) return html`${back}<p class="notice">抽題中…</p>`;
    if (!this.items.length) {
      return html`${back}<p class="notice">抽不到題目，請稍後再試。</p>`;
    }
    const item = this.items[this.index];
    if (!item || this.finished) return html`${back}${this.summary()}`;
    return html`${back}
      <div class="progress-row">
        <span class="progress">第 ${this.index + 1} / ${this.items.length} 題</span>
        <button type="button" class="secondary small" @click=${() => (this.finished = true)}>結束這一輪</button>
      </div>
      ${this.question(item)}
      ${this.answer
        ? html`<div class="after">
            ${item.direction === 'zh2en' && !this.answer.correct && this.saved ? html`<p class="bad-text">已把 ${this.saved} 句收進句子庫，明天複習</p>` : html`<span></span>`}
            <button type="button" class="next" @click=${this.next}>${this.index + 1 < this.items.length ? '下一題' : '看結果'}</button>
          </div>`
        : nothing}`;
  }
}

customElements.define('page-challenge', PageChallenge);
customElements.define('page-challenge-run', PageChallengeRun);
