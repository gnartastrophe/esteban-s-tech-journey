export type Btn = "up" | "down" | "left" | "right" | "confirm" | "cancel" | "menu" | "run" | "map";

const KEYMAP: Record<string, Btn> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
  KeyZ: "confirm",
  Space: "confirm",
  Enter: "confirm",
  NumpadEnter: "confirm",
  KeyX: "cancel",
  Backspace: "cancel",
  Escape: "menu",
  KeyC: "menu",
  Tab: "menu",
  ShiftLeft: "run",
  ShiftRight: "run",
  KeyM: "map",
};

const REPEAT_DELAY = 0.32;
const REPEAT_RATE = 0.075;

export class Input {
  private held = new Set<Btn>();
  private virtual = new Set<Btn>();
  private justPressed = new Set<Btn>();
  private repeatTimers = new Map<Btn, number>();
  private repeated = new Set<Btn>();
  /** Raw characters typed this frame (for name entry). */
  typed: string[] = [];
  /** When true, letter keys go to `typed` instead of mapping to buttons. */
  textMode = false;
  /** Called on the first user gesture so audio can unlock. */
  onGesture: (() => void) | null = null;
  private target: HTMLElement | Window | null = null;

  attach(target: HTMLElement | Window) {
    this.target = target;
    target.addEventListener("keydown", this.onKeyDown as EventListener);
    target.addEventListener("keyup", this.onKeyUp as EventListener);
    window.addEventListener("blur", this.onBlur);
  }

  detach() {
    if (!this.target) return;
    this.target.removeEventListener("keydown", this.onKeyDown as EventListener);
    this.target.removeEventListener("keyup", this.onKeyUp as EventListener);
    window.removeEventListener("blur", this.onBlur);
    this.target = null;
  }

  private onKeyDown = (e: KeyboardEvent) => {
    this.onGesture?.();
    if (this.textMode) {
      if (e.key.length === 1 && /[A-Za-z0-9 '\-.!]/.test(e.key)) {
        this.typed.push(e.key);
        e.preventDefault();
        return;
      }
      if (e.key === "Backspace") {
        this.typed.push("\b");
        e.preventDefault();
        return;
      }
      if (e.key === "Enter") {
        this.typed.push("\n");
        e.preventDefault();
        return;
      }
    }
    const b = KEYMAP[e.code];
    if (!b) return;
    e.preventDefault();
    if (e.repeat) return;
    this.press(b);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const b = KEYMAP[e.code];
    if (!b) return;
    this.held.delete(b);
  };

  private onBlur = () => {
    this.held.clear();
    this.virtual.clear();
  };

  private press(b: Btn) {
    if (!this.held.has(b) && !this.virtual.has(b)) {
      this.justPressed.add(b);
      this.repeatTimers.set(b, REPEAT_DELAY);
    }
    this.held.add(b);
  }

  /** On-screen touch buttons. */
  setVirtual(b: Btn, down: boolean) {
    this.onGesture?.();
    if (down) {
      if (!this.held.has(b) && !this.virtual.has(b)) {
        this.justPressed.add(b);
        this.repeatTimers.set(b, REPEAT_DELAY);
      }
      this.virtual.add(b);
    } else this.virtual.delete(b);
  }

  isDown(b: Btn) {
    return this.held.has(b) || this.virtual.has(b);
  }

  pressed(b: Btn) {
    return this.justPressed.has(b);
  }

  /** Pressed this frame, or auto-repeating while held (menus). */
  repeat(b: Btn) {
    return this.justPressed.has(b) || this.repeated.has(b);
  }

  anyPressed() {
    return this.justPressed.size > 0 || this.typed.length > 0;
  }

  /** Swallow everything pressed this frame (after a scene change). */
  consume() {
    this.justPressed.clear();
    this.repeated.clear();
    this.typed = [];
  }

  update(dt: number) {
    this.repeated.clear();
    for (const b of ["up", "down", "left", "right", "confirm", "cancel"] as Btn[]) {
      if (!this.isDown(b)) continue;
      let t = this.repeatTimers.get(b) ?? REPEAT_DELAY;
      t -= dt;
      if (t <= 0) {
        this.repeated.add(b);
        t += REPEAT_RATE;
      }
      this.repeatTimers.set(b, t);
    }
  }

  endFrame() {
    this.justPressed.clear();
    this.typed = [];
  }

  /** Current held direction for movement, latest-axis wins. */
  dir(): [number, number] {
    if (this.isDown("up")) return [0, -1];
    if (this.isDown("down")) return [0, 1];
    if (this.isDown("left")) return [-1, 0];
    if (this.isDown("right")) return [1, 0];
    return [0, 0];
  }
}
