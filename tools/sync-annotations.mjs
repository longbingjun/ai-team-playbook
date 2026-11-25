// Reads public discussion metadata at build time; no token is shipped to readers.
import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {repository}=JSON.parse(await readFile(path.join(root,'site.config.json'),'utf8'));
const [owner,name]=repository.split('/');
const validChapters=new Set(JSON.parse(await readFile(path.join(root,'content/chapters.json'),'utf8')).map(c=>c.slug));
let cursor=null,annotations=[];
do{
 const query='query($owner:String!,$name:String!,$cursor:String){repository(owner:$owner,name:$name){discussions(first:100,after:$cursor,orderBy:{field:CREATED_AT,direction:DESC}){pageInfo{hasNextPage endCursor}nodes{number body url comments{totalCount}}}}}';
 const args=['api','graphql','-f','query='+query,'-f','owner='+owner,'-f','name='+name];if(cursor)args.push('-f','cursor='+cursor);
 const result=spawnSync('gh',args,{encoding:'utf8',env:process.env,maxBuffer:16*1024*1024,windowsHide:true});
 if(result.status!==0)throw new Error('Cannot synchronize public annotation index: '+result.stderr);
 const response=JSON.parse(result.stdout);if(response.errors)throw new Error(JSON.stringify(response.errors));
 const {nodes,pageInfo}=response.data.repository.discussions;
 for(const discussion of nodes){
  const encoded=discussion.body.match(/<!-- ai-playbook-annotation:([A-Za-z0-9_-]+) -->/)?.[1];if(!encoded||discussion.comments.totalCount===0)continue;
  try{
   const note=JSON.parse(Buffer.from(encoded,'base64url').toString('utf8'));
   if(!validChapters.has(note.chapter)||typeof note.quote!=='string'||!note.quote||note.quote.length>1000||!/^p-[a-f0-9]{12}(?:-\d+)?$/.test(note.blockId)||!new RegExp('^'+note.chapter+':[a-f0-9]{24}$').test(note.key)||!Number.isInteger(note.start)||!Number.isInteger(note.end)||note.start<0||note.end<=note.start||note.end-note.start!==note.quote.length)continue;
   annotations.push({chapter:note.chapter,blockId:note.blockId,start:note.start,end:note.end,quote:note.quote,key:note.key,number:discussion.number,count:discussion.comments.totalCount});
  }catch{/* A malformed user-supplied annotation never enters the rendered index. */}
 }
 cursor=pageInfo.hasNextPage?pageInfo.endCursor:null;
}while(cursor);
annotations=[...new Map(annotations.map(n=>[n.key,n])).values()];
await writeFile(path.join(root,'public/assets/annotations.json'),JSON.stringify({updatedAt:new Date().toISOString(),annotations}));
console.log(`Synchronized ${annotations.length} public quotation threads.`);
