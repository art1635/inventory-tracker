"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8">
      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Something went wrong</h2>
        <p className="mt-2 text-sm text-slate-600">
          A client-side error occurred. This can happen if the server is still starting or the
          database is not ready. Try refreshing.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-4 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={() => (window.location.href = "/")}
          className="ml-3 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
