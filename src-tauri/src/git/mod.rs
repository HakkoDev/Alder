//! Native Git operations, kept separate from Tauri bootstrap.
pub(crate) mod core;
pub(crate) mod status;
pub(crate) mod history;
pub(crate) mod changes;
pub(crate) mod remotes;
pub(crate) mod advanced;
pub(crate) use core::*;
pub(crate) use status::*;
pub(crate) use history::*;
pub(crate) use changes::*;
pub(crate) use remotes::*;
pub(crate) use advanced::*;
