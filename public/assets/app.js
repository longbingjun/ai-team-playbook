const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const settings = JSON.parse($('#site-settings').textContent);
const searchDialog = $('#search-dialog');
const searchInput = $('#search-input');
let indexPromise, activeResult = -1;
const safeText = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Persist only the reader's display preference; no application credentials.
$('#theme-toggle').addEventListener('click', () => {
 const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
 document.documentElement.dataset.theme = theme;
 try { localStorage.setItem('ai-playbook-theme', theme); } catch {}
 document.dispatchEvent(new Event('handbook-theme-change'));
});

function setMenu(open){
 $('#sidebar').classList.toggle('is-open',open);
 $('.sidebar-backdrop').hidden=!open;
 $('#menu-toggle').setAttribute('aria-expanded',String(open));
 $('#menu-toggle').setAttribute('aria-label',open?'关闭章节导航':'打开章节导航');
 if(open) $('#sidebar .nav-home').focus();
}
$('#menu-toggle').addEventListener('click',()=>setMenu(!$('#sidebar').classList.contains('is-open')));
$('.sidebar-backdrop').addEventListener('click',()=>{setMenu(false);$('#menu-toggle').focus();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#sidebar').classList.contains('is-open')){setMenu(false);$('#menu-toggle').focus();}});

async function openSearch(){
 if(searchDialog.open)return;
 searchDialog.showModal();searchInput.focus();
 indexPromise ??= fetch(new URL('search-index.json',import.meta.url)).then(r=>{if(!r.ok)throw new Error('search unavailable');return r.json();});
 if(searchInput.value.trim()) await renderSearch();
}
$$('[data-search]').forEach(b=>b.addEventListener('click',openSearch));
$('#search-close').addEventListener('click',()=>searchDialog.close());
searchDialog.addEventListener('click',e=>{if(e.target===searchDialog){const r=searchDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)searchDialog.close();}});
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch();}});

function highlight(text,terms){
 const escaped=terms.map(t=>t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
 const regex=new RegExp(`(${escaped})`,'gi');
 return text.split(regex).map((part,i)=>i%2?`<mark>${safeText(part)}</mark>`:safeText(part)).join('');
}
let searchVersion=0;
async function renderSearch(){
 const version=++searchVersion;
 const query=searchInput.value.trim().slice(0,120);activeResult=-1;
 const container=$('#search-results');
 if(!query){container.innerHTML='<p class="search-empty">试试搜索「Agent」「权限」或「团队协作」</p>';return;}
 try {
  const index=await indexPromise;if(version!==searchVersion)return;
  const terms=query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const results=index.map(item=>{
   const text=`${item.title} ${item.section} ${item.text}`.toLocaleLowerCase();
   const score=terms.every(term=>text.includes(term))?terms.reduce((s,t)=>s+(item.section.toLocaleLowerCase().includes(t)?8:0)+(item.title.toLocaleLowerCase().includes(t)?4:0)+(item.text.toLocaleLowerCase().includes(t)?1:0),0):0;
   return {...item,score};
  }).filter(r=>r.score>0).sort((a,b)=>b.score-a.score).slice(0,16);
  if(!results.length){container.innerHTML='<p class="search-empty">没有找到相关内容，试试更短的关键词。</p>';return;}
  container.innerHTML=results.map(item=>{
   const first=Math.max(0,item.text.toLocaleLowerCase().indexOf(terms[0]));
   const start=Math.max(0,first-45),snippet=(start?'…':'')+item.text.slice(start,start+155)+(item.text.length>start+155?'…':'');
   return `<a class="search-result" href="${safeText(item.url)}"><span class="result-chapter">${safeText(item.title)}</span><h3>${highlight(item.section,terms)}</h3><p>${highlight(snippet,terms)}</p></a>`;
  }).join('');
 } catch {if(version===searchVersion)container.innerHTML='<p class="search-empty">暂时无法加载搜索。你仍可通过章节目录阅读，或稍后重试。</p>';}
}
searchInput.addEventListener('input',renderSearch);
searchDialog.addEventListener('keydown',e=>{
 const results=$$('.search-result');if(!results.length)return;
 if(e.key==='ArrowDown'||e.key==='ArrowUp'){
  e.preventDefault();activeResult=(activeResult+(e.key==='ArrowDown'?1:-1)+results.length)%results.length;
  results.forEach((r,i)=>r.classList.toggle('selected',i===activeResult));results[activeResult].scrollIntoView({block:'nearest'});
 }else if(e.key==='Enter'&&activeResult>=0){e.preventDefault();results[activeResult].click();}
});

const tocLinks=$$('.page-toc nav a');
const targets=tocLinks.map(a=>document.getElementById(a.hash.slice(1))).filter(Boolean);
function updateReading(){
 const max=document.documentElement.scrollHeight-innerHeight;
 $('.reading-progress').style.transform=`scaleX(${max>0?Math.min(1,scrollY/max):0})`;
 const current=targets.filter(el=>el.getBoundingClientRect().top<150).at(-1)||targets[0];
 tocLinks.forEach(a=>a.classList.toggle('active',!!current&&a.hash==='#'+current.id));
}
let ticking=false;
addEventListener('scroll',()=>{if(!ticking){requestAnimationFrame(()=>{updateReading();ticking=false;});ticking=true;}},{passive:true});
addEventListener('resize',updateReading);updateReading();

const imageDialog=$('#image-dialog');
$$('.figure-zoom').forEach(button=>button.addEventListener('click',()=>{
 const source=button.querySelector('img');const target=imageDialog.querySelector('img');target.src=source.src;target.alt=source.alt;imageDialog.showModal();
}));
$('#image-close').addEventListener('click',()=>imageDialog.close());
imageDialog.addEventListener('click',e=>{if(e.target===imageDialog)imageDialog.close();});

if($('#annotation-panel'))import('./annotations.js');
import './comments.js';
