import { System } from '../System';
import { World } from '../World';
import { IRenderer } from '../../renderer/types';
import { Transform } from '../components/Transform';
import { Sprite } from '../components/Sprite';
import { Tilemap } from '../components/Tilemap';
import { Collider } from '../components/Collider';
import { AssetManager } from '../../resources/AssetManager';
import { useAssetStore } from '../../../state/asset.store';

const MOCK_COLORS = [
  'transparent', '#ffffff', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
  '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#a855f7',
  '#334155', '#94a3b8', '#000000', '#fef08a'
];

export class RenderSystem implements System {
  constructor(private renderer: IRenderer, private assets: AssetManager) {}

  private tempSprites: number[] = [];
  public selectionHighlightId: number | null = null;

  public update(world: World, _dt: number): void {
    const selectedEntityId = this.selectionHighlightId;
    this.renderer.clear();
    this.renderer.beginFrame();

    const tilesets = useAssetStore.getState().tilesets;

    // 1. Render Tilemaps first (background, midground, foreground Layers)
    const tilemapEntities = world.getEntitiesWith('transform', 'tilemap');
    for (const entity of tilemapEntities) {
      const transform = world.getComponent<Transform>(entity, 'transform');
      const tilemap = world.getComponent<Tilemap>(entity, 'tilemap');
      
      if (transform && tilemap) {

        // Tilemaps pivot is usually top-left to align with grid
        const startX = transform.globalX !== undefined ? transform.globalX : transform.x;
        const startY = transform.globalY !== undefined ? transform.globalY : transform.y;
        
        let globalImg: HTMLImageElement | null = null;
        if (tilemap.assetId) {
          globalImg = this.assets.getAssetData<HTMLImageElement>(tilemap.assetId) || null;
          if (!globalImg && this.assets.getAssetMetadata(tilemap.assetId)) {
            this.assets.loadAsset(tilemap.assetId).catch(err => console.error(`Lazy load tilemap error:`, err));
          }
        }

        // Draw multiple layers sequentially (Background -> Ground -> Foreground -> Collision)
        const layersToDraw = tilemap.layers && tilemap.layers.length > 0
          ? tilemap.layers
          : [{ id: 'legacy-ground', name: 'Ground', tiles: tilemap.tiles, visible: true, opacity: 1, locked: false, type: 'tile' as const }];

        for (const layer of layersToDraw) {
          if (!layer.visible) continue;
          
          for (let y = 0; y < tilemap.height; y++) {
            for (let x = 0; x < tilemap.width; x++) {
              const tileId = layer.tiles[y * tilemap.width + x];
              if (tileId > 0) {
                const tx = startX + x * tilemap.tileSize;
                const ty = startY + y * tilemap.tileSize;
                
                if (layer.type === 'collision') {
                  const blockColors: Record<number, string> = {
                    1: 'rgba(239, 68, 68, 0.45)',   // Solid Wall
                    2: 'rgba(249, 115, 22, 0.45)',  // Hazard Orange
                    3: 'rgba(59, 130, 246, 0.45)',   // Water / Ice
                    4: 'rgba(16, 185, 129, 0.45)'   // Safe checkpoint trigger
                  };
                  this.renderer.drawRect(tx, ty, tilemap.tileSize, tilemap.tileSize, blockColors[tileId] || 'rgba(168, 85, 247, 0.35)');
                  this.renderer.drawOutline(tx, ty, tilemap.tileSize, tilemap.tileSize, 'rgba(255, 255, 255, 0.25)', 1);
                } else {
                  // Find tile definition
                  let foundPreset: any = null;
                  let parentTileset: any = null;
                  for (const ts of tilesets) {
                     const match = ts.tiles.find((t: any) => t.id === tileId);
                     if (match) {
                        foundPreset = match;
                        parentTileset = ts;
                        break;
                     }
                  }

                  if (foundPreset && parentTileset && parentTileset.imageSrc) {
                     const tsImg = this.assets.getAssetData<HTMLImageElement>(parentTileset.imageSrc);
                     if (!tsImg && this.assets.getAssetMetadata(parentTileset.imageSrc)) {
                       this.assets.loadAsset(parentTileset.imageSrc).catch(err => console.error(`Lazy load tileset error:`, err));
                     }
                     if (tsImg && tsImg.complete && tsImg.naturalWidth > 0) {
                        const tw = parentTileset.tileWidth || 32;
                        const th = parentTileset.tileHeight || 32;
                        const sx = (foundPreset.u || 0) * tw;
                        const sy = (foundPreset.v || 0) * th;
                        this.renderer.drawImageSub(tsImg, sx, sy, tw, th, tx, ty, tilemap.tileSize, tilemap.tileSize);
                     } else {
                        // fallback while loading image
                        this.renderer.drawRect(tx, ty, tilemap.tileSize, tilemap.tileSize, foundPreset.color || '#ff00ff');
                     }
                  } else if (globalImg && globalImg.complete && globalImg.naturalWidth > 0) {
                     // Auto-slice from the global image assuming tileId is an index starting at 1
                     // and left-to-right top-to-bottom layout
                     const index = tileId - 1;
                     const tw = 16; // default tile mapping size in this engine
                     const th = 16;
                     const cols = Math.max(1, Math.floor(globalImg.naturalWidth / tw));
                     const sx = (index % cols) * tw;
                     const sy = Math.floor(index / cols) * th;
                     this.renderer.drawImageSub(globalImg, sx, sy, tw, th, tx, ty, tilemap.tileSize, tilemap.tileSize);
                  } else {
                    const color = foundPreset ? foundPreset.color : (MOCK_COLORS[tileId] || '#4ade80');
                    this.renderer.drawRect(tx, ty, tilemap.tileSize, tilemap.tileSize, color);
                  }
                }
              }
            }
          }
        }

        // Render sandbox object placements
        if (tilemap.objects && tilemap.objects.length > 0) {
          for (const obj of tilemap.objects) {
            const ox = startX + obj.gridX * tilemap.tileSize;
            const oy = startY + obj.gridY * tilemap.tileSize;
            
            let strokeColor = '#6366f1';
            let emoji = '⚙️';
            if (obj.type === 'player') { strokeColor = '#4f46e5'; emoji = '👤'; }
            if (obj.type === 'enemy') { strokeColor = '#ef4444'; emoji = '👾'; }
            if (obj.type === 'coin') { strokeColor = '#eab308'; emoji = '🪙'; }
            if (obj.type === 'chest') { strokeColor = '#854d0e'; emoji = '📦'; }
            if (obj.type === 'key') { strokeColor = '#06b6d4'; emoji = '🔑'; }
            if (obj.type === 'camera') { strokeColor = '#6b7280'; emoji = '🎥'; }

            // Draw a neat dotted/glow box
            this.renderer.drawRect(ox + 3, oy + 3, tilemap.tileSize - 6, tilemap.tileSize - 6, strokeColor + '20');
            this.renderer.drawOutline(ox + 3, oy + 3, tilemap.tileSize - 6, tilemap.tileSize - 6, strokeColor, 1.5);
            this.renderer.drawText(emoji, ox + 10, oy + 22, '#ffffff', '12px sans-serif');
            this.renderer.drawText(obj.name, ox + 3, oy + 10, 'rgba(255, 255, 255, 0.65)', '8px font-sans');
          }
        }

        if (entity === selectedEntityId) {
          this.renderer.drawOutline(startX, startY, tilemap.width * tilemap.tileSize, tilemap.height * tilemap.tileSize, '#facc15', 2);
        }
      }
    }

    // 2. Render Sprites
    const spriteEntities = world.getEntitiesWith('transform', 'sprite');
    
    // Y-sort & Layer sort without allocating new arrays every frame (fallback to allocation for iterator mapping)
    this.tempSprites = Array.from(spriteEntities);
    
    this.tempSprites.sort((a, b) => {
      const spriteA = world.getComponent<Sprite>(a, 'sprite');
      const spriteB = world.getComponent<Sprite>(b, 'sprite');
      const layerA = spriteA?.layer || 0;
      const layerB = spriteB?.layer || 0;
      if (layerA !== layerB) return layerA - layerB;

      const transA = world.getComponent<Transform>(a, 'transform');
      const transB = world.getComponent<Transform>(b, 'transform');
      const yA = transA?.globalY ?? transA?.y ?? 0;
      const yB = transB?.globalY ?? transB?.y ?? 0;
      return yA - yB;
    });

    for (let i = 0; i < this.tempSprites.length; i++) {
      const entity = this.tempSprites[i];
      const transform = world.getComponent<Transform>(entity, 'transform');
      const sprite = world.getComponent<Sprite>(entity, 'sprite');
      const metadata = world.getComponent<any>(entity, 'metadata');
      
      if (transform && sprite) {
        const scaleX = transform.globalScaleX !== undefined ? transform.globalScaleX : transform.scaleX;
        const scaleY = transform.globalScaleY !== undefined ? transform.globalScaleY : transform.scaleY;
        const w = sprite.width * scaleX;
        const h = sprite.height * scaleY;
        const gx = transform.globalX !== undefined ? transform.globalX : transform.x;
        const gy = transform.globalY !== undefined ? transform.globalY : transform.y;
        const x = gx - w / 2;
        const y = gy - h / 2;

        // Auto-resolve assetId if blank but valid asset packs exist
        let resolvedAssetId = sprite.assetId;
        if (!resolvedAssetId && metadata && metadata.tag) {
          const tag = metadata.tag.toLowerCase();
          const allAssets = this.assets.getAllAssets();
          
          if (tag === 'player') {
            const found = allAssets.find(a => 
              a.metadata.guid.includes('characters/1.png') || 
              (a.metadata.tags && a.metadata.tags.includes('player'))
            );
            if (found) resolvedAssetId = found.metadata.guid;
          } else if (tag === 'slime' || metadata.name?.toLowerCase().includes('drone') || metadata.name?.toLowerCase().includes('sentry')) {
            const found = allAssets.find(a => 
              a.metadata.guid.includes('characters/2.png') || 
              a.metadata.guid.includes('characters/8.png') ||
              (a.metadata.tags && a.metadata.tags.includes('slime'))
            );
            if (found) resolvedAssetId = found.metadata.guid;
          } else if (tag === 'coin' || tag === 'datacore') {
            const found = allAssets.find(a => 
              a.metadata.guid.includes('items/gold-coin.png') || 
              a.metadata.guid.includes('items/coin-2.png') || 
              a.metadata.guid.includes('items/coin-2.gif') ||
              a.metadata.guid.includes('gold-coin')
            );
            if (found) resolvedAssetId = found.metadata.guid;
          } else if (tag === 'checkpoint') {
            const found = allAssets.find(a => 
              a.metadata.guid.includes('background-elements/flag.gif') || 
              a.metadata.guid.includes('background-elements/flag') ||
              a.metadata.guid.includes('checkpoint')
            );
            if (found) resolvedAssetId = found.metadata.guid;
          }
        }

        let hasImage = false;
        if (resolvedAssetId) {
          const img = this.assets.getAssetData<HTMLImageElement>(resolvedAssetId);
          if (img) {
            if (sprite.frameX !== undefined && sprite.frameY !== undefined && sprite.frameWidth !== undefined && sprite.frameHeight !== undefined) {
               this.renderer.drawImageSub(img, sprite.frameX, sprite.frameY, sprite.frameWidth, sprite.frameHeight, x, y, w, h);
            } else {
               this.renderer.drawImage(img, x, y, w, h);
            }
            hasImage = true;
          } else if (this.assets.getAssetMetadata(resolvedAssetId)) {
            if (this.assets.isAssetFailed(resolvedAssetId)) {
              // Asset load failed explicitly
              this.renderer.drawRect(x, y, w, h, '#db2777'); // Magenta warning base
              this.renderer.drawOutline(x, y, w, h, '#ef4444', 1.5);
              this.renderer.drawText("MISSING ASSET", x + 1, y + h / 2 + 3, '#ffffff', '7px font-mono');
            } else {
              // Lazy load from index and show loading/fetching indicator
              this.assets.loadAsset(resolvedAssetId).catch(err => console.error(`Lazy load sprite error:`, err));
              this.renderer.drawOutline(x, y, w, h, 'rgba(251, 191, 36, 0.5)', 1);
              this.renderer.drawText("LOADING...", x + 1, y + h / 2 + 3, '#fbbf24', '7px font-sans');
            }
            hasImage = true;
          } else {
            // Asset specified but not found in Database nor Vault
            this.renderer.drawRect(x, y, w, h, '#db2777'); // Magenta warning base
            this.renderer.drawOutline(x, y, w, h, '#ef4444', 1.5);
            this.renderer.drawText("MISSING ASSET", x + 1, y + h / 2 + 3, '#ffffff', '7px font-mono');
            hasImage = true;
          }
        }

        if (!hasImage) {
          // Fallback to plain color block when no asset id is specified or can be resolved
          this.renderer.drawRect(x, y, w, h, sprite.color);
        }

        // Draw selection outline
        if (entity === selectedEntityId) {
          this.renderer.drawOutline(x, y, w, h, '#facc15', 2);
        }
      }
    }
    
    // 3. Render Colliders (Gizmos)
    const colliderEntities = world.getEntitiesWith('transform', 'collider');
    for (const entity of colliderEntities) {
       const transform = world.getComponent<Transform>(entity, 'transform');
       const collider = world.getComponent<Collider>(entity, 'collider');
       
       if (transform && collider) {
         const gx = transform.globalX !== undefined ? transform.globalX : transform.x;
         const gy = transform.globalY !== undefined ? transform.globalY : transform.y;
         const scaleX = transform.globalScaleX !== undefined ? transform.globalScaleX : transform.scaleX;
         const scaleY = transform.globalScaleY !== undefined ? transform.globalScaleY : transform.scaleY;
         
         const w = collider.width * Math.abs(scaleX);
         const h = collider.height * Math.abs(scaleY);
         const ox = collider.offsetX * scaleX;
         const oy = collider.offsetY * scaleY;
         
         if (collider.shape === 'box') {
           const x = gx + ox - w / 2;
           const y = gy + oy - h / 2;
           this.renderer.drawOutline(x, y, w, h, 'rgba(239, 68, 68, 0.8)', 1);
         } else if (collider.shape === 'circle') {
            const diameter = Math.min(w, h);
            const x = gx + ox - diameter / 2;
            const y = gy + oy - diameter / 2;
            this.renderer.drawOutline(x, y, diameter, diameter, 'rgba(239, 68, 68, 0.8)', 1);
         }
       }
    }

    this.renderer.endFrame();
  }
}
