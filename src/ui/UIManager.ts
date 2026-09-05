import * as THREE from 'three';
import { Player } from '../player/Player';
import { BowAndArrow } from '../combat/BowAndArrow';
import { InventoryManager } from '../systems/InventoryManager';
import { QuestManager, Quest, Objective } from '../systems/QuestManager';
import { SaveManager } from '../systems/SaveManager';
import { Vegetation } from '../world/Vegetation';

/**
 * UIManager.ts
 * Manages all HUD elements, compass POIs, health/stamina bars,
 * ammo wheel, stealth eye, dialog popups, and pause/save menus.
 */
export class UIManager {
  // DOM Elements
  private hpBarEl: HTMLElement;
  private hpTextEl: HTMLElement;
  private staminaBarEl: HTMLElement;
  private playerLevelEl: HTMLElement;
  private herbCountEl: HTMLElement;
  private shardCountEl: HTMLElement;
  private stealthIndEl: HTMLElement;
  private crosshairEl: HTMLElement;
  private chargeMeterEl: HTMLElement;
  private questTitleEl: HTMLElement;
  private questObjListEl: HTMLElement;
  private questDistEl: HTMLElement;
  private promptEl: HTMLElement;
  private promptKeyEl: HTMLElement;
  private promptLabelEl: HTMLElement;
  private dialogueBoxEl: HTMLElement;
  private dialogueSpeakerEl: HTMLElement;
  private dialogueTextEl: HTMLElement;
  private toastContainerEl: HTMLElement;
  private titleScreenEl: HTMLElement;
  private pauseMenuEl: HTMLElement;
  private gameOverEl: HTMLElement;
  private victoryEl: HTMLElement;
  private compassTapeEl: HTMLElement;
  private ammoSlots: NodeListOf<HTMLElement>;

  // Ammo Count Elements
  private ammoCountImpactEl: HTMLElement;
  private ammoCountFireEl: HTMLElement;
  private ammoCountShockEl: HTMLElement;

  constructor() {
    this.hpBarEl = document.getElementById('hp-bar')!;
    this.hpTextEl = document.getElementById('hp-text')!;
    this.staminaBarEl = document.getElementById('stamina-bar')!;
    this.playerLevelEl = document.getElementById('player-level-badge')!;
    this.herbCountEl = document.getElementById('herb-count')!;
    this.shardCountEl = document.getElementById('shard-count')!;
    this.stealthIndEl = document.getElementById('stealth-indicator')!;
    this.crosshairEl = document.getElementById('crosshair-container')!;
    this.chargeMeterEl = document.getElementById('bow-charge-meter')!;
    this.questTitleEl = document.getElementById('quest-title-text')!;
    this.questObjListEl = document.getElementById('quest-objective-list')!;
    this.questDistEl = document.getElementById('quest-distance-text')!;
    this.promptEl = document.getElementById('interaction-prompt')!;
    this.promptKeyEl = document.getElementById('prompt-key')!;
    this.promptLabelEl = document.getElementById('prompt-label')!;
    this.dialogueBoxEl = document.getElementById('dialogue-box')!;
    this.dialogueSpeakerEl = document.getElementById('dialogue-speaker')!;
    this.dialogueTextEl = document.getElementById('dialogue-text')!;
    this.toastContainerEl = document.getElementById('toast-container')!;
    this.titleScreenEl = document.getElementById('title-screen')!;
    this.pauseMenuEl = document.getElementById('pause-menu')!;
    this.gameOverEl = document.getElementById('game-over-screen')!;
    this.victoryEl = document.getElementById('victory-screen')!;
    this.compassTapeEl = document.getElementById('compass-tape')!;
    this.ammoSlots = document.querySelectorAll('.ammo-slot');

    this.ammoCountImpactEl = document.getElementById('ammo-count-impact')!;
    this.ammoCountFireEl = document.getElementById('ammo-count-fire')!;
    this.ammoCountShockEl = document.getElementById('ammo-count-shock')!;

    this.setupPauseMenuTabs();
  }

