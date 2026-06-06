import { retroEventBus } from '../../../core/events/EventBus';

export interface EntityStats {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  speed: number;
  level: number;
  xp: number;
  maxXp: number;
}

export class StatsSystem {
  constructor(public stats: EntityStats) {}

  takeDamage(amount: number): void {
    const damage = Math.max(1, amount - this.stats.defense);
    this.stats.hp = Math.max(0, this.stats.hp - damage);
    
    retroEventBus.emit('stats-changed', { type: 'damage', amount: damage, currentHp: this.stats.hp });

    if (this.stats.hp === 0) {
      retroEventBus.emit('entity-died');
    }
  }

  heal(amount: number): void {
    this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + amount);
    retroEventBus.emit('stats-changed', { type: 'heal', amount, currentHp: this.stats.hp });
  }

  addXp(amount: number): void {
    this.stats.xp += amount;
    retroEventBus.emit('stats-changed', { type: 'xp', amount, currentXp: this.stats.xp });

    while (this.stats.xp >= this.stats.maxXp) {
      this.levelUp();
    }
  }

  private levelUp(): void {
    this.stats.xp -= this.stats.maxXp;
    this.stats.level += 1;
    
    // Custom scaling could be passed as a lambda or strategy
    this.stats.maxHp += 10;
    this.stats.hp = this.stats.maxHp;
    this.stats.attack += 2;
    this.stats.defense += 2;
    this.stats.maxXp = Math.floor(this.stats.maxXp * 1.5);

    retroEventBus.emit('level-up', { level: this.stats.level, stats: this.stats });
  }
}
