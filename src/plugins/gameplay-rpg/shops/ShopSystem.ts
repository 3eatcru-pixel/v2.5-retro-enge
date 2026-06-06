import { retroEventBus } from '../../../core/events/EventBus';
import { InventorySystem } from '../inventory/InventorySystem';
import { globalItemDatabase } from '../items/ItemDatabase';

export interface ShopItem {
  itemId: string;
  price: number;
  stock: number; // -1 for infinite
}

export class ShopSystem {
  public inventory: ShopItem[] = [];

  constructor(public shopId: string, public name: string) {}

  addStock(itemId: string, price: number, stock: number = -1): void {
    const existing = this.inventory.find(i => i.itemId === itemId);
    if (existing) {
      existing.stock = stock === -1 ? -1 : existing.stock + stock;
      existing.price = price;
    } else {
      this.inventory.push({ itemId, price, stock });
    }
  }

  buyItem(itemId: string, playerInventory: InventorySystem, playerWallet: { currency: number }): boolean {
    const shopItem = this.inventory.find(i => i.itemId === itemId);
    
    if (!shopItem || (shopItem.stock !== -1 && shopItem.stock <= 0)) {
       console.warn('Item out of stock or not in shop');
       return false;
    }

    if (playerWallet.currency < shopItem.price) {
      console.warn('Not enough currency');
      return false;
    }

    if (playerInventory.addItem(itemId, 1)) {
      playerWallet.currency -= shopItem.price;
      if (shopItem.stock > 0) {
        shopItem.stock -= 1;
      }
      retroEventBus.emit('item-created', { itemId, action: 'bought', price: shopItem.price });
      return true;
    }

    return false;
  }

  sellItem(itemId: string, playerInventory: InventorySystem, playerWallet: { currency: number }): boolean {
    const itemData = globalItemDatabase.getItem(itemId);
    if (!itemData) return false;

    if (playerInventory.removeItem(itemId, 1)) {
      const sellPrice = Math.floor(itemData.value * 0.5); // Sell for half price
      playerWallet.currency += sellPrice;
      this.addStock(itemId, itemData.value, 1);
      retroEventBus.emit('item-created', { itemId, action: 'sold', price: sellPrice });
      return true;
    }

    return false;
  }
}