  public updateHUD(
    player: Player,
    bow: BowAndArrow,
    inventory: InventoryManager,
    quests: QuestManager,
    cameraYaw: number
  ) {
    // 1. HP & Stamina Bars
    const hpPct = (player.hp / player.maxHp) * 100;
    this.hpBarEl.style.width = `${Math.max(0, hpPct)}%`;
    this.hpTextEl.textContent = `${Math.round(player.hp)} / ${player.maxHp}`;

    const stamPct = (player.stamina / player.maxStamina) * 100;
    this.staminaBarEl.style.width = `${stamPct}%`;

    this.playerLevelEl.textContent = `LV. ${player.level} NORA HUNTER`;
    this.herbCountEl.textContent = inventory.herbs.toString();
    this.shardCountEl.textContent = inventory.shards.toString();

    // 2. Stealth Eye Indicator
    if (player.isStealth) {
      this.stealthIndEl.classList.remove('stealth-hidden');
    } else {
      this.stealthIndEl.classList.add('stealth-hidden');
    }

    // 3. Bow Reticle & Charge Meter
    if (player.isAiming) {
      this.crosshairEl.classList.add('aiming');
      this.chargeMeterEl.style.width = `${bow.chargeRatio * 100}%`;
    } else {
      this.crosshairEl.classList.remove('aiming');
      this.chargeMeterEl.style.width = '0%';
    }

    // 4. Ammo Counts & Active Slot
    this.ammoCountImpactEl.textContent = `${bow.ammoInventory.impact.current}/${bow.ammoInventory.impact.max}`;
    this.ammoCountFireEl.textContent = `${bow.ammoInventory.fire.current}/${bow.ammoInventory.fire.max}`;
    this.ammoCountShockEl.textContent = `${bow.ammoInventory.shock.current}/${bow.ammoInventory.shock.max}`;

    this.ammoSlots.forEach((slot) => {
      const type = slot.getAttribute('data-ammo');
      if (type === bow.currentAmmoType) {
        slot.classList.add('active');
      } else {
        slot.classList.remove('active');
      }
    });

    // 5. Compass Heading
    const deg = THREE.MathUtils.radToDeg(cameraYaw) % 360;
    this.compassTapeEl.style.transform = `translateX(${-(deg / 360) * 200}px)`;

    // 6. Quest Tracker Display
    const activeQuest = quests.getActiveMainQuest();
    if (activeQuest) {
      this.questTitleEl.textContent = activeQuest.title;
      this.questObjListEl.innerHTML = '';

      let targetPos: THREE.Vector3 | undefined;

      activeQuest.objectives.forEach((obj: Objective) => {
        const item = document.createElement('div');
        item.className = `objective-item ${obj.completed ? '' : 'active'}`;
        item.innerHTML = `
          <span class="checkbox">${obj.completed ? '✓' : '○'}</span>
          <span class="text">${obj.description} (${obj.currentCount}/${obj.targetCount})</span>
        `;
        this.questObjListEl.appendChild(item);

        if (!obj.completed && obj.targetPos && !targetPos) {
          targetPos = obj.targetPos;
        }
      });

      if (targetPos) {
        const dist = Math.round(player.mesh.position.distanceTo(targetPos));
        this.questDistEl.textContent = `목표까지: ${dist}m`;
        this.questDistEl.style.display = 'flex';
      } else {
        this.questDistEl.style.display = 'none';
      }
    }

    // 7. Death Check
    if (player.isDead) {
      this.gameOverEl.classList.remove('hidden');
    } else {
      this.gameOverEl.classList.add('hidden');
    }
  }

  public showPrompt(key: string, label: string) {
    this.promptKeyEl.textContent = key;
    this.promptLabelEl.textContent = label;
    this.promptEl.classList.remove('hidden');
  }

  public hidePrompt() {
    this.promptEl.classList.add('hidden');
  }

  public showDialogue(speaker: string, text: string, duration: number = 4.5) {
    this.dialogueSpeakerEl.textContent = speaker;
    this.dialogueTextEl.textContent = text;
    this.dialogueBoxEl.classList.remove('hidden');

    window.setTimeout(() => {
      this.dialogueBoxEl.classList.add('hidden');
    }, duration * 1000);
  }

  public showToast(message: string) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    this.toastContainerEl.appendChild(toast);

