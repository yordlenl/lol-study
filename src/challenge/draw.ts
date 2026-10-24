// 隨機挑戰抽題：系統抽，使用者不能挑。只從選定的類別抽（例如選「英雄」就只出稱號和台詞）。
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
import type { CategoryId } from '../practice/catalog.ts';
import type { Question } from '../practice/types.ts';

export type Direction = 'zh2en' | 'en2zh' | 'mixed';

export const DIRECTION_LABELS: Record<Direction, string> = { zh2en: '中→英', en2zh: '英→中', mixed: '混合' };
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


const plain = (r: Rich) => (typeof r === 'string' ? r : r.map((x) => (typeof x === 'string' ? x : x[0])).join(''));
const pick = <T>(list: T[], random: () => number): T | undefined => list[Math.floor(random() * list.length)];
const keyOf = (d: Drawn) => `${d.source.type}:${d.source.id}:${d.text.en}`;

/**
 * 適合當挑戰題的句子：排除數值行，例如「100% Base Mana Regen」（數字開頭）、
 * 「Cooldown for damage restoration: 8s」（標籤後面接數字）
 */
export function isChallengeSentence(en: string): boolean {
  return !/^\s*["'“]?[\d+\-%]/.test(en) && !/:\s*[+\-]?\d/.test(en) && (en.match(/[A-Za-z]{2,}/g) ?? []).length >= 3;
}

/** 從某一類抽一句（數值行、非語言聲音、虛構語言不出題） */
async function drawFrom(shared: SharedModule, category: CategoryId, random: () => number): Promise<Drawn | null> {
  const units = (text: Tri<Rich>) => shared.sentenceUnits(text).filter((u) => isChallengeSentence(u.text.en));
  switch (category) {
    case 'champions': {
      // 英雄：稱號和選用／禁用台詞
      const summary = pick(await shared.loadChampionIndex(), random);
      if (!summary) return null;
      const c = await shared.loadChampion(summary.id);
      const pool: Drawn[] = [
        { text: c.title, alignment: 'sentence' as const, source: { type: 'champion' as const, id: c.id, label: c.name } },
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
    case 'skills': {
      const summary = pick(await shared.loadChampionIndex(), random);
      if (!summary) return null;
      const c = await shared.loadChampion(summary.id);
      const pool: Drawn[] = [
        ...units(c.passive.description).map((u) => ({ ...u, source: { type: 'passive' as const, id: c.id, label: c.passive.name } })),
        ...c.spells.flatMap((sp) =>
          units(sp.description).map((u) => ({ ...u, source: { type: 'spell' as const, id: `${c.id}/${sp.slot}`, label: sp.name } })),
        ),
      ];
      return pick(pool, random) ?? null;
    }
    case 'items': {
      const item: Item | undefined = pick(await shared.loadItems(), random);
      if (!item) return null;
      const source = { type: 'item' as const, id: item.id, label: item.name };
      return pick([...units(item.plaintext), ...units(item.description)].map((u) => ({ ...u, source })), random) ?? null;
    }
    case 'runes': {
      const rune: Rune | undefined = pick((await shared.loadRunes()).trees.flatMap((t) => t.slots.flat()), random);
      if (!rune) return null;
      const source = { type: 'rune' as const, id: String(rune.id), label: rune.name };
      return pick(units(rune.long).map((u) => ({ ...u, source })), random) ?? null;
    }
    case 'summoners': {
      const s: SummonerSpell | undefined = pick(await shared.loadSummoners(), random);
      if (!s) return null;
      const source = { type: 'summoner' as const, id: s.id, label: s.name };
      return pick(units(s.description).map((u) => ({ ...u, source })), random) ?? null;
    }
  }
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

/** 從選定的類別抽一輪題目（同一句不重複） */
export async function drawRound(
  shared: SharedModule,
  direction: Direction,
  category: CategoryId,
  count = ROUND_SIZE,
  random: () => number = Math.random,
): Promise<ChallengeItem[]> {
  const items: ChallengeItem[] = [];
  const used = new Set<string>();
  for (let attempts = 0; items.length < count && attempts < count * 10; attempts++) {
    const d = await drawFrom(shared, category, random);
    if (!d || used.has(keyOf(d))) continue;
    const item = await toItem(shared, d, direction, random);
    if (!item) continue;
    used.add(keyOf(d));
    items.push(item);
  }
  return items;
}
