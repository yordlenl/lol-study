import './style.css';
import { describeMeta, pickRandom, sharedModuleUrl } from './corpus.ts';
import type { SharedModule } from './lol-shared-types.ts';

const app = document.querySelector<HTMLDivElement>('#app')!;

app.innerHTML = `
  <main class="page">
    <header class="masthead">
      <div>
        <h1>LoL 英語學習</h1>
        <p class="tagline">挖空・看中寫英・聽寫・複習</p>
      </div>
      <a class="switch" href="/lol-corpus/">前往語料庫 →</a>
    </header>

    <section class="panel">
      <h2>第二階段：連上語料庫</h2>
      <p id="status">正在載入語料庫的共用模組…</p>
      <p class="hint">首頁、生詞本與複習會在第三階段加上。</p>
    </section>

    <section class="panel">
      <div class="panel-head">
        <h2>隨機一句台詞</h2>
        <button type="button" id="another" class="secondary" disabled>換一句</button>
      </div>
      <p class="hint" id="quote-from"></p>
      <div id="quote"></div>
    </section>

    <footer class="build">網站版本 ${__APP_VERSION__}・${__COMMIT__}</footer>
  </main>
`;

const status = app.querySelector<HTMLParagraphElement>('#status')!;
const quoteBox = app.querySelector<HTMLDivElement>('#quote')!;
const quoteFrom = app.querySelector<HTMLParagraphElement>('#quote-from')!;
const another = app.querySelector<HTMLButtonElement>('#another')!;

async function start() {
  const shared = (await import(/* @vite-ignore */ sharedModuleUrl())) as SharedModule;
  await shared.initShared();
  status.textContent = describeMeta(await shared.loadMeta());
  const champions = await shared.loadChampionIndex();

  async function showRandomQuote() {
    const summary = pickRandom(champions);
    const champion = await shared.loadChampion(summary.id);
    const quote = pickRandom(champion.quotes);
    quoteFrom.textContent = `${champion.name.zh_TW}（${champion.name.en}）`;
    quoteBox.replaceChildren(Object.assign(document.createElement('lol-quote'), { quote }));
  }

  another.addEventListener('click', showRandomQuote);
  another.disabled = false;
  await showRandomQuote();
}

start().catch((error) => {
  status.textContent = `載入語料庫失敗，請檢查網路後重新整理。（${error}）`;
  status.classList.add('error');
});
