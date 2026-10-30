import { LoaderCircle } from "lucide-react";
export function Spinner({ size = 16, className = "" }: { size?: number; className?: string }) {
    return (
        <LoaderCircle
            size={size}
            aria-label="Loading"
            role="status"
            className={`spin ${className}`}
        />
    );
}
