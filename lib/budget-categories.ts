export type BudgetCategoryPayload = {
  name: string;
  isHidden: boolean;
};

export function validateBudgetCategoryPayload(body: unknown):
  | { ok: true; data: BudgetCategoryPayload }
  | { ok: false; error: string } {
  const input = body as {
    name?: unknown;
    isHidden?: unknown;
  } | null;

  const name = typeof input?.name === "string" ? input.name.trim() : "";

  if (!name) {
    return { ok: false, error: "Budget category name is required." };
  }

  if (name.length > 60) {
    return {
      ok: false,
      error: "Budget category name must be 60 characters or less.",
    };
  }

  return {
    ok: true,
    data: {
      name,
      isHidden: Boolean(input?.isHidden),
    },
  };
}
