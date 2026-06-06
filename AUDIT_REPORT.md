1. Visão Geral da Aplicação
Nome da Aplicação: Retro Engine (Remix 2.4 Alfa) - Refatoração Alpha 1.1 + Funcionalidades de Qualidade de Vida
Descrição: Refatoração arquitetural do editor de jogos 2D retro baseado em React + TypeScript + ECS, com adição de três funcionalidades de qualidade de vida: persistência automática de projeto, gerenciamento de painéis e atalhos de teclado globais.
Localização do Projeto: https://github.com/3eatcru-pixel/v2.5-retro-enge.git
2. Estrutura de Páginas e Funcionalidades
2.1 Estrutura de Módulos
Retro Engine Editor
├── Core Runtime (src/core/)
│   ├── Engine Core
│   ├── ECS (EntityManager, ComponentManager, SystemManager, QueryManager)
│   └── Command Pattern (Undo/Redo)
├── Editor UI (src/editor/)
│   ├── SceneView
│   ├── AnimationEditor
│   ├── TilemapEditor
│   ├── AssetBrowser
│   ├── Hierarchy
│   ├── Inspector
│   ├── ConsolePanel
│   ├── ViewMenu (novo)
│   └── KeyboardShortcutsHelp (novo)
└── State Management (src/state/)
    ├── editor.store.ts
    ├── engine.store.ts
    ├── workspace.store.ts
    ├── project.store.ts
    ├── scene.store.ts
    ├── asset.store.ts
    ├── selection.store.ts
    ├── viewport.store.ts
    ├── panels.store.ts (novo)
    └── shortcuts.store.ts (novo)

