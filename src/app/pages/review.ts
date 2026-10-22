// 複習單字卡：看繁中釋義，手寫英文單字。評分由對錯和有沒有用提示自動決定。
import { html, nothing } from 'lit';
import type { LookupResult, WordCard } from '../../lol-shared-types.ts';
import { describeDue } from '../../review/days.ts';
import { hintText, isCorrect, ratingFor } from '../../review/grade.ts';
import { buildQueue } from '../../review/queue.ts';
import { shared } from '../../shared.ts';
import { LightElement } from '../light.ts';

interface Result {
  correct: boolean;
  rating: 1 | 2 | 3;
  answer: string;
  nextDue: string;
}

export class PageReview extends LightElement {
  static properties = {
    queue: { state: true },
    index: { state: true },
    entry: { state: true },
    answer: { state: true },
    hintLevel: { state: true },
    result: { state: true },
    saving: { state: true },
    tally: { state: true },
    error: { state: true },
  };

  declare queue: WordCard[] | undefined;
  declare index: number;
  declare entry: LookupResult | null;
  declare answer: string;
  declare hintLevel: number;
  declare result: Result | null;
  declare saving: boolean;
  declare tally: { correct: number; total: number };
  declare error: string;

  constructor() {
    super();
    this.index = 0;
    this.entry = null;
    this.answer = '';
    this.hintLevel = 0;
    this.result = null;
    this.saving = false;
    this.tally = { correct: 0, total: 0 };
    this.error = '';
  }

  async connectedCallback() {
    super.connectedCallback();
    try {
      const store = shared().learningStore();
      const [cards, logs, settings] = await Promise.all([store.listCards(), store.listReviewLogs(), store.getSettings()]);
      const q = buildQueue(cards, logs, settings.dailyNew, new Date());
      this.queue = [...q.dueWords, ...q.newWords];
      await this.loadEntry();
    } catch (error) {
      this.error = `讀不到學習紀錄（${error}）`;
    }
  }

  private get card(): WordCard | undefined {
    return this.queue?.[this.index];
  }

  private async loadEntry() {
    const card = this.card;
    this.entry = null;
    if (!card) return;
    const entry = await shared().lookupWord(card.lemma);
    if (this.card === card) this.entry = entry;
  }

  protected updated() {
    // 題目一出來就把游標放進作答框；看結果時把焦點放在「下一張」
    const target = this.querySelector<HTMLElement>(this.result ? '.next' : '.answer-input');
    if (target && document.activeElement !== target) target.focus();
  }

  private async submit() {
    const card = this.card;
    if (!card || this.result || this.saving || !this.answer.trim()) return;
    const correct = isCorrect(this.answer, [card.lemma, card.word]);
    const rating = ratingFor(correct, this.hintLevel);
    this.saving = true;
    try {
      const { card: next } = await shared().recordReview(card, { rating, mode: 'word', hinted: this.hintLevel > 0 });
      this.result = { correct, rating, answer: this.answer, nextDue: next.fsrs.due };
      this.tally = { correct: this.tally.correct + (correct ? 1 : 0), total: this.tally.total + 1 };
    } catch (error) {
      this.error = `存不了作答紀錄（${error}）`;
    } finally {
      this.saving = false;
    }
  }

  private async next() {
    this.index++;
    this.answer = '';
    this.hintLevel = 0;
    this.result = null;
    await this.loadEntry();
  }

  private onKey(event: KeyboardEvent) {
    if (event.key !== 'Enter' || event.isComposing) return;
    event.preventDefault();
    if (this.result) this.next();
    else this.submit();
  }

  private question(card: WordCard) {
    const entry = this.entry?.entry;
    const from = card.context?.source.label?.zh_TW;
    return html`
      <p class="hint">看中文，寫出英文單字</p>
      <div class="definition">${this.entry ? (entry?.t ?? '（辭典沒有這個字的釋義）') : '載入釋義中…'}</div>
      ${from ? html`<p class="hint">出自：${from}</p>` : nothing}
    `;
  }

  private answerArea(card: WordCard) {
    if (this.result) {
      const r = this.result;
      const phonetic = this.entry?.entry?.p;
      return html`
        <div class="result ${r.correct ? 'ok' : 'bad'}">
          <p class="verdict">${r.correct ? (r.rating === 2 ? '答對了（用了提示）' : '答對了') : '答錯了'}</p>
          <p class="solution" lang="en">${card.lemma}${phonetic ? html` <span class="phonetic">/${phonetic}/</span>` : nothing}</p>
          ${card.word !== card.lemma ? html`<p class="hint">收藏時的字形：${card.word}（也算對）</p>` : nothing}
          <p class="hint">你寫的：<span lang="en">${r.answer}</span></p>
          <p class="hint">下次複習：${describeDue(r.nextDue, new Date())}</p>
        </div>
        <div class="actions">
          <button type="button" class="next" @click=${this.next}>下一張</button>
        </div>
      `;
    }
    return html`
      <input
        class="answer-input"
        type="text"
        lang="en"
        inputmode="text"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="none"
        spellcheck="false"
        placeholder="用 Pencil 寫在這裡"
        .value=${this.answer}
        @input=${(e: InputEvent) => (this.answer = (e.target as HTMLInputElement).value)}
        @keydown=${this.onKey}
      />
      ${this.hintLevel ? html`<p class="hint-text">${hintText(card.lemma, this.hintLevel)}</p>` : nothing}
      <div class="actions">
        <button type="button" class="secondary" ?disabled=${this.hintLevel >= 2} @click=${() => this.hintLevel++}>
          ${this.hintLevel === 0 ? '提示（首字母）' : '提示（答案）'}
        </button>
        <button type="button" ?disabled=${!this.answer.trim() || this.saving} @click=${this.submit}>送出</button>
      </div>
      <p class="hint">用了提示再寫對，下次會比較早再考一次。</p>
    `;
  }

  render() {
    if (this.error) return html`<p class="notice error">${this.error}</p>`;
    if (!this.queue) return html`<p class="notice">載入中…</p>`;
    const card = this.card;
    if (!card) {
      return html`<section class="panel done">
        <h1>${this.queue.length ? '今天的單字卡複習完了' : '今天沒有要複習的單字卡'}</h1>
        ${this.tally.total ? html`<p>這一輪答對 ${this.tally.correct} / ${this.tally.total} 題。</p>` : nothing}
        <a class="button" href="#/">回首頁</a>
      </section>`;
    }
    return html`
      <div class="progress">第 ${this.index + 1} / ${this.queue.length} 張</div>
      <section class="panel review-card">${this.question(card)}${this.answerArea(card)}</section>
    `;
  }
}

customElements.define('page-review', PageReview);
