# LoL 英語學習

用英雄聯盟的遊戲文字練英語：挖空、看中寫英、聽寫，搭配 FSRS 遺忘曲線複習，在 iPad 上用 Apple Pencil 手寫作答。遊戲資料和共用模組從 [語料庫](https://github.com/yordlenl/lol-corpus) 載入，生詞本與複習紀錄兩邊共用。

- 網址：<https://yordlenl.github.io/lol-study/>
- 目前進度：第一階段（準備）— 空白首頁＋共用資料測試

## 常用指令

| 指令 | 做什麼 |
| --- | --- |
| `npm install` | 第一次下載倉庫後安裝套件 |
| `npm run dev` | 在 Mac 上開預覽；iPad 連同一個 Wi-Fi 也能打開 |
| `npm test` | 跑測試 |
| `npm run build` | 建置成網站檔案（放在 `dist/`） |
| `npm run icons` | 重新產生主畫面圖示 |

推到 `main` 之後，GitHub Actions 會自動跑測試、建置、發布；**測試沒過就不會發布**。

## 資料夾

- `src/`：網頁程式
- `public/`：原樣發布的檔案（manifest、圖示）
- `scripts/`：開發用小工具

iPad 偵錯步驟寫在語料庫倉庫的 [docs/ipad-debugging.md](https://github.com/yordlenl/lol-corpus/blob/main/docs/ipad-debugging.md)。
