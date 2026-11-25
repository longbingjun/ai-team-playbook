"""One-time PDF import. Website builds use the editable content/ files only."""
from pathlib import Path
import argparse, json, re, shutil, unicodedata, html
import pymupdf as fitz

ROOT = Path(__file__).resolve().parents[1]

def clean(s):
    # Normalize the compatibility ideographs used by the source's CJK font.
    return ''.join(unicodedata.normalize('NFKC', c) if '\u2e80' <= c <= '\u2fff' or '\uf900' <= c <= '\ufaff' or c in 'ﬁﬂ' else c for c in s).strip()

def join(a, b):
    return a + (' ' if a and b and re.search(r'[a-zA-Z0-9]$', a) and re.match(r'[a-zA-Z0-9/]', b) else '') + b

CHAPTERS = [
 ('foundations','前端、后端与全栈应用基础','理解系统','从浏览器里的界面，到服务器、数据库与网络入口，建立共同的技术语言。','前置知识'),
 ('communication','前后端通信方式与模块化后端','连接前后端','理解 API、文件传输、流式事件，以及模块之间清晰的职责边界。','前置知识'),
 ('agent-runtime','异步任务队列、Agent 运行时与隔离沙箱','让 Agent 可靠运行','拆开任务调度、智能体循环与隔离执行，理解一次任务的完整生命周期。','工程实践'),
 ('security','多租户权限隔离、存储配额与资产保护','守住系统边界','梳理身份、权限、配额与专有资产保护，让团队建立可执行的安全边界。','工程实践'),
 ('delivery','容器化持续交付与数据持久化','把系统持续交付','从 Git 提交到容器部署，理解持久化、兼容迁移与灾备恢复。','工程实践'),
 ('performance','全链路性能排查与开源架构对比','用证据定位问题','沿前端、接口与异步任务逐层观测，并对照成熟开源系统做出取舍。','工程实践'),
 ('team-workflow','规约驱动开发与多仓库团队协作','建立团队协作方式','以 PRD、Spec 和纵向切片对齐工作，用清晰的仓库边界协调多人开发。','协作与思考'),
 ('working-with-ai','面向编程 Agent 的工程护栏与人机分工','与 AI 一起开发','通过工程护栏、独立验证和决策记录，思考人与编程 Agent 各自的责任。','协作与思考'),
 ('glossary','核心术语速查表与参考来源','术语与参考','回查关键概念、缩写与原文参考来源。','附录'),
]

