import { describe, expect, it } from 'vitest';
import type { Champion, ChampionSummary, Item, SharedModule, Tri } from '../lol-shared-types.ts';
import { buildQuestions } from './questions.ts';
import { CATEGORIES, listItems, loadBlocks, modeAvailable, RANDOM_NAME_COUNT, RANDOM_NAMES, RANDOM_QUOTES, TIER_LABELS } from './catalog.ts';

const tri = (en: string, zh = `中${en}`): Tri => ({ en, zh_TW: zh, zh_CN: zh });
const item = (id: string, tier: Item['tier'], total: number) =>
  ({ id, tier, gold: { total }, name: { en: id, zh_TW: id, zh_CN: id }, icon: `img/item/${id}.png` }) as Item;

const index = Array.from({ length: 30 }, (_, i) => ({ id: `C${i}`, key: String(i), name: tri(`Champ${i}`), title: tri(`the title ${i}`), tags: [], icon: '' })) as ChampionSummary[];
const champion = (id: string): Champion =>
  ({
    ...index.find((c) => c.id === id)!,
    passive: { name: tri('P'), description: tri('Passive text here.'), icon: '' },
    spells: [],
    skins: [],
    quotes: [
      { id: `${id}/base/pick-1`, champion: id, voiceSet: 'base', event: 'pick', text: { en: 'Quote one is here.', zh_TW: '台詞一', zh_CN: '台词一', ko: '' }, audio: { en: 'a.mp3', zh_TW: '', zh_CN: '', ko: '' }, translation: { en: 'original', zh_TW: 'learning', zh_CN: 'learning', ko: '' }, source: '' },
    ],
  }) as unknown as Champion;

const shared = {
  loadChampionIndex: async () => index,
  loadChampion: async (id: string) => champion(id),
  loadItems: async () => [item('IE', 'legendary', 3450), item('Potion', 'starter', 50), item('Pickaxe', 'basic', 875), item('Sword', 'basic', 350), item('Zeal', 'epic', 1100)],
} as unknown as SharedModule;

// 挖空：名字是專有名詞，不挖（給 0 個空格）；其他照常
const tools = {
  planCloze: async (text: unknown) => (typeof text === 'string' && /^Champ\d+$/.test(text) ? [] : [1]),
  sentenceUnits: (t: Tri) => [{ text: t, alignment: 'sentence' as const }],
};

describe('練習的類別', () => {
  it('五個類別，對應開始畫面的五個大圖示', () => {
    expect(CATEGORIES.map((c) => c.label)).toEqual(['英雄', '技能', '裝備', '符文', '召喚師技能']);
  });

  it('只有英雄類別能聽寫（只有台詞有遊戲原聲）；隨機挑戰每個類別都能選', () => {
    for (const c of CATEGORIES) {
      expect(modeAvailable(c.id, 'dictation')).toBe(c.id === 'champions');
      expect(modeAvailable(c.id, 'challenge')).toBe(true);
      expect(modeAvailable(c.id, 'cloze')).toBe(true);
    }
  });

  it('裝備和語料庫商店一樣分起始、基礎、中間件、傳說四區，每區依價格排', async () => {
    expect(TIER_LABELS.map(([, label]) => label)).toEqual(['起始', '基礎', '中間件', '傳說']);
    const list = await listItems(shared, 'items');
    expect(list.map((e) => `${e.group}:${e.id}`)).toEqual(['起始:Potion', '基礎:Sword', '基礎:Pickaxe', '中間件:Zeal', '傳說:IE']);
  });
});

describe('英雄類別', () => {
  it('最前面兩張特別卡；「隨機英雄名字」只在看中寫英出現', async () => {
    expect((await listItems(shared, 'champions', 'translate')).slice(0, 2).map((i) => i.id)).toEqual([RANDOM_NAMES, RANDOM_QUOTES]);
    expect((await listItems(shared, 'champions', 'cloze'))[0].id).toBe(RANDOM_QUOTES);
    expect((await listItems(shared, 'skills', 'cloze'))[0].id).toBe('C0');
  });

  it('隨機英雄名字：20 位、不重複，只出看中寫英', async () => {
    const blocks = await loadBlocks(shared, 'champions', RANDOM_NAMES);
    expect(blocks).toHaveLength(RANDOM_NAME_COUNT);
    expect(new Set(blocks.map((b) => b.source.id)).size).toBe(RANDOM_NAME_COUNT);
    expect((await buildQuestions(blocks, 'translate', tools)).map((q) => q.mode === 'translate' && q.text.en).slice(0, 1)[0]).toMatch(/^Champ\d+$/);
    expect(await buildQuestions(blocks, 'cloze', tools)).toEqual([]);
    expect(await buildQuestions(blocks, 'dictation', tools)).toEqual([]);
  });

  it('點某位英雄：挖空出稱號和台詞，看中寫英出名字、稱號和台詞，聽寫出有原聲的台詞', async () => {
    const blocks = await loadBlocks(shared, 'champions', 'C3');
    const cloze = await buildQuestions(blocks, 'cloze', tools);
    expect(cloze.map((q) => q.block.id)).toEqual(['C3/title', 'C3/base/pick-1']);
    const translate = await buildQuestions(blocks, 'translate', tools);
    expect(translate.map((q) => q.block.id)).toEqual(['C3/name', 'C3/title', 'C3/base/pick-1']);
    const dictation = await buildQuestions(blocks, 'dictation', tools);
    expect(dictation.map((q) => q.block.id)).toEqual(['C3/base/pick-1']);
  });
});
