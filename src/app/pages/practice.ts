// 練習分頁，照遊戲「開始」畫面（玩家 vs 玩家）：上方五個大圖示選類別，下面菱形選項選題型，按「確認」。
// 確認之後（<page-practice-pick>）照收藏頁的樣子選要練哪一個。
import { html, nothing } from 'lit';
import { keyed } from 'lit/directives/keyed.js';
import type { Rune, RuneData, SummonerSpell } from '../../lol-shared-types.ts';
import {
  CATEGORIES,
  categoryLabel,
  listItems,
  modeAvailable,
  RANDOM_NAMES,
  RANDOM_QUOTES,
  type CategoryId,
  type ItemEntry,
} from '../../practice/catalog.ts';
import { MODE_LABELS, type Mode } from '../../practice/types.ts';
import { shared } from '../../shared.ts';
import { LightElement } from '../light.ts';
import { href } from '../router.ts';

export type PracticeChoice = Mode | 'challenge';

export const CHOICES: Array<{ id: PracticeChoice; label: string; note: string }> = [
  { id: 'cloze', label: MODE_LABELS.cloze, note: '在原本的畫面上挖掉幾個字' },
  { id: 'translate', label: MODE_LABELS.translate, note: '看繁中，手寫整句英文' },
  { id: 'dictation', label: MODE_LABELS.dictation, note: '聽遊戲原聲，寫出整句（需要網路）' },
  { id: 'challenge', label: '隨機挑戰', note: '從這個類別抽 20 題：中→英、英→中或混合' },
];

/** 按「確認」之後要去的地方 */
export const confirmHref = (category: CategoryId, choice: PracticeChoice) =>
  choice === 'challenge' ? href('practice', category, 'challenge') : href('practice', category, choice);

const modeIcon = (category: CategoryId, state: 'default' | 'hover' | 'active') => shared().corpusUrl(`img/client/ui/mode-${category}-${state}.png`);

/** 背景用遊戲「開始」畫面的官方模式背景：裝備對隨機單中，其他沒有對應背景的用召喚峽谷（山景） */
export const modeBackground = (category: CategoryId) => `img/client/ui/mode-bg-${category === 'items' ? 'aram' : 'classic'}.jpg`;

/** 收藏頁的英雄直式卡片圖（連網載入） */
const championLoading = (id: string) => `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${id}_0.jpg`;

export class PagePractice extends LightElement {
  static properties = { initialCategory: { attribute: false }, category: { state: true }, choice: { state: true } };

  declare initialCategory: CategoryId | undefined;
  declare category: CategoryId;
  declare choice: PracticeChoice;

  constructor() {
    super();
    this.category = 'champions';
    this.choice = 'cloze';
  }

  protected willUpdate(changed: Map<string, unknown>) {
    if (changed.has('initialCategory') && this.initialCategory) this.category = this.initialCategory;
    // 換了類別、原本選的題型不能出時，改選第一個能出的
    if (!modeAvailable(this.category, this.choice)) this.choice = CHOICES.find((c) => modeAvailable(this.category, c.id))!.id;
  }

  render() {
    const current = CATEGORIES.find((c) => c.id === this.category)!;
    const index = CATEGORIES.indexOf(current);
    const bg = shared().corpusUrl(modeBackground(this.category));
    return html`<div class="play-select">
      ${keyed(bg, html`<div class="mode-bg" style="background-image:url(${bg})" aria-hidden="true"></div>`)}
      <div class="mode-grid" role="radiogroup" aria-label="類別">
        ${CATEGORIES.map(
          (c, i) => html`<button
            type="button"
            role="radio"
            class="mode-tile ${c.id === this.category ? 'on' : ''} ${i === CATEGORIES.length - 1 ? 'separated' : ''}"
            aria-checked=${c.id === this.category}
            style="--icon:url(${modeIcon(c.id, 'default')});--icon-hover:url(${modeIcon(c.id, 'hover')});--icon-active:url(${modeIcon(c.id, 'active')})"
            @click=${() => (this.category = c.id)}
          >
            <span class="mode-icon" aria-hidden="true"></span>
            <span class="mode-en" lang="en">${c.en}</span>
            <span class="mode-name">${c.label}</span>
            <span class="mode-glow" aria-hidden="true"></span>
          </button>`,
        )}
        <div class="mode-rule" aria-hidden="true"></div>
        <!-- 說明和題型出現在選中那一格的正下方，和遊戲一樣 -->
        <div class="mode-detail" data-column=${index} style="grid-column:${index + 1}">
          <p class="mode-description">${current.hint}</p>
          <div class="mode-options" role="radiogroup" aria-label="題型">
            ${CHOICES.map((c) => {
              const ok = modeAvailable(this.category, c.id);
              return html`<button
                type="button"
                role="radio"
                class="mode-option ${c.id === this.choice ? 'on' : ''}"
                aria-checked=${c.id === this.choice}
                ?disabled=${!ok}
                @click=${() => (this.choice = c.id)}
              >
                <span class="radio-icon" aria-hidden="true"></span>
                <span class="option-label">${c.label}</span>
                <span class="option-note">${ok ? c.note : '只有台詞有遊戲原聲，這個類別不能聽寫'}</span>
              </button>`;
            })}
          </div>
        </div>
      </div>
      <div class="confirm-bar">
        <a class="confirm-cancel" href="#/home" aria-label="取消">✕</a>
        <a class="confirm-button" href=${confirmHref(this.category, this.choice)}>確認</a>
      </div>
    </div>`;
  }
}

