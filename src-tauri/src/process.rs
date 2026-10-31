//! The single construction point for native child processes. Windows GUI apps must
//! suppress consoles for ALL Git, gh and helper subprocesses, including piped Git apply.
use std::process::Command;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

pub(crate) fn command(program: &str) -> Command {
    let mut command = Command::new(program);
    #[cfg(windows)]
    command.creation_flags(CREATE_NO_WINDOW);
    command
}

#[tauri::command]
pub(crate) fn open_external_url(url: String) -> Result<(), String> {
    // Only GitHub links can be opened from GitHub views. Do not pass arbitrary
    // strings to OS URL handlers, even though this is an argv-based process.
    let authority = url
        .strip_prefix("https://")
        .and_then(|remainder| remainder.split(&['/', '?', '#'][..]).next())
        .ok_or("Only HTTPS GitHub links are allowed")?;
    let hostname = authority.to_ascii_lowercase();
    if hostname != "github.com" && !hostname.ends_with(".github.com") {
        return Err("Only HTTPS GitHub links are allowed".into());
    }
    if hostname.contains('@') || hostname.contains(':') || hostname.contains('\\') || url.chars().any(char::is_control) {
        return Err("Invalid GitHub URL".into());
    }
    #[cfg(target_os = "windows")]
    {
        command("rundll32.exe")
            .args(["url.dll,FileProtocolHandler", &url])
            .spawn()
            .map_err(|e| format!("Could not open browser: {e}"))?;
    }
    #[cfg(target_os = "macos")]
    {
        command("open").arg(&url).spawn().map_err(|e| format!("Could not open browser: {e}"))?;
    }
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        command("xdg-open").arg(&url).spawn().map_err(|e| format!("Could not open browser: {e}"))?;
    }
    Ok(())
}

#[cfg(all(test, windows))]
mod windows_tests {
    use super::*;
    #[test]
    fn every_child_uses_create_no_window() {
        // The spawned child checks its OWN console handle through Win32.
        // This exercises process creation, not just the helper's source text.
        let probe = r#"Add-Type -Namespace Native -Name Console -MemberDefinition '[DllImport("kernel32.dll")] public static extern System.IntPtr GetConsoleWindow();'; if ([Native.Console]::GetConsoleWindow() -ne [IntPtr]::Zero) { exit 1 }"#;
        let output = command("powershell.exe")
            .args(["-NoProfile", "-NonInteractive", "-Command", probe])
            .output()
            .expect("launch Windows subprocess");
        assert!(
            output.status.success(),
            "child has console or probe failed: {}",
            String::from_utf8_lossy(&output.stderr)
        );
    }
}
