import * as THREE from 'three';
import { Terrain } from './Terrain';

export interface GatherableItem {
  id: string;
  type: 'herb' | 'shard' | 'metal_flower';
  mesh: THREE.Object3D;
  position: THREE.Vector3;
  gathered: boolean;
  name: string;
}

export interface CampfirePoint {
  id: string;
  name: string;
  position: THREE.Vector3;
  mesh: THREE.Object3D;
  discovered: boolean;
}

/**
 * Vegetation.ts
 * Manages instanced pines, bushes, Horizon-style red stealth grass clusters,
 * ancient rusty machine ruins, gatherable resources, and campfires.
 */
export class Vegetation {
  private scene: THREE.Scene;
  private terrain: Terrain;

  // Stealth Grass detection
  public stealthGrassCenters: THREE.Vector3[] = [];
  public stealthRadius: number = 7.5;

  // Gatherables & Campfires
  public gatherables: GatherableItem[] = [];
  public campfires: CampfirePoint[] = [];

  constructor(scene: THREE.Scene, terrain: Terrain) {
    this.scene = scene;
    this.terrain = terrain;

    this.spawnPineForest();
    this.spawnStealthGrassClusters();
    this.spawnAncientRuins();
    this.spawnGatherableResources();
    this.spawnCampfires();
  }

