// 複習：單字卡看繁中釋義手寫英文單字；句子卡隨機用挖空或看中寫英，有原聲的也可能出聽寫。
// 評分由作答結果自動決定（一次寫對 Good、用了提示才寫對 Hard、寫錯 Again）。
import { html, nothing } from 'lit';
import type { LookupResult, SentenceCard, StudyCard, WordCard } from '../../lol-shared-types.ts';
import type { Answer, Block, Mode, Question } from '../../practice/types.ts';
import { MODE_LABELS } from '../../practice/types.ts';
import { describeDue } from '../../review/days.ts';
import { buildQueue } from '../../review/queue.ts';
import { shared } from '../../shared.ts';
import '../questions/cloze.ts';
import '../questions/sentence.ts';
import { LightElement } from '../light.ts';

interface Result {
  correct: boolean;
  rating: 1 | 2 | 3;
  nextDue: string;
  /** 單字卡寫的答案 */
  answer?: string;
}

/** 句子卡要用哪一種方式出題：能用的方式裡隨機挑一個 */
export async function sentenceQuestion(card: SentenceCard, random = Math.random): Promise<Question> {
  const s = shared();
  const block: Block = {
    id: card.id,
    source: card.source,
    text: card.text,
    view: { type: 'plain', label: card.source.label ? `出自 ${card.source.label.zh_TW}` : '句子卡' },
    ...(card.audio ? { audio: card.audio } : {}),
    whole: true,
    card,
  };
  const blanks = await s.planCloze(card.text.en);
  const modes: Mode[] = [];
  if (blanks.length) modes.push('cloze');
  if (card.alignment !== 'block') modes.push('translate');
  if (card.audio) modes.push('dictation');
  const mode = modes.length ? modes[Math.floor(random() * modes.length)] : 'translate';
  return mode === 'cloze' ? { mode, block, blanks } : { mode, block, text: card.text };
}

export class PageReview extends LightElement {
  static properties = {
    queue: { state: true },
    index: { state: true },
    entry: { state: true },
    question: { state: true },
    answer: { state: true },
    hintLevel: { state: true },
    result: { state: true },
    saving: { state: true },
    tally: { state: true },
    error: { state: true },
  };

