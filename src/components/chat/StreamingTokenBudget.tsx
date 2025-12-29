import { Activity, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreamingTokenBudgetProps {
  sessionId: string | null;
  tokenBudget: { used: number; total: number } | null;
  isStreaming: boolean;
}

export function StreamingTokenBudget({
  sessionId,
  tokenBudget,
  isStreaming,
}: StreamingTokenBudgetProps) {
  // Don't render if not streaming or no token data
  if (!isStreaming || !tokenBudget) {
    return null;
  }

  const percentage = (tokenBudget.used / tokenBudget.total) * 100;
  const isNearLimit = percentage > 80;
  const isAtLimit = percentage > 95;

  // Format numbers with commas
  const formatNumber = (num: number) => num.toLocaleString();

  return (
    <div className="border-t border-border bg-muted/30 px-4 py-2">
      <div className="flex items-center justify-between gap-4">
        {/* Left side: Session info and icon */}
        <div className="flex items-center gap-2 min-w-0">
          <Activity
            size={14}
            className={cn(
              "flex-shrink-0 animate-pulse",
              isAtLimit
                ? "text-red-500"
                : isNearLimit
                  ? "text-yellow-500"
                  : "text-blue-500",
            )}
          />
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium text-foreground">
              Streaming
            </span>
            {sessionId && (
              <span className="text-[10px] text-muted-foreground truncate">
                Session: {sessionId.slice(0, 8)}...
              </span>
            )}
          </div>
        </div>

        {/* Right side: Token usage */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Token counter */}
          <div className="flex items-center gap-1.5">
            <Zap
              size={12}
              className={cn(
                "flex-shrink-0",
                isAtLimit
                  ? "text-red-500"
                  : isNearLimit
                    ? "text-yellow-500"
                    : "text-muted-foreground",
              )}
            />
            <span
              className={cn(
                "text-xs font-mono",
                isAtLimit
                  ? "text-red-600 dark:text-red-400"
                  : isNearLimit
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-foreground",
              )}
            >
              {formatNumber(tokenBudget.used)} / {formatNumber(tokenBudget.total)}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-300 ease-out",
                isAtLimit
                  ? "bg-red-500"
                  : isNearLimit
                    ? "bg-yellow-500"
                    : "bg-blue-500",
              )}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>

          {/* Percentage */}
          <span
            className={cn(
              "text-xs font-medium tabular-nums",
              isAtLimit
                ? "text-red-600 dark:text-red-400"
                : isNearLimit
                  ? "text-yellow-600 dark:text-yellow-400"
                  : "text-muted-foreground",
            )}
          >
            {percentage.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Warning message if near or at limit */}
      {isNearLimit && (
        <div className="mt-2 text-[11px] text-muted-foreground">
          {isAtLimit ? (
            <span className="text-red-600 dark:text-red-400 font-medium">
              ⚠ Context window limit reached
            </span>
          ) : (
            <span className="text-yellow-600 dark:text-yellow-400">
              ⚡ Approaching context window limit
            </span>
          )}
        </div>
      )}
    </div>
  );
}