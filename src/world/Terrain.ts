import * as THREE from 'three';

/**
 * Terrain.ts
 * Generates an expansive, multi-biome 1200m x 1200m procedural terrain
 * with grass, dirt, rock and snow blending, plus fast height queries.
 */
export class Terrain {
  public mesh: THREE.Mesh;
  public waterMesh: THREE.Mesh;
  public size: number = 1200;
  public segments: number = 180;
  private heightData: Float32Array;

  constructor(scene: THREE.Scene) {
    const geometry = new THREE.PlaneGeometry(
      this.size,
      this.size,
      this.segments,
      this.segments
    );
    geometry.rotateX(-Math.PI / 2);

    const posAttr = geometry.attributes.position;
    const vertexCount = posAttr.count;
    this.heightData = new Float32Array(vertexCount);

    // Populate heights based on multi-frequency simplex/biome noise
    for (let i = 0; i < vertexCount; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const h = this.calculateHeight(x, z);
      posAttr.setY(i, h);
      this.heightData[i] = h;
    }

    geometry.computeVertexNormals();

    // Create procedural canvas textures for natural landscape blending
    const diffuseMap = this.generateTerrainTexture();
    const material = new THREE.MeshStandardMaterial({
      map: diffuseMap,
      roughness: 0.85,
      metalness: 0.1,
      flatShading: false,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = false;
    scene.add(this.mesh);

    // Add glowing water lake in the southern lowlands
    const waterGeo = new THREE.PlaneGeometry(450, 350);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x006688,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.75,
    });
    this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.waterMesh.position.set(-150, 2.8, 120);
    scene.add(this.waterMesh);
  }

  /**
   * Procedural mathematical height formula for biomes:
   * (Nora Sacred Valley, Sun-Carved Red Canyons, Tallneck Basin, Cauldron Crater)
   */
  public calculateHeight(x: number, z: number): number {
    // Distance from center
    const dist = Math.sqrt(x * x + z * z);
    
    // Border mountain barriers to keep player inside
    let boundary = 0;
    if (dist > 500) {
      boundary = Math.pow((dist - 500) / 100, 2) * 20;
    }

    // Biome 1: Sacred Valley (Starting area around 0,0) - Gentle rolling hills
    const baseHills = Math.sin(x * 0.012) * Math.cos(z * 0.012) * 12 +
                      Math.sin(x * 0.03 + 1.2) * Math.cos(z * 0.025) * 5;

    // Biome 2: Sun-Carved Canyon (North-East: x > 100, z < -100) - Jagged mesas & ridges
    let canyon = 0;
    if (x > 80 && z < -60) {
      const canyonFactor = Math.min(1.0, (x - 80) * 0.005 + (-z - 60) * 0.005);
      const ridges = Math.abs(Math.sin(x * 0.025 + z * 0.02)) * 30;
      canyon = ridges * canyonFactor;
    }

    // Biome 3: Cauldron SIGMA Crater (North-West: x < -200, z < -200) - Sunken ancient tech basin
    let crater = 0;
    const craterDist = Math.hypot(x - (-260), z - (-240));
    if (craterDist < 160) {
      crater = -Math.cos((craterDist / 160) * (Math.PI / 2)) * 18;
    }

    // Biome 4: Tallneck Steppe (South: z > 150) - Expansive flat plains
    let steppe = 0;
    if (z > 100) {
      steppe = Math.sin(x * 0.008) * 4;
    }

    return Math.max(0, baseHills + canyon + crater + steppe + boundary);
  }

  /**
   * Fast bilinear/interpolated height query at world coordinates (x, z)
   */
  public getTerrainHeight(x: number, z: number): number {
    return this.calculateHeight(x, z);
  }

  /**
   * Calculates ground surface normal for aligning machines or slope sliding
   */
  public getTerrainNormal(x: number, z: number): THREE.Vector3 {
    const delta = 1.0;
    const hL = this.calculateHeight(x - delta, z);
    const hR = this.calculateHeight(x + delta, z);
    const hD = this.calculateHeight(x, z - delta);
    const hU = this.calculateHeight(x, z + delta);

    const normal = new THREE.Vector3(hL - hR, 2 * delta, hD - hU);
    return normal.normalize();
  }

  /**
   * Creates a rich 2048x2048 procedural terrain texture with biome-specific color gradients
   */
  private generateTerrainTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    const imgData = ctx.createImageData(canvas.width, canvas.height);
    const data = imgData.data;

    for (let py = 0; py < canvas.height; py++) {
      for (let px = 0; px < canvas.width; px++) {
        // Map pixel coordinates to terrain world coordinates
        const wx = (px / canvas.width - 0.5) * this.size;
        const wz = (py / canvas.height - 0.5) * this.size;
        const height = this.calculateHeight(wx, wz);

        // Noise variation
        const n = (Math.sin(px * 0.15) * Math.cos(py * 0.15) + 1) * 0.5;
        const index = (py * canvas.width + px) * 4;

        let r = 0, g = 0, b = 0;

        if (wx > 80 && wz < -60) {
          // Canyon: Red sandstone & rust
          r = 165 + n * 30;
          g = 85 + n * 20;
          b = 45 + n * 15;
        } else if (height > 35) {
          // High mountain peaks: Slate rock & snow dusting
          r = 140 + n * 40;
          g = 145 + n * 40;
          b = 150 + n * 40;
        } else if (height < 3.5) {
          // Lake shoreline: Sand & wet soil
          r = 170 + n * 25;
          g = 155 + n * 20;
          b = 115 + n * 15;
        } else {
          // Lush Nora valley grass & mossy soil
          r = 65 + n * 25;
          g = 115 + n * 35;
          b = 45 + n * 20;
        }

        data[index] = Math.min(255, r);
        data[index + 1] = Math.min(255, g);
        data[index + 2] = Math.min(255, b);
        data[index + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }
}
