import React from "react";
import { Eye, EyeOff, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";

interface TopBarProps {
  title: string;
  subtitle?: string;
  back?: boolean;
  showPrivacyToggle?: boolean;
  right?: React.ReactNode;
}

export function TopBar({ title, subtitle, back, showPrivacyToggle, right }: TopBarProps) {
  const navigate = useNavigate();
  const { privacyMode, togglePrivacy } = useApp();

  return (
    <div className="flex items-center justify-between px-5 pt-6 pb-2 safe-top">
      <div className="flex items-center gap-3">
        {back && (
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="h-10 w-10 rounded-clay-sm clay-surface-sm clay-pressable flex items-center justify-center"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <div>
          <h1 className="text-2xl font-display font-bold leading-tight">{title}</h1>
          {subtitle && <p className="text-sm text-ink-faint mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {showPrivacyToggle && (
          <button
            onClick={togglePrivacy}
            aria-label="Toggle privacy mode"
            className="h-10 w-10 rounded-clay-sm clay-surface-sm clay-pressable flex items-center justify-center text-ink-soft"
          >
            {privacyMode ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
        {right}
      </div>
    </div>
  );
}
