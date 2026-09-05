import * as THREE from 'three';
import { Player } from '../player/Player';
import { MachineBase } from '../machines/MachineBase';
import { soundManager } from '../audio/SoundManager';

/**
 * Spear.ts
 * Controls melee light/heavy spear strikes and stealth Machine Overriding.
 */
export class Spear {
  public damage: number = 45;
  public overrideRange: number = 4.2;

  public attack(player: Player, machines: MachineBase[]): { hit: boolean; machine?: MachineBase } {
    if (player.isAttackingMelee || player.isAiming || player.isDead) {
      return { hit: false };
    }

    player.isAttackingMelee = true;
    player.meleeTimer = 0.35;

    // Check hit arc in front of player
    const playerPos = player.mesh.position;
    const forward = new THREE.Vector3(
      Math.sin(player.mesh.rotation.y),
      0,
      Math.cos(player.mesh.rotation.y)
    ).negate();

    for (const machine of machines) {
      if (machine.isDead) continue;
      const toMachine = machine.mesh.position.clone().sub(playerPos);
      const dist = toMachine.length();

      if (dist < 3.8) {
        toMachine.normalize();
        const dot = forward.dot(toMachine);
        if (dot > 0.4) {
          // Melee hit!
          machine.applyDamage(this.damage, 30, 'impact', 'body');
          soundManager.playHitImpact(false);
          return { hit: true, machine };
        }
      }
    }

    return { hit: false };
  }

  public checkOverrideOpportunity(player: Player, machines: MachineBase[]): MachineBase | null {
    const playerPos = player.mesh.position;

    for (const machine of machines) {
      if (machine.isDead || machine.isOverridden) continue;
      const dist = playerPos.distanceTo(machine.mesh.position);

      // Can override if within range AND (machine is unaware OR player is in stealth OR machine is stunned)
      if (dist <= this.overrideRange && (machine.isStunned || machine.state === 'IDLE' || machine.state === 'PATROL' || player.isStealth)) {
        return machine;
      }
    }

    return null;
  }

  public performOverride(player: Player, targetMachine: MachineBase) {
    soundManager.playOverride();
    targetMachine.setOverridden(true);
    player.isAttackingMelee = true;
    player.meleeTimer = 1.0;
  }
}
