import { soundManager } from '../audio/SoundManager';
import { Player } from '../player/Player';
import { BowAndArrow } from '../combat/BowAndArrow';

export interface InventoryItem {
  id: string;
  name: string;
  count: number;
  max: number;
  icon: string;
  description: string;
}

/**
 * InventoryManager.ts
 * Manages Nora herbs, metal shards, wire, blaze, craftables and quick healing.
 */
export class InventoryManager {
  public herbs: number = 4;
  public maxHerbs: number = 10;
  public shards: number = 65;
  public wire: number = 15;
  public blaze: number = 6;
  public powerCells: number = 4;

  public healPlayer(player: Player): boolean {
    if (this.herbs <= 0 || player.hp >= player.maxHp || player.isDead) {
      return false;
    }

    this.herbs--;
    player.heal(40);
    soundManager.playGather();
    return true;
  }

  public addResource(type: 'herb' | 'shard' | 'wire' | 'blaze' | 'power_cell', amount: number) {
    if (type === 'herb') {
      this.herbs = Math.min(this.maxHerbs, this.herbs + amount);
    } else if (type === 'shard') {
      this.shards += amount;
    } else if (type === 'wire') {
      this.wire += amount;
    } else if (type === 'blaze') {
      this.blaze += amount;
    } else if (type === 'power_cell') {
      this.powerCells += amount;
    }
  }

  public craftCurrentAmmo(bow: BowAndArrow): boolean {
    const ammoType = bow.currentAmmoType;
    let canCraft = false;

    if (ammoType === 'impact' && this.shards >= 5) {
      this.shards -= 5;
      canCraft = true;
    } else if (ammoType === 'fire' && this.shards >= 8 && this.blaze >= 1) {
      this.shards -= 8;
      this.blaze -= 1;
      canCraft = true;
    } else if (ammoType === 'shock' && this.shards >= 10 && this.powerCells >= 1) {
      this.shards -= 10;
      this.powerCells -= 1;
      canCraft = true;
    }

    if (canCraft) {
      bow.craftCurrentAmmo(5);
      soundManager.playGather();
      return true;
    }

    return false;
  }
}
