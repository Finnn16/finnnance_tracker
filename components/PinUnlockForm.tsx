"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function PinUnlockForm({
  redirectTo = "/",
  userEmail,
}: {
  redirectTo?: string;
  userEmail: string;
}) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/security/pin/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, redirectTo }),
      });
      const data = (await response.json()) as {
        error?: string;
        redirectTo?: string;
      };

      if (!response.ok) {
        setError(data.error || "Failed to unlock app.");
        return;
      }

      router.replace(data.redirectTo || "/");
      router.refresh();
    } catch {
      setError("Failed to unlock app. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg bg-zinc-50 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Signed in as
        </p>
        <p className="mt-1 truncate text-sm font-semibold text-zinc-900">
          {userEmail}
        </p>
      </div>

      <div>
        <label
          htmlFor="pin"
          className="block text-sm font-medium text-zinc-700 mb-2"
        >
          PIN
        </label>
        <input
          id="pin"
          value={pin}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          minLength={4}
          maxLength={8}
          autoComplete="current-password"
          autoFocus
          className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          placeholder="Enter PIN"
        />
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Unlocking..." : "Unlock"}
      </button>
    </form>
  );
}
