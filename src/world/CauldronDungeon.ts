import * as THREE from 'three';
import { Terrain } from './Terrain';

/**
 * CauldronDungeon.ts
 * Builds the ancient underground machine factory 'Cauldron SIGMA'
 * with sci-fi hexagonal metal architecture, glowing neon pylons,
 * energy shield barrier, and boss arena.
 */
export class CauldronDungeon {
  public group: THREE.Group;
  public entrancePosition: THREE.Vector3;
  public bossArenaCenter: THREE.Vector3;
  public energyShield: THREE.Mesh;
  public isShieldDown: boolean = false;

  constructor(scene: THREE.Scene, terrain: Terrain) {
    this.group = new THREE.Group();

    // Located in the sunken crater at (-260, -240)
    const cx = -260;
    const cz = -240;
    const cy = terrain.getTerrainHeight(cx, cz);

    this.entrancePosition = new THREE.Vector3(cx, cy + 1, cz + 60);
    this.bossArenaCenter = new THREE.Vector3(cx, cy - 2, cz - 10);

    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.9,
      roughness: 0.25,
    });

    const neonMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00c4e6,
      emissiveIntensity: 1.5,
    });

    // 1. Giant Hexagonal Factory Arena Platform
    const arenaGeo = new THREE.CylinderGeometry(42, 45, 4, 6);
    const arenaMesh = new THREE.Mesh(arenaGeo, metalMat);
    arenaMesh.position.set(cx, cy - 2, cz - 10);
    arenaMesh.receiveShadow = true;
    this.group.add(arenaMesh);

    // Arena Floor Neon Circuit Lines
    const ringGeo = new THREE.RingGeometry(18, 20, 6);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMesh = new THREE.Mesh(ringGeo, neonMat);
    ringMesh.position.set(cx, cy + 0.05, cz - 10);
    this.group.add(ringMesh);

    // 2. High-tech Machine Pylons around the arena
    const pylonGeo = new THREE.BoxGeometry(3.5, 24, 3.5);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const px = cx + Math.cos(angle) * 38;
      const pz = (cz - 10) + Math.sin(angle) * 38;

      const pylon = new THREE.Mesh(pylonGeo, metalMat);
      pylon.position.set(px, cy + 10, pz);
      pylon.castShadow = true;
      this.group.add(pylon);

      // Neon emitter band on pylon
      const bandGeo = new THREE.BoxGeometry(3.7, 1.8, 3.7);
      const band = new THREE.Mesh(bandGeo, neonMat);
      band.position.set(px, cy + 15, pz);
      this.group.add(band);

      // Light source
      const pylonLight = new THREE.PointLight(0x00f0ff, 1.2, 35);
      pylonLight.position.set(px, cy + 15, pz);
      this.group.add(pylonLight);
    }

    // 3. Ancient Cauldron Triangle Arch Entrance Gate
    const archMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.95,
      roughness: 0.2,
    });
    const archPillarGeo = new THREE.BoxGeometry(3, 18, 4);

    const leftArch = new THREE.Mesh(archPillarGeo, archMat);
    leftArch.position.set(cx - 10, cy + 8, cz + 45);
    leftArch.rotation.z = -0.2;
    this.group.add(leftArch);

    const rightArch = new THREE.Mesh(archPillarGeo, archMat);
    rightArch.position.set(cx + 10, cy + 8, cz + 45);
    rightArch.rotation.z = 0.2;
    this.group.add(rightArch);

    // 4. Glowing Energy Shield Barrier (Blocks entrance until Quest Chapter 5)
    const shieldGeo = new THREE.PlaneGeometry(24, 18);
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6, // Violet hologram barrier
      emissive: 0x7c3aed,
      emissiveIntensity: 1.8,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
    });
    this.energyShield = new THREE.Mesh(shieldGeo, shieldMat);
    this.energyShield.position.set(cx, cy + 8, cz + 45);
    this.group.add(this.energyShield);

    scene.add(this.group);
  }

  public disableEnergyShield() {
    this.isShieldDown = true;
    this.energyShield.visible = false;
  }
}
