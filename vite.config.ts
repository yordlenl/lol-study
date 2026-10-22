import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  // 發布在 yordlenl.github.io/lol-study/ 底下
  base: '/lol-study/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __COMMIT__: JSON.stringify(process.env.GITHUB_SHA?.slice(0, 7) ?? '本機'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  // 本機預覽時把 /lol-corpus/ 轉給語料庫的預覽（port 4173），模擬兩個網站在同一個網域底下
  preview: {
    proxy: { '/lol-corpus': 'http://localhost:4173' },
  },
  test: {
    environment: 'node',
  },
});
