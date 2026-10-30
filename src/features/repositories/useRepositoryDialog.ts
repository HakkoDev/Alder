import { open } from "@tauri-apps/plugin-dialog";
import { useState } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { getError } from "../../components/app/controls";
import { git } from "../../lib/git-api";
import type { Repository } from "../../lib/types";
import { useNavigationStore } from "../app/navigation-store";
import { useRegistryStore } from "./registry-store";

type Modal = "add" | "scan" | "clone" | "init" | "workspace" | "branch" | null;
type Options = {
    activeRepo: Repository | null;
    busy: string;
    setBusy: (busy: string) => void;
    refresh: () => Promise<void>;
    loadSelected: (path: string) => Promise<void>;
    report: (error: unknown, type?: "error" | "success") => void;
};

export function useRepositoryDialog({ activeRepo, busy, setBusy, refresh, loadSelected, report }: Options) {
    const [modal, setModal] = useState<Modal>(null);
    const [actionPath, setActionPath] = useState("");
    const [remoteUrl, setRemoteUrl] = useState("");
    const [workspaceName, setWorkspaceName] = useState("");
    const [branchName, setBranchName] = useState("");
    const setWorkspaces = useRegistryStore((state) => state.setWorkspaces);
    const { setActiveRepoId, setView } = useNavigationStore(useShallow((state) => ({ setActiveRepoId: state.setActiveRepoId, setView: state.setView })));

    const submitModal = async () => {
        if (!modal || busy) return;
        const type = modal;
        setBusy("Saving");
        const toastId = toast.loading("Saving…");
        try {
            if (type === "workspace") {
                const created = await git.createWorkspace(workspaceName, "#799a84");
                setWorkspaces((items) => [...items, created]);
                setWorkspaceName("");
            } else if (type === "branch") {
                if (!activeRepo) throw new Error("Select a repository");
                await git.createBranch(activeRepo.path, branchName);
                setBranchName("");
            } else if (type === "scan") {
                const count = await git.discover(actionPath, 5);
                report(`Discovered ${count} Git repositories`, "success");
            } else {
                const repo = type === "add" ? await git.add(actionPath) : type === "init" ? await git.init(actionPath) : await git.clone(remoteUrl, actionPath);
                setActiveRepoId(repo.id);
                setView("changes");
            }
            setModal(null);
            setActionPath("");
            setRemoteUrl("");
            if (type !== "workspace") await refresh();
            if (type === "branch" && activeRepo) await loadSelected(activeRepo.path);
            toast.success("Saved successfully", { id: toastId });
        } catch (error) {
            toast.error(getError(error), { id: toastId, duration: 6500 });
        } finally {
            setBusy("");
        }
    };

    const chooseFolder = async () => {
        try {
            const value = await open({
                directory: true,
                multiple: false,
                title: modal === "scan" ? "Select folder to scan" : modal === "clone" ? "Select parent folder for clone" : "Select repository folder",
            });
            if (typeof value === "string") {
                const project =
                    remoteUrl
                        .replace(/\.git$/i, "")
                        .split(/[/]/)
                        .pop() || "repository";
                setActionPath(modal === "clone" ? `${value}${value.includes("\\") ? "\\" : "/"}${project}` : value);
            }
        } catch (error) {
            report(error);
        }
    };

    return {
        modal,
        setModal,
        actionPath,
        setActionPath,
        remoteUrl,
        setRemoteUrl,
        workspaceName,
        setWorkspaceName,
        branchName,
        setBranchName,
        submitModal,
        chooseFolder,
    };
}
