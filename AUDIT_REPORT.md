# Diagnostic Audit & Workspace Layout Plan
**Target Application:** Retro Engine IDE (React + ECS Native Engine)
**Author:** AI Coding Assistant
**Date:** June 2026

---

## 🧭 Executive Summary
This document provides a highly detailed audit of the **Retro Engine** architecture. The existing core is incredibly robust, featuring a pure Vanilla-TS-implemented **Entity-Component-System (ECS)** engine decoupled from the React interface, an automated **Plugin System**, and pre-routed modular managers inside `src/core`.

However, the **Editor GUI** (`src/editor`) currently consists of isolated full-screen panels with a static layout toggled by a simple header menu. This design prevents rapid context switching, restricts multi-monitor workflows, and causes state reinstantiations when changing modes. 

Below is the diagnosis, architectural blueprint, and step-by-step refactoring plan to transform the browser IDE into a professional, high-performance, dockable, and plugin-driven environment styled after **FL Studio, Ableton Live, and MPC Software**.

---

## 1. 🏗 Current Project Structure
The current structure splits concerns cleanly into engine execution and visual authoring:

```text
src/
├── core/                       # Core Game Engine Runtime (Pure TS, Zero React)
│   ├── engine-core/            # Main initialization and high-frequency gameloop (Engine, GameLoop)
│   ├── ecs/                    # Entity-Component-System framework and components/systems
│   │   ├── components/         # Mutable data packets (Transform, Sprite, Velocity, Collider, Animator, etc.)
│   │   ├── systems/            # Stateless calculations of state per frame (RenderSystem, PhysicsSystem, etc.)
│   │   ├── World.ts            # Registry representing components, entities, and managers
│   │   └── System.ts           # Core abstract system specifications
│   ├── renderer/               # Canvas2D scaling, draw routines, and coordinates management
│   ├── input/                  # Track pointers, keyboard states, and key bindings
│   ├── audio/                  # Audio Context and BGM/SFX asset decoders
│   ├── save-system/            # Snapshot serialization and state restoring
│   ├── plugin-system/          # Core runtime plugins register (PluginSystem)
│   ├── resources/              # Preloader and asset loader
│   └── gameplay/               # Standard patterns (Dialogue, Inventory, Stats, Quests)
├── editor/                     # React Workspace GUI & Editor Views
│   ├── dashboard/              # Workspace manager and greeting dashboard
│   ├── layout/                 # Static container layout (EditorLayout.tsx)
│   ├── hierarchy/              # Linear scene tree representing active entities
│   ├── inspector/              # Reactive mutation panel targeting components of selected entities
│   ├── scene-editor/           # Active engine Canvas rendering and dragging interaction
│   ├── asset-browser/          # Assets explorer, drag-container, and previewer
│   └── (Specialized Editors)/  # Isolated fullscreen editors: Animation, Audio, UI, Tilemap, Events
├── state/                      # Global Editor authoring bridge (Zustand: retro.store.ts)
└── platform/                   # Shell adapters for desktop wrappers (WebAdapter, DesktopAdapter)
```

---

## 2. 🔁 Current User Flow
When a user works inside the IDE today:
1. **Launch**: Interactive Dashboard where projects are loaded and named.
2. **Main Workspace**: Selects a project and spawns `EditorLayout` in `scene` mode.
   - On the left: `HierarchyPanel` list of entity IDs.
   - Center-top: High-fidelity interactive viewport (`SceneView` with 640x360 canvas) with integrated pointer capture drag indicators.
   - Center-bottom: `AssetBrowser` directory files viewport.
   - On the right: `InspectorPanel` with editable numeric values updating `Transform` and `Sprite` fields directly.
3. **Modal Editing**: To edit animations, tiles, audio, UI, or event blocks, the user clicks buttons in the Top Toolbar.
   - **Crucial Limitation**: Clicking a custom tool (e.g. `tilemap`) completely unmounts the center workspace (`SceneView`, `Hierarchy`, `Inspector`) and replaces it with the full-screen specialized editor. 
   - This destroys spatial context, prevents active reference, and forces state synchronizations.

