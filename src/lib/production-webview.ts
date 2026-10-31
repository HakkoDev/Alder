/** Production-only browser chrome suppression. Radix context menus call
 * preventDefault() themselves, and remain fully functional. */
export function installProductionWebviewGuards(): () => void {
    if (import.meta.env.DEV) return () => {};

    const contextMenu = (event: MouseEvent) => {
        // Suppress the WebView's native Inspect/Back/Refresh menu. Alder's own
        // ContextMenu uses Radix pointer handlers and continues to work.
        event.preventDefault();
    };
    const shortcuts = (event: KeyboardEvent) => {
        const key = event.key.toLowerCase();
        const inspect = key === "f12" || ((event.ctrlKey || event.metaKey) && event.shiftKey && (key === "i" || key === "j" || key === "c"));
        const browser = (event.ctrlKey || event.metaKey) && (key === "r" || key === "u" || key === "p" || key === "s");
        if (inspect || browser || (event.altKey && (key === "arrowleft" || key === "arrowright"))) {
            event.preventDefault();
            event.stopPropagation();
        }
    };
    document.addEventListener("contextmenu", contextMenu);
    document.addEventListener("keydown", shortcuts, true);
    return () => {
        document.removeEventListener("contextmenu", contextMenu);
        document.removeEventListener("keydown", shortcuts, true);
    };
}
