import React from "react";

interface ProgressRingProps {
  progress: number; // 0-1
  size?: number;
  strokeWidth?: number;
  trackClassName?: string;
  progressClassName?: string;
  children?: React.ReactNode;
}

/**
 * The Salary Cycle Ring — PAYDAY's signature element. Used on the Home dashboard
 * to show cycle progress, and in miniature for goal/bill/savings progress.
 */
export function ProgressRing({
  progress,
  size = 176,
  strokeWidth = 14,
  trackClassName = "stroke-clay-bg dark:stroke-clay-bg-dark",
  progressClassName = "stroke-primary",
  children,
}: ProgressRingProps) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, progress));
  const offset = c * (1 - clamped);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={strokeWidth}
          fill="none"
          className={trackClassName}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className={`${progressClassName} transition-[stroke-dashoffset] duration-700 ease-clay`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