---

## 3. 🔍 Architectural Issues, Gaps & Redundancies

### 3.1 Overlapping & Redundant Authoring
* **Editor Instances vs. Active Engine Run**: The isolated specialised editor panels (e.g., `TilemapEditor`, `AnimationEditor`, `AudioEditor`) manage their own separate mock grids or lists instead of operating on engine entities and assets in a consolidated workspace.
* **Component-Level Coupling**: `SceneView` directly recreates a raw `new Engine()` on component mount and destroys it on unmount. If the user toggles modes, the running simulation is destroyed and fully initialized from scratch, leaking resources and losing current variables.

### 3.2 Unused Parts & Dead Code
* **Unused Import Formats & Mock Slices**: There are pre-created routes and folders inside `gameplay/` (such as `loot`, `shops`, `quests`, `dialogue`) that define types but contain zero integration with the active ECS systems.
* **Zustand State Re-rendering Overlap**: Changing inspector input fields forces complete React layout re-renders through `forceUpdate()` calls instead of binding mutations through local component state and writing behind-the-scenes block modifications.

### 3.3 Performance Bottlenecks
* **Pointer Events Frame Traps**: Coordinates conversion occurs dynamically on standard click handlers without using simple mouse coordinate pooling. Heavy canvas bounds checks on standard loops can freeze the frame rate during click drag.
* **No Cache or Pipeline Pooling**: When rendering animators, subroutines rebuild image frame limits instead of utilizing references defined during compilation.

---

## 4. 🧭 Core Layout Strategy (FL Studio & Ableton-Inspired)
To elevate this workspace into a functional workstation, we should adopt a **Single-Window multi-dock layout** backed by a **Workspace Manager**:

### 4.1 Visual Design Guidelines
* **Aesthetic Pairing**: Deep Space Slate slate-colored layouts (`#0a0a0c`, `#121214`) using "Inter" for readable controls and "JetBrains Mono" for debug data.
* **Layout Organization**: No full-screen overrides. The running canvas is always visible or dockable, allowing users to paint tiles immediately on the viewport while looking at the asset tree.
* **Dock Layout Layout Engine**:
```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Toolbar: Project File, Save, Play, FPS Counter, Workspace Select [Game | Design]     │
├──────────────────────────────────────┬─────────────────────────────────────────────────┤
│                                      │ (CENTER - WORKSPACE DOCK DYNAMIC)               │
│ (LEFT SIDEBAR DOCK)                  │ ┌─────────────────────────────────────────────┐ │
│ ┌──────────────────────────────────┐ │ │  Active Viewport: Scene View [2D Canvas]    │ │
│ │  Hierarchy Tree                  │ │ ├─────────────────────────────────────────────┤ │
│ ├──────────────────────────────────┤ │ │  Specialized Plugin Tabs:                   │ │
│ │                              │ │ │  [Tilemap Paint] [Timeline] [Event Visuals] │ │
│ │  Asset Browser (Folder)          │ │ └─────────────────────────────────────────────┘ │
│ └──────────────────────────────────┘ ├─────────────────────────────────────────────────┤
│                                      │ (RIGHT SIDEBAR DOCK)                            │
│ (BOTTOM DRAWER DOCK)                 │ ┌─────────────────────────────────────────────┐ │
│ ┌──────────────────────────────────┐ │ │  Inspector Panel (Properties & Variables)   │ │
│ │  Audio Console / Sound Mixer     │ │ ├─────────────────────────────────────────────┤ │
│ │  Log Console / Profiler / Hooks  │ │ │  Selected Component Details                 │ │
│ └──────────────────────────────────┘ │ └─────────────────────────────────────────────┘ │
└──────────────────────────────────────┴─────────────────────────────────────────────────┘
```

---

