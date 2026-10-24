// @vitest-environment happy-dom
// 練習分頁（照遊戲「開始」畫面）：五個大圖示、題型選項、確認。
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../shared.ts', () => ({
  shared: () => ({ corpusUrl: (path: string) => `/lol-corpus/${path}` }),
}));

const { PagePractice, confirmHref } = await import('./practice.ts');

async function mount(category?: string) {
  const page = new PagePractice();
  page.initialCategory = category as never;
  document.body.append(page);
  await page.updateComplete;
  return page;
}

const options = (page: HTMLElement) => [...page.querySelectorAll<HTMLButtonElement>('.mode-option')];

afterEach(() => document.body.replaceChildren());

describe('練習分頁', () => {
  it('五個大圖示照遊戲排列，用遊戲的模式圖示（一般／滑過／選中）', async () => {
    const page = await mount();
    const tiles = [...page.querySelectorAll<HTMLButtonElement>('.mode-tile')];
    expect(tiles.map((t) => t.querySelector('.mode-name')?.textContent)).toEqual(['英雄', '技能', '裝備', '符文', '召喚師技能']);
    expect(tiles[0].getAttribute('style')).toContain('/lol-corpus/img/client/ui/mode-champions-active.png');
    expect(page.querySelector('.mode-tile.on .mode-name')?.textContent).toBe('英雄');
  });

  it('四種題型；只有英雄能聽寫，其他類別的聽寫是灰的', async () => {
    const page = await mount();
    expect(options(page).map((o) => o.querySelector('.option-label')?.textContent)).toEqual(['挖空', '看中寫英', '聽寫', '隨機挑戰']);
    expect(options(page)[2].disabled).toBe(false);
    page.querySelectorAll<HTMLButtonElement>('.mode-tile')[2].click();
    await page.updateComplete;
    expect(options(page)[2].disabled).toBe(true);
  });

  it('選了聽寫再換到不能聽寫的類別，題型自動換成能出的', async () => {
    const page = await mount();
    options(page)[2].click();
    await page.updateComplete;
    page.querySelectorAll<HTMLButtonElement>('.mode-tile')[1].click();
    await page.updateComplete;
    expect(page.querySelector('.mode-option.on .option-label')?.textContent).toBe('挖空');
  });

  it('按「確認」：題型去選要練哪一個，隨機挑戰去選方向', async () => {
    const page = await mount('runes');
    expect(page.querySelector('.confirm-button')?.getAttribute('href')).toBe('#/practice/runes/cloze');
    options(page)[3].click();
    await page.updateComplete;
    expect(page.querySelector('.confirm-button')?.getAttribute('href')).toBe('#/practice/runes/challenge');
    expect(confirmHref('champions', 'dictation')).toBe('#/practice/champions/dictation');
  });
});
