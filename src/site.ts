import type { SiteId } from './storage-probe';

// 這個網站的基本資料。語料庫有一份對應的設定。
export const SITE: {
  id: SiteId;
  title: string;
  tagline: string;
  intro: string;
  other: { label: string; href: string };
} = {
  id: 'lol-study',
  title: 'LoL 英語學習',
  tagline: '挖空・看中寫英・聽寫・複習',
  intro: '這是開發中的空白首頁。之後會在這裡顯示今日待複習、今日新學、連續學習天數。',
  other: { label: '語料庫', href: '/lol-corpus/' },
};
