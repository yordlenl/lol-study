// <study-app>：上方導覽列與目前頁面。
import { html } from 'lit';
import { LightElement } from './light.ts';
import './pages/home.ts';
import './pages/review.ts';
import './pages/settings.ts';
import './pages/words.ts';
import { parseHash, type Route } from './router.ts';

const NAV: Array<{ page: Route['page']; label: string; href: string }> = [
  { page: 'home', label: '首頁', href: '#/' },
  { page: 'words', label: '生詞本', href: '#/words' },
  { page: 'settings', label: '設定', href: '#/settings' },
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
    }
  }

  render() {
    return html`
      <header class="topbar">
        <a class="brand" href="#/">LoL 英語</a>
        <nav class="nav">
          ${NAV.map((n) => html`<a href=${n.href} class=${this.route.page === n.page ? 'current' : ''}>${n.label}</a>`)}
        </nav>
        <a class="switch" href="/lol-corpus/">語料庫 →</a>
      </header>
      <main class="page">${this.page()}</main>
      <footer class="build">網站版本 ${__APP_VERSION__}・${__COMMIT__}</footer>
    `;
  }
}

customElements.define('study-app', StudyApp);
