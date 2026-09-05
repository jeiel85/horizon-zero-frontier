import * as THREE from 'three';
import { Player } from '../player/Player';
import { Terrain } from '../world/Terrain';
import { soundManager } from '../audio/SoundManager';
import { AmmoType } from '../combat/BowAndArrow';

export type MachineState =
  | 'IDLE'
  | 'PATROL'
  | 'INVESTIGATE'
  | 'ALERT'
  | 'COMBAT'
  | 'STUNNED'
  | 'OVERRIDDEN'
  | 'DEAD';

export interface MachineComponent {
  name: string;
  mesh: THREE.Object3D;
  isWeakpoint: boolean;
  isTearable: boolean;
  hp: number;
  maxHp: number;
  destroyed: boolean;
  radius: number;
}

/**
 * MachineBase.ts
 * Core AI state machine, component destruction (tear-off), hit detection,
 * stealth-aware awareness, and elemental reactions.
 */
export abstract class MachineBase {
  public mesh: THREE.Group;
  public name: string = 'Machine';
  public hp: number = 100;
  public maxHp: number = 100;
  public state: MachineState = 'PATROL';
  public weakpointDescription: string = '렌즈 눈';

  // AI & Detection parameters
  public normalSightRange: number = 38.0;
  public stealthSightRange: number = 8.5;
  public attackRange: number = 5.0;
  public moveSpeed: number = 4.0;
  public patrolRadius: number = 25.0;
  public spawnPosition: THREE.Vector3;
  public patrolTarget: THREE.Vector3;

  // Status effects
  public shockMeter: number = 0;
  public isStunned: boolean = false;
  public stunTimer: number = 0;
  public isOverridden: boolean = false;
  public isDead: boolean = false;

  // Components / Body parts
  public components: MachineComponent[] = [];
  public eyeLight: THREE.PointLight | null = null;
  public eyeMesh: THREE.Mesh | null = null;

  protected scene: THREE.Scene;
  protected terrain: Terrain;
  protected stateTimer: number = 0;
  protected animCycle: number = 0;

  constructor(scene: THREE.Scene, terrain: Terrain, spawnPos: THREE.Vector3) {
    this.scene = scene;
    this.terrain = terrain;
    this.spawnPosition = spawnPos.clone();
    this.patrolTarget = spawnPos.clone();

    this.mesh = new THREE.Group();
    this.mesh.position.copy(spawnPos);
    this.mesh.position.y = terrain.getTerrainHeight(spawnPos.x, spawnPos.z);
    scene.add(this.mesh);
  }

  public abstract buildModel(): void;
  public abstract performAttack(player: Player, delta: number): void;
  public abstract updateSpecificAnimation(delta: number, speed: number): void;

  public update(delta: number, player: Player) {
    if (this.isDead) return;

    this.animCycle += delta * 6;

    // 1. Handle Stun / Shock state
    if (this.isStunned) {
      this.stunTimer -= delta;
      this.updateEyeColor(0x00ffff); // Cyan flash when shocked
      if (this.stunTimer <= 0) {
        this.isStunned = false;
        this.shockMeter = 0;
        this.state = 'COMBAT';
      }
      return;
    }

    // 2. State Machine Logic
    const distToPlayer = this.mesh.position.distanceTo(player.mesh.position);
    const effectiveSight = player.isStealth ? this.stealthSightRange : this.normalSightRange;

    switch (this.state) {
      case 'IDLE':
      case 'PATROL':
        this.updateEyeColor(0x00aaff); // Blue calm
        if (!this.isOverridden && distToPlayer < effectiveSight) {
          this.state = 'ALERT';
          this.stateTimer = 1.2;
          soundManager.playMachineAlert();
        } else {
          this.patrolLogic(delta);
        }
        break;

      case 'ALERT':
        this.updateEyeColor(0xffaa00); // Yellow suspicious
        this.mesh.lookAt(player.mesh.position.x, this.mesh.position.y, player.mesh.position.z);
        this.stateTimer -= delta;
        if (this.stateTimer <= 0) {
          this.state = distToPlayer < effectiveSight * 1.3 ? 'COMBAT' : 'PATROL';
        }
        break;

      case 'COMBAT':
        if (this.isOverridden) {
          this.state = 'PATROL';
          break;
        }
        this.updateEyeColor(0xff2200); // Red hostile
        this.combatLogic(delta, player, distToPlayer);
        break;

      case 'OVERRIDDEN':
        this.updateEyeColor(0x00f0ff); // Friendly AR Cyan
        // Follow or defend near player
        if (distToPlayer > 8.0) {
          this.moveTowards(player.mesh.position, delta, this.moveSpeed * 0.8);
        }
        break;
    }

    // Ground clamping & orientation
    const groundY = this.terrain.getTerrainHeight(this.mesh.position.x, this.mesh.position.z);
    this.mesh.position.y = groundY;
  }

