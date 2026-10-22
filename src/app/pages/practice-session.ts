// 練習：一題一題作答。寫錯的句子自動收進句子庫（明天複習），答對不影響排程。
import { html, nothing } from 'lit';
import { categoryLabel, loadBlocks, type CategoryId } from '../../practice/catalog.ts';
import { recordPractice } from '../../practice/outcome.ts';
import { buildQuestions } from '../../practice/questions.ts';
import { MODE_LABELS, type Answer, type Mode, type Question } from '../../practice/types.ts';
import { shared } from '../../shared.ts';
import '../questions/cloze.ts';
import '../questions/sentence.ts';
import { LightElement } from '../light.ts';
import { href } from '../router.ts';

export class PagePracticeSession extends LightElement {
  static properties = {
    category: { attribute: false },
    itemId: { attribute: false },
    mode: { attribute: false },
    questions: { state: true },
    index: { state: true },
    answer: { state: true },
    saved: { state: true },
    tally: { state: true },
  };

  declare category: CategoryId;
  declare itemId: string;
  declare mode: Mode;
  declare questions: Question[] | undefined;
  declare index: number;
  declare answer: Answer | null;
  declare saved: number;
  declare tally: { correct: number; total: number; added: number };

  constructor() {
    super();
    this.index = 0;
    this.answer = null;
    this.saved = 0;
    this.tally = { correct: 0, total: 0, added: 0 };
  }

  protected willUpdate(changed: Map<string, unknown>) {
    if (changed.has('category') || changed.has('itemId') || changed.has('mode')) this.load();
  }

  private async load() {
    this.questions = undefined;
    this.index = 0;
    this.answer = null;
    this.tally = { correct: 0, total: 0, added: 0 };
    const s = shared();
    const blocks = await loadBlocks(s, this.category, this.itemId);
    this.questions = await buildQuestions(blocks, this.mode, { planCloze: s.planCloze, sentenceUnits: s.sentenceUnits });
  }

  private async onAnswered(event: Event) {
    const answer = (event as CustomEvent<Answer>).detail;
    this.answer = answer;
    const added = await recordPractice(shared(), this.questions![this.index], answer);
    this.saved = added;
    this.tally = {
      correct: this.tally.correct + (answer.correct ? 1 : 0),
      total: this.tally.total + 1,
      added: this.tally.added + added,
    };
  }

  private next() {
    this.index++;
    this.answer = null;
    this.saved = 0;
    window.scrollTo(0, 0);
  }

  /** 整句題的對錯已經顯示在題目裡，這裡只補充「收進句子庫」；挖空題在這裡顯示對錯 */
  private verdict(q: Question) {
    const a = this.answer!;
    const saved = this.saved ? html`<p class="bad-text">已把 ${this.saved} 句收進句子庫，明天複習</p>` : nothing;
    if (q.mode !== 'cloze') return a.correct ? html`<span></span>` : saved;
    if (a.correct) return html`<p class="ok-text">${a.hinted ? '全對了（用了提示）' : '全對了'}</p>`;
    return this.saved ? saved : html`<p class="bad-text">有寫錯的地方</p>`;
  }

  private question(q: Question) {
    return q.mode === 'cloze'
      ? html`<q-cloze .question=${q} @answered=${this.onAnswered}></q-cloze>`
      : html`<q-sentence .question=${q} @answered=${this.onAnswered}></q-sentence>`;
  }

  render() {
    const back = html`<a class="back" href=${href('practice', this.category, this.itemId)}>← ${categoryLabel(this.category)}・${MODE_LABELS[this.mode]}</a>`;
    if (!this.questions) return html`${back}<p class="notice">準備題目中…</p>`;
    const q = this.questions[this.index];
    if (!q) {
      return html`${back}<section class="panel done">
        <h1>這一輪練完了</h1>
        ${this.tally.total ? html`<p>答對 ${this.tally.correct} / ${this.tally.total} 題。</p>` : nothing}
        ${this.tally.added ? html`<p class="hint">寫錯的 ${this.tally.added} 句已收進句子庫，明天複習。</p>` : nothing}
        <div class="actions">
          <a class="button" href=${href('practice', this.category, this.itemId)}>再練一次</a>
          <a class="button secondary" href="#/practice">換別的</a>
        </div>
      </section>`;
    }
    return html`${back}
      <div class="progress">第 ${this.index + 1} / ${this.questions.length} 題</div>
      ${this.question(q)}
      ${this.answer ? html`<div class="after">${this.verdict(q)}<button type="button" class="next" @click=${this.next}>下一題</button></div>` : nothing}`;
  }
}

customElements.define('page-practice-session', PagePracticeSession);
