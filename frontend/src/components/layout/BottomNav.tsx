import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import clsx from "clsx";
import { Home, Receipt, PieChart, User, Plus } from "lucide-react";
import { FabMenu } from "./FabMenu";

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/transactions", label: "Transactions", icon: Receipt },
];

const navItemsRight = [
  { to: "/insights", label: "Insights", icon: PieChart },
  { to: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const [fabOpen, setFabOpen] = useState(false);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 safe-bottom">
        <div className="mx-auto max-w-md relative px-4 pb-4">
          <div className="clay-surface !rounded-clay-lg flex items-center justify-between px-3 py-2 h-16">
            {navItems.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
            <div className="w-16" />
            {navItemsRight.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </div>
          <button
            aria-label="Add"
            onClick={() => setFabOpen(true)}
            className="absolute left-1/2 -translate-x-1/2 -top-6 h-16 w-16 rounded-full bg-primary text-white shadow-clay-raised flex items-center justify-center active:scale-95 active:shadow-clay-inset transition-all duration-150 ease-clay"
          >
            <Plus size={30} strokeWidth={2.5} />
          </button>
        </div>
      </nav>
      <FabMenu open={fabOpen} onClose={() => setFabOpen(false)} />
    </>
  );
}

function NavItem({ to, label, icon: Icon }: { to: string; label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number }> }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        clsx(
          "flex flex-col items-center justify-center gap-0.5 w-14 py-1.5 rounded-clay-sm transition-colors duration-150",
          isActive ? "text-primary" : "text-ink-faint"
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={22} strokeWidth={isActive ? 2.4 : 2} />
          <span className="text-[10px] font-medium">{label}</span>
        </>
      )}
    </NavLink>
  );
}
