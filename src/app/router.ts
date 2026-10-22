// 網址 #/review 這類形式 ↔ 頁面。

export type Route =
  | { page: 'home' }
  | { page: 'review' }
  | { page: 'words'; tab: 'word' | 'sentence' }
  | { page: 'settings' };

export function parseHash(hash: string): Route {
  const [page, sub] = hash.replace(/^#\/?/, '').split('/');
  switch (page) {
    case 'review':
      return { page: 'review' };
    case 'words':
      return { page: 'words', tab: sub === 'sentences' ? 'sentence' : 'word' };
    case 'settings':
      return { page: 'settings' };
    default:
      return { page: 'home' };
  }
}
