import { redirect } from "next/navigation";

import { PinSetupForm } from "@/components/PinSetupForm";
import { isAppUnlocked } from "@/lib/app-lock";
import { getCurrentAppUser } from "@/lib/clerk-auth";
import { prisma } from "@/lib/prisma";
import { toSafeRedirectPath } from "@/lib/safe-redirect";
import { measureServerOperation } from "@/lib/server-performance";

export const dynamic = "force-dynamic";

type SetupPinPageProps = {
  searchParams?: Promise<{ redirect?: string }>;
};

export default async function SetupPinPage({
  searchParams,
}: SetupPinPageProps) {
  const params = await searchParams;
  const redirectTo = toSafeRedirectPath(params?.redirect, "/");
  const user = await getCurrentAppUser();

  if (!user) {
    redirect("/sign-in");
  }

  const profile = await measureServerOperation(
    "page /setup-pin.pin-profile",
    () =>
      prisma.user.findUnique({
        where: { id: user.id },
        select: { pinHash: true },
      }),
  );

  if (profile?.pinHash) {
    if (
      await measureServerOperation("page /setup-pin.unlock-cookie", () =>
        isAppUnlocked(user.id),
      )
    ) {
      redirect(redirectTo);
    }

    redirect(`/unlock?redirect=${encodeURIComponent(redirectTo)}`);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center">
        <section className="w-full rounded-lg bg-white p-8 shadow-lg">
          <div className="mb-8 text-center">
            <p className="text-sm font-semibold text-indigo-700">
              App security
            </p>
            <h1 className="mt-2 text-3xl font-bold text-zinc-950">
              Set your PIN
            </h1>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              Setup PIN dulu biar aman nanti pas akses aplikasi.
            </p>
          </div>

          <PinSetupForm redirectTo={redirectTo} />
        </section>
      </div>
    </main>
  );
}
