import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { HueSlider, TransparencySlider } from "@/components/overlay/ColorPicker";
import { hexToHue, hueToHex } from "@/lib/color";
import { NODE_BY_ID } from "@/lib/nodes";
import {
  applyMorph,
  applyRect,
  clamp01,
  morphAt,
  openProgress,
  seedRect,
  type OpenOrigin,
  type Rect,
} from "@/lib/openAnim";
import { PALETTE } from "@/lib/palette";
import { getMeta, useNexus } from "@/lib/store";

type Edge = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const MIN_W = 280;
const MIN_H = 260;
const FALLBACK_HUE = 207;

function paintWindow(
  el: HTMLElement,
  chrome: HTMLElement | null,
  morph: { rect: Rect; radius: string; rotate: number },
  t: number,
) {
  applyMorph(el, morph);
  if (chrome) {
    const fade = clamp01((t - 0.58) / 0.28);
    chrome.style.opacity = String(fade);
    chrome.style.pointerEvents = fade > 0.85 ? "auto" : "none";
  }
}

export function GlassPanel() {
  const openId = useNexus((s) => s.openId);
  const origin = useNexus((s) => s.openOrigin);
  const startedAt = useNexus((s) => s.openStartedAt);
  const token = useNexus((s) => s.openToken);
  if (!openId || !origin || !startedAt) return null;
  return (
    <NodeWindow
      key={token}
      openId={openId}
      origin={origin}
      startedAt={startedAt}
    />
  );
}

