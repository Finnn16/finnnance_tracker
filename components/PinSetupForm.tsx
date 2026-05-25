"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function PinSetupForm({ redirectTo = "/" }: { redirectTo?: string }) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/security/pin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, confirmPin, redirectTo }),
      });
      const data = (await response.json()) as {
        error?: string;
        redirectTo?: string;
      };

      if (!response.ok) {
        setError(data.error || "Failed to set PIN.");
        return;
      }

      router.replace(data.redirectTo || "/");
      router.refresh();
    } catch {
      setError("Failed to set PIN. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="pin"
          className="block text-sm font-medium text-zinc-700 mb-2"
        >
          New PIN
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
          autoComplete="new-password"
          className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          placeholder="4-8 digit PIN"
        />
      </div>

      <div>
        <label
          htmlFor="confirmPin"
          className="block text-sm font-medium text-zinc-700 mb-2"
        >
          Confirm PIN
        </label>
        <input
          id="confirmPin"
          value={confirmPin}
          onChange={(event) =>
            setConfirmPin(event.target.value.replace(/\D/g, ""))
          }
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          minLength={4}
          maxLength={8}
          autoComplete="new-password"
          className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          placeholder="Repeat PIN"
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
        {isSubmitting ? "Saving..." : "Set PIN"}
      </button>
    </form>
  );
}
