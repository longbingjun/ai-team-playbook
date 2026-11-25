import {mountComments} from './comments.js';
const $=s=>document.querySelector(s);
const panel=$('#annotation-panel');
const settings=JSON.parse($('#site-settings').textContent);
const chapter=document.body.dataset.page;
const blocks=[...document.querySelectorAll('.prose [data-annotatable]')];
let records=[],pending,activeWidget,activeNote,previousFocus;
let synchronizedAt='';
const selectionButton=$('#selection-comment');
const quote=$('#annotation-quote');
const list=$('#annotation-thread-list');
const host=$('#annotation-comments');

function textNodes(block){
 const walker=document.createTreeWalker(block,NodeFilter.SHOW_TEXT,{acceptNode:node=>node.parentElement?.closest('.annotation-marker')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
 const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);return nodes;
}
function blockText(block){return textNodes(block).map(n=>n.textContent).join('');}
function blockFor(node){return(node.nodeType===1?node:node.parentElement)?.closest('.prose [data-annotatable]');}
function clearHighlight(){document.querySelectorAll('.annotation-active').forEach(p=>p.classList.remove('annotation-active'));document.querySelectorAll('mark.annotation-highlight').forEach(m=>m.replaceWith(...m.childNodes));blocks.forEach(p=>p.normalize());}
function markRange(block,start,end){
 let offset=0;const nodes=textNodes(block);
 for(const node of nodes){const length=node.length,from=Math.max(0,start-offset),to=Math.min(length,end-offset);offset+=length;if(from>=to)continue;
  const range=document.createRange();range.setStart(node,from);range.setEnd(node,to);const mark=document.createElement('mark');mark.className='annotation-highlight';range.surroundContents(mark);
 }
 block.classList.add('annotation-active');
}
function locate(note){
 let block=document.getElementById(note.blockId);
 if(block?.matches('[data-annotatable]')){
  const text=blockText(block);
  if(text.slice(note.start,note.end)===note.quote)return{block,start:note.start,end:note.end};
  const start=text.indexOf(note.quote);if(start>=0)return{block,start,end:start+note.quote.length};
 }
 block=blocks.find(p=>blockText(p).includes(note.quote));
 if(block){const start=blockText(block).indexOf(note.quote);return{block,start,end:start+note.quote.length};}
 return null;
}
function noteUrl(note,production=true){
 const url=production?new URL(chapter+'.html',settings.siteUrl):new URL(location.href);url.search='';
 for(const[k,v]of Object.entries({comment:note.blockId,start:note.start,end:note.end,note:note.key}))url.searchParams.set(k,String(v));
 url.hash=note.blockId;return url.href;
}
function showPanel(){previousFocus=document.activeElement;panel.hidden=false;document.body.classList.add('annotation-open');selectionButton.hidden=true;$('#annotation-close').focus();}
function closePanel(){activeWidget?.dispose();activeWidget=undefined;panel.hidden=true;document.body.classList.remove('annotation-open');clearHighlight();activeNote=undefined;previousFocus?.focus?.();}
function persist(note){
 const existing=records.find(n=>n.key===note.key);if(existing)Object.assign(existing,note);else records.push(note);
 try{localStorage.setItem('ai-playbook-notes:'+chapter,JSON.stringify(records.filter(n=>n.local)));}catch{}
 renderMarkers();
}
function renderMarkers(){
 document.querySelectorAll('.annotation-marker').forEach(b=>b.remove());
 const grouped=new Map();
 for(const note of records){const found=locate(note);if(!found)continue;const notes=grouped.get(found.block)||[];notes.push(note);grouped.set(found.block,notes);}
 for(const[block,notes]of grouped){
  const marker=document.createElement('button');marker.type='button';marker.className='annotation-marker';marker.textContent='▤ '+notes.length;marker.setAttribute('aria-label',`查看此段的 ${notes.length} 条批注`);marker.onclick=()=>notes.length===1?openNote(notes[0],true):openList(notes);block.append(marker);
 }
 $('#annotation-count').textContent=records.length?'（'+records.length+'）':'';
}
function renderList(notes){
 list.replaceChildren();
 for(const note of notes){
  const button=document.createElement('button');button.type='button';button.className='annotation-thread-option';button.classList.toggle('active',note.key===activeNote?.key);button.textContent=note.quote;
  const info=document.createElement('span');info.textContent=(note.count||0)+' 条评论';button.append(info);button.onclick=()=>openNote(note,true);list.append(button);
 }
}
function openList(notes=records){
 activeWidget?.dispose();activeWidget=undefined;activeNote=undefined;clearHighlight();showPanel();$('#annotation-title').textContent='本章文字批注';quote.hidden=true;$('#annotation-github').hidden=true;$('#annotation-copy').hidden=true;host.replaceChildren();renderList(notes);
 $('#annotation-status').textContent=notes.length?'点击一条批注，回到原文并展开讨论。':'本章还没有文字批注。选中正文中的文字，开始一段讨论。';
}
function openNote(note,scroll=false){
 activeWidget?.dispose();activeNote=note;clearHighlight();showPanel();$('#annotation-title').textContent='文字批注';quote.hidden=false;quote.textContent=note.quote;list.replaceChildren();
 const found=locate(note);if(found){markRange(found.block,found.start,found.end);if(scroll)found.block.scrollIntoView({block:'center',behavior:'smooth'});}
 $('#annotation-status').textContent=found?'评论会关联这段引用，登录 GitHub 后即可发表。':'原文可能已修改。保留此处引用与讨论，暂时无法精确定位。';
 const github=$('#annotation-github');github.hidden=false;github.textContent=note.number?'在 GitHub 中打开此条批注':'也可以在 GitHub 讨论本章';github.href=`https://github.com/${settings.repository}/discussions/`+(note.number||$('.giscus').dataset.discussion);
 $('#annotation-copy').hidden=false;
 const metadata={chapter,blockId:note.blockId,start:note.start,end:note.end,quote:note.quote,key:note.key};
 const payload=btoa(unescape(encodeURIComponent(JSON.stringify(metadata)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 activeWidget=mountComments(host,{number:note.number,term:'文字批注 '+note.key,title:'选中文字的 GitHub 批注',description:'引用原文：\n\n> '+note.quote.replace(/\n/g,'\n> ')+'\n\n<!-- ai-playbook-annotation:'+payload+' -->',backLink:noteUrl(note),returnUrl:noteUrl(note,false),onMetadata:discussion=>{
  if(activeNote?.key!==note.key||!(discussion.totalCommentCount>0))return;
  const number=Number(discussion.url?.match(/\/discussions\/(\d+)/)?.[1]);if(!number)return;
  persist({...note,number,count:discussion.totalCommentCount,local:true,updatedAt:new Date().toISOString()});github.href=discussion.url;github.textContent='在 GitHub 中打开此条批注';
 }});
}

let selectionTimer;
function inspectSelection(){
 const selection=getSelection();if(!selection?.rangeCount||selection.isCollapsed){selectionButton.hidden=true;return;}
 const range=selection.getRangeAt(0);const block=blockFor(range.startContainer);
 if(!block||blockFor(range.endContainer)!==block){selectionButton.hidden=true;return;}
 const raw=range.toString(),text=raw.trim();if(!text||text.length>1000){selectionButton.hidden=true;return;}
 const before=document.createRange();before.selectNodeContents(block);before.setEnd(range.startContainer,range.startOffset);
 const start=before.toString().length+raw.length-raw.trimStart().length;
 pending={chapter,blockId:block.id,start,end:start+text.length,quote:text};
 const rect=range.getBoundingClientRect();selectionButton.hidden=false;selectionButton.style.left=Math.max(10,Math.min(innerWidth-190,rect.left+rect.width/2-85))+'px';selectionButton.style.top=Math.max(65,rect.top-48)+'px';
}
document.addEventListener('selectionchange',()=>{clearTimeout(selectionTimer);selectionTimer=setTimeout(inspectSelection,100);});
document.addEventListener('pointerup',()=>setTimeout(inspectSelection,0));
document.addEventListener('keyup',e=>{if(e.key==='Shift'||e.key.startsWith('Arrow'))inspectSelection();});
selectionButton.addEventListener('pointerdown',e=>e.preventDefault());
selectionButton.addEventListener('click',async()=>{
 if(!pending)return;const note={...pending};const data=new TextEncoder().encode([chapter,note.blockId,note.start,note.end,note.quote].join('|'));
 const digest=await crypto.subtle.digest('SHA-256',data);note.key=chapter+':'+Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,24);
 const existing=records.find(r=>r.key===note.key);getSelection()?.removeAllRanges();openNote(existing||note);
});
$('#annotation-close').addEventListener('click',closePanel);
$('#show-annotations').addEventListener('click',()=>openList());
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)closePanel();});
$('#annotation-copy').addEventListener('click',async()=>{
 if(!activeNote)return;
 try{await navigator.clipboard.writeText(noteUrl(activeNote));$('#annotation-status').textContent='链接已复制，可分享并定位到这段文字。';}catch{$('#annotation-status').textContent='可复制此链接：'+noteUrl(activeNote);}
});