function NodeWindow({
  openId,
  origin,
  startedAt,
}: {
  openId: string;
  origin: OpenOrigin;
  startedAt: number;
}) {
  const meta = useNexus((s) => s.meta);
  const close = useNexus((s) => s.close);
  const patchNode = useNexus((s) => s.patchNode);
  const node = NODE_BY_ID.get(openId);
  const saved = getMeta(meta, openId);

  const asideRef = useRef<HTMLElement>(null);
  const chromeRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const geomRef = useRef<Rect>(seedRect(origin));
  const [expanded, setExpanded] = useState(false);
  const [draftTitle, setDraftTitle] = useState(saved.title);
  const [draftNotes, setDraftNotes] = useState(saved.notes);
  const [editingTitle, setEditingTitle] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);

  const seed = seedRect(origin);

  useEffect(() => {
    const current = getMeta(useNexus.getState().meta, openId);
    setDraftTitle(current.title);
    setDraftNotes(current.notes);
  }, [openId]);

  useEffect(() => {
    if (!editingTitle) return;
    titleRef.current?.focus();
    titleRef.current?.select();
  }, [editingTitle]);

  useLayoutEffect(() => {
    const aside = asideRef.current;
    if (!aside) return;
    const seedMorph = morphAt(origin, 0);
    const depth = origin.depth;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    geomRef.current = seedMorph.rect;
    paintWindow(aside, chromeRef.current, seedMorph, 0);

    if (reduced) {
      const done = morphAt(origin, 1);
      geomRef.current = done.rect;
      paintWindow(aside, chromeRef.current, done, 1);
      setExpanded(true);
      return;
    }

    let raf = 0;
    const tick = () => {
      const now = performance.now();
      const t = openProgress(now, startedAt, depth);
      const morph = t <= 0 ? morphAt(origin, 0) : morphAt(origin, t);
      geomRef.current = morph.rect;
      paintWindow(aside, chromeRef.current, morph, t);
      if (t < 1) raf = requestAnimationFrame(tick);
      else {
        const done = morphAt(origin, 1);
        geomRef.current = done.rect;
        paintWindow(aside, chromeRef.current, done, 1);
        setExpanded(true);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [origin, startedAt]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  if (!node || !saved) return null;

  const accent = saved.color ?? PALETTE.ice;
  const hue = saved.color ? hexToHue(saved.color) : FALLBACK_HUE;

  const saveTitle = () => {
    if (draftTitle.trim() !== saved.title) {
      patchNode(openId, { title: draftTitle });
    }
    setEditingTitle(false);
  };

  return (
    <aside
      ref={asideRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby="nexus-node-title"
      className="glass-panel window-orb pointer-events-auto fixed z-50 flex flex-col overflow-hidden"
      style={{
        left: seed.x,
        top: seed.y,
        width: seed.w,
        height: seed.h,
        borderRadius: Math.min(seed.w, seed.h) / 2,
        boxShadow: `0 0 0 1px color-mix(in oklab, ${accent} 35%, rgb(232 238 246 / 0.12)), 0 28px 80px rgb(0 0 0 / 0.5), inset 0 1px 0 rgb(255 255 255 / 0.14)`,
        background: `rgb(11 23 48 / ${saved.opacity})`,
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        ref={chromeRef}
        className="window-chrome flex min-h-0 flex-1 flex-col"
      >
        <header
          className="flex shrink-0 cursor-grab items-center gap-2 px-3 pt-3 pb-2 active:cursor-grabbing"
          onPointerDown={
            expanded ? startDrag(geomRef, asideRef, chromeRef) : undefined
          }
        >
          <div
            className="size-3.5 shrink-0 rounded-full"
            style={{ background: accent }}
            aria-hidden
          />
          {editingTitle ? (
            <input
              ref={titleRef}
              id="nexus-node-title"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") {
                  setDraftTitle(saved.title);
                  setEditingTitle(false);
                }
              }}
              placeholder="Untitled node"
              className="title-input"
              aria-label="Node title"
            />
          ) : (
            <h2
              id="nexus-node-title"
              className="title-input flex items-center truncate select-none"
              onDoubleClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setEditingTitle(true);
              }}
            >
              {draftTitle.trim() || "Untitled node"}
            </h2>
          )}
          <button
            type="button"
            onClick={close}
            onPointerDown={(e) => e.stopPropagation()}
            className="glass-orb size-9 shrink-0 transition-transform duration-150 ease-out active:scale-[0.96]"
            aria-label="Close"
          >
            <X className="size-3.5 text-fg" strokeWidth={1.6} />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col px-4 pb-2">
          <label
            htmlFor="node-notes"
            className="mb-1.5 text-2xs uppercase tracking-label text-muted"
          >
            Notes
          </label>
          <textarea
            id="node-notes"
            value={draftNotes}
            onChange={(e) => {
              const value = e.target.value;
              setDraftNotes(value);
              patchNode(openId, { notes: value });
            }}
            placeholder="Write a note for this node."
            className="notes-editor min-h-0 flex-1"
          />
        </div>

        <div className="shrink-0 px-3 pb-3">
          <button
            type="button"
            className="flex h-9 w-full items-center gap-2 rounded-lg px-1 text-sm text-muted transition-[color,background-color] duration-150 hover:bg-fg/5 hover:text-fg"
            onClick={() => setColorOpen((v) => !v)}
            aria-expanded={colorOpen}
            aria-label="Color"
          >
            <span
              className="size-3 rounded-full"
              style={{ background: accent }}
              aria-hidden
            />
            <span className="flex-1 text-left">Color</span>
            {colorOpen ? (
              <ChevronDown className="size-4" strokeWidth={1.6} />
            ) : (
              <ChevronRight className="size-4" strokeWidth={1.6} />
            )}
          </button>
          {colorOpen ? (
            <div className="flex flex-col gap-2 px-1 pt-2 pb-1">
              <HueSlider
                hue={hue}
                onChange={(next) => {
                  patchNode(openId, { color: hueToHex(next) });
                }}
              />
              <TransparencySlider
                opacity={saved.opacity}
                onChange={(next) => {
                  patchNode(openId, { opacity: next });
                }}
              />
            </div>
          ) : null}
        </div>
      </div>

      {expanded
        ? (["n", "s", "e", "w", "ne", "nw", "se", "sw"] as Edge[]).map(
            (edge) => (
              <span
                key={edge}
                className={`resize-${edge}`}
                onPointerDown={startResize(edge, geomRef, asideRef, chromeRef)}
              />
            ),
          )
        : null}
    </aside>
  );
}

function startDrag(
  geomRef: { current: Rect },
  asideRef: { current: HTMLElement | null },
  chromeRef: { current: HTMLElement | null },
) {
  return (e: ReactPointerEvent) => {
    if ((e.target as HTMLElement).closest("button, input, textarea")) return;
    e.preventDefault();
    e.stopPropagation();
    const origin = {
      x: e.clientX,
      y: e.clientY,
      px: geomRef.current.x,
      py: geomRef.current.y,
    };
    const move = (ev: PointerEvent) => {
      const w = geomRef.current.w;
      const h = geomRef.current.h;
      const x = Math.max(8, Math.min(window.innerWidth - w - 8, origin.px + ev.clientX - origin.x));
      const y = Math.max(8, Math.min(window.innerHeight - h - 8, origin.py + ev.clientY - origin.y));
      geomRef.current = { x, y, w, h };
      const el = asideRef.current;
      if (el) applyRect(el, geomRef.current, 16);
      if (chromeRef.current) {
        chromeRef.current.style.opacity = "1";
        chromeRef.current.style.pointerEvents = "auto";
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
}

function startResize(
  edge: Edge,
  geomRef: { current: Rect },
  asideRef: { current: HTMLElement | null },
  chromeRef: { current: HTMLElement | null },
) {
  return (e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const g = geomRef.current;
    const origin = {
      x: e.clientX,
      y: e.clientY,
      px: g.x,
      py: g.y,
      w: g.w,
      h: g.h,
    };
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - origin.x;
      const dy = ev.clientY - origin.y;
      let x = origin.px;
      let y = origin.py;
      let w = origin.w;
      let h = origin.h;
      if (edge.includes("e")) w = origin.w + dx;
      if (edge.includes("s")) h = origin.h + dy;
      if (edge.includes("w")) {
        w = origin.w - dx;
        x = origin.px + dx;
      }
      if (edge.includes("n")) {
        h = origin.h - dy;
        y = origin.py + dy;
      }
      w = Math.max(MIN_W, Math.min(window.innerWidth - 16, w));
      h = Math.max(MIN_H, Math.min(window.innerHeight - 16, h));
      if (edge.includes("w")) x = origin.px + origin.w - w;
      if (edge.includes("n")) y = origin.py + origin.h - h;
      x = Math.max(8, Math.min(window.innerWidth - w - 8, x));
      y = Math.max(8, Math.min(window.innerHeight - h - 8, y));
      geomRef.current = { x, y, w, h };
      const el = asideRef.current;
      if (el) applyRect(el, geomRef.current, 16);
      if (chromeRef.current) {
        chromeRef.current.style.opacity = "1";
        chromeRef.current.style.pointerEvents = "auto";
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
}
