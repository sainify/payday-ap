import React from "react";
import clsx from "clsx";
import { formatINR, maskedINR } from "@/lib/currency";
import { useApp } from "@/context/AppContext";

interface AmountProps {
  value: number;
  className?: string;
  sign?: boolean; // show +/- prefix
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses: Record<string, string> = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-2xl",
  xl: "text-4xl",
};

export function Amount({ value, className, sign = false, size = "md" }: AmountProps) {
  const { privacyMode } = useApp();
  const prefix = sign && value !== 0 ? (value > 0 ? "+" : "") : "";

  return (
    <span className={clsx("tabular font-semibold", sizeClasses[size], className)}>
      {privacyMode ? maskedINR() : `${prefix}${formatINR(value)}`}
    </span>
  );
}
