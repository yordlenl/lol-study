// 練習的類別與項目，以及每個項目可以出題的內容。
import type { ChampionSummary, Item, ItemTier, Rune, RuneTree, SharedModule, SummonerSpell, Tri } from '../lol-shared-types.ts';
import type { Block, Mode } from './types.ts';

/** 練習的五個類別，對應遊戲「開始」畫面上的五個大圖示 */
export type CategoryId = 'champions' | 'skills' | 'items' | 'runes' | 'summoners';

export const CATEGORIES: Array<{ id: CategoryId; label: string; en: string; hint: string }> = [
  { id: 'champions', label: '英雄', en: 'Champions', hint: '英雄的名字、稱號，以及選用／禁用台詞（台詞有遊戲原聲，可以聽寫）。' },
  { id: 'skills', label: '技能', en: 'Abilities', hint: '每位英雄的被動和 Q／W／E／R 技能說明。' },
  { id: 'items', label: '裝備', en: 'Items', hint: '裝備的簡介和完整說明，照商店分起始、基礎、中間件、傳說四區。' },
  { id: 'runes', label: '符文', en: 'Runes', hint: '五系符文的完整說明。' },
  { id: 'summoners', label: '召喚師技能', en: 'Summoner Spells', hint: '召喚峽谷能用的召喚師技能說明。' },
];

export const categoryLabel = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)?.label ?? id;

/** 「英雄」類別的兩張特別卡：隨機英雄名字（20 位）、隨機台詞（10 句） */
export const RANDOM_NAMES = 'random-names';
export const RANDOM_QUOTES = 'random-quotes';
export const RANDOM_NAME_COUNT = 20;
const RANDOM_QUOTE_COUNT = 10;

/** 哪些題型可以出：只有台詞有遊戲原聲，所以聽寫只有英雄類別 */
export function modeAvailable(category: CategoryId, mode: Mode | 'challenge'): boolean {
  return mode !== 'dictation' || category === 'champions';
}

/** 和語料庫的裝備商店一樣分四區 */
export const TIER_LABELS: Array<[ItemTier, string]> = [
  ['starter', '起始'],
  ['basic', '基礎'],
  ['epic', '中間件'],
  ['legendary', '傳說'],
];

export interface ItemEntry {
  id: string;
  name: Tri;
  icon?: string;
  group?: string;
}

/** 某個類別底下可以選的項目；英雄類別最前面有兩張特別卡（隨機英雄名字只在看中寫英出現） */
export async function listItems(shared: SharedModule, category: CategoryId, mode?: Mode): Promise<ItemEntry[]> {
  switch (category) {
    case 'champions':
    case 'skills': {
      const list: ItemEntry[] = (await shared.loadChampionIndex()).map((c: ChampionSummary) => ({ id: c.id, name: c.name, icon: c.icon }));
      if (category === 'skills') return list;
      const special: ItemEntry[] = [
        ...(mode === undefined || mode === 'translate'
          ? [{ id: RANDOM_NAMES, name: { en: 'Random champion names', zh_TW: `隨機英雄名字（${RANDOM_NAME_COUNT} 位）`, zh_CN: '' } }]
          : []),
        { id: RANDOM_QUOTES, name: { en: 'Random quotes', zh_TW: `隨機台詞（${RANDOM_QUOTE_COUNT} 句）`, zh_CN: '' } },
      ];
      return [...special, ...list];
    }
    case 'items': {
      const items = await shared.loadItems();
      return TIER_LABELS.flatMap(([tier, label]) =>
        items
          .filter((i: Item) => i.tier === tier)
          .sort((a, b) => a.gold.total - b.gold.total)
          .map((i) => ({ id: i.id, name: i.name, icon: i.icon, group: label })),
      );
    }
    case 'runes': {
      const { trees } = await shared.loadRunes();
      return trees.flatMap((t: RuneTree) => t.slots.flat().map((r: Rune) => ({ id: String(r.id), name: r.name, icon: r.icon, group: t.name.zh_TW })));
    }
    case 'summoners':
      return (await shared.loadSummoners()).map((s: SummonerSpell) => ({ id: s.id, name: s.name, icon: s.icon }));
  }
}

