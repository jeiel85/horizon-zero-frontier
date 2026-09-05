import * as THREE from 'three';

/**
 * SkyAndWeather.ts
 * Manages dynamic day-night cycle, sun and moon orbits, atmospheric fog,
 * ambient hemispheric lighting, and dynamic starfields.
 */
export class SkyAndWeather {
  public scene: THREE.Scene;
  public sunLight: THREE.DirectionalLight;
  public moonLight: THREE.DirectionalLight;
  public hemiLight: THREE.HemisphereLight;
  public stars: THREE.Points;
  public fog: THREE.FogExp2;

  // 24-hour cycle: starts at 7:30 AM (Dawn sunrise)
  public timeOfDay: number = 7.5;
  public timeScale: number = 0.04; // 1 real second = ~2.4 in-game minutes
  public isPaused: boolean = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Atmospheric Fog
    this.fog = new THREE.FogExp2(0xd6e8f7, 0.0028);
    this.scene.fog = this.fog;

    // Hemispheric Ambient Light (Sky / Ground balance)
    this.hemiLight = new THREE.HemisphereLight(0xb1e1ff, 0x3b3a32, 0.6);
    this.scene.add(this.hemiLight);

    // Directional Sun Light with high-res shadow maps
    this.sunLight = new THREE.DirectionalLight(0xfff3db, 1.6);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 400;
    const d = 120;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);

    // Moonlight for night ambiance
    this.moonLight = new THREE.DirectionalLight(0x7da4d4, 0.2);
    this.moonLight.castShadow = false;
    this.scene.add(this.moonLight);

    // Starfield for night sky
    this.stars = this.createStarfield();
    this.scene.add(this.stars);

    this.updateAtmosphere(0, new THREE.Vector3(0, 0, 0));
  }

  private createStarfield(): THREE.Points {
    const starCount = 1500;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 0.9 + 0.1); // Upper hemisphere only
      const radius = 550;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 2.2,
      transparent: true,
      opacity: 0.0,
    });

    return new THREE.Points(geometry, material);
  }

  public update(delta: number, playerPos: THREE.Vector3) {
    if (!this.isPaused) {
      this.timeOfDay = (this.timeOfDay + delta * this.timeScale) % 24;
    }
    this.updateAtmosphere(delta, playerPos);
  }

  public setTime(hour: number) {
    this.timeOfDay = hour % 24;
  }

  private updateAtmosphere(_delta: number, playerPos: THREE.Vector3) {
    // Convert 24h to solar angle radians
    // 6.0 = sunrise (angle = 0), 12.0 = noon (angle = PI/2), 18.0 = sunset (angle = PI), 0.0 = midnight
    const solarAngle = ((this.timeOfDay - 6.0) / 24.0) * Math.PI * 2;
    const sunDist = 300;

    const sunX = playerPos.x + Math.cos(solarAngle) * sunDist;
    const sunY = Math.sin(solarAngle) * sunDist;
    const sunZ = playerPos.z + 120;

    this.sunLight.position.set(sunX, Math.max(sunY, -50), sunZ);
    this.sunLight.target.position.copy(playerPos);
    this.sunLight.target.updateMatrixWorld();

    // Opposite position for Moon
    const moonAngle = solarAngle + Math.PI;
    this.moonLight.position.set(
      playerPos.x + Math.cos(moonAngle) * sunDist,
      Math.sin(moonAngle) * sunDist,
      playerPos.z - 120
    );
    this.moonLight.target.position.copy(playerPos);
    this.moonLight.target.updateMatrixWorld();

    // Starfield follows player
    this.stars.position.copy(playerPos);

    // Time-based lighting and color gradients
    const t = this.timeOfDay;
    const starsMat = this.stars.material as THREE.PointsMaterial;

    if (t >= 5 && t < 8) {
      // DAWN / SUNRISE (Horizon Golden Hour)
      const ratio = (t - 5) / 3;
      this.sunLight.intensity = THREE.MathUtils.lerp(0.1, 1.5, ratio);
      this.sunLight.color.setHex(0xffaa55);
      this.hemiLight.color.setHex(0xffc285);
      this.hemiLight.groundColor.setHex(0x5a3d28);
      this.fog.color.setHex(0xdf9a6d);
      this.scene.background = new THREE.Color(0xd4875c);
      starsMat.opacity = THREE.MathUtils.lerp(0.8, 0.0, ratio);
    } else if (t >= 8 && t < 17) {
      // DAYLIGHT (Crisp, vivid frontier sun)
      this.sunLight.intensity = 1.7;
      this.sunLight.color.setHex(0xfff5e6);
      this.hemiLight.color.setHex(0x9bd8ff);
      this.hemiLight.groundColor.setHex(0x384a29);
      this.fog.color.setHex(0xbfe0f7);
      this.scene.background = new THREE.Color(0x84c4f0);
      starsMat.opacity = 0;
    } else if (t >= 17 && t < 20) {
      // DUSK / SUNSET (Deep crimson & purple)
      const ratio = (t - 17) / 3;
      this.sunLight.intensity = THREE.MathUtils.lerp(1.5, 0.1, ratio);
      this.sunLight.color.setHex(0xff5522);
      this.hemiLight.color.setHex(0xd65b38);
      this.hemiLight.groundColor.setHex(0x281822);
      this.fog.color.setHex(0x823b49);
      this.scene.background = new THREE.Color(0x61253b);
      starsMat.opacity = THREE.MathUtils.lerp(0.0, 0.7, ratio);
    } else {
      // NIGHT (Deep mystic blue & starshine)
      this.sunLight.intensity = 0.0;
      this.moonLight.intensity = 0.45;
      this.hemiLight.color.setHex(0x19273b);
      this.hemiLight.groundColor.setHex(0x0a1016);
      this.fog.color.setHex(0x0c1524);
      this.scene.background = new THREE.Color(0x080e18);
      starsMat.opacity = 0.95;
    }
  }
}
