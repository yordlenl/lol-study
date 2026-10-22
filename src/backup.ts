// 匯出／匯入備份。iPad 上用分享選單「儲存到檔案」；不支援時改成下載。
import type { ExportFile } from './lol-shared-types.ts';

export function backupFileName(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  return `lol-english-備份-${date}-${pad(now.getHours())}${pad(now.getMinutes())}.json`;
}

export interface BackupSummary {
  words: number;
  sentences: number;
  reviewLogs: number;
  exportedAt: string;
}

/** 匯入前先看檔案內容；不是這個 App 的備份就丟出錯誤 */
export function summarizeBackup(data: unknown): BackupSummary {
  const file = data as Partial<ExportFile> | null;
  if (!file || file.app !== 'lol-english' || !Array.isArray(file.cards) || !Array.isArray(file.reviewLogs)) {
    throw new Error('這不是 LoL 英語的備份檔');
  }
  return {
    words: file.cards.filter((c) => c.kind === 'word').length,
    sentences: file.cards.filter((c) => c.kind === 'sentence').length,
    reviewLogs: file.reviewLogs.length,
    exportedAt: String(file.exportedAt ?? ''),
  };
}

export async function saveBackup(file: ExportFile, now = new Date()): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const name = backupFileName(now);
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
  const asFile = new File([blob], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [asFile] })) {
    try {
      await navigator.share({ files: [asFile], title: name });
      return 'shared';
    } catch (error) {
      if ((error as DOMException).name === 'AbortError') return 'cancelled';
      // 分享失敗（例如等太久失去點擊授權）就改用下載
    }
  }
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}
