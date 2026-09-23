# Memória do projeto — Mat Underground Club

Este arquivo concentra o contexto necessário para continuar o trabalho caso o histórico desta conversa seja apagado.

## Produto e direção visual

- Projeto: portfólio pessoal em formato de mapa/metrô, com páginas de estações em `src/routes/station.$stationId.tsx`.
- Stack: React + TypeScript + Vite/TanStack Start. O projeto usa aliases `@/` e Lucide para ícones.
- Identidade: editorial, escura, com bastante espaço, tipografia Helvetica local, linhas/estações do mapa e transições suaves.
- As páginas de case devem parecer estudos de caso completos, mas sem expor detalhes operacionais sensíveis dos clientes.
- Manter os controles de idioma PT/EN e tema dark/light nas páginas de case.

## Case concluído: Uptime Center / Tracbel

Rota: `/station/uptime-center` (linha L2).

Contexto confirmado pelo autor:

- O trabalho substituiu uma operação baseada em planilhas, lembretes pessoais, calendários manuais e conhecimento concentrado na memória dos consultores.
- O usuário direto principal era o consultor de pós-venda, mas a experiência web responsiva também considerava gestores, especialistas e clientes.
- O produto se conectava a outros sistemas internos; o case deve explicar isso em alto nível, sem detalhar processos proprietários.
- Máquinas podem operar em locais remotos sem internet ou rede móvel. Ausência de telemetria não significa automaticamente máquina parada.
- A interpretação considera último envio, tempo sem comunicação, estado quando a telemetria retorna, histórico e última localização registrada.
- Exemplo de valor: aproximação das primeiras 500 horas de uso (quando aplicável) gera alerta para o consultor, que agenda manutenção preventiva com o cliente.
- Validação foi contínua: entrevistas, protótipos interativos, apresentação ao cliente, acompanhamento pós-implementação, feedback, handoff e alinhamento técnico.
- Feedback dos consultores gerou comentários dentro da ordem de serviço.
- O designer entrou com requisitos básicos e escopo aberto; foi o único Product Designer, responsável por fluxos, design system, interfaces, entrevistas, iterações, handoff e acompanhamento com PM e 3 devs.
- Duração: 9 meses. Lançamento mencionado: Agrishow 2023.
- Resultados são qualitativos, sem métricas consolidadas: mais máquinas acompanhadas por consultor, maior assertividade, menos esquecimentos e sensação de alívio na operação.

## Implementação do case

Arquivos principais:

- `src/data/uptimeCase.ts`: conteúdo PT/EN, seções, legendas e placeholders.
- `src/routes/station.$stationId.tsx`: composição da página, idioma, tema, capa, rodapé e navegação para a próxima estação.
- `src/components/UptimeCaseVisual.tsx`: blocos conceituais/interativos (antes/depois, telemetria, manutenção, resultados).
- `src/components/CaseProcess.tsx`: quatro fluxogramas compactos de processo criativo.
- `src/case-study.css`: layout do case, capa com degradê, tema claro/escuro, responsividade, rodapé e imagens.
- `src/hooks/useCaseMotion.ts`: rolagem suave/motion com respeito a `prefers-reduced-motion`.
- `src/styles.css`: tokens globais e fontes Helvetica locais.

Assets do case em `public/case-studies/`:

- `uptime-cover.png`: foto da sala de operações enviada pelo usuário, usada como capa.
- `uptime-dashboard.png`: tela de dashboard usada como imagem ilustrativa.
- `uptime-hours.png`: tela de horas/uso usada como imagem ilustrativa.
- `uptime-signage.png`, `uptime-control-room.png`, `uptime-login.png`: imagens já existentes no projeto.
- As telas devem continuar identificadas como protótipo/dados ilustrativos, não como métricas de resultado.

Rodapé do case:

- Mostra a estação Uptime Center, linha 02, poster da estação e os links “Voltar ao mapa” e “Próximo projeto — Solv”.

## Fluxogramas reconstruídos

Os fluxos originais foram perdidos. O material foi reconstruído a partir do PDF/PNG de pesquisa e dos relatos do autor, mas deliberadamente em nível alto para preservar confidencialidade.

- Fonte editável: `docs/uptime-reconstruction/*.mmd`.
- SVGs: `docs/uptime-reconstruction/*.svg`.
- Visualização independente: `docs/uptime-reconstruction/index.html`.
- README: `docs/uptime-reconstruction/README.md`.
- Os quatro diagramas representam: entender antes de desenhar; jornada para experiência; descoberta que muda decisões; validar, entregar e aprender.
- Não transformar esses diagramas em fluxos detalhados de SAP, OS, telemetria ou regras internas sem autorização explícita do autor.

## Como executar e verificar

```powershell
npm run dev -- --port 8080
```

Preview principal: `http://127.0.0.1:8080/station/uptime-center`.

Preview dos fluxogramas, quando o servidor auxiliar estiver ativo: `http://127.0.0.1:8081/`.

Verificação TypeScript usada: `npx tsc --noEmit` (passou após as últimas alterações).

O build de produção já encontrou falha de filesystem/EPERM em `.vercel/output/static/stations`; investigar limpeza/lock dessa pasta antes de declarar build de produção aprovado. Não usar `git reset --hard` nem apagar mudanças do usuário.

## Próximos cuidados

- Preservar as alterações existentes e evitar reescrever o mapa inteiro ao editar um case.
- Sempre testar PT/EN, dark/light, capa, imagens, rolagem, mobile e navegação do rodapé.
- Não inventar métricas, nomes de clientes, detalhes de integração ou resultados quantitativos.
- Se novas imagens forem adicionadas, preferir colocá-las em `public/case-studies/` e incluir legenda contextual.
- O autor prefere perguntas objetivas sobre cada projeto para completar os cases gradualmente.
