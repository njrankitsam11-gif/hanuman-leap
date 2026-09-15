import type { PointerEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Full-cover panel over the canvas. `interactive` panels swallow pointer-down so
 * taps on them never reach the flap handler underneath.
 */
export function Overlay({
  children,
  className,
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  const stop = (e: PointerEvent) => e.stopPropagation();
  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-y-auto bg-background/75 px-5 py-6 text-center backdrop-blur-sm",
        className,
      )}
      onPointerDown={interactive ? stop : undefined}
    >
      {children}
    </div>
  );
}

/** Stops a control's pointer-down from bubbling to the flap handler. */
export const stopPointer = (e: PointerEvent) => e.stopPropagation();
