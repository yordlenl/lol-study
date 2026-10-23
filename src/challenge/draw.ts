// 隨機挑戰抽題：系統抽，使用者不能挑。
// 全部內容：英雄、裝備、符文、召喚師技能四類輪流平均；只從生詞本與收藏：句子卡＋單字卡收藏時所在的那一句。
import type {
  Alignment,
  Item,
  RecognitionQuestion,
  Rich,
  Rune,
  SharedModule,
  SourceRef,
  SummonerSpell,
  Tri,
} from '../lol-shared-types.ts';
import type { Question } from '../practice/types.ts';

export type Direction = 'zh2en' | 'en2zh' | 'mixed';
export type Scope = 'all' | 'mine';

export const DIRECTION_LABELS: Record<Direction, string> = { zh2en: '中→英', en2zh: '英→中', mixed: '混合' };
export const SCOPE_LABELS: Record<Scope, string> = { all: '全部內容', mine: '只從生詞本與收藏' };
export const ROUND_SIZE = 20;

/** 抽到的一句 */
export interface Drawn {
  text: Tri;
  alignment: Alignment;
  source: SourceRef;
  audio?: string;
}

export type ChallengeItem =
  | { direction: 'zh2en'; drawn: Drawn; question: Question }
  | { direction: 'en2zh'; drawn: Drawn; recognition: RecognitionQuestion };

type Category = 'champion' | 'item' | 'rune' | 'summoner';
const CATEGORIES: Category[] = ['champion', 'item', 'rune', 'summoner'];

const plain = (r: Rich) => (typeof r === 'string' ? r : r.map((x) => (typeof x === 'string' ? x : x[0])).join(''));
const pick = <T>(list: T[], random: () => number): T | undefined => list[Math.floor(random() * list.length)];
const keyOf = (d: Drawn) => `${d.source.type}:${d.source.id}:${d.text.en}`;

function shuffle<T>(list: T[], random: () => number): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 適合當挑戰題的句子：排除數值行，例如「100% Base Mana Regen」（數字開頭）、
 * 「Cooldown for damage restoration: 8s」（標籤後面接數字）
 */
