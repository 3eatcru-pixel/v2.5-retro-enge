import { retroEventBus } from '../../../core/events/EventBus';

export interface DialogueNode {
  id: string;
  speaker: string;
  text: string;
  choices?: DialogueChoice[];
  actionEvent?: string; // Optional event to emit when this node is reached
}

export interface DialogueChoice {
  text: string;
  nextNodeId: string;
  conditionEvent?: string; // Optional logic check
}

export interface DialogueTree {
  id: string;
  nodes: Record<string, DialogueNode>;
  startNodeId: string;
}

export class DialogueSystem {
  public trees: Map<string, DialogueTree> = new Map();
  private currentTree: DialogueTree | null = null;
  private currentNode: DialogueNode | null = null;

  registerTree(tree: DialogueTree): void {
    if (this.trees.has(tree.id)) {
      console.warn(`Dialogue tree ${tree.id} already exists. Overwriting.`);
    }
    this.trees.set(tree.id, tree);
  }

  startDialogue(treeId: string): boolean {
    const tree = this.trees.get(treeId);
    if (!tree) {
      console.error(`Dialogue tree ${treeId} not found.`);
      return false;
    }

    const startNode = tree.nodes[tree.startNodeId];
    if (!startNode) {
      console.error(`Start node ${tree.startNodeId} not found in tree ${treeId}.`);
      return false;
    }

    this.currentTree = tree;
    this.currentNode = startNode;
    
    retroEventBus.emit('dialogue-started', { treeId, startNodeId: this.currentNode.id });
    
    if (this.currentNode.actionEvent) {
      retroEventBus.emit('dialogue-action', { actionEvent: this.currentNode.actionEvent, nodeId: this.currentNode.id });
    }
    
    return true;
  }

  getCurrentNode(): DialogueNode | null {
    return this.currentNode;
  }

  isActive(): boolean {
    return this.currentNode !== null;
  }

  chooseOption(choiceIndex: number): boolean {
    if (!this.currentNode || !this.currentNode.choices) {
      return false;
    }

    const choice = this.currentNode.choices[choiceIndex];
    if (!choice) return false;

    const nextNode = this.currentTree?.nodes[choice.nextNodeId];
    if (nextNode) {
      this.currentNode = nextNode;
      retroEventBus.emit('dialogue-node-changed', { nodeId: this.currentNode.id });
      
      if (this.currentNode.actionEvent) {
        retroEventBus.emit('dialogue-action', { actionEvent: this.currentNode.actionEvent, nodeId: this.currentNode.id });
      }
      return true;
    } else {
      this.endDialogue();
      return true; // Chosen path ends the conversation
    }
  }

  next(): boolean {
    if (!this.currentNode) return false;

    // If there are specific multiple choices, the player must use chooseOption
    if (this.currentNode.choices && this.currentNode.choices.length > 0) {
       // Auto-advance if there's only one choice and it's a linear path
       if (this.currentNode.choices.length === 1) {
          return this.chooseOption(0);
       }
       return false;
    }

    // Default next node logic (without choices, conversation ends)
    this.endDialogue();
    return true;
  }

  endDialogue(): void {
    if (this.currentTree) {
      retroEventBus.emit('dialogue-ended', { treeId: this.currentTree.id });
    }
    this.currentTree = null;
    this.currentNode = null;
  }

  clear(): void {
    this.trees.clear();
    this.currentTree = null;
    this.currentNode = null;
  }
}

export const globalDialogueSystem = new DialogueSystem();
