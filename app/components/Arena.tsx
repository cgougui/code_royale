import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ARENA_H, ARENA_W } from "@code-royale/engine";
import { ArenaRenderer } from "@code-royale/renderer";
import {
  useArenaPlayback,
  type ArenaPlaybackProps,
} from "~/hooks/use-arena-playback";
import { useRendererText } from "~/i18n";

interface Props extends ArenaPlaybackProps {
  onPickUnit?: (id: number) => void;
  children?: ReactNode;
}

export function Arena(props: Props) {
  const { run, inspect = null, onPickUnit, children } = props;
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ArenaRenderer | null>(null);
  const [size, setSize] = useState({ w: 800, h: 500 });
  const { t } = useTranslation();
  const text = useRendererText();
  // Fit a 16:10 arena into the available space.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      const w = Math.floor(Math.min(cw, ch * (ARENA_W / ARENA_H)));
      setSize({ w, h: Math.floor((w * ARENA_H) / ARENA_W) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    // Created once; its text follows the language through the effect below.
    rendererRef.current ??= new ArenaRenderer(canvasRef.current, text);
    rendererRef.current.resize(size.w, size.h);
  }, [size]);
  useEffect(() => {
    if (rendererRef.current) rendererRef.current.text = text;
  }, [text]);

  const count = useArenaPlayback(rendererRef, props);

  return (
    <div ref={boxRef} className="cr-arena-box">
      <div
        className={`cr-arena-frame ${inspect ? "inspecting" : ""}`}
        style={{ width: size.w, height: size.h }}
      >
        <canvas
          ref={canvasRef}
          onClick={() => {
            const id = rendererRef.current?.hoveredUnit;
            if (inspect && id != null) onPickUnit?.(id);
          }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            rendererRef.current?.setMouse(
              e.clientX - rect.left,
              e.clientY - rect.top,
            );
          }}
          onMouseLeave={() => rendererRef.current?.setMouse(null)}
        />
        {count && (
          <div className="cr-overlay">
            <div
              key={count}
              className={`cr-countdown ${count === "fight" || count === "go" ? "go" : ""}`}
            >
              {count === "fight" || count === "go"
                ? t(`arena.countdown.${count}`)
                : count}
            </div>
          </div>
        )}
        {!run && (
          <div className="cr-preview-hint">
            {t("arena.previewHint")}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
