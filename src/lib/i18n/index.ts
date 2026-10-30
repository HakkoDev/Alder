import { useSyncExternalStore } from "react";
import { en, type TranslationKey } from "./en";
export type Locale = "en"; // Extend when a completed translation catalog is added.
export type LocalePreference = "system" | Locale;
const STORAGE_KEY = "alder.locale";
let selected: LocalePreference = (() => {
    try {
        return localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "system";
    } catch {
        return "system";
    }
})();
const listeners = new Set<() => void>();
export function getLocalePreference() {
    return selected;
}
export function setLocalePreference(value: LocalePreference) {
    selected = value;
    try {
        localStorage.setItem(STORAGE_KEY, value);
    } catch {}
    for (const listener of listeners) listener();
}
const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};
const snapshot = () => selected;
export function useLocale() {
    return useSyncExternalStore(subscribe, snapshot, () => "system" as LocalePreference);
}
// Fallback to English until the selected locale is supported. No partial translations.
export function t(key: TranslationKey, params: Record<string, string | number> = {}) {
    return en[key].replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`));
}
export function useTranslation() {
    useLocale();
    return { t, locale: "en" as Locale, preference: getLocalePreference(), setLocale: setLocalePreference };
}