async function loadIndex(){
 try{
  const response=await fetch(new URL('annotations.json',import.meta.url),{cache:'no-cache'});if(!response.ok)throw new Error('unavailable');const data=await response.json();
  const remote=(Array.isArray(data)?data:data.annotations||[]).filter(n=>n.chapter===chapter&&typeof n.quote==='string'&&n.quote.length<=1000);synchronizedAt=data.updatedAt||'';
  let local=[];try{local=JSON.parse(localStorage.getItem('ai-playbook-notes:'+chapter)||'[]');}catch{}
  records=[...remote,...local.filter(n=>typeof n.quote==='string'&&n.chapter===chapter&&!remote.some(r=>r.key===n.key)&&(!synchronizedAt||n.updatedAt>synchronizedAt))];
 }catch{
  try{records=JSON.parse(localStorage.getItem('ai-playbook-notes:'+chapter)||'[]');}catch{}
 }
 renderMarkers();
 const url=new URL(location.href);const id=url.searchParams.get('comment');if(!id)return;
 let note=records.find(n=>n.key===url.searchParams.get('note'));
 if(!note){const block=document.getElementById(id),start=Number(url.searchParams.get('start')),end=Number(url.searchParams.get('end'));
  if(block?.matches('[data-annotatable]')&&Number.isInteger(start)&&Number.isInteger(end)&&start>=0&&end>start&&end-start<=1000){const text=blockText(block);if(end<=text.length)note={chapter,blockId:id,start,end,quote:text.slice(start,end),key:url.searchParams.get('note')};}
 }
 if(note?.key)openNote(note,true);
}
if(panel)loadIndex();
