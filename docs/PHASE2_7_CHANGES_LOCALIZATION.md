# Alder v0.2.7: Changes list, index patch controls and translation foundation

## User-facing behavior

Changes list now has a dropdown for sorting by full path, basename or status, in ascending or descending order. The global quick-search trigger is labeled **Search**. Expanded diffs show **+** beside editable hunks and changed lines when viewing unstaged changes, or **×** when viewing staged changes. Choosing these controls stages or unstages *only the selected patch* via Git's index, not the entire file. The full-file controls are still present.

Patch application runs `git apply --cached --recount --unidiff-zero --check` before `git apply`, and `--reverse` is used for unstaging. Binary, combined and oversized diffs cannot be partially staged. If concurrent edits invalidate a patch, Git rejects it and Alder shows its existing error toast; nothing should be silently discarded. Untracked files still require file-level staging first.

## Localization

`src/lib/i18n/en.ts` contains typed canonical English strings. `src/lib/i18n/index.ts` provides `t()` with `{placeholder}` interpolation and a reactive `useTranslation()` hook. Locale preference is persisted under `alder.locale`, with the supported options System default and English. English is the only fully available locale, so System defaults to English until another catalog ships. See `docs/LOCALIZATION.md` for adding locales. Initial extraction covers the navigation, global search, changes sorting and patch staging, and language setting. Other UI strings still need extraction for full translation coverage.

## Verification

29/29 Node tests passed including a disposable Git test confirming line-specific stage and reverse unstage while preserving another unstaged addition. Git patch application itself is validated using Git's real apply command. Dependency-resolved TypeScript typecheck unavailable due to missing dependencies; native Rust/Tauri compilation and GUI smoke testing not executed. The provided screenshot URL was not accessible in this environment, so the sort UI uses the existing shadcn dropdown design rather than exact reference matching.

## Follow-ups

- Full app localization extraction, pluralization and number/date formatting.
- Native Tauri smoke tests of stage/unstage on added, removed, mixed, renamed and conflicted files.
- Multi-line range selection, optional keyboard shortcuts, advanced patch preview and file-level fallback for unsupported diff formats.
- Full Rust integration tests and optimization for very large diff views.
