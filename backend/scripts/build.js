import {readFile,access} from 'node:fs/promises';
import {contentSchema} from '../src/schema.js';
contentSchema.parse(JSON.parse(await readFile(new URL('../seed/content.json',import.meta.url))));
await access(new URL('../public/admin/index.html',import.meta.url));
console.log('Validated seed and static admin. Vercel builds Node API functions separately.');
