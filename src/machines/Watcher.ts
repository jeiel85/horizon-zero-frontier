import * as THREE from 'three';
import { MachineBase } from './MachineBase';
import { Terrain } from '../world/Terrain';
import { Player } from '../player/Player';

/**
 * Watcher.ts
 * Fast bipedal reconnaissance machine with a prominent glowing ocular lens.
 * Critical weakpoint is the eye lens. Uses sonic alarms, pounces and tail whips.
 */
export class Watcher extends MachineBase {
  private leftLeg: THREE.Group = new THREE.Group();
  private rightLeg: THREE.Group = new THREE.Group();
  private tail: THREE.Group = new THREE.Group();
  private head: THREE.Group = new THREE.Group();
  private attackCooldown: number = 0;

  constructor(scene: THREE.Scene, terrain: Terrain, spawnPos: THREE.Vector3) {
    super(scene, terrain, spawnPos);
    this.name = '워처 (Watcher)';
    this.hp = 95;
    this.maxHp = 95;
    this.moveSpeed = 6.8;
    this.attackRange = 4.0;
    this.weakpointDescription = '렌즈 눈 (헤드샷 치명타 2.5배)';

    this.buildModel();
  }

  public buildModel() {
    const armorMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.85,
      roughness: 0.3,
    });
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.9,
      roughness: 0.5,
    });
    const yellowLensMat = new THREE.MeshStandardMaterial({
      color: 0x00aaff,
      emissive: 0x0088ff,
      emissiveIntensity: 1.5,
      roughness: 0.1,
    });

    // 1. Torso
    const bodyGeo = new THREE.BoxGeometry(0.7, 0.7, 1.4);
    const body = new THREE.Mesh(bodyGeo, armorMat);
    body.position.y = 1.6;
    body.castShadow = true;
    this.mesh.add(body);

    // 2. Neck & Head
    this.head = new THREE.Group();
    this.head.position.set(0, 0.4, 0.7);
    body.add(this.head);

    const headGeo = new THREE.ConeGeometry(0.45, 1.1, 6);
    headGeo.rotateX(Math.PI / 2);
    const headMesh = new THREE.Mesh(headGeo, armorMat);
    headMesh.position.z = 0.4;
    headMesh.castShadow = true;
    this.head.add(headMesh);

    // Ocular Lens (Primary Weakpoint)
    const eyeGeo = new THREE.SphereGeometry(0.25, 12, 12);
    this.eyeMesh = new THREE.Mesh(eyeGeo, yellowLensMat);
    this.eyeMesh.position.set(0, 0, 0.95);
    this.head.add(this.eyeMesh);

    this.eyeLight = new THREE.PointLight(0x00aaff, 1.4, 15);
    this.eyeLight.position.set(0, 0, 1.1);
    this.head.add(this.eyeLight);

    // Register Eye as Critical Weakpoint
    this.components.push({
      name: 'lens_eye',
      mesh: this.eyeMesh,
      isWeakpoint: true,
      isTearable: true,
      hp: 40,
      maxHp: 40,
      destroyed: false,
      radius: 0.45,
    });

    // 3. Tail Whip
    this.tail = new THREE.Group();
    this.tail.position.set(0, 0.1, -0.7);
    body.add(this.tail);

    const tailGeo = new THREE.CylinderGeometry(0.12, 0.04, 1.8, 5);
    tailGeo.rotateX(-Math.PI / 3);
    const tailMesh = new THREE.Mesh(tailGeo, frameMat);
    tailMesh.position.set(0, -0.2, -0.8);
    this.tail.add(tailMesh);

    // 4. Bipedal Digigrade Legs
    const thighGeo = new THREE.BoxGeometry(0.24, 0.7, 0.35);
    const calfGeo = new THREE.BoxGeometry(0.2, 0.8, 0.2);

    // Left Leg
    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.45, -0.2, -0.1);
    body.add(this.leftLeg);

    const leftThigh = new THREE.Mesh(thighGeo, armorMat);
    leftThigh.position.y = -0.35;
    leftThigh.rotation.x = 0.3;
    this.leftLeg.add(leftThigh);

    const leftCalf = new THREE.Mesh(calfGeo, frameMat);
    leftCalf.position.set(0, -0.85, 0.2);
    leftCalf.rotation.x = -0.5;
    this.leftLeg.add(leftCalf);

    // Right Leg
    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.45, -0.2, -0.1);
    body.add(this.rightLeg);

    const rightThigh = new THREE.Mesh(thighGeo, armorMat);
    rightThigh.position.y = -0.35;
    rightThigh.rotation.x = 0.3;
    this.rightLeg.add(rightThigh);

    const rightCalf = new THREE.Mesh(calfGeo, frameMat);
    rightCalf.position.set(0, -0.85, 0.2);
    rightCalf.rotation.x = -0.5;
    this.rightLeg.add(rightCalf);
  }

  public updateSpecificAnimation(delta: number, speed: number) {
    // Raptor running stride
    const cycle = this.animCycle * (speed / 4.0);
    this.leftLeg.rotation.x = Math.sin(cycle) * 0.7;
    this.rightLeg.rotation.x = -Math.sin(cycle) * 0.7;

    // Tail counterbalance
    this.tail.rotation.y = Math.sin(cycle * 0.5) * 0.3;
    this.tail.rotation.x = -0.2 + Math.cos(cycle) * 0.1;

    // Head searching jitter
    this.head.rotation.y = Math.sin(this.animCycle * 0.8) * 0.25;
  }

  public performAttack(player: Player, delta: number) {
    this.attackCooldown -= delta;
    if (this.attackCooldown <= 0) {
      this.attackCooldown = 2.0;

      // Pounce & tail whip
      player.takeDamage(22);
      this.tail.rotation.y = 1.2; // Rapid whip
      this.mesh.position.y += 0.6; // Leap
    }
  }
}
