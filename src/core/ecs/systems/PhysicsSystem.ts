import { World } from '../World';
import { Transform } from '../components/Transform';
import { Collider } from '../components/Collider';
import { retroEventBus } from '../../events/EventBus';

export class PhysicsSystem {
  update(world: World, _dt: number): void {
    // 1. Entity vs Entity Collisions
    const colliders = Array.from(world.getEntitiesWith('transform', 'collider'));
    
    // Simple AABB vs AABB Collision Check (O(N^2) for now - refine with Spatial Hash / QuadTree later)
    for (let i = 0; i < colliders.length; i++) {
       const entityA = colliders[i];
       const transformA = world.getComponent<Transform>(entityA, 'transform');
       const colliderA = world.getComponent<Collider>(entityA, 'collider');
       
       if (!transformA || !colliderA) continue;

       // Skip resolving tilemaps in entity-vs-entity checks
       const isTilemapA = world.getComponent<any>(entityA, 'tilemap') !== undefined;
       if (isTilemapA) continue;

       for (let j = i + 1; j < colliders.length; j++) {
          const entityB = colliders[j];
          const transformB = world.getComponent<Transform>(entityB, 'transform');
          const colliderB = world.getComponent<Collider>(entityB, 'collider');
          
          if (!transformB || !colliderB) continue;

          const isTilemapB = world.getComponent<any>(entityB, 'tilemap') !== undefined;
          if (isTilemapB) continue;

          // Layer/Mask check
          if ((colliderA.layer & colliderB.mask) === 0 && (colliderB.layer & colliderA.mask) === 0) continue;

          if (colliderA.shape === 'box' && colliderB.shape === 'box') {
             if (this.checkAABB(transformA, colliderA, transformB, colliderB)) {
                
                retroEventBus.emit('collision-enter', { entityA, entityB });
                
                if (!colliderA.isTrigger && !colliderB.isTrigger) {
                    // Resolve collision (basic separation)
                    this.resolveCollisionAABB(transformA, colliderA, transformB, colliderB);
                }
             }
          }
       }
    }

    // 2. Resolve Entity vs Tilemap Solid Grid Collisions (Sliding Resolution)
    this.resolveTilemapCollisions(world);
  }

