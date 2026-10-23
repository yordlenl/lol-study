// 隨機挑戰：開始畫面（方向、範圍）與作答。系統抽題，使用者不能挑；每輪 20 題，可以中途結束。
import { html, nothing } from 'lit';
import {
  DIRECTION_LABELS,
  drawRound,
  ROUND_SIZE,
  SCOPE_LABELS,
  type ChallengeItem,
  type Direction,
  type Scope,
} from '../../challenge/draw.ts';
import { recordPractice, recordWrongUnits } from '../../practice/outcome.ts';
import type { Answer } from '../../practice/types.ts';
import { shared } from '../../shared.ts';
import '../questions/cloze.ts';
import '../questions/recognize.ts';
import '../questions/sentence.ts';
import { LightElement } from '../light.ts';
import { href } from '../router.ts';

export class PageChallenge extends LightElement {
  static properties = { direction: { state: true }, scope: { state: true } };
  declare direction: Direction;
  declare scope: Scope;

  constructor() {
    super();
    this.direction = 'mixed';
    this.scope = 'all';
  }

  private choice<T extends string>(labels: Record<T, string>, value: T, set: (v: T) => void) {
    return html`<div class="segmented">
      ${(Object.keys(labels) as T[]).map(
        (k) => html`<button type="button" class=${k === value ? 'on' : ''} aria-pressed=${k === value} @click=${() => set(k)}>${labels[k]}</button>`,
      )}
    </div>`;
  }

  render() {
    return html`<a class="back" href="#/practice">← 練習</a>
      <h1>隨機挑戰</h1>
      <p class="hint">系統抽題，每輪 ${ROUND_SIZE} 題，可以中途結束。答錯、沒看懂的句子會自動收進句子庫，明天複習。</p>
      <section class="panel">
        <h2>方向</h2>
        ${this.choice(DIRECTION_LABELS, this.direction, (v) => (this.direction = v))}
        <p class="hint">中→英：挖空或看中寫英。英→中：看英文，選出它出自哪裡（名字會遮起來）。</p>
        <h2>範圍</h2>
        ${this.choice(SCOPE_LABELS, this.scope, (v) => (this.scope = v))}
        <div class="actions">
          <a class="button big" href=${href('challenge', this.direction, this.scope)}>開始</a>
        </div>
      </section>`;
  }
}

export class PageChallengeRun extends LightElement {
  static properties = {
    direction: { attribute: false },
    scope: { attribute: false },
    items: { state: true },
    available: { state: true },
    index: { state: true },
    answer: { state: true },
    saved: { state: true },
    tally: { state: true },
    finished: { state: true },
  };

  declare direction: Direction;
  declare scope: Scope;
  declare items: ChallengeItem[] | undefined;
  declare available: number;
  declare index: number;
  declare answer: Answer | null;
  declare saved: number;
  declare tally: { correct: number; total: number; added: number };
  declare finished: boolean;

  protected willUpdate(changed: Map<string, unknown>) {
    if (changed.has('direction') || changed.has('scope')) this.load();
  }

  private async load() {
    this.items = undefined;
    this.index = 0;
    this.answer = null;
    this.saved = 0;
    this.finished = false;
    this.tally = { correct: 0, total: 0, added: 0 };
    const { items, available } = await drawRound(shared(), this.direction, this.scope);
    this.items = items;
    this.available = available;
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
        <a class="button" href=${href('challenge', this.direction, this.scope)} @click=${() => this.load()}>再來一輪</a>
        <a class="button secondary" href="#/challenge">換設定</a>
      </div>
    </section>`;
  }

  render() {
    const back = html`<a class="back" href="#/challenge">← 隨機挑戰・${DIRECTION_LABELS[this.direction]}・${SCOPE_LABELS[this.scope]}</a>`;
    if (!this.items) return html`${back}<p class="notice">抽題中…</p>`;
    if (!this.items.length) {
      return html`${back}<p class="notice">${this.scope === 'mine' ? '生詞本與收藏裡還沒有能出題的句子。到語料庫收藏一些吧。' : '抽不到題目，請稍後再試。'}</p>`;
    }
    const item = this.items[this.index];
    if (!item || this.finished) return html`${back}${this.summary()}`;
    return html`${back}
      ${this.scope === 'mine' && this.items.length < ROUND_SIZE && this.index === 0
        ? html`<p class="hint">生詞本與收藏裡能出題的只有 ${this.items.length} 句，這一輪就出 ${this.items.length} 題。</p>`
        : nothing}
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
