import * as THREE from 'three';
import { MachineBase } from './MachineBase';
import { Terrain } from '../world/Terrain';
import { Player } from '../player/Player';

/**
 * Strider.ts
 * Quadrupedal gazelle/horse-like machine.
 * Key features:
 * - Back Blaze Canister (Vulnerable to Fire arrows causing chain reaction explosions)
 * - Mountable ride: Once overridden, player can mount ('E' key) and sprint across the world!
 */
export class Strider extends MachineBase {
  public isBeingRidden: boolean = false;
  private blazeCanister: THREE.Mesh | null = null;
  private antlers: THREE.Group = new THREE.Group();

  // 4 Legs
  private frontLeftLeg: THREE.Group = new THREE.Group();
  private frontRightLeg: THREE.Group = new THREE.Group();
  private backLeftLeg: THREE.Group = new THREE.Group();
  private backRightLeg: THREE.Group = new THREE.Group();

  constructor(scene: THREE.Scene, terrain: Terrain, spawnPos: THREE.Vector3) {
    super(scene, terrain, spawnPos);
    this.name = '스트라이더 (Strider)';
    this.hp = 140;
    this.maxHp = 140;
    this.moveSpeed = 7.5;
    this.attackRange = 3.5;
    this.weakpointDescription = '등 뒤 블레이즈 캐니스터 (화염 타격 시 유폭) / 오버라이드 시 탑승 가능';

    this.buildModel();
  }

