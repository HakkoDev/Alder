import { Check } from "lucide-react";
import { t, useTranslation } from "../../lib/i18n";
import { type Preferences, updatePreferences } from "../../lib/preferences";
import { type ThemeId, themeIds, themePresets } from "../../lib/theme-presets";
import { SelectField as Select } from "../ui/select";
export function Settings({ preferences: p }: { preferences: Preferences }) {
    const { preference, setLocale } = useTranslation();
    return (
        <div className="settings-scroll">
            <div className="settings-section">
                <h3>{t("settings.language")}</h3>
                <div className="setting-row">
                    <span>{t("settings.languageHelp")}</span>
                    <Select
                        label={t("settings.language")}
                        value={preference}
                        onValueChange={(v) => setLocale(v as "system" | "en")}
                        options={[
                            { value: "system", label: t("settings.system") },
                            { value: "en", label: t("settings.english") },
                        ]}
                    />
                </div>
            </div>
            <div className="settings-section">
                <h3>Display</h3>
                <div className="setting-row">
                    <span>Appearance</span>
                    <Select
                        label="Appearance"
                        value={p.appearance}
                        onValueChange={(v) => updatePreferences({ appearance: v as Preferences["appearance"] })}
                        options={[
                            { value: "dark", label: "Dark" },
                            { value: "light", label: "Light" },
                            { value: "system", label: "System" },
                        ]}
                    />
                </div>
                <div className="setting-row">
                    <span>Density</span>
                    <Select
                        label="Density"
                        value={p.density}
                        onValueChange={(v) => updatePreferences({ density: v as Preferences["density"] })}
                        options={[
                            { value: "comfortable", label: "Comfortable" },
                            { value: "compact", label: "Compact" },
                        ]}
                    />
                </div>
                <div className="setting-row">
                    <span>Font scale</span>
                    <Select
                        label="Font scale"
                        value={String(p.fontScale)}
                        onValueChange={(v) => updatePreferences({ fontScale: Number(v) })}
                        options={[85, 90, 95, 100, 105, 110, 115, 120, 125].map((n) => ({ value: String(n), label: `${n}%` }))}
                    />
                </div>
                <label className="setting-row">
                    <span>
                        Load preset fonts from Google Fonts <small>Optional external network requests</small>
                    </span>
                    <input
                        type="checkbox"
                        checked={p.loadOnlineFonts}
                        onChange={(e) => updatePreferences({ loadOnlineFonts: e.target.checked })}
                    />
                </label>
            </div>
            <div className="settings-section">
                <div className="settings-label">
                    <h3>Color theme</h3>
                    <p>Choose a color theme for Alder.</p>
                </div>
                <div className="theme-grid">
                    {themeIds.map((id) => (
                        <button
                            key={id}
                            className={`theme-choice ${p.themeId === id ? "chosen" : ""}`}
                            onClick={() => updatePreferences({ themeId: id as ThemeId })}
                        >
                            <span
                                className="theme-sample"
                                style={{ background: themePresets[id].dark.background }}
                            >
                                <i style={{ background: themePresets[id].dark.primary }} />
                                <i style={{ background: themePresets[id].dark.accent }} />
                                <i style={{ background: themePresets[id].dark.foreground }} />
                            </span>
                            <span>{themePresets[id].label}</span>
                            {p.themeId === id ? <Check size={14} /> : null}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
