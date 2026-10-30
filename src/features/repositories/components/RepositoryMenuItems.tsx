import { FolderGit2, GitBranch, History, Trash2 } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { ContextMenuItem, ContextMenuSeparator } from "@/components/ui/context-menu";
import { useNavigationStore } from "@/features/app/navigation-store";
import type { AppController } from "@/features/app/useAppController";
import type { Repository } from "@/lib/types";

type Props = Pick<AppController, "selectRepo" | "setDanger"> & { repo: Repository };
export function RepositoryMenuItems(props: Props) {
    const { setActiveRepoId, setView } = useNavigationStore(useShallow((state) => ({ setActiveRepoId: state.setActiveRepoId, setView: state.setView })));
    const { repo, selectRepo, setDanger } = props;
    return (
        <>
            <ContextMenuItem onSelect={() => selectRepo(repo)}>
                <FolderGit2 size={14} /> Open repository
            </ContextMenuItem>
            <ContextMenuItem
                onSelect={() => {
                    setActiveRepoId(repo.id);
                    setView("branches");
                }}
            >
                <GitBranch size={14} /> View branches
            </ContextMenuItem>
            <ContextMenuItem
                onSelect={() => {
                    setActiveRepoId(repo.id);
                    setView("history");
                }}
            >
                <History size={14} /> View history
            </ContextMenuItem>
            <ContextMenuSeparator className="alder-menu-separator" />
            <ContextMenuItem
                destructive
                onSelect={() => setDanger({ kind: "remove", repo })}
            >
                <Trash2 size={14} /> Remove from Alder…
            </ContextMenuItem>
        </>
    );
}