  public buildModel() {
    const armorMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.8,
      roughness: 0.35,
    });
    const blazeCanisterMat = new THREE.MeshStandardMaterial({
      color: 0xff5500,
      emissive: 0xff3300,
      emissiveIntensity: 1.4,
      metalness: 0.2,
      roughness: 0.2,
    });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 });

    // 1. Torso
    const bodyGeo = new THREE.BoxGeometry(1.0, 0.9, 2.2);
    const body = new THREE.Mesh(bodyGeo, armorMat);
    body.position.y = 1.7;
    body.castShadow = true;
    this.mesh.add(body);

    // 2. Blaze Canister on the Rump (Critical Weakpoint)
    const canGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.8, 8);
    canGeo.rotateZ(Math.PI / 2);
    this.blazeCanister = new THREE.Mesh(canGeo, blazeCanisterMat);
    this.blazeCanister.position.set(0, 0.65, -0.65);
    this.blazeCanister.castShadow = true;
    body.add(this.blazeCanister);

    this.components.push({
      name: 'blaze_canister',
      mesh: this.blazeCanister,
      isWeakpoint: true,
      isTearable: true,
      hp: 55,
      maxHp: 55,
      destroyed: false,
      radius: 0.5,
    });

    // 3. Neck & Horned Head
    const neck = new THREE.Group();
    neck.position.set(0, 0.4, 1.1);
    neck.rotation.x = -0.4;
    body.add(neck);

    const neckGeo = new THREE.BoxGeometry(0.4, 0.9, 0.45);
    const neckMesh = new THREE.Mesh(neckGeo, frameMat);
    neck.add(neckMesh);

    const headGeo = new THREE.BoxGeometry(0.45, 0.45, 0.75);
    const headMesh = new THREE.Mesh(headGeo, armorMat);
    headMesh.position.set(0, 0.5, 0.3);
    neck.add(headMesh);

    // Eye Lens
    const eyeGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x00aaff,
      emissive: 0x0088ff,
      emissiveIntensity: 1.2,
    });
    this.eyeMesh = new THREE.Mesh(eyeGeo, eyeMat);
    this.eyeMesh.position.set(0, 0.55, 0.7);
    neck.add(this.eyeMesh);

    this.eyeLight = new THREE.PointLight(0x00aaff, 1.0, 10);
    this.eyeLight.position.set(0, 0.55, 0.8);
    neck.add(this.eyeLight);

    // Antlers / Horns
    this.antlers = new THREE.Group();
    this.antlers.position.set(0, 0.7, 0.2);
    neck.add(this.antlers);

    const antlerGeo = new THREE.BoxGeometry(0.08, 0.7, 0.08);
    const leftAntler = new THREE.Mesh(antlerGeo, frameMat);
    leftAntler.position.set(-0.35, 0.35, 0);
    leftAntler.rotation.z = 0.4;
    this.antlers.add(leftAntler);

    const rightAntler = new THREE.Mesh(antlerGeo, frameMat);
    rightAntler.position.set(0.35, 0.35, 0);
    rightAntler.rotation.z = -0.4;
    this.antlers.add(rightAntler);

    // 4. Four Digigrade Legs
    const legGeo = new THREE.BoxGeometry(0.2, 0.9, 0.2);

    // Front Left
    this.frontLeftLeg.position.set(-0.5, -0.3, 0.8);
    const flMesh = new THREE.Mesh(legGeo, frameMat);
    flMesh.position.y = -0.45;
    this.frontLeftLeg.add(flMesh);
    body.add(this.frontLeftLeg);

    // Front Right
    this.frontRightLeg.position.set(0.5, -0.3, 0.8);
    const frMesh = new THREE.Mesh(legGeo, frameMat);
    frMesh.position.y = -0.45;
    this.frontRightLeg.add(frMesh);
    body.add(this.frontRightLeg);

    // Back Left
    this.backLeftLeg.position.set(-0.5, -0.3, -0.8);
    const blMesh = new THREE.Mesh(legGeo, frameMat);
    blMesh.position.y = -0.45;
    this.backLeftLeg.add(blMesh);
    body.add(this.backLeftLeg);

    // Back Right
    this.backRightLeg.position.set(0.5, -0.3, -0.8);
    const brMesh = new THREE.Mesh(legGeo, frameMat);
    brMesh.position.y = -0.45;
    this.backRightLeg.add(brMesh);
    body.add(this.backRightLeg);
  }

  public updateSpecificAnimation(delta: number, speed: number) {
    const cycle = this.animCycle * (speed / 4.0);

    // Quadrupedal trot/gallop
    this.frontLeftLeg.rotation.x = Math.sin(cycle) * 0.65;
    this.backRightLeg.rotation.x = Math.sin(cycle) * 0.65;

    this.frontRightLeg.rotation.x = -Math.sin(cycle) * 0.65;
    this.backLeftLeg.rotation.x = -Math.sin(cycle) * 0.65;
  }

  public performAttack(player: Player, delta: number) {
    // Buck & Kick attack
    player.takeDamage(18);
  }

  /**
   * Handle player mounting and driving the Strider
   */
  public handleRideControl(player: Player, delta: number, keys: { [key: string]: boolean }, cameraYaw: number) {
    if (!this.isBeingRidden) return;

    let moveSpeed = 0;
    const forwardSpeed = 16.0; // High-speed mount galloping!

    if (keys['KeyW']) moveSpeed = forwardSpeed;
    if (keys['KeyS']) moveSpeed = -forwardSpeed * 0.4;

    // Rotate mount towards camera forward
    if (keys['KeyW'] || keys['KeyS'] || keys['KeyA'] || keys['KeyD']) {
      this.mesh.rotation.y = THREE.MathUtils.lerp(
        this.mesh.rotation.y,
        cameraYaw + Math.PI,
        delta * 6
      );
    }

    if (moveSpeed !== 0) {
      const forward = new THREE.Vector3(
        -Math.sin(this.mesh.rotation.y),
        0,
        -Math.cos(this.mesh.rotation.y)
      ).normalize();

      this.mesh.position.addScaledVector(forward, moveSpeed * delta);
      this.updateSpecificAnimation(delta, Math.abs(moveSpeed));
    }

    // Attach player to mount saddle position
    player.mesh.position.copy(this.mesh.position).add(new THREE.Vector3(0, 1.85, 0));
    player.mesh.rotation.y = this.mesh.rotation.y;
  }
}
