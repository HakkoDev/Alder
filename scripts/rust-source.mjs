import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Existing source contracts operate across modules, not a monolithic lib.rs.
const base = fileURLToPath(new URL("../src-tauri/src/", import.meta.url));
function gather(directory) {
    return readdirSync(directory, { withFileTypes: true })
        .sort((a, b) => a.name.localeCompare(b.name))
        .flatMap((entry) => {
            const path = join(directory, entry.name);
            return entry.isDirectory() ? gather(path) : entry.name.endsWith(".rs") ? [readFileSync(path, "utf8")] : [];
        });
}
export function rustSource() {
    const files = gather(base);
    const root = readFileSync(join(base, "lib.rs"), "utf8");
    // Preserve handler registration after the operation modules for source contracts.
    return files.join("\n") + "\n" + root;
}
