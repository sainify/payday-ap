import React, { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { isUnlocked, lockNow } from "@/lib/storage";
import { BottomNav } from "@/components/layout/BottomNav";

import Login from "@/pages/Login";
import Register from "@/pages/Register";
import PinLock from "@/pages/PinLock";
import Home from "@/pages/Home";
import Transactions from "@/pages/Transactions";
import Insights from "@/pages/Insights";
import Profile from "@/pages/Profile";
import AddEntry from "@/pages/AddEntry";
import CanIAffordIt from "@/pages/CanIAffordIt";
import LendBorrow from "@/pages/LendBorrow";
import SalaryHistory from "@/pages/SalaryHistory";
import SalarySplitter from "@/pages/SalarySplitter";
import CalendarPage from "@/pages/Calendar";
import Goals from "@/pages/Goals";

function Splash() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-clay-bg dark:bg-clay-bg-dark">
      <div className="h-16 w-16 rounded-clay bg-primary text-white flex items-center justify-center text-2xl font-display font-bold shadow-clay-raised animate-pulse">
        ₹
      </div>
    </div>
  );
}

export default function App() {
  const { user, settings, loading } = useApp();
  const location = useLocation();
  const [unlocked, setUnlocked] = useState(isUnlocked());

  // Re-lock when the app returns from background, if PIN lock is enabled.
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "hidden") {
        // no-op on hide; TTL handled on resume via isUnlocked()
      } else if (document.visibilityState === "visible") {
        if (!isUnlocked()) {
          lockNow();
          setUnlocked(false);
        }
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  if (loading) return <Splash />;

  if (!user) {
    return (
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  if (settings?.pin_enabled && !unlocked) {
    return <PinLock onUnlock={() => setUnlocked(true)} />;
  }

  const isAddRoute = location.pathname.startsWith("/add/");

  return (
    <div className="min-h-screen max-w-md mx-auto relative">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/add/:type" element={<AddEntry />} />
        <Route path="/afford" element={<CanIAffordIt />} />
        <Route path="/lending" element={<LendBorrow />} />
        <Route path="/salary-history" element={<SalaryHistory />} />
        <Route path="/splitter" element={<SalarySplitter />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/register" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!isAddRoute && <BottomNav />}
    </div>
  );
}
