// 設定：三行開關、每日新學數、單字朗讀、匯出／匯入備份、版本資訊。
import { html, nothing } from 'lit';
import type { ExportFile, Meta, SpeechSettings } from '../../lol-shared-types.ts';
import { saveBackup, summarizeBackup, type BackupSummary } from '../../backup.ts';
import { shared } from '../../shared.ts';
import { LightElement } from '../light.ts';

const DAILY_NEW_STEP = 5;
const DAILY_NEW_MAX = 100;

const ACCENTS: Array<[SpeechSettings['accent'], string]> = [
  ['en-US', '美式'],
  ['en-GB', '英式'],
];
const RATES: Array<[SpeechSettings['rate'], string]> = [
  ['normal', '正常'],
  ['slow', '慢速'],
];

export class PageSettings extends LightElement {
  static properties = {
    dailyNew: { state: true },
    speech: { state: true },
    pending: { state: true },
    message: { state: true },
    error: { state: true },
    meta: { state: true },
  };

  declare dailyNew: number;
  declare speech: SpeechSettings;
  declare pending: { file: ExportFile; summary: BackupSummary } | null;
  declare message: string;
  declare error: string;
  declare meta: Meta | undefined;

  constructor() {
    super();
    this.dailyNew = shared().settings.current.dailyNew;
    this.speech = shared().settings.current.speech;
    this.pending = null;
    this.message = '';
    this.error = '';
  }

  connectedCallback() {
    super.connectedCallback();
    shared().loadMeta().then((m) => (this.meta = m), () => {});
  }

  private async setDailyNew(value: number) {
    this.dailyNew = Math.min(DAILY_NEW_MAX, Math.max(0, value));
    await shared().settings.update({ dailyNew: this.dailyNew });
  }

  private async setSpeech(patch: Partial<SpeechSettings>) {
    this.speech = { ...this.speech, ...patch };
    await shared().settings.update({ speech: this.speech });
  }

  private speechPanel() {
    const choices = <K extends keyof SpeechSettings>(key: K, options: Array<[SpeechSettings[K], string]>) =>
      html`<div class="segmented">
        ${options.map(
          ([value, label]) =>
            html`<button type="button" class=${this.speech[key] === value ? 'on' : ''} aria-pressed=${this.speech[key] === value} @click=${() => this.setSpeech({ [key]: value })}>
              ${label}
            </button>`,
        )}
      </div>`;
    const available = typeof speechSynthesis !== 'undefined';
    return html`<section class="panel speech-settings">
      <h2>單字朗讀</h2>
      <p class="hint">查詞小視窗、複習答案、生詞本旁邊的喇叭會用這裡的設定念單字。語料庫和學習 App 共用。</p>
      <div class="setting-row"><span class="setting-label">口音</span>${choices('accent', ACCENTS)}</div>
      <div class="setting-row"><span class="setting-label">速度</span>${choices('rate', RATES)}</div>
      <div class="setting-row"><span class="setting-label">試聽</span><span lang="en">champion</span><lol-speak-button word="champion"></lol-speak-button></div>
      ${available ? nothing : html`<p class="notice error">這個瀏覽器不支援朗讀。</p>`}
    </section>`;
  }

  private async exportAll() {
    this.message = '';
    this.error = '';
    try {
      const result = await saveBackup(await shared().learningStore().exportAll());
      if (result !== 'cancelled') this.message = '備份檔已匯出。';
    } catch (error) {
      this.error = `匯出失敗（${error}）`;
    }
  }

  private async pickFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    this.message = '';
    this.error = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text()) as ExportFile;
      this.pending = { file: data, summary: summarizeBackup(data) };
    } catch (error) {
      this.error = error instanceof SyntaxError ? '這個檔案不是正確的備份檔。' : String((error as Error).message);
    }
  }

  private async importPending(mode: 'replace' | 'merge') {
    if (!this.pending) return;
    if (mode === 'replace' && !confirm('取代全部會先清空目前的生詞本和複習紀錄，確定嗎？')) return;
    try {
      const result = await shared().learningStore().importAll(this.pending.file, mode);
      await Promise.all([shared().collection.reload(), shared().settings.reload()]);
      this.dailyNew = shared().settings.current.dailyNew;
      this.speech = shared().settings.current.speech;
      this.pending = null;
      this.message = `匯入完成：卡片 ${result.cards} 張、複習紀錄 ${result.reviewLogs} 筆。`;
    } catch (error) {
      this.error = `匯入失敗：${(error as Error).message}`;
    }
  }

  private importPanel() {
    if (!this.pending) return nothing;
    const s = this.pending.summary;
    const when = s.exportedAt ? new Date(s.exportedAt).toLocaleString('zh-TW', { hour12: false }) : '不明';
    return html`<div class="import-summary">
      <p>備份檔內容：單字卡 ${s.words} 張、句子卡 ${s.sentences} 張、複習紀錄 ${s.reviewLogs} 筆（匯出時間 ${when}）</p>
      <div class="actions">
        <button type="button" class="danger" @click=${() => this.importPending('replace')}>取代全部</button>
        <button type="button" @click=${() => this.importPending('merge')}>合併</button>
        <button type="button" class="secondary" @click=${() => (this.pending = null)}>取消</button>
      </div>
      <p class="hint">取代全部：清空現有紀錄，換成備份檔的內容。合併：保留現有紀錄，同一張卡以備份檔為準。</p>
    </div>`;
  }

  render() {
    return html`
      <section class="panel">
        <h2>三行對照</h2>
        <p class="hint">語料庫和學習 App 共用這個設定。</p>
        <lol-row-toggles></lol-row-toggles>
      </section>

      <section class="panel">
        <h2>每日新學數</h2>
        <div class="stepper">
          <button type="button" class="secondary" ?disabled=${this.dailyNew <= 0} @click=${() => this.setDailyNew(this.dailyNew - DAILY_NEW_STEP)}>−</button>
          <span class="stepper-value">${this.dailyNew} 張</span>
          <button type="button" class="secondary" ?disabled=${this.dailyNew >= DAILY_NEW_MAX} @click=${() => this.setDailyNew(this.dailyNew + DAILY_NEW_STEP)}>＋</button>
        </div>
        <p class="hint">每天最多學幾張新的單字卡；到期的複習卡不受這個限制。</p>
      </section>

      ${this.speechPanel()}

      <section class="panel">
        <h2>備份</h2>
        <p class="hint">學習紀錄只存在這台 iPad 上。定期匯出備份，換裝置或清資料時可以匯入回來。</p>
        <div class="actions">
          <button type="button" @click=${this.exportAll}>匯出備份</button>
          <label class="button secondary file-button">
            匯入備份
            <input type="file" accept=".json,application/json" @change=${this.pickFile} />
          </label>
        </div>
        ${this.importPanel()}
        ${this.message ? html`<p class="notice ok">${this.message}</p>` : nothing}
        ${this.error ? html`<p class="notice error">${this.error}</p>` : nothing}
      </section>

      <section class="panel">
        <h2>版本</h2>
        <p class="hint">學習 App ${__APP_VERSION__}・${__COMMIT__}</p>
        ${this.meta ? html`<p class="hint">語料庫遊戲資料 ${this.meta.ddragon}</p>` : nothing}
      </section>
    `;
  }
}

customElements.define('page-settings', PageSettings);
