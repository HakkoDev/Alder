# Alder release phases

Plane project `ALD` in HakkoDev. **Modules are phases/EPICs**, not small groupings. Each module has independently tracked work items. Release dates deliberately unset.

| Module | Purpose | Current status |
|---|---|---|
| 00 — Product Design & Architecture | Scope, design system, Git safety, desktop architecture | Initial documentation and UI design produced; review required |
| v0.1.0 — Foundation & Everyday Git | Local repository management, changes, commits, graph, settings | **Source candidate, not release ready** |
| v0.2.0 — Advanced Git & Recovery | Merge/rebase, conflicts, stashes, worktrees, reflog, recovery | **Partial source candidate**, native build/QA pending; three-way editor, interactive rebase and reset remain |
| v0.3.0 — GitHub & Pull Requests | Multi-account GitHub auth, PRs, reviews, CI | Not implemented |
| v0.4.0 — Smart Workspaces & Agents | Bulk operations, Codex and Claude Code, review, worktree automation | Not implemented |
| v0.5.0 — Power Tools & More Providers | GitLab, Forgejo/Gitea, Git LFS, submodules, diagnostics | Not implemented |
| v1.0.0 — Stability, Security & Distribution | Signed installers/updates, cross-platform QA, security, accessibility | Not implemented |

## Exit gates

1. All critical P0 behaviors for the phase work in the native desktop app with real repositories.
2. `bun run typecheck`, tests, build, `cargo fmt`, `cargo clippy`, and OS-specific native package build succeed.
3. Uncommitted changes are never silently destroyed; risky operations explain and preview consequences.
4. Release artifacts and install/upgrade smoke tests are verified on the target OS.
5. Update Plane tasks to Done only when evidence is attached. No fake completion states.
