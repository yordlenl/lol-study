# LoL 英語學習

用英雄聯盟的遊戲文字練英語：挖空、看中寫英、聽寫，搭配 FSRS 遺忘曲線複習，在 iPad 上用 Apple Pencil 手寫作答。遊戲資料和共用模組從 [語料庫](https://github.com/yordlenl/lol-corpus) 載入，生詞本與複習紀錄兩邊共用。

- 網址：<https://yordlenl.github.io/lol-study/>（iPad 主畫面上的「LoL 英語」就是這個 App）
- 規格：語料庫倉庫的 [docs/spec.md](https://github.com/yordlenl/lol-corpus/blob/main/docs/spec.md)
- 目前進度：第九階段 — 學習 App 改成遊戲客戶端的「開始」畫面（深色）：分頁是主頁、練習、生詞本、設定；練習先選五個類別（英雄、技能、裝備、符文、召喚師技能）和題型（挖空、看中寫英、聽寫、隨機挑戰），按「確認」再選要練哪一個
  - 從主畫面打開 App 會先到客戶端首頁（語料庫首頁），按「開始」進學習
  - 第八階段：語料庫改成像遊戲客戶端（首頁、收藏）
  - 第六階段：語料庫照遊戲截圖重做裝備商店和符文頁；練習選裝備時也改成和商店一樣的四區（起始、基礎、中間件、傳說）
  - 第五階段：隨機挑戰（中→英、英→中五步流程、遮名、干擾項；範圍可選全部內容或只從生詞本與收藏）
  - 練習、隨機挑戰寫錯的句子自動收進句子庫，明天複習；答對不影響排程
  - 一天從凌晨 4 點算起

## 常用指令

| 指令 | 做什麼 |
| --- | --- |
| `npm install` | 第一次下載倉庫後安裝套件 |
| `npm run dev` | 在 Mac 上開預覽（共用模組從已發布的語料庫載入） |
| `npm test` | 跑測試 |
| `npm run build` | 建置成網站檔案（放在 `dist/`） |
| `npm run preview` | 預覽建置結果；`/lol-corpus/` 會轉給語料庫的預覽（語料庫要先在 4173 埠跑 `npm run preview`） |
| `npm run sync-types` | 從語料庫取得共用模組的最新型別（`src/lol-shared-types.ts`） |
| `npm run icons` | 重新產生主畫面圖示 |

推到 `main` 之後，GitHub Actions 會自動跑測試、建置、發布；**測試沒過就不會發布**。

## 和語料庫的關係

- 正式網站上，學習 App 從 `/lol-corpus/shared/lol-shared.js` 載入共用模組（資料讀取、卡片元件、學習紀錄資料庫、複習排程）。
- 在 Mac 上開發時，可以建立 `.env.development.local`，寫入 `VITE_SHARED_URL=http://localhost:5173/lol-corpus/src/shared/index.ts`，改用本機語料庫（`npm run dev`）的共用模組。
- iPad 主畫面只放這一個 App；它的範圍涵蓋整個 `yordlenl.github.io`，切到語料庫時仍在同一個 App 裡，紀錄才共用。

## 資料夾

- `src/`：網頁程式
- `public/`：原樣發布的檔案（manifest、圖示）
- `scripts/`：開發用小工具

iPad 偵錯步驟寫在語料庫倉庫的 [docs/ipad-debugging.md](https://github.com/yordlenl/lol-corpus/blob/main/docs/ipad-debugging.md)。