2.2 Funcionalidades por Marco
Marco 1 — Source of Truth Audit
Documentação de Governança de Estados
Criar arquivo ownership-manifest.md na raiz do projeto
Documentar para cada estado crítico do editor:
DADO: nome e tipo do estado
OWNER: qual store/módulo é responsável
MODIFICA: quais componentes/sistemas podem alterar
CONSOME: quais componentes/sistemas leem o estado
Mapear 100% dos estados críticos identificados no editor atual
Marco 2 — SelectionStore
Criação do Store de Seleção
Criar arquivo src/state/selection.store.ts usando Zustand
Implementar estados:
selectedEntityId: ID da entidade atualmente selecionada (migrado de editor.store.ts)
hoverEntityId: ID da entidade sob hover do mouse
selectionHistory: array de IDs das entidades selecionadas anteriormente
Implementar ações:
selectEntity(id): selecionar entidade
hoverEntity(id): registrar hover
clearSelection(): limpar seleção
navigateHistory(direction): navegar no histórico
Integração com Componentes
SceneView: ao clicar em entidade, chama selectEntity
Hierarchy: observa selectedEntityId e destaca item correspondente
Inspector: observa selectedEntityId e exibe propriedades da entidade
AssetBrowser: não deve quebrar com a mudança
Marco 3 — ViewportStore
Criação do Store de Viewport
Criar arquivo src/state/viewport.store.ts usando Zustand com middleware persist
Migrar estados de SceneView:
zoom: nível de zoom da câmera
pan: posição da câmera (camera x, camera y)
gridSize: tamanho da grade
showGrid: visibilidade da grade
snapToGrid: ativar snap para grade
gizmosEnabled: visibilidade dos gizmos
Implementar ações:
setZoom(value): ajustar zoom
setPan(x, y): ajustar posição da câmera
setGridSize(size): ajustar tamanho da grade
toggleGrid(): alternar visibilidade da grade
toggleSnapToGrid(): alternar snap para grade
toggleGizmos(): alternar visibilidade dos gizmos
Persistência
Configurar persist para salvar estado no localStorage
Ao fechar e reabrir SceneView, viewport deve ser restaurado
Marco 4 — EngineProvider
Criação do Provider de Engine
Criar arquivo src/core/engine-core/EngineProvider.ts ou src/state/engine.provider.tsx
Implementar inicialização da engine fora do ciclo de vida do React:
Criar instância única de Engine no nível superior
Engine deve ser um serviço singleton que o React observa
Remover criação de new Engine() do useEffect do SceneView
Refatoração do SceneView
SceneView deve apenas consumir a engine existente
Remover lógica de destruição da engine no cleanup do useEffect
Engine deve permanecer viva mesmo quando SceneView é desmontado
Atualização do engine.store.ts
Refletir nova arquitetura onde engine é gerenciada pelo Provider
Adicionar métodos para observar estado da engine sem controlá-la diretamente
Marco 5 — Asset Registry
Implementação do Registro de Assets
Criar sistema de registro com estrutura:
guid: identificador único global (exemplo: "ast_001")
alias: nome amigável (exemplo: "Hero Idle")
canonicalName: nome canônico para referência (exemplo: "hero_idle")
path: caminho do arquivo (exemplo: "assets/characters/hero/idle.png")
metadata: informações adicionais do asset
tags: array de tags para categorização
dependencies: array de GUIDs de assets dependentes
Integração com AssetDatabase
Integrar registro com AssetDatabase existente
Implementar método engine.getAsset(canonicalName) para buscar asset por nome canônico
Permitir busca por GUID, alias ou canonicalName
Marco 6 — Persistência do Projeto Atual
Salvamento Automático
Criar lógica de salvamento automático no project.store.ts
Salvar no localStorage:
Lista de entidades e seus componentes
Estado do viewport (zoom, pan, grid, gizmos)
Estado da seleção (selectedEntityId, selectionHistory)
Configurações do projeto
Trigger de salvamento:
Após qualquer modificação em entidades/componentes
Após mudanças no viewport
Após mudanças na seleção
Debounce de 500ms para evitar salvamentos excessivos
Restauração Automática
Ao carregar o editor, verificar se existe projeto salvo no localStorage
Se existir, restaurar todos os estados salvos
Se não existir, iniciar com projeto vazio
Indicador de Salvamento
Exibir indicador visual "Projeto salvo automaticamente" no toolbar do editor
Indicador deve aparecer por 2 segundos após cada salvamento
Usar ícone de check ou texto "Salvo"
Botão Novo Projeto
Adicionar botão "Novo Projeto" no toolbar do editor
Ao clicar, exibir modal de confirmação
Ao confirmar, limpar localStorage e resetar todos os stores para estado inicial
Marco 7 — Gerenciamento de Painéis
Criação do PanelsStore
Criar arquivo src/state/panels.store.ts usando Zustand com middleware persist
Implementar estados:
openPanels: objeto com chaves para cada painel (hierarchy, inspector, sceneView, animationEditor, tilemapEditor, assetBrowser, console) e valores booleanos indicando se está aberto
Implementar ações:
togglePanel(panelName): alternar visibilidade de um painel
openPanel(panelName): abrir painel específico
closePanel(panelName): fechar painel específico
Botão de Fechar nos Painéis
Adicionar botão X no cabeçalho de cada painel fechável
Ao clicar no X, chamar panels.store.closePanel(panelName)
Painéis fecháveis: Hierarchy, Inspector, SceneView, AnimationEditor, TilemapEditor, AssetBrowser, Console
Menu View
Criar componente ViewMenu no toolbar do editor
Exibir lista de painéis com checkboxes
Checkbox marcado indica painel aberto, desmarcado indica painel fechado
Ao clicar no checkbox, chamar panels.store.togglePanel(panelName)
Layout Responsivo
Quando painéis são fechados, os painéis restantes expandem para preencher o espaço disponível
Usar CSS Grid ou Flexbox para ajuste automático
Persistência
Estado de openPanels persiste no localStorage
Ao recarregar o editor, painéis são restaurados no estado anterior
Marco 8 — Atalhos de Teclado Globais
Criação do ShortcutsStore
Criar arquivo src/state/shortcuts.store.ts usando Zustand
Implementar estado:
lastShortcut: string com nome do último atalho acionado (para exibir toast)
Implementar ação:
triggerShortcut(name): registrar acionamento de atalho
Implementação de Atalhos
Criar hook useKeyboardShortcuts no EditorLayout
Implementar atalhos:
Ctrl+Z: Undo (chamar comando existente no EditorLayout)
Ctrl+Shift+Z ou Ctrl+Y: Redo (chamar comando existente no EditorLayout)
Ctrl+S: salvar projeto (trigger persistência manual)
Teclas 1-6: navegar entre entidades no histórico de seleção (chamar selection.store.navigateHistory)
Delete: deletar entidade selecionada (chamar método de deleção no engine)
Ctrl+D: duplicar entidade selecionada (chamar método de duplicação no engine)
Esc: limpar seleção (chamar selection.store.clearSelection)
Toast de Feedback
Usar sonner para exibir toast breve ao acionar atalho
Toast deve exibir nome da ação (exemplo: "Projeto salvo", "Entidade duplicada", "Seleção limpa")
Toast desaparece automaticamente após 2 segundos
Tela de Ajuda de Atalhos
Criar componente KeyboardShortcutsHelp
Exibir modal com lista de todos os atalhos e suas descrições
Abrir modal ao pressionar tecla ? ou ao clicar em botão no toolbar
Usar Dialog do shadcn/ui para modal
Organizar atalhos por categoria: Navegação, Edição, Projeto, Seleção
3. Regras de Negócio e Lógica
3.1 Governança de Estados
Princípio de Responsabilidade Única
Cada estado crítico deve ter um único owner
Modificações devem ser explícitas e rastreáveis
Consumidores devem apenas ler, nunca modificar diretamente
Separação de Camadas
src/core/: runtime puro TypeScript, zero dependências React
src/editor/: componentes UI React
src/state/: Zustand stores para gerenciamento de estado
3.2 Ciclo de Vida da Engine
Inicialização
Engine é criada uma única vez no Provider
Inicialização ocorre antes da montagem de qualquer componente do editor
Persistência
Engine permanece viva durante toda a sessão do editor
Fechar qualquer componente do editor (SceneView, AnimationEditor, TilemapEditor, AssetBrowser) não afeta a engine
Observação
Componentes React observam estado da engine via stores
Mudanças na engine disparam atualizações nos stores
Stores notificam componentes React
3.3 Sincronização de Seleção
Fluxo de Seleção
Usuário clica em entidade no SceneView
SceneView chama selection.store.selectEntity(id)
SelectionStore atualiza selectedEntityId
Hierarchy observa mudança e destaca item
Inspector observa mudança e carrega propriedades
Histórico de Seleção
Cada seleção é adicionada ao selectionHistory
Limite máximo de histórico: 50 itens
Navegação permite voltar/avançar no histórico
3.4 Persistência de Viewport
Salvamento Automático
Qualquer mudança em zoom, pan, grid ou gizmos é salva automaticamente
Persistência usa localStorage via Zustand persist
Restauração
Ao abrir SceneView, viewport é restaurado do estado salvo
Se não houver estado salvo, usar valores padrão
3.5 Registro de Assets
Unicidade
Cada asset deve ter GUID único
CanonicalName deve ser único dentro do projeto
Alias pode ser duplicado (apenas para exibição)
Resolução de Dependências
Ao carregar asset, verificar dependencies
Carregar assets dependentes automaticamente
Detectar dependências circulares e reportar erro
3.6 Persistência de Projeto
Salvamento Automático
Salvamento é disparado após modificações em entidades, componentes, viewport ou seleção
Debounce de 500ms evita salvamentos excessivos durante edição contínua
Salvamento inclui snapshot completo do estado do projeto
Restauração
Ao carregar o editor, verificar localStorage
Se projeto salvo existir, restaurar todos os estados
Se não existir, iniciar com projeto vazio padrão
Novo Projeto
Ao criar novo projeto, exibir modal de confirmação para evitar perda acidental de dados
Após confirmação, limpar localStorage e resetar stores
3.7 Gerenciamento de Painéis
Estado de Painéis
Estado de quais painéis estão abertos persiste no localStorage
Ao recarregar o editor, painéis são restaurados no estado anterior
Layout Dinâmico
Quando painéis são fechados, layout se ajusta automaticamente
Painéis restantes expandem para preencher espaço disponível
3.8 Atalhos de Teclado
Prioridade de Atalhos
Atalhos globais funcionam em qualquer parte do editor
Atalhos não devem interferir com inputs de texto (desabilitar quando input está focado)
Feedback Visual
Cada atalho acionado exibe toast com nome da ação
Toast desaparece automaticamente após 2 segundos
Navegação por Histórico
Teclas 1-6 navegam entre as últimas 6 entidades selecionadas
Se histórico tiver menos de 6 itens, teclas sem correspondência não fazem nada
4. Situações Excepcionais e de Contorno
Situação
Comportamento Esperado
SceneView é fechado
Engine permanece viva, outros editores continuam funcionando
Seleção de entidade inexistente
SelectionStore limpa seleção, Inspector exibe mensagem de entidade não encontrada
Histórico de seleção vazio
Navegação de histórico não faz nada
Asset com GUID duplicado
Sistema rejeita registro e reporta erro
Asset com dependência circular
Sistema detecta e reporta erro, não carrega asset
Viewport sem estado salvo
Usar valores padrão: zoom=1, pan=(0,0), showGrid=true, snapToGrid=false, gizmosEnabled=true
Engine não inicializada
Componentes do editor exibem mensagem de carregamento
Store com erro de persistência
Usar estado em memória, reportar erro no console
localStorage cheio
Exibir toast de erro, continuar operação em memória sem persistência
Projeto salvo corrompido
Ignorar projeto salvo, iniciar com projeto vazio, exibir toast de erro
Todos os painéis fechados
Impedir fechamento do último painel, exibir toast "Pelo menos um painel deve estar aberto"
Atalho acionado com input focado
Ignorar atalho, não executar ação
Deletar entidade sem seleção
Não fazer nada, não exibir toast
Duplicar entidade sem seleção
Não fazer nada, não exibir toast
Navegar histórico além dos limites
Não fazer nada, não exibir toast
Pressionar Ctrl+S sem modificações
Exibir toast "Projeto já está salvo"