/** 按「確認」之後：照收藏頁的樣子選要練哪一個 */
export class PagePracticePick extends LightElement {
  static properties = {
    category: { attribute: false },
    mode: { attribute: false },
    items: { state: true },
    runes: { state: true },
    spells: { state: true },
    tree: { state: true },
    spell: { state: true },
    query: { state: true },
  };

  declare category: CategoryId;
  declare mode: Mode;
  declare items: ItemEntry[] | undefined;
  declare runes: RuneData | undefined;
  declare spells: SummonerSpell[] | undefined;
  declare tree: string | undefined;
  declare spell: string | undefined;
  declare query: string;

  constructor() {
    super();
    this.query = '';
  }

  protected willUpdate(changed: Map<string, unknown>) {
    if (changed.has('category') || changed.has('mode')) {
      this.items = undefined;
      this.query = '';
      const s = shared();
      listItems(s, this.category, this.mode).then((items) => (this.items = items));
      if (this.category === 'runes') s.loadRunes().then((r) => (this.runes = r));
      if (this.category === 'summoners') s.loadSummoners().then((list) => (this.spells = list));
    }
  }

  private start = (id: string) => href('practice', this.category, this.mode, id);

  private search() {
    return html`<input
      class="client-search"
      type="search"
      placeholder="搜尋（中文或英文）"
      .value=${this.query}
      @input=${(e: InputEvent) => (this.query = (e.target as HTMLInputElement).value)}
    />`;
  }

  private matchesQuery(i: ItemEntry) {
    const q = this.query.trim().toLowerCase();
    return !q || Object.values(i.name).some((n) => n.toLowerCase().includes(q));
  }

  /** 英雄、技能：收藏頁的英雄卡片；英雄類別最前面是兩張特別卡 */
  private champions(items: ItemEntry[]) {
    const special = items.filter((i) => i.id === RANDOM_NAMES || i.id === RANDOM_QUOTES);
    const champions = items.filter((i) => !special.includes(i) && this.matchesQuery(i));
    return html`<div class="pick-cards">
      ${this.query
        ? nothing
        : special.map(
            (i) => html`<a class="pick-card special" href=${this.start(i.id)}>
              <span class="card-art special-art"><span>${i.id === RANDOM_NAMES ? '名' : '台'}</span></span>
              <span class="card-name">${i.name.zh_TW}<span class="card-en" lang="en">${i.name.en}</span></span>
            </a>`,
          )}
      ${champions.map(
        (i) => html`<a class="pick-card" href=${this.start(i.id)}>
          <span class="card-art"><img src=${championLoading(i.id)} alt="" loading="lazy" /></span>
          <span class="card-name">${i.name.zh_TW}<span class="card-en" lang="en">${i.name.en}</span></span>
        </a>`,
      )}
    </div>`;
  }

  /** 裝備：維持原本依四區分組的清單 */
  private itemList(items: ItemEntry[]) {
    const shown = items.filter((i) => this.matchesQuery(i));
    const groups = [...new Set(shown.map((i) => i.group ?? ''))];
    return groups.map(
      (g) => html`<h2 class="group-title">${g}</h2>
        <div class="pick-grid">
          ${shown
            .filter((i) => (i.group ?? '') === g)
            .map(
              (i) => html`<a class="pick" href=${this.start(i.id)}>
                ${i.icon ? html`<img src=${shared().corpusUrl(i.icon)} alt="" width="48" height="48" loading="lazy" />` : nothing}
                <span class="pick-name">${i.name.zh_TW}</span>
                <span class="hint" lang="en">${i.name.en}</span>
              </a>`,
            )}
        </div>`,
    );
  }

