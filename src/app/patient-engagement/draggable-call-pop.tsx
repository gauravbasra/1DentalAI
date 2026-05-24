"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

export function DraggableCallPop({ callId, children }: { callId: string; children: ReactNode }) {
  const popRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const [closed, setClosed] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(storageKey(callId)) === "closed";
  });
  const [position, setPosition] = useState(() => {
    if (typeof window === "undefined") return { x: 20, y: 96 };
    const width = Math.min(420, window.innerWidth - 32);
    return {
      x: Math.max(16, window.innerWidth - width - 20),
      y: 96,
    };
  });

  const close = useCallback(() => {
    sessionStorage.setItem(storageKey(callId), "closed");
    setClosed(true);
  }, [callId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close]);

  function moveTo(clientX: number, clientY: number) {
    const rect = popRef.current?.getBoundingClientRect();
    const width = rect?.width ?? 420;
    const height = rect?.height ?? 260;
    const nextX = clientX - (dragRef.current?.offsetX ?? 0);
    const nextY = clientY - (dragRef.current?.offsetY ?? 0);
    setPosition({
      x: clamp(nextX, 8, Math.max(8, window.innerWidth - width - 8)),
      y: clamp(nextY, 8, Math.max(8, window.innerHeight - height - 8)),
    });
  }

  if (closed) return null;

  return (
    <aside
      ref={popRef}
      className="fixed z-[60] w-[420px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl bg-neutral-950 text-white shadow-2xl"
      style={{ left: position.x, top: position.y }}
    >
      <div
        className="call-pop-drag-handle cursor-move touch-none select-none border-b border-white/15 px-5 py-4"
        onPointerDown={(event) => {
          const rect = popRef.current?.getBoundingClientRect();
          dragRef.current = {
            pointerId: event.pointerId,
            offsetX: event.clientX - (rect?.left ?? 0),
            offsetY: event.clientY - (rect?.top ?? 0),
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (dragRef.current?.pointerId !== event.pointerId) return;
          moveTo(event.clientX, event.clientY);
        }}
        onPointerUp={(event) => {
          if (dragRef.current?.pointerId === event.pointerId) {
            dragRef.current = null;
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        onPointerCancel={() => {
          dragRef.current = null;
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Incoming call</p>
            <p className="mt-1 text-xs text-white/70">Drag this header to move the call pop</p>
          </div>
          <button
            type="button"
            onClick={close}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-2xl leading-none text-white hover:bg-white/20"
            aria-label="Close incoming call pop"
          >
            ×
          </button>
        </div>
      </div>
      {children}
    </aside>
  );
}

function storageKey(callId: string) {
  return `1dentalai:incoming-call-pop:${callId}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
