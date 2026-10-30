import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";

export function useChangesPane() {
    const [paneWidth, setPaneWidth] = useState(() => {
        try {
            const value = Number(localStorage.getItem("alder.changes-pane-width"));
            return Number.isFinite(value) && value >= 250 && value <= 900 ? value : 365;
        } catch {
            return 365;
        }
    });
    const changesRef = useRef<HTMLDivElement>(null);
    const cleanup = useRef<() => void>(() => {});
    useEffect(() => () => cleanup.current(), []);

    const startResize = (event: ReactPointerEvent<HTMLDivElement>) => {
        event.preventDefault();
        const container = changesRef.current;
        if (!container) return;
        cleanup.current();
        const bounds = container.getBoundingClientRect();
        const widthAt = (x: number) => Math.min(Math.max(250, x - bounds.left), Math.max(250, bounds.width - 260));
        const move = (next: PointerEvent) => setPaneWidth(widthAt(next.clientX));
        const done = (next: PointerEvent) => {
            try {
                localStorage.setItem("alder.changes-pane-width", String(Math.round(widthAt(next.clientX))));
            } catch {
                // Resizing remains available without persistent browser storage.
            }
            cleanup.current();
        };
        cleanup.current = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", done);
            window.removeEventListener("pointercancel", cancel);
        };
        const cancel = () => cleanup.current();
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", done, { once: true });
        window.addEventListener("pointercancel", cancel, { once: true });
    };

    return { paneWidth, setPaneWidth, changesRef, startResize };
}
