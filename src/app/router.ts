// 網址 #/review、#/practice/skills/Ahri/cloze 這類形式 ↔ 頁面。
import type { CategoryId } from '../practice/catalog.ts';
import type { Mode } from '../practice/types.ts';

export type Route =
  | { page: 'home' }
  | { page: 'review' }
  | { page: 'words'; tab: 'word' | 'sentence' }
  | { page: 'settings' }
  | { page: 'practice' }
  | { page: 'practice-items'; category: CategoryId }
  | { page: 'practice-modes'; category: CategoryId; id: string }
  | { page: 'practice-session'; category: CategoryId; id: string; mode: Mode };

const CATEGORY_IDS = new Set(['champions', 'skills', 'items', 'runes', 'summoners', 'quotes', 'mine']);
const MODES = new Set(['cloze', 'translate', 'dictation']);

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
      if (!a || !CATEGORY_IDS.has(a)) return { page: 'practice' };
      const category = a as CategoryId;
      if (!b) return { page: 'practice-items', category };
      if (!c || !MODES.has(c)) return { page: 'practice-modes', category, id: b };
      return { page: 'practice-session', category, id: b, mode: c as Mode };
    }
    default:
      return { page: 'home' };
  }
}

export function href(...parts: string[]): string {
  return `#/${parts.map((p) => encodeURIComponent(p)).join('/')}`;
}