  private resolveTilemapCollisions(world: World): void {
    const tilemaps = Array.from(world.getEntitiesWith('transform', 'tilemap'));
    const dynamicEntities = Array.from(world.getEntitiesWith('transform', 'collider'));
    
    for (let i = 0; i < tilemaps.length; i++) {
      const tmEntity = tilemaps[i];
      const tmTransform = world.getComponent<Transform>(tmEntity, 'transform');
      const tilemap = world.getComponent<any>(tmEntity, 'tilemap');
      if (!tmTransform || !tilemap) continue;
      
      const startX = tmTransform.x;
      const startY = tmTransform.y;
      
      for (let j = 0; j < dynamicEntities.length; j++) {
        const entity = dynamicEntities[j];
        if (entity === tmEntity) continue; // Skip self check
        
        const transform = world.getComponent<Transform>(entity, 'transform');
        const collider = world.getComponent<Collider>(entity, 'collider');
        // Target players or items
        if (!transform || !collider || collider.isTrigger) continue;
        
        const entityLeft = transform.x + collider.offsetX;
        const entityRight = entityLeft + collider.width;
        const entityTop = transform.y + collider.offsetY;
        const entityBottom = entityTop + collider.height;
        
        // Find grid boundaries of the overlap
        const startTileX = Math.max(0, Math.floor((entityLeft - startX) / tilemap.tileSize));
        const endTileX = Math.min(tilemap.width - 1, Math.floor((entityRight - startX) / tilemap.tileSize));
        const startTileY = Math.max(0, Math.floor((entityTop - startY) / tilemap.tileSize));
        const endTileY = Math.min(tilemap.height - 1, Math.floor((entityBottom - startY) / tilemap.tileSize));
        
        for (let ty = startTileY; ty <= endTileY; ty++) {
          for (let tx = startTileX; tx <= endTileX; tx++) {
            let isSolid = false;
            let tileDamage = 0;
            
            if (tilemap.layers) {
              for (const layer of tilemap.layers) {
                if (!layer.visible) continue;
                const tileId = layer.tiles[ty * tilemap.width + tx];
                if (tileId > 0) {
                  if (layer.type === 'collision') {
                    if (tileId === 1) isSolid = true; // standard Solid Code
                    if (tileId === 2) tileDamage = 5;  // Spikes
                  } else if (tilemap.collisionMap && tilemap.collisionMap[tileId]) {
                    const spec = tilemap.collisionMap[tileId];
                    if (spec.solid) isSolid = true;
                    if (spec.damage) tileDamage = Math.max(tileDamage, spec.damage);
                  }
                }
              }
            } else {
              // Legacy tile check
              const tileId = tilemap.tiles[ty * tilemap.width + tx];
              if (tileId > 0 && tilemap.collisionMap && tilemap.collisionMap[tileId]) {
                const spec = tilemap.collisionMap[tileId];
                if (spec.solid) isSolid = true;
              }
            }
            
            if (isSolid) {
              const tileLeft = startX + tx * tilemap.tileSize;
              const tileRight = tileLeft + tilemap.tileSize;
              const tileTop = startY + ty * tilemap.tileSize;
              const tileBottom = tileTop + tilemap.tileSize;
              
              // Recalculate current dynamic coordinates
              const curLeft = transform.x + collider.offsetX;
              const curRight = curLeft + collider.width;
              const curTop = transform.y + collider.offsetY;
              const curBottom = curTop + collider.height;
              
              if (curLeft < tileRight && curRight > tileLeft && curTop < tileBottom && curBottom > tileTop) {
                // Resolve using shortest axis push out (standard professional platform/RPG sliding)
                const overlapX = Math.min(tileRight - curLeft, curRight - tileLeft);
                const overlapY = Math.min(tileBottom - curTop, curBottom - tileTop);
                
                if (overlapX < overlapY) {
                  if (curLeft + collider.width / 2 < tileLeft + tilemap.tileSize / 2) {
                    transform.x -= overlapX;
                  } else {
                    transform.x += overlapX;
                  }
                } else {
                  if (curTop + collider.height / 2 < tileTop + tilemap.tileSize / 2) {
                    transform.y -= overlapY;
                  } else {
                    transform.y += overlapY;
                  }
                }
              }
            }
            
            if (tileDamage > 0) {
              retroEventBus.emit('collision-damage', { entity, damage: tileDamage });
            }
          }
        }
      }
    }
  }

  private checkAABB(tA: Transform, cA: Collider, tB: Transform, cB: Collider): boolean {
     const leftA = tA.x + cA.offsetX;
     const rightA = leftA + cA.width;
     const topA = tA.y + cA.offsetY;
     const bottomA = topA + cA.height;

     const leftB = tB.x + cB.offsetX;
     const rightB = leftB + cB.width;
     const topB = tB.y + cB.offsetY;
     const bottomB = topB + cB.height;

     return leftA < rightB && rightA > leftB && topA < bottomB && bottomA > topB;
  }

  private resolveCollisionAABB(tA: Transform, cA: Collider, tB: Transform, cB: Collider): void {
      // Very naive AABB resolution pushing B away from A
      // A robust system would use velocity, mass, and penetration depth along continuous axes
      const leftA = tA.x + cA.offsetX;
      const rightA = leftA + cA.width;
      const topA = tA.y + cA.offsetY;
      const bottomA = topA + cA.height;

      const leftB = tB.x + cB.offsetX;
      const rightB = leftB + cB.width;
      const topB = tB.y + cB.offsetY;
      const bottomB = topB + cB.height;

      const overlapX = Math.min(rightA - leftB, rightB - leftA);
      const overlapY = Math.min(bottomA - topB, bottomB - topA);

      if (overlapX < overlapY) {
         if (leftA < leftB) tB.x += overlapX;
         else tB.x -= overlapX;
      } else {
         if (topA < topB) tB.y += overlapY;
         else tB.y -= overlapY;
      }
  }
}
