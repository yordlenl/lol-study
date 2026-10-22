// 整句題：看中寫英（顯示繁中，手寫整句英文）與聽寫（播放鍵＋每個字一條橫線，可以重播）。
// 點作答區放大成手寫區，整句一次寫；送出後逐字標示對錯並顯示正確答案。
import { html, nothing } from 'lit';
import type { WordDiff } from '../../lol-shared-types.ts';
import type { Answer, SentenceQuestion } from '../../practice/types.ts';
import { shared } from '../../shared.ts';
import { LightElement } from '../light.ts';
import { openSheet } from '../sheet.ts';

let playing: HTMLAudioElement | null = null;

export class QSentence extends LightElement {
  static properties = {
    question: { attribute: false },
    value: { state: true },
    hintLevel: { state: true },
    diff: { state: true },
    audioError: { state: true },
  };

  declare question: SentenceQuestion;
  declare value: string;
  declare hintLevel: number;
  declare diff: WordDiff | null;
  declare audioError: boolean;

  protected willUpdate(changed: Map<string, unknown>) {
    if (changed.has('question')) {
      this.value = '';
      this.hintLevel = 0;
      this.diff = null;
      this.audioError = false;
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    playing?.pause();
  }

  private play() {
    playing?.pause();
    const audio = new Audio(this.question.block.audio);
    playing = audio;
    this.audioError = false;
    audio.addEventListener('error', () => (this.audioError = true));
    audio.play().catch(() => (this.audioError = true));
  }

  private async write() {
    if (this.diff) return;
    const dictation = this.question.mode === 'dictation';
    const result = await openSheet({
      title: dictation ? '聽寫：寫出整句' : '看中文寫英文',
      context: dictation ? `共 ${shared().grade.wordsOf(this.question.text.en).length} 個字` : this.question.text.zh_TW,
      value: this.value,
      answer: this.question.text.en,
      hint: 'sentence',
      hintLevel: this.hintLevel,
      multiline: true,
    });
    this.value = result.value;
    this.hintLevel = result.hintLevel;
  }

  private submit() {
    const diff = shared().grade.diffWords(this.question.text.en, this.value);
    this.diff = diff;
    const answer: Answer = {
      correct: diff.correct,
      hinted: this.hintLevel > 0,
      wrongUnits: diff.correct ? [] : [{ text: this.question.text, alignment: this.question.block.card?.alignment ?? 'sentence' }],
    };
    this.dispatchEvent(new CustomEvent('answered', { detail: answer, bubbles: true }));
  }

  /** 聽寫的橫線：每個字一條，寫好的字依序填上去 */
  private lines() {
    const expected = shared().grade.wordsOf(this.question.text.en);
    const written = this.value.split(/\s+/).filter(Boolean);
    const count = Math.max(expected.length, written.length);
    return html`<button type="button" class="dictation-lines" @click=${this.write} aria-label="點這裡寫出整句">
      ${Array.from({ length: count }, (_, i) =>
        html`<span class="line ${i >= expected.length ? 'extra' : ''}" style="min-width:${Math.max(3, (expected[i] ?? written[i] ?? '').length) + 1}ch">${written[i] ?? ' '}</span>`,
      )}
    </button>`;
  }

  private result() {
    const d = this.diff!;
    const settings = shared().settings.current.rows;
    return html`<div class="result ${d.correct ? 'ok' : 'bad'}">
      <p class="verdict">${d.correct ? (this.hintLevel ? '答對了（用了提示）' : '答對了') : '有寫錯的地方'}</p>
      <p class="marked" lang="en">${d.expected.map((m) => html`<span class=${m.ok ? 'word-ok' : 'word-bad'}>${m.word}</span> `)}</p>
      ${d.extra.length ? html`<p class="hint">多寫或寫錯的字：<span lang="en">${d.extra.join('、')}</span></p>` : nothing}
      <p class="hint">你寫的：<span lang="en">${this.value || '（空白）'}</span></p>
      ${this.question.mode === 'dictation'
        ? html`<p class="hint">${this.question.text.zh_TW}</p>${settings.zh_CN ? html`<p class="hint" lang="zh-Hans-CN">${this.question.text.zh_CN}</p>` : nothing}`
        : nothing}
    </div>`;
  }

  render() {
    const q = this.question;
    const label = q.block.source.label?.zh_TW;
    const settings = shared().settings.current.rows;
    return html`<section class="panel sentence-question">
      ${q.mode === 'translate'
        ? html`<p class="hint">看中文，寫出整句英文${label ? `（出自 ${label}）` : ''}</p>
            <p class="question-zh">${q.text.zh_TW}</p>
            ${settings.zh_CN ? html`<p class="question-zh cn" lang="zh-Hans-CN">${q.text.zh_CN}</p>` : nothing}
            ${this.diff
              ? nothing
              : html`<button type="button" class="write-area ${this.value ? 'filled' : ''}" lang="en" @click=${this.write}>${this.value || '點這裡用 Pencil 寫'}</button>`}`
        : html`<div class="dictation">
            <button type="button" class="play" @click=${this.play} aria-label="播放原聲">▶</button>
            ${this.diff ? nothing : this.lines()}
          </div>
          ${this.audioError ? html`<p class="error">原聲暫時無法播放（需要網路連線）</p>` : nothing}`}
      ${this.diff
        ? this.result()
        : html`<div class="actions">
            <button type="button" ?disabled=${!this.value.trim()} @click=${this.submit}>送出</button>
          </div>`}
    </section>`;
  }
}

customElements.define('q-sentence', QSentence);
