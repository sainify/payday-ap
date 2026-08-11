import React from "react";
import clsx from "clsx";

interface ClayButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "neutral" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

const variants: Record<string, string> = {
  primary: "bg-primary text-white shadow-clay-raised-sm active:shadow-clay-inset",
  neutral:
    "bg-clay-surface dark:bg-clay-surface-dark text-ink dark:text-ink-inverted shadow-clay-raised-sm dark:shadow-clay-raised-dark active:shadow-clay-inset dark:active:shadow-clay-inset-dark",
  danger: "bg-coral text-white shadow-clay-raised-sm active:shadow-clay-inset",
  ghost: "bg-transparent text-ink-soft dark:text-ink-faint",
};

const sizes: Record<string, string> = {
  sm: "text-sm px-4 py-2 rounded-clay-sm",
  md: "text-base px-5 py-3 rounded-clay-sm",
  lg: "text-base px-6 py-4 rounded-clay",
};

export function ClayButton({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  children,
  ...rest
}: ClayButtonProps) {
  return (
    <button
      className={clsx(
        "font-semibold transition-all duration-150 ease-clay active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
