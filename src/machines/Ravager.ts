import * as THREE from 'three';
import { MachineBase } from './MachineBase';
import { Terrain } from '../world/Terrain';
import { Player } from '../player/Player';

/**
 * Ravager.ts
 * Lethal feline predator machine armed with a back-mounted Heavy Rail Cannon.
 * Knocking off the cannon disarms its ranged bombardment and leaves it relying on claws.
 */
export class Ravager extends MachineBase {
  public cannonMesh: THREE.Mesh | null = null;
  public isCannonDestroyed: boolean = false;
  private cannonCooldown: number = 2.5;

  // Legs
  private fLeftLeg: THREE.Group = new THREE.Group();
  private fRightLeg: THREE.Group = new THREE.Group();
  private bLeftLeg: THREE.Group = new THREE.Group();
  private bRightLeg: THREE.Group = new THREE.Group();

  constructor(scene: THREE.Scene, terrain: Terrain, spawnPos: THREE.Vector3) {
    super(scene, terrain, spawnPos);
    this.name = '래피저 (Ravager)';
    this.hp = 280;
    this.maxHp = 280;
    this.moveSpeed = 8.8;
    this.attackRange = 4.5;
    this.weakpointDescription = '등 뒤 헤비 캐논 (부위 파괴 시 원거리 봉인)';

    this.buildModel();
  }

  public buildModel() {
    const armorMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.9,
      roughness: 0.25,
    });
    const cannonMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x0088cc,
      emissiveIntensity: 1.2,
      metalness: 0.95,
    });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });

    // 1. Sleek Heavy Predator Body
    const bodyGeo = new THREE.BoxGeometry(1.4, 1.1, 2.8);
    const body = new THREE.Mesh(bodyGeo, armorMat);
    body.position.y = 1.8;
    body.castShadow = true;
    this.mesh.add(body);

    // 2. Heavy Back Rail Cannon (Key Component)
    const cannonGeo = new THREE.CylinderGeometry(0.2, 0.2, 1.8, 8);
    cannonGeo.rotateX(Math.PI / 2);
    this.cannonMesh = new THREE.Mesh(cannonGeo, cannonMat);
    this.cannonMesh.position.set(0.4, 0.85, 0.2);
    this.cannonMesh.castShadow = true;
    body.add(this.cannonMesh);

    this.components.push({
      name: 'heavy_cannon',
      mesh: this.cannonMesh,
      isWeakpoint: true,
      isTearable: true,
      hp: 80,
      maxHp: 80,
      destroyed: false,
      radius: 0.65,
    });

    // 3. Menacing Head & Mandibles
    const head = new THREE.Group();
    head.position.set(0, 0.2, 1.5);
    body.add(head);

    const headGeo = new THREE.BoxGeometry(0.8, 0.6, 1.0);
    const headMesh = new THREE.Mesh(headGeo, armorMat);
    head.add(headMesh);

    // Ocular Strip
    const eyeGeo = new THREE.BoxGeometry(0.6, 0.12, 0.2);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x00aaff,
      emissive: 0x0088ff,
      emissiveIntensity: 1.5,
    });
    this.eyeMesh = new THREE.Mesh(eyeGeo, eyeMat);
    this.eyeMesh.position.set(0, 0.1, 0.5);
    head.add(this.eyeMesh);

    this.eyeLight = new THREE.PointLight(0x00aaff, 1.2, 12);
    this.eyeLight.position.set(0, 0.1, 0.7);
    head.add(this.eyeLight);

    // 4. Four Muscular Cybernetic Paws
    const legGeo = new THREE.BoxGeometry(0.3, 1.2, 0.35);

    this.fLeftLeg.position.set(-0.7, -0.4, 1.0);
    this.fLeftLeg.add(new THREE.Mesh(legGeo, frameMat));
    body.add(this.fLeftLeg);

    this.fRightLeg.position.set(0.7, -0.4, 1.0);
    this.fRightLeg.add(new THREE.Mesh(legGeo, frameMat));
    body.add(this.fRightLeg);

    this.bLeftLeg.position.set(-0.7, -0.4, -1.0);
    this.bLeftLeg.add(new THREE.Mesh(legGeo, frameMat));
    body.add(this.bLeftLeg);

    this.bRightLeg.position.set(0.7, -0.4, -1.0);
    this.bRightLeg.add(new THREE.Mesh(legGeo, frameMat));
    body.add(this.bRightLeg);
  }

  public updateSpecificAnimation(delta: number, speed: number) {
    const cycle = this.animCycle * (speed / 4.0);

    this.fLeftLeg.rotation.x = Math.sin(cycle) * 0.7;
    this.bRightLeg.rotation.x = Math.sin(cycle) * 0.7;
    this.fRightLeg.rotation.x = -Math.sin(cycle) * 0.7;
    this.bLeftLeg.rotation.x = -Math.sin(cycle) * 0.7;
  }

  public performAttack(player: Player, delta: number) {
    const comp = this.components.find((c) => c.name === 'heavy_cannon');
    const hasCannon = comp && !comp.destroyed;

    this.cannonCooldown -= delta;

    if (hasCannon && this.cannonCooldown <= 0) {
      // Fire Heavy Plasma Burst
      this.cannonCooldown = 3.2;
      player.takeDamage(32);
    } else if (this.cannonCooldown <= 0) {
      // Melee Pounce
      this.cannonCooldown = 1.8;
      player.takeDamage(24);
    }
  }
}
