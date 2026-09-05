import * as THREE from 'three';

/**
 * Player.ts
 * Procedural 3D character mesh for hunter 'Ayla' (Nora Outcast)
 * Complete with hierarchical bone joints for running, aiming, spear striking,
 * rolling, focus earpiece, quiver, and bow.
 */
export class Player {
  public mesh: THREE.Group;
  public hp: number = 100;
  public maxHp: number = 100;
  public stamina: number = 100;
  public maxStamina: number = 100;
  public level: number = 1;
  public exp: number = 0;
  public nextLevelExp: number = 100;

  // States
  public isStealth: boolean = false;
  public isAiming: boolean = false;
  public isChargingBow: boolean = false;
  public bowCharge: number = 0; // 0.0 to 1.0
  public isMounted: boolean = false;
  public isDead: boolean = false;
  public isAttackingMelee: boolean = false;
  public meleeTimer: number = 0;
  public invulnerableTimer: number = 0;

  // Rig Joints for animation
  public head: THREE.Group;
  public torso: THREE.Mesh;
  public leftArm: THREE.Group;
  public rightArm: THREE.Group;
  public leftForearm: THREE.Mesh;
  public rightForearm: THREE.Mesh;
  public leftLeg: THREE.Group;
  public rightLeg: THREE.Group;
  public leftShin: THREE.Mesh;
  public rightShin: THREE.Mesh;
  public bowGroup: THREE.Group;
  public spearGroup: THREE.Group;
  public focusDevice: THREE.Mesh;

  private animTime: number = 0;

