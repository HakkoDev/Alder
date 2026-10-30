import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useNavigationStore } from "../app/navigation-store";
import { useRegistryStore } from "./registry-store";

export function useFilteredRepositories() {
    const repos = useRegistryStore((state) => state.repos);
    const { search, workspaceFilter } = useNavigationStore(useShallow((state) => ({ search: state.search, workspaceFilter: state.workspaceFilter })));
    return useMemo(
        () =>
            repos.filter(
                (repo) =>
                    (workspaceFilter === "all" || repo.workspaceId === workspaceFilter || (workspaceFilter === "none" && !repo.workspaceId)) &&
                    `${repo.name} ${repo.path} ${repo.branch}`.toLowerCase().includes(search.toLowerCase()),
            ),
        [repos, search, workspaceFilter],
    );
}