export function isChallengeSentence(en: string): boolean {
  return !/^\s*["'“]?[\d+\-%]/.test(en) && !/:\s*[+\-]?\d/.test(en) && (en.match(/[A-Za-z]{2,}/g) ?? []).length >= 3;
}

/** 從某一類抽一句（數值行、非語言聲音、虛構語言不出題） */
async function drawFrom(shared: SharedModule, category: Category, random: () => number): Promise<Drawn | null> {
  const units = (text: Tri<Rich>) => shared.sentenceUnits(text).filter((u) => isChallengeSentence(u.text.en));
  switch (category) {
    case 'champion': {
      const summary = pick(await shared.loadChampionIndex(), random);
      if (!summary) return null;
      const c = await shared.loadChampion(summary.id);
      const pool: Drawn[] = [
        ...units(c.passive.description).map((u) => ({ ...u, source: { type: 'passive' as const, id: c.id, label: c.passive.name } })),
        ...c.spells.flatMap((sp) =>
          units(sp.description).map((u) => ({ ...u, source: { type: 'spell' as const, id: `${c.id}/${sp.slot}`, label: sp.name } })),
        ),
        ...c.quotes
          .filter((q) => !q.nonverbal && !q.fictionalLanguage)
          .map((q) => ({
            text: { en: q.text.en, zh_TW: q.text.zh_TW, zh_CN: q.text.zh_CN },
            alignment: 'sentence' as const,
            source: { type: 'quote' as const, id: q.id },
            ...(q.audio.en ? { audio: q.audio.en } : {}),
          })),
      ];
      return pick(pool, random) ?? null;
    }
    case 'item': {
      const item: Item | undefined = pick(await shared.loadItems(), random);
      if (!item) return null;
      const source = { type: 'item' as const, id: item.id, label: item.name };
      return pick([...units(item.plaintext), ...units(item.description)].map((u) => ({ ...u, source })), random) ?? null;
    }
    case 'rune': {
      const rune: Rune | undefined = pick((await shared.loadRunes()).trees.flatMap((t) => t.slots.flat()), random);
      if (!rune) return null;
      const source = { type: 'rune' as const, id: String(rune.id), label: rune.name };
      return pick(units(rune.long).map((u) => ({ ...u, source })), random) ?? null;
    }
    case 'summoner': {
      const s: SummonerSpell | undefined = pick(await shared.loadSummoners(), random);
      if (!s) return null;
      const source = { type: 'summoner' as const, id: s.id, label: s.name };
      return pick(units(s.description).map((u) => ({ ...u, source })), random) ?? null;
    }
  }
}

/** 生詞本與收藏裡可以出題的句子 */
export async function collectedSentences(shared: SharedModule): Promise<Drawn[]> {
  const cards = await shared.learningStore().listCards();
  const out = new Map<string, Drawn>();
  for (const card of cards) {
    if (card.kind === 'sentence') {
      const d: Drawn = { text: card.text, alignment: card.alignment ?? 'sentence', source: card.source, ...(card.audio ? { audio: card.audio } : {}) };
      out.set(keyOf(d), d);
    } else if (card.context) {
      // 單字卡：找出收藏時所在的那一句
      const word = new RegExp(`(?<![A-Za-z])${card.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z])`, 'i');
      const unit = shared.sentenceUnits(card.context.text).find((u) => word.test(u.text.en));
      if (unit) {
        const d: Drawn = { ...unit, source: card.context.source };
        out.set(keyOf(d), d);
      }
    }
  }
  return [...out.values()];
}

/** 中→英：隨機用挖空或看中寫英；中文只對到整段的只出挖空 */
async function zh2en(shared: SharedModule, d: Drawn, random: () => number): Promise<ChallengeItem | null> {
  const label = d.source.label ? `出自 ${d.source.label.zh_TW}` : '隨機挑戰';
  const block = {
    id: keyOf(d),
    source: d.source,
    text: d.text,
    view: { type: 'plain' as const, label },
    ...(d.audio ? { audio: d.audio } : {}),
    whole: true,
  };
  const blanks = await shared.planCloze(d.text.en);
  const modes: Array<'cloze' | 'translate'> = [];
  if (blanks.length) modes.push('cloze');
  if (d.alignment !== 'block') modes.push('translate');
  const mode = pick(modes, random);
  if (!mode) return null;
  const question: Question = mode === 'cloze' ? { mode, block, blanks } : { mode, block, text: { en: plain(d.text.en), zh_TW: d.text.zh_TW, zh_CN: d.text.zh_CN } };
  return { direction: 'zh2en', drawn: d, question };
}

async function toItem(shared: SharedModule, d: Drawn, direction: Direction, random: () => number): Promise<ChallengeItem | null> {
  const wantEn2zh = direction === 'en2zh' || (direction === 'mixed' && random() < 0.5);
  if (wantEn2zh) {
    const recognition = await shared.recognitionQuestion(d.text.en, d.source, random);
    if (recognition) return { direction: 'en2zh', drawn: d, recognition };
    // 混合時，出處不能出英→中（例如英雄稱號）就改出中→英
    if (direction === 'en2zh') return null;
  }
  return zh2en(shared, d, random);
}

/** 抽一輪題目。回傳的 available 是這個範圍最多能出幾題 */
export async function drawRound(
  shared: SharedModule,
  direction: Direction,
  scope: Scope,
  count = ROUND_SIZE,
  random: () => number = Math.random,
): Promise<{ items: ChallengeItem[]; available: number }> {
  const items: ChallengeItem[] = [];
  const used = new Set<string>();

  if (scope === 'mine') {
    const pool = shuffle(await collectedSentences(shared), random);
    for (const d of pool) {
      if (items.length >= count) break;
      const item = await toItem(shared, d, direction, random);
      if (item) items.push(item);
    }
    return { items, available: items.length };
  }

  let cycle: Category[] = [];
  for (let attempts = 0; items.length < count && attempts < count * 10; attempts++) {
    if (!cycle.length) cycle = shuffle(CATEGORIES, random);
    const category = cycle[0];
    const d = await drawFrom(shared, category, random);
    if (!d || used.has(keyOf(d))) continue;
    const item = await toItem(shared, d, direction, random);
    if (!item) continue;
    used.add(keyOf(d));
    items.push(item);
    cycle.shift();
  }
  return { items, available: count };
}
