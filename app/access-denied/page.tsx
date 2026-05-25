"use client";

import { useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function AccessDeniedContent() {
  const { signOut } = useClerk();
  const searchParams = useSearchParams();
  const error =
    searchParams.get("error") ||
    "Your email is not authorized to access this application.";

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <div className="mb-6">
          <div className="text-5xl mb-4">!</div>
          <h1 className="text-2xl font-bold text-zinc-900 mb-2">
            Access Denied
          </h1>
          <p className="text-zinc-600">{error}</p>
        </div>

        <p className="text-sm text-zinc-500 mb-6">
          This is an internal-only application. Only registered users are
          allowed access.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => signOut({ redirectUrl: "/sign-in" })}
            className="w-full bg-red-600 text-white py-2 rounded-lg font-medium hover:bg-red-700 transition"
          >
            Sign Out
          </button>

          <Link href="/">
            <button className="w-full bg-zinc-200 text-zinc-900 py-2 rounded-lg font-medium hover:bg-zinc-300 transition">
              Back Home
            </button>
          </Link>
        </div>

        <p className="text-xs text-zinc-400 mt-6">
          If you believe this is an error, please contact the administrator.
        </p>
      </div>
    </div>
  );
}

export default function AccessDeniedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center px-4">
          <p className="text-zinc-600">Loading...</p>
        </div>
      }
    >
      <AccessDeniedContent />
    </Suspense>
  );
}
