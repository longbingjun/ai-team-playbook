import {readFile,readdir,access} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
const files=(await readdir(root)).filter(f=>f.endsWith('.html'));
const contents=new Map(await Promise.all(files.map(async f=>[f,await readFile(path.join(root,f),'utf8')])));
let links=0,figures=0,tables=0;
for(const [file,html] of contents){
 assert.equal((html.match(/<h1[>\s]/g)||[]).length,1,`${file}: one primary heading`);
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(new Set(ids).size,ids.length,`${file}: unique IDs`);
 for(const tag of ['figure','figcaption','table','article','dialog']){
  assert.equal((html.match(new RegExp(`<${tag}[>\\s]`,'g'))||[]).length,(html.match(new RegExp(`</${tag}>`,'g'))||[]).length,`${file}: balanced ${tag}`);
 }
 if(file!=='index.html'&&file!=='404.html'){
  assert.match(html,/data-term="ai-team-playbook\/[a-z-]+"/,`${file}: stable comment key`);
  assert.match(html,/<article class="prose">[\s\S]{500,}<\/article>/,`${file}: actual chapter content`);
  figures+=(html.match(/<figure>/g)||[]).length;
  tables+=(html.match(/<table>/g)||[]).length;
 }
 for(const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)){
  const link=match[1];if(/^(https?:|data:|mailto:)/.test(link))continue;
  const [target,hash]=link.split('#');const targetFile=target||file;
  if(target)await access(path.join(root,decodeURIComponent(target)));
  if(hash&&targetFile.endsWith('.html'))assert.ok(contents.get(targetFile)?.includes(`id="${hash}"`),`${file}: anchor ${link}`);
  links++;
 }
}
assert.equal(figures,7,'all seven original architecture diagrams');
assert.equal(tables,5,'all comparison and glossary tables');
const search=JSON.parse(await readFile(path.join(root,'assets/search-index.json'),'utf8'));
for(const token of ['AGENTS.md','租约','RPO','RTO','纵向切片','同源盲区','SKIP LOCKED','U + R + B ≤ Q'])assert.ok(search.some(s=>s.text.includes(token)),`search preserves ${token}`);
assert.equal(new Set(search.map(s=>s.url.split('#')[0])).size,9,'all chapters searchable');
console.log(`Verified ${files.length} HTML pages, ${links} local links, ${figures} figures, ${tables} tables, and full-text search coverage.`);
