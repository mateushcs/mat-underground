# Three.js dicas

Fontes para estudar e voltar sempre:

- Referencias locais principais:
  - `C:\Users\Mat\Downloads\Pacote de skills em pt-BR para Codex sobre Three.js, WebGL, GSAP e arquitetura Web 3D.pdf`
  - `C:\Users\Mat\Downloads\Documentos de skills para Codex e Claude em Three.js, WebGL e GSAP.pdf`
- CloudAI-X/threejs-skills: https://github.com/CloudAI-X/threejs-skills
- AgentSkill Three.js: https://agentskill.sh/q/threejs
- AgentSkill catalog/home: https://agentskill.sh/
- Docs oficiais Three.js: https://threejs.org/docs/
- Manual oficial Three.js: https://threejs.org/manual/

Os dois PDFs locais foram lidos integralmente em 10 de junho de 2026. Eles
devem orientar decisoes de arquitetura e servir como indice de assuntos.
Versoes de pacotes, assinaturas de API e compatibilidade devem ser confirmadas
na documentacao oficial no momento da implementacao.

## Stack padrao

- Default: Vite + TypeScript estrito + Three.js + GSAP.
- Comecar com addons e passes oficiais do Three.js.
- Adotar `postprocessing` da pmndrs quando forem necessarios efeitos seletivos,
  cadeias baseadas em depth/normal ou composicao fullscreen mais sofisticada.
- Tratar `ShaderMaterial`/GLSL como caminho pratico para WebGL e estudar Node
  Materials/TSL separadamente como trilha futura para `WebGPURenderer`.
- Preferir Babylon.js ou PlayCanvas quando o produto realmente pedir uma
  plataforma mais completa, editor, XR ou configurador robusto.
- Usar WebGL2 cru, regl ou OGL somente quando o pipeline customizado for parte
  essencial do problema.

## Mentalidade

Three.js e uma camada de cena/renderizacao. Em produto, o melhor uso costuma ser:

- WebGL como atmosfera, post-processing, fundo, transicao ou objeto 3D principal.
- React/DOM para controles, textos, acessibilidade e estados de UI.
- Canvas transparente quando o efeito deve ficar por cima ou por baixo da interface.
- Canvas full-bleed quando a cena e a experiencia principal.

Evitar: usar Three para UI comum, labels longos, menus, inputs ou layout responsivo.

## Checklist rapido

- Criar `WebGLRenderer` uma vez por canvas.
- Preferir `renderer.setAnimationLoop()` como loop principal.
- Usar `alpha: true` quando o canvas for overlay.
- Limitar `pixelRatio` entre `1` e `1.5` em efeitos de UI.
- Chamar `setSize(width, height, false)` no resize.
- Guardar materiais/geometrias em refs ou dentro do efeito de montagem.
- Atualizar uniforms por ref, sem recriar renderer.
- Pre-compilar cenas pesadas com `renderer.compileAsync()` quando isso reduzir
  travamentos no primeiro uso.
- Limpar tudo no unmount: geometrias, materiais, texturas, render targets,
  passes/composer e `renderer.dispose()`.
- Observar draw calls, triangulos, texturas e programas com `renderer.info`.
- Tratar `webglcontextlost` e `webglcontextrestored` em experiencias importantes.
- `pointer-events: none` em overlays visuais.
- Usar `prefers-reduced-motion` para pausar animacoes decorativas.

## Arquitetura

Separar responsabilidades conforme a escala do projeto:

- `core`: renderer, camera, loop, resize e ciclo de vida.
- `features` ou `scenes`: experiencias e cenas de produto.
- `objects`, `materials` e `shaders`: recursos visuais reutilizaveis.
- `assets`: loaders, cache, progresso e descarte.
- `post`: composer, passes e presets.
- `state` e `interactions`: estado e entrada do usuario fora do renderer.
- `workers`: parsing, simulacao ou preprocessamento comprovadamente pesado.
- `tests`: logica, browser, regressao visual e budgets.
- `utils`: funcoes pequenas sem ownership de recursos GPU.

Cada modulo que cria recursos GPU deve ter ownership claro e um caminho
deterministico de descarte/recriacao. Evitar recursos espalhados por closures
opacas e um `main.ts` que concentre toda a experiencia.

## React + Three

