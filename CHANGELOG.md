## Unreleased — Signed auto-updater integration

- Added Morrow-equivalent signed Tauri v2 update checking, install progress, and relaunch for Alder.
- Added Update Center with manual check in Settings and safe disabled state for unsigned development builds.
- Registered Tauri updater/process plugins and least-privilege window capabilities.
- Preserved existing GitHub Release publishing pipeline; documented signing configuration and build commands.

## Unreleased — Windows child-process and external browser fixes

- Route Git, gh and partial-staging child processes through a common Windows CREATE_NO_WINDOW helper.
- Open GitHub documentation and GitHub URLs through a native Tauri command instead of window.open.
- Add a Windows runtime console test and cross-platform source regressions.

# Changelog

Version tags identify source snapshots. Downloadable builds are available through [GitHub Releases](https://github.com/HakkoDev/Alder/releases).

## 0.3.7 — Public release preparation

- Reworked README and contribution guidelines for users and contributors.
- Removed internal development notes from the tracked repository while retaining local copies.
- Added a signing preflight to detect invalid release credentials before packaging.

## 0.3.6 — Frontend organization and shared state

- Split the application shell, dialogs, and repository workflow views into focused components.
- Added Zustand stores for navigation, the repository registry, selection, and commit drafts/options.
- Preserved prioritized repository loading, request epochs, and stale-response protection.
- Added store behavior and architecture regression tests.
- Fixed Windows worktree path assertions and enforced consistent checkout line endings.

## 0.3.5 — Desktop Git workflows

- Added repository registration, discovery, cloning, initialization, and workspace organization.
- Added status, diffs, file/hunk/line staging, commits, branch management, and commit history.
- Added worktrees, stashes, merge/rebase workflows, text conflict resolution, reflog recovery, cherry-pick, and revert.
- Added GitHub CLI integration for pull requests, issues, reviews, checks, and repository activity.
- Added themes, preferences, command search, a collapsible sidebar, and localization infrastructure.
- Added Windows verification and Windows/Linux draft-release automation.
