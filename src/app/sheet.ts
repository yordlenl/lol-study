// 手寫區：點空格或橫線就放大成這個大輸入框，寫完按「確定」（或點外面）縮回，把文字填回原位。
// 用標準輸入框，讓 iPadOS「隨手寫」直接把手寫轉成文字；關掉自動大寫、自動修正、拼字檢查。
import { html, nothing } from 'lit';
import { shared } from '../shared.ts';
import { LightElement } from './light.ts';

export interface SheetOptions {
  title: string;
  /** 題目的提示文字，例如「填這一格」或中文翻譯 */
  context?: string;
  value: string;
  /** 正確答案（給提示用） */
  answer: string;
  /** word：單字提示；sentence：整句提示 */
  hint: 'word' | 'sentence';
  hintLevel: number;
  multiline?: boolean;
}

export interface SheetResult {
  value: string;
  hintLevel: number;
}

export class HandSheet extends LightElement {
  static properties = { options: { state: true }, value: { state: true }, hintLevel: { state: true } };

  declare options: SheetOptions | null;
  declare value: string;
  declare hintLevel: number;
  private resolve: ((r: SheetResult) => void) | null = null;

  constructor() {
    super();
    this.options = null;
    this.value = '';
    this.hintLevel = 0;
  }

  open(options: SheetOptions): Promise<SheetResult> {
    this.options = options;
    this.value = options.value;
    this.hintLevel = options.hintLevel;
    return new Promise((resolve) => (this.resolve = resolve));
  }

  private done() {
    this.resolve?.({ value: this.value.trim(), hintLevel: this.hintLevel });
    this.resolve = null;
    this.options = null;
  }

  protected updated() {
    const field = this.querySelector<HTMLInputElement | HTMLTextAreaElement>('.sheet-input');
    if (field && document.activeElement !== field) field.focus();
  }

  private onKey(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.isComposing && !this.options?.multiline) {
      event.preventDefault();
      this.done();
    }
  }

  render() {
    const o = this.options;
    if (!o) return nothing;
    const g = shared().grade;
    const hint = o.hint === 'word' ? g.hintText(o.answer, this.hintLevel) : g.sentenceHint(o.answer, this.hintLevel);
    const attrs = { autocomplete: 'off', autocorrect: 'off', autocapitalize: 'none', spellcheck: 'false' };
    const onInput = (e: InputEvent) => (this.value = (e.target as HTMLInputElement).value);
    return html`<div class="sheet-backdrop" @click=${(e: Event) => e.target === e.currentTarget && this.done()}>
      <div class="sheet" role="dialog" aria-label=${o.title}>
        <h2>${o.title}</h2>
        ${o.context ? html`<p class="sheet-context">${o.context}</p>` : nothing}
        ${o.multiline
          ? html`<textarea class="sheet-input" lang="en" rows="3" autocomplete=${attrs.autocomplete} autocorrect=${attrs.autocorrect} autocapitalize=${attrs.autocapitalize} spellcheck=${attrs.spellcheck} placeholder="用 Pencil 寫在這裡" .value=${this.value} @input=${onInput}></textarea>`
          : html`<input class="sheet-input" type="text" lang="en" autocomplete=${attrs.autocomplete} autocorrect=${attrs.autocorrect} autocapitalize=${attrs.autocapitalize} spellcheck=${attrs.spellcheck} placeholder="用 Pencil 寫在這裡" .value=${this.value} @input=${onInput} @keydown=${this.onKey} />`}
        ${hint ? html`<p class="hint-text">${hint}</p>` : nothing}
        <div class="actions">
          <button type="button" class="secondary" ?disabled=${this.hintLevel >= 2} @click=${() => this.hintLevel++}>
            ${this.hintLevel === 0 ? '提示（首字母）' : '提示（答案）'}
          </button>
          <button type="button" class="secondary" @click=${() => (this.value = '')}>清除</button>
          <button type="button" @click=${this.done}>確定</button>
        </div>
      </div>
    </div>`;
  }
}

customElements.define('hand-sheet', HandSheet);

/** 打開手寫區，寫完回傳文字 */
export function openSheet(options: SheetOptions): Promise<SheetResult> {
  let sheet = document.querySelector('hand-sheet');
  if (!sheet) {
    sheet = document.createElement('hand-sheet');
    document.body.append(sheet);
  }
  return sheet.open(options);
}

declare global {
  interface HTMLElementTagNameMap {
    'hand-sheet': HandSheet;
  }
}
