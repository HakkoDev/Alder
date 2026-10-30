import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { rustSource } from "./rust-source.mjs";

const root = new URL("../", import.meta.url);
const read = (p) => fs.readFileSync(new URL(p, root), "utf8");
const git = (cwd, args, stdin) => {
    const r = spawnSync("git", ["-C", cwd, ...args], { input: stdin, encoding: "utf8" });
    if (r.status) throw Error(r.stderr);
    return r.stdout;
};
test("partial-stage backend validates patches and only applies to index", () => {
    const src = rustSource();
    assert.match(src, /fn apply_diff_selection\(/);
    assert.match(src, /\["apply",\s*"--cached",\s*"--recount",\s*"--unidiff-zero"\]/);
    assert.match(src, /cmd\.arg\("--check"\)/);
    assert.match(src, /cmd\.arg\("--reverse"\)/);
    assert.match(read("src/features/changes/components/DiffPanel.tsx"), /onSelect=\{\(hunk,\s*line\)/);
});
test("selected line patch stages only one addition then can unstage it", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "alder-partial-"));
    try {
        git(dir, ["init", "-q"]);
        git(dir, ["config", "user.name", "Alder Test"]);
        git(dir, ["config", "user.email", "test@example.com"]);
        fs.writeFileSync(path.join(dir, "a.txt"), "alpha\nbeta\ngamma\n");
        git(dir, ["add", "."]);
        git(dir, ["commit", "-qm", "initial"]);
        fs.writeFileSync(path.join(dir, "a.txt"), "alpha\nbeta\nnew line one\ngamma\nnew line two\n");
        const diff = git(dir, ["diff", "--no-color", "--unified=3", "--", "a.txt"]);
        const lines = diff.trimEnd().split("\n");
        const h = lines.findIndex((x) => x.startsWith("@@ "));
        const group = lines.slice(h);
        const chosen = group.findIndex((x) => x === "+new line one");
        const body = group
            .slice(1)
            .flatMap((row, i) => (row.startsWith("+") ? (i + 1 === chosen ? [row] : []) : row.startsWith("-") ? [" " + row.slice(1)] : [row]));
        const patch = [...lines.slice(0, h), group[0], ...body].join("\n") + "\n";
        git(dir, ["apply", "--cached", "--recount", "--unidiff-zero", "--check", "-"], patch);
        git(dir, ["apply", "--cached", "--recount", "--unidiff-zero", "-"], patch);
        assert.match(git(dir, ["diff", "--cached"]), /\+new line one/);
        assert.doesNotMatch(git(dir, ["diff", "--cached"]), /\+new line two/);
        git(dir, ["apply", "--cached", "--recount", "--unidiff-zero", "--reverse", "--check", "-"], patch);
        git(dir, ["apply", "--cached", "--recount", "--unidiff-zero", "--reverse", "-"], patch);
        assert.equal(git(dir, ["diff", "--cached"]).trim(), "");
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});
test("changes sorting and localization are plumbed through UI", () => {
    assert.match(read("src/features/changes/components/ChangeList.tsx"), /setChangeSort/);
    assert.match(read("src/components/app/AppHeader.tsx"), /t\("app.search"\)/);
    assert.match(read("src/components/app/Settings.tsx"), /setLocale\(/);
    assert.match(read("src/lib/i18n/en.ts"), /"changes\.stageLine"/);
});
