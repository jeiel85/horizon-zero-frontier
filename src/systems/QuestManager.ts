import * as THREE from 'three';
import { soundManager } from '../audio/SoundManager';
import { Player } from '../player/Player';

export interface Objective {
  id: string;
  description: string;
  targetCount: number;
  currentCount: number;
  completed: boolean;
  targetPos?: THREE.Vector3;
}

export interface Quest {
  id: string;
  type: 'main' | 'sub';
  title: string;
  chapter?: number;
  description: string;
  objectives: Objective[];
  completed: boolean;
  active: boolean;
  rewardExp: number;
  rewardShards: number;
}

/**
 * QuestManager.ts
 * Coordinates 5 Main Story Chapters (~1+ hour progression) and 3 Subquests,
 * objectives tracking, cinematic dialogue popups, and milestone events.
 */
export class QuestManager {
  public quests: Quest[] = [];
  public currentQuestIndex: number = 0;
  private onQuestUpdatedCallback: (() => void) | null = null;
  private onVictoryCallback: (() => void) | null = null;

  constructor() {
    this.initializeQuests();
  }

  public setCallbacks(onUpdate: () => void, onVictory: () => void) {
    this.onQuestUpdatedCallback = onUpdate;
    this.onVictoryCallback = onVictory;
  }

  private initializeQuests() {
    this.quests = [
      // --- MAIN QUESTLINE ---
      {
        id: 'main_ch1',
        type: 'main',
        chapter: 1,
        title: "제 1장: 사냥꾼의 증표 (The Hunter's Path)",
        description:
          '부족의 성인식을 앞두고, 고대 유물 포커스(Focus)를 활용하여 정찰 기계 워처를 사냥하고 광학 렌즈를 회수하세요.',
        active: true,
        completed: false,
        rewardExp: 150,
        rewardShards: 50,
        objectives: [
          {
            id: 'scan_watcher',
            description: '포커스 [V] 스캔으로 주변의 워처(Watcher) 약점 확인',
            targetCount: 1,
            currentCount: 0,
            completed: false,
            targetPos: new THREE.Vector3(25, 0, 30),
          },
          {
            id: 'hunt_watcher',
            description: '활을 조준하여 워처 2마리 사냥',
            targetCount: 2,
            currentCount: 0,
            completed: false,
          },
          {
            id: 'recover_lens',
            description: '워처 잔해에서 광학 렌즈 부품 회수',
            targetCount: 1,
            currentCount: 0,
            completed: false,
          },
        ],
      },
      {
        id: 'main_ch2',
        type: 'main',
        chapter: 2,
        title: '제 2장: 야생의 질주 (Wild Stride)',
        description:
          '남쪽 초원의 스트라이더 무리를 추적하세요. 등 뒤의 블레이즈 캐니스터를 화염 화살로 유폭시키고, 오버라이드하여 첫 탈것에 탑승하세요.',
        active: false,
        completed: false,
        rewardExp: 300,
        rewardShards: 100,
        objectives: [
          {
            id: 'detonate_canister',
            description: '화염 화살 [2]로 스트라이더의 등 뒤 블레이즈 캐니스터 1회 유폭',
            targetCount: 1,
            currentCount: 0,
            completed: false,
            targetPos: new THREE.Vector3(-40, 0, 110),
          },
          {
            id: 'override_strider',
            description: '은신 접근하여 스트라이더 [F]키로 오버라이드(해킹) 성공',
            targetCount: 1,
            currentCount: 0,
            completed: false,
          },
          {
            id: 'ride_strider',
            description: '오버라이드된 스트라이더에 [E]키로 탑승하여 전력 질주',
            targetCount: 1,
            currentCount: 0,
            completed: false,
          },
        ],
      },
      {
        id: 'main_ch3',
        type: 'main',
        chapter: 3,
        title: '제 3장: 도둑맞은 불꽃 (Stolen Fire)',
        description:
          '붉은 협곡 전초기지를 위협하는 맹수형 기계 래피저를 격퇴하세요. 등의 헤비 캐논을 집중 사격하여 뜯어내야 합니다.',
        active: false,
        completed: false,
        rewardExp: 500,
        rewardShards: 200,
        objectives: [
          {
            id: 'reach_canyon',
            description: '북동쪽 붉은 협곡 전초기지 야영지 도달',
            targetCount: 1,
            currentCount: 0,
            completed: false,
            targetPos: new THREE.Vector3(130, 0, -90),
          },
          {
            id: 'tear_cannon',
            description: '래피저(Ravager)의 등 뒤 [헤비 캐논] 부위 파괴',
            targetCount: 1,
            currentCount: 0,
            completed: false,
          },
          {
            id: 'defeat_ravager',
            description: '무력화된 래피저 처치 및 가마솥 보안 키 획득',
            targetCount: 1,
            currentCount: 0,
            completed: false,
          },
        ],
      },
      {
        id: 'main_ch4',
        type: 'main',
        chapter: 4,
        title: '제 4장: 톨넥의 눈 (Eye of the Tallneck)',
        description:
          '거대한 통신 기계 톨넥의 머리 위로 올라타 통신 코어를 오버라이드하여 전 대지의 지도를 동기화하세요.',
        active: false,
        completed: false,
        rewardExp: 750,
        rewardShards: 300,
        objectives: [
          {
            id: 'climb_tallneck',
            description: '남부 평원의 톨넥(Tallneck) 원반 머리 위 착지',
            targetCount: 1,
            currentCount: 0,
            completed: false,
            targetPos: new THREE.Vector3(-40, 0, 200),
          },
          {
            id: 'sync_map',
            description: '톨넥 머리 중앙 통신 코어 [F]키로 오버라이드 동기화',
            targetCount: 1,
            currentCount: 0,
            completed: false,
          },
        ],
      },
      {
        id: 'main_ch5',
        type: 'main',
        chapter: 5,
        title: '제 5장: 가마솥 시그마의 심장 (Heart of Cauldron SIGMA)',
        description:
          '북서쪽 분화구의 가마솥 지하 유적으로 진입하여, 기계 군단의 최종 정점인 티라노 보스 [선더죠]를 토벌하고 세계를 정화하세요.',
        active: false,
        completed: false,
        rewardExp: 2000,
        rewardShards: 1000,
        objectives: [
          {
            id: 'enter_cauldron',
            description: '북서쪽 가마솥 시그마 입구 도달 및 방어막 해제',
            targetCount: 1,
            currentCount: 0,
            completed: false,
            targetPos: new THREE.Vector3(-260, 0, -195),
          },
          {
            id: 'tear_launchers',
            description: '선더죠의 디스크 런처 2문 모두 부위 파괴',
            targetCount: 2,
            currentCount: 0,
            completed: false,
          },
          {
            id: 'defeat_thunderjaw',
            description: '최종 보스 [선더죠 (Thunderjaw)] 완전 토벌',
            targetCount: 1,
            currentCount: 0,
            completed: false,
          },
        ],
      },
      // --- SUB QUESTS ---
      {
        id: 'sub_flowers',
        type: 'sub',
        title: '서브 퀘스트: 고대 금속 꽃 수집 (Metal Flowers)',
        description: '구시대 인류의 시(Poetry)가 기록된 신비한 금속 꽃 5개를 오픈월드에서 찾아 수집하세요.',
        active: true,
        completed: false,
        rewardExp: 400,
        rewardShards: 250,
        objectives: [
          {
            id: 'gather_5_flowers',
            description: '금속 꽃 수집',
            targetCount: 5,
            currentCount: 0,
            completed: false,
          },
        ],
      },
      {
        id: 'sub_campfires',
        type: 'sub',
        title: '서브 퀘스트: 미개척 야영지 탐사',
        description: '오픈월드 4곳의 캠프파이어를 모두 발견하여 안전한 세이브 및 빠른 이동 거점을 확보하세요.',
        active: true,
        completed: false,
        rewardExp: 300,
        rewardShards: 150,
        objectives: [
          {
            id: 'find_campfires',
            description: '야영지 모닥불 활성화',
            targetCount: 4,
            currentCount: 1, // First one unlocked
            completed: false,
          },
        ],
      },
    ];
  }

