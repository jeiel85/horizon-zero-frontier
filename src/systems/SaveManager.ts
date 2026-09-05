import { Player } from '../player/Player';
import { BowAndArrow } from '../combat/BowAndArrow';
import { InventoryManager } from './InventoryManager';
import { QuestManager } from './QuestManager';
import { Vegetation } from '../world/Vegetation';
import { soundManager } from '../audio/SoundManager';

export interface GameSaveData {
  timestamp: number;
  dateString: string;
  player: {
    x: number;
    y: number;
    z: number;
    hp: number;
    maxHp: number;
    level: number;
    exp: number;
  };
  ammo: {
    impact: number;
    fire: number;
    shock: number;
  };
  inventory: {
    herbs: number;
    shards: number;
    wire: number;
    blaze: number;
    powerCells: number;
  };
  quests: {
    id: string;
    completed: boolean;
    active: boolean;
    objectives: { id: string; count: number; completed: boolean }[];
  }[];
  campfires: string[];
}

/**
 * SaveManager.ts
 * Manages auto-saves, manual campfire saves, multi-slot LocalStorage serialization,
 * and reliable game state restoration.
 */
export class SaveManager {
  private readonly STORAGE_PREFIX = 'horizon_save_';

  public saveGame(
    slotId: string,
    player: Player,
    bow: BowAndArrow,
    inventory: InventoryManager,
    quests: QuestManager,
    vegetation: Vegetation
  ): boolean {
    try {
      const now = new Date();
      const saveData: GameSaveData = {
        timestamp: Date.now(),
        dateString: now.toLocaleString('ko-KR'),
        player: {
          x: player.mesh.position.x,
          y: player.mesh.position.y,
          z: player.mesh.position.z,
          hp: player.hp,
          maxHp: player.maxHp,
          level: player.level,
          exp: player.exp,
        },
        ammo: {
          impact: bow.ammoInventory.impact.current,
          fire: bow.ammoInventory.fire.current,
          shock: bow.ammoInventory.shock.current,
        },
        inventory: {
          herbs: inventory.herbs,
          shards: inventory.shards,
          wire: inventory.wire,
          blaze: inventory.blaze,
          powerCells: inventory.powerCells,
        },
        quests: quests.quests.map((q) => ({
          id: q.id,
          completed: q.completed,
          active: q.active,
          objectives: q.objectives.map((o) => ({
            id: o.id,
            count: o.currentCount,
            completed: o.completed,
          })),
        })),
        campfires: vegetation.campfires.filter((c) => c.discovered).map((c) => c.id),
      };

      localStorage.setItem(this.STORAGE_PREFIX + slotId, JSON.stringify(saveData));
      soundManager.playCampfireSave();
      return true;
    } catch (e) {
      console.error('Save failed:', e);
      return false;
    }
  }

  public loadGame(
    slotId: string,
    player: Player,
    bow: BowAndArrow,
    inventory: InventoryManager,
    quests: QuestManager,
    vegetation: Vegetation
  ): boolean {
    try {
      const raw = localStorage.getItem(this.STORAGE_PREFIX + slotId);
      if (!raw) return false;

      const data: GameSaveData = JSON.parse(raw);

      // 1. Restore Player
      player.mesh.position.set(data.player.x, data.player.y, data.player.z);
      player.hp = data.player.hp;
      player.maxHp = data.player.maxHp;
      player.level = data.player.level;
      player.exp = data.player.exp;
      player.isDead = false;

      // 2. Restore Ammo
      bow.ammoInventory.impact.current = data.ammo.impact;
      bow.ammoInventory.fire.current = data.ammo.fire;
      bow.ammoInventory.shock.current = data.ammo.shock;

      // 3. Restore Inventory
      inventory.herbs = data.inventory.herbs;
      inventory.shards = data.inventory.shards;
      inventory.wire = data.inventory.wire;
      inventory.blaze = data.inventory.blaze;
      inventory.powerCells = data.inventory.powerCells;

      // 4. Restore Quests
      data.quests.forEach((savedQ) => {
        const targetQ = quests.quests.find((q) => q.id === savedQ.id);
        if (targetQ) {
          targetQ.completed = savedQ.completed;
          targetQ.active = savedQ.active;
          savedQ.objectives.forEach((savedO) => {
            const targetO = targetQ.objectives.find((o) => o.id === savedO.id);
            if (targetO) {
              targetO.currentCount = savedO.count;
              targetO.completed = savedO.completed;
            }
          });
        }
      });

      // 5. Restore Campfires
      vegetation.campfires.forEach((c) => {
        if (data.campfires.includes(c.id)) {
          c.discovered = true;
        }
      });

      return true;
    } catch (e) {
      console.error('Load failed:', e);
      return false;
    }
  }

  public getSaveSlotSummary(slotId: string): { exists: boolean; summary: string } {
    const raw = localStorage.getItem(this.STORAGE_PREFIX + slotId);
    if (!raw) return { exists: false, summary: '빈 슬롯 (Empty Slot)' };
    try {
      const data: GameSaveData = JSON.parse(raw);
      return {
        exists: true,
        summary: `${data.dateString} - LV.${data.player.level} (HP: ${data.player.hp}/${data.player.maxHp})`,
      };
    } catch {
      return { exists: false, summary: '데이터 손상' };
    }
  }
}