5. Critérios de Aceitação
Criar ownership-manifest.md com mapeamento completo de 100% dos estados críticos do editor
Criar src/state/selection.store.ts com selectedEntityId, hoverEntityId e selectionHistory funcionando
Selecionar entidade no SceneView → Hierarchy destaca item → Inspector exibe propriedades → AssetBrowser não quebra
Criar src/state/viewport.store.ts com persist configurado
Fechar SceneView → abrir novamente → viewport (zoom, pan, grid, gizmos) preservado
Criar EngineProvider e mover inicialização da engine para fora do SceneView
Fechar SceneView → engine continua viva e outros editores funcionam normalmente
Atualizar engine.store.ts para refletir nova arquitetura
Implementar Asset Registry com estrutura completa (GUID, Alias, CanonicalName, Path, Metadata, Tags, Dependencies)
Integrar Asset Registry com AssetDatabase existente
Implementar engine.getAsset('hero_idle') funcionando por CanonicalName
Eliminar uso de forceUpdate() no SceneView
Verificar ausência de dependências circulares no código
TypeScript compila sem erros
Todos os componentes do editor (SceneView, AnimationEditor, TilemapEditor, AssetBrowser, Hierarchy, Inspector) usam os novos stores
Criar entidade → modificar componente → recarregar página → projeto restaurado com todas as modificações
Indicador "Projeto salvo automaticamente" aparece após modificações
Clicar em "Novo Projeto" → confirmar modal → localStorage limpo e editor resetado
Criar src/state/panels.store.ts com persist configurado
Clicar no X de um painel → painel fecha → layout se ajusta
Abrir menu View → marcar/desmarcar checkbox → painel abre/fecha
Fechar painéis → recarregar página → painéis permanecem fechados
Pressionar Ctrl+Z → ação de Undo executada → toast exibido
Pressionar Ctrl+S → projeto salvo → toast "Projeto salvo" exibido
Pressionar teclas 1-6 → navegação no histórico de seleção funciona
Pressionar Delete com entidade selecionada → entidade deletada → toast exibido
Pressionar Ctrl+D com entidade selecionada → entidade duplicada → toast exibido
Pressionar Esc → seleção limpa → toast exibido
Pressionar ? ou clicar em botão → modal de ajuda de atalhos abre com lista completa
Atalhos não funcionam quando input de texto está focado
6. Funcionalidades Não Implementadas Nesta Versão
Rearranjamento de painéis por drag-and-drop
Customização de atalhos de teclado pelo usuário
Salvamento de múltiplos projetos com nomes diferentes
Exportação/importação de projetos
Sistema de plugins
Multiplayer ou colaboração em tempo real
Sistema de templates
Integração com controle de versão
Sistema de testes automatizados
Documentação de API
Sistema de logs avançado
Otimizações de performance
Suporte a múltiplos idiomas no editor
Sistema de notificações avançado
Temas customizáveis
Sistema de backup automático em nuvem
Histórico de versões do projeto
Desfazer/refazer em nível de projeto (apenas em nível de comandos)
Painéis flutuantes ou destacáveis
Layouts de painéis salvos como presets
