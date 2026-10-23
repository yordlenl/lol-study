import { describe, expect, it } from 'vitest';
import type { Item, SharedModule } from '../lol-shared-types.ts';
import { listItems, TIER_LABELS } from './catalog.ts';

const item = (id: string, tier: Item['tier'], total: number) =>
  ({ id, tier, gold: { total }, name: { en: id, zh_TW: id, zh_CN: id }, icon: `img/item/${id}.png` }) as Item;

describe('練習選裝備', () => {
  it('和語料庫商店一樣分起始、基礎、中間件、傳說四區，每區依價格排', async () => {
    expect(TIER_LABELS.map(([, label]) => label)).toEqual(['起始', '基礎', '中間件', '傳說']);
    const items = [item('IE', 'legendary', 3450), item('Potion', 'starter', 50), item('Pickaxe', 'basic', 875), item('Sword', 'basic', 350), item('Zeal', 'epic', 1100)];
    const shared = { loadItems: async () => items } as unknown as SharedModule;
    const list = await listItems(shared, 'items');
    expect(list.map((e) => `${e.group}:${e.id}`)).toEqual(['起始:Potion', '基礎:Sword', '基礎:Pickaxe', '中間件:Zeal', '傳說:IE']);
  });
});
