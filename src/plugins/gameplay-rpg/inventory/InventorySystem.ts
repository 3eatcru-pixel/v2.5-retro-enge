import { retroEventBus } from '../../../core/events/EventBus';

export interface InventorySlot {
  itemId: string;
  quantity: number;
}

export class InventorySystem {
  public slots: InventorySlot[] = [];
  public maxWeight: number = 100;
  public currentWeight: number = 0;
  public equipped: Record<string, string> = {}; // slotType -> itemId

  constructor(capacity: number = 20) {
    this.slots = new Array(capacity).fill(null).map(() => ({ itemId: '', quantity: 0 }));
  }

  addItem(itemId: string, quantity: number = 1): boolean {
    // Check for existing stack
    const existingSlot = this.slots.find(slot => slot.itemId === itemId);
    if (existingSlot) {
      existingSlot.quantity += quantity;
      retroEventBus.emit('item-created', { itemId, quantity, action: 'added_to_stack' });
      this.recalculateWeight();
      return true;
    }

    // Find empty slot
    const emptySlot = this.slots.find(slot => slot.itemId === '' || slot.quantity === 0);
    if (emptySlot) {
      emptySlot.itemId = itemId;
      emptySlot.quantity = quantity;
      retroEventBus.emit('item-created', { itemId, quantity, action: 'added_to_new_slot' });
      this.recalculateWeight();
      return true;
    }

    console.warn('Inventory is full');
    return false;
  }

  removeItem(itemId: string, quantity: number = 1): boolean {
    const slot = this.slots.find(s => s.itemId === itemId);
    if (!slot) return false;

    if (slot.quantity >= quantity) {
      slot.quantity -= quantity;
      if (slot.quantity === 0) {
        slot.itemId = '';
      }
      this.recalculateWeight();
      return true;
    }

    return false;
  }

  equipItem(itemId: string, slotType: string): void {
    if (this.hasItem(itemId)) {
      this.equipped[slotType] = itemId;
    }
  }

  unequipItem(slotType: string): void {
    if (this.equipped[slotType]) {
      delete this.equipped[slotType];
    }
  }

  hasItem(itemId: string): boolean {
    return this.slots.some(slot => slot.itemId === itemId && slot.quantity > 0);
  }

  private recalculateWeight(): void {
    // This is where we would fetch the true weight from ItemDatabase and calculate
    this.currentWeight = this.slots.reduce((total, slot) => total + (slot.quantity > 0 ? 1 : 0), 0); // Simplified
  }
}
