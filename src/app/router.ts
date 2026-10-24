// 網址 #/practice/skills/cloze/Ahri 這類形式 ↔ 頁面。
// 練習的順序：類別和題型（練習分頁）→ 確認 → 選要練哪一個 → 作答；隨機挑戰：類別 → 確認 → 選方向 → 作答。
// 舊網址（#/practice/skills/Ahri/cloze、#/challenge…）照樣能用。
import type { Direction } from '../challenge/draw.ts';
import type { CategoryId } from '../practice/catalog.ts';
import type { Mode } from '../practice/types.ts';

export type Route =
  | { page: 'home' }
  | { page: 'review' }
  | { page: 'words'; tab: 'word' | 'sentence' }
  | { page: 'settings' }
  /** 練習分頁（五個大圖示）；category 是預先選好的類別 */
  | { page: 'practice'; category?: CategoryId }
  /** 按「確認」後選要練哪一個 */
  | { page: 'practice-pick'; category: CategoryId; mode: Mode }
  | { page: 'practice-session'; category: CategoryId; mode: Mode; id: string }
  /** 隨機挑戰：選方向 */
  | { page: 'challenge-setup'; category: CategoryId }
  | { page: 'challenge-run'; category: CategoryId; direction: Direction };

const CATEGORY_IDS = new Set<string>(['champions', 'skills', 'items', 'runes', 'summoners']);
/** 舊的類別：選用／禁用台詞併進英雄 */
const OLD_CATEGORIES: Record<string, CategoryId> = { quotes: 'champions' };
const MODES = new Set<string>(['cloze', 'translate', 'dictation']);
const DIRECTIONS = new Set<string>(['zh2en', 'en2zh', 'mixed']);

function categoryOf(value: string | undefined): CategoryId | undefined {
  if (!value) return undefined;
  if (CATEGORY_IDS.has(value)) return value as CategoryId;
  return OLD_CATEGORIES[value];
}

/** 舊網址裡「全部隨機台詞」的代號 */
const oldItemId = (id: string) => (id === 'random' ? 'random-quotes' : id);

export function parseHash(hash: string): Route {
  const [page, a, b, c] = hash
    .replace(/^#\/?/, '')
    .split('/')
    .map((p) => decodeURIComponent(p));
  switch (page) {
    case 'review':
      return { page: 'review' };
    case 'words':
      return { page: 'words', tab: a === 'sentences' ? 'sentence' : 'word' };
    case 'settings':
      return { page: 'settings' };
    case 'practice': {
      const category = categoryOf(a);
      if (!category) return { page: 'practice' };
      if (b === 'challenge') {
        return c && DIRECTIONS.has(c) ? { page: 'challenge-run', category, direction: c as Direction } : { page: 'challenge-setup', category };
      }
      if (b && MODES.has(b)) {
        return c ? { page: 'practice-session', category, mode: b as Mode, id: c } : { page: 'practice-pick', category, mode: b as Mode };
      }
      // 舊網址：#/practice/類別/項目/題型
      if (b && c && MODES.has(c)) return { page: 'practice-session', category, mode: c as Mode, id: oldItemId(b) };
      return { page: 'practice', category };
    }
    // 舊的隨機挑戰網址：回練習分頁重新選
    case 'challenge':
      return { page: 'practice' };
    default:
      return { page: 'home' };
  }
}

export function href(...parts: string[]): string {
  return `#/${parts.map((p) => encodeURIComponent(p)).join('/')}`;
}

/**
 * 從主畫面打開 App（網址沒有 #…）時，先到遊戲客戶端的首頁（語料庫首頁）；
 * 從「開始」進來的網址會帶 #/home，不會被轉走。
 */
export const opensClientHome = (hash: string) => hash === '' || hash === '#' || hash === '#/';
