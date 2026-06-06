export type InputBinding = {
  keys?: string[];
  buttons?: number[];
};

export class InputManager {
  private currentKeys: Set<string> = new Set();
  private previousKeys: Set<string> = new Set();

  private currentButtons: Set<number> = new Set();
  private previousButtons: Set<number> = new Set();

  private touchState: { active: boolean; x: number; y: number } = { active: false, x: 0, y: 0 };
  
  private actionMap: Record<string, InputBinding> = {};
  
  private initialized: boolean = false;

  private onKeyDown = (e: KeyboardEvent) => {
    this.currentKeys.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.currentKeys.delete(e.code);
  };

  private onTouchStart = (e: TouchEvent) => {
    this.touchState.active = true;
    if (e.touches.length > 0) {
      this.touchState.x = e.touches[0].clientX;
      this.touchState.y = e.touches[0].clientY;
    }
  };

  private onTouchMove = (e: TouchEvent) => {
    if (e.touches.length > 0) {
      this.touchState.x = e.touches[0].clientX;
      this.touchState.y = e.touches[0].clientY;
    }
  };

  private onTouchEnd = (e: TouchEvent) => {
    if (e.touches.length === 0) {
      this.touchState.active = false;
    }
  };

  public init() {
    if (this.initialized) return;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('touchstart', this.onTouchStart);
    window.addEventListener('touchmove', this.onTouchMove);
    window.addEventListener('touchend', this.onTouchEnd);
    this.initialized = true;
  }

  public destroy() {
    if (!this.initialized) return;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('touchstart', this.onTouchStart);
    window.removeEventListener('touchmove', this.onTouchMove);
    window.removeEventListener('touchend', this.onTouchEnd);
    this.currentKeys.clear();
    this.previousKeys.clear();
    this.currentButtons.clear();
    this.previousButtons.clear();
    this.touchState.active = false;
    this.initialized = false;
  }

  public registerAction(action: string, binding: InputBinding) {
    this.actionMap[action] = binding;
  }

  public update() {
    // 1. Snapshot previous state before polling new state
    this.previousKeys = new Set(this.currentKeys);
    this.previousButtons = new Set(this.currentButtons);

    // 2. Poll gamepads (Web Gamepad API is state-based, needs polling per frame)
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (let i = 0; i < gamepads.length; i++) {
        const gp = gamepads[i];
        if (gp) {
            for (let b = 0; b < gp.buttons.length; b++) {
                if (gp.buttons[b].pressed) {
                    this.currentButtons.add(b);
                } else {
                    this.currentButtons.delete(b);
                }
            }
        }
    }
  }

  // --- RAW INPUT QUERIES ---

  public isKeyDown(code: string): boolean {
    return this.currentKeys.has(code);
  }

  public isKeyJustPressed(code: string): boolean {
    return this.currentKeys.has(code) && !this.previousKeys.has(code);
  }

  public isKeyJustReleased(code: string): boolean {
    return !this.currentKeys.has(code) && this.previousKeys.has(code);
  }

  public isButtonDown(button: number): boolean {
    return this.currentButtons.has(button);
  }

  public isButtonJustPressed(button: number): boolean {
    return this.currentButtons.has(button) && !this.previousButtons.has(button);
  }

  public isButtonJustReleased(button: number): boolean {
    return !this.currentButtons.has(button) && this.previousButtons.has(button);
  }

  // --- ACTION QUERIES ---

  public isActionDown(action: string): boolean {
    const binding = this.actionMap[action];
    if (!binding) return false;

    if (binding.keys && binding.keys.some(k => this.isKeyDown(k))) return true;
    if (binding.buttons && binding.buttons.some(b => this.isButtonDown(b))) return true;

    return false;
  }

  public isActionJustPressed(action: string): boolean {
    const binding = this.actionMap[action];
    if (!binding) return false;

    if (binding.keys && binding.keys.some(k => this.isKeyJustPressed(k))) return true;
    if (binding.buttons && binding.buttons.some(b => this.isButtonJustPressed(b))) return true;

    return false;
  }

  public isActionJustReleased(action: string): boolean {
    const binding = this.actionMap[action];
    if (!binding) return false;

    if (binding.keys && binding.keys.some(k => this.isKeyJustReleased(k))) return true;
    if (binding.buttons && binding.buttons.some(b => this.isButtonJustReleased(b))) return true;

    return false;
  }

  public getTouch() {
    return this.touchState;
  }
}