Padrao bom para componente simples:

1. `canvasRef`.
2. `useEffect` cria renderer, scene, camera, material.
3. `requestAnimationFrame` atualiza uniforms e renderiza.
4. Outro `useEffect` atualiza uniforms vindos de props.
5. Cleanup descarta recursos.

Nao recriar renderer quando um slider muda. Slider muda uniform.

Para experiencias maiores, encapsular o loop e os recursos em um modulo
descartavel em vez de ampliar indefinidamente o componente React.

## GSAP

- Usar timelines para sequencias com estado visual claro.
- Usar `gsap.ticker` quando a animacao GSAP precisar alimentar camera, uniforms
  ou outros valores do frame 3D.
- Usar `quickSetter`/`quickTo` para propriedades atualizadas com muita
  frequencia, quando houver ganho mensuravel.
- Usar `gsap.matchMedia()` para breakpoints e `prefers-reduced-motion`, deixando
  o proprio GSAP reverter animacoes e ScrollTriggers quando a condicao mudar.
- Manter DOM, scroll e camera sincronizados por uma unica fonte temporal.

## Post-processing

Para efeitos simples de tela cheia:

- Fullscreen quad com `ShaderMaterial` e `OrthographicCamera`.
- Mais leve que montar `EffectComposer`.
- Ideal para grain, dither, vignette, chromatic aberration fake, scanlines e halos.

Para pipeline mais pesado:

- `EffectComposer`.
- `RenderPass`.
- Passes dedicados como bloom, glitch, LUT, SMAA/FXAA.
- `OutputPass` no fim da cadeia oficial para tone mapping e conversao correta
  de espaco de cor.
- Usar quando existe uma cena 3D real ou varios passes encadeados.

Classificar o efeito antes de implementar:

- Image-space: atua sobre a imagem inteira, como bloom, AO, LUT, grain e AA.
- Object-space/seletivo: depende de objeto, layer, ID, depth ou mascara, como
  outline e bloom seletivo.
- Hibrido: combina buffers auxiliares e composicao fullscreen.

Repertorio oficial:

- `UnrealBloomPass`: bloom.
- `SSAOPass`, `SAOPass` ou `GTAOPass`: ambient occlusion com custos diferentes.
- `BokehPass`: depth of field.
- `LUTPass`: color grading.
- `OutlinePass`: selecao.
- `SSRPass`: reflexos em screen space.
- `FilmPass` e `AfterimagePass`: textura e rastros estilizados.
- `SMAAPass`: antialiasing; no pipeline oficial deve vir antes de `OutputPass`.

Repertorio pmndrs:

- `SelectiveBloomEffect`: bloom apenas em objetos selecionados.
- `ChromaticAberrationEffect` e `NoiseEffect`: efeitos de tela.
- `NormalPass` e depth textures: pipelines dependentes de normais/profundidade.
- `ShaderPass`: shader fullscreen customizado.

Nao confundir `AfterimagePass` com motion blur fisicamente convincente. Motion
blur por velocity/reprojection e uma tecnica avancada e deve existir apenas
quando a direcao de arte e o budget justificarem.

## Assets

- Usar glTF/GLB como formato principal.
- Centralizar carregamento em `GLTFLoader`.
- Integrar `DRACOLoader`, `MeshoptDecoder` e `KTX2Loader` quando o ganho for
  medido e o custo de decode estiver adequado ao hardware-alvo.
- Pipeline recomendado: exportar, inspecionar/deduplicar, redimensionar
  texturas, comprimir geometria, converter texturas para KTX2/Basis e publicar.
- Fazer lazy loading por cena ou feature.
- Lembrar que bitmaps e recursos GPU nao desaparecem apenas porque o objeto foi
  removido da cena; o ciclo de vida precisa ser explicito.

## Geometria e shaders

- `BufferGeometry` e seus atributos sao a base para geometria customizada.
- Usar `InstancedMesh` para muitos objetos com a mesma geometria/material.
- Usar `ShaderMaterial` para GLSL customizado e `RawShaderMaterial` somente
  quando o controle extra compensar perder conveniencias do Three.js.
- Usar render targets e depth textures para render-to-texture, composicao,
  selecao, reflexos e efeitos baseados em profundidade.
