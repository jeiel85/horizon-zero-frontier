import * as THREE from 'three';
import { Player } from './Player';
import { Terrain } from '../world/Terrain';

/**
 * PlayerController.ts
 * Implements full 3rd-person TPS orbital camera, keyboard/mouse input,
 * collision with terrain, sprint, jump, dodge roll, and aim mode zoom.
 */
export class PlayerController {
  public player: Player;
  public camera: THREE.PerspectiveCamera;
  public terrain: Terrain;

  // Camera angles
  public yaw: number = 0;
  public pitch: number = 0.25;
  public cameraDistance: number = 5.5;
  public aimZoomDistance: number = 2.4;
  public currentCameraDistance: number = 5.5;

  // Physics & Movement
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public isGrounded: boolean = true;
  public isCrouching: boolean = false;
  public isSprinting: boolean = false;
  public isDodgeRolling: boolean = false;
  public dodgeTimer: number = 0;
  public dodgeDirection: THREE.Vector3 = new THREE.Vector3();

  // Speed constants
  private readonly WALK_SPEED = 6.0;
  private readonly SPRINT_SPEED = 11.5;
  private readonly CROUCH_SPEED = 3.2;
  private readonly JUMP_FORCE = 9.5;
  private readonly GRAVITY = -24.0;

  // Input state
  public keys: { [key: string]: boolean } = {};
  public isRightMouseDown: boolean = false;
  public isLeftMouseDown: boolean = false;
  public isPointerLocked: boolean = false;

  constructor(player: Player, camera: THREE.PerspectiveCamera, terrain: Terrain, domElement: HTMLElement) {
    this.player = player;
    this.camera = camera;
    this.terrain = terrain;

    this.setupInputs(domElement);
  }

  private setupInputs(domElement: HTMLElement) {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'KeyC') {
        this.isCrouching = !this.isCrouching;
      }
      if (e.code === 'AltLeft' || e.code === 'AltRight') {
        this.triggerDodgeRoll();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    domElement.addEventListener('mousedown', (e) => {
      if (!this.isPointerLocked) {
        domElement.requestPointerLock();
      }
      if (e.button === 0) this.isLeftMouseDown = true;
      if (e.button === 2) this.isRightMouseDown = true;
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.isLeftMouseDown = false;
      if (e.button === 2) this.isRightMouseDown = false;
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === domElement;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isPointerLocked) return;
      const sensitivity = 0.0022;
      this.yaw -= e.movementX * sensitivity;
      this.pitch -= e.movementY * sensitivity;

      // Clamp pitch to avoid camera flipping
      this.pitch = Math.max(-0.6, Math.min(1.1, this.pitch));
    });

    // Disable context menu for right-click aim
    domElement.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private triggerDodgeRoll() {
    if (this.isDodgeRolling || !this.isGrounded || this.player.stamina < 15) return;
    this.isDodgeRolling = true;
    this.dodgeTimer = 0.45;
    this.player.stamina -= 15;

    // Dodge in current movement direction or backward
    const moveDir = this.getMovementVector();
    if (moveDir.lengthSq() > 0.01) {
      this.dodgeDirection.copy(moveDir).normalize();
    } else {
      this.dodgeDirection.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
    }
  }

  private getMovementVector(): THREE.Vector3 {
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const moveDir = new THREE.Vector3();

    if (this.keys['KeyW']) moveDir.add(forward);
    if (this.keys['KeyS']) moveDir.sub(forward);
    if (this.keys['KeyD']) moveDir.add(right);
    if (this.keys['KeyA']) moveDir.sub(right);

    return moveDir;
  }

