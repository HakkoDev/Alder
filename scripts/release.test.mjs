import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { generateUpdaterManifest } from "./create-updater-manifest.mjs";
import { classify, previousTag, renderNotes } from "./generate-release-notes.mjs";
import { releaseOverlay, validateTag } from "./prepare-release.mjs";
import { lockedCargoVersion, mismatches, missingDirectDependencies, requiredTauriVersions } from "./sync-tauri-lock.mjs";
import { verifyRelease } from "./verify-release-assets.mjs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const version = JSON.parse(read("package.json")).version;
const files = [
    `Alder_${version}_x64-setup.exe`,
    `Alder_${version}_x64-setup.exe.sig`,
    `alder_${version}_amd64.AppImage`,
    `alder_${version}_amd64.AppImage.sig`,
    `alder_${version}_amd64.deb`,
];
const fixture = () => ({
    files,
    readSignature: () => "test-only-signature".repeat(4),
    repo: "HakkoDev/Alder",
    tag: `v${version}`,
    version,
    pubDate: "2026-10-30T00:00:00Z",
});

test("release overlay accepts only Alder and a structurally valid public key", () => {
    const bytes = Buffer.alloc(42);
    bytes.write("Ed");
    const publicKey = Buffer.from(`untrusted comment: minisign public key: test fixture\n${bytes.toString("base64")}\n`).toString("base64");
    const overlay = releaseOverlay("HakkoDev/Alder", publicKey);
    assert.equal(overlay.bundle.createUpdaterArtifacts, true);
    assert.deepEqual(overlay.plugins.updater.endpoints, ["https://github.com/HakkoDev/Alder/releases/latest/download/latest.json"]);
    assert.throws(() => releaseOverlay("someone/fork", publicKey));
    for (const invalid of ["", "REPLACE_THIS_KEY", "not-a-real-public-key".repeat(4)]) {
        assert.throws(() => releaseOverlay("HakkoDev/Alder", invalid));
    }
    assert.throws(() => validateTag("v0.0.0", version));
    assert.doesNotThrow(() => validateTag(`v${version}`, version));
});

test("signed manifest combines both platforms and preserves supplied signatures", () => {
    const manifest = generateUpdaterManifest(fixture());
    assert.deepEqual(verifyRelease(manifest, files), []);
    assert.equal(manifest.platforms["windows-x86_64"].signature, fixture().readSignature());
    assert.ok(manifest.platforms["linux-x86_64"].url.startsWith("https://github.com/hakkodev/alder/releases/download/"));
});

test("manifest generation rejects incomplete, duplicate, foreign and mismatched assets", () => {
    for (const suffix of [".deb", ".AppImage", "-setup.exe.sig"]) {
        assert.throws(() => generateUpdaterManifest({ ...fixture(), files: files.filter((name) => !name.endsWith(suffix)) }));
    }
    assert.throws(() => generateUpdaterManifest({ ...fixture(), files: [...files, "extra-setup.exe.sig", "extra-setup.exe"] }));
    assert.throws(() => generateUpdaterManifest({ ...fixture(), repo: "someone/fork" }));
    assert.throws(() => generateUpdaterManifest({ ...fixture(), tag: "v0.0.0" }));
    assert.throws(() => generateUpdaterManifest({ ...fixture(), readSignature: () => "" }));
});

test("release verification rejects unsafe URLs, wrong tags and missing signatures", () => {
    for (const url of [
        "http://github.com/hakkodev/alder/releases/download/",
        "https://example.com/update.exe",
        `https://github.com/hakkodev/alder/releases/download/v0.0.0/${files[0]}`,
        `https://github.com/hakkodev/alder/releases/download/v${version}/${files[0]}?token=unexpected`,
    ]) {
        const manifest = generateUpdaterManifest(fixture());
        manifest.platforms["windows-x86_64"].url = url;
        assert.ok(verifyRelease(manifest, files).length);
    }
    assert.ok(
        verifyRelease(
            generateUpdaterManifest(fixture()),
            files.filter((name) => !name.endsWith(".sig")),
        ).length,
    );
});

test("release notes classify actual Conventional Commits and compare stable versions", () => {
    assert.equal(classify("feat(git)!: change IPC").type, "breaking");
    assert.equal(classify("fix(git): guard paths", "BREAKING CHANGE: new paths").type, "breaking");
    assert.equal(classify("style(ui): format controls").type, "style");
    assert.equal(classify("Merge branch 'main'"), null);
    assert.equal(previousTag(["v0.1.0", "v0.3.0", "v0.3.4", "v0.3.5", "v1.0.0", "unrelated"], "0.3.5"), "v0.3.4");
    const notes = renderNotes(version, [{ subject: "feat(git): add staging" }, { subject: "feat(git): add staging" }], "v0.1.0");
    assert.equal(notes.match(/add staging/g)?.length, 1);
    assert.ok(notes.includes(`Alder v${version}`));
    assert.doesNotMatch(notes, /Morrow|email client/);
});

test("native lockfile contains Alder dependencies and exact Tauri pins", () => {
    const cargo = read("src-tauri/Cargo.toml");
    const lock = read("src-tauri/Cargo.lock");
    assert.deepEqual(mismatches(lock, requiredTauriVersions(cargo)), []);
    assert.deepEqual(missingDirectDependencies(cargo, lock), []);
    assert.equal(lockedCargoVersion(lock, "not-present"), null);
    assert.ok(mismatches("", requiredTauriVersions(cargo)).length);
    assert.ok(missingDirectDependencies(cargo, "").length);
});

test("ported workflows have Alder names and executable package scripts", () => {
    const pkg = JSON.parse(read("package.json"));
    for (const path of ["build-windows.yml", "refresh-lockfile.yml", "release.yml"]) {
        const workflow = read(`.github/workflows/${path}`);
        assert.doesNotMatch(workflow, /morrow/i);
        for (const [, name] of workflow.matchAll(/bun run ([\w:-]+)/g)) {
            assert.ok(pkg.scripts[name], `Missing script ${name} in ${path}`);
        }
        for (const [, script] of workflow.matchAll(/node (scripts\/[\w.-]+)/g)) {
            assert.ok(read(script), `Missing ${script}`);
        }
    }
    assert.match(read(".github/workflows/release.yml"), /--draft/);
    assert.doesNotMatch(read(".github/workflows/release.yml"), /gh release edit.*--draft=false/);
    assert.match(read(".github/dependabot.yml"), /directory: "\/src-tauri"/);
});
