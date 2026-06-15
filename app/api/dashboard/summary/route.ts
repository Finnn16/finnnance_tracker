import { NextRequest, NextResponse } from "next/server";

import { monthInputValue } from "@/lib/budgets";
import { getDashboardData } from "@/lib/dashboard";
import { UserRole } from "@/lib/prisma-enums";
import { getUnlockedAppUserForRequest } from "@/lib/secure-api-user";
import { measureServerOperation } from "@/lib/server-performance";

export const dynamic = "force-dynamic";

function getSelectedMonth(request: NextRequest) {
  const month = request.nextUrl.searchParams.get("month");

  return month && /^\d{4}-\d{2}$/.test(month)
    ? month
    : monthInputValue(new Date());
}

export async function GET(request: NextRequest) {
  const auth = await getUnlockedAppUserForRequest("api /api/dashboard/summary");

  if (!auth.ok) {
    return auth.response;
  }

  const owner = request.nextUrl.searchParams.get("owner");
  const selectedUserId =
    owner === "all" && auth.user.role === UserRole.ADMIN
      ? null
      : owner && (auth.user.role === UserRole.ADMIN || owner === auth.user.id)
        ? owner
        : auth.user.id;
  const data = await measureServerOperation(
    "api /api/dashboard/summary.data",
    () => getDashboardData(getSelectedMonth(request), selectedUserId),
  );

  return NextResponse.json({
    wallet: {
      operationalBalance: data.coverage.totalWalletBalance,
      totalWalletBalance: data.coverage.totalWalletBalance,
    },
    savings: {
      reservedSavings: data.coverage.reservedSavings,
    },
    budget: {
      readyToBudget: data.budget.readyToBudget,
      budgetSet: data.budget.budgetSet,
      budgetSpent: data.budget.budgetSpent,
      remainingActiveBudget: data.budget.remainingActiveBudget,
      budgetPlanGap: data.budget.budgetPlanGap,
      budgetPlanStatus: data.budget.budgetPlanStatus,
    },
    coverage: data.coverage,
  });
}
