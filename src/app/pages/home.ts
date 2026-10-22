// 首頁：今日待複習、今日新學、連續學習天數、正確率、最常錯的詞。
import { html, nothing } from 'lit';
import type { ReviewLog, StudyCard } from '../../lol-shared-types.ts';
import { buildQueue, type Queue } from '../../review/queue.ts';
import { accuracy, mostMissed, streak } from '../../review/stats.ts';
import { shared } from '../../shared.ts';
import { LightElement } from '../light.ts';

export class PageHome extends LightElement {
  static properties = { data: { state: true }, error: { state: true } };

  declare data: { cards: StudyCard[]; logs: ReviewLog[]; queue: Queue; dailyNew: number } | undefined;
  declare error: boolean;

  constructor() {
    super();
    this.error = false;
  }

  async connectedCallback() {
    super.connectedCallback();
    try {
      const store = shared().learningStore();
      const [cards, logs, settings] = await Promise.all([store.listCards(), store.listReviewLogs(), store.getSettings()]);
      this.data = { cards, logs, queue: buildQueue(cards, logs, settings.dailyNew, new Date()), dailyNew: settings.dailyNew };
    } catch {
      this.error = true;
    }
  }

  render() {
    if (this.error) return html`<p class="notice error">讀不到學習紀錄。</p>`;
    if (!this.data) return html`<p class="notice">載入中…</p>`;
    const { cards, logs, queue, dailyNew } = this.data;
    const now = new Date();
    const todo = queue.dueWords.length + queue.newWords.length;
    const acc = accuracy(logs, now);
    const missed = mostMissed(cards, logs);
    const words = cards.filter((c) => c.kind === 'word').length;
    const sentences = cards.length - words;
    return html`
      <section class="hero panel">
        <div>
          <h1>今天要複習 ${todo} 張單字卡</h1>
          <p class="hint">到期的複習 ${queue.dueWords.length} 張・新學 ${queue.newWords.length} 張</p>
        </div>
        ${todo
          ? html`<a class="button big" href="#/review">開始複習</a>`
          : html`<p class="hint">${words ? '今天的單字卡都複習完了。' : '還沒有單字卡。到語料庫點一個英文單字，按「收藏單字」就會出現在這裡。'}</p>`}
      </section>

      <div class="tiles">
        <section class="tile panel">
          <h2>今日待複習</h2>
          <p class="big-number">${queue.dueWords.length}</p>
          <p class="hint">單字卡</p>
        </section>
        <section class="tile panel">
          <h2>今日新學</h2>
          <p class="big-number">${queue.newLearnedToday}<small> / ${dailyNew}</small></p>
          <p class="hint">今天還可以學 ${queue.newLeftToday} 張・新卡庫存 ${queue.newWordsTotal} 張</p>
        </section>
        <section class="tile panel">
          <h2>連續學習</h2>
          <p class="big-number">${streak(logs, now)}<small> 天</small></p>
          <p class="hint">一天從凌晨 4 點算起</p>
        </section>
        <section class="tile panel">
          <h2>正確率</h2>
          <p class="big-number">${acc.total ? html`${Math.round((acc.correct / acc.total) * 100)}<small>%</small>` : '—'}</p>
          <p class="hint">${acc.total ? `近 30 天共 ${acc.total} 題，沒用提示就答對的比例` : '還沒有作答紀錄'}</p>
        </section>
      </div>

      <section class="panel">
        <h2>最常錯的詞</h2>
        ${missed.length
          ? html`<ul class="chips">${missed.map((m) => html`<li class="chip">${m.card.lemma}<span>錯 ${m.misses} 次</span></li>`)}</ul>`
          : html`<p class="hint">還沒有答錯的詞。</p>`}
      </section>

      <section class="panel">
        <h2>收藏</h2>
        <p>單字卡 ${words} 張・句子卡 ${sentences} 張 <a href="#/words">打開生詞本 →</a></p>
        ${sentences
          ? html`<p class="hint">句子卡：今天到期 ${queue.dueSentences} 張、新卡 ${queue.newSentences} 張（第四階段開放複習）</p>`
          : nothing}
      </section>

      <section class="panel muted">
        <h2>練習</h2>
        <p class="hint">依類別挑內容做挖空、看中寫英、聽寫：第四階段開放。</p>
      </section>
    `;
  }
}

customElements.define('page-home', PageHome);