  /** 符文：照收藏的符文頁，上方換系別，下面每排是符文圖示、名稱和簡短說明 */
  private runeList(data: RuneData) {
    const tree = data.trees.find((t) => t.key === this.tree) ?? data.trees.find((t) => t.key === 'Precision') ?? data.trees[0];
    const line = (r: Rune, keystone: boolean) => html`<a class="rune-pick-line ${keystone ? 'keystone' : ''}" href=${this.start(String(r.id))}>
      <img src=${shared().corpusUrl(r.icon)} alt="" width=${keystone ? 64 : 48} height=${keystone ? 64 : 48} />
      <span class="rune-pick-text">
        <span class="rune-pick-name">${r.name.zh_TW}<span class="card-en" lang="en">${r.name.en}</span></span>
        <span class="rune-pick-short">${plain(r.short.zh_TW)}</span>
      </span>
    </a>`;
    return html`<div class="rune-pick">
      <div class="rune-pick-trees" role="tablist" aria-label="系別">
        ${['Precision', 'Domination', 'Sorcery', 'Resolve', 'Inspiration']
          .map((k) => data.trees.find((t) => t.key === k))
          .filter((t) => t !== undefined)
          .map(
            (t) => html`<button type="button" role="tab" class="rune-pick-tree ${t === tree ? 'on' : ''}" aria-selected=${t === tree} @click=${() => (this.tree = t.key)}>
              <img src=${shared().corpusUrl(t.icon)} alt="" width="40" height="40" />
              <span>${t.name.zh_TW}</span>
            </button>`,
          )}
      </div>
      ${tree.slots.map((row, i) => html`<div class="rune-pick-row">${row.map((r) => line(r, i === 0))}</div>`)}
    </div>`;
  }

  /** 召喚師技能：照收藏的召喚師技能頁，點了下面顯示說明和「開始」 */
  private spellList(spells: SummonerSpell[]) {
    const selected = spells.find((s) => s.id === this.spell) ?? spells[0];
    return html`<div class="spell-pick">
      <div class="spell-pick-grid">
        ${spells.map(
          (s) => html`<button type="button" class="spell-pick-cell ${s === selected ? 'on' : ''}" aria-pressed=${s === selected} @click=${() => (this.spell = s.id)}>
            <img src=${shared().corpusUrl(s.icon)} alt="" width="64" height="64" />
            <span>${s.name.zh_TW}</span>
          </button>`,
        )}
      </div>
      <section class="spell-pick-info">
        <h2>${selected.name.zh_TW}<span class="card-en" lang="en">${selected.name.en}</span></h2>
        <p>${plain(selected.description.zh_TW)}</p>
        <a class="confirm-button" href=${this.start(selected.id)}>開始</a>
      </section>
    </div>`;
  }

  render() {
    const back = html`<a class="back" href=${href('practice', this.category)}>← 練習</a>`;
    const title = html`<h1>${categoryLabel(this.category)}・${MODE_LABELS[this.mode]}</h1>`;
    if (!modeAvailable(this.category, this.mode)) return html`${back}${title}<p class="notice">這個類別沒有遊戲原聲，不能聽寫。</p>`;
    if (!this.items) return html`${back}<p class="notice">載入中…</p>`;
    const withSearch = this.category === 'champions' || this.category === 'skills' || this.category === 'items';
    let body: unknown = nothing;
    if (this.category === 'champions' || this.category === 'skills') body = this.champions(this.items);
    else if (this.category === 'items') body = this.itemList(this.items);
    else if (this.category === 'runes') body = this.runes ? this.runeList(this.runes) : html`<p class="notice">載入中…</p>`;
    else body = this.spells ? this.spellList(this.spells) : html`<p class="notice">載入中…</p>`;
    return html`${back}
      <div class="toolbar">${title}${withSearch ? this.search() : nothing}</div>
      ${body}`;
  }
}

/** 有格式的文字換成純文字（符文簡短說明、召喚師技能說明在選單上只顯示繁中） */
function plain(rich: string | Array<string | [string, string]>): string {
  return typeof rich === 'string' ? rich : rich.map((r) => (typeof r === 'string' ? r : r[0])).join('');
}

customElements.define('page-practice', PagePractice);
customElements.define('page-practice-pick', PagePracticePick);
