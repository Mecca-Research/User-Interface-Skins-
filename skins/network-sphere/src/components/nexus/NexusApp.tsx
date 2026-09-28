import { useEffect, useState } from "react";
import { GlassPanel } from "@/components/overlay/GlassPanel";
import { Hud } from "@/components/overlay/Hud";
import { cn } from "@/lib/utils";
import { useNexus } from "@/lib/store";

export function NexusApp() {
  const [canvas, setCanvas] = useState<React.ComponentType<{
    onDraggingChange: (dragging: boolean) => void;
  }> | null>(null);
  const [dragging, setDragging] = useState(false);
  const hoveredId = useNexus((s) => s.hoveredId);

  useEffect(() => {
    let live = true;
    void import("@/components/scene/NexusCanvas").then((mod) => {
      if (live) setCanvas(() => mod.NexusCanvas);
    });
    return () => {
      live = false;
    };
  }, []);

  const cursor = dragging
    ? "cursor-grabbing"
    : hoveredId
      ? "cursor-pointer"
      : "cursor-grab";

  return (
    <main className="relative h-dvh min-h-dvh w-full overflow-hidden bg-bg text-fg">
      <div className={cn("absolute inset-0 z-0 isolate", cursor)}>
        {canvas ? (
          (() => {
            const Canvas = canvas;
            return <Canvas onDraggingChange={setDragging} />;
          })()
        ) : (
          <div className="absolute inset-0 bg-bg" />
        )}
      </div>
      <div className="vignette pointer-events-none absolute inset-0 z-[5]" />
      <Hud />
      <GlassPanel />
    </main>
  );
}
