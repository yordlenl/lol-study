// 練習的選擇路徑：類別 → 項目 → 模式。
import { html, nothing } from 'lit';
import { CATEGORIES, categoryLabel, listItems, loadBlocks, type CategoryId, type ItemEntry } from '../../practice/catalog.ts';
import { buildQuestions } from '../../practice/questions.ts';
import { MODE_LABELS, type Mode } from '../../practice/types.ts';
import { shared } from '../../shared.ts';
import { LightElement } from '../light.ts';
import { href } from '../router.ts';

export class PagePractice extends LightElement {
  render() {
    return html`
      <h1>練習</h1>
      <p class="hint">挑一個類別，再挑內容和練習方式。寫錯的句子會自動收進句子庫，明天複習。</p>
      <div class="category-grid">
        ${CATEGORIES.map(
          (c) => html`<a class="panel category" href=${href('practice', c.id)}>
            <span class="category-name">${c.label}</span>
            <span class="hint">${c.hint}</span>
          </a>`,
        )}
      </div>
    `;
  }
}

export class PagePracticeItems extends LightElement {
  static properties = { category: { attribute: false }, items: { state: true }, query: { state: true } };

  declare category: CategoryId;
  declare items: ItemEntry[] | undefined;
  declare query: string;

  constructor() {
    super();
    this.query = '';
  }

  protected willUpdate(changed: Map<string, unknown>) {
    if (changed.has('category')) {
      this.items = undefined;
      if (this.category === 'mine') location.replace(href('practice', 'mine', 'all'));
      else listItems(shared(), this.category).then((items) => (this.items = items));
    }
  }

  render() {
    const back = html`<a class="back" href="#/practice">← 練習</a>`;
    if (!this.items) return html`${back}<p class="notice">載入中…</p>`;
    const q = this.query.trim().toLowerCase();
    const shown = this.items.filter((i) => !q || Object.values(i.name).some((n) => n.toLowerCase().includes(q)));
    const groups = [...new Set(shown.map((i) => i.group ?? ''))];
    return html`${back}
      <div class="toolbar">
        <h1>${categoryLabel(this.category)}</h1>
        <input class="search" type="search" placeholder="搜尋（中文或英文）" .value=${this.query} @input=${(e: InputEvent) => (this.query = (e.target as HTMLInputElement).value)} />
      </div>
      ${groups.map(
        (g) => html`${g ? html`<h2 class="group-title">${g}</h2>` : nothing}
          <div class="pick-grid">
            ${shown
              .filter((i) => (i.group ?? '') === g)
              .map(
                (i) => html`<a class="pick" href=${href('practice', this.category, i.id)}>
                  ${i.icon ? html`<img src=${shared().corpusUrl(i.icon)} alt="" width="48" height="48" loading="lazy" />` : nothing}
                  <span class="pick-name">${i.name.zh_TW}</span>
                  ${i.name.en && i.id !== 'random' ? html`<span class="hint" lang="en">${i.name.en}</span>` : nothing}
                </a>`,
              )}
          </div>`,
      )}`;
  }
}

export class PagePracticeModes extends LightElement {
  static properties = { category: { attribute: false }, itemId: { attribute: false }, counts: { state: true }, title: { state: true } };

  declare category: CategoryId;
  declare itemId: string;
  declare counts: Record<Mode, number> | undefined;
  declare title: string;

  constructor() {
    super();
    this.title = '';
  }

  protected willUpdate(changed: Map<string, unknown>) {
    if (changed.has('category') || changed.has('itemId')) this.load();
  }

  private async load() {
    this.counts = undefined;
    const s = shared();
    const items = this.category === 'mine' ? [] : await listItems(s, this.category);
    this.title = items.find((i) => i.id === this.itemId)?.name.zh_TW ?? '我的句子卡';
    const blocks = await loadBlocks(s, this.category, this.itemId);
    const tools = { planCloze: s.planCloze, sentenceUnits: s.sentenceUnits };
    const [cloze, translate, dictation] = await Promise.all(
      (['cloze', 'translate', 'dictation'] as Mode[]).map(async (m) => (await buildQuestions(blocks, m, tools)).length),
    );
    this.counts = { cloze, translate, dictation };
  }

  render() {
    const back =
      this.category === 'mine'
        ? html`<a class="back" href="#/practice">← 練習</a>`
        : html`<a class="back" href=${href('practice', this.category)}>← ${categoryLabel(this.category)}</a>`;
    if (!this.counts) return html`${back}<p class="notice">準備題目中…</p>`;
    const modes = (Object.keys(MODE_LABELS) as Mode[]).filter((m) => this.counts![m] > 0);
    const notes: Record<Mode, string> = {
      cloze: '在原本的畫面上挖掉幾個字',
      translate: '看繁中，手寫整句英文',
      dictation: '聽遊戲原聲，寫出整句（需要網路）',
    };
    return html`${back}
      <h1>${this.title}</h1>
      ${modes.length
        ? html`<div class="mode-list">
            ${modes.map(
              (m) => html`<a class="panel mode" href=${href('practice', this.category, this.itemId, m)}>
                <span class="mode-name">${MODE_LABELS[m]}</span>
                <span class="hint">${notes[m]}・${this.counts![m]} 題</span>
              </a>`,
            )}
          </div>`
        : html`<p class="notice">這裡沒有可以出的題目。${this.category === 'mine' ? '到語料庫收藏一些句子吧。' : ''}</p>`}`;
  }
}

customElements.define('page-practice', PagePractice);
customElements.define('page-practice-items', PagePracticeItems);
customElements.define('page-practice-modes', PagePracticeModes);
