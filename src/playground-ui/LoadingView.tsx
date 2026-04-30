import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

import { Progress } from "@/components/ui/progress";

interface LoadingViewProps {
  message?: ReactNode;
  progress?: number; // 0-100
}

/**
 * LoadingView displays a full page throbber and message for loading.
 * @param props The properties for the loading view.
 */
export default function LoadingView({ message, progress }: LoadingViewProps) {
  return (
    <div className="absolute inset-0 z-[9999] flex items-center justify-center">
      <div className="flex flex-col items-center justify-center gap-3 rounded-md border bg-background p-6 shadow-lg">
        {progress !== undefined ? (
          <Progress value={progress} className="w-64" />
        ) : (
          <Loader2 className="size-6 animate-spin text-primary" />
        )}
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
    </div>
  );
}
