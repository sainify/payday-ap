import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ClayCard } from "@/components/ui/ClayCard";
import { ClayInput } from "@/components/ui/ClayInput";
import { ClayButton } from "@/components/ui/ClayButton";
import { api, ApiError } from "@/lib/api";
import { useApp } from "@/context/AppContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { refresh } = useApp();
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post("/auth/login", { email, password });
      await refresh();
      navigate("/", { replace: true });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10">
      <div className="mb-10 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-clay bg-primary text-white text-2xl font-display font-bold shadow-clay-raised mb-4">
          ₹
        </div>
        <h1 className="text-3xl font-display font-extrabold">PAYDAY</h1>
        <p className="text-ink-faint mt-1">Your Salary. Smarter.</p>
      </div>
      <ClayCard>
        <h2 className="text-lg font-display font-semibold mb-4">Welcome back</h2>
        <form onSubmit={onSubmit}>
          <ClayInput
            label="Email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <ClayInput
            label="Password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-coral text-sm mb-4">{error}</p>}
          <ClayButton type="submit" fullWidth disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </ClayButton>
        </form>
      </ClayCard>
      <p className="text-center text-sm text-ink-faint mt-6">
        New to PAYDAY?{" "}
        <Link to="/register" className="text-primary font-semibold">
          Create an account
        </Link>
      </p>
    </div>
  );
}
