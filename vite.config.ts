import { readFileSync } from 'node:fs';
import { VitePWA } from 'vite-plugin-pwa';
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
  plugins: [
    // 離線使用：先存好自己的網頁；從語料庫讀的共用模組和資料，有網路時拿最新的、離線時用存好的。
    // manifest 用 public/manifest.webmanifest（範圍涵蓋整個網域，主畫面只放這一個 App）。
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: false,
      scope: '/lol-study/',
      workbox: {
        // 新版本下載好就立刻接手，不用等 App 完全關掉再開（我們自己註冊 service worker，外掛不會自動加這兩項）
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{html,js,css,png,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/lol-corpus/img/'),
            handler: 'CacheFirst',
            options: { cacheName: 'corpus-images', expiration: { maxEntries: 2000 } },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/lol-corpus/'),
            handler: 'NetworkFirst',
            options: { cacheName: 'corpus-data', networkTimeoutSeconds: 4 },
          },
        ],
      },
    }),
  ],
  // 本機預覽時把 /lol-corpus/ 轉給語料庫的預覽（port 4173），模擬兩個網站在同一個網域底下
  preview: {
    proxy: { '/lol-corpus': 'http://localhost:4173' },
  },
  test: {
    environment: 'node',
  },
});
