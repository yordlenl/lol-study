import { describe, expect, it } from 'vitest';
import type { Champion, ChampionSummary, Item, RuneData, SharedModule, SourceRef, SummonerSpell, Tri } from '../lol-shared-types.ts';
import { drawRound, isChallengeSentence } from './draw.ts';

const tri = (en: string): Tri => ({ en, zh_TW: `中：${en}`, zh_CN: `中：${en}` });
const sentenceText = (label: string, i: number) => `The ${label} number ${i} deals magic damage.`;

function champion(id: string): Champion {
  return {
    id,
    key: id,
    name: tri(id),
    title: tri('the title'),
    tags: ['Mage'],
    icon: `img/champion/${id}.png`,
    passive: { name: tri(`${id} Passive`), description: tri(sentenceText(`${id} passive`, 0)), icon: '' },
    spells: (['Q', 'W', 'E', 'R'] as const).map((slot, i) => ({ slot, name: tri(`${id} ${slot}`), description: tri(sentenceText(`${id} spell`, i)), icon: '', cooldown: '', cost: '', range: '' })),
    skins: [],
    quotes: [0, 1, 2].map((i) => ({
      id: `${id}/base/pick-${i}`,
      champion: id,
      voiceSet: 'base',
      event: 'pick',
      text: { en: `"Quote line number ${i} from ${id}."`, zh_TW: '台詞', zh_CN: '台词', ko: '' },
      audio: { en: 'https://wiki.leagueoflegends.com/a.mp3', zh_TW: '', zh_CN: '', ko: '' },
      translation: { en: 'original', zh_TW: 'learning', zh_CN: 'learning', ko: '' },
      source: 'https://wiki.leagueoflegends.com/x?oldid=1',
      ...(i === 2 ? { nonverbal: true } : {}),
    })),
  };
}

const champs = ['Ahri', 'Lux'].map(champion);
const items = Array.from({ length: 8 }, (_, i) => ({ id: String(1000 + i), name: tri(`Item ${i}`), plaintext: tri(''), description: tri(sentenceText('item', i)), icon: '', tags: [], depth: 1 }) as unknown as Item);
const runes = { trees: [{ id: 1, key: 'T', name: tri('Tree'), icon: '', slots: [Array.from({ length: 8 }, (_, i) => ({ id: 8000 + i, key: '', name: tri(`Rune ${i}`), short: tri(''), long: tri(sentenceText('rune', i)), icon: '' }))] }], shards: [] } as unknown as RuneData;
const summoners = Array.from({ length: 8 }, (_, i) => ({ id: `S${i}`, key: '', name: tri(`Spell ${i}`), description: tri(sentenceText('summoner', i)), cooldown: '', icon: '' }) as SummonerSpell);

function fakeShared(): SharedModule {
  return {
    loadChampionIndex: async () => champs as unknown as ChampionSummary[],
    loadChampion: async (id: string) => champs.find((c) => c.id === id)!,
    loadItems: async () => items,
    loadRunes: async () => runes,
    loadSummoners: async () => summoners,
    sentenceUnits: (t: Tri) => (t.en ? [{ text: t, alignment: 'sentence' as const }] : []),
    planCloze: async () => [1],
    recognitionQuestion: async (english: string, ref: SourceRef) =>
      ref.type === 'champion' ? null : { masked: english, answer: { kind: 'item', id: ref.id, name: tri('x'), icon: '' }, options: [] },
  } as unknown as SharedModule;
}

const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

describe('抽題（只從選定的類別）', () => {
  it('英雄：只抽稱號和台詞，每輪最多 20 題，同一句不重複', async () => {
    const round = await drawRound(fakeShared(), 'zh2en', 'champions', 20, seeded(7));
    expect(round.length).toBeGreaterThan(0);
    expect(round.every((it) => ['champion', 'quote'].includes(it.drawn.source.type))).toBe(true);
    expect(new Set(round.map((it) => `${it.drawn.source.id}:${it.drawn.text.en}`)).size).toBe(round.length);
  });

  it('技能：只抽被動和 Q/W/E/R', async () => {
    const round = await drawRound(fakeShared(), 'zh2en', 'skills', 10, seeded(3));
    expect(round).toHaveLength(10);
    expect(round.every((it) => ['passive', 'spell'].includes(it.drawn.source.type))).toBe(true);
  });

  it.each([
    ['items', 'item'],
    ['runes', 'rune'],
    ['summoners', 'summoner'],
  ] as const)('%s：只抽那一類', async (category, type) => {
    const round = await drawRound(fakeShared(), 'zh2en', category, 8, seeded(5));
    expect(round).toHaveLength(8);
    expect(round.every((it) => it.drawn.source.type === type)).toBe(true);
  });

  it('非語言聲音的台詞不會被抽到', async () => {
    const round = await drawRound(fakeShared(), 'zh2en', 'champions', 20, seeded(1));
    expect(round.every((it) => !it.drawn.source.id.endsWith('pick-2'))).toBe(true);
  });

  it('英→中只出能四選一的題目；英雄稱號不能四選一，所以不會出現', async () => {
    const items = await drawRound(fakeShared(), 'en2zh', 'items', 8, Math.random);
    expect(items.every((it) => it.direction === 'en2zh')).toBe(true);
    const heroes = await drawRound(fakeShared(), 'en2zh', 'champions', 5, seeded(9));
    expect(heroes.every((it) => it.drawn.source.type !== 'champion')).toBe(true);
  });
});

describe('適合當挑戰題的句子', () => {
  it('排除數值行，保留短台詞', () => {
    expect(isChallengeSentence('100% Base Mana Regen')).toBe(false);
    expect(isChallengeSentence('Cooldown for damage restoration: 8s')).toBe(false);
    expect(isChallengeSentence('30 min: + 48 AP or 29 AD')).toBe(false);
    expect(isChallengeSentence('"Violence solves everything."')).toBe(true);
    expect(isChallengeSentence('Level 9: Wards in the river are also Deep.')).toBe(true);
  });
});