FIGURES = {
 3: (142, 278, '1-1'), 4: (444, 618, '1-2'), 7: (61, 237, '2-1'),
 8: (432, 582, '3-1'), 9: (455, 620, '3-2'), 13: (580, 735, '5-1'), 15: (61, 200, '6-1')
}
TABLES = {
 5: (163, 349, [58, 143, 345, 537], [190, 230, 270, 310, 349]),
 12: (101, 295, [58, 158, 330, 537], [129, 184, 240, 295]),
 15: (477, 716, [58, 143, 335, 538], [505, 575, 646, 716]),
 18: (284, 752, [58, 138, 271, 537], [311,351,392,431,472,512,552,592,632,672,713,752]),
 19: (58, 245, [58,138,271,537], [85,126,166,206,245]),
}

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('pdf',type=Path); args=ap.parse_args()
    doc=fitz.open(args.pdf)
    content=ROOT/'content'; assets=ROOT/'public/assets'; content.mkdir(exist_ok=True); assets.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(args.pdf,assets/'full-stack-agent-architecture.pdf')
    previous=json.loads((content/'chapters.json').read_text(encoding='utf-8')) if (content/'chapters.json').exists() else []
    discussions={c['slug']:c['discussion'] for c in previous if c.get('discussion')}
    chapters=[]
    for i, (slug,title,short,desc,group) in enumerate(CHAPTERS):
        chapters.append(dict(slug=slug,title=title,short=short,description=desc,group=group,number=i+1 if i<8 else None,sections=[],html=[],pages=[]))
        if slug in discussions:chapters[-1]['discussion']=discussions[slug]
    current=None; pending=''; last_y=None; last_page=None; last_kind=None; figure_count=0; table_count=0

    def flush():
        nonlocal pending
        if pending and current is not None: chapters[current]['html'].append('<p>'+html.escape(pending)+'</p>')
        pending=''

    for page_no,page in enumerate(doc,start=1):
        if page_no==1: continue
        events=[]
        figures=FIGURES.get(page_no)
        table=TABLES.get(page_no)
        if figures:
            y0,y1,name=figures
            path=assets/f'figure-{name}.png'
            page.get_pixmap(matrix=fitz.Matrix(3,3),clip=fitz.Rect(58,y0,537,y1)).save(path)
            events.append((y0,'figure',f'<figure><button class="figure-zoom" type="button" aria-label="放大架构图"><img src="assets/figure-{name}.png" alt="原文架构图 {name.replace("-", ".")}" loading="lazy" width="1437" height="{round((y1-y0)*3)}"></button>'))
            figure_count+=1
        if table:
            y0,y1,xs,ys=table
            heads=['对应章节','术语与缩写','属性定性与在全栈系统中的核心职责'] if page_no>=18 else (['对比维度','公开展示站点','核心业务系统'] if page_no==5 else ['传播路径','泄露成因','服务端隔离方案'] if page_no==12 else ['开源系统','服务角色与存储划分','与本书架构的对应关系及演进启示'])
            rows=[]
            for r0,r1 in zip(ys,ys[1:]):
                row=[]
                for x0,x1 in zip(xs,xs[1:]):
                    txt=''
                    for l in page.get_text('text',clip=fitz.Rect(x0,r0,x1,r1)).splitlines(): txt=join(txt,clean(l))
                    row.append(txt)
                rows.append(row)
            h='<div class="table-scroll" role="region" aria-label="'+heads[0]+'对照表" tabindex="0"><table><thead><tr>'+''.join('<th scope="col">'+html.escape(x)+'</th>' for x in heads)+'</tr></thead><tbody>'
            h+=''.join('<tr>'+''.join('<td>'+html.escape(x)+'</td>' for x in row)+'</tr>' for row in rows)+'</tbody></table></div>'
            events.append((y0,'table',h)); table_count+=1
        for b in page.get_text('dict')['blocks']:
            if b['type']!=0: continue
            for line in b['lines']:
                y=line['bbox'][1]; x=line['bbox'][0]
                if y<48 or y>797: continue
                if figures and figures[0]<=y<figures[1]: continue
                if table and table[0]<=y<table[1]: continue
                text=clean(''.join(s['text'] for s in line['spans']))
                size=max(s['size'] for s in line['spans'])
                kind='body'
                if size>=15:kind='chapter'
                elif size>=12 and re.match(r'\d+\.\d+\s',text):kind='heading'
                elif text=='参考来源' and size>=12:kind='heading'
                elif re.match(r'图\s*\d+\.\d+[：:]',text):kind='caption'
                elif 8.9<=size<9.5:kind='caption-cont'
                elif text=='U + R + B ≤ Q':kind='formula'
                events.append((y,kind,(text,line['bbox'],size)))
        events.sort(key=lambda e:e[0])
        for y,kind,item in events:
            if last_kind in ['caption','caption-cont'] and kind not in ['caption','caption-cont']:
                chapters[current]['html'][-1]+='</figcaption></figure>'
            if kind=='chapter':
                flush(); current=8 if item[0].startswith('附') else next(i for i,c in enumerate(chapters) if c['title'] in item[0])
                last_kind='chapter'; last_y=None; continue
            if current is None: raise RuntimeError('Missing chapter')
            if page_no not in chapters[current]['pages']:chapters[current]['pages'].append(page_no)
            if kind in ['table','figure']:
                flush();chapters[current]['html'].append(item);last_kind=kind;last_y=None;continue
            text,bbox,size=item
            if kind=='heading':
                flush(); section=re.match(r'(\d+\.\d+)\s+(.+)',text)
                sid='section-'+section[1].replace('.','-') if section else 'references'
                chapters[current]['sections'].append(dict(id=sid,title=text))
                chapters[current]['html'].append(f'<h2 id="{sid}">{html.escape(text)}<a class="heading-link" href="#{sid}" aria-label="此小节的永久链接">#</a></h2>')
            elif kind in ['caption','caption-cont']:
                flush()
                if kind=='caption':chapters[current]['html'].append('<figcaption>'+html.escape(text))
                else:chapters[current]['html'][-1]=join(chapters[current]['html'][-1],html.escape(text))
            elif kind=='formula':
                flush();chapters[current]['html'].append('<div class="formula" aria-label="已用加预留加本次上传不得超过配额">U + R + B ≤ Q</div>')
            else:
                if pending and last_page==page_no and last_y is not None and y-last_y>22:flush()
                elif pending and last_page!=page_no and re.search(r'[。！？]$',pending):flush()
                # Lists in the reference appendix remain independently editable.
                if current==8 and re.match(r'\d+\.\s',text):flush()
                pending=join(pending,text)
            last_kind=kind;last_y=y;last_page=page_no
    flush()
    for c in chapters:
        h='\n'.join(c.pop('html'))
        # Preserve semantic inline code for recognizable identifiers in prose only.
        def code_p(m):
            text=m[1]
            text=re.sub(r'(?<![\w>])((?:lease_generation|lease_until|cancel_requested|retry_wait|reconcile|queued|running|succeeded|cancelled|tenant_id|created_at|userName|username|AGENTS\.md|README\.md|sitemap\.xml|robots\.txt|index\.html|bg-slate-800|px-4|/api/[a-z_/]+|/healthz|/readyz))(?![\w<])',r'<code>\1</code>',text)
            return '<p>'+text+'</p>'
        h=re.sub(r'<p>(.*?)</p>',code_p,h)
        h=h.replace('1 GiB =230','1 GiB = 2³⁰')
        for page_num in c['pages']:
            for link in doc[page_num-1].get_links():
                uri=link.get('uri','')
                if not uri.startswith('https://'):continue
                phrase=clean(doc[page_num-1].get_textbox(link['from'])).strip(' ：:）)')
                if not phrase:continue
                escaped=html.escape(phrase)
                # Match text nodes, preserving the generated markup and inline code.
                parts=re.split(r'(<[^>]+>)',h)
                for k in range(0,len(parts),2):
                    if escaped in parts[k]:
                        parts[k]=parts[k].replace(escaped,f'<a href="{html.escape(uri,quote=True)}" target="_blank" rel="noopener noreferrer">{escaped}</a>',1)
                        break
                h=''.join(parts)
        (content/(c['slug']+'.html')).write_text(h+'\n',encoding='utf-8')
    (content/'chapters.json').write_text(json.dumps(chapters,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'chapters':len(chapters),'sections':sum(len(c['sections']) for c in chapters),'figures':figure_count,'tables':table_count,'source_pages':len(doc)},ensure_ascii=False))

if __name__=='__main__':main()
