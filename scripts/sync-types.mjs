// 從語料庫取得共用模組的型別，存成 src/lol-shared-types.ts。
// 語料庫的共用模組改了介面之後執行：npm run sync-types
// 預設從已發布的語料庫網站下載；開發時可以指定本機檔案：npm run sync-types -- ../lol-corpus/src/shared/types.ts
import { readFile, writeFile } from 'node:fs/promises';

const source = process.argv[2] ?? 'https://yordlenl.github.io/lol-corpus/shared/lol-shared.d.ts';
const text = /^https?:/.test(source) ? await (await fetch(source)).text() : await readFile(source, 'utf8');
if (!text.includes('export interface SharedModule')) throw new Error(`取得的內容不像共用模組的型別：${source}`);
const header = `// 這個檔案由 npm run sync-types 從語料庫複製過來，不要手動修改。\n// 來源：${source}\n\n`;
await writeFile(new URL('../src/lol-shared-types.ts', import.meta.url), header + text);
console.log('已更新 src/lol-shared-types.ts');