  public getActiveMainQuest(): Quest | null {
    return this.quests.find((q) => q.type === 'main' && q.active && !q.completed) || null;
  }

  public reportEvent(
    eventType: string,
    player: Player,
    amount: number = 1
  ) {
    let changed = false;

    this.quests.forEach((quest) => {
      if (!quest.active || quest.completed) return;

      quest.objectives.forEach((obj) => {
        if (!obj.completed && obj.id === eventType) {
          obj.currentCount = Math.min(obj.targetCount, obj.currentCount + amount);
          if (obj.currentCount >= obj.targetCount) {
            obj.completed = true;
          }
          changed = true;
        }
      });

      // Check if all objectives of this quest are complete
      const allDone = quest.objectives.every((o) => o.completed);
      if (allDone) {
        quest.completed = true;
        changed = true;
        this.grantRewards(quest, player);

        // Advance to next main chapter
        if (quest.type === 'main' && quest.chapter) {
          if (quest.chapter === 5) {
            // GAME VICTORY!
            if (this.onVictoryCallback) this.onVictoryCallback();
          } else {
            const nextCh = this.quests.find((q) => q.chapter === quest.chapter! + 1);
            if (nextCh) {
              nextCh.active = true;
            }
          }
        }
      }
    });

    if (changed && this.onQuestUpdatedCallback) {
      this.onQuestUpdatedCallback();
    }
  }

  private grantRewards(quest: Quest, player: Player) {
    soundManager.playQuestComplete();
    player.exp += quest.rewardExp;
    if (player.exp >= player.nextLevelExp) {
      player.level++;
      player.maxHp += 20;
      player.hp = player.maxHp;
      player.exp -= player.nextLevelExp;
      player.nextLevelExp = Math.round(player.nextLevelExp * 1.5);
    }
  }
}
