"""Generate editable Mermaid sources and standalone SVG/HTML review boards."""
from pathlib import Path
from html import escape
import textwrap

OUT = Path(__file__).parent
# id, column, row, label, kind; E = evidence, D = decision, Q = validate.
flows = [
    dict(slug='01-prevencao', title='01 / Entender antes de desenhar',
         source='Conversas e mapeamento ajudaram a transformar uma operação complexa em problemas de design mais claros.',
         nodes=[
             ('a',0,0,'Ouvir usuários e stakeholders','E'),
             ('b',1,0,'Entender contextos e necessidades','E'),
             ('c',2,0,'Mapear as diferentes jornadas','E'),
             ('d',2,1,'Identificar lacunas de informação','E'),
             ('e',1,1,'Retomar entrevistas e alinhar dúvidas com o time','E'),
             ('f',0,1,'Usar a jornada como base das decisões','E'),
         ], edges=[('a','b',''),('b','c',''),('c','d',''),('d','e',''),('e','f','')]),
    dict(slug='02-atendimento', title='02 / Da jornada à experiência',
         source='O desenho dos fluxos conectou necessidades das pessoas, objetivos do negócio e possibilidades técnicas.',
         nodes=[
             ('a',0,0,'Partir das jornadas mapeadas','E'),
             ('b',1,0,'Identificar informações e decisões importantes','E'),
             ('c',2,0,'Desenhar caminhos de uso','E'),
             ('d',2,1,'Discutir alternativas com produto e tecnologia','E'),
             ('e',1,1,'Dar consistência com o design system','E'),
             ('f',0,1,'Materializar a experiência em protótipos','E'),
         ], edges=[('a','b',''),('b','c',''),('c','d',''),('d','e',''),('e','f','')]),
    dict(slug='03-alertas', title='03 / Uma descoberta que mudou o design',
         source='Entender o contexto real de uso mostrou que a experiência precisava considerar informações nem sempre atualizadas.',
         nodes=[
             ('a',0,0,'Investigar o contexto de uso','E'),
             ('b',1,0,'Descobrir limitações de conectividade','E'),
             ('c',2,0,'Rever a dependência de dados em tempo real','E'),
             ('d',2,1,'Considerar histórico e contexto','E'),
             ('e',1,1,'Dar visibilidade à atualização da informação','E'),
             ('f',0,1,'Apoiar uma interpretação mais cuidadosa','E'),
         ], edges=[('a','b',''),('b','c',''),('c','d',''),('d','e',''),('e','f','')]),
    dict(slug='04-pecas', title='04 / Validar, entregar e aprender',
         source='O processo continuava depois do protótipo, com colaboração no desenvolvimento e acompanhamento do uso.',
         nodes=[
             ('a',0,0,'Apresentar propostas e protótipos interativos','E'),
             ('b',1,0,'Ouvir e analisar o feedback dos usuários','E'),
             ('c',2,0,'Refinar fluxos e interfaces','E'),
             ('d',2,1,'Preparar o handoff e alinhar comportamentos','E'),
             ('e',1,1,'Acompanhar o desenvolvimento e tirar dúvidas','E'),
             ('f',0,1,'Observar o uso e orientar novas iterações','E'),
         ], edges=[('a','b',''),('b','c',''),('c','d',''),('d','e',''),('e','f','')]),
]