  constructor(scene: THREE.Scene) {
    this.mesh = new THREE.Group();

    // Materials
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xdca888, roughness: 0.7 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0xb84b29, roughness: 0.8 }); // Signature ginger/red hair
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x4a3424, roughness: 0.85 }); // Nora tunic
    const clothMat = new THREE.MeshStandardMaterial({ color: 0x8b6540, roughness: 0.9 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x718096, metalness: 0.8, roughness: 0.3 });
    const focusCyanMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00d4ff,
      emissiveIntensity: 1.6,
    });

    // 1. Torso & Tunic
    const torsoGeo = new THREE.BoxGeometry(0.7, 0.9, 0.45);
    this.torso = new THREE.Mesh(torsoGeo, leatherMat);
    this.torso.position.y = 1.35;
    this.torso.castShadow = true;
    this.mesh.add(this.torso);

    // Nora Belt & sash
    const beltGeo = new THREE.BoxGeometry(0.74, 0.15, 0.48);
    const belt = new THREE.Mesh(beltGeo, clothMat);
    belt.position.y = -0.35;
    this.torso.add(belt);

    // 2. Head & Hair
    this.head = new THREE.Group();
    this.head.position.y = 0.65;
    this.torso.add(this.head);

    const headGeo = new THREE.BoxGeometry(0.45, 0.48, 0.45);
    const face = new THREE.Mesh(headGeo, skinMat);
    face.castShadow = true;
    this.head.add(face);

    // Braided Hair
    const hairTopGeo = new THREE.BoxGeometry(0.49, 0.25, 0.52);
    const hairTop = new THREE.Mesh(hairTopGeo, hairMat);
    hairTop.position.set(0, 0.2, -0.04);
    this.head.add(hairTop);

    const braidGeo = new THREE.CylinderGeometry(0.08, 0.04, 0.85, 5);
    const braid = new THREE.Mesh(braidGeo, hairMat);
    braid.position.set(0, -0.3, -0.26);
    braid.rotation.x = -0.2;
    this.head.add(braid);

    // Focus Device on right temple
    const focusGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.04, 6);
    focusGeo.rotateZ(Math.PI / 2);
    this.focusDevice = new THREE.Mesh(focusGeo, focusCyanMat);
    this.focusDevice.position.set(0.24, 0.05, 0.05);
    this.head.add(this.focusDevice);

    // 3. Arms
    // Left Arm (Holds Bow when aiming)
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.45, 0.35, 0);
    this.torso.add(this.leftArm);

    const armUpperGeo = new THREE.BoxGeometry(0.22, 0.45, 0.22);
    const leftUpper = new THREE.Mesh(armUpperGeo, skinMat);
    leftUpper.position.y = -0.22;
    this.leftArm.add(leftUpper);

    const forearmGeo = new THREE.BoxGeometry(0.2, 0.45, 0.2);
    this.leftForearm = new THREE.Mesh(forearmGeo, leatherMat);
    this.leftForearm.position.set(0, -0.65, 0);
    this.leftArm.add(this.leftForearm);

    // Hunter Bow attached to left forearm
    this.bowGroup = this.createBowModel();
    this.bowGroup.position.set(-0.12, -0.15, 0.25);
    this.bowGroup.rotation.y = Math.PI / 2;
    this.leftForearm.add(this.bowGroup);

    // Right Arm (Pulls Bowstring / Holds Spear)
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.45, 0.35, 0);
    this.torso.add(this.rightArm);

    const rightUpper = new THREE.Mesh(armUpperGeo, skinMat);
    rightUpper.position.y = -0.22;
    this.rightArm.add(rightUpper);

    this.rightForearm = new THREE.Mesh(forearmGeo, leatherMat);
    this.rightForearm.position.set(0, -0.65, 0);
    this.rightArm.add(this.rightForearm);

    // Spear attached to right hand
    this.spearGroup = this.createSpearModel();
    this.spearGroup.position.set(0.1, -0.1, 0.3);
    this.spearGroup.rotation.x = Math.PI / 2;
    this.spearGroup.visible = false; // Hidden unless melee attacking
    this.rightForearm.add(this.spearGroup);

    // Quiver on back
    const quiverGeo = new THREE.CylinderGeometry(0.12, 0.08, 0.9, 6);
    const quiver = new THREE.Mesh(quiverGeo, leatherMat);
    quiver.position.set(0.18, 0.1, -0.32);
    quiver.rotation.z = -0.35;
    quiver.rotation.x = -0.2;
    this.torso.add(quiver);

    // 4. Legs
    const legUpperGeo = new THREE.BoxGeometry(0.26, 0.5, 0.26);
    const shinGeo = new THREE.BoxGeometry(0.24, 0.5, 0.24);

    // Left Leg
    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.2, -0.45, 0);
    this.torso.add(this.leftLeg);

    const leftThigh = new THREE.Mesh(legUpperGeo, clothMat);
    leftThigh.position.y = -0.25;
    this.leftLeg.add(leftThigh);

    this.leftShin = new THREE.Mesh(shinGeo, leatherMat);
    this.leftShin.position.y = -0.7;
    this.leftLeg.add(this.leftShin);

    // Right Leg
    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.2, -0.45, 0);
    this.torso.add(this.rightLeg);

    const rightThigh = new THREE.Mesh(legUpperGeo, clothMat);
    rightThigh.position.y = -0.25;
    this.rightLeg.add(rightThigh);

    this.rightShin = new THREE.Mesh(shinGeo, leatherMat);
    this.rightShin.position.y = -0.7;
    this.rightLeg.add(this.rightShin);

    scene.add(this.mesh);
  }

  private createBowModel(): THREE.Group {
    const bow = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.7 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8, roughness: 0.3 });

    // Curved limbs
    const upperLimbGeo = new THREE.CylinderGeometry(0.04, 0.025, 0.75, 5);
    const upperLimb = new THREE.Mesh(upperLimbGeo, woodMat);
    upperLimb.position.set(0, 0.35, 0.1);
    upperLimb.rotation.x = -0.35;
    bow.add(upperLimb);

    const lowerLimbGeo = new THREE.CylinderGeometry(0.025, 0.04, 0.75, 5);
    const lowerLimb = new THREE.Mesh(lowerLimbGeo, woodMat);
    lowerLimb.position.set(0, -0.35, 0.1);
    lowerLimb.rotation.x = 0.35;
    bow.add(lowerLimb);

    // Grip
    const gripGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.25, 6);
    const grip = new THREE.Mesh(gripGeo, metalMat);
    bow.add(grip);

    // Bowstring
    const stringGeo = new THREE.CylinderGeometry(0.008, 0.008, 1.45, 3);
    const stringMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const bowString = new THREE.Mesh(stringGeo, stringMat);
    bowString.position.set(0, 0, -0.05);
    bow.add(bowString);

    return bow;
  }

  private createSpearModel(): THREE.Group {
    const spear = new THREE.Group();
    const shaftMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.8 });
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00bcd4,
      emissiveIntensity: 1.2,
      metalness: 0.9,
    });

    // Long shaft
    const shaftGeo = new THREE.CylinderGeometry(0.03, 0.03, 2.2, 6);
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    spear.add(shaft);

    // High tech override spear tip
    const bladeGeo = new THREE.ConeGeometry(0.09, 0.5, 4);
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.y = 1.25;
    spear.add(blade);

    return spear;
  }

  /**
   * Procedural animation updates for walking, sprinting, aiming, and melee
   */
  public updateAnimation(delta: number, speedRatio: number, isCrouching: boolean, isGrounded: boolean) {
    this.animTime += delta * 8 * Math.max(speedRatio, 0.2);

    if (this.isDead) {
      this.mesh.rotation.z = Math.PI / 2;
      this.mesh.position.y = 0.3;
      return;
    }

    // Handle melee attack timer
    if (this.isAttackingMelee) {
      this.meleeTimer -= delta;
      this.spearGroup.visible = true;
      this.rightArm.rotation.x = -Math.PI / 2 + Math.sin(this.meleeTimer * 15) * 0.8;
      if (this.meleeTimer <= 0) {
        this.isAttackingMelee = false;
        this.spearGroup.visible = false;
      }
      return;
    }

    // Aiming state overrides upper body
    if (this.isAiming) {
      this.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0.3, 0.2);
      this.rightArm.rotation.set(-Math.PI / 2 + 0.3, -0.4, 0);
      this.head.rotation.y = 0;
    } else {
      // Natural arm swing during movement
      const armSwing = Math.sin(this.animTime) * 0.6 * speedRatio;
      this.leftArm.rotation.x = armSwing;
      this.rightArm.rotation.x = -armSwing;
      this.leftArm.rotation.z = 0.1;
      this.rightArm.rotation.z = -0.1;
    }

    // Leg movement (Walk / Run / Jump)
    if (!isGrounded) {
      // Jump pose
      this.leftLeg.rotation.x = -0.5;
      this.rightLeg.rotation.x = 0.6;
    } else if (speedRatio > 0.05) {
      // Running stride
      const legSwing = Math.sin(this.animTime) * 0.8 * speedRatio;
      this.leftLeg.rotation.x = legSwing;
      this.rightLeg.rotation.x = -legSwing;
    } else {
      // Idle breathing
      const breath = Math.sin(this.animTime * 0.3) * 0.03;
      this.torso.position.y = 1.35 + breath;
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
    }

    // Crouching adjustments
    if (isCrouching) {
      this.torso.position.y = 0.85;
      this.leftLeg.rotation.x = 0.4;
      this.rightLeg.rotation.x = 0.4;
    }

    // Invulnerability timer countdown & blinking
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= delta;
      this.mesh.visible = Math.floor(this.invulnerableTimer * 10) % 2 === 0;
    } else {
      this.mesh.visible = true;
    }
  }

  public takeDamage(amount: number) {
    if (this.isDead || this.invulnerableTimer > 0) return;
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) {
      this.isDead = true;
    }
  }

  public heal(amount: number) {
    if (this.isDead) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  public respawn(pos: THREE.Vector3) {
    this.isDead = false;
    this.hp = this.maxHp;
    this.stamina = this.maxStamina;
    this.invulnerableTimer = 4.0; // 4 seconds invulnerability on respawn
    this.mesh.visible = true;
    this.mesh.position.copy(pos);
    this.mesh.rotation.set(0, 0, 0);
  }
}
