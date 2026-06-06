# Retro Engine

A modern, web-based Retro 2D Game Engine built with React, TypeScript, and Canvas2D API. The architecture is designed to enforce performance and clean separation of concerns using an Entity-Component-System (ECS), decoupled rendering, and an extensible Editor interface.

## 🏗 Architecture Overview

The system strictly divides structural domains to maintain the Retro Modern philosophy (high performance, modularity, strict bounds):

### 1. `src/core/` (Engine Runtime)
The beating heart of the platform. Designed to run completely independent of the React Editor UI.
* **`engine-core/`**: Initialization, update loop (`GameLoop`), and the **Service Container** (Dependency Injection).
* **`ecs/`**: The core Entity-Component-System framework.
  * **Managers**: `EntityManager`, `ComponentManager`, `SystemManager`, and `QueryManager`.
  * **Components**: Just data (`Transform`, `Sprite`, `Velocity`, `Collider`, `Tilemap`, `Animator`).
  * **Systems**: Pure logic arrays processed every frame (`RenderSystem`, `PhysicsSystem`, `MovementSystem`, `AnimationSystem`).
* **`command-system/`**: Implements the Command Pattern and History (Undo/Redo via `CommandManager`).
* **`project-system/`**: Manages current project state (`ProjectManager`), metadata, and configuration.
* **`renderer/`**: Handles the Canvas2D context. Abstracts draw calls (batching, scaling).
* **`audio/`**: AudioContext management wrapper for BGM and SFX decoding and playback.
* **`resources/`**: Asset Database handling asynchronous resource loading, `AssetCache`, `DependencyGraph`, and `PrefabManager`.
* **`plugin-system/`**: Extensible modules and `PackageManager` for the core loop.

### 2. `src/plugins/` (Gameplay & Logic)
* **`gameplay-rpg/`**: Specialized high-level structures logic templates (`inventory`, `shops`, `quests`, `stats`, `dialogue`). Migrated out of core to ensure the engine remains agnostic to game genre.

### 3. `src/editor/` (Development GUI)
The React-based workspace. Allows visual manipulation of the `core/` state without polluting it.
* **`layout/`**: Desktop-like windowing and panel organization.
* **`hierarchy/`**: Tree visualization of all instantiated ECS Entities.
* **`inspector/`**: Mutates Component data via `CommandManager` for Undo/Redo support.
* **`scene-editor/` & `scene-view/`**: Primary visual canvas rendering the Engine's current state.
* **Specialized Editors**: Standalone panels for particular domains (`asset-browser`, `audio-editor`, `tilemap-editor`).

### 4. `src/state/` (Editor State Management)
Uses separated Zustand stores (`editor.store.ts`, `engine.store.ts`, `project.store.ts`, `asset.store.ts`, `scene.store.ts`) to avoid monolithic state objects. Safely syncs Engine mutations to the IDE.

### 5. `src/platform/` (Deployment Adapters)
Handles deployment specifics and I/O (`web`, `desktop`).

### 6. Templates & Exemplos
Projetos de exemplo atualmente ficam na raiz (como o `western-fps-2d/`), porém devem evoluir em breve para um repositório centralizado `examples/` que abrigará bases pré-configuradas (Platformer, Visual Novel, RPG, etc).

## 🏆 Forças Arquiteturais e Maturidade
Através de rigorosa auditoria e design Retro Moderno, o formato técnico da plataforma evidencia altíssima maturidade nos seguintes pilares:
1. **Core ECS (`src/core/ecs`)**: Isolado, 100% puro TS, operando com managers independentes para Entidades, Componentes, Sistemas e Queries com alta performance.
2. **Sistema de Comandos (`src/core/command-system`)**: Arquitetura padrão-ouro (Design Pattern) viabilizando Undo/Redo, Transactions e Macros interconectados com o Editor.
3. **Plataforma de Plugins e Pacotes (`core/plugin-system` e `src/packages/`)**: Garantem a abstenção de lógica hard-coded para jogos (como RPG ou FPS) no núcleo da engine, delegando isso a Extensões.

---

# 🚀 RETRO ENGINE: MANIFESTO & ROADMAP OFICIAL

A **Retro Engine** consolidou sua identidade própria como um ambiente de desenvolvimento 2D unificado, projetado especificamente para a estética clássica combinada com a conveniência do desenvolvimento moderno. Ela não é apenas um experimento arquitetural; é uma solução completa para criadores independentes publicarem jogos retrô de forma instantânea.

