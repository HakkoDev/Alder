use tauri::Config;

/// A dev build without a signed update endpoint must not install the updater plugin.
pub(crate) fn is_updater_configured(config: &Config) -> bool {
    config.plugins.0.get("updater").is_some_and(|updater| {
        updater.get("pubkey").and_then(|v| v.as_str()).is_some_and(|v| !v.trim().is_empty())
            && updater.get("endpoints").and_then(|v| v.as_array()).is_some_and(|v| !v.is_empty())
    })
}

#[tauri::command]
pub(crate) fn updater_configuration(app: tauri::AppHandle) -> serde_json::Value {
    serde_json::json!({ "configured": is_updater_configured(app.config()) })
}