    window.setTimeout(() => {
      toast.remove();
    }, 3600);
  }

  public showVictory() {
    this.victoryEl.classList.remove('hidden');
  }

  public hideVictory() {
    this.victoryEl.classList.add('hidden');
  }

  public togglePauseMenu(
    show: boolean,
    saveManager?: SaveManager,
    player?: Player,
    bow?: BowAndArrow,
    inventory?: InventoryManager,
    quests?: QuestManager,
    vegetation?: Vegetation
  ) {
    if (show) {
      this.pauseMenuEl.classList.remove('hidden');
      if (saveManager && player && bow && inventory && quests && vegetation) {
        this.populateSaveSlots(saveManager, player, bow, inventory, quests, vegetation);
        this.populateQuestLog(quests);
      }
    } else {
      this.pauseMenuEl.classList.add('hidden');
    }
  }

  private setupPauseMenuTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        tabBtns.forEach((b) => b.classList.remove('active'));
        tabContents.forEach((c) => c.classList.remove('active'));

        btn.classList.add('active');
        const tabId = btn.getAttribute('data-tab');
        const content = document.getElementById(tabId!);
        if (content) content.classList.add('active');
      });
    });

    document.getElementById('btn-close-pause')?.addEventListener('click', () => {
      this.togglePauseMenu(false);
    });
  }

  private populateSaveSlots(
    saveManager: SaveManager,
    player: Player,
    bow: BowAndArrow,
    inventory: InventoryManager,
    quests: QuestManager,
    vegetation: Vegetation
  ) {
    const container = document.getElementById('save-slots-container');
    if (!container) return;
    container.innerHTML = '';

    const slots = [
      { id: 'auto_save', title: '자동 저장 슬롯 (Auto-Save)' },
      { id: 'slot_1', title: '수동 저장 슬롯 1 (Manual Slot 1)' },
      { id: 'slot_2', title: '수동 저장 슬롯 2 (Manual Slot 2)' },
      { id: 'slot_3', title: '수동 저장 슬롯 3 (Manual Slot 3)' },
    ];

    slots.forEach((s) => {
      const summary = saveManager.getSaveSlotSummary(s.id);
      const card = document.createElement('div');
      card.className = 'save-slot-card';
      card.innerHTML = `
        <div class="slot-meta">
          <span class="slot-name">${s.title}</span>
          <span class="slot-details">${summary.summary}</span>
        </div>
        <div class="slot-actions">
          <button class="btn-primary btn-save" style="padding: 6px 14px; font-size: 13px;">저장</button>
          ${summary.exists ? '<button class="btn-secondary btn-load" style="padding: 6px 14px; font-size: 13px;">불러오기</button>' : ''}
        </div>
      `;

      card.querySelector('.btn-save')?.addEventListener('click', () => {
        saveManager.saveGame(s.id, player, bow, inventory, quests, vegetation);
        this.showToast(`${s.title}에 저장 완료!`);
        this.populateSaveSlots(saveManager, player, bow, inventory, quests, vegetation);
      });

      card.querySelector('.btn-load')?.addEventListener('click', () => {
        const ok = saveManager.loadGame(s.id, player, bow, inventory, quests, vegetation);
        if (ok) {
          this.showToast(`${s.title} 불러오기 성공!`);
          this.togglePauseMenu(false);
        }
      });

      container.appendChild(card);
    });
  }

  private populateQuestLog(quests: QuestManager) {
    const listEl = document.getElementById('quest-log-list');
    const detailsEl = document.getElementById('quest-log-details');
    if (!listEl || !detailsEl) return;

    listEl.innerHTML = '';
    quests.quests.forEach((q: Quest) => {
      const item = document.createElement('div');
      item.style.padding = '8px 12px';
      item.style.cursor = 'pointer';
      item.style.borderBottom = '1px solid rgba(255,255,255,0.08)';
      item.style.color = q.completed ? '#64748b' : q.active ? '#00f0ff' : '#94a3b8';
      item.innerHTML = `<strong>${q.completed ? '[완료] ' : q.active ? '[진행중] ' : '[잠김] '}</strong> ${q.title}`;

      item.addEventListener('click', () => {
        detailsEl.innerHTML = `
          <h3 style="color: #00f0ff; margin-bottom: 8px;">${q.title}</h3>
          <p style="font-size: 14px; line-height: 1.6; margin-bottom: 12px;">${q.description}</p>
          <div style="font-size: 13px; color: #ffaa00;">보상: 경험치 +${q.rewardExp}, 금속 파편 +${q.rewardShards}</div>
        `;
      });
      listEl.appendChild(item);
    });
  }
}
