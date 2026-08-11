import React, { useState } from "react";
import { Delete } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { markUnlocked } from "@/lib/storage";

interface PinLockProps {
  onUnlock: () => void;
}

export default function PinLock({ onUnlock }: PinLockProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  async function submit(nextPin: string) {
    setChecking(true);
    try {
      await api.post("/auth/verify-pin", { pin: nextPin });
      markUnlocked();
      onUnlock();
    } catch (e) {
      setError(true);
      setPin("");
      setTimeout(() => setError(false), 500);
    } finally {
      setChecking(false);
    }
  }

  function press(digit: string) {
    if (checking) return;
    const next = (pin + digit).slice(0, 4);
    setPin(next);
    if (next.length === 4) submit(next);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8 bg-clay-bg dark:bg-clay-bg-dark">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-clay bg-primary text-white text-xl font-display font-bold shadow-clay-raised mb-6">
        ₹
      </div>
      <h1 className="text-xl font-display font-semibold mb-1">Enter your PIN</h1>
      <p className="text-ink-faint text-sm mb-8">Unlock PAYDAY to continue</p>

      <div className={`flex gap-4 mb-10 ${error ? "animate-[shake_0.4s]" : ""}`}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-4 w-4 rounded-full clay-inset ${pin.length > i ? "bg-primary" : "bg-transparent"}`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 w-full max-w-xs">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button
            key={d}
            onClick={() => press(d)}
            className="clay-surface-sm clay-pressable h-16 rounded-clay-sm text-xl font-semibold"
          >
            {d}
          </button>
        ))}
        <div />
        <button
          onClick={() => press("0")}
          className="clay-surface-sm clay-pressable h-16 rounded-clay-sm text-xl font-semibold"
        >
          0
        </button>
        <button
          onClick={() => setPin(pin.slice(0, -1))}
          className="h-16 rounded-clay-sm flex items-center justify-center text-ink-faint"
          aria-label="Delete"
        >
          <Delete size={22} />
        </button>
      </div>
      <style>{`
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-8px)} 75%{transform:translateX(8px)} }
      `}</style>
    </div>
  );
}
