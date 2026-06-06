# ARCHITECTURE AUDIT & KIT INTEGRATION PLAN
**Architect:** Retro Engine Lead Architect
**Date:** June 2026

## 1. COMPREENSÃO DA ESTRUTURA ATUAL (Ler toda a estrutura)
A Retro Engine já possui uma arquitetura 2D profissional muito bem definida em React + Tailwind + Zustand para a UI (Editor), e TypeScript puro para o seu runtime (Core Engine).
O código está segregado em três eixos principais:
* `src/core/`: Runtime modular com ECS (Entity-Component-System), Plugins, Asset Database, Renderer e Subsistemas (Input, Physics, Audio, e agora Prefabs).
* `src/editor/`: Ferramentas visuais (Dashboard, Scene Editor, Tilemap Editor, Hierarchy, Inspector, etc).
* `src/state/`: Controle de estado global focado no Editor (Zustand).

## 2. MAPEAMENTO DE MÓDULOS
* **Core Engine:** Base de loop (GameLoop) e gerenciamentos através do Container de Serviços (`ServiceContainer`).
* **Editor/UI:** Disposição visual da engine. Utiliza layouts parecidos com Ableton/FL Studio com barras encaixáveis.
* **Kits:** Módulos que acabamos de receber em `/kitcompleto/`. Atualmente arquivos crus que precisam ser migrados para dentro de `AssetDatabase` via `refactor_assets`.

## 3. MAPEAMENTO ENGINES
* Canvas2DRenderer é o renderer padrão (`CanvasRenderer`), com câmera dinâmica e interpolação a caminho. Não utiliza framework terceiro.
* Physics engine baseada em box-collider 2d simple com verificação de interseção contínua nos loops ECS.

## 4. MAPEAMENTO DE SISTEMAS (ECS)
Atualmente implementados:
* `TransformSystem`
* `MovementSystem`
* `PhysicsSystem`
* `RenderSystem` (renderiza o que está na tela)
* `AnimationSystem`
* `PlayerSystem`
* `CameraSystem`

## 5. MAPEAMENTO DE STORES
Existem 5 stores responsáveis por manter o painel de edição sincronizado com a engine sem causar render loops pesados:
* `project.store.ts` (Modo, nome do prjeto)
* `scene.store.ts` (Hierarquia estrutural das cenas visuais)
* `editor.store.ts` (Qual painel está aberto, posições)
* `asset.store.ts` (Metadados espelhados para exibição no File Browser/Asset browser do React - bridge com `AssetDatabase.ts`)
* `engine.store.ts` (Instância em memória singleton da engine TypeScript crua)

## 6. MAPEAMENTO DE COMPONENTES (ECS)
* `Transform`, `Velocity`, `Sprite`, `Collider`, `Animator`, `Camera`, `PlayerController`, `Tilemap`, `Hierarchy`. Todos puros PODO (Plain Old Data Objects).

## 7. MAPEAMENTO FERRAMENTAS DO EDITOR
* Painéis modulares ativáveis: Dashboard, Inspector, Hierarchy, Tilemap, Animation, Audio, UI Designer. Estes estão em estado dockable de acordo com a refatoração v2.2.

## 8. FLUXO DE ASSETS & RESOURCE MANAGEMENT
O Fluxo será o principal alvo para esta integração dos Kits de Arte:
**Fluxo de Import Pipeline Planejado:**
`Diretório Físico /kitcompleto` -> `Vite Public Dir (/public)` -> `Gerador de Manifest JSON` -> `AssetDatabase carrega os GUIDs` -> `Asset Caching Memory` -> `Disponível no Asset Browser`.
Todo asset carregado via HTTP Request é adicionado ao `AssetCache`.

## 9. FLUXO DE BUILD
`vite build` + `tsc` cria um SPA nativo para Web que roda o front-end Node. Mais adiante serão inseridos `Build Profiles` para export mobile e web.

## 10. DEPENDÊNCIAS
O projeto tem dependências cruas no browser para mantê-lo agnóstico: `react`, `react-dom`, `lucide-react`, `zustand`. (Nenhuma Engine terceira como Phaser).

---

# PLANO DE AÇÃO: INTEGRAÇÃO DO 'KIT COMPLETO'
Atualmente recebemos 6 estruturas em `/kitcompleto`:
1. `ninja-adventure.zip` (RPG Top Down moderno)
2. `rpg-battle-system.zip` (Turn-Based RPG)
3. `space-shooter.zip` (Space Defender Shmup)
4. `top-down-shooter/` (Assets Descompactados de Tiro/Zombie/Western)
5. `western-fps-2d/` (Pode se cruzar com o top-down-shooter)
6. `backgrounds/` (Fundos parallax e tiles de nuvem/céu).

## Passos para Implementação Segura

1. ~~**Descompactação Otimizada (Extraction):** Extrair via script Node.js automatizado `space-shooter.zip`, `rpg-battle-system.zip` e `ninja-adventure.zip` para mapearmos todas as instâncias em uma pasta estática no projeto, como `/public/assets/`.~~ (CONCLUÍDO)
2. ~~**Setup do Asset Manifest (Indexing):** A IA criará uma rotina TypeScript (por exemplo `generate_manifest.js`) que lê recursivamente todos os diretórios descompactados nestes 6 kits, e criará um `assets-manifest.json` com identificadores únicos (GUIDs) e tags baseadas no nome do diretório.~~ (CONCLUÍDO)
3. ~~**Asset Database Adapter (Runtime Loading):** O `AssetDatabase` será inicializado para preencher as instâncias baseadas no manifest criado.~~ (CONCLUÍDO)
4. ~~**Criação de Prefabs Iniciais (Prefab System Test):** Para demonstrar a integração, criaremos um `Prefab` em código que instancia: Um Ninja de teste e uma Nave do Space Shooter, para validar tanto as animações, como as imagens.~~ (CONCLUÍDO)

## Próximos Passos Extras de Arquitetura:
5. ~~**Tilemap Editor & Data:** O pacote Tilemap / RPG vai necessitar da configuração de `Tilesets` dinâmicos.~~ (CONCLUÍDO)
6. ~~**Backgrounds Parallax System:** As nuvens/fundo parallax extraídas do 'backgrounds' precisam de um Component de scroll contínuo na câmera.~~ (CONCLUÍDO)
7. ~~**Refinamento do Asset Browser:** Melhoria visual para ler a árvore de pastas fisicamente em vez de apenas tags, e exibir thumbnails maiores com virtualização, já que temos >1200 assets.~~ (CONCLUÍDO)
8. ~~**Asset Pickers nos Components:** Adicionar tipo de campo 'asset' no ECS para que ao editar Sprites/Tilemaps o dev possa selecionar os assets da lista visual e não decorando os IDs (CONCLUÍDO).~~