  /**
   * High performance InstancedMesh pine trees
   */
  private spawnPineForest() {
    const treeCount = 450;
    
    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.4, 0.7, 6, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d271d, roughness: 0.9 });
    const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
    trunkInst.castShadow = true;
    trunkInst.receiveShadow = true;

    // Foliage (Conical Layers)
    const leavesGeo = new THREE.ConeGeometry(3.2, 8, 6);
    const leavesMat = new THREE.MeshStandardMaterial({
      color: 0x1d4329,
      roughness: 0.8,
      flatShading: true,
    });
    const leavesInst = new THREE.InstancedMesh(leavesGeo, leavesMat, treeCount);
    leavesInst.castShadow = true;
    leavesInst.receiveShadow = true;

    const dummy = new THREE.Object3D();
    let idx = 0;

    for (let i = 0; i < treeCount; i++) {
      // Scatter trees across hills and plains, avoiding center crater and lake
      const angle = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 420;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      // Lake avoidance
      if (Math.hypot(x - (-150), z - 120) < 130) continue;
      // Crater avoidance
      if (Math.hypot(x - (-260), z - (-240)) < 120) continue;

      const y = this.terrain.getTerrainHeight(x, z);
      const scale = 0.75 + Math.random() * 0.7;

      // Place trunk
      dummy.position.set(x, y + 3 * scale, z);
      dummy.scale.set(scale, scale, scale);
      dummy.rotation.y = Math.random() * Math.PI * 2;
      dummy.updateMatrix();
      trunkInst.setMatrixAt(idx, dummy.matrix);

      // Place foliage
      dummy.position.set(x, y + 7 * scale, z);
      dummy.updateMatrix();
      leavesInst.setMatrixAt(idx, dummy.matrix);

      idx++;
    }

    trunkInst.count = idx;
    leavesInst.count = idx;
    this.scene.add(trunkInst);
    this.scene.add(leavesInst);
  }

  /**
   * Horizon-style vibrant red/amber stealth grass patches
   */
  private spawnStealthGrassClusters() {
    const clusterCount = 38;
    const grassBladeCountPerCluster = 35;
    const totalBlades = clusterCount * grassBladeCountPerCluster;

    const bladeGeo = new THREE.ConeGeometry(0.35, 2.6, 4);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0xc43c22, // Horizon signature crimson red grass
      roughness: 0.6,
      emissive: 0x4a1208,
    });

    const grassInst = new THREE.InstancedMesh(bladeGeo, bladeMat, totalBlades);
    grassInst.castShadow = false;
    grassInst.receiveShadow = true;

    const dummy = new THREE.Object3D();
    let bladeIdx = 0;

    for (let c = 0; c < clusterCount; c++) {
      const angle = (c / clusterCount) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 25 + Math.random() * 320;
      const cx = Math.cos(angle) * dist;
      const cz = Math.sin(angle) * dist;
      const cy = this.terrain.getTerrainHeight(cx, cz);

      // Save cluster center for stealth hit-testing
      this.stealthGrassCenters.push(new THREE.Vector3(cx, cy, cz));

      // Scatter blades around cluster center
      for (let b = 0; b < grassBladeCountPerCluster; b++) {
        const offsetR = Math.random() * this.stealthRadius;
        const offsetA = Math.random() * Math.PI * 2;
        const bx = cx + Math.cos(offsetA) * offsetR;
        const bz = cz + Math.sin(offsetA) * offsetR;
        const by = this.terrain.getTerrainHeight(bx, bz);

        dummy.position.set(bx, by + 1.2, bz);
        dummy.rotation.y = Math.random() * Math.PI;
        dummy.rotation.z = (Math.random() - 0.5) * 0.35;
        dummy.scale.set(1, 0.8 + Math.random() * 0.5, 1);
        dummy.updateMatrix();

        grassInst.setMatrixAt(bladeIdx++, dummy.matrix);
      }
    }

    this.scene.add(grassInst);
  }

  /**
   * Ancient rusted metal transmission towers and concrete ruins
   */
  private spawnAncientRuins() {
    const ruinLocations = [
      { x: 70, z: 40 },
      { x: -90, z: -80 },
      { x: 180, z: -140 },
      { x: -180, z: 190 },
      { x: 280, z: 80 },
    ];

    const rustMat = new THREE.MeshStandardMaterial({
      color: 0x5a483e,
      roughness: 0.9,
      metalness: 0.4,
    });

    const beamGeo = new THREE.BoxGeometry(1.2, 28, 1.2);

    ruinLocations.forEach((loc) => {
      const group = new THREE.Group();
      const y = this.terrain.getTerrainHeight(loc.x, loc.z);

      // Slanted broken tower pillar
      const pillar1 = new THREE.Mesh(beamGeo, rustMat);
      pillar1.position.set(0, 12, 0);
      pillar1.rotation.z = 0.15;
      pillar1.castShadow = true;
      group.add(pillar1);

      const pillar2 = new THREE.Mesh(beamGeo, rustMat);
      pillar2.position.set(4, 10, 2);
      pillar2.rotation.x = -0.2;
      pillar2.castShadow = true;
      group.add(pillar2);

      // Crossbeams
      const crossGeo = new THREE.BoxGeometry(0.8, 10, 0.8);
      const cross = new THREE.Mesh(crossGeo, rustMat);
      cross.rotation.z = Math.PI / 3;
      cross.position.set(2, 14, 1);
      group.add(cross);

      // Ancient neon signal relay (dead tech)
      const lightGeo = new THREE.SphereGeometry(0.6, 8, 8);
      const deadGlowMat = new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0x00a0cc,
        emissiveIntensity: 0.8,
      });
      const relay = new THREE.Mesh(lightGeo, deadGlowMat);
      relay.position.set(0, 24, 0);
      group.add(relay);

      group.position.set(loc.x, y, loc.z);
      this.scene.add(group);
    });
  }

  /**
   * Spawns gatherable Nora healing herbs and ancient metal flowers
   */
  private spawnGatherableResources() {
    // 15 Nora Healing Herbs
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 15 + Math.random() * 240;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const y = this.terrain.getTerrainHeight(x, z);

      const herbGroup = new THREE.Group();
      const stemGeo = new THREE.CylinderGeometry(0.08, 0.08, 1, 6);
      const stemMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57 });
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.y = 0.5;
      herbGroup.add(stem);

      const berryGeo = new THREE.SphereGeometry(0.3, 8, 8);
      const berryMat = new THREE.MeshStandardMaterial({
        color: 0x22c55e,
        emissive: 0x16a34a,
        emissiveIntensity: 0.6,
      });
      const berry = new THREE.Mesh(berryGeo, berryMat);
      berry.position.y = 1.0;
      herbGroup.add(berry);

      herbGroup.position.set(x, y, z);
      this.scene.add(herbGroup);

      this.gatherables.push({
        id: `herb_${i}`,
        type: 'herb',
        mesh: herbGroup,
        position: new THREE.Vector3(x, y, z),
        gathered: false,
        name: '노라 치유 약초 (Medicinal Berries)',
      });
    }

    // 5 Ancient Metal Flowers (Lore Collectibles)
    const flowerLocations = [
      { x: -65, z: 85, name: '금속 꽃 MARK I (A)' },
      { x: 120, z: -70, name: '금속 꽃 MARK I (B)' },
      { x: -190, z: -150, name: '금속 꽃 MARK I (C)' },
      { x: 80, z: 210, name: '금속 꽃 MARK I (D)' },
      { x: 220, z: 160, name: '금속 꽃 MARK I (E)' },
    ];

    flowerLocations.forEach((loc, idx) => {
      const y = this.terrain.getTerrainHeight(loc.x, loc.z);
      const flowerGroup = new THREE.Group();

      // Metal metallic petal structure
      const petalGeo = new THREE.ConeGeometry(0.6, 1.4, 5);
      const metalPetalMat = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        metalness: 0.85,
        roughness: 0.2,
      });
      const petal = new THREE.Mesh(petalGeo, metalPetalMat);
      petal.position.y = 0.7;
      flowerGroup.add(petal);

      // Core hologram flower bud
      const coreGeo = new THREE.OctahedronGeometry(0.35);
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0xec4899,
        emissive: 0xdb2777,
        emissiveIntensity: 1.2,
      });
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.position.y = 1.3;
      flowerGroup.add(core);

      flowerGroup.position.set(loc.x, y, loc.z);
      this.scene.add(flowerGroup);

      this.gatherables.push({
        id: `metal_flower_${idx}`,
        type: 'metal_flower',
        mesh: flowerGroup,
        position: new THREE.Vector3(loc.x, y, loc.z),
        gathered: false,
        name: loc.name,
      });
    });
  }

  /**
   * Spawns 4 strategic Campfire checkpoints for saving & fast travel
   */
  private spawnCampfires() {
    const campfireDefs = [
      { id: 'camp_nora', name: '노라 시작 계곡 야영지', x: 0, z: 15 },
      { id: 'camp_canyon', name: '붉은 협곡 전초기지 야영지', x: 130, z: -90 },
      { id: 'camp_steppe', name: '톨넥 평원 감시 야영지', x: -40, z: 200 },
      { id: 'camp_cauldron', name: '가마솥 시그마 입구 야영지', x: -210, z: -210 },
    ];

    campfireDefs.forEach((def, idx) => {
      const y = this.terrain.getTerrainHeight(def.x, def.z);
      const campGroup = new THREE.Group();

      // Stone ring
      const stoneGeo = new THREE.DodecahedronGeometry(0.35);
      const stoneMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });
      for (let s = 0; s < 8; s++) {
        const a = (s / 8) * Math.PI * 2;
        const stone = new THREE.Mesh(stoneGeo, stoneMat);
        stone.position.set(Math.cos(a) * 1.3, 0.2, Math.sin(a) * 1.3);
        campGroup.add(stone);
      }

      // Wooden logs
      const logGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.8, 6);
      const logMat = new THREE.MeshStandardMaterial({ color: 0x2e1b10 });
      for (let l = 0; l < 3; l++) {
        const log = new THREE.Mesh(logGeo, logMat);
        log.rotation.z = Math.PI / 4;
        log.rotation.y = (l / 3) * Math.PI;
        log.position.y = 0.35;
        campGroup.add(log);
      }

      // Fire glowing flame mesh & point light
      const fireGeo = new THREE.ConeGeometry(0.55, 1.3, 6);
      const fireMat = new THREE.MeshStandardMaterial({
        color: 0xff6600,
        emissive: 0xff4400,
        emissiveIntensity: 1.6,
      });
      const fireMesh = new THREE.Mesh(fireGeo, fireMat);
      fireMesh.position.y = 0.8;
      campGroup.add(fireMesh);

      const fireLight = new THREE.PointLight(0xff7722, 1.4, 18);
      fireLight.position.set(0, 1.2, 0);
      campGroup.add(fireLight);

      campGroup.position.set(def.x, y, def.z);
      this.scene.add(campGroup);

      this.campfires.push({
        id: def.id,
        name: def.name,
        position: new THREE.Vector3(def.x, y, def.z),
        mesh: campGroup,
        discovered: idx === 0, // First campfire is discovered by default
      });
    });
  }

  /**
   * Fast check if player is concealed inside any red stealth grass cluster
   */
  public isInStealthGrass(pos: THREE.Vector3): boolean {
    for (let i = 0; i < this.stealthGrassCenters.length; i++) {
      const center = this.stealthGrassCenters[i];
      const dx = pos.x - center.x;
      const dz = pos.z - center.z;
      if (dx * dx + dz * dz <= this.stealthRadius * this.stealthRadius) {
        return true;
      }
    }
    return false;
  }
}
