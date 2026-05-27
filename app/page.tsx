import { DashboardView } from "@/components/DashboardView";
import { monthInputValue } from "@/lib/budgets";
import { getDashboardData } from "@/lib/dashboard";
import { UserRole } from "@/lib/prisma-enums";
import { prisma } from "@/lib/prisma";
import { requireUnlockedAppUser } from "@/lib/secure-app-user";
import { measureServerOperation } from "@/lib/server-performance";

export const dynamic = "force-dynamic";

function getCurrentMonthSelection() {
  const [year, month] = monthInputValue(new Date()).split("-");

  return {
    month,
    year,
  };
}

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string; year?: string; owner?: string }>;
}) {
  const user = await requireUnlockedAppUser("/");
  const resolvedSearchParams = (await searchParams) || {};
  const currentSelection = getCurrentMonthSelection();
  const selectedMonth =
    resolvedSearchParams.month && /^\d{2}$/.test(resolvedSearchParams.month)
      ? resolvedSearchParams.month
      : currentSelection.month;
  const selectedYear =
    resolvedSearchParams.year && /^\d{4}$/.test(resolvedSearchParams.year)
      ? resolvedSearchParams.year
      : currentSelection.year;
  const ownerOptions =
    user.role === UserRole.ADMIN
      ? await measureServerOperation("page /.owners", () =>
          prisma.user.findMany({
            select: { id: true, name: true },
            orderBy: { name: "asc" },
          }),
        )
      : [{ id: user.id, name: user.name }];
  const requestedOwner = resolvedSearchParams.owner;
  const selectedOwner =
    requestedOwner === "all" && user.role === UserRole.ADMIN
      ? "all"
      : ownerOptions.some((option) => option.id === requestedOwner)
        ? requestedOwner!
        : user.id;
  const selectedMonthKey = `${selectedYear}-${selectedMonth}`;
  const data = await measureServerOperation("page /.data", () =>
    getDashboardData(
      selectedMonthKey,
      selectedOwner === "all" ? null : selectedOwner,
    ),
  );

  return (
    <DashboardView
      user={user}
      data={data}
      selectedMonth={selectedMonth}
      selectedYear={selectedYear}
      selectedOwner={selectedOwner}
      ownerOptions={ownerOptions}
      canViewCombined={user.role === UserRole.ADMIN}
    />
  );
}
