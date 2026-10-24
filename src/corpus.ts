// 共用模組的網址。正式網站上和語料庫同一個網域，直接用路徑；
// 在 Mac 上開發時（npm run dev）預設載入已發布的語料庫，也可以用 VITE_SHARED_URL 指定本機的語料庫。
export const PUBLISHED_SHARED_URL = 'https://yordlenl.github.io/lol-corpus/shared/lol-shared.js';

export function sharedModuleUrl(env: { DEV: boolean; VITE_SHARED_URL?: string } = import.meta.env): string {
  if (env.VITE_SHARED_URL) return env.VITE_SHARED_URL;
  return env.DEV ? PUBLISHED_SHARED_URL : '/lol-corpus/shared/lol-shared.js';
}

/** 遊戲客戶端首頁（語料庫首頁）的網址：從主畫面打開 App 時先到這裡，右上角關閉鈕也回這裡 */
export function corpusHomeUrl(env: { DEV: boolean; VITE_SHARED_URL?: string } = import.meta.env): string {
  if (env.VITE_SHARED_URL) return new URL('/lol-corpus/', env.VITE_SHARED_URL).href;
  return env.DEV ? new URL('/lol-corpus/', PUBLISHED_SHARED_URL).href : '/lol-corpus/';
}
