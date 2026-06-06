export type ItemCategory = 'weapon' | 'armor' | 'consumable' | 'material' | 'quest';

export interface Item {
  id: string;
  name: string;
  sprite: string;
  value: number;
  category: ItemCategory;
  properties: Record<string, any>;
}

export class ItemDatabase {
  private items: Map<string, Item> = new Map();

  registerItem(item: Item): void {
    if (this.items.has(item.id)) {
      console.warn(`Item with id ${item.id} is already registered. Overwriting.`);
    }
    this.items.set(item.id, item);
  }

  getItem(id: string): Item | undefined {
    return this.items.get(id);
  }

  getAllItems(): Item[] {
    return Array.from(this.items.values());
  }

  getItemsByCategory(category: ItemCategory): Item[] {
    return this.getAllItems().filter((item) => item.category === category);
  }

  clear(): void {
    this.items.clear();
  }
}

export const globalItemDatabase = new ItemDatabase();