- Importar GLSL como `?raw` no Vite quando isso mantiver shaders organizados.
- Nomear e documentar uniforms, espacos de coordenadas e unidades.
- Evitar branches caros e precisao maior que a necessaria em shaders mobile.
- Separar geracao procedural do renderer e aceitar seed quando o resultado
  precisar ser reproduzivel.
- Para noise, escolher conscientemente entre Perlin/Simplex, Worley/Voronoi,
  fBm e domain warping em vez de somar ruido sem escala coerente.

## Interacao

- Normalizar coordenadas do ponteiro usando o retangulo real do canvas.
- Filtrar hits de `Raycaster` para ignorar helpers, objetos invisiveis e meshes
  que nao participam da interacao.
- Prever mouse, toque, teclado e resize; hover nao pode ser a unica forma de
  descobrir uma acao essencial.
- Calibrar `near`, `far`, FOV e aspect ratio para evitar clipping e distorcao.
- Usar `lil-gui` apenas como ferramenta de desenvolvimento; nao deixar paineis
  de debug expostos na experiencia final.

## Fisica, audio e simulacao

- Preferir Rapier como primeira opcao de fisica; considerar `cannon-es` para
  projetos menores e Ammo somente quando recursos herdados do Bullet forem
  realmente necessarios.
- Usar timestep fixo na simulacao e sincronizar explicitamente corpos fisicos
  com objetos visuais.
- Simplificar colliders; a malha visual nao precisa ser o collider.
- Para audio espacial, prender `AudioListener` a camera e calibrar distancia,
  rolloff e consentimento de reproducao.
- Suavizar dados de `AudioAnalyser`; nao mapear a media bruta diretamente para
  todos os parametros visuais.
- Usar `GPUComputationRenderer`/ping-pong targets somente para simulacoes que
  justifiquem estado em textura e depois de verificar suporte no hardware-alvo.

## Chromatic aberration

Jeito leve:

- Calcular distancia ate borda no shader.
- Misturar franja cyan/vermelha nas laterais.
- Deixar alpha baixo.
- Nao afetar centro da tela.

Bom para este mapa:

- So nas bordas.
- Alpha maximo baixo.
- Movimento quase imperceptivel.
- Canvas overlay transparente.

## Dithering

Tipos uteis:

- Noise dither: rapido, bom para textura e granulado.
- Ordered/Bayer dither: mais grafico, bom para estetica print/sci-fi.
- Halftone dither: mais editorial/poster.

Controle recomendado:

- Toggle on/off.
- Slider de intensidade.
- Range curto: 0% a 60%.
- Default entre 10% e 20%.

Para UI escura, dither forte suja texto pequeno. Aplicar com alpha baixo.

## Performance

- Evitar sombras reais em overlay decorativo.
- Evitar pos-process em resolucao retina cheia.
- Capar DPR e tratar resolucao/backbuffer como budget explicito.
- Pausar animacoes invisiveis.
- Preferir geometria simples.
- Texturas grandes so quando realmente visiveis.
- Separar Three em chunk proprio e aceitar o custo quando o efeito vale.
- Batchar draw calls e usar instancing quando o perfil mostrar repeticao.
- Usar LOD com distancias calibradas e histerese para evitar popping/flicker.
- Evitar chamadas bloqueantes e leituras sincronas da GPU.
- Mover trabalho para worker apenas depois de identificar gargalo real.
- Lembrar que cada pass, render target e shadow map pode adicionar renders e
  buffers por frame; sombras e post FX multiplicam custo rapidamente.
- Medir em hardware-alvo; o guia nao substitui profiling.

Metas devem ser definidas por projeto. Como ponto de partida para demos
pesadas, buscar 60 FPS em desktop e pelo menos 30 FPS em mobile, acompanhando
draw calls, geometrias, texturas, tempo de shader e memoria.

## Robustez

- Projetar factories para recriar materiais, render targets, composer e assets.
- Escutar perda/restauracao de contexto quando a experiencia 3D for essencial.
- Usar `forceContextLoss()` e `forceContextRestore()` em testes de recuperacao.
- Encerrar renderer, loop, listeners, observers e recursos GPU no unmount.
- Manter fallback funcional quando WebGL falhar ou estiver desabilitado.
- Aplicar CSP e CORS corretamente a shaders, modelos, HDRIs e texturas remotas.
- Usar cross-origin isolation apenas quando recursos como
  `SharedArrayBuffer` realmente exigirem.

