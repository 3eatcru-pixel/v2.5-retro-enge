# FIXME / AUDIT ROADMAP (v3.0)

Este documento atua como o **Tracker** da dívida técnica, das melhorias arquiteturais e da evolução guiada para tornar o Retro Engine um ecossistema industrial de criação Retro-Moderna.

Abaixo figuram os próximos passos embasados na última auditoria Nível 1.

## [CRÍTICO] (Próximos Passos Arquiteturais)

- [x] Reestruturar projetos de exemplo soltos (ex: `western-fps-2d/`) e movê-los para catalogação em um diretório oficial `examples/`.
- [x] Reformular `editor/event-editor` visando adotar paradigma **Node Graph / Visual Scripting**, vital para atrair criadores.
- [x] Evoluir `editor/layout` para Workstation Profissional (Advanced Docking, Multi-Window, Save/Load Workspace Layout).

## [ALTO] (Engine Core & Pipeline)

- [x] Elevar `core/resources` para atuar como Asset Pipeline definitivo (Importers customizados, Processors, Converters).
- [x] Solidificar o backend de `core/save-system` suportando transições de State (JSON, LocalStorage robusto, IndexedDB e APIs de Cloud Save).
- [x] Preparar `core/renderer` para altíssima performance 2D (WebGPU / WebGL2, API de Shaders, Batch Rendering avançado).
- [x] Limpeza do `core/engine-core/` assegurando escopo restrito (apenas Engine, Runtime, e GameLoop).

## [MÉDIO] (Painéis e Ferramentas)

- [x] Aperfeiçoar `core/audio` com suporte global a Mixers de Áudio (AudioBus), SpatialAudio e cadeias de Efeitos (Effects).
- [x] Melhorar suporte estendido do `core/input` (Rebinding, Input Mapping, suporte total e nativo a Gamepads e API de Ações).
- [x] Renovar `editor/dashboard` implementando listas inteligentes de Projetos Recentes, Templates de início rápido e feed de Assets.
- [x] Integrar unificadamente `core/events` englobando Editor Events, Runtime Events e Global Events.

## [BAIXO] (Conveniência UI/UX)

- [x] Aperfeiçoar fluxo do `ui-editor` para desenhar barras de HUD e Visual Novels interativas por Drag & Drop.
- [x] Expandir persistência do Editor (Hot-Reloading e Workspace Memory Cache).

---

## 🔬 [NÍVEL 2] Dívida Técnica Crítica (Descoberta pela Auditoria Profunda)

- [x] **SceneView Drag (🔴 URGENTE)**: `SceneView.tsx` usa `forceUpdate` por frame. Mutação transferida para dentro do runtime e atrelada via `ModifyComponentCommand` no Drag End para otimizar 60 FPS.
- [x] **QueryManager (🔴 URGENTE)**: Hoje faz reconsulta iterativa a cada `getEntitiesWith()`. Precisa de Refactor: Indexação via cache map e event hooks nos Managers de Componentes (Add/Remove) para re-indexação parcial (Incremental Update).
- [x] **CanvasRenderer Draw Calls (🟡 AVISO)**: O Renderer carece de batching global. Meta 1: AABB Frustum Culling antes dos batch draws. Meta 2: Layer & Y-sort automático. Meta 3: Fixar flag `imageSmoothingEnabled` universal em `false`.
- [x] **Ciclo Recursivo ECS (🟡 AVISO)**: O `World.ts` na coleta de sub-hierarquias pode prender-se em recursão infinita se um node setar seu grand-parent como parent direto. Injetar Set (visited/cycles tracker).
- [x] **Editor Layout Bloated (🟡 AVISO)**: Extrair store global do Editor. Instanciar `workspace.store.ts` controlando estritamente UI/Dock e manter runtime/gameloop imune.
- [x] **AssetImporter Types & Cache (🟢 RECOMENDADO)**: Converter a inferência de importação cega (`any`) para contratos rígidos de tipo por MIME Type. Implementar Hash tracking para reimport-blocking incremental.
- [x] **Engine Constructor Fat Node (🟢 RECOMENDADO)**: Fazer splitt do Node de root em um `EngineBootstrap`, `SystemPipeline` e configs. Evitar aglomeração de networking/editors no Constructor Root.
- [x] **ECS Identifiers (🟢 RECOMENDADO)**: O `EntityManager.ts` implementa agora Object Pooling para reaproveitar IDs de entidades destruídas, evitando Memory Leak de IDs sequenciais.

---

## ✅ Tarefas Históricas Concluídas

- [x] Remover acoplamento de `src/core/gameplay`.
- [x] Migrar abstrações de game-logic totalmente para arquitetura de plugins (`gameplay-rpg`).
- [x] Desenvolver fundação de Pacotes (`src/packages/`) e `core/plugin-system`.
- [x] Implementar Prefab System avançado.
- [x] Implementação de Dependency Graph no Gerenciador de Recursos.
- [x] Fragmentação do `World` original para sub-managers no ECS (`QueryManager`, `EntityManager`, `SystemManager`).
- [x] Implementar suporte robusto a Eventos e Padrão Command (Transações e Macros).
- [x] Configuração centralizada de Projetos e Metadados.

---

# RETRO ENGINE - CHECKLIST DE POLIMENTO

