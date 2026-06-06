Retro Engine — Source of Truth Audit (Alpha 1.1)
Este documento mapeia a governança de todos os estados críticos do editor da Retro Engine, estabelecendo propriedade única (Single Source of Truth) para cada dado.

Legenda
Coluna
Significado
DADO
Nome e tipo do estado crítico
OWNER
Store/módulo responsável por ser a fonte única de verdade
MODIFICA
Componentes/sistemas que podem alterar este estado
CONSOME
Componentes/sistemas que leem este estado


Estados de Seleção (Selection Domain)
DADO
OWNER
MODIFICA
CONSOME
selectedEntityId: number | null
selection.store.ts
SceneView (clique no canvas), HierarchyPanel (clique na árvore), InspectorPanel (deleção de entidade), EditorLayout (undo/redo)
SceneView (destaque), HierarchyPanel (destaque), InspectorPanel (propriedades), EditorLayout (hotkeys)
hoverEntityId: number | null
selection.store.ts
SceneView (hover no canvas), HierarchyPanel (hover na árvore)
SceneView (preview), HierarchyPanel (preview)
selectionHistory: number[]
selection.store.ts
SceneView, HierarchyPanel (navegação)
SelectionStore (navegação de histórico)


Estados de Viewport (Viewport Domain)
DADO
OWNER
MODIFICA
CONSOME
zoom: number
viewport.store.ts
SceneView (wheel), Toolbar (botões)
SceneView (renderização de câmera), ViewportStore (persistência)
panX: number
viewport.store.ts
SceneView (drag pan), Toolbar
SceneView (câmera), ViewportStore
panY: number
viewport.store.ts
SceneView (drag pan), Toolbar
SceneView (câmera), ViewportStore
showGrid: boolean
viewport.store.ts
SceneView (toggle), Toolbar
SceneView (desenho de grid), ViewportStore
gridSize: number
viewport.store.ts
SceneView (input), Toolbar
SceneView (desenho de grid), ViewportStore
snapToGrid: boolean
viewport.store.ts
SceneView (toggle), Toolbar
SceneView (snap de drag), ViewportStore
gizmosEnabled: boolean
viewport.store.ts
SceneView (toggle), Toolbar
SceneView (desenho de gizmos), ViewportStore


Estados da Engine (Engine Domain)
DADO
OWNER
MODIFICA
CONSOME
engine: Engine | null
engine.store.ts (set by EngineProvider.tsx)
EngineProvider (inicialização), App (desmontagem)
Todos os painéis do editor (SceneView, Hierarchy, Inspector, AssetBrowser, etc.)
updateLogic: boolean
Engine (interno)
EditorToolbar (play/stop), GameLoop
Engine (sistemas de gameplay), EditorToolbar (estado visual)
isRunning: boolean
Engine (interno)
EngineProvider (start), Engine.stop()
EngineProvider, GameLoop


Estados de Projeto (Project Domain)
DADO
OWNER
MODIFICA
CONSOME
projectName: string
project.store.ts
Dashboard (criação/abertura), EditorToolbar
App (modo), EngineProvider (bootstrap), EditorToolbar (título)
projectId: string | null
project.store.ts
Dashboard
App, ExportSystem
mode: 'dashboard' | 'scene' | ...
project.store.ts
Dashboard, EditorToolbar (back), App
App (routing)


Estados de Workspace (Workspace Domain)
DADO
OWNER
MODIFICA
CONSOME
activeWorkspace: WorkspacePreset
workspace.store.ts
EditorToolbar (seletor)
EditorToolbar (seletor), CenterWorkspace (tabs iniciais)
mainTab: MainTabType
workspace.store.ts
CenterWorkspace (clique em aba), EditorToolbar (presets)
CenterWorkspace (conteúdo ativo)
bottomTab: BottomTabType
workspace.store.ts
BottomDrawer (clique em aba), EditorToolbar
BottomDrawer (conteúdo ativo)
leftTab: LeftTabType
workspace.store.ts
LeftSidebar (clique em aba)
LeftSidebar (conteúdo ativo)
leftOpen / rightOpen / bottomOpen: boolean
workspace.store.ts
EditorToolbar (toggle botões), painéis
EditorLayout (layout), painéis
leftPanelWidth / rightPanelWidth / bottomPanelHeight: number
workspace.store.ts
Resizers de painel
EditorLayout (dimensões)


Estados do Editor (Editor Domain)
DADO
OWNER
MODIFICA
CONSOME
activePanels: Record<EditorPanel, boolean>
editor.store.ts
EditorLayout (toggle)
EditorLayout (visibilidade de painéis)
activeTheme: EditorTheme
editor.store.ts
EditorLayout (toggle tema)
App, EditorLayout (classes CSS)
entityNames: Record<number, string>
editor.store.ts
HierarchyPanel (renomear), InspectorPanel (renomear)
HierarchyPanel (exibição), InspectorPanel (exibição)
editorUpdateToken: number
editor.store.ts
Commands (undo/redo), componentes (mutação)
DEPRECATED — substituído por reatividade direta dos stores


Estados de Assets (Asset Domain)
DADO
OWNER
MODIFICA
CONSOME
assetRegistry: Map<guid, AssetMetadata>
AssetRegistry.ts (instância global)
AssetDatabase (registro), AssetImporter (importação)
AssetDatabase (carregamento), AssetBrowser (exibição), Inspector (asset picker)
canonicalNameMap: Map<canonicalName, guid>
AssetRegistry.ts
AssetDatabase (registro com canonicalName)
AssetDatabase (resolução), Engine.getAsset()
assetCache: Map<guid, loadedData>
AssetCache.ts
AssetDatabase (loadAsset)
AssetDatabase (getAssetData), RenderSystem (renderização)


Estados de Cena (Scene Domain)
DADO
OWNER
MODIFICA
CONSOME
entities: Set<number>
World.ts (ECS)
EntityManager (criar/destruir), CommandManager (undo/redo)
HierarchyPanel (árvore), SceneView (renderização), QueryManager (queries)
components: Map<entityId, Map<compType, data>>
World.ts (ECS)
ComponentManager (add/remove/modify), CommandManager
InspectorPanel (edição), Systems (leitura), SceneView (seleção)


Regras de Governança
Propriedade Única: Cada estado tem exatamente um OWNER. Nenhum outro módulo pode modificar diretamente.
Ações como Interface: Modificações devem ocorrer apenas através de métodos de ação do OWNER.
Observação Reativa: CONSUMIDORES leem via Zustand selectors ou EventBus. Nunca acessam estado interno diretamente.
Sem forceUpdate: O editorUpdateToken foi substituído por reatividade nativa dos stores. Nenhum componente deve chamar forceUpdate().
Engine Desacoplada: A Engine é um serviço singleton inicializado pelo EngineProvider. React apenas observa. A Engine não é criada/destruída por nenhum componente do editor.

Métrica de Acoplamento Arquitetural
Fase
Score
Notas
Pré-Alpha 1.1
4/10
Engine criada no SceneView. Seleção no editor.store. Viewport no SceneView (local state).
Pós-Marco 2 (SelectionStore)
5/10
Seleção desacoplada do editor.store.
Pós-Marco 3 (ViewportStore)
6/10
Viewport desacoplado do SceneView.
Pós-Marco 4 (EngineProvider)
8/10
Engine desacoplada do React DOM. Fechar qualquer editor não afeta o sistema.
Pós-Marco 5 (Asset Registry)
8.5/10
Assets acessíveis por CanonicalName. Abstração completa de path físico.


Validated: 2026-06-06

