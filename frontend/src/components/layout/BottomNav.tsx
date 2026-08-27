import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import clsx from "clsx";
import {
  Home,
  Receipt,
  PieChart,
  User,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { FabMenu } from "./FabMenu";

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/transactions", label: "Activity", icon: Receipt },
];

const navItemsRight = [
  { to: "/insights", label: "Insights", icon: PieChart },
  { to: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const [fabOpen, setFabOpen] = useState(false);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none safe-bottom">
        <div className="mx-auto max-w-md px-4 pb-4">
          <div
            className="
              relative
              h-[72px]
              flex
              items-center
              justify-between
              px-3
              rounded-[26px]
              bg-white/95
              dark:bg-[#1c1c1e]/95
              border
              border-black/[0.05]
              dark:border-white/[0.06]
              shadow-[0_12px_40px_rgba(20,20,30,0.12)]
              backdrop-blur-2xl
              pointer-events-auto
            "
          >
            <div className="flex flex-1 items-center justify-around">
              {navItems.map((item) => (
                <NavItem key={item.to} {...item} />
              ))}
            </div>

            <div className="w-[74px] shrink-0" />

            <div className="flex flex-1 items-center justify-around">
              {navItemsRight.map((item) => (
                <NavItem key={item.to} {...item} />
              ))}
            </div>

            <button
              type="button"
              aria-label="Add transaction"
              onClick={() => setFabOpen(true)}
              className="
                absolute
                left-1/2
                top-1/2
                -translate-x-1/2
                -translate-y-1/2
                h-[58px]
                w-[58px]
                rounded-full
                bg-primary
                text-white
                flex
                items-center
                justify-center
                shadow-[0_10px_28px_rgba(79,70,229,0.32)]
                border-[5px]
                border-white
                dark:border-[#1c1c1e]
                active:scale-95
                transition-all
                duration-150
              "
            >
              <Plus size={27} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      </nav>

      <FabMenu
        open={fabOpen}
        onClose={() => setFabOpen(false)}
      />
    </>
  );
}

type NavItemProps = {
  to: string;
  label: string;
  icon: LucideIcon;
};

function NavItem({
  to,
  label,
  icon: Icon,
}: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className="flex-1"
    >
      {({ isActive }) => (
        <div
          className={clsx(
            "relative flex flex-col items-center justify-center h-[58px] min-w-[52px] transition-all duration-200",
            isActive
              ? "text-primary"
              : "text-ink-faint"
          )}
        >
          <div
            className={clsx(
              "h-8 min-w-8 px-2 rounded-full flex items-center justify-center transition-all duration-200",
              isActive &&
                "bg-primary/10"
            )}
          >
            <Icon
              size={20}
              strokeWidth={
                isActive ? 2.4 : 1.9
              }
            />
          </div>

          <span
            className={clsx(
              "text-[9px] mt-0.5 tracking-tight",
              isActive
                ? "font-semibold text-primary"
                : "font-medium"
            )}
          >
            {label}
          </span>
        </div>
      )}
    </NavLink>
  );
}
