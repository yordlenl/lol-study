// 生詞本：單字卡、句子卡兩個分頁，可以搜尋、刪除、匯出。
import { html, nothing } from 'lit';
import type { DictWord, ReviewLog, SentenceCard, StudyCard, WordCard } from '../../lol-shared-types.ts';
import { saveBackup } from '../../backup.ts';
import { describeDue } from '../../review/days.ts';
import { isNew } from '../../review/queue.ts';
import { missCounts } from '../../review/stats.ts';
import { shared } from '../../shared.ts';
import { LightElement } from '../light.ts';

export function matchesCard(card: StudyCard, query: string, definition = ''): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const fields =
    card.kind === 'word' ? [card.word, card.lemma, definition] : [card.text.en, card.text.zh_TW, card.text.zh_CN];
  return fields.some((f) => f.toLowerCase().includes(q));
}

export class PageWords extends LightElement {
  static properties = {
    tab: { attribute: false },
    cards: { state: true },
    logs: { state: true },
    definitions: { state: true },
    query: { state: true },
    message: { state: true },
  };

  declare tab: 'word' | 'sentence';
  declare cards: StudyCard[] | undefined;
  declare logs: ReviewLog[];
  declare definitions: Map<string, DictWord | null>;
  declare query: string;
  declare message: string;

  constructor() {
    super();
    this.tab = 'word';
    this.logs = [];
    this.definitions = new Map();
    this.query = '';
    this.message = '';
  }

  async connectedCallback() {
    super.connectedCallback();
    await this.load();
  }

  private async load() {
    const store = shared().learningStore();
    const [cards, logs] = await Promise.all([store.listCards(), store.listReviewLogs()]);
    this.cards = cards.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
    this.logs = logs;
    const words = cards.filter((c): c is WordCard => c.kind === 'word');
    const looked = await Promise.all(words.map(async (c) => [c.lemma, (await shared().lookupWord(c.lemma)).entry] as const));
    this.definitions = new Map(looked);
  }

  private async deleteCard(card: StudyCard) {
    const name = card.kind === 'word' ? card.lemma : card.text.en;
    if (!confirm(`確定要從生詞本刪除「${name}」嗎？`)) return;
    await shared().collection.remove(card.id);
    this.cards = this.cards!.filter((c) => c.id !== card.id);
  }

  private async exportAll() {
    const result = await saveBackup(await shared().learningStore().exportAll());
    this.message = result === 'cancelled' ? '' : '備份檔已匯出。';
  }

  private status(card: StudyCard) {
    const misses = missCounts(this.logs).get(card.id) ?? 0;
    const due = isNew(card) ? '新卡，還沒複習' : `下次複習 ${describeDue(card.fsrs.due, new Date())}`;
    return html`<span>${due}</span>${misses ? html`<span>答錯 ${misses} 次</span>` : nothing}`;
  }

  private wordRow(card: WordCard) {
    const def = this.definitions.get(card.lemma);
    return html`<li class="card-row">
      <div class="card-main">
        <div class="card-title" lang="en">${card.lemma}${card.word !== card.lemma ? html`<span class="hint">（${card.word}）</span>` : nothing}</div>
        <div class="card-def">${def?.t?.split('\n')[0] ?? ''}</div>
        <div class="card-meta">${card.context?.source.label?.zh_TW ? html`<span>出自 ${card.context.source.label.zh_TW}</span>` : nothing}${this.status(card)}</div>
      </div>
      <button type="button" class="danger small" @click=${() => this.deleteCard(card)}>刪除</button>
    </li>`;
  }

  private sentenceRow(card: SentenceCard) {
    return html`<li class="card-row">
      <div class="card-main">
        <div class="card-title" lang="en">${card.text.en}</div>
        <div class="card-def">${card.text.zh_TW}</div>
        <div class="card-meta">${card.source.label?.zh_TW ? html`<span>出自 ${card.source.label.zh_TW}</span>` : nothing}${this.status(card)}</div>
      </div>
      <button type="button" class="danger small" @click=${() => this.deleteCard(card)}>刪除</button>
    </li>`;
  }

  render() {
    if (!this.cards) return html`<p class="notice">載入中…</p>`;
    const words = this.cards.filter((c): c is WordCard => c.kind === 'word');
    const sentences = this.cards.filter((c): c is SentenceCard => c.kind === 'sentence');
    const list =
      this.tab === 'word'
        ? words.filter((c) => matchesCard(c, this.query, this.definitions.get(c.lemma)?.t ?? ''))
        : sentences.filter((c) => matchesCard(c, this.query));
    return html`
      <div class="toolbar">
        <div class="tabs">
          <a href="#/words" class=${this.tab === 'word' ? 'current' : ''}>單字卡 ${words.length}</a>
          <a href="#/words/sentences" class=${this.tab === 'sentence' ? 'current' : ''}>句子卡 ${sentences.length}</a>
        </div>
        <input
          class="search"
          type="search"
          placeholder="搜尋（中文或英文）"
          .value=${this.query}
          @input=${(e: InputEvent) => (this.query = (e.target as HTMLInputElement).value)}
        />
        <button type="button" class="secondary" @click=${this.exportAll}>匯出</button>
      </div>
      ${this.message ? html`<p class="notice ok">${this.message}</p>` : nothing}
      ${list.length
        ? html`<ul class="card-list panel">
            ${list.map((c) => (c.kind === 'word' ? this.wordRow(c) : this.sentenceRow(c)))}
          </ul>`
        : html`<p class="notice">${this.query ? '找不到符合的卡片。' : '還沒有卡片。到語料庫點單字或按「收藏句子」就會出現在這裡。'}</p>`}
    `;
  }
}

customElements.define('page-words', PageWords);
