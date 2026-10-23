// 英→中五步流程的畫面。作答前英文單字不能點；揭曉後顯示原句（可以點字查義、收藏）、翻譯和出處。
import { html, nothing } from 'lit';
import type { ChallengeOption } from '../../lol-shared-types.ts';
import type { ChallengeItem } from '../../challenge/draw.ts';
import { isCorrect, nextState, START, type FlowAction, type FlowState } from '../../challenge/recognize-flow.ts';
import type { Answer } from '../../practice/types.ts';
import { shared } from '../../shared.ts';
import { LightElement } from '../light.ts';

type En2Zh = Extract<ChallengeItem, { direction: 'en2zh' }>;

export class QRecognize extends LightElement {
  static properties = { item: { attribute: false }, state: { state: true } };

  declare item: En2Zh;
  declare state: FlowState;

  protected willUpdate(changed: Map<string, unknown>) {
    if (changed.has('item')) this.state = START;
  }

  private act(action: FlowAction) {
    this.state = nextState(this.state, action);
    if (this.state.step === 'done') {
      const correct = isCorrect(this.state);
      const d = this.item.drawn;
      const answer: Answer = { correct, hinted: false, wrongUnits: correct ? [] : [{ text: d.text, alignment: d.alignment }] };
      this.dispatchEvent(new CustomEvent('answered', { detail: answer, bubbles: true }));
    }
  }

  private option(o: ChallengeOption) {
    const { step, chosen } = this.state;
    const answerId = this.item.recognition.answer.id;
    const cls = step === 'choose' ? '' : o.id === answerId ? 'right' : o.id === chosen ? 'wrong' : 'dim';
    return html`<button type="button" class="option ${cls}" ?disabled=${step !== 'choose'} @click=${() => this.act({ type: 'choose', id: o.id, answerId })}>
      <img src=${shared().corpusUrl(o.icon)} alt="" width="56" height="56" />
      <span>${o.name.zh_TW}</span>
    </button>`;
  }

  private translation() {
    const t = this.item.drawn.text;
    const rows = shared().settings.current.rows;
    return html`<p class="question-zh">${t.zh_TW}</p>${rows.zh_CN ? html`<p class="question-zh cn" lang="zh-Hans-CN">${t.zh_CN}</p>` : nothing}`;
  }

  private reveal() {
    const { drawn, recognition } = this.item;
    const a = recognition.answer;
    const messages: Record<string, string> = {
      understood: '答對了：你看懂了這一句',
      'not-understood': '沒關係，這句已收進句子庫，明天複習',
      'wrong-choice': '選錯了，這句已收進句子庫，明天複習',
      different: '理解得不一樣，這句已收進句子庫，明天複習',
    };
    return html`<div class="result ${isCorrect(this.state) ? 'ok' : 'bad'}">
      <p class="verdict">${messages[this.state.outcome!]}</p>
      <div class="source-line">
        <img src=${shared().corpusUrl(a.icon)} alt="" width="40" height="40" />
        <span>出自：${a.name.zh_TW}<span class="hint" lang="en">（${a.name.en}）</span></span>
      </div>
      <lol-trilingual .text=${drawn.text} .source=${drawn.source}></lol-trilingual>
    </div>`;
  }

  render() {
    const { step } = this.state;
    const r = this.item.recognition;
    return html`<section class="panel recognize">
      ${step === 'done'
        ? this.reveal()
        : html`<p class="hint">看這句英文${step === 'ask' ? '，你看得懂嗎？' : step === 'choose' ? '，它出自哪裡？' : ''}</p>
            <p class="masked" lang="en">${r.masked}</p>`}
      ${step === 'ask'
        ? html`<div class="actions">
            <button type="button" @click=${() => this.act({ type: 'understood' })}>看懂了</button>
            <button type="button" class="secondary" @click=${() => this.act({ type: 'not-understood' })}>沒看懂</button>
          </div>`
        : nothing}
      ${step === 'choose' || (step === 'done' && this.state.chosen) ? html`<div class="options">${r.options.map((o) => this.option(o))}</div>` : nothing}
      ${step === 'confirm'
        ? html`<div class="options">${r.options.map((o) => this.option(o))}</div>
            <div class="confirm">
              <p class="ok-text">選對了！這句的意思是：</p>
              ${this.translation()}
              <p>我理解的和這個一樣嗎？</p>
              <div class="actions">
                <button type="button" @click=${() => this.act({ type: 'same' })}>一樣</button>
                <button type="button" class="secondary" @click=${() => this.act({ type: 'different' })}>不一樣</button>
              </div>
            </div>`
        : nothing}
    </section>`;
  }
}

customElements.define('q-recognize', QRecognize);