  declare queue: StudyCard[] | undefined;
  declare index: number;
  declare entry: LookupResult | null;
  declare question: Question | null;
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
    this.question = null;
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
      this.queue = [...q.due, ...q.fresh];
      await this.prepare();
    } catch (error) {
      this.error = `讀不到學習紀錄（${error}）`;
    }
  }

  private get card(): StudyCard | undefined {
    return this.queue?.[this.index];
  }

  private async prepare() {
    const card = this.card;
    this.entry = null;
    this.question = null;
    if (!card) return;
    if (card.kind === 'word') {
      const entry = await shared().lookupWord(card.lemma);
      if (this.card === card) this.entry = entry;
    } else {
      const question = await sentenceQuestion(card);
      if (this.card === card) this.question = question;
    }
  }

  protected updated() {
    if (this.card?.kind !== 'word' && !this.result) return;
    const target = this.querySelector<HTMLElement>(this.result ? '.next' : '.answer-input');
    if (target && document.activeElement !== target) target.focus();
  }

  private async record(card: StudyCard, correct: boolean, hinted: boolean, mode: string, answer?: string) {
    const rating = shared().grade.ratingFor(correct, hinted);
    this.saving = true;
    try {
      const { card: next } = await shared().recordReview(card, { rating, mode, hinted });
      this.result = { correct, rating, nextDue: next.fsrs.due, ...(answer != null ? { answer } : {}) };
      this.tally = { correct: this.tally.correct + (correct ? 1 : 0), total: this.tally.total + 1 };
    } catch (error) {
      this.error = `存不了作答紀錄（${error}）`;
    } finally {
      this.saving = false;
    }
  }

  private async submitWord() {
    const card = this.card as WordCard;
    if (this.result || this.saving || !this.answer.trim()) return;
    const correct = shared().grade.isCorrect(this.answer, [card.lemma, card.word]);
    await this.record(card, correct, this.hintLevel > 0, 'word', this.answer);
  }

  private async onAnswered(event: Event) {
    const answer = (event as CustomEvent<Answer>).detail;
    await this.record(this.card!, answer.correct, answer.hinted, this.question!.mode);
  }

  private async next() {
    this.index++;
    this.answer = '';
    this.hintLevel = 0;
    this.result = null;
    window.scrollTo(0, 0);
    await this.prepare();
  }

  private onKey(event: KeyboardEvent) {
    if (event.key !== 'Enter' || event.isComposing) return;
    event.preventDefault();
    if (this.result) this.next();
    else this.submitWord();
  }

  private wordCard(card: WordCard) {
    const entry = this.entry?.entry;
    const from = card.context?.source.label?.zh_TW;
    const g = shared().grade;
    const question = html`
      <p class="hint">看中文，寫出英文單字</p>
      <div class="definition">${this.entry ? (entry?.t ?? '（辭典沒有這個字的釋義）') : '載入釋義中…'}</div>
      ${from ? html`<p class="hint">出自：${from}</p>` : nothing}
    `;
    if (this.result) {
      const r = this.result;
      return html`<section class="panel review-card">
        ${question}
        <div class="result ${r.correct ? 'ok' : 'bad'}">
          <p class="verdict">${r.correct ? (r.rating === 2 ? '答對了（用了提示）' : '答對了') : '答錯了'}</p>
          <p class="solution" lang="en">
            ${card.lemma}${entry?.p ? html` <span class="phonetic">/${entry.p}/</span>` : nothing}
            <lol-speak-button .word=${card.lemma}></lol-speak-button>
          </p>
          ${card.word !== card.lemma ? html`<p class="hint">收藏時的字形：${card.word}（也算對）</p>` : nothing}
          <p class="hint">你寫的：<span lang="en">${r.answer}</span></p>
          <p class="hint">下次複習：${describeDue(r.nextDue, new Date())}</p>
        </div>
        <div class="actions"><button type="button" class="next" @click=${this.next}>下一張</button></div>
      </section>`;
    }
    return html`<section class="panel review-card">
      ${question}
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
      ${this.hintLevel ? html`<p class="hint-text">${g.hintText(card.lemma, this.hintLevel)}</p>` : nothing}
      <div class="actions">
        <button type="button" class="secondary" ?disabled=${this.hintLevel >= 2} @click=${() => this.hintLevel++}>
          ${this.hintLevel === 0 ? '提示（首字母）' : '提示（答案）'}
        </button>
        <button type="button" ?disabled=${!this.answer.trim() || this.saving} @click=${this.submitWord}>送出</button>
      </div>
      <p class="hint">用了提示再寫對，下次會比較早再考一次。</p>
    </section>`;
  }

  private sentenceCard() {
    const q = this.question;
    if (!q) return html`<p class="notice">準備題目中…</p>`;
    const r = this.result;
    return html`
      <p class="hint">句子卡・${MODE_LABELS[q.mode]}</p>
      ${q.mode === 'cloze'
        ? html`<q-cloze .question=${q} @answered=${this.onAnswered}></q-cloze>`
        : html`<q-sentence .question=${q} @answered=${this.onAnswered}></q-sentence>`}
      ${r
        ? html`<div class="after">
            <p class=${r.correct ? 'ok-text' : 'bad-text'}>${q.mode === 'cloze' ? `${r.correct ? (r.rating === 2 ? '全對了（用了提示）' : '全對了') : '有寫錯的地方'}・` : ''}下次複習：${describeDue(r.nextDue, new Date())}</p>
            <button type="button" class="next" @click=${this.next}>下一張</button>
          </div>`
        : nothing}
    `;
  }

  render() {
    if (this.error) return html`<p class="notice error">${this.error}</p>`;
    if (!this.queue) return html`<p class="notice">載入中…</p>`;
    const card = this.card;
    if (!card) {
      return html`<section class="panel done">
        <h1>${this.queue.length ? '今天的複習完成了' : '今天沒有要複習的卡片'}</h1>
        ${this.tally.total ? html`<p>這一輪答對 ${this.tally.correct} / ${this.tally.total} 張。</p>` : nothing}
        <a class="button" href="#/">回首頁</a>
      </section>`;
    }
    return html`
      <div class="progress">第 ${this.index + 1} / ${this.queue.length} 張</div>
      ${card.kind === 'word' ? this.wordCard(card) : this.sentenceCard()}
    `;
  }
}

customElements.define('page-review', PageReview);
