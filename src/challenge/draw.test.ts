import { describe, expect, it } from 'vitest';
import type { Champion, ChampionSummary, Item, RuneData, SharedModule, SourceRef, StudyCard, SummonerSpell, Tri } from '../lol-shared-types.ts';
import { sentence, word } from '../review/fixtures.ts';
import { collectedSentences, drawRound, isChallengeSentence } from './draw.ts';

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

const typeOf = (ref: SourceRef) => (['passive', 'spell', 'quote'].includes(ref.type) ? 'champion' : ref.type);

function fakeShared(cards: StudyCard[] = []): SharedModule {
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
    learningStore: () => ({ listCards: async () => cards }),
  } as unknown as SharedModule;
}

describe('抽題', () => {
  it('全部內容：四類輪流平均，每輪 20 題，同一句不重複', async () => {
    let seed = 7;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const { items: round } = await drawRound(fakeShared(), 'zh2en', 'all', 20, random);
    expect(round).toHaveLength(20);
    const counts: Record<string, number> = {};
    for (const it of round) counts[typeOf(it.drawn.source)] = (counts[typeOf(it.drawn.source)] ?? 0) + 1;
    expect(counts).toEqual({ champion: 5, item: 5, rune: 5, summoner: 5 });
    expect(new Set(round.map((it) => `${it.drawn.source.id}:${it.drawn.text.en}`)).size).toBe(20);
  });

  it('非語言聲音的台詞不會被抽到', async () => {
    let seed = 1;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const { items: round } = await drawRound(fakeShared(), 'zh2en', 'all', 20, random);
    expect(round.every((it) => !it.drawn.source.id.endsWith('pick-2'))).toBe(true);
  });

  it('英→中只出能四選一的題目', async () => {
    const { items: round } = await drawRound(fakeShared(), 'en2zh', 'all', 8, Math.random);
    expect(round.every((it) => it.direction === 'en2zh')).toBe(true);
  });

  it('中→英：中文只對到整段的句子只出挖空', async () => {
    const card = { ...sentence('Ahri heals a lot now.'), alignment: 'block' as const };
    const { items: round } = await drawRound(fakeShared([card]), 'zh2en', 'mine', 20, () => 0.9);
    expect(round).toHaveLength(1);
    expect(round[0].direction === 'zh2en' && round[0].question.mode).toBe('cloze');
  });

  it('只從生詞本與收藏：句子卡＋單字卡收藏時所在的那一句；不夠 20 題就出有的', async () => {
    const w = { ...word('minion'), word: 'minions', context: { text: tri('Kill the minions to heal yourself.'), source: { type: 'passive' as const, id: 'Ahri' } } };
    const cards = [sentence('Ahri throws her orb far.'), w];
    expect((await collectedSentences(fakeShared(cards))).map((d) => d.text.en)).toEqual(['Ahri throws her orb far.', 'Kill the minions to heal yourself.']);
    const result = await drawRound(fakeShared(cards), 'zh2en', 'mine', 20);
    expect(result.items).toHaveLength(2);
    expect(result.available).toBe(2);
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