def svg_for(flow):
    W, HBOX, GAP, X0, Y0 = 292, 92, 145, 32, 35
    height = max(n[2] for n in flow['nodes']) * GAP + 170
    pos = {n[0]:(X0+n[1]*375,Y0+n[2]*GAP) for n in flow['nodes']}
    chunks = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1110 {height}" role="img" aria-label="{escape(flow["title"])}"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10" fill="#71877d"/></marker></defs><style>text{{font-family:Arial,sans-serif}} .label{{font-size:15px;fill:#dfe9e3}} .edge{{font-size:12px;fill:#b5c8bd;paint-order:stroke;stroke:#101713;stroke-width:5px}}</style>']
    for a,b,label in flow['edges']:
        x,y=pos[a]; tx,ty=pos[b]
        sx,sy=x+W/2,y+HBOX
        ex,ey=tx+W/2,ty
        mid=(sy+ey)/2
        if y == ty:
            sx,ex = (x+W,tx) if tx > x else (x,tx+W)
            sy=ey=y+HBOX/2
            path=f'M {sx} {sy} H {ex}'
        else:
            path=f'M {sx} {sy} V {mid} H {ex} V {ey}'
        chunks.append(f'<path d="{path}" fill="none" stroke="#71877d" stroke-width="1.6" marker-end="url(#arrow)"/>')
        if label:
            lx,ly = ((sx+ex)/2,mid-8) if sx != ex else (sx+8,sy+20)
            chunks.append(f'<text class="edge" x="{lx}" y="{ly}">{escape(label)}</text>')
    for ident,col,row,label,kind in flow['nodes']:
        x,y=pos[ident]; color='#bca365' if kind=='Q' else '#8fbaa2' if kind=='D' else '#496355'
        dash='stroke-dasharray="6 4"' if kind=='Q' else ''
        if kind=='D': shape=f'<path d="M{x+20} {y} H{x+W-20} L{x+W} {y+HBOX/2} L{x+W-20} {y+HBOX} H{x+20} L{x} {y+HBOX/2} Z"'
        else: shape=f'<rect x="{x}" y="{y}" width="{W}" height="{HBOX}" rx="8"'
        chunks.append(f'{shape} fill="#1a2720" stroke="{color}" {dash}/>')
        lines=textwrap.wrap(label,34)
        for i,line in enumerate(lines): chunks.append(f'<text class="label" text-anchor="middle" x="{x+W/2}" y="{y+HBOX/2-(len(lines)-1)*10+i*20+5}">{escape(line)}</text>')
    return ''.join(chunks)+'</svg>'

sections=[]
for flow in flows:
    svg=svg_for(flow)
    (OUT/(flow['slug']+'.svg')).write_text(svg,encoding='utf-8')
    mmd=['flowchart TD']
    for ident,col,row,label,kind in flow['nodes']:
        a,b=('{','}') if kind=='D' else ('[',']')
        mmd.append(f'  {ident}{a}"{label}"{b}'+(':::validate' if kind=='Q' else ''))
    for a,b,label in flow['edges']: mmd.append(f'  {a} -->'+(f'|"{label}"|' if label else '')+f' {b}')
    mmd.append('  classDef validate fill:#fff2cf,stroke:#9f7626,stroke-dasharray:5 4,color:#33270f')
    (OUT/(flow['slug']+'.mmd')).write_text('\n'.join(mmd)+'\n',encoding='utf-8')
    sections.append(f'<section id="{flow["slug"]}"><h2>{flow["title"]}</h2><p>{escape(flow["source"])}</p><a href="{flow["slug"]}.svg" download>Baixar SVG</a> · <a href="{flow["slug"]}.mmd" download>Fonte editável Mermaid</a><div class="diagram">{svg}</div></section>')
html='''<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Uptime / reconstrução dos fluxos</title><style>
*{box-sizing:border-box}body{margin:0;background:#101713;color:#e4ece6;font:16px/1.6 Arial,sans-serif}header,main{max-width:1180px;margin:auto;padding:35px}header{border-bottom:1px solid #34473b}h1{font-size:38px;line-height:1.15;margin:16px 0}h2{font-size:25px;line-height:1.3}p{max-width:85ch;color:#b8c9bd}a{color:#b3d9bd}nav{display:flex;flex-wrap:wrap;gap:16px}section{padding:30px 0 50px;border-bottom:1px solid #34473b;scroll-margin-top:15px}.diagram{margin-top:25px;overflow:auto;border:1px solid #34473b;border-radius:10px}.diagram svg{display:block;min-width:850px;width:100%}.badge{font-size:12px;letter-spacing:.12em;color:#dec48e}.legend{display:flex;gap:20px;flex-wrap:wrap;font-size:14px}.legend span:last-child{color:#dec48e}@media(max-width:600px){header,main{padding:22px}h1{font-size:29px}}@media(prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}</style>
<header><div class="badge">PROCESSO DE DESIGN / SÍNTESE PARA O CASE</div><h1>Da escuta à experiência</h1><p>Quatro recortes do meu processo criativo: investigar, organizar, decidir e aprender com o uso.</p><p>As etapas sintetizam um trabalho iterativo. As conversas, os protótipos e as decisões eram revisitados ao longo do projeto.</p><nav>'''+''.join(f'<a href="#{f["slug"]}">{f["title"].split(" / ")[0]}</a>' for f in flows)+'''</nav></header><main>'''+''.join(sections)+'''</main></html>'''
(OUT/'index.html').write_text(html,encoding='utf-8')
print('Created 4 SVG, 4 Mermaid and index.html')