## Objetivo Principal

Antes de expandir a engine com novas funcionalidades, garantir que todas as ferramentas existentes sejam consistentes, intuitivas, organizadas e funcionais.

---

# Interface Geral

* [ ] Todos os editores possuem o mesmo padrão visual.
* [ ] Layout limpo e organizado.
* [ ] Ícones consistentes em todo o sistema.
* [ ] Espaçamentos padronizados.
* [ ] Menus claros e sem poluição visual.
* [ ] Interface amigável para iniciantes.
* [ ] Interface eficiente para usuários avançados.
* [ ] Nenhuma ferramenta importante escondida.
* [ ] Fluxo de trabalho intuitivo.
* [ ] Redução máxima de cliques desnecessários.

---

# Organização do Projeto

* [ ] Estrutura de projeto clara.
* [ ] Assets organizados automaticamente.
* [ ] Pastas organizadas.
* [ ] Busca rápida em qualquer lugar.
* [ ] Sistema de favoritos.
* [ ] Sistema de recentes.
* [ ] Tags para organização.
* [ ] Navegação rápida entre recursos.

---

# Asset Manager

* [ ] Preview de sprites.
* [ ] Preview de tilesets.
* [ ] Preview de prefabs.
* [ ] Preview de áudio.
* [ ] Informações completas do asset.
* [ ] Renomeação segura.
* [ ] Atualização automática de referências.
* [ ] Visualização de dependências.
* [ ] Localizar assets não utilizados.
* [ ] Importação simples e confiável.

---

# Scene Editor

* [ ] Criação rápida de objetos.
* [ ] Arrastar e soltar funcionando perfeitamente.
* [ ] Seleção simples e intuitiva.
* [ ] Multi seleção.
* [ ] Duplicação rápida.
* [ ] Alinhamento visual correto.
* [ ] Zoom suave.
* [ ] Navegação confortável.
* [ ] Grid funcional.
* [ ] Snap funcional.

---

# Hierarchy

* [ ] Organização clara dos objetos.
* [ ] Drag & Drop funcional.
* [ ] Busca instantânea.
* [ ] Renomeação rápida.
* [ ] Colapsar e expandir grupos.
* [ ] Sem lag em projetos grandes.

---

# Inspector

* [ ] Interface limpa.
* [ ] Componentes bem organizados.
* [ ] Fácil edição de valores.
* [ ] Adicionar componentes rapidamente.
* [ ] Remover componentes facilmente.
* [ ] Feedback visual claro.
* [ ] Campos intuitivos.

---

# Event Editor

* [ ] Fácil de entender.
* [ ] Fácil de navegar.
* [ ] Nós organizados.
* [ ] Conexões claras.
* [ ] Zoom funcional.
* [ ] Arrastar nós sem problemas.
* [ ] Sistema estável.
* [ ] Fluxo visual agradável.

---

# Animation Editor

* [ ] Timeline clara.
* [ ] Preview em tempo real.
* [ ] Fácil criação de animações.
* [ ] Fácil edição.
* [ ] Interface organizada.

---

# Audio Editor

* [ ] Preview rápido.
* [ ] Controle de volume.
* [ ] Organização de sons.
* [ ] Interface simples.

---

# Build System

* [ ] Exportação Web funcionando.
* [ ] Exportação Desktop funcionando.
* [ ] Processo simples.
* [ ] Sem erros inesperados.
* [ ] Build reproduzível.

---

# Performance

* [ ] Editor fluido.
* [ ] Sem travamentos.
* [ ] Sem vazamentos de memória.
* [ ] Projetos grandes continuam responsivos.
* [ ] FPS estável.
* [ ] Sistemas otimizados.

---

# Consistência Entre Editores

* [ ] Todos os editores seguem o mesmo padrão.
* [ ] Mesmo comportamento de botões.
* [ ] Mesmo sistema de atalhos.
* [ ] Mesmo padrão visual.
* [ ] Mesmo padrão de navegação.

---

# Integração Entre Ferramentas

* [ ] Todos os assets aparecem em todos os editores quando necessário.
* [ ] Alterações refletem automaticamente em todo o projeto.
* [ ] Prefabs atualizam corretamente.
* [ ] Animações atualizam corretamente.
* [ ] Referências permanecem válidas.

---

# Fluxo Completo de Desenvolvimento

## Teste Principal

Criar um jogo do zero usando apenas a engine.

* [ ] Criar projeto.
* [ ] Importar assets.
* [ ] Criar cena.
* [ ] Criar personagem.
* [ ] Criar animações.
* [ ] Configurar eventos.
* [ ] Adicionar áudio.
* [ ] Salvar projeto.
* [ ] Reabrir projeto.
* [ ] Gerar build.
* [ ] Executar build.

Resultado esperado:

O jogo deve funcionar sem necessidade de correções manuais.

---

# Meta Final

A engine deve transmitir a sensação de:

"Está tudo no lugar certo."

O usuário deve conseguir criar um jogo completo sem procurar ferramentas escondidas, sem ficar perdido e sem precisar lutar contra a interface.

Essa checklist é exatamente o tipo de documento que equipes de produtos usam na fase de transição entre **"engine funcional"** e **"produto profissional"**.
