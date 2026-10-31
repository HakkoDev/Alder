import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

/** Open trusted GitHub URLs in the OS browser, not the Tauri webview. */
export async function openGitHubUrl(value: string): Promise<void> {
    try {
        const url = new URL(value);
        if (url.protocol !== "https:" || (url.hostname !== "github.com" && !url.hostname.endsWith(".github.com"))) {
            throw new Error("Only GitHub HTTPS URLs can be opened");
        }
        await invoke("open_external_url", { url: url.toString() });
    } catch (error) {
        toast.error(`Could not open browser: ${error instanceof Error ? error.message : String(error)}`);
    }
}
