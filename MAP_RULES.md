# Regras do Mapa

Referencia obrigatoria antes de mexer no mapa:
`C:\Users\Mat\Downloads\One_Metro_World_Jug_Cerovic.pdf`

Prancha de identidade visual do projeto:
`docs/references/map-visual-identity.png`

## Direcao visual

- A base e modernista, racional e tecnica: grelha clara, tipografia sem
  ornamento, contraste forte e paleta reduzida.
- O mapa e sempre a informacao principal. Efeitos materiais nunca podem
  encobrir linhas, estacoes, nomes ou baldeacoes.
- A ruptura visual vem da fisica da luz: vidro, refracao, vazamentos luminosos
  e aberracao cromatica muito sutis. Nao usar decoracao organica gratuita.
- Cor e excecao funcional. As cores fortes pertencem primeiro as linhas e aos
  sinais de navegacao; reflexos cromaticos ficam com baixa opacidade.
- Apenas as linhas L1 a L7 usam cor. A L8 e todas as linhas que nao fazem parte
  desse conjunto usam cinza em tracos, estacoes, badges, terminais e menu.
- Elementos de paisagem sao opcionais e devem existir apenas quando orientam.
  Na versao atual, agua, rios, costa e parques foram deliberadamente omitidos
  para manter o diagrama abstrato e concentrado na topologia.
- Escalas tipograficas podem ser extremas: titulos monumentais e cortados
  convivem com metadados pequenos e tecnicos, desde que a leitura principal
  continue evidente.
- Dados, indices, numeracao e colofao fazem parte da composicao. Devem parecer
  informacao real, nao texto decorativo ou instrucao de uso.
- Vidro deve transformar o que esta atras dele. Paineis e lentes usam bordas
  retas, raios minimos e reflexos localizados.
- A ordem geometrica do livro e a estrutura; luz e material introduzem tensao,
  nunca desordem.
- O modo visual publicado e Prisma. Nao exibir seletor de esteticas no mapa.

## Tipos de linha

- Metro usa traco solido espesso, estacao regular circular clara e terminal
  circular maior. Numero da linha usa badge preenchido com a cor da linha.
- Contornos de estacoes e baldeacoes usam 2 px visual para manter presenca, e nao
  engrossam com o zoom.
- Commuter rail usa traco espesso e dessaturado, com miolo escuro nas estacoes.
  Numero usa badge preenchido na cor clara do modal.
- Light rail usa duas linhas finas paralelas. Numero usa badge claro com
  contorno na cor da linha.
- BRT usa corredor duplo com marcacoes transversais. Numero usa badge claro com
  contorno na cor da linha.
- Tramway usa linha fina com estacoes circulares vazadas. Numero aparece como
  texto, sem badge.
- Bus usa linha fina com estacoes quadradas vazadas.
- Ferry usa linha fina com estacoes circulares preenchidas.
- Cable car usa linha fina com pequenos marcadores circulares preenchidos.
- Nao substituir as assinaturas dos modais por um unico estilo generico.

## Baldeacoes

- Baldeacao regular usa uma unica capsula branca com contorno escuro e um ponto
  interno por linha atendida.
- Baldeacao entre estacoes com nomes diferentes usa dois marcadores circulares
  unidos por uma ligacao curta e solida.
- Baldeacao de caminhada longa usa dois marcadores circulares unidos por uma
  ligacao solida mais longa.
- Baldeacao fora do sistema usa dois marcadores circulares unidos por linha
  pontilhada e indicador de caminhada.
- O comprimento e o estilo da ligacao comunicam o tipo de transferencia; nao
  sao decoracao intercambiavel.

## Nomes de estacao

- Nome de estacao regular usa caixa normal e peso leve.
- Nome de estacao terminal usa CAIXA ALTA e peso forte.
- Nomes de estacoes que nao sao baldeacoes ficam preferencialmente a 45 graus,
  com 90 graus como alternativa quando necessario. A orientacao deve manter o
  nome proximo da sua bolinha e reduzir colisoes.
- Baldeacao mostra o nome da estacao e quadrados com numero/cor de todas as
  linhas atendidas. Os quadrados ficam lado a lado ou quebram para linhas
  inferiores quando nao houver espaco.
- Os quadrados numericos nas pontas e nas baldeacoes usam escala 50% maior e
  numeros em branco ou off-white. O preenchimento pode ser escurecido para
  preservar contraste sem alterar a cor do trilho.
- Nomes de baldeacao permanecem horizontais e com contraste integral.
- O nome usa a cor da linha quando houver apenas uma linha associada.
- Baldeacoes e nomes compartilhados devem manter contraste neutro e leitura
  acima da identidade de uma linha isolada.

## Numeracao

- Toda linha usa um numero visivel unico entre 01 e 99, sempre com dois
  algarismos. Siglas de implementacao como LR1, BRT1 ou T1 nunca aparecem na
  sinalizacao do mapa.
- Badges preenchidos pertencem aos modais pesados: metro e commuter rail.
- Badges vazados pertencem a light rail e BRT.
- Tramway, bus, ferry e cable car usam numeracao simples sem badge quando a
  numeracao for exibida.
- Forma, preenchimento e contorno do badge fazem parte da identidade do modal.

Checklist visual:

- Todas as linhas tem nome e numero nas duas pontas.
- Toda linha aberta possui uma estacao exatamente em cada ponta, inclusive as
  linhas auxiliares sem pagina.
- O conjunto numero + nome da linha fica a no maximo 6 px da ponta da linha. Se
  o rotulo nao couber nesse limite, ajuste a posicao/tracado da linha ate caber.
- As distancias entre estacoes da mesma linha devem ser iguais ou quase iguais.
- Linhas usam apenas retas, 45 graus ou 90 graus.
- Nenhuma linha pode correr em cima de outra em paralelo: segmentos paralelos de
  linhas diferentes mantem distancia suficiente para nao se sobreporem nem
  parecerem uma unica linha (nada de tracos colineares como ja houve entre
  Creditos e Nimbus).
- Toda curva usa raio 32.
- Nada triangular ou pontiagudo em curvas.
- Nenhum texto pode sobrepor outro texto.
- Nenhum texto pode ficar em cima de uma linha.
- Baldeacoes ficam exatamente nas linhas que se cruzam.
- Nem todo cruzamento precisa virar baldeacao.
- Bolinhas de estacao ficam centralizadas na linha.
- Cada linha tem pelo menos uma baldeacao com outra linha.
- Baldeacoes seguem a legenda do PDF: marcador unificado, off-white, com contorno escuro e pontos internos por linha.
- Nomes de estacoes nao usam quadrado/badge de linha; numero + nome de linha aparecem somente nas pontas da linha.
- Zoom minimo e o mapa inteiro em fill.
- O mapa nao pode ser arrastado para fora das bordas do proprio mapa.