/** 英雄名字當一題（只出看中寫英：名字是專有名詞，挖空不會挖） */
export const nameBlock = (c: { id: string; name: Tri }): Block => ({
  id: `${c.id}/name`,
  source: { type: 'champion', id: c.id, label: c.name },
  text: c.name,
  view: { type: 'plain', label: '英雄名字' },
  whole: true,
});

const SLOT_LABEL = '被動';

/** 某個項目可以出題的內容（一塊一塊） */
export async function loadBlocks(shared: SharedModule, category: CategoryId, id: string, random = Math.random): Promise<Block[]> {
  switch (category) {
    case 'champions': {
      const index = await shared.loadChampionIndex();
      if (id === RANDOM_NAMES) return shuffle(index, random).slice(0, RANDOM_NAME_COUNT).map(nameBlock);
      if (id === RANDOM_QUOTES) {
        const picked = shuffle(index, random).slice(0, RANDOM_QUOTE_COUNT);
        const blocks = await Promise.all(picked.map(async (c) => quoteBlocks(await shared.loadChampion(c.id))));
        return blocks.map((list) => list[Math.floor(random() * list.length)]).filter(Boolean);
      }
      const c = await shared.loadChampion(id);
      const title: Block = {
        id: `${c.id}/title`,
        source: { type: 'champion', id: c.id, label: c.name },
        text: c.title,
        view: { type: 'plain', label: `${c.name.zh_TW} 的稱號` },
        whole: true,
      };
      return [nameBlock(c), title, ...quoteBlocks(c)];
    }
    case 'skills': {
      const c = await shared.loadChampion(id);
      return [
        { id: `${c.id}/passive`, source: { type: 'passive', id: c.id, label: c.passive.name }, text: c.passive.description, view: { type: 'spell', ability: c.passive, slotLabel: SLOT_LABEL } },
        ...c.spells.map((sp) => ({
          id: `${c.id}/${sp.slot}`,
          source: { type: 'spell' as const, id: `${c.id}/${sp.slot}`, label: sp.name },
          text: sp.description,
          view: { type: 'spell' as const, ability: sp, slotLabel: sp.slot },
        })),
      ];
    }
    case 'items': {
      const item = (await shared.loadItems()).find((i) => i.id === id);
      if (!item) return [];
      const source = { type: 'item' as const, id: item.id, label: item.name };
      const blocks: Block[] = [{ id: `${item.id}/description`, source, text: item.description, view: { type: 'item', item } }];
      if (item.plaintext.en) blocks.unshift({ id: `${item.id}/plaintext`, source, text: item.plaintext, view: { type: 'plain', label: `${item.name.zh_TW} 簡介` } });
      return blocks;
    }
    case 'runes': {
      const rune = (await shared.loadRunes()).trees.flatMap((t) => t.slots.flat()).find((r) => String(r.id) === id);
      return rune ? [{ id: `rune/${rune.id}`, source: { type: 'rune', id: String(rune.id), label: rune.name }, text: rune.long, view: { type: 'rune', rune } }] : [];
    }
    case 'summoners': {
      const s = (await shared.loadSummoners()).find((x) => x.id === id);
      return s ? [{ id: `summoner/${s.id}`, source: { type: 'summoner', id: s.id, label: s.name }, text: s.description, view: { type: 'spell', ability: s } }] : [];
    }
  }
}

function shuffle<T>(list: T[], random: () => number): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 一位英雄可以出題的台詞（非語言聲音、虛構語言不出題） */
export function quoteBlocks(c: { id: string; quotes: import('../lol-shared-types.ts').Quote[] }): Block[] {
  return c.quotes
    .filter((q) => !q.nonverbal && !q.fictionalLanguage)
    .map((q) => ({
      id: q.id,
      source: { type: 'quote' as const, id: q.id },
      text: { en: q.text.en, zh_TW: q.text.zh_TW, zh_CN: q.text.zh_CN },
      view: { type: 'quote' as const, quote: q },
      ...(q.audio.en ? { audio: q.audio.en } : {}),
      whole: true,
    }));
}
