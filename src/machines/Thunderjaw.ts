import * as THREE from 'three';
import { MachineBase } from './MachineBase';
import { Terrain } from '../world/Terrain';
import { Player } from '../player/Player';
import { soundManager } from '../audio/SoundManager';

/**
 * Thunderjaw.ts
 * The Apex Combat Machine: Giant mechanical Tyrannosaurus rex.
 * Features:
 * - Dual Disc Launchers on hips
 * - Chin Machine Guns
 * - Heart Power Core (protected behind chest armor plates)
 * - Tail Whip shockwave
 * - Phase transitions at 60% and 30% HP
 */
export class Thunderjaw extends MachineBase {
  public leftDiscLauncher: THREE.Mesh | null = null;
  public rightDiscLauncher: THREE.Mesh | null = null;
  public heartCore: THREE.Mesh | null = null;
  public tailMesh: THREE.Group = new THREE.Group();

  private attackTimer: number = 0;
  private attackPhase: number = 1;
  private roarTimer: number = 10.0;

  constructor(scene: THREE.Scene, terrain: Terrain, spawnPos: THREE.Vector3) {
    super(scene, terrain, spawnPos);
    this.name = '선더죠 (Thunderjaw - APEX BOSS)';
    this.hp = 880;
    this.maxHp = 880;
    this.moveSpeed = 5.2;
    this.attackRange = 8.5;
    this.weakpointDescription = '가슴 심장 코어 / 등 뒤 디스크 런처 2문';

    this.buildModel();
  }

