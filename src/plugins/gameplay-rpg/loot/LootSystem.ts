export interface LootDrop {
  itemId: string;
  chance: number; // 0.0 to 1.0
  minQuantity: number;
  maxQuantity: number;
}

export interface LootTable {
  id: string;
  drops: LootDrop[];
}

export class LootSystem {
  private tables: Map<string, LootTable> = new Map();

  registerTable(table: LootTable): void {
    this.tables.set(table.id, table);
  }

  generateLoot(tableId: string): { itemId: string, quantity: number }[] {
    const table = this.tables.get(tableId);
    if (!table) return [];

    const generatedLoot: { itemId: string, quantity: number }[] = [];

    for (const drop of table.drops) {
      if (Math.random() <= drop.chance) {
        const quantity = Math.floor(Math.random() * (drop.maxQuantity - drop.minQuantity + 1)) + drop.minQuantity;
        if (quantity > 0) {
          generatedLoot.push({ itemId: drop.itemId, quantity });
        }
      }
    }

    return generatedLoot;
  }
}
