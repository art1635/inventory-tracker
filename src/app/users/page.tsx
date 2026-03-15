"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  hasPassword: boolean;
  isAdmin: boolean;
};

export default function UsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [togglingAdminId, setTogglingAdminId] = useState<string | null>(null);
  const isAdmin =
    (session?.user?.isAdmin ?? false) ||
    (session?.user?.email?.toLowerCase() === "admin@staridb.com");

  useEffect(() => {
    if (status === "loading") return;
    if (!isAdmin) {
      router.replace("/");
      return;
    }
    let cancelled = false;
    load()
      .then(() => { if (!cancelled) setLoading(false); })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [status, isAdmin]);

  const load = () => {
    setLoadError(null);
    return fetch("/api/users")
      .then((r) => r.json().then((json) => ({ ok: r.ok, json })))
      .then(({ ok, json }) => {
        if (ok && Array.isArray(json)) {
          setUsers(json);
        } else {
          setLoadError((json as { error?: string })?.error ?? "Failed to load users");
        }
      })
      .catch(() => setLoadError("Failed to load data. Check your connection and retry."));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        name: name.trim() || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to add user");
      return;
    }
    setEmail("");
    setName("");
    setShowForm(false);
    setError(null);
    load();
  };

  const handleToggleAdmin = async (userRow: UserRow) => {
    setError(null);
    setTogglingAdminId(userRow.id);
    try {
      const res = await fetch(`/api/users/${userRow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAdmin: !userRow.isAdmin }),
      });
      const data = await res.json();
      if (res.ok) {
        load();
      } else {
        setError(data.error ?? "Failed to update");
      }
    } catch {
      setError("Failed to update");
    } finally {
      setTogglingAdminId(null);
    }
  };

  const handleRevoke = async (userRow: UserRow) => {
    if (!confirm(`Revoke access for ${userRow.email}? They will no longer be able to sign in.`)) return;
    setRevokingId(userRow.id);
    setError(null);
    try {
      const res = await fetch(`/api/users/${userRow.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        load();
      } else {
        setError(data.error ?? "Failed to revoke access");
      }
    } catch {
      setError("Failed to revoke access");
    } finally {
      setRevokingId(null);
    }
  };

  if (status === "loading" || (!isAdmin && !loadError)) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
      </div>
    );
  }
  if (!isAdmin) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {loadError && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
          <p className="text-sm text-amber-800">{loadError}</p>
          <button
            type="button"
            onClick={() => {
              setLoadError(null);
              setLoading(true);
              load().finally(() => setLoading(false));
            }}
            className="rounded-lg bg-amber-200 px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-300"
          >
            Retry
          </button>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">Users</h1>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:bg-teal-700"
        >
          {showForm ? "Cancel" : "Add user"}
        </button>
      </div>

      <p className="text-sm text-slate-600">
        Only admins can add or revoke users. Add a user by email; they sign in with that email and set a password on first login.
      </p>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-2 font-medium underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="user-email" className="block text-sm font-medium text-slate-700">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="user-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                placeholder="colleague@example.com"
              />
            </div>
            <div>
              <label htmlFor="user-name" className="block text-sm font-medium text-slate-700">
                Name (optional)
              </label>
              <input
                id="user-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                placeholder="Display name"
              />
            </div>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <div className="mt-4">
            <button
              type="submit"
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              Add user
            </button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Admin
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 text-sm text-slate-800">{u.email}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{u.name ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      u.hasPassword
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {u.hasPassword ? "Can sign in" : "First login to set password"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => handleToggleAdmin(u)}
                    disabled={togglingAdminId === u.id}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                      u.isAdmin
                        ? "bg-teal-100 text-teal-800 hover:bg-teal-200"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                    title={u.isAdmin ? "Remove admin" : "Make admin"}
                  >
                    {togglingAdminId === u.id ? "…" : u.isAdmin ? "Yes" : "No"}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleRevoke(u)}
                    disabled={revokingId === u.id}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Revoke access"
                  >
                    {revokingId === u.id ? "Revoking…" : "Revoke access"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-slate-500">No users yet. Add one above.</p>
        )}
      </div>
    </div>
  );
}
