import { useSyncExternalStore } from "react";
import { type ThemeId, themePresets } from "./theme-presets";
export type AppearanceMode = "dark" | "light" | "system";
export type Density = "comfortable" | "compact";
export interface Preferences {
    themeId: ThemeId;
    appearance: AppearanceMode;
    density: Density;
    fontScale: number;
    loadOnlineFonts: boolean;
    autoFetch: boolean;
    showHiddenRepositories: boolean;
}
export const DEFAULT_PREFERENCES: Readonly<Preferences> = Object.freeze({
    themeId: "alder",
    appearance: "dark",
    density: "comfortable",
    fontScale: 100,
    loadOnlineFonts: false,
    autoFetch: false,
    showHiddenRepositories: false,
});
const KEY = "alder.preferences.v2";
const LEGACY_KEY = "alder.preferences.v1";
export function normalizePreferences(input: unknown): Preferences {
    const v = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
    return {
        themeId: typeof v.themeId === "string" && Object.hasOwn(themePresets, v.themeId) ? (v.themeId as ThemeId) : DEFAULT_PREFERENCES.themeId,
        appearance: v.appearance === "light" || v.appearance === "dark" || v.appearance === "system" ? v.appearance : DEFAULT_PREFERENCES.appearance,
        density: v.density === "compact" ? "compact" : "comfortable",
        fontScale: typeof v.fontScale === "number" && Number.isInteger(v.fontScale) && v.fontScale >= 85 && v.fontScale <= 125 ? v.fontScale : 100,
        loadOnlineFonts: v.loadOnlineFonts === true,
        autoFetch: v.autoFetch === true,
        showHiddenRepositories: v.showHiddenRepositories === true,
    };
}
function read(): Preferences {
    try {
        const current = localStorage.getItem(KEY);
        if (current !== null) return normalizePreferences(JSON.parse(current));
        const previous = localStorage.getItem(LEGACY_KEY);
        if (previous === null) return { ...DEFAULT_PREFERENCES };
        const migrated = normalizePreferences(JSON.parse(previous));
        // v0.1 shipped with Sage Garden as the default. Migrate its default
        // to Alder while preserving every non-color user preference.
        if (migrated.themeId === "sage-garden") migrated.themeId = "alder";
        localStorage.setItem(KEY, JSON.stringify(migrated));
        return migrated;
    } catch {
        return { ...DEFAULT_PREFERENCES };
    }
}
let current = read();
const subs = new Set<() => void>();
function notify() {
    for (const subscriber of subs) subscriber();
}
export function getPreferences() {
    return current;
}
export function subscribePreferences(fn: () => void) {
    subs.add(fn);
    return () => {
        subs.delete(fn);
    };
}
export function usePreferences() {
    return useSyncExternalStore(subscribePreferences, getPreferences, () => DEFAULT_PREFERENCES);
}
export function updatePreferences(patch: Partial<Preferences>) {
    const next = normalizePreferences({ ...current, ...patch });
    if (JSON.stringify(next) === JSON.stringify(current)) return;
    current = next;
    try {
        localStorage.setItem(KEY, JSON.stringify(current));
    } catch {
        /* In-memory settings still work. */
    }
    notify();
}
export function startPreferencesBridge() {
    const onStorage = (e: StorageEvent) => {
        if (e.key === KEY) {
            current = read();
            notify();
        }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
}
