import React from "react";
import {
  Eye,
  EyeOff,
  ChevronLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";

interface TopBarProps {
  title: string;
  subtitle?: string;
  back?: boolean;
  showPrivacyToggle?: boolean;
  right?: React.ReactNode;
}

export function TopBar({
  title,
  subtitle,
  back,
  showPrivacyToggle,
  right,
}: TopBarProps) {
  const navigate = useNavigate();
  const { privacyMode, togglePrivacy } = useApp();

  return (
    <header className="safe-top">
      <div className="flex items-center justify-between px-5 pt-5 pb-4">

        {/* LEFT */}
        <div className="flex items-center gap-3 min-w-0 flex-1">

          {back && (
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Back"
              className="
                h-10
                w-10
                shrink-0
                rounded-full
                bg-white/80
                dark:bg-white/[0.06]
                border
                border-black/[0.05]
                dark:border-white/[0.06]
                flex
                items-center
                justify-center
                text-ink
                dark:text-ink-inverted
                shadow-[0_5px_18px_rgba(20,20,30,0.05)]
                active:scale-95
                transition-all
                duration-150
              "
            >
              <ChevronLeft
                size={20}
                strokeWidth={2}
              />
            </button>
          )}

          <div className="min-w-0">

            <h1
              className="
                text-[25px]
                leading-[1.15]
                font-display
                font-bold
                tracking-[-0.035em]
                text-ink
                dark:text-ink-inverted
                truncate
              "
            >
              {title}
            </h1>

            {subtitle && (
              <p
                className="
                  text-[12px]
                  leading-relaxed
                  text-ink-faint
                  mt-1
                  truncate
                "
              >
                {subtitle}
              </p>
            )}

          </div>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-2 shrink-0 ml-3">

          {showPrivacyToggle && (
            <button
              type="button"
              onClick={togglePrivacy}
              aria-label={
                privacyMode
                  ? "Show financial values"
                  : "Hide financial values"
              }
              className="
                h-10
                w-10
                rounded-full
                bg-white/80
                dark:bg-white/[0.06]
                border
                border-black/[0.05]
                dark:border-white/[0.06]
                flex
                items-center
                justify-center
                text-ink-soft
                dark:text-ink-faint
                shadow-[0_5px_18px_rgba(20,20,30,0.05)]
                active:scale-95
                transition-all
                duration-150
              "
            >
              {privacyMode ? (
                <EyeOff
                  size={18}
                  strokeWidth={1.9}
                />
              ) : (
                <Eye
                  size={18}
                  strokeWidth={1.9}
                />
              )}
            </button>
          )}

          {right}

        </div>
      </div>
    </header>
  );
}
