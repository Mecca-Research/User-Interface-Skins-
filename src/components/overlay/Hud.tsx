import { useEffect, useRef, useState } from "react";
import { SPHERE_SIZES } from "@/lib/nodes";
import { useNexus } from "@/lib/store";
import { cn } from "@/lib/utils";

export function Hud() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <header className="flex items-start justify-between gap-4 p-5 sm:p-8">
        <p className="hud-enter font-display text-2xl leading-none tracking-tight text-fg">
          Workstation
        </p>
        <SizeSwitch />
      </header>
    </div>
  );
}

function SizeSwitch() {
  const size = useNexus((s) => s.sphereSize);
  const setSphereSize = useNexus((s) => s.setSphereSize);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPtr = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPtr);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPtr);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="pointer-events-auto relative hud-enter-2">
      <button
        type="button"
        className="glass-chip min-h-11 min-w-11 rounded-full px-3.5 py-2 text-right select-none"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Sphere size"
        onDoubleClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <p className="font-display text-sm tabular-nums tracking-tight text-fg">
          {size}
        </p>
        <p className="text-2xs uppercase tracking-label text-muted">Nodes</p>
      </button>

      <div className={cn("size-menu", open && "is-open")}>
        <div className="size-menu-inner">
          <ul
            role="listbox"
            aria-label="Sphere sizes"
            className="glass-panel mt-2 flex flex-col overflow-hidden rounded-2xl py-1"
          >
            {SPHERE_SIZES.map((n) => (
              <li key={n}>
                <button
                  type="button"
                  role="option"
                  aria-selected={n === size}
                  className={cn(
                    "flex min-h-11 w-full items-center justify-between gap-6 px-4 text-sm transition-colors duration-150",
                    n === size ? "text-fg" : "text-muted hover:text-fg",
                  )}
                  onClick={() => {
                    setSphereSize(n);
                    setOpen(false);
                  }}
                >
                  <span className="font-display tabular-nums tracking-tight">
                    {n}
                  </span>
                  <span className="text-2xs uppercase tracking-label">
                    {n === size ? "Active" : "Sphere"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
