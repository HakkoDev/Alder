import { useCallback, useEffect, useRef, useState } from "react";
import type { UIEvent } from "react";

/** Virtualizes fixed-height rows without adding another dependency to the app. */
export function useVirtualRows(rowHeight: number, count: number, overscan = 8) {
    const ref = useRef<HTMLDivElement>(null);
    const [viewport, setViewport] = useState({ top: 0, height: 600 });
    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        const measure = () =>
            setViewport((previous) => {
                const next = { top: element.scrollTop, height: element.clientHeight };
                return previous.top === next.top && previous.height === next.height ? previous : next;
            });
        measure();
        const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
        observer?.observe(element);
        return () => observer?.disconnect();
    }, []);
    const onScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
        const top = event.currentTarget.scrollTop;
        setViewport((previous) => (previous.top === top ? previous : { ...previous, top }));
    }, []);
    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        const maxTop = Math.max(0, count * rowHeight - element.clientHeight);
        if (element.scrollTop > maxTop) {
            element.scrollTop = maxTop;
            setViewport((previous) => ({ ...previous, top: maxTop }));
        }
    }, [count, rowHeight]);
    const start = Math.min(
        Math.max(0, count - 1),
        Math.max(0, Math.floor(Math.min(viewport.top, Math.max(0, count * rowHeight - viewport.height)) / rowHeight) - overscan),
    );
    const end = Math.min(count, Math.ceil((viewport.top + viewport.height) / rowHeight) + overscan);
    return { ref, onScroll, start, end, before: start * rowHeight, after: Math.max(0, (count - end) * rowHeight) };
}
