import * as THREE from 'three';
import { Terrain } from '../world/Terrain';
import { SkyAndWeather } from '../world/SkyAndWeather';
import { Vegetation } from '../world/Vegetation';
import { CauldronDungeon } from '../world/CauldronDungeon';
import { Player } from '../player/Player';
import { PlayerController } from '../player/PlayerController';
import { BowAndArrow } from '../combat/BowAndArrow';
import { Spear } from '../combat/Spear';
import { FocusDevice } from '../combat/FocusDevice';
import { MachineBase } from '../machines/MachineBase';
import { Watcher } from '../machines/Watcher';
import { Strider } from '../machines/Strider';
import { Ravager } from '../machines/Ravager';
import { Tallneck } from '../machines/Tallneck';
import { Thunderjaw } from '../machines/Thunderjaw';
import { QuestManager } from '../systems/QuestManager';
import { InventoryManager } from '../systems/InventoryManager';
import { SaveManager } from '../systems/SaveManager';
import { UIManager } from '../ui/UIManager';
import { soundManager } from '../audio/SoundManager';

/**
 * Engine.ts
 * Master game engine orchestrating 3D rendering, physics simulation,
 * machine AI loop, combat, quest tracking, and interaction prompts.
 */
export class Engine {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public clock: THREE.Clock;

  // Subsystems
  public terrain: Terrain;
  public skyAndWeather: SkyAndWeather;
  public vegetation: Vegetation;
  public cauldron: CauldronDungeon;
  public player: Player;
  public controller: PlayerController;
  public bow: BowAndArrow;
  public spear: Spear;
  public focus: FocusDevice;
  public quests: QuestManager;
  public inventory: InventoryManager;
  public saveManager: SaveManager;
  public ui: UIManager;

  // Machine Ecosystem
  public machines: MachineBase[] = [];
  public mountedStrider: Strider | null = null;

  // State flags
  public isRunning: boolean = false;
  public isPaused: boolean = false;
  private craftHoldTimer: number = 0;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.2,
      1500
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    document.getElementById('game-container')!.appendChild(this.renderer.domElement);
    this.clock = new THREE.Clock();

    // 1. World & Environment
    this.terrain = new Terrain(this.scene);
    this.skyAndWeather = new SkyAndWeather(this.scene);
    this.vegetation = new Vegetation(this.scene, this.terrain);
    this.cauldron = new CauldronDungeon(this.scene, this.terrain);

    // 2. Player & Hunter Tools
    this.player = new Player(this.scene);
    this.player.mesh.position.set(0, this.terrain.getTerrainHeight(0, 0), 0);

    this.controller = new PlayerController(
      this.player,
      this.camera,
      this.terrain,
      this.renderer.domElement
    );
    this.bow = new BowAndArrow(this.scene, this.terrain);
    this.spear = new Spear();
    this.focus = new FocusDevice();

    // 3. Gameplay Systems
    this.quests = new QuestManager();
    this.inventory = new InventoryManager();
    this.saveManager = new SaveManager();
    this.ui = new UIManager();

    // 4. Populate Machine Ecosystem
    this.spawnMachineFauna();

