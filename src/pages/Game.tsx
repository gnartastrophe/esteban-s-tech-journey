import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Maximize2, Gamepad2 } from "lucide-react";
import { Game } from "@/game/Game";
import { H, W } from "@/game/engine/gfx";
import type { Btn } from "@/game/engine/input";
import { TitleScene } from "@/game/scenes/title";

const GamePage = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const navigate = useNavigate();
  const [size, setSize] = useState({ w: W * 2, h: H * 2 });
  const [touch, setTouch] = useState(false);

  useEffect(() => {
    document.title = "Final Floor — A Crawl Fantasy";
    setTouch(window.matchMedia("(pointer: coarse)").matches);
    const canvas = canvasRef.current!;
    const game = new Game(canvas);
    gameRef.current = game;
    game.onExit = () => navigate("/");
    game.input.attach(window);
    game.push(new TitleScene(game));
    game.start();
    if (import.meta.env.DEV) {
      (window as unknown as { __game: Game }).__game = game;
      import("@/game/debug").then((m) => m.install(game));
    }
    return () => {
      game.stop();
      game.input.detach();
      gameRef.current = null;
    };
  }, [navigate]);

  useEffect(() => {
    const fit = () => {
      const el = stageRef.current;
      if (!el) return;
      const aw = el.clientWidth;
      const ah = el.clientHeight;
      let s = Math.min(aw / W, ah / H);
      if (s >= 2) s = Math.floor(s);
      setSize({ w: Math.floor(W * s), h: Math.floor(H * s) });
    };
    fit();
    window.addEventListener("resize", fit);
    const ro = new ResizeObserver(fit);
    if (stageRef.current) ro.observe(stageRef.current);
    return () => {
      window.removeEventListener("resize", fit);
      ro.disconnect();
    };
  }, [touch]);

  const fullscreen = () => {
    const el = document.documentElement;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else el.requestFullscreen?.();
  };

  const press = (b: Btn, down: boolean) => gameRef.current?.input.setVirtual(b, down);

  return (
    <div className="fixed inset-0 flex flex-col bg-[#05040c] text-[#c8c0e8] select-none">
      <header className="flex items-center justify-between px-3 py-2 text-sm border-b border-[#2a2448]">
        <Link to="/" className="flex items-center gap-1.5 hover:text-white transition-colors">
          <ArrowLeft size={16} /> Portfolio
        </Link>
        <span className="font-mono tracking-widest text-[#ffe080]">FINAL FLOOR</span>
        <div className="flex items-center gap-3">
          <button onClick={() => setTouch((t) => !t)} className="hover:text-white transition-colors" title="Toggle touch controls" aria-label="Toggle touch controls">
            <Gamepad2 size={16} />
          </button>
          <button onClick={fullscreen} className="hover:text-white transition-colors" title="Fullscreen" aria-label="Fullscreen">
            <Maximize2 size={16} />
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col landscape:flex-row">
        {touch && (
          <div className="hidden landscape:flex items-center pl-4" style={{ touchAction: "none" }}>
            <DPad press={press} />
          </div>
        )}
        <div ref={stageRef} className="relative flex-1 min-h-0 min-w-0 flex items-center justify-center p-2">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            style={{ width: size.w, height: size.h, imageRendering: "pixelated" }}
            className="shadow-[0_0_40px_rgba(90,60,200,0.35)] outline-none"
            tabIndex={0}
            aria-label="Final Floor game screen"
          />
        </div>
        {touch && (
          <div className="hidden landscape:flex items-center pr-4" style={{ touchAction: "none" }}>
            <ActionButtons press={press} />
          </div>
        )}
      </div>

      {touch ? (
        <div className="flex landscape:hidden items-center justify-between px-6 pb-5 pt-1" style={{ touchAction: "none" }}>
          <DPad press={press} />
          <ActionButtons press={press} />
        </div>
      ) : (
        <p className="text-center text-xs pb-3 text-[#7a72a0] font-mono">
          Arrows/WASD move · Z/Space/Enter confirm &amp; attack · X back · Esc/C menu · M map · Shift run
        </p>
      )}
    </div>
  );
};

type Press = (b: Btn, down: boolean) => void;

function DPad({ press }: { press: Press }) {
  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-1 w-36 h-36">
      <span />
      <PadButton label="▲" onPress={(d) => press("up", d)} />
      <span />
      <PadButton label="◀" onPress={(d) => press("left", d)} />
      <span />
      <PadButton label="▶" onPress={(d) => press("right", d)} />
      <span />
      <PadButton label="▼" onPress={(d) => press("down", d)} />
      <span />
    </div>
  );
}

function ActionButtons({ press }: { press: Press }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <PadButton label="MENU" small onPress={(d) => press("menu", d)} />
      <div className="flex gap-3 items-end">
        <PadButton label="B" round onPress={(d) => press("cancel", d)} />
        <PadButton label="A" round accent onPress={(d) => press("confirm", d)} />
      </div>
    </div>
  );
}

function PadButton({ label, onPress, round, accent, small }: { label: string; onPress: (down: boolean) => void; round?: boolean; accent?: boolean; small?: boolean }) {
  const base = round ? "w-16 h-16 rounded-full text-lg" : small ? "px-4 h-8 rounded-md text-xs" : "rounded-md text-lg";
  const color = accent ? "bg-[#d04060] active:bg-[#ff6080]" : "bg-[#2a2448] active:bg-[#4a4080]";
  return (
    <button
      className={`${base} ${color} text-white font-bold flex items-center justify-center shadow-md`}
      style={{ touchAction: "none" }}
      onPointerDown={(e) => {
        e.preventDefault();
        onPress(true);
        try {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        } catch {
          /* synthetic pointers can't be captured */
        }
      }}
      onPointerUp={() => onPress(false)}
      onPointerCancel={() => onPress(false)}
      onPointerLeave={() => onPress(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
}

export default GamePage;
