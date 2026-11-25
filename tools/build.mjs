import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = f => readFile(path.join(root,f),'utf8');
const config = JSON.parse(await read('site.config.json'));
const chapters = JSON.parse(await read('content/chapters.json'));
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const plain = s => s.replace(/<[^>]*>/g,' ').replace(/&(?:amp|lt|gt|quot|#39|#x27);/g,c=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'",'&#x27;':"'"}[c])).replace(/\s+/g,' ').trim();
const icons = {
 book:'<path d="M4 4h6a3 3 0 0 1 3 3v13a4 4 0 0 0-4-3H4zM20 4h-4a3 3 0 0 0-3 3v13a4 4 0 0 1 4-3h3z"/>',
 search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
 menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
 github:'<path d="M9 19c-4 1-4-2-6-2m12 5v-4a3.5 3.5 0 0 0-1-3c3 0 6-1 6-6a5 5 0 0 0-1-3 5 5 0 0 0 0-3s-1 0-3 1a12 12 0 0 0-8 0C6 3 5 3 5 3a5 5 0 0 0 0 3 5 5 0 0 0-1 3c0 5 3 6 6 6a3.5 3.5 0 0 0-1 3v4"/>',
 download:'<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
 chat:'<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 10 10 0 0 1-4-.8L3 21l1.8-5.5A10 10 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.5 8.5 0 0 1 21 11.5Z"/><path d="M8 10h9m-9 4h5"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',
 list:'<path d="M8 6h12M8 12h12M8 18h12M3 6h.01M3 12h.01M3 18h.01"/>',
};
const icon=(name,cls='')=>`<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.book}</svg>`;
const href=c=>`${c.slug}.html`;
const repo=`https://github.com/${config.repository}`;
const groups=['前置知识','工程实践','协作与思考','附录'];
function sidebar(active){return `<aside class="sidebar" id="sidebar" aria-label="章节导航">
 <a class="brand" href="index.html"><span class="brand-mark">${icon('book')}</span><span>${esc(config.name)}<small>${esc(config.subtitle)}</small></span></a>
 <button class="search-trigger" data-search type="button">${icon('search')}<span>搜索手册</span><kbd>Ctrl K</kbd></button>
 <nav><a class="nav-home ${active==='home'?'active':''}" href="index.html" ${active==='home'?'aria-current="page"':''}>${icon('book')}<span>开始阅读</span></a>
 ${groups.map(g=>`<div class="nav-group"><p>${g}</p>${chapters.filter(c=>c.group===g).map(c=>`<a class="chapter-link ${active===c.slug?'active':''}" href="${href(c)}" ${active===c.slug?'aria-current="page"':''}><span class="chapter-number">${c.number?String(c.number).padStart(2,'0'):'附'}</span><span>${c.title}</span></a>`).join('')}</div>`).join('')}</nav>
 <div class="sidebar-footer"><a href="${repo}" target="_blank" rel="noopener noreferrer">${icon('github')}<span>GitHub · 参与共建</span></a><span class="edition">持续生长的开发手册</span></div></aside>`;}
function comments(c){
 const term=`ai-team-playbook/${c.slug}`;
 const discussion = c.discussion ? `${repo}/discussions/${c.discussion}` : `${repo}/discussions`;
 return `<section class="comments" id="comments" aria-labelledby="comments-heading"><div class="section-eyebrow">一起把问题想清楚</div><h2 id="comments-heading">${icon('chat')}本章讨论</h2><p class="comments-intro">有疑问、不同的经验，或发现了需要修正的地方？用 GitHub 账号登录后，留下你的想法。</p><div class="giscus" data-term="${term}" ${c.discussion?`data-discussion="${c.discussion}"`:''}><p class="comment-status" role="status">正在连接评论区…</p></div><p class="comment-fallback">评论加载较慢？<a href="${discussion}" target="_blank" rel="noopener noreferrer">在 GitHub 中参与本章讨论</a><span>评论保存在 GitHub Discussions 中。</span></p><noscript><p>请启用 JavaScript 加载评论，或打开上方 GitHub 讨论链接。</p></noscript></section>`;
}
function shell({title,description,slug='home',body,toc=[]}) {
 const canonical=new URL(slug==='home'?'index.html':`${slug}.html`,config.url).href;
 return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>${esc(title)} · ${esc(config.name)}</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${canonical}"><meta property="og:type" content="article"><meta property="og:title" content="${esc(title)} · ${esc(config.name)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${canonical}"><link rel="icon" href="assets/favicon.svg" type="image/svg+xml"><script>try{document.documentElement.dataset.theme=localStorage.getItem('ai-playbook-theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}catch(e){}</script><link rel="stylesheet" href="assets/style.css"><script type="module" src="assets/app.js"></script></head>
 <body data-page="${slug}"><a class="skip-link" href="#main">跳到正文</a><div class="reading-progress" aria-hidden="true"></div>${sidebar(slug)}<button class="sidebar-backdrop" aria-label="关闭章节导航" hidden></button>
 <div class="site-body"><header class="topbar"><div class="topbar-left"><button class="icon-button mobile-menu" id="menu-toggle" type="button" aria-controls="sidebar" aria-expanded="false" aria-label="打开章节导航">${icon('menu')}</button><a href="index.html" class="breadcrumb-root">团队协作开发手册</a><span class="breadcrumb-divider">/</span><span class="breadcrumb-current">${slug==='home'?'首页':chapters.find(c=>c.slug===slug)?.title||title}</span></div><div class="topbar-actions"><button class="icon-button" data-search type="button" aria-label="搜索手册">${icon('search')}</button><button class="icon-button" id="theme-toggle" type="button" aria-label="切换深浅色主题">${icon('sun')}</button><a class="icon-button github-top" href="${repo}" target="_blank" rel="noopener noreferrer" aria-label="查看 GitHub 仓库">${icon('github')}</a></div></header>
 <div class="document-layout"><main id="main" class="${slug==='home'?'home-page':'chapter-page'}" tabindex="-1">${body}<footer class="page-footer"><span>${esc(config.name)} · ${esc(config.subtitle)}</span><a href="${repo}" target="_blank" rel="noopener noreferrer">在 GitHub 上共同完善</a></footer></main>
 <aside class="page-toc" aria-label="本页目录"><div class="toc-sticky"><p>${icon('list')}本页内容</p><nav>${toc.map(s=>`<a href="#${s.id}">${esc(s.title.replace(/^\d+\.\d+\s+/,''))}</a>`).join('')}</nav><div class="toc-extra"><a href="assets/full-stack-agent-architecture.pdf" target="_blank" rel="noopener noreferrer">${icon('download')}阅读原版 PDF</a>${slug!=='home'?'<a href="#comments">'+icon('chat')+'参与本章讨论</a>':''}</div></div></aside></div></div>
 <dialog id="search-dialog" aria-label="搜索手册"><div class="search-box">${icon('search')}<input id="search-input" type="search" placeholder="搜索概念、章节或关键词…" aria-label="搜索关键词" autocomplete="off"><button class="icon-button" id="search-close" type="button" aria-label="关闭搜索">${icon('close')}</button></div><div id="search-results" aria-live="polite"><p class="search-empty">试试搜索「Agent」「权限」或「团队协作」</p></div><div class="search-hint"><span>搜索全部章节正文</span><span><kbd>↑</kbd> <kbd>↓</kbd> 选择 <kbd>Enter</kbd> 打开 <kbd>Esc</kbd> 关闭</span></div></dialog>
 <dialog id="image-dialog" aria-label="架构图大图"><button class="icon-button" id="image-close" type="button" aria-label="关闭大图">${icon('close')}</button><img alt=""><p>点击空白处或按 Esc 关闭</p></dialog>
 ${slug!=='home'?`<button id="selection-comment" type="button" hidden>${icon('chat')}评论选中文字</button><aside id="annotation-panel" class="annotation-panel" role="dialog" aria-labelledby="annotation-title" hidden><header><div><span class="section-eyebrow">围绕原文展开讨论</span><h2 id="annotation-title">文字批注</h2></div><button type="button" class="icon-button" id="annotation-close" aria-label="关闭批注">${icon('close')}</button></header><div class="annotation-body"><blockquote id="annotation-quote"></blockquote><div id="annotation-thread-list"></div><div id="annotation-comments"></div><a id="annotation-github" class="annotation-github" target="_blank" rel="noopener noreferrer">在 GitHub 中打开讨论</a><button id="annotation-copy" type="button" class="button secondary">复制此处链接</button><p id="annotation-status" role="status"></p></div></aside>`:''}
 <script id="site-settings" type="application/json">${JSON.stringify({repository:config.repository,siteUrl:config.url,...config.giscus}).replace(/</g,'\\u003c')}</script></body></html>`;
}

const homeBody=`<div class="home-eyebrow"><span class="eyebrow-line"></span>AI × TEAM × ENGINEERING</div><h1>与 AI 共建<span>从写出代码，<br>到一起交付。</span></h1><p class="home-intro">一份面向团队的 AI 协作开发手册。<br class="desktop-break">从必须理解的技术基础出发，走向可靠的工程实践与清晰的人机分工。</p><div class="hero-actions"><a class="button primary" href="foundations.html">从第一章开始</a><a class="button secondary" href="working-with-ai.html">先读人机协作</a></div>
 <div class="home-meta"><span>8 个章节</span><span>21 个知识小节</span><span>7 张架构图</span><span>开放讨论 · 持续完善</span></div>
 <section class="home-section" id="reading-path"><div class="section-heading"><h2>找到你的阅读起点</h2><span>一条从理解到共建的路径</span></div><div class="path-grid">
 <a class="path-card" href="foundations.html"><span class="path-label">建立共同语言</span><div class="path-symbol">{ }</div><h3>先理解系统<br>如何运转</h3><p>前端、后端与通信方式。让讨论架构时的每个词，都有清晰的含义。</p><span class="path-chapters">第 1–2 章 · 前置知识</span></a>
 <a class="path-card" href="agent-runtime.html"><span class="path-label">把功能变成系统</span><div class="path-symbol">&lt;/&gt;</div><h3>让 Agent<br>可靠地工作</h3><p>运行时、安全、交付与观测。关注功能跑通之后，真正影响可靠性的细节。</p><span class="path-chapters">第 3–6 章 · 工程实践</span></a>
 <a class="path-card highlighted" href="team-workflow.html"><span class="path-label">建立协作秩序</span><div class="path-symbol">✳</div><h3>让团队与 AI<br>一起做好开发</h3><p>规约、护栏与独立验证。把协作方式和人的判断，变成可以延续的工程习惯。</p><span class="path-chapters">第 7–8 章 · 协作与思考</span></a></div></section>
 <section class="home-section" id="all-chapters"><div class="section-heading"><h2>手册目录</h2><span>按需查阅，也可以顺序读完</span></div><div class="chapter-index">${chapters.map(c=>`<a class="index-row" href="${href(c)}"><span class="index-number">${c.number?String(c.number).padStart(2,'0'):'附录'}</span><div><h3>${c.title}</h3><p>${c.description}</p></div><span class="index-category">${c.group}</span></a>`).join('')}</div></section>
 <section class="home-note" id="about"><span class="note-mark">“</span><div><h2>工具负责执行，团队保留判断。</h2><p>AI 能协助实现与排查，清晰的目标、可验证的约定和对结果的责任，仍需要团队共同建立。这份手册希望帮助大家在协作中，不只知道怎么做，也能讨论为什么这样做。</p><p class="source-note">内容整理自《全栈 Agent 应用技术架构入门指南》。保留八章正文、图表与参考来源，欢迎通过各章讨论补充经验，或在 GitHub 提交修改。</p><a href="${repo}" target="_blank" rel="noopener noreferrer">${icon('github')}参与这份手册的共建</a></div></section>`;

await mkdir(path.join(root,'dist'),{recursive:true});
await cp(path.join(root,'public'),path.join(root,'dist'),{recursive:true});
const homeDescription='面向团队的 AI 协作开发手册：从全栈前置知识到 Agent 工程实践、规约驱动开发与人机分工。';
await writeFile(path.join(root,'dist/index.html'),shell({title:config.name,description:homeDescription,body:homeBody,toc:[{id:'reading-path',title:'阅读路线'},{id:'all-chapters',title:'手册目录'},{id:'about',title:'关于这份手册'}]}));
const search=[];
for(let i=0;i<chapters.length;i++){
 const c=chapters[i]; let content=await read(`content/${c.slug}.html`);const count=plain(content).length;const minutes=Math.max(2,Math.ceil(count/450));
 const usedIds=new Set();
 content=content.replace(/<(p|td)(\s[^>]*)?>([\s\S]*?)<\/\1>/g,(all,tag,attrs='',text)=>{
  const base='p-'+createHash('sha1').update(plain(text)).digest('hex').slice(0,12);let id=base,n=1;
  while(usedIds.has(id))id=base+'-'+(++n);usedIds.add(id);
  return `<${tag}${attrs} id="${id}" data-annotatable>${text}</${tag}>`;
 });
 const links=[{slug:'index',title:'手册首页'},...chapters];const position=i+1;
 const pagination=`<nav class="chapter-pagination" aria-label="章节翻页"><a href="${links[position-1].slug}.html"><span>上一页</span><strong>${links[position-1].title}</strong></a>${chapters[i+1]?`<a href="${href(chapters[i+1])}" class="next-page"><span>下一页</span><strong>${chapters[i+1].title}</strong></a>`:''}</nav>`;
 const edit=`${repo}/edit/main/content/${c.slug}.html`;
 const body=`<header class="article-header"><div class="article-eyebrow">${c.group}<span>/</span>${c.number?'第 '+c.number+' 章':'附录'}</div><h1>${c.title}</h1><p class="article-description">${c.description}</p><div class="article-meta"><span>约 ${minutes} 分钟阅读</span><span>原文第 ${Math.min(...c.pages)}–${Math.max(...c.pages)} 页</span><a href="${edit}" target="_blank" rel="noopener noreferrer">在 GitHub 编辑本章</a></div><p class="annotation-tip">${icon('chat')}选中正文中的文字，即可在旁边发表评论。<button id="show-annotations" type="button">查看本章批注<span id="annotation-count"></span></button></p></header><article class="prose">${content}</article>${pagination}${comments(c)}`;
 await writeFile(path.join(root,'dist',href(c)),shell({title:c.title,description:c.description,slug:c.slug,body,toc:[...c.sections,{id:'comments',title:'本章讨论'}]}));
 const chunks=content.split(/(?=<h2\s)/);
 for(const chunk of chunks){
  const heading=chunk.match(/<h2 id="([^"]+)">([^<]+)/);
  search.push({title:c.title,section:heading?plain(heading[2]):c.short,url:href(c)+(heading?'#'+heading[1]:''),text:plain(chunk)});
 }
}
await writeFile(path.join(root,'dist/assets/search-index.json'),JSON.stringify(search));
await writeFile(path.join(root,'dist/404.html'),shell({title:'页面未找到',description:'返回手册继续阅读',body:'<h1>这一页还没有写到。</h1><p class="home-intro">可以返回首页，或使用左侧目录继续阅读。</p><a class="button primary" href="index.html">返回手册首页</a>'}));
await writeFile(path.join(root,'dist/.nojekyll'),'');
await writeFile(path.join(root,'dist/robots.txt'),`User-agent: *\nAllow: /\nSitemap: ${new URL('sitemap.xml',config.url)}\n`);
await writeFile(path.join(root,'dist/sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+['index',...chapters.map(c=>c.slug)].map(slug=>`<url><loc>${new URL(slug+'.html',config.url)}</loc></url>`).join('')+'</urlset>');
console.log(`Built ${chapters.length+1} pages · ${search.length} search sections · no external build dependencies`);
