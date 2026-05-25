import { redirect } from "next/navigation";

import { PinUnlockForm } from "@/components/PinUnlockForm";
import { isAppUnlocked } from "@/lib/app-lock";
import { getCurrentAppUser } from "@/lib/clerk-auth";
import { prisma } from "@/lib/prisma";
import { toSafeRedirectPath } from "@/lib/safe-redirect";

export const dynamic = "force-dynamic";

type UnlockPageProps = {
  searchParams?: Promise<{ redirect?: string }>;
};

export default async function UnlockPage({ searchParams }: UnlockPageProps) {
  const params = await searchParams;
  const redirectTo = toSafeRedirectPath(params?.redirect, "/");
  const user = await getCurrentAppUser();

  if (!user) {
    redirect("/sign-in");
  }

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { pinHash: true },
  });

  if (!profile?.pinHash) {
    redirect(`/setup-pin?redirect=${encodeURIComponent(redirectTo)}`);
  }

  if (await isAppUnlocked(user.id)) {
    redirect(redirectTo);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-indigo-950 px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center">
        <section className="w-full rounded-lg bg-white p-8 shadow-xl">
          <div className="mb-8 text-center">
            <p className="text-sm font-semibold text-indigo-700">
              Finnnance Tracker
            </p>
            <h1 className="mt-2 text-3xl font-bold text-zinc-950">
              Enter PIN
            </h1>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              Your Google session is still active. Unlock the app to view your
              finance data.
            </p>
          </div>

          <PinUnlockForm redirectTo={redirectTo} userEmail={user.email} />
        </section>
      </div>
    </main>
  );
}