## Qualidade e validacao

- Usar Vitest para parsers, generators, matematica e mapeamento de uniforms.
- Usar Playwright em browser real para fluxo, canvas nao vazio e screenshots
  de referencia em viewports desktop/mobile.
- Testar ao menos Chromium, Firefox e WebKit quando a experiencia depender de
  WebGL, audio, workers ou interacao de ponteiro.
- Usar Lighthouse como auditoria complementar de performance, acessibilidade
  e SEO; nao como substituto de metricas do renderer.
- Para mudancas visuais, registrar em texto a aparencia esperada e verificar
  enquadramento, legibilidade, movimento e pixels nao vazios.
- Para mudancas de performance, comparar metricas antes/depois.

## Acessibilidade e SEO

- Manter conteudo essencial e navegacao fora do bitmap do canvas.
- Incluir fallback textual dentro de `<canvas>` e estrutura semantica no DOM.
- Oferecer foco visivel e operacao por teclado para controles relevantes.
- Respeitar `prefers-reduced-motion` reduzindo ou removendo movimento, nao
  apenas diminuindo sua velocidade.
- Manter headings, copy, rotas e metadados indexaveis; usar JSON-LD quando o
  conteudo editorial justificar.
- Nunca depender apenas do canvas para comunicar nome, descricao, projeto ou
  chamada para acao.

## Licencas de assets

- Tratar modelo, textura, HDRI, audio, fonte e codigo de demo como itens com
  licencas independentes.
- Registrar fonte, autor, licenca, data, modificacoes e restricoes de
  redistribuicao em `ASSETS_LICENSES.md` quando assets externos entrarem no
  projeto.
- Nao assumir que um demo publico ou visivel no navegador pode ser copiado.
- Preferir assets com permissao clara de redistribuicao e atribuir no README.

## Cenas 3D fotorealistas

Ordem de qualidade:

1. Bom modelo.
2. Boa iluminacao.
3. Materiais PBR.
4. Environment map/HDRI.
5. Camera/lente.
6. Pos-processing.

Nao tentar compensar modelo ruim com bloom.

## Luz

Basico confiavel:

- `AmbientLight` baixo.
- `DirectionalLight` principal.
- `PointLight` ou `RectAreaLight` para acentos.
- Environment map para reflexos.

Visual Apple/glass:

- Luz grande e suave.
- Contraste controlado.
- Materiais com roughness media.
- Fundo com gradientes lentos.
- Pouca saturacao.

## Materiais

- `MeshStandardMaterial`: padrao seguro para PBR.
- `MeshPhysicalMaterial`: vidro, translucidez, clearcoat, transmission.
- `ShaderMaterial`: efeitos customizados, post-process e visual experimental.

Glassmorphism em 3D:

- `transparent: true`.
- `roughness` baixo/medio.
- `transmission` se usar `MeshPhysicalMaterial`.
- Reflexo de ambiente.
- Borda ou fresnel no shader para legibilidade.

## Camera

- `PerspectiveCamera` para cena 3D real.
- `OrthographicCamera` para mapas, HUDs, overlays e fullscreen shader.
- Sempre pensar em enquadramento mobile/desktop.
- Testar em pelo menos uma viewport larga e uma estreita.

## Erros comuns

- Canvas interceptando clique do app.
- Renderer recriado a cada state change.
- DPR alto demais deixando tudo pesado.
- Falta de cleanup causando vazamento.
- Efeito bonito no centro mas agressivo em texto/labels.
- Post-processing aplicado sem controle de intensidade.
- Animacao de background presa no SVG, escalando junto com zoom.

## Para este projeto

- Dots do mapa devem ser camada CSS/parallax, nao pattern dentro do SVG.
- Zoom/pan mexem linhas e estacoes, nao o granulado/dots do fundo.
- WebGL deve ficar como overlay atmosferico, sem bloquear interacao.
- Dither precisa ser ajustavel porque pode matar legibilidade de label pequeno.
- Chromatic aberration deve viver nas bordas.
- Fundo deve parecer um unico sistema visual: lago, mapa e luz com mesma familia de preto/cinza.
