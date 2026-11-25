// giscus' public widget protocol. Each frame has its own source-checked handler,
// so chapter comments and quotation comments cannot overwrite one another.
// Reference: https://github.com/giscus/giscus/blob/main/client.ts
const settings=JSON.parse(document.getElementById('site-settings').textContent);
const widgets=new Set();
let availability;
let session='';
try {
 const url=new URL(location.href);
 session=url.searchParams.get('giscus')||JSON.parse(localStorage.getItem('giscus-session')||'""');
 if(url.searchParams.has('giscus')){
  localStorage.setItem('giscus-session',JSON.stringify(session));
  url.searchParams.delete('giscus');history.replaceState(null,'',url);
 }
}catch{}

async function installed(){
 availability??=fetch('https://giscus.app/api/discussions?'+new URLSearchParams({repo:settings.repository,number:'1',first:'1'})).then(async response=>{
  if(response.status===403){const data=await response.json();if(String(data.error).includes('not installed'))return false;}
  return true;
 }).catch(()=>true);
 return availability;
}

export function mountComments(container,options){
 let iframe,disposed=false,generation=0;
 const widget={dispose(){disposed=true;generation++;if(iframe)widgets.delete(widget);container.replaceChildren();},frame:()=>iframe,options,refresh:render};
 async function render(){
  const ticket=++generation;
  const status=document.createElement('p');status.className='comment-status';status.textContent='正在连接评论区…';container.replaceChildren(status);
  const ready=await installed();if(disposed||ticket!==generation)return;
  if(!ready){
   status.className='widget-error';status.textContent='暂时无法加载站内评论，可以通过下方 GitHub 入口继续讨论。';
   const retry=document.createElement('button');retry.type='button';retry.textContent='重新连接';retry.onclick=()=>{availability=undefined;render();};status.append(retry);return;
  }
  const url=new URL(options.returnUrl||location.href);url.searchParams.delete('giscus');
  const params=new URLSearchParams({origin:url.href,session,repo:settings.repository,repoId:settings.repoId,category:settings.category,categoryId:settings.categoryId,term:options.term||'',strict:'1',reactionsEnabled:'1',emitMetadata:'1',inputPosition:'top',theme:document.documentElement.dataset.theme||'light',lang:'zh-CN',description:options.description||document.querySelector('meta[name="description"]').content,backLink:options.backLink||url.href});
  if(options.number)params.set('number',String(options.number));
  iframe=document.createElement('iframe');iframe.className='giscus-frame';iframe.title=options.title||'GitHub 评论';iframe.src='https://giscus.app/zh-CN/widget?'+params;iframe.loading='eager';iframe.referrerPolicy='strict-origin-when-cross-origin';
  iframe.addEventListener('load',()=>status.remove(),{once:true});container.append(iframe);widgets.add(widget);
 }
 render();return widget;
}

addEventListener('message',event=>{
 if(event.origin!=='https://giscus.app'||!event.data?.giscus)return;
 const widget=[...widgets].find(w=>w.frame()?.contentWindow===event.source);if(!widget)return;
 const data=event.data.giscus;
 if(Number.isFinite(data.resizeHeight))widget.frame().style.height=Math.min(12000,Math.max(200,data.resizeHeight))+'px';
 if(data.discussion)widget.options.onMetadata?.(data.discussion);
 if(data.signOut){session='';try{localStorage.removeItem('giscus-session');}catch{}widgets.forEach(w=>w.refresh());}
});

document.addEventListener('handbook-theme-change',()=>{
 for(const widget of widgets)widget.frame()?.contentWindow?.postMessage({giscus:{setConfig:{theme:document.documentElement.dataset.theme}}},'https://giscus.app');
});

const chapter=document.querySelector('.giscus');
if(chapter){
 const load=()=>mountComments(chapter,{number:Number(chapter.dataset.discussion),term:chapter.dataset.term,title:'本章 GitHub 讨论'});
 if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){load();observer.disconnect();}},{rootMargin:'300px'});observer.observe(chapter);}else load();
}
