// <study-app>：像遊戲客戶端。上方是和語料庫共用的導覽列（「開始」亮起），
// 下面一排分頁照「玩家 vs 玩家」那一排：主頁、練習、生詞本、設定。
import { html } from 'lit';
import { corpusHomeUrl } from '../corpus.ts';
import { LightElement } from './light.ts';
import './pages/challenge.ts';
import './pages/home.ts';
import './pages/practice-session.ts';
import './pages/practice.ts';
import './pages/review.ts';
import './pages/settings.ts';
import './pages/words.ts';
import { parseHash, type Route } from './router.ts';

const TABS: Array<{ label: string; href: string; pages: Array<Route['page']> }> = [
  { label: '主頁', href: '#/home', pages: ['home', 'review'] },
  { label: '練習', href: '#/practice', pages: ['practice', 'practice-pick', 'practice-session', 'challenge-setup', 'challenge-run'] },
  { label: '生詞本', href: '#/words', pages: ['words'] },
  { label: '設定', href: '#/settings', pages: ['settings'] },
];

export class StudyApp extends LightElement {
  static properties = { route: { state: true } };
  declare route: Route;

  constructor() {
    super();
    this.route = parseHash(location.hash);
  }

  private onHash = () => {
    this.route = parseHash(location.hash);
    window.scrollTo(0, 0);
  };

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('hashchange', this.onHash);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('hashchange', this.onHash);
  }

  private page() {
    const r = this.route;
    switch (r.page) {
      case 'home':
        return html`<page-home></page-home>`;
      case 'review':
        return html`<page-review></page-review>`;
      case 'words':
        return html`<page-words .tab=${r.tab}></page-words>`;
      case 'settings':
        return html`<page-settings></page-settings>`;
      case 'practice':
        return html`<page-practice .initialCategory=${r.category}></page-practice>`;
      case 'practice-pick':
        return html`<page-practice-pick .category=${r.category} .mode=${r.mode}></page-practice-pick>`;
      case 'practice-session':
        return html`<page-practice-session .category=${r.category} .itemId=${r.id} .mode=${r.mode}></page-practice-session>`;
      case 'challenge-setup':
        return html`<page-challenge .category=${r.category}></page-challenge>`;
      case 'challenge-run':
        return html`<page-challenge-run .category=${r.category} .direction=${r.direction}></page-challenge-run>`;
    }
  }

  render() {
    const page = this.route.page;
    return html`
      <lol-client-nav current="play" play-href="#/home"></lol-client-nav>
      <lol-client-tabs .tabs=${TABS.map((t) => ({ label: t.label, href: t.href, on: t.pages.includes(page) }))} close-href=${corpusHomeUrl()}></lol-client-tabs>
      <main class="page" data-page=${page}>${this.page()}</main>
      <footer class="build">網站版本 ${__APP_VERSION__}・${__COMMIT__}</footer>
    `;
  }
}

customElements.define('study-app', StudyApp);
