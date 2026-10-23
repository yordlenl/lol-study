// 練習的類別與項目，以及每個項目可以出題的內容。
import type { ChampionSummary, Item, ItemTier, Rune, RuneTree, SentenceCard, SharedModule, SummonerSpell, Tri } from '../lol-shared-types.ts';
import type { Block } from './types.ts';

export type CategoryId = 'champions' | 'skills' | 'items' | 'runes' | 'summoners' | 'quotes' | 'mine';

export const CATEGORIES: Array<{ id: CategoryId; label: string; hint: string }> = [
  { id: 'champions', label: '英雄', hint: '整頁：稱號、被動、技能、台詞' },
  { id: 'skills', label: '技能', hint: '被動和 Q/W/E/R' },
  { id: 'items', label: '裝備', hint: '簡介和描述' },
  { id: 'runes', label: '符文', hint: '符文描述' },
  { id: 'summoners', label: '召喚師技能', hint: '技能描述' },
  { id: 'quotes', label: '選用／禁用台詞', hint: '可以聽寫' },
  { id: 'mine', label: '生詞本與收藏', hint: '我的句子卡' },
];

export const categoryLabel = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)?.label ?? id;

export const RANDOM_QUOTES = 'random';
const RANDOM_QUOTE_COUNT = 10;

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

/** 某個類別底下可以選的項目 */
export async function listItems(shared: SharedModule, category: CategoryId): Promise<ItemEntry[]> {
  switch (category) {
    case 'champions':
    case 'skills':
    case 'quotes': {
      const list: ItemEntry[] = (await shared.loadChampionIndex()).map((c: ChampionSummary) => ({ id: c.id, name: c.name, icon: c.icon }));
      return category === 'quotes'
        ? [{ id: RANDOM_QUOTES, name: { en: 'Random', zh_TW: `全部隨機 ${RANDOM_QUOTE_COUNT} 句`, zh_CN: '' } }, ...list]
        : list;
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
    case 'mine':
      return [{ id: 'all', name: { en: 'My sentences', zh_TW: '我的句子卡', zh_CN: '' } }];
  }
}

const SLOT_LABEL = '被動';

/** 某個項目可以出題的內容（一塊一塊） */
export async function loadBlocks(shared: SharedModule, category: CategoryId, id: string, random = Math.random): Promise<Block[]> {
  switch (category) {
    case 'champions':
    case 'skills':
    case 'quotes': {
      if (category === 'quotes' && id === RANDOM_QUOTES) {
        const index = await shared.loadChampionIndex();
        const picked = [...index].sort(() => random() - 0.5).slice(0, RANDOM_QUOTE_COUNT);
        const blocks = await Promise.all(picked.map(async (c) => quoteBlocks(await shared.loadChampion(c.id))));
        return blocks.map((list) => list[Math.floor(random() * list.length)]).filter(Boolean);
      }
      const c = await shared.loadChampion(id);
      const skills: Block[] = [
        { id: `${c.id}/passive`, source: { type: 'passive', id: c.id, label: c.passive.name }, text: c.passive.description, view: { type: 'spell', ability: c.passive, slotLabel: SLOT_LABEL } },
        ...c.spells.map((sp) => ({
          id: `${c.id}/${sp.slot}`,
          source: { type: 'spell' as const, id: `${c.id}/${sp.slot}`, label: sp.name },
          text: sp.description,
          view: { type: 'spell' as const, ability: sp, slotLabel: sp.slot },
        })),
      ];
      if (category === 'skills') return skills;
      if (category === 'quotes') return quoteBlocks(c);
      const title: Block = { id: `${c.id}/title`, source: { type: 'champion', id: c.id, label: c.name }, text: c.title, view: { type: 'plain', label: `${c.name.zh_TW} 的稱號` } };
      return [title, ...skills, ...quoteBlocks(c)];
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
    case 'mine': {
      const cards = (await shared.learningStore().listCards('sentence')).filter((c): c is SentenceCard => c.kind === 'sentence');
      return cards.map((card) => {
        return {
          id: card.id,
          source: card.source,
          text: card.text,
          view: { type: 'plain', label: card.source.label ? `出自 ${card.source.label.zh_TW}` : '我的句子卡' },
          ...(card.audio ? { audio: card.audio } : {}),
          whole: true,
          card,
        } satisfies Block;
      });
    }
  }
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
