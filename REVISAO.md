# Revisão de entrega

Os cenários reproduzíveis estão em `tests/crm.spec.ts`.

## Histórico da migração Neon (revertida) e ícones Lucide

- **API e SQL: PASS.** Build com verificação de tipos do cliente, funções e seed. Os testes executam `db/schema.sql` em PGlite, com o mesmo handler das funções serverless. Validaram UUID no cadastro, filtros combinados, campos omitidos preservados, contagem de operações, exclusão e conflitos por identidade e versão. Um erro no segundo registro do lote reverteu a exclusão do primeiro.
- **Interface: PASS.** O estágio mudou enquanto o PATCH estava pendente e voltou ao anterior após resposta 409. A restauração conservou o checklist, o teste de rede exibiu reconexão e recuperou a base. A planilha exportou os dados filtrados recuperados da API.
- **Ícones: PASS por inspeção do código.** Navegação, ajustes, CRUD, indicadores e notificações usam Lucide. `currentColor` e `stroke-width: 1.75` são comuns aos temas. Botões de arraste, edição, menu e fechamento têm nomes acessíveis em português. O toggle continua com os dois modos existentes.
- **Ambiente externo:** não havia `DATABASE_URL` configurada. O schema e as operações foram exercitados localmente, sem executar seed, migração ou deploy em uma conta Neon.

## Histórico da versão IndexedDB

Verificação anterior no Chrome, com a base de demonstração e cadastros temporários em contextos de teste isolados.

## Interface e comportamento

| Item | Resultado e evidência |
|---|---|
| R-02, R-15, R-16 | PASS: comandos em português indicam a operação, como “Gerar prévia”, “Salvar empresa” e “Confirmar remoção”. |
| R-03 | PASS: a largura do documento permaneceu dentro da viewport nas cinco telas a 320, 375, 640, 768, 1024 e 1440 px. A tabela e o quadro têm rolagem interna. |
| R-17, R-18, R-36, R-38 | PASS: KPIs, gráfico e ações derivam de registros locais. Os seis exemplos estão identificados como fictícios nas configurações. Não há testemunhos ou indicadores de crescimento simulados. |
| R-23, R-24 | PASS: a marca usa o nome fornecido em texto. Os cinco destinos de navegação abriram no navegador. |
| R-25 | PASS: contraste calculado nos pares de texto principal/superfície: 15,75:1 no escuro e 16,30:1 no claro. Texto secundário: 8,52:1 no escuro e 5,69:1 no fundo secundário claro. Texto do botão no hover: 5,27:1. |
| R-26, R-35 | PASS nos fluxos exercitados: cadastro pelo atalho, seleção da medida do funil, agrupamento por nicho, abertura de ação, edição inline, filtros, ordenação, mudança e remoção em lote, arraste de cartão e reordenação de coluna pelo teclado. |
| R-26, R-35: arquivos | PASS: download de CSV filtrado, XLSX e JSON; template com cabeçalho; cópia do prompt conferida na área de transferência; upload de XLSX e CSV; JSON colado com uma inclusão, uma alteração e uma remoção confirmadas. |
| R-27 | PASS: carga inicial e carregamento de módulo têm estado de espera. Remover registros mostrou os estados vazios. Importação inválida mostrou o registro com erro sem gravar o lote; restauração incompatível exibiu erro. |
| R-28 | PASS: nenhuma seção de perguntas genéricas. |
| R-32, R-39 | PASS nos fluxos exercitados: Ctrl+K abriu o cadastro, Escape fechou o diálogo, setas moveram coluna. Formulários usam campos rotulados, botões têm nomes, seletores e checkboxes são nativos. Foco visível definido nos controles. |
| R-33 | PASS: estilos e componentes implementados nos arquivos-fonte do projeto. |
| R-34 | PASS: troca de tema persistiu após recarga; a edição e movimentação foram exercitadas no tema claro e os fluxos móveis no escuro. |
| R-37 | PASS: painel operacional para comercial e engenharia, energia 1 / ritmo 2 / movimento 1. O contraste de hierarquia vem da faixa de métricas, do funil mais largo e das linhas de retorno. |
| R-40 | PASS: sem fontes, imagens ou scripts remotos. O gráfico tem altura reservada. Planilha, operações e SheetJS têm módulos separados no build. Sem alegação de Core Web Vitals. |

## Decisões visuais

- **Cor e foco (R-01, R-09, R-13, R-21, R-29):** o laranja diferencia a ação de cadastro, a navegação ativa e os dados do funil; etiquetas identificam estágios reais. Os dois temas usam as cores da especificação.
- **Ícones e ações (R-04, R-08, R-22):** Lucide identifica operações e destinos em espaço reduzido. A seta da agenda abre a empresa correspondente.
- **Leitura e densidade (R-05, R-06, R-14, R-20, R-30):** tipografia local evita dependência de rede; números tabulares facilitam a comparação de valores. Métricas alinhadas permitem varredura horizontal; a agenda prioriza nomes e lembretes.
- **Superfícies (R-07, R-10, R-11, R-12):** bordas separam os blocos sem textura, desfoque ou sombra decorativa. A tabela concentra a densidade nas células, com espaçamento maior entre filtros e ações.
- **Movimento (R-19):** deslocamento durante o arraste indica a posição do cartão; o gráfico é estático.
- **Persistência (C-2, C-4, C-5):** após backup, limpeza e restauração, o checklist continuou marcado. O aplicativo abriu após recarga offline da versão de produção.
