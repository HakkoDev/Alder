// Canonical English messages. Add locales alongside this file. Keep keys stable.
export const en = {
  "app.search": "Search",
  "nav.overview": "Overview", "nav.changes": "Changes", "nav.history": "History",
  "nav.branches": "Branches", "nav.worktrees": "Worktrees",
  "nav.operations": "Git operations", "nav.pullRequests": "Pull requests",
  "nav.agents": "Agent sessions",
  "changes.title": "Working changes", "changes.sort": "Sort changes",
  "changes.sortBy": "Sort files by", "changes.sortPath": "Full path",
  "changes.sortName": "File name", "changes.sortStatus": "Git status",
  "changes.ascending": "Ascending ↑", "changes.descending": "Descending ↓",
  "changes.stageLine": "Stage line {line}", "changes.unstageLine": "Unstage line {line}",
  "changes.stageHunk": "Stage hunk", "changes.unstageHunk": "Unstage hunk",
  "settings.language": "Language", "settings.languageHelp": "Interface language",
  "settings.english": "English", "settings.system": "System default",
} as const;
export type TranslationKey = keyof typeof en;
