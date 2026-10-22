// 共用模組的網址。正式網站上和語料庫同一個網域，直接用路徑；
// 在 Mac 上開發時（npm run dev）預設載入已發布的語料庫，也可以用 VITE_SHARED_URL 指定本機的語料庫。
export const PUBLISHED_SHARED_URL = 'https://yordlenl.github.io/lol-corpus/shared/lol-shared.js';

export function sharedModuleUrl(env: { DEV: boolean; VITE_SHARED_URL?: string } = import.meta.env): string {
  if (env.VITE_SHARED_URL) return env.VITE_SHARED_URL;
  return env.DEV ? PUBLISHED_SHARED_URL : '/lol-corpus/shared/lol-shared.js';
}