## 5. 🔌 Modular Panel Reclassification (Docking vs independent)

### 5.1 Dockable Panels (Integral Components)
These form the base visual structure of the IDE. They are always active in memory but can be collapsed/expanded via shortcuts:
* **`HierarchyPanel`**: Left sidebar layout.
* **`SceneView`**: Stays in the main viewport canvas.
* **`InspectorPanel`**: Right sidebar layout.
* **`AssetBrowser`**: Bottom drawer layout.

### 5.2 Plugin Modules (Floating & Contextual Panels)
These panels load as interactive tabs or secondary widgets inside the central viewport or bottom drawer instead of overriding the view:
* **`TilemapPanel` (Formerly TilemapEditor)**: Snaps as an overlay tab in the main editor. Allows active brush selection while clicking on the center `SceneView`.
* **`AnimationTimeline` (Formerly AnimationEditor)**: Bottom dock next to asset manager to map keyframes.
* **`EventSequencer` (Formerly EventEditor)**: Node system popping in place of the Center Scene when editing level scripts.
* **`AudioMixer` (Formerly AudioEditor)**: Master sequencer visualizer sliding out of the bottom drawer.
* **`UiLayoutDesigner` (Formerly UiEditor)**: Dynamic visual bounds editor overlaying the standard Canvas viewport.

### 5.3 Independent Floating Windows
For multimonitor setups, certain screens open inside lightweight overlay cards that can be popped out using standard browser context:
* **Audio Editor / Synthesizer**: To adjust filters and sound curves.
* **Project Settings**: Advanced input mapping.
* **Log Console & Profiler**: To debug system metrics in real-time.

---

## 6. 🛠 Strategic Refactoring Roadmap (ETAPAS)

### 📍 Etapa 1: Workspace State & Dock Structure Initialization
* **Zustand Extension**: Update `/src/state/retro.store.ts` to support layout configurations, panel sizes, coordinates, list of active plugins, and selected tool tabs.
* **Engine Core Persistency**: Decouple the standard engine execution. Instead of recreating the loop inside `SceneView.tsx` on mount, initialize the core engine container globally, keeping it running silently behind the scenes during mode changes.

### 📍 Etapa 2: Create Docking Frame & Flex-panel Layout Container
* **Refining Layout**: Replace `EditorLayout.tsx` with a flexible, modular layout containing responsive grid splitters. 
* Add collapsible toggles for the left panel, right panel, and bottom tray.

### 📍 Etapa 3: Transform Modals & Full-screen editors into Active Tabs
* **Refactoring specialized editors**: Rewrite panels (`TilemapEditor`, `AnimationEditor`, `AudioEditor`) to consume the active context of the global running engine instead of operating on mock components.
* Integrate these panels into the central view as dockable tabs.

### 📍 Etapa 4: Bridge ECS with Plugin Systems
* Register Editors as standard structural runtime entities using the `PluginSystem`.
* Integrate customized drawing adapters for Tilemap brushes directly on the main canvas workspace.

---

## 7. 📖 Folder Logic and Architectural Mapping

### Core System Blueprint

1. **ECS Engine Loop (`src/core/engine-core`)**:
   - `GameLoop.ts` handles the high-performance logic updates (`60 FPS`) and delta calculation.
   - `Engine.ts` maintains instance configurations and controls execution flow.

2. **Decoupled Renderer (`src/core/renderer`)**:
   - Canvas-based visual rendering system mapping coordinate transforms (`Camera.ts`) without storing local layout flags.

3. **Global Authoring Sync (`src/state/retro.store.ts`)**:
   - Operates as the state coordinator. Handles window positions, tabs, panel state flags, selection, and active loaded files.

---

This document represents the absolute architectural blueprint for the Retro Engine IDE overhaul. No code execution holds priority over fixing structure first!

---

## 8. 🔬 Nível 2: Auditoria Profunda (Deep Audit)