## ✨ Pilares de Diferenciação
A Retro Engine apoia-se em seis diferenciais fundamentais que a distinguem de engines tradicionais:
* 👾 **Pixel Art First**: Todo o pipeline de renderização no canvas foi desenhado para garantir o alinhamento de pixel perfeito, redimensionamento sem blur de interpolação e fidelidade subpixel.
* 🎹 **Chiptune Nativo**: O áudio procedural via `playTone()` e sintetização em tempo real na Web Audio API dispensa a dependência de megabytes de arquivos de áudio pesados, permitindo trilhas e sonorização de baixo acoplamento físico.
* 📦 **Asset Vault Integrado**: Integração nativa com pacotes de assets pré-configurados estruturados através de GUIDs no banco de dados da engine, acelerando o desenvolvimento.
* ⚡ **De-coupled ECS Simplificado**: Uma arquitetura orientada a dados livre de lixo de estado que separa completamente a lógica de gameplay da renderização gráfica e do layout do Editor em React.
* 📦 **Build HTML/ZIP Instantâneo**: Exportação física de pacotes otimizados autossuficientes e standalone rodando fora do editor em um único clique.
* 🤖 **IA Assistente & Copiloto**: Integração profunda para permitir que modelos inteligentes gerem, adaptem, ajustem balanço e insiram comportamentos na engine em tempo real.

## 🎯 Objetivo de Produto
> **"Permitir que criadores independentes desenvolvam e publiquem jogos retrô completos sem precisar construir infraestrutura técnica complexa do zero."**

---

## 🗺️ Roadmap de Desenvolvimento do Produto

### 🛡️ Alpha 1.1 — Fundação Profissional & Escalabilidade
O foco desta fase é dar robustez técnica extrema, removendo os limites típicos de protótipos em navegadores web.
* [ ] **Migração para IndexedDB**: Substituir o `localStorage` (limite aproximado de 5MB) por persistência baseada em IndexedDB pura, permitindo múltiplos projetos gigantes, cache de assets e mapas de escala profissional.
* [ ] **Performance Profiler**: Painel visual no editor detalhando FPS, Frame Time, Physics Time, Audio Latency, contagem de Entidades ativas, chamadas de renderização (Draw Calls) e consumo de memória.
* [ ] **Asset Vault centralizado**: Um centro integrado para importar instantaneamente pacotes de assets prontos (ex: Superpowers Asset Packs), resolvendo dependências de imagem e áudio sob demanda.
* [ ] **Backup Automático & Crash Reporter**: Salvamento automático cíclico e restauração instantânea do estado do sandbox em caso de falhas críticas de compilação ou loop.

### 🎮 Alpha 1.2 — Criador de Jogos Sem Código ({ No-Code / Visual-First })
Empoderamento do criador de conteúdo através de editores de alto nível abstrato integrados ao ECS.
* [ ] **Visual Event Editor**: Criação estruturada de triggers de colisão, spawn de entidades, contagem de chaves e transição de cenas sem escrever código.
* [ ] **Dialogue and Cutscene Editor**: Sistema integrado de linhas ramificadas de conversação, exibição de avatares com controle direto do motor textual.
* [ ] **Quest & Inventory System**: Formulário visual direto no Inspector para associar moedas de troca, missões ativas e condições dinâmicas de progresso.
* [ ] **Save Game System Generativo**: Serialização automática de todo o estado do ECS (posições de entidades, valores globais e progresso do jogador) para arquivos compactos exportáveis ou do IndexedDB.

### 🚀 Beta 1.0 — Experiência Imersiva Exclusiva
Consolidação do ecossistema único de ferramentas exclusivas Retro Engine.
* [ ] **Chiptune Studio Completo**: Um tracker nativo para compor melodias de múltiplos canais (Square, Triangle, Sawtooth, Noise) dentro do próprio editor de áudio procedural.
* [ ] **Pixel FX Editor**: Editor de partículas retrô e shaders de tela (CRT Filter, Scanlines, Glitch effects, Bloom neon) aplicáveis em tempo real sob o canvas principal.
* [ ] **Copiloto IA no Workspace**: Painel dinâmico da IA que reage a comandos em linguagem natural para injetar prefabs na cena, balancear dificuldades ou sugerir diálogos para NPCs.
* [ ] **Template Marketplace**: Hub interativo de novos projetos contendo modelos prontos com física e assets configurados no nascimento do projeto.

---

## 🧪 Estratégia de Validação Multigênero (Garantia de Qualidade)
Para validar de ponta a ponta a maturidade do motor a cada alteração, a engine deve ser exaustivamente testada em três pilares distintos de gameplay:
1. **Teste A — Space Shooter**: Valida o desempenho com múltiplos projéteis em tela (Bullet Hell), scroll de cenário parallax contínuo e colisões rápidas.
2. **Teste B — Top Down RPG**: Valida fluxo de NPC, diálogos complexos de narrativa, persistência de inventários e progressão de missões.
3. **Teste C — Puzzle Platformer**: Valida os sistemas físicos gravitacionais avançados, colisões precisas com plataformas móveis, checkpoints e triggers de eventos de cenário.

---

## 🚀 Key Patterns & Rules
1. **No React in the Engine**: The `core/` must never import from `react`. It operates entirely on `requestAnimationFrame` and raw arrays.
2. **Data-Oriented ECS**: Behaviors should be implemented as pure data Components and iterative Systems.
3. **Editor is a Consumer**: The Editor UI commands the Engine via the Command System. If the Editor unmounts, the Engine still runs.