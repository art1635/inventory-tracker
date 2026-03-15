"use client";

import { useState } from "react";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [secret, setSecret] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent, action: "clear" | "create") {
    e.preventDefault();
    setMessage(null);
    if (!email.trim() || !secret.trim()) {
      setMessage({ type: "err", text: "Email and reset key are required." });
      return;
    }
    setLoading(true);
    const url = action === "clear" ? "/api/admin/clear-password" : "/api/admin/create-user";
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), secret: secret.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({
          type: "ok",
          text: data.message ?? (action === "clear" ? "Password cleared. Sign in to set a new one." : "User created. Sign in to set your password."),
        });
        setEmail("");
        setSecret("");
      } else {
        setMessage({ type: "err", text: data.error ?? "Something went wrong." });
      }
    } catch {
      setMessage({ type: "err", text: "Request failed." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
        <h1 className="text-xl font-bold text-slate-800">Reset or create user</h1>
        <p className="mt-1 text-sm text-slate-500">
          Clear an existing user’s password, or create a new user so you can set a password on first login.
        </p>
        <form onSubmit={(e) => e.preventDefault()} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="secret" className="block text-sm font-medium text-slate-700">
              Reset key
            </label>
            <input
              id="secret"
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800"
              placeholder="From ALLOW_PASSWORD_RESET_SECRET in .env"
            />
          </div>
          {message && (
            <p className={`text-sm ${message.type === "ok" ? "text-green-600" : "text-red-600"}`}>
              {message.text}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={(e) => handleSubmit(e as unknown as React.FormEvent, "clear")}
              className="flex-1 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {loading ? "…" : "Clear password"}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={(e) => handleSubmit(e as unknown as React.FormEvent, "create")}
              className="flex-1 rounded-lg border border-teal-600 px-4 py-2.5 text-sm font-medium text-teal-600 hover:bg-teal-50 disabled:opacity-60"
            >
              {loading ? "…" : "Create user"}
            </button>
          </div>
        </form>
        <p className="mt-4 text-center">
          <a href="/login" className="text-sm text-teal-600 hover:underline">
            Back to sign in
          </a>
        </p>
      </div>
    </div>
  );
}
