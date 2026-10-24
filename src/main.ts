import { registerSW } from 'virtual:pwa-register';
import './style.css';
import './app/app.ts';
import { opensClientHome } from './app/router.ts';
import { corpusHomeUrl, sharedModuleUrl } from './corpus.ts';
import { loadShared } from './shared.ts';

const root = document.querySelector<HTMLDivElement>('#app')!;

// 離線使用；有新版本時自動換新
registerSW({ immediate: true });

async function start() {
  // 從主畫面打開 App 時先到遊戲客戶端的首頁；從「開始」進來（#/home）就留在學習
  if (opensClientHome(location.hash)) {
    location.replace(corpusHomeUrl());
    return;
  }
  const shared = await loadShared(sharedModuleUrl());
  await shared.initShared();
  root.replaceChildren(document.createElement('study-app'));
  // 先把詞典載好，之後離線也查得到釋義
  setTimeout(() => shared.lookupWord('the').catch(() => {}), 2000);
}

start().catch((error) => {
  root.innerHTML = `<p class="notice error">載入語料庫失敗，請檢查網路後重新整理。（${error}）</p>`;
});