  public update(delta: number) {
    if (this.player.isDead) return;

    // 1. Aiming state
    this.player.isAiming = this.isRightMouseDown;

    // 2. Sprint & Stamina logic
    const wantsSprint = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
    if (wantsSprint && !this.isCrouching && !this.player.isAiming && this.player.stamina > 0) {
      this.isSprinting = true;
      this.player.stamina = Math.max(0, this.player.stamina - delta * 18);
    } else {
      this.isSprinting = false;
      this.player.stamina = Math.min(this.player.maxStamina, this.player.stamina + delta * 14);
    }

    // 3. Movement Direction & Speed
    let currentSpeed = this.WALK_SPEED;
    if (this.isCrouching) currentSpeed = this.CROUCH_SPEED;
    else if (this.isSprinting) currentSpeed = this.SPRINT_SPEED;
    else if (this.player.isAiming) currentSpeed = this.WALK_SPEED * 0.55;

    const moveVector = this.getMovementVector();
    const isMoving = moveVector.lengthSq() > 0.001;

    if (this.isDodgeRolling) {
      this.dodgeTimer -= delta;
      this.velocity.x = this.dodgeDirection.x * 16.0;
      this.velocity.z = this.dodgeDirection.z * 16.0;
      if (this.dodgeTimer <= 0) {
        this.isDodgeRolling = false;
      }
    } else if (isMoving) {
      moveVector.normalize().multiplyScalar(currentSpeed);
      this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, moveVector.x, delta * 10);
      this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, moveVector.z, delta * 10);

      // Rotate player towards movement direction (unless aiming)
      if (!this.player.isAiming) {
        const targetAngle = Math.atan2(moveVector.x, moveVector.z);
        this.player.mesh.rotation.y = THREE.MathUtils.lerp(
          this.player.mesh.rotation.y,
          targetAngle,
          delta * 12
        );
      }
    } else {
      this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, 0, delta * 12);
      this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, 0, delta * 12);
    }

    // When aiming, player always faces camera forward
    if (this.player.isAiming) {
      this.player.mesh.rotation.y = this.yaw + Math.PI;
    }

    // 4. Jump & Gravity
    if (this.isGrounded && this.keys['Space'] && !this.isCrouching && !this.isDodgeRolling) {
      this.velocity.y = this.JUMP_FORCE;
      this.isGrounded = false;
    }

    this.velocity.y += this.GRAVITY * delta;

    // Apply movement
    this.player.mesh.position.x += this.velocity.x * delta;
    this.player.mesh.position.z += this.velocity.z * delta;
    this.player.mesh.position.y += this.velocity.y * delta;

    // 5. Terrain Ground Collision
    const terrainHeight = this.terrain.getTerrainHeight(
      this.player.mesh.position.x,
      this.player.mesh.position.z
    );

    if (this.player.mesh.position.y <= terrainHeight) {
      this.player.mesh.position.y = terrainHeight;
      this.velocity.y = 0;
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }

    // 6. Update Character Rig Animation
    const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    const speedRatio = horizontalSpeed / this.SPRINT_SPEED;
    this.player.updateAnimation(delta, speedRatio, this.isCrouching, this.isGrounded);

    // 7. Third-Person Orbit Camera Follow
    this.updateCamera(delta);
  }

  private updateCamera(delta: number) {
    const targetDist = this.player.isAiming ? this.aimZoomDistance : this.cameraDistance;
    this.currentCameraDistance = THREE.MathUtils.lerp(
      this.currentCameraDistance,
      targetDist,
      delta * 12
    );

    // Camera target: Player head position with slight right shoulder offset during aim
    const headPos = this.player.mesh.position.clone().add(new THREE.Vector3(0, 1.65, 0));
    
    // Shoulder offset
    const shoulderOffset = this.player.isAiming ? 0.75 : 0.25;
    const rightVec = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    headPos.add(rightVec.multiplyScalar(shoulderOffset));

    // Calculate orbital position
    const cosPitch = Math.cos(this.pitch);
    const sinPitch = Math.sin(this.pitch);
    const camOffset = new THREE.Vector3(
      Math.sin(this.yaw) * cosPitch * this.currentCameraDistance,
      sinPitch * this.currentCameraDistance,
      Math.cos(this.yaw) * cosPitch * this.currentCameraDistance
    );

    const desiredCamPos = headPos.clone().add(camOffset);

    // Terrain camera collision: ensure camera doesn't dip underground
    const terrainHeightAtCam = this.terrain.getTerrainHeight(desiredCamPos.x, desiredCamPos.z) + 0.5;
    if (desiredCamPos.y < terrainHeightAtCam) {
      desiredCamPos.y = terrainHeightAtCam;
    }

    this.camera.position.lerp(desiredCamPos, delta * 18);
    this.camera.lookAt(headPos);
  }
}