  public buildModel() {
    const armorMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.9,
      roughness: 0.25,
    });
    const whiteArmorMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.7,
      roughness: 0.4,
    });
    const coreGlowMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00e5ff,
      emissiveIntensity: 2.0,
    });
    const launcherMat = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0xff8800,
      emissiveIntensity: 1.2,
    });

    // 1. Massive Torso
    const bodyGeo = new THREE.BoxGeometry(2.8, 3.2, 5.5);
    const body = new THREE.Mesh(bodyGeo, armorMat);
    body.position.y = 4.2;
    body.castShadow = true;
    this.mesh.add(body);

    // 2. Heart Energy Core (Chest)
    const coreGeo = new THREE.SphereGeometry(0.7, 16, 16);
    this.heartCore = new THREE.Mesh(coreGeo, coreGlowMat);
    this.heartCore.position.set(0, -0.4, 2.8);
    body.add(this.heartCore);

    this.components.push({
      name: 'heart_core',
      mesh: this.heartCore,
      isWeakpoint: true,
      isTearable: false,
      hp: 9999,
      maxHp: 9999,
      destroyed: false,
      radius: 0.9,
    });

    // 3. Dual Disc Launchers on Hips
    const launcherGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.4, 8);
    launcherGeo.rotateX(Math.PI / 2);

    this.leftDiscLauncher = new THREE.Mesh(launcherGeo, launcherMat);
    this.leftDiscLauncher.position.set(-1.8, 1.4, 0.4);
    body.add(this.leftDiscLauncher);

    this.rightDiscLauncher = new THREE.Mesh(launcherGeo, launcherMat);
    this.rightDiscLauncher.position.set(1.8, 1.4, 0.4);
    body.add(this.rightDiscLauncher);

    this.components.push({
      name: 'left_disc_launcher',
      mesh: this.leftDiscLauncher,
      isWeakpoint: true,
      isTearable: true,
      hp: 120,
      maxHp: 120,
      destroyed: false,
      radius: 0.8,
    });

    this.components.push({
      name: 'right_disc_launcher',
      mesh: this.rightDiscLauncher,
      isWeakpoint: true,
      isTearable: true,
      hp: 120,
      maxHp: 120,
      destroyed: false,
      radius: 0.8,
    });

    // 4. Heavy T-Rex Head with Chin Guns
    const head = new THREE.Group();
    head.position.set(0, 0.8, 3.4);
    body.add(head);

    const headGeo = new THREE.BoxGeometry(1.6, 1.4, 2.6);
    const headMesh = new THREE.Mesh(headGeo, armorMat);
    headMesh.position.z = 1.2;
    head.add(headMesh);

    // Chin rapid lasers
    const gunGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.8, 6);
    gunGeo.rotateX(Math.PI / 2);
    const gunLeft = new THREE.Mesh(gunGeo, whiteArmorMat);
    gunLeft.position.set(-0.6, -0.6, 2.2);
    head.add(gunLeft);

    const gunRight = new THREE.Mesh(gunGeo, whiteArmorMat);
    gunRight.position.set(0.6, -0.6, 2.2);
    head.add(gunRight);

    // Boss Ocular Visor
    const visorGeo = new THREE.BoxGeometry(1.2, 0.25, 0.2);
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x0088ff,
      emissiveIntensity: 1.8,
    });
    this.eyeMesh = new THREE.Mesh(visorGeo, visorMat);
    this.eyeMesh.position.set(0, 0.3, 2.4);
    head.add(this.eyeMesh);

    this.eyeLight = new THREE.PointLight(0x00f0ff, 2.2, 25);
    this.eyeLight.position.set(0, 0.3, 2.8);
    head.add(this.eyeLight);

    // 5. Heavy Armored Tail
    this.tailMesh = new THREE.Group();
    this.tailMesh.position.set(0, 0.2, -2.8);
    body.add(this.tailMesh);

    const tailPartGeo = new THREE.CylinderGeometry(0.8, 0.2, 5.0, 6);
    tailPartGeo.rotateX(-Math.PI / 2.5);
    const tailP = new THREE.Mesh(tailPartGeo, whiteArmorMat);
    tailP.position.set(0, -0.8, -2.2);
    this.tailMesh.add(tailP);

    // 6. Colossal Bipedal Legs
    const legThighGeo = new THREE.BoxGeometry(0.8, 2.4, 1.2);
    const legShinGeo = new THREE.BoxGeometry(0.6, 2.6, 0.8);

    // Left Leg
    const lLeg = new THREE.Group();
    lLeg.position.set(-1.8, -1.0, 0);
    const lThigh = new THREE.Mesh(legThighGeo, armorMat);
    lThigh.position.y = -1.0;
    lLeg.add(lThigh);
    const lShin = new THREE.Mesh(legShinGeo, whiteArmorMat);
    lShin.position.set(0, -2.8, 0.4);
    lLeg.add(lShin);
    body.add(lLeg);

    // Right Leg
    const rLeg = new THREE.Group();
    rLeg.position.set(1.8, -1.0, 0);
    const rThigh = new THREE.Mesh(legThighGeo, armorMat);
    rThigh.position.y = -1.0;
    rLeg.add(rThigh);
    const rShin = new THREE.Mesh(legShinGeo, whiteArmorMat);
    rShin.position.set(0, -2.8, 0.4);
    rLeg.add(rShin);
    body.add(rLeg);
  }

  public updateSpecificAnimation(delta: number, speed: number) {
    const cycle = this.animCycle * (speed / 4.0);

    // Heavy earth-shaking tail swing
    this.tailMesh.rotation.y = Math.sin(cycle * 0.7) * 0.4;

    // Periodic battle roar
    this.roarTimer -= delta;
    if (this.roarTimer <= 0) {
      this.roarTimer = 14.0;
      soundManager.playThunderjawRoar();
    }
  }

  public performAttack(player: Player, delta: number) {
    this.attackTimer -= delta;

    if (this.attackTimer <= 0) {
      // Check which weapons are still intact
      const leftLauncher = this.components.find((c) => c.name === 'left_disc_launcher');
      const hasLaunchers = leftLauncher && !leftLauncher.destroyed;

      if (hasLaunchers && Math.random() < 0.5) {
        // High-damage Disc Launcher Barrage
        this.attackTimer = 3.5;
        player.takeDamage(38);
      } else {
        // Tail sweep / Chin machine gun burst
        this.attackTimer = 2.2;
        player.takeDamage(26);
      }
    }
  }
}
