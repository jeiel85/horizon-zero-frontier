import * as THREE from 'three';
import { MachineBase } from './MachineBase';
import { Terrain } from '../world/Terrain';
import { Player } from '../player/Player';

/**
 * Tallneck.ts
 * Majestic communication behemoth that patrols the southern steppe.
 * Neutral and peaceful. Player climbs cliffs, leaps onto its flat saucer head,
 * and overrides the core to reveal the entire open world map and secrets!
 */
export class Tallneck extends MachineBase {
  public saucerHead: THREE.Mesh | null = null;
  public isSynced: boolean = false;

  private fLegs: THREE.Group = new THREE.Group();
  private bLegs: THREE.Group = new THREE.Group();

  constructor(scene: THREE.Scene, terrain: Terrain, spawnPos: THREE.Vector3) {
    super(scene, terrain, spawnPos);
    this.name = '톨넥 (Tallneck)';
    this.hp = 9999;
    this.maxHp = 9999;
    this.moveSpeed = 2.2;
    this.patrolRadius = 90.0;
    this.weakpointDescription = '원반 머리 중앙 통신 코어 (오버라이드 시 맵 동기화)';

    this.buildModel();
  }

  public buildModel() {
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.9,
      roughness: 0.3,
    });
    const saucerMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.95,
      roughness: 0.2,
    });
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00d4ff,
      emissiveIntensity: 1.8,
    });

    // 1. Massive Torso
    const bodyGeo = new THREE.BoxGeometry(3.5, 3.0, 7.0);
    const body = new THREE.Mesh(bodyGeo, metalMat);
    body.position.y = 12.0;
    body.castShadow = true;
    this.mesh.add(body);

    // 2. Colossal Long Neck (Height reaches ~24m)
    const neckGeo = new THREE.BoxGeometry(1.6, 12.0, 2.2);
    const neck = new THREE.Mesh(neckGeo, metalMat);
    neck.position.set(0, 7.0, 2.5);
    neck.rotation.x = -0.15;
    neck.castShadow = true;
    body.add(neck);

    // 3. Huge Flat Saucer Head (Landing Platform for Player!)
    const saucerGeo = new THREE.CylinderGeometry(6.5, 7.0, 1.2, 24);
    this.saucerHead = new THREE.Mesh(saucerGeo, saucerMat);
    this.saucerHead.position.set(0, 7.0, 0);
    neck.add(this.saucerHead);

    // Central Glowing Comm Core
    const coreGeo = new THREE.CylinderGeometry(1.4, 1.4, 0.4, 16);
    const core = new THREE.Mesh(coreGeo, glowMat);
    core.position.y = 0.7;
    this.saucerHead.add(core);

    // 4. Stately 4 Towering Stilt Legs
    const legGeo = new THREE.CylinderGeometry(0.5, 0.7, 13.0, 8);

    const fl = new THREE.Mesh(legGeo, metalMat);
    fl.position.set(-2.0, -6.5, 2.5);
    body.add(fl);

    const fr = new THREE.Mesh(legGeo, metalMat);
    fr.position.set(2.0, -6.5, 2.5);
    body.add(fr);

    const bl = new THREE.Mesh(legGeo, metalMat);
    bl.position.set(-2.0, -6.5, -2.5);
    body.add(bl);

    const br = new THREE.Mesh(legGeo, metalMat);
    br.position.set(2.0, -6.5, -2.5);
    body.add(br);
  }

  public updateSpecificAnimation(delta: number, speed: number) {
    // Majestic, slow, ground-shaking strides
    this.mesh.position.y += Math.sin(this.animCycle * 0.5) * 0.05;
  }

  public performAttack(_player: Player, _delta: number) {
    // Tallnecks never attack; they are peaceful titans
  }
}