Após a análise estrutural preliminar, conduzimos uma imersão profunda (File-level) nos 4 pilares centrais da Retro Engine (`core/ecs`, `core/plugin-system`, `core/renderer`, e `editor/scene-editor`). 

### 8.1. `core/ecs` (O Cérebro)
* **Avaliação**: 🟢 Excelente (Pronto para Produção).
* **Análise**: A arquitetura ECS utiliza **SoA (Structure of Arrays)** através do `ComponentManager.ts` (armazenando componentes em Maps por tipo, não por entidade). O processo de query em `getEntitiesWith()` é otimizado para iterar primeiramente sobre o menor conjunto de entidades disponível, reduzindo complexidade assintótica (O(N) inteligente). O gerenciamento de memória durante a destruição de nós (`World.ts` destruction queues) evita loops infinitos.
* **Ação Corretiva Recomendada**: O ECS não precisa de reescrita, entretanto, implementar Object Pooling em `EntityManager.ts` para IDs reciclados pode poupar escalonamento infinito de IDs em sessões muito longas.

### 8.2. `core/plugin-system` (O Ecossistema)
* **Avaliação**: 🟢 Excepcional (Padrão Enterprise).
* **Análise**: O arquivo `PluginSystem.ts` utiliza instâncias de `Proxy` nativas do JavaScript/TypeScript para construir Sandboxes de segurança brilhantemente implementadas. Mutação no World, emissores de eventos e acesso ao input são retidos via `PluginPermissions`. Isso significa que pacotes da comunidade (Marketplace) **não** conseguirão comprometer as permissões ou vazar memória de componentes não autorizados.
* **Ação Corretiva Recomendada**: O PluginSystem bloqueia falhas na inicialização (`try-catch` robusto), mas seria valioso expor métricas verbosas de "Tempo de Execução" (Profiler) de cada Sandbox no GameLoop para evitar plugins que derrubam o FPS.

### 8.3. `core/renderer` (O Desenho)
* **Avaliação**: 🟡 Potencial Restrito (Requer Evolução).
* **Análise**: O `CanvasRenderer.ts` é minimalista, utilizando a API Canvas2D pura (com `alpha: false` limitando overhead). Possui controle matricial manual para Camera (zoom, translação) via `ctx.translate/scale`, o que é rápido para cenas básicas, porém o modelo atual **não faz Batching**. Se o usuário criar 1000 tiles na tela, teremos 1000 chamadas isoladas a `drawImage`, o que colapsará a performance por limitação de Draw Calls.
* **Ação Corretiva Recomendada**: Mudar futuramente para uma abordagem WebGL2 / WebGPU mantendo a mesma API/Interface atual (`IRenderer`). Adicionar Texture Atlasing automático e Sprite Batching para agrupar as primitivas de renderização num pipeline performático.

### 8.4. `editor/scene-editor` (O Ponto Cego)
* **Avaliação**: 🔴 Alerta Vermelho (Prioridade Máxima).
* **Análise**: Em `SceneView.tsx`, a engine inteira é acoplada e destruída repetidamente atrelada ao ciclo de vida do componente React. O mais alarmante: o `PointerMove` executa **mutação direta** (`transform.x += dx`) e injeta um `forceUpdate()` forçado do React *por frame* durante arrastes de Viewport.
  * **Problema 1:** Essa mutação de frame destrói a arquitetura do `CommandManager`. O usuário executa um Drag temporal e nenhum `ModifyComponentCommand` é gravado no Histórico. O comando "Undo" perderá o estado final do arrasto.
  * **Problema 2:** A Render Tree do React é notificada e recalculada 60 vezes por segundo para sincronizar painéis passivos do Inspector. Um gargalo impensável.
* **Ação Corretiva Recomendada**: Desacoplar TOTALMENTE a Engine e seus loops do ciclo de vida React. Evite Force updates por frame. Mudanças na Viewport nativa devem empacotar transações num `TransactionCommand` via EventBus. Atualizações na UI reativa são delegadas à eventos isolados e limpos.
