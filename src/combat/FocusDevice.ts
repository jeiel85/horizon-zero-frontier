import * as THREE from 'three';
import { soundManager } from '../audio/SoundManager';
import { MachineBase } from '../machines/MachineBase';
import { Vegetation } from '../world/Vegetation';

/**
 * FocusDevice.ts
 * Implements the holographic AR Focus Vision scanner:
 * Highlights enemy weakpoints, canisters, tracks, health, and collectibles.
 */
export class FocusDevice {
  public isActive: boolean = false;
  private overlayElement: HTMLElement;
  private markersContainer: HTMLElement;
  private targetInfoBox: HTMLElement;
  private targetNameEl: HTMLElement;
  private targetHpFillEl: HTMLElement;
  private targetWeakpointsEl: HTMLElement;

  constructor() {
    this.overlayElement = document.getElementById('focus-overlay')!;
    this.markersContainer = document.getElementById('focus-markers-container')!;
    this.targetInfoBox = document.getElementById('target-info-box')!;
    this.targetNameEl = document.getElementById('target-name')!;
    this.targetHpFillEl = document.getElementById('target-hp-fill')!;
    this.targetWeakpointsEl = document.getElementById('target-weakpoints')!;
  }

  public toggle(): boolean {
    this.isActive = !this.isActive;
    if (this.isActive) {
      this.overlayElement.classList.remove('hidden');
      soundManager.playFocusActivate();
      soundManager.playFocusPing();
    } else {
      this.overlayElement.classList.add('hidden');
      this.targetInfoBox.classList.add('hidden');
      this.clearMarkers();
    }
    return this.isActive;
  }

  public update(
    camera: THREE.PerspectiveCamera,
    machines: MachineBase[],
    vegetation: Vegetation
  ) {
    if (!this.isActive) return;

    this.clearMarkers();

    let closestMachine: MachineBase | null = null;
    let minDistance = Infinity;

    // 1. Scan Machines & Project 3D tags into 2D Screen Space
    machines.forEach((machine) => {
      if (machine.isDead) return;

      const screenPos = this.toScreenPosition(machine.mesh.position, camera);
      if (!screenPos.visible) return;

      const dist = camera.position.distanceTo(machine.mesh.position);
      if (dist < minDistance && dist < 120) {
        minDistance = dist;
        closestMachine = machine;
      }

      // Create Hologram AR Tag on Screen
      const marker = document.createElement('div');
      marker.className = 'focus-machine-tag';
      marker.style.position = 'absolute';
      marker.style.left = `${screenPos.x}px`;
      marker.style.top = `${screenPos.y - 45}px`;
      marker.style.transform = 'translate(-50%, -50%)';
      marker.style.pointerEvents = 'none';
      marker.innerHTML = `
        <div style="font-family: 'Orbitron', monospace; font-size: 11px; color: #00f0ff; background: rgba(0,20,40,0.85); border: 1px solid #00f0ff; padding: 2px 6px; border-radius: 3px; text-shadow: 0 0 5px #00f0ff;">
          ${machine.name} [${Math.round(dist)}m]
          <div style="font-size: 9px; color: #ffaa00;">${machine.weakpointDescription}</div>
        </div>
      `;
      this.markersContainer.appendChild(marker);
    });

    // 2. Scan Collectibles & Campfires
    vegetation.gatherables.forEach((item) => {
      if (item.gathered) return;
      const screenPos = this.toScreenPosition(item.position, camera);
      if (!screenPos.visible || camera.position.distanceTo(item.position) > 65) return;

      const marker = document.createElement('div');
      marker.style.position = 'absolute';
      marker.style.left = `${screenPos.x}px`;
      marker.style.top = `${screenPos.y}px`;
      marker.style.transform = 'translate(-50%, -50%)';
      marker.style.pointerEvents = 'none';
      marker.innerHTML = `
        <div style="color: ${item.type === 'metal_flower' ? '#ec4899' : '#22c55e'}; font-size: 10px; font-weight: bold; background: rgba(0,0,0,0.7); padding: 1px 4px; border-radius: 2px;">
          ◆ ${item.name}
        </div>
      `;
      this.markersContainer.appendChild(marker);
    });

    // 3. Highlight Closest Machine Info in HUD Box
    if (closestMachine) {
      this.targetInfoBox.classList.remove('hidden');
      const m = closestMachine as MachineBase;
      this.targetNameEl.textContent = `기계 식별: ${m.name}`;
      const hpPct = Math.max(0, (m.hp / m.maxHp) * 100);
      this.targetHpFillEl.style.width = `${hpPct}%`;
      this.targetWeakpointsEl.innerHTML = `취약 부위: <span class="highlight">${m.weakpointDescription}</span>`;
    } else {
      this.targetInfoBox.classList.add('hidden');
    }
  }

  private clearMarkers() {
    this.markersContainer.innerHTML = '';
  }

  private toScreenPosition(
    pos: THREE.Vector3,
    camera: THREE.PerspectiveCamera
  ): { x: number; y: number; visible: boolean } {
    const vector = pos.clone().project(camera);

    // If behind the camera
    if (vector.z > 1) {
      return { x: 0, y: 0, visible: false };
    }

    const halfW = window.innerWidth / 2;
    const halfH = window.innerHeight / 2;

    const x = vector.x * halfW + halfW;
    const y = -vector.y * halfH + halfH;

    // Check bounds
    const inBounds = x >= 0 && x <= window.innerWidth && y >= 0 && y <= window.innerHeight;
    return { x, y, visible: inBounds };
  }
}
