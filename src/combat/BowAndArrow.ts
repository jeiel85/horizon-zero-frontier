import * as THREE from 'three';
import { Player } from '../player/Player';
import { Terrain } from '../world/Terrain';
import { soundManager } from '../audio/SoundManager';
import { MachineBase } from '../machines/MachineBase';

export type AmmoType = 'impact' | 'fire' | 'shock';

export interface Projectile {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  ammoType: AmmoType;
  damage: number;
  tearPower: number;
  aliveTime: number;
}

/**
 * BowAndArrow.ts
 * Manages hunter bow charging, arrow ballistic physics, projectile collisions
 * with machines/terrain, and elemental effects (Impact, Fire, Shock).
 */
export class BowAndArrow {
  private scene: THREE.Scene;
  private terrain: Terrain;
  public projectiles: Projectile[] = [];

  // Ammo Inventory counts
  public ammoInventory: { [key in AmmoType]: { current: number; max: number } } = {
    impact: { current: 24, max: 30 },
    fire: { current: 12, max: 20 },
    shock: { current: 8, max: 15 },
  };

  public currentAmmoType: AmmoType = 'impact';
  public chargeRatio: number = 0; // 0.0 to 1.0
  public onCanisterExplodedCallback?: (machine: MachineBase) => void;
  private chargeSpeed: number = 1.4; // 100% charged in ~0.7s

  // Arrow 3D template
  private arrowGeo: THREE.CylinderGeometry;
  private arrowMats: { [key in AmmoType]: THREE.MeshStandardMaterial };

  constructor(scene: THREE.Scene, terrain: Terrain) {
    this.scene = scene;
    this.terrain = terrain;

    this.arrowGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.2, 4);
    this.arrowGeo.rotateX(Math.PI / 2);

    this.arrowMats = {
      impact: new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 }),
      fire: new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 1.2 }),
      shock: new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x00c4e6, emissiveIntensity: 1.2 }),
    };
  }

  public setAmmoType(type: AmmoType) {
    this.currentAmmoType = type;
  }

  public update(delta: number, player: Player, camera: THREE.PerspectiveCamera, machines: MachineBase[], isLeftMouseDown: boolean) {
    // 1. Bow Charging Logic
    if (player.isAiming && isLeftMouseDown && this.ammoInventory[this.currentAmmoType].current > 0) {
      if (!player.isChargingBow) {
        player.isChargingBow = true;
        this.chargeRatio = 0.1;
      }
      this.chargeRatio = Math.min(1.0, this.chargeRatio + delta * this.chargeSpeed);
      soundManager.playBowDraw(this.chargeRatio);
    } else if (player.isChargingBow) {
      // Released bowstring -> Shoot arrow!
      this.shootArrow(player, camera);
      player.isChargingBow = false;
      this.chargeRatio = 0;
    }

    // 2. Simulate In-Flight Arrows
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.aliveTime += delta;

      // Ballistic gravity
      p.velocity.y -= 12.0 * delta;

      // Step position
      const prevPos = p.position.clone();
      p.position.addScaledVector(p.velocity, delta);
      p.mesh.position.copy(p.position);

      // Rotate arrow to align with velocity vector
      p.mesh.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        p.velocity.clone().normalize()
      );

      // A. Terrain Collision
      const terrainHeight = this.terrain.getTerrainHeight(p.position.x, p.position.z);
      if (p.position.y <= terrainHeight) {
        soundManager.playHitImpact(false);
        this.removeProjectile(i);
        continue;
      }

      // B. Machine Hit Detection (Ray segment against machine weakpoints/bounding boxes)
      let hitMachine = false;
      for (const machine of machines) {
        if (machine.isDead) continue;

        const hitResult = machine.checkArrowHit(prevPos, p.position);
        if (hitResult.hit) {
          hitMachine = true;
          // Apply damage & status effect
          machine.applyDamage(
            p.damage * (hitResult.isCrit ? 2.5 : 1.0),
            p.tearPower,
            p.ammoType,
            hitResult.hitPartName
          );

          soundManager.playHitImpact(hitResult.isCrit);

          if (p.ammoType === 'fire' && hitResult.hitPartName === 'blaze_canister') {
            soundManager.playExplosion();
            if (this.onCanisterExplodedCallback) {
              this.onCanisterExplodedCallback(machine);
            }
          }

          this.removeProjectile(i);
          break;
        }
      }

      // Max lifetime 4.5s
      if (!hitMachine && p.aliveTime > 4.5) {
        this.removeProjectile(i);
      }
    }
  }

  private shootArrow(player: Player, camera: THREE.PerspectiveCamera) {
    if (this.ammoInventory[this.currentAmmoType].current <= 0) return;
    this.ammoInventory[this.currentAmmoType].current--;

    // Spawn point near player's right hand / bow center
    const origin = player.mesh.position.clone().add(new THREE.Vector3(0, 1.4, 0));

    // Target direction: Raycast from center of camera
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const targetPoint = raycaster.ray.at(100, new THREE.Vector3());

    const dir = targetPoint.clone().sub(origin).normalize();

    // Speed scaled with charge
    const arrowSpeed = 50.0 + this.chargeRatio * 45.0;
    const velocity = dir.multiplyScalar(arrowSpeed);

    const baseDamage = 35 + Math.round(this.chargeRatio * 45);
    const tearPower = this.currentAmmoType === 'impact' ? 60 : 25;

    const mesh = new THREE.Mesh(this.arrowGeo, this.arrowMats[this.currentAmmoType]);
    mesh.position.copy(origin);
    this.scene.add(mesh);

    this.projectiles.push({
      mesh,
      position: origin,
      velocity,
      ammoType: this.currentAmmoType,
      damage: baseDamage,
      tearPower,
      aliveTime: 0,
    });

    soundManager.playArrowShoot();
  }

  private removeProjectile(index: number) {
    const p = this.projectiles[index];
    this.scene.remove(p.mesh);
    this.projectiles.splice(index, 1);
  }

  /**
   * Crafts 6 arrows of currently selected type
   */
  public craftCurrentAmmo(shardsCost: number): boolean {
    const slot = this.ammoInventory[this.currentAmmoType];
    if (slot.current >= slot.max) return false;

    slot.current = Math.min(slot.max, slot.current + 6);
    return true;
  }
}
