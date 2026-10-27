// @vitest-environment happy-dom
// 單字朗讀的喇叭：複習答案、生詞本、設定頁。喇叭本身（<lol-speak-button>）在語料庫的共用模組裡測。
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Settings } from '../../lol-shared-types.ts';
import { word } from '../../review/fixtures.ts';

const current: Settings = { rows: { en: true, zh_TW: true, zh_CN: true }, dailyNew: 20, speech: { accent: 'en-US', rate: 'normal' } };
const update = vi.fn(async (patch: Partial<Settings>) => void Object.assign(current, patch));
const card = word('minion');

vi.mock('../../shared.ts', () => ({
  shared: () => ({
    learningStore: () => ({
      listCards: async () => [card],
      listReviewLogs: async () => [],
      getSettings: async () => current,
    }),
    lookupWord: async (key: string) => ({ surface: key, lemma: key, entry: { p: "'minjən", t: 'n. 小兵' } }),
    grade: { isCorrect: (a: string, list: string[]) => list.includes(a), ratingFor: () => 3, hintText: () => '' },
    recordReview: async (c: unknown) => ({ card: c }),
    settings: { current, update },
    loadMeta: () => new Promise(() => {}),
  }),
}));

const { PageReview } = await import('./review.ts');
const { PageWords } = await import('./words.ts');
const { PageSettings } = await import('./settings.ts');

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

async function mount<T extends HTMLElement & { updateComplete: Promise<boolean> }>(page: T) {
  document.body.append(page);
  await settle();
  await settle();
  await page.updateComplete;
  return page;
}

afterEach(() => document.body.replaceChildren());

describe('單字朗讀的喇叭', () => {
  it('複習單字卡：作答前沒有喇叭（不然等於告訴你答案），作答後答案旁邊有', async () => {
    const page = await mount(new PageReview());
    expect(page.querySelector('.answer-input')).not.toBeNull();
    expect(page.querySelector('lol-speak-button')).toBeNull();

    const input = page.querySelector<HTMLInputElement>('.answer-input')!;
    input.value = 'minion';
    input.dispatchEvent(new InputEvent('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await settle();
    await page.updateComplete;
    const speaker = page.querySelector('.solution lol-speak-button') as HTMLElement & { word: string };
    expect(speaker.word).toBe('minion');
  });

  it('生詞本：每個單字旁邊念原形', async () => {
    const page = await mount(new PageWords());
    const speaker = page.querySelector('.card-title lol-speak-button') as HTMLElement & { word: string };
    expect(speaker.word).toBe('minion');
  });

  it('設定頁：選英式、慢速會存起來', async () => {
    const page = await mount(new PageSettings());
    const buttons = [...page.querySelectorAll<HTMLButtonElement>('.speech-settings .segmented button')];
    expect(buttons.map((b) => b.textContent!.trim())).toEqual(['美式', '英式', '正常', '慢速']);
    expect(buttons[0].classList.contains('on')).toBe(true);

    buttons[1].click();
    await page.updateComplete;
    page.querySelectorAll<HTMLButtonElement>('.speech-settings .segmented button')[3].click();
    await page.updateComplete;
    expect(update).toHaveBeenLastCalledWith({ speech: { accent: 'en-GB', rate: 'slow' } });
    expect(page.querySelector('.speech-settings .segmented button.on')?.textContent?.trim()).toBe('英式');
  });
});
