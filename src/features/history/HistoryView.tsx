import { History } from "lucide-react";
import { Empty } from "@/components/app/controls";
import { GitGraph } from "@/components/GitGraph";
import { Skeleton } from "@/components/ui/skeleton";
import type { AppController } from "@/features/app/useAppController";

type Props = Pick<AppController, "history" | "loadingHistory">;
export function HistoryView(props: Props) {
    const { history, loadingHistory } = props;
    return (
        <div className="content-card">
            <div className="card-bar">
                <div>
                    <h2>Commit history</h2>
                    <p>Local and remote commits across this repository</p>
                </div>
                <span className="subtle-tag">{history.length} commits loaded</span>
            </div>
            {loadingHistory ? (
                <div className="changes-loading">
                    <Skeleton className="h-8" />
                    {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                        <Skeleton
                            key={i}
                            className="h-9"
                        />
                    ))}
                </div>
            ) : history.length ? (
                <GitGraph commits={history} />
            ) : (
                <Empty
                    icon={History}
                    title="No commits found"
                    description="This repository has no commits yet, or its history could not be loaded."
                />
            )}
        </div>
    );
}