  protected patrolLogic(delta: number) {
    const distToTarget = this.mesh.position.distanceTo(this.patrolTarget);
    if (distToTarget < 2.5) {
      // Pick new random patrol target around spawn point
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * this.patrolRadius;
      this.patrolTarget.set(
        this.spawnPosition.x + Math.cos(angle) * r,
        0,
        this.spawnPosition.z + Math.sin(angle) * r
      );
    } else {
      this.moveTowards(this.patrolTarget, delta, this.moveSpeed * 0.45);
      this.updateSpecificAnimation(delta, this.moveSpeed * 0.45);
    }
  }

  protected combatLogic(delta: number, player: Player, distToPlayer: number) {
    if (distToPlayer > this.attackRange) {
      this.moveTowards(player.mesh.position, delta, this.moveSpeed);
      this.updateSpecificAnimation(delta, this.moveSpeed);
    } else {
      // Attack player!
      this.mesh.lookAt(player.mesh.position.x, this.mesh.position.y, player.mesh.position.z);
      this.performAttack(player, delta);
    }
  }

  protected moveTowards(target: THREE.Vector3, delta: number, speed: number) {
    const dir = target.clone().sub(this.mesh.position);
    dir.y = 0;
    if (dir.lengthSq() < 0.01) return;

    dir.normalize();
    this.mesh.position.addScaledVector(dir, speed * delta);

    // Smooth rotation facing movement
    const targetAngle = Math.atan2(dir.x, dir.z);
    this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, targetAngle, delta * 8);
  }

  public checkArrowHit(
    rayStart: THREE.Vector3,
    rayEnd: THREE.Vector3
  ): { hit: boolean; isCrit: boolean; hitPartName: string } {
    const ray = new THREE.Ray(rayStart, rayEnd.clone().sub(rayStart).normalize());
    const maxDist = rayStart.distanceTo(rayEnd);

    // Check components first for weakpoints/canisters
    for (const comp of this.components) {
      if (comp.destroyed) continue;

      const compWorldPos = new THREE.Vector3();
      comp.mesh.getWorldPosition(compWorldPos);
      const sphere = new THREE.Sphere(compWorldPos, comp.radius);

      const hitPoint = new THREE.Vector3();
      if (ray.intersectSphere(sphere, hitPoint)) {
        if (rayStart.distanceTo(hitPoint) <= maxDist) {
          return { hit: true, isCrit: comp.isWeakpoint, hitPartName: comp.name };
        }
      }
    }

    // Check overall bounding sphere of machine
    const bodySphere = new THREE.Sphere(this.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0)), 2.2);
    const bodyHit = new THREE.Vector3();
    if (ray.intersectSphere(bodySphere, bodyHit)) {
      if (rayStart.distanceTo(bodyHit) <= maxDist) {
        return { hit: true, isCrit: false, hitPartName: 'body' };
      }
    }

    return { hit: false, isCrit: false, hitPartName: '' };
  }

  public applyDamage(
    amount: number,
    tearPower: number,
    ammoType: AmmoType,
    partName: string
  ) {
    if (this.isDead) return;

    this.hp = Math.max(0, this.hp - amount);

    // Component tear-off check
    const comp = this.components.find((c) => c.name === partName);
    if (comp && comp.isTearable && !comp.destroyed) {
      comp.hp -= tearPower;
      if (comp.hp <= 0) {
        comp.destroyed = true;
        comp.mesh.visible = false;
        soundManager.playComponentTearOff();
      }
    }

    // Elemental Shock status
    if (ammoType === 'shock') {
      this.shockMeter += 35;
      if (this.shockMeter >= 100) {
        this.isStunned = true;
        this.stunTimer = 6.0; // Stunned for 6 seconds
      }
    }

    // Trigger alert if hit from afar
    if (this.state !== 'COMBAT' && !this.isOverridden) {
      this.state = 'COMBAT';
    }

    // Death check
    if (this.hp <= 0) {
      this.die();
    }
  }

  public setOverridden(status: boolean) {
    this.isOverridden = status;
    this.state = status ? 'OVERRIDDEN' : 'PATROL';
    this.updateEyeColor(0x00f0ff);
  }

  protected updateEyeColor(hexColor: number) {
    if (this.eyeLight) this.eyeLight.color.setHex(hexColor);
    if (this.eyeMesh) {
      const mat = this.eyeMesh.material as THREE.MeshStandardMaterial;
      mat.color.setHex(hexColor);
      mat.emissive.setHex(hexColor);
    }
  }

  protected die() {
    this.isDead = true;
    this.state = 'DEAD';
    this.mesh.rotation.z = Math.PI / 2;
    this.mesh.position.y += 0.4;
    this.updateEyeColor(0x111111); // Eyes turn off
  }
}
