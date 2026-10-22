// 測試用的卡片與紀錄
import type { ReviewLog, SentenceCard, WordCard } from '../lol-shared-types.ts';

const baseFsrs = { stability: 0, difficulty: 0, elapsed_days: 0, scheduled_days: 0, learning_steps: 0, reps: 0, lapses: 0 };

export function word(lemma: string, opts: { due?: Date; isNew?: boolean; addedAt?: Date } = {}): WordCard {
  return {
    id: `word:${lemma}`,
    kind: 'word',
    word: lemma,
    lemma,
    addedAt: (opts.addedAt ?? new Date(2026, 9, 1)).toISOString(),
    origin: 'corpus',
    fsrs: { ...baseFsrs, due: (opts.due ?? new Date(2026, 9, 1)).toISOString(), state: opts.isNew === false || opts.due ? 2 : 0 },
  };
}

export function sentence(en: string, opts: { due?: Date } = {}): SentenceCard {
  return {
    id: `sentence:spell:Ahri/Q:${en}`,
    kind: 'sentence',
    text: { en, zh_TW: '甲', zh_CN: '甲' },
    source: { type: 'spell', id: 'Ahri/Q' },
    addedAt: new Date(2026, 9, 1).toISOString(),
    origin: 'corpus',
    fsrs: { ...baseFsrs, due: (opts.due ?? new Date(2026, 9, 1)).toISOString(), state: opts.due ? 2 : 0 },
  };
}

export function log(cardId: string, at: Date, rating: ReviewLog['rating'], extra: Partial<ReviewLog> = {}): ReviewLog {
  return { cardId, rating, reviewedAt: at.toISOString(), mode: 'word', hinted: false, ...extra };
}
