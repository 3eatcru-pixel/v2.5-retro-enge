export interface QuestObjective {
  id: string;
  type: 'kill' | 'collect' | 'talk' | 'explore';
  targetId: string;
  amountRequired: number;
  amountCurrent: number;
  isCompleted: boolean;
}

export interface QuestReward {
  type: 'xp' | 'currency' | 'item';
  id?: string; // used for items
  amount: number;
}

export interface Quest {
  id: string;
  name: string;
  description: string;
  status: 'available' | 'active' | 'completed' | 'failed';
  objectives: QuestObjective[];
  rewards: QuestReward[];
}

export class QuestSystem {
  public quests: Map<string, Quest> = new Map();

  registerQuest(quest: Quest): void {
    if (!this.quests.has(quest.id)) {
      this.quests.set(quest.id, quest);
    }
  }

  startQuest(questId: string): boolean {
    const quest = this.quests.get(questId);
    if (!quest) return false;
    if (quest.status !== 'available') return false;
    
    quest.status = 'active';
    return true;
  }

  updateObjective(questId: string, objectiveId: string, amount: number): boolean {
    const quest = this.quests.get(questId);
    if (!quest || quest.status !== 'active') return false;

    const objective = quest.objectives.find(o => o.id === objectiveId);
    if (!objective || objective.isCompleted) return false;

    objective.amountCurrent += amount;
    if (objective.amountCurrent >= objective.amountRequired) {
      objective.amountCurrent = objective.amountRequired;
      objective.isCompleted = true;
    }

    this.checkCompletion(questId);
    return true;
  }

  private checkCompletion(questId: string): void {
    const quest = this.quests.get(questId);
    if (!quest || quest.status !== 'active') return;

    const allCompleted = quest.objectives.every(o => o.isCompleted);
    if (allCompleted) {
      quest.status = 'completed';
      this.grantRewards(quest);
    }
  }

  private grantRewards(quest: Quest): void {
    // Integrate with Player Inventory and Stats!
    console.log(`Quest ${quest.id} completed! Rewards granted:`, quest.rewards);
  }
}
