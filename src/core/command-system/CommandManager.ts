export interface ICommand {
  execute(): void;
  undo(): void;
}

export class CommandManager {
  private history: ICommand[] = [];
  private redoStack: ICommand[] = [];
  private maxHistory: number;

  constructor(maxHistory: number = 100) {
    this.maxHistory = maxHistory;
  }

  executeCommand(command: ICommand) {
    command.execute();
    this.history.push(command);
    if (this.history.length > this.maxHistory) {
      this.history.shift(); // Remove the oldest command to prevent memory leaking
    }
    // Clear redo stack once a new command is executed
    this.redoStack = [];
  }

  undo() {
    const command = this.history.pop();
    if (command) {
      command.undo();
      this.redoStack.push(command);
    }
  }

  redo() {
    const command = this.redoStack.pop();
    if (command) {
      command.execute();
      this.history.push(command);
    }
  }

  clear() {
    this.history = [];
    this.redoStack = [];
  }
}
