// 從語料庫載入的共用模組。啟動時載入一次，各頁用 shared() 取得。
import type { SharedModule } from './lol-shared-types.ts';

let loaded: SharedModule | null = null;

export async function loadShared(url: string): Promise<SharedModule> {
  loaded = (await import(/* @vite-ignore */ url)) as SharedModule;
  return loaded;
}

export function shared(): SharedModule {
  if (!loaded) throw new Error('共用模組還沒載入');
  return loaded;
}