    // 5. Connect UI & Quest callbacks
    this.setupEventHandlers();
    this.setupResize();
  }

  private spawnMachineFauna() {
    // 3 Watchers placed at safe distances (>45m) from the starting campfire
    this.machines.push(new Watcher(this.scene, this.terrain, new THREE.Vector3(50, 0, 50)));
    this.machines.push(new Watcher(this.scene, this.terrain, new THREE.Vector3(-60, 0, 65)));
    this.machines.push(new Watcher(this.scene, this.terrain, new THREE.Vector3(85, 0, 75)));

    // 3 Striders in southern steppe
    this.machines.push(new Strider(this.scene, this.terrain, new THREE.Vector3(-45, 0, 115)));
    this.machines.push(new Strider(this.scene, this.terrain, new THREE.Vector3(-65, 0, 130)));
    this.machines.push(new Strider(this.scene, this.terrain, new THREE.Vector3(-30, 0, 140)));

    // 2 Ravagers in the Sun-Carved Canyon
    this.machines.push(new Ravager(this.scene, this.terrain, new THREE.Vector3(140, 0, -100)));
    this.machines.push(new Ravager(this.scene, this.terrain, new THREE.Vector3(180, 0, -130)));

    // 1 Tallneck patrolling the grand southern plains
    this.machines.push(new Tallneck(this.scene, this.terrain, new THREE.Vector3(-40, 0, 200)));

    // 1 Apex Boss: Thunderjaw in Cauldron SIGMA arena
    this.machines.push(new Thunderjaw(this.scene, this.terrain, new THREE.Vector3(-260, 0, -250)));

    // Connect death callbacks directly to every machine
    this.machines.forEach((m) => {
      m.onKilledCallback = (killedMachine) => {
        this.handleMachineKilled(killedMachine);
      };
    });
  }

  private setupEventHandlers() {
    this.quests.setCallbacks(
      () => {
        this.ui.updateHUD(
          this.player,
          this.bow,
          this.inventory,
          this.quests,
          this.controller.yaw
        );
      },
      () => {
        this.ui.showVictory();
      }
    );

    // Mouse Controls Settings (Invert X / Y & Sensitivity)
    const chkInvertY = document.getElementById('chk-invert-y') as HTMLInputElement;
    const chkInvertX = document.getElementById('chk-invert-x') as HTMLInputElement;
    const rngSensitivity = document.getElementById('rng-sensitivity') as HTMLInputElement;

    chkInvertY?.addEventListener('change', () => {
      this.controller.invertY = chkInvertY.checked;
      this.ui.showToast(`마우스 Y축 반전: ${chkInvertY.checked ? 'ON' : 'OFF'}`);
    });

    chkInvertX?.addEventListener('change', () => {
      this.controller.invertX = chkInvertX.checked;
      this.ui.showToast(`마우스 X축 반전: ${chkInvertX.checked ? 'ON' : 'OFF'}`);
    });

    rngSensitivity?.addEventListener('input', () => {
      const val = parseFloat(rngSensitivity.value);
      this.controller.mouseSensitivity = 0.0022 * val;
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      // Audio init on first interaction
      soundManager.init();

      if (this.player.isDead) {
        if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') {
          this.respawnAtCampfire();
          return;
        }
      }

      if (e.code === 'Digit1') this.bow.setAmmoType('impact');
      if (e.code === 'Digit2') this.bow.setAmmoType('fire');
      if (e.code === 'Digit3') this.bow.setAmmoType('shock');

      if (e.code === 'KeyQ') {
        const healed = this.inventory.healPlayer(this.player);
        if (healed) this.ui.showToast('약초로 체력 회복 (+40 HP)');
      }

      if (e.code === 'KeyV') {
        const active = this.focus.toggle();
        this.ui.showToast(active ? '포커스 AR 스캔 가동' : '포커스 비전 해제');
        if (active) {
          this.quests.reportEvent('scan_watcher', this.player);
        }
      }

      if (e.code === 'KeyE') {
        this.handleInteractionE();
      }

      if (e.code === 'KeyF') {
        this.handleInteractionF();
      }

      if (e.code === 'KeyM' || e.code === 'Escape') {
        this.isPaused = !this.isPaused;
        this.ui.togglePauseMenu(
          this.isPaused,
          this.saveManager,
          this.player,
          this.bow,
          this.inventory,
          this.quests,
          this.vegetation
        );
      }
    });

    // Melee attack when left-clicking without aiming
    window.addEventListener('mousedown', (e) => {
      if (e.button === 0 && !this.player.isAiming && !this.isPaused && !this.player.isDead) {
        const hitResult = this.spear.attack(this.player, this.machines);
        if (hitResult.hit && hitResult.machine) {
          if (hitResult.machine.hp <= 0) {
            this.handleMachineKilled(hitResult.machine);
          }
        }
      }
    });

    // Respawn button
    document.getElementById('btn-respawn-campfire')?.addEventListener('click', () => {
      this.respawnAtCampfire();
    });

    // Victory free roam
    document.getElementById('btn-free-roam')?.addEventListener('click', () => {
      this.ui.hideVictory();
    });
  }

  private handleInteractionE() {
    const pPos = this.player.mesh.position;

    // 1. Dismount Strider if currently riding
    if (this.mountedStrider) {
      this.mountedStrider.isBeingRidden = false;
      this.mountedStrider = null;
      this.player.isMounted = false;
      this.ui.showToast('탈것에서 내렸습니다.');
      return;
    }

    // 2. Mount nearby overridden Strider
    for (const m of this.machines) {
      if (m instanceof Strider && m.isOverridden && !m.isDead) {
        if (pPos.distanceTo(m.mesh.position) < 4.5) {
          this.mountedStrider = m;
          m.isBeingRidden = true;
          this.player.isMounted = true;
          this.ui.showToast('스트라이더 탑승 완료! (WASD로 고속 이동)');
          this.quests.reportEvent('ride_strider', this.player);
          return;
        }
      }
    }

    // 3. Campfire Rest & Save
    for (const camp of this.vegetation.campfires) {
      if (pPos.distanceTo(camp.position) < 4.0) {
        camp.discovered = true;
        this.player.hp = this.player.maxHp;
        this.saveManager.saveGame(
          'auto_save',
          this.player,
          this.bow,
          this.inventory,
          this.quests,
          this.vegetation
        );
        this.ui.showToast(`${camp.name}에서 휴식 (체력 완충 & 자동 저장 완료)`);
        this.quests.reportEvent('find_campfires', this.player);
        this.skyAndWeather.setTime(7.5); // Advance to morning
        return;
      }
    }
  }

  private handleInteractionF() {
    const pPos = this.player.mesh.position;

    // 1. Gather Herb or Metal Flower
    for (const item of this.vegetation.gatherables) {
      if (!item.gathered && pPos.distanceTo(item.position) < 3.2) {
        item.gathered = true;
        item.mesh.visible = false;
        soundManager.playGather();

        if (item.type === 'herb') {
          this.inventory.addResource('herb', 2);
          this.ui.showToast('노라 치유 약초 2개 채집 (+2)');
        } else if (item.type === 'metal_flower') {
          this.inventory.addResource('shard', 50);
          this.ui.showToast(`${item.name} 수집 완료!`);
          this.quests.reportEvent('gather_5_flowers', this.player);
        }
        return;
      }
    }

    // 2. Search & Loot Dead Machine Wreckage
    for (const m of this.machines) {
      if (m.isDead && !m.isLooted && pPos.distanceTo(m.mesh.position) < 4.2) {
        m.isLooted = true;
        soundManager.playGather();
        this.inventory.addResource('shard', 35);
        this.inventory.addResource('wire', 5);

        if (m instanceof Watcher) {
          this.quests.reportEvent('recover_lens', this.player);
          this.ui.showToast('★ 워처 잔해에서 [광학 렌즈 부품] 회수 완료!');
        } else {
          this.ui.showToast(`${m.name} 잔해에서 희귀 부품 획득! (+35 금속 파편)`);
        }
        return;
      }
    }

    // 3. Override Machine with Spear
    const targetMachine = this.spear.checkOverrideOpportunity(this.player, this.machines);
    if (targetMachine) {
      this.spear.performOverride(this.player, targetMachine);
      this.ui.showToast(`${targetMachine.name} 오버라이드(해킹) 성공!`);

      if (targetMachine instanceof Watcher) {
        this.quests.reportEvent('recover_lens', this.player);
      } else if (targetMachine instanceof Strider) {
        this.quests.reportEvent('override_strider', this.player);
      } else if (targetMachine instanceof Tallneck) {
        this.quests.reportEvent('sync_map', this.player);
        this.ui.showToast('★ 톨넥 동기화 완료! 전체 오픈월드 지도가 해금되었습니다.');
      }
      return;
    }

    // 4. Cauldron Energy Shield Override
    if (pPos.distanceTo(this.cauldron.entrancePosition) < 14.0 && !this.cauldron.isShieldDown) {
      this.cauldron.disableEnergyShield();
      soundManager.playOverride();
      this.ui.showToast('가마솥 시그마 전자기 방어막 해제 완료! 던전 진입');
      this.quests.reportEvent('enter_cauldron', this.player);
      return;
    }
  }

  private handleMachineKilled(machine: MachineBase) {
    this.inventory.addResource('shard', 25);
    this.inventory.addResource('wire', 4);
    this.ui.showToast(`${machine.name} 토벌 완료! 잔해를 수색([F])하세요.`);

    if (machine instanceof Watcher) {
      this.quests.reportEvent('hunt_watcher', this.player);
      this.quests.reportEvent('recover_lens', this.player);
    } else if (machine instanceof Ravager) {
      this.quests.reportEvent('defeat_ravager', this.player);
    } else if (machine instanceof Thunderjaw) {
      this.quests.reportEvent('defeat_thunderjaw', this.player);
    }
  }

  private respawnAtCampfire() {
    // Find nearest discovered campfire
    const camp = this.vegetation.campfires[0];
    this.player.respawn(camp.position.clone().add(new THREE.Vector3(2, 0, 2)));
    if (this.mountedStrider) {
      this.mountedStrider.isBeingRidden = false;
      this.mountedStrider = null;
    }

    // Reset nearby aggressive machines back to their spawn points
    for (const m of this.machines) {
      if (!m.isDead) {
        const d = m.mesh.position.distanceTo(camp.position);
        if (d < 70) {
          m.resetToSpawn();
        }
      }
    }

    this.ui.showToast('노라 야영지 모닥불에서 부활했습니다. (4초간 무적)');
  }

  public start() {
    this.isRunning = true;
    this.clock.start();
    this.loop();

    // Initial Story Cutscene Dialogue
    window.setTimeout(() => {
      this.ui.showDialogue(
        '아일라 (Ayla)',
        '붉은 오염이 지상에 번지고 있어. 포커스[V]로 주변 워처 기계의 약점을 확인하고 사냥을 시작하자.'
      );
    }, 1200);
  }

  private loop = () => {
    requestAnimationFrame(this.loop);

    const delta = Math.min(this.clock.getDelta(), 0.1);

    if (!this.isPaused) {
      // 1. Check Stealth state inside tall red grass
      this.player.isStealth =
        this.vegetation.isInStealthGrass(this.player.mesh.position) ||
        this.controller.isCrouching;

      // 2. Controller & Player update
      if (this.mountedStrider && this.mountedStrider.isBeingRidden) {
        this.mountedStrider.handleRideControl(
          this.player,
          delta,
          this.controller.keys,
          this.controller.yaw
        );
      } else {
        this.controller.update(delta);
      }

      // 3. Combat & Bow Arrow physics
      this.bow.update(
        delta,
        this.player,
        this.camera,
        this.machines,
        this.controller.isLeftMouseDown
      );

      // 4. Machine AI Ecosystem
      for (const machine of this.machines) {
        machine.update(delta, this.player);
        if (machine.hp <= 0 && !machine.isDead) {
          this.handleMachineKilled(machine);
        }
      }

      // 5. Environmental Day-Night & Atmosphere
      this.skyAndWeather.update(delta, this.player.mesh.position);

      // 6. Focus AR Vision Updates
      this.focus.update(this.camera, this.machines, this.vegetation);

      // 7. Interaction Prompts check
      this.updateInteractionPrompts();

      // 8. Ammo quick-craft hold logic (Key R)
      if (this.controller.keys['KeyR']) {
        this.craftHoldTimer += delta;
        if (this.craftHoldTimer > 0.6) {
          this.craftHoldTimer = 0;
          const ok = this.inventory.craftCurrentAmmo(this.bow);
          if (ok) this.ui.showToast('화살 6발 즉석 제작 완료!');
          else this.ui.showToast('화살 제작 자원(금속 파편)이 부족합니다.');
        }
      } else {
        this.craftHoldTimer = 0;
      }

      // 9. HUD Updates
      this.ui.updateHUD(
        this.player,
        this.bow,
        this.inventory,
        this.quests,
        this.controller.yaw
      );
    }

    this.renderer.render(this.scene, this.camera);
  };

  private updateInteractionPrompts() {
    const pPos = this.player.mesh.position;

    // Check Mount
    if (this.mountedStrider) {
      this.ui.showPrompt('E', '스트라이더에서 내리기');
      return;
    }

    for (const m of this.machines) {
      if (m instanceof Strider && m.isOverridden && !m.isDead) {
        if (pPos.distanceTo(m.mesh.position) < 4.5) {
          this.ui.showPrompt('E', '스트라이더 탑승 (Ride Mount)');
          return;
        }
      }
    }

    // Check Campfire
    for (const camp of this.vegetation.campfires) {
      if (pPos.distanceTo(camp.position) < 3.8) {
        this.ui.showPrompt('E', `${camp.name} 휴식 및 게임 저장`);
        return;
      }
    }

    // Check Gatherable
    for (const item of this.vegetation.gatherables) {
      if (!item.gathered && pPos.distanceTo(item.position) < 3.0) {
        this.ui.showPrompt('F', `${item.name} 채집`);
        return;
      }
    }

    // Check Dead Machine Wreckage
    for (const m of this.machines) {
      if (m.isDead && !m.isLooted && pPos.distanceTo(m.mesh.position) < 4.0) {
        this.ui.showPrompt('F', `${m.name} 잔해 수색 (부품 회수)`);
        return;
      }
    }

    // Check Machine Override
    const canOverride = this.spear.checkOverrideOpportunity(this.player, this.machines);
    if (canOverride) {
      this.ui.showPrompt('F', `${canOverride.name} 오버라이드(기계 해킹)`);
      return;
    }

    // Check Cauldron Shield
    if (pPos.distanceTo(this.cauldron.entrancePosition) < 14.0 && !this.cauldron.isShieldDown) {
      this.ui.showPrompt('F', '가마솥 시그마 방어막 해제');
      return;
    }

    this.ui.hidePrompt();
  }

  private setupResize() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }
}
