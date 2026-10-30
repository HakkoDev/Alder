//! Advanced Git workflows. Each submodule owns one type of operation.
pub(crate) mod conflicts;
pub(crate) mod model;
pub(crate) mod operations;
pub(crate) mod recovery;
pub(crate) mod stashes;
pub(crate) mod worktrees;
pub(crate) use model::*;
